import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT, CURRENT_SAVE_SCHEMA_VERSION, createMatch, simulateBattle, type BattleTeam } from "../game";
import { createCombatReport, recordCombatEvent, combatEventCue, combatEventTime } from "../components/combatReport";
import { combatPresentationStyle, formAccent, movementCue } from "../components/boardCombatPresentation";
import type { BoardUnit, CombatFxEvent } from "../components/PhaserBoard";
import { selectBattlePresentation } from "../app/selectors";

const fighter = (id: string, team: "player" | "enemy" = "player"): BoardUnit => ({ id, team, name: id, shortName: id, contentId: "nami", color: 0, zone: "board", x: 0, y: 0, slot: 0, star: 1, items: [], hp: 100, maxHp: 100 });
const event = (value: Partial<CombatFxEvent>): CombatFxEvent => ({ id: "event", tick: 1, kind: "damage", sourceId: "caster", targetId: "target", ...value });

describe("playback-only combat contributions", () => {
  it("counts capped HP/shield damage, intercepted recipients, effective healing and granted shields separately", () => {
    const inputs = [fighter("caster"), fighter("target", "enemy"), fighter("cover", "enemy"), { ...fighter("reserve"), zone: "bench" as const }];
    const zero = createCombatReport(inputs);
    const events = [
      event({ amount: 80, healthDamage: 50, shieldDamage: 30 }),
      event({ targetId: "cover", amount: 15, healthDamage: 15, shieldDamage: 0 }),
      event({ kind: "heal", targetId: "caster", amount: 12 }),
      event({ kind: "shield", targetId: "caster", amount: 45 }),
      event({ kind: "transform", unitId: "caster", hp: 500, maxHp: 600 }),
      event({ kind: "resurrect", unitId: "caster", hp: 100, maxHp: 600 }),
    ];
    const report = events.reduce(recordCombatEvent, zero);
    expect(report.units).toHaveLength(3);
    expect(report.units.find((unit) => unit.id === "caster")).toMatchObject({ hpDamage: 65, shieldDamage: 30, healing: 12, shields: 45, revives: 1 });
    expect(report.units.find((unit) => unit.id === "target")).toMatchObject({ hpTaken: 50, shieldTaken: 30 });
    expect(report.units.find((unit) => unit.id === "cover")).toMatchObject({ hpTaken: 15, shieldTaken: 0 });
    expect(zero.units.every((unit) => unit.hpDamage + unit.healing + unit.shields === 0)).toBe(true);
    expect(inputs[0].hp).toBe(100);
  });

  it("never folds future/sequential events implicitly; reset excludes previous fighters and totals", () => {
    const zero = createCombatReport([fighter("caster"), fighter("target", "enemy")]);
    const first = event({ tick: 10, amount: 10, healthDamage: 10, shieldDamage: 0 });
    const later = event({ tick: 10, presentationOffsetMs: 240, amount: 20, healthDamage: 20, shieldDamage: 0 });
    expect(combatEventTime(later)).toBe(1240);
    const report = recordCombatEvent(zero, first);
    expect(report.units[0].hpDamage).toBe(10);
    expect(report.elapsedMs).toBe(1000);
    expect(report.complete).toBe(false);
    expect(recordCombatEvent(report, later).units[0].hpDamage).toBe(30);
    const switched = createCombatReport([fighter("other")]);
    expect(switched.units.map((unit) => unit.id)).toEqual(["other"]);
    expect(switched.elapsedMs).toBe(0);
  });

  it("labels actual drain sources, movement directions and legacy unknown attribution without inventing it", () => {
    const report = createCombatReport([fighter("caster"), fighter("target", "enemy")]);
    const drain = event({ kind: "energy", energyDelta: -15, reason: "ability-drain" });
    expect(recordCombatEvent(report, drain).units[0].energyDrained).toBe(15);
    expect(combatEventCue(drain, report.units)).toContain("caster → target: 15 Energy drained");
    expect(combatEventCue({ ...drain, sourceId: "target" }, report.units)).toContain("Unattributed source");
    expect(recordCombatEvent(report, { ...drain, sourceId: "target" }).units.every((unit) => unit.energyDrained === 0)).toBe(true);
    for (const kind of ["lunge", "pull", "knockback", "escape"]) expect(combatEventCue(event({ kind: "displace", movementKind: kind, unitId: "target" }), report.units)).toContain(movementCue(kind).label.toLowerCase().replace(/^./, (value) => value.toUpperCase()));
    expect(new Set(["lunge", "pull", "knockback", "escape"].map((kind) => movementCue(kind).color)).size).toBe(4);
    expect(new Set(DEFAULT_CONTENT.forms.map((form) => formAccent(form.id))).size).toBe(4);
    expect(combatPresentationStyle("luffy", "cast", "luffy-gear-4-snakeman")).toBe("slash");
    expect(combatPresentationStyle("chopper", "cast", "chopper-monster-point")).toBe("impact");
  });
});

describe("additive Energy Drain reporting", () => {
  function team(id: string, definitionId: string, items: string[] = []): BattleTeam {
    return { id, units: [{ id: `${id}-fighter`, definitionId, star: 1, items, position: { x: id === "a" ? 2 : 3, y: 2 } }], activeTraits: [{ traitId: "fixture-energy", count: 1, tierIndex: 0, tier: { required: 1, label: "Energy", effects: [{ kind: "starting-energy", value: id === "a" ? 100 : 40 }] } }] };
  }
  it("attributes ability drain, retains effective clamping, serializes, and resolves legacy logs", () => {
    const result = simulateBattle(team("a", "nami"), team("b", "chopper"), { seed: "b03-drain", maxTicks: 1 });
    const drain = result.events.find((entry) => entry.type === "energy" && entry.reason === "ability-drain");
    expect(drain).toMatchObject({ sourceId: "a-fighter", unitId: "b-fighter", amount: -15 });
    expect(simulateBattle(team("a", "nami"), team("b", "chopper"), { seed: "b03-drain", maxTicks: 1 })).toEqual(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    const state = createMatch("b03-view");
    state.phase = "battle";
    const [a, b] = state.players;
    const renamed = { ...result, initialUnits: result.initialUnits.map((unit) => ({ ...unit, teamId: unit.teamId === "a" ? a.id : b.id })), playerAId: a.id, playerBId: b.id, ghostOfPlayerId: null, playerADamage: 0, playerBDamage: 0 };
    state.lastResults = [renamed];
    const presented = selectBattlePresentation(state, a.id)!;
    expect(presented.events.find((entry) => entry.kind === "energy" && entry.reason === "ability-drain")).toMatchObject({ sourceId: "a-fighter", targetId: "b-fighter", energyDelta: -15 });
    expect(presented.events.at(-1)?.kind).toBe("end");
    const legacy = structuredClone(state);
    for (const entry of legacy.lastResults[0].events) if (entry.type === "energy") delete entry.sourceId;
    expect(selectBattlePresentation(legacy, b.id)?.events.find((entry) => entry.kind === "energy" && entry.reason === "ability-drain")).toMatchObject({ sourceId: "b-fighter", targetId: "b-fighter" });
    expect(DEFAULT_CONTENT.version).toBe("1.34.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });

  it("attributes item chain drains without changing their effective Energy loss", () => {
    const content = structuredClone(DEFAULT_CONTENT);
    content.items.push({ id: "drain-fixture", name: "Fixture", description: "", icon: "", kind: "completed", effects: [], behaviors: [{ kind: "every-n-basic-attacks-chain", every: 1, targets: 1, specialDamage: 1, energyDrain: 15 }] });
    const attacker = team("a", "zoro", ["drain-fixture"]); attacker.activeTraits = [];
    const result = simulateBattle(attacker, team("b", "chopper"), { seed: "b03-item", maxTicks: 20 }, content);
    expect(result.events.filter((entry) => entry.type === "energy" && entry.reason === "item" && entry.amount < 0)).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: "a-fighter", unitId: "b-fighter", amount: -15 })]));
  });
});
