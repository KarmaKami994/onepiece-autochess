import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT, advanceMatchPhase, createMatch, hashCanonicalValue, migrateMatchState,
  neutralBattleEnvironment, readBattleEnvironment, serializeMatch, simulateBattle, stageBattleEnvironment,
  type AbilityDefinition, type BattleEnvironment, type BattleEvent, type BattleResult, type BattleSetupUnit,
  type GameContent, type ItemDefinition, type MatchBattleResult, type UnitStats,
} from "../../game";
import { createTeamPlan, simulateTeamPlan, validateTeamPlan } from "../../game/teamPlanner";
import { createVoyageSaveEnvelope, restoreVoyageState } from "../../app/voyagePersistence";
import { newVoyageReplay, observeVoyage, replayFrameState } from "../../app/chronicle";
import { validateReplay } from "../../app/replayValidation";
import { presentBattleEnvironment } from "../../app/battleEnvironmentPresentation";
import { emptyBattleConditions, observeBattleConditions } from "../../scripts/battle_condition_report";

type Spec = { id: string; team: "a" | "b"; x: number; y: number; start?: boolean; stats?: Partial<UnitStats>; ability?: Partial<AbilityDefinition>; items?: string[] };
const hit = (extra: Partial<AbilityDefinition> = {}): Partial<AbilityDefinition> => ({ effect: "damage", targeting: "nearest-enemy", requiresTarget: true, ...extra });
const caster = (extra: Partial<AbilityDefinition>, id = "a-caster"): Spec => ({ id, team: "a", x: 0, y: 0, start: true, ability: hit(extra) });
const victim = (extra: Partial<Spec> = {}): Spec => ({ id: "z-victim", team: "b", x: 3, y: 0, ...extra });
const events = <T extends BattleEvent["type"]>(result: BattleResult, type: T) => result.events.filter((event): event is Extract<BattleEvent, { type: T }> => event.type === type);

function fight(specs: Spec[], maxTicks = 40, environment?: BattleEnvironment) {
  const content: GameContent = structuredClone(DEFAULT_CONTENT);
  const item = (id: string, effects: ItemDefinition["effects"] = [], behaviors: ItemDefinition["behaviors"] = []): ItemDefinition => ({ id, name: id, description: "B08 fixture", icon: "fixture", kind: "completed", effects, behaviors });
  content.items.push(item("b08-energy", [{ kind: "starting-energy", value: 100 }]), item("b08-no-crit", [{ kind: "critical-chance-percent", value: -100 }]),
    item("b08-rune", [], [{ kind: "starting-rune-protect", durationMs: 60_000 }]),
    item("b08-shield", [{ kind: "shield-flat", value: 500 }]),
    item("b08-protect", [], [{ kind: "low-health-protect-energy", healthThresholdPercent: 100, protectMs: 5_000, energy: 0 }]));
  content.units = specs.map(spec => ({ id: spec.id, name: spec.id, cost: 1, traits: [], assetPath: "/assets/characters/luffy.png",
    stats: { health: 10_000, attack: 1, defense: 0, specialDefense: 0, range: 8, attackIntervalMs: 60_000, moveIntervalMs: 60_000, ...spec.stats },
    ability: { id: `${spec.id}-ability`, name: "Fixture", description: "Fixture", targeting: "self", pattern: "single", effect: "heal", power: 1, castAnimationMs: 0, requiresTarget: false, ...spec.ability },
  }));
  const team = (side: "a" | "b") => ({ id: side, units: specs.filter(spec => spec.team === side).map((spec): BattleSetupUnit => ({ id: spec.id, definitionId: spec.id, star: 1, position: { x: spec.x, y: spec.y }, items: ["b08-no-crit", ...(spec.start ? ["b08-energy"] : []), ...(spec.items ?? [])] })) });
  const teamA = team("a"), teamB = team("b");
  return { content, teamA, teamB, result: simulateBattle(teamA, teamB, { seed: "b08-fixture", maxTicks, environment }, content) };
}

describe("B08 explicit status lifecycle", () => {
  it("caps Poison at three stacks, preserves its one-second schedule and never grants damaged-Energy", () => {
    const sources = [0, 1, 2, 3].map(index => ({ ...caster({ poisonDurationMs: 3_000 }, `a-${index}`), y: index }));
    const { result } = fight([...sources, victim()]);
    expect(events(result, "status").filter(event => event.status === "poison").map(event => event.stacks)).toEqual([1, 2, 3, 3]);
    expect(events(result, "damage").filter(event => event.damageKind === "poison").map(event => [event.tick, event.amount])).toEqual([[11, 300], [21, 300], [31, 300]]);
    expect(events(result, "energy").filter(event => event.unitId === "z-victim" && event.reason === "damaged" && event.tick >= 11)).toEqual([]);
    expect(events(result, "status-end")).toContainEqual({ type: "status-end", tick: 31, targetId: "z-victim", status: "poison" });
  });

  it("reduces Poison in Rain and lets Shields absorb its True damage", () => {
    const wet = fight([caster({ poisonDurationMs: 3_000 }), victim()], 35, { weather: "rain", fields: [] }).result;
    expect(events(wet, "damage").filter(event => event.damageKind === "poison").map(event => event.amount)).toEqual([70, 70, 70]);
    const shielded = fight([caster({ poisonDurationMs: 3_000 }), victim({ items: ["b08-shield"] })], 35).result;
    expect(events(shielded, "damage").filter(event => event.damageKind === "poison").map(event => [event.healthDamage, event.shieldDamage])).toEqual([[0, 100], [0, 100], [0, 100]]);
  });

  it.each([{ poisonDurationMs: 1_000 }, { freezeMs: 1_000 }, { sleepMs: 1_000 }, { lockMs: 1_000 }])("Rune Protect blocks the new negative effect %j", ability => {
    const result = fight([caster(ability), victim({ items: ["b08-rune"] })]).result;
    expect(events(result, "status").filter(event => ["poison", "freeze", "sleep", "locked"].includes(event.status))).toEqual([]);
    expect(events(result, "damage").some(event => event.damageKind === "ability")).toBe(true);
  });

  it("Protect blocks Poison damage while retaining the existing separate status-immunity rule", () => {
    const result = fight([caster({ power: 200, poisonDurationMs: 3_000 }), victim({ items: ["b08-protect"] })]).result;
    expect(events(result, "status").some(event => event.status === "poison")).toBe(true);
    expect(events(result, "damage").filter(event => event.damageKind === "poison")).toEqual([]);
  });

  it("Freeze inhibits queued actions, does not refresh and expires at the exact tick", () => {
    const result = fight([caster({ freezeMs: 700 }), { ...caster({ freezeMs: 5_000 }, "c-refresh"), y: 1 }, victim()]).result;
    expect(events(result, "status").filter(event => event.status === "freeze")).toHaveLength(1);
    expect(events(result, "attack").find(event => event.sourceId === "z-victim")?.tick).toBe(8);
    expect(events(result, "status-end")).toContainEqual({ type: "status-end", tick: 8, targetId: "z-victim", status: "freeze" });
  });

  it("Snow extends new Freeze with tick rounding, while Burn doubles thaw speed", () => {
    const snow = fight([caster({ freezeMs: 700 }), victim()], 25, { weather: "snow", fields: [] }).result;
    expect(events(snow, "status").find(event => event.status === "freeze")?.durationTicks).toBe(10);
    expect(events(snow, "attack").find(event => event.sourceId === "z-victim")?.tick).toBe(11);
    const thaw = fight([caster({ freezeMs: 700, burnPower: 1, burnDurationMs: 5_000 }), victim()]).result;
    expect(events(thaw, "attack").find(event => event.sourceId === "z-victim")?.tick).toBe(5);
  });

  it("Sleep is shortened by 300 ms per effective hit rather than immediately waking", () => {
    const result = fight([caster({ sleepMs: 1_500 }), { id: "c-hit", team: "a", x: 0, y: 1 }, victim()]).result;
    expect(events(result, "status-end")).toContainEqual({ type: "status-end", tick: 13, targetId: "z-victim", status: "sleep" });
    expect(events(result, "attack").find(event => event.sourceId === "z-victim")?.tick).toBe(13);
    const blocked = fight([caster({ power: 200, sleepMs: 1_500 }), { id: "c-hit", team: "a", x: 0, y: 1 }, victim({ items: ["b08-protect"] })]).result;
    expect(events(blocked, "status-end")).toContainEqual({ type: "status-end", tick: 16, targetId: "z-victim", status: "sleep" });
  });

  it("frozen fighters remain valid healing and forced-movement targets", () => {
    const healed = fight([caster({ freezeMs: 700 }), victim({ x: 1 }), { id: "b-healer", team: "b", x: 3, y: 0, start: true, ability: { targeting: "lowest-health-ally", effect: "heal", power: 100 } }]).result;
    expect(events(healed, "heal").some(event => event.targetId === "z-victim" && event.tick === 1)).toBe(true);
    const pushed = fight([caster({ freezeMs: 700 }), { ...caster({ signatureMechanics: [{ kind: "knockback" }] }, "c-push"), y: 1 }, victim({ x: 1 })]).result;
    expect(events(pushed, "unit-displace").some(event => event.unitId === "z-victim" && event.movementKind === "knockback")).toBe(true);
  });

  it("Locked prevents moving and out-of-range queued attacks, then restores range; adjacent attacks remain legal", () => {
    const result = fight([caster({ lockMs: 2_000 }), victim()], 25).result;
    expect(events(result, "attack").find(event => event.sourceId === "z-victim")?.tick).toBe(21);
    expect(events(result, "unit-move").filter(event => event.unitId === "z-victim")).toEqual([]);
    expect(result.finalUnits.find(unit => unit.id === "z-victim")?.range).toBe(8);
    const adjacent = fight([caster({ lockMs: 2_000 }), victim({ x: 1 })], 10).result;
    expect(events(adjacent, "attack").some(event => event.sourceId === "z-victim" && event.tick === 1)).toBe(true);
  });

  it.each(["knockback", "pull"] as const)("Locked blocks external %s", kind => {
    const result = fight([caster({ lockMs: 2_000 }), { ...caster({ signatureMechanics: [{ kind }] }, "c-force"), y: 1 }, victim({ x: 2 })], 10).result;
    expect(events(result, "unit-displace").filter(event => event.unitId === "z-victim")).toEqual([]);
  });

  it("Locked prevents Lunge without spending cast Energy and prevents Smoke-Star Escape relocation", () => {
    const lunge = fight([caster({ lockMs: 2_000 }), victim({ start: true, ability: hit({ signatureMechanics: [{ kind: "lunge" }] }) })], 10).result;
    expect(events(lunge, "cast").filter(event => event.sourceId === "z-victim")).toEqual([]);
    expect(lunge.finalUnits.find(unit => unit.id === "z-victim")?.energy).toBe(100);
    const escape = fight([caster({ lockMs: 2_000 }), { ...caster({ power: 8_000 }, "c-damage"), y: 1 }, victim({ x: 2, items: ["smoke-star-escape"] })], 10).result;
    expect(events(escape, "unit-displace").filter(event => event.movementKind === "escape")).toEqual([]);
    expect(events(escape, "shield").some(event => event.targetId === "z-victim")).toBe(true);
  });

  it("Phoenix remains untargetable/battle-active for two seconds and clears new statuses on revival", () => {
    const result = fight([caster({ poisonDurationMs: 5_000, freezeMs: 5_000, sleepMs: 5_000, lockMs: 5_000 }),
      { ...caster({ power: 100_000 }, "c-lethal"), y: 1 }, victim({ stats: { health: 100 }, items: ["phoenix-feather"] })], 25).result;
    const revival = events(result, "unit-resurrect")[0];
    expect(revival?.tick).toBe(21); expect(revival?.hp).toBe(result.initialUnits.find(unit => unit.id === "z-victim")?.maxHp);
    expect(events(result, "damage").filter(event => event.targetId === "z-victim" && event.tick > 1 && event.tick < 21)).toEqual([]);
    expect(events(result, "damage").filter(event => event.damageKind === "poison")).toEqual([]);
    expect(events(result, "attack").some(event => event.sourceId === "z-victim" && event.tick === 22)).toBe(true);
    expect(result.finalUnits.find(unit => unit.id === "z-victim")?.range).toBe(8);
    expect(new Set(result.finalUnits.filter(unit => unit.hp > 0 || unit.state === "resurrecting").map(unit => `${unit.x},${unit.y}`)).size).toBe(result.finalUnits.filter(unit => unit.hp > 0 || unit.state === "resurrecting").length);
  });
});

describe("B08 weather, cells and integration", () => {
  it("has no neutral events or extra RNG and repeated inputs reproduce all events/snapshots", () => {
    const specs = [caster({}), victim()]; const base = fight(specs);
    expect(fight(specs, 40, neutralBattleEnvironment()).result).toEqual(base.result);
    expect(fight(specs).result).toEqual(base.result);
    expect(base.result.environment).toBeUndefined();
    expect(events(base.result, "energy").filter(event => event.reason === "environment")).toEqual([]);
  });

  it("Rain and Charged Deck grant only actual capped Energy to eligible living occupants", () => {
    const result = fight([caster({}), victim()], 20, { weather: "rain", fields: [{ kind: "charged-deck", cells: [{ x: 3, y: 0 }] }] }).result;
    const energy = events(result, "energy").filter(event => event.reason === "environment");
    expect(energy.filter(event => event.unitId === "z-victim").map(event => event.amount)).toEqual([3, 3, 3, 3]);
    expect(energy.filter(event => event.unitId === "a-caster").map(event => event.amount)).toEqual([3, 3]);
    expect(energy.every(event => event.value <= 100)).toBe(true);
  });

  it("Frost Patch applies only on entry, uses Snow duration and never permanently freezes a stationary occupant", () => {
    const result = fight([caster({}), victim()], 30, { weather: "snow", fields: [{ kind: "frost-patch", cells: [{ x: 3, y: 0 }] }] }).result;
    expect(events(result, "status").filter(event => event.status === "freeze")).toMatchObject([{ tick: 1, durationTicks: 13, sourceId: "environment:frost-patch" }]);
    expect(events(result, "status").filter(event => event.status === "freeze")).toHaveLength(1);
    expect(events(result, "attack").find(event => event.sourceId === "z-victim")?.tick).toBe(14);
  });

  it("validates/canonicalizes detached field configuration and rejects malformed weather/cells", () => {
    const input = { weather: "snow", fields: [{ kind: "frost-patch", cells: [{ x: 4, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 2 }] }] };
    expect(readBattleEnvironment(input, 8, 6)).toEqual({ weather: "snow", fields: [{ kind: "frost-patch", cells: [{ x: 3, y: 2 }, { x: 4, y: 3 }] }] });
    for (const raw of [{ weather: "storm", fields: [] }, { weather: "snow", fields: [{ kind: "frost-patch", cells: [{ x: 8, y: 0 }] }] }, { weather: "rain", fields: [{ kind: "unknown", cells: [] }] }]) expect(readBattleEnvironment(raw, 8, 6)).toBeNull();
    const environment = stageBattleEnvironment(32, DEFAULT_CONTENT); const mirrored = presentBattleEnvironment(environment, true, 8, 6);
    expect(presentBattleEnvironment(mirrored, true, 8, 6)).toEqual(environment);
  });

  it("uses only authored PvE environments, without changing topology/rewards or early/PvP weather", () => {
    expect(DEFAULT_CONTENT.version).toBe("1.33.0");
    expect(DEFAULT_CONTENT.stages.filter(stage => stage.kind === "pve").map(stage => stage.round)).toEqual([1, 2, 3, 9, 14, 19, 24, 28, 32, 36, 40]);
    expect(DEFAULT_CONTENT.stages.filter(stage => stage.battleEnvironment).map(stage => stage.round)).toEqual([14, 28, 32]);
    for (const round of [14, 28, 32]) {
      const state = createMatch(`entry-${round}`); state.round = round - 1; state.phase = "item-choice";
      expect(advanceMatchPhase(state).battleEnvironment).toEqual(stageBattleEnvironment(round, DEFAULT_CONTENT));
    }
    expect(stageBattleEnvironment(6, DEFAULT_CONTENT)).toEqual(neutralBattleEnvironment());
    expect(DEFAULT_CONTENT.units.find(unit => unit.id === "kuzan")?.ability).toMatchObject({ power: 190, freezeMs: 700 });
    expect(DEFAULT_CONTENT.enemies.find(enemy => enemy.id === "magellan")?.ability).toMatchObject({ power: 360, stunMs: 500, poisonDurationMs: 3_000 });
  });

  it("round-trips current environment exactly; old schema-6 checkpoints remain neutral once", () => {
    const state = createMatch("b08-resume"); state.round = 32; state.battleEnvironment = stageBattleEnvironment(32, DEFAULT_CONTENT);
    expect(restoreVoyageState(createVoyageSaveEnvelope(state, state.seed, 1))).toEqual(state);
    const { battleEnvironment: _environment, ...legacy } = state; expect(_environment).toBeDefined();
    const migrated = migrateMatchState({ ...legacy, contentVersion: "1.32.0" });
    expect(migrated.battleEnvironment).toEqual(neutralBattleEnvironment());
    expect(migrated.rngState).toBe(state.rngState); expect(migrated.schemaVersion).toBe(6);
    const before = serializeMatch(state);
    const replay = observeVoyage(newVoyageReplay(state, DEFAULT_CONTENT, "environment-replay", 1), state, 1);
    expect(validateReplay(JSON.parse(JSON.stringify(replay)), DEFAULT_CONTENT)).toEqual(replay);
    expect(replayFrameState(replay, replay.frames[0], DEFAULT_CONTENT).battleEnvironment).toEqual(state.battleEnvironment);
    expect(serializeMatch(state)).toBe(before);
    expect(() => validateReplay({ ...replay, frames: [{ ...replay.frames[0], environment: { weather: "broken", fields: [] } }] }, DEFAULT_CONTENT)).toThrow();
  });

  it("planner imports explicit weather/fields, defaults old plans to neutral and never mutates the draft", () => {
    const plan = createTeamPlan(); plan.environment = stageBattleEnvironment(32, DEFAULT_CONTENT);
    plan.teams.a = [{ id: "a", definitionId: "kuzan", star: 1, items: [], position: { x: 0, y: 4 } }];
    plan.teams.b = [{ id: "b", definitionId: "luffy", star: 1, items: [], position: { x: 0, y: 4 } }];
    const before = hashCanonicalValue(plan), run = simulateTeamPlan(plan);
    expect(run.ok).toBe(true); expect(hashCanonicalValue(plan)).toBe(before);
    if (!run.ok) throw new Error(run.errors.join(" "));
    expect(run.result.environment).toEqual(plan.environment);
    const { environment: _environment, ...legacy } = plan; expect(_environment).toBeDefined();
    expect(validateTeamPlan(legacy).ok).toBe(true);
    expect(validateTeamPlan({ ...plan, environment: { weather: "storm", fields: [] } }).ok).toBe(false);
  });

  it("reports exact battle configurations, new status facts and effective Energy/Poison totals separately", () => {
    const fixture = fight([caster({ poisonDurationMs: 3_000 }), victim()], 35, { weather: "rain", fields: [] });
    const result: MatchBattleResult = { ...fixture.result, playerAId: "a", playerBId: "b", ghostOfPlayerId: null, playerADamage: 0, playerBDamage: 0 };
    const summary = emptyBattleConditions(), before = hashCanonicalValue(result);
    observeBattleConditions(summary, result);
    expect(summary.byWeather.rain).toBe(1); expect(summary.applications.poison).toBe(1);
    expect(summary.endings.poison).toBe(1); expect(summary.poisonHealthDamage).toBe(210);
    expect(Object.values(summary.configurations)[0]).toEqual({ environment: { weather: "rain", fields: [] }, battles: 1 });
    expect(summary.legacyReadabilityStatusMetricUnchanged).toBe(true); expect(hashCanonicalValue(result)).toBe(before);
  });
});
