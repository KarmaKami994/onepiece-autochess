import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
  type TraitEffect,
} from "../../game";

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
}

function setupUnit(
  id: string,
  definitionId: string,
  x: number,
  y: number,
): BattleSetupUnit {
  return {
    id,
    definitionId,
    star: 1,
    items: [],
    position: { x, y },
  };
}

function activeEffects(...effects: TraitEffect[]): ActiveTrait[] {
  return [
    {
      traitId: "test-events",
      count: 1,
      tierIndex: 0,
      tier: { required: 1, label: "Test events", effects },
    },
  ];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  activeTraits: ActiveTrait[] = [],
): BattleTeam {
  return { id, units, activeTraits };
}

function eventKinds(events: BattleEvent[]): string[] {
  return events.map((event) => event.type);
}

describe("Phase 3 readable combat event contract", () => {
  it("captures stable initial snapshots before any combat mutation", () => {
    const first = simulateBattle(
      team("a", [setupUnit("z-unit", "tashigi", 0, 5)]),
      team("b", [setupUnit("a-unit", "chopper", 0, 0)]),
      { seed: "initial-snapshots", maxTicks: 2 },
    );
    const second = simulateBattle(
      team("a", [setupUnit("z-unit", "tashigi", 0, 5)]),
      team("b", [setupUnit("a-unit", "chopper", 0, 0)]),
      { seed: "initial-snapshots", maxTicks: 2 },
    );

    expect(first).toEqual(second);
    expect(first.initialUnits.map((unit) => unit.id)).toEqual([
      "a-unit",
      "z-unit",
    ]);
    expect(first.initialUnits.every((unit) => unit.state === "seek")).toBe(
      true,
    );
    expect(first.initialUnits).not.toBe(first.finalUnits);
  });

  it("splits shield and health damage while keeping the total amount", () => {
    const content = clonedContent();
    const attacker = content.units.find((unit) => unit.id === "tashigi")!;
    const defender = content.units.find((unit) => unit.id === "chopper")!;
    attacker.stats.attack = 100;
    attacker.stats.range = 10;
    attacker.stats.attackIntervalMs = 100;
    defender.stats.health = 100;
    defender.stats.defense = 0;
    defender.stats.range = 0;

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("attacker", "tashigi", 0, 5)],
        activeEffects({ kind: "critical-chance-percent", value: -10 }),
      ),
      team(
        "b",
        [setupUnit("defender", "chopper", 0, 0)],
        activeEffects({ kind: "shield-flat", value: 50 }),
      ),
      { seed: "split-damage", maxTicks: 1 },
      content,
    );
    const damage = result.events.find(
      (event) => event.type === "damage" && event.sourceId === "attacker",
    );

    expect(result.initialUnits.find((unit) => unit.id === "defender")).toMatchObject({
      hp: 100,
      shield: 50,
      energy: 0,
    });
    expect(damage).toMatchObject({
      type: "damage",
      amount: 100,
      healthDamage: 50,
      shieldDamage: 50,
    });
    if (damage?.type === "damage") {
      expect(damage.amount).toBe(damage.healthDamage + damage.shieldDamage);
    }
    expect(
      result.events.filter((event) =>
        event.type === "attack" ||
        event.type === "damage" ||
        event.type === "energy"
          ? "sourceId" in event
            ? event.sourceId === "attacker"
            : event.unitId === "attacker" || event.unitId === "defender"
          : false,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "attack", sourceId: "attacker" }),
        expect.objectContaining({
          type: "energy",
          unitId: "attacker",
          amount: 10,
          value: 10,
          reason: "attack",
        }),
        expect.objectContaining({ type: "damage", targetId: "defender" }),
        expect.objectContaining({
          type: "energy",
          unitId: "defender",
          amount: 5,
          value: 5,
          reason: "damaged",
        }),
      ]),
    );
    const relevant = result.events.filter(
      (event) =>
        (event.type === "attack" && event.sourceId === "attacker") ||
        (event.type === "damage" && event.sourceId === "attacker") ||
        (event.type === "energy" &&
          (event.unitId === "attacker" || event.unitId === "defender")),
    );
    expect(eventKinds(relevant)).toEqual([
      "attack",
      "energy",
      "damage",
      "energy",
    ]);
  });

  it("emits cast reset, dodge, and stacking attack buffs in causal order", () => {
    const castContent = clonedContent();
    const nami = castContent.units.find((unit) => unit.id === "nami")!;
    nami.stats.range = 10;
    const castResult = simulateBattle(
      team(
        "a",
        [setupUnit("caster", "nami", 0, 5)],
        activeEffects({ kind: "starting-energy", value: 100 }),
      ),
      team("b", [setupUnit("cast-target", "chopper", 0, 0)]),
      { seed: "cast-reset-event", maxTicks: 1 },
      castContent,
    );
    const castIndex = castResult.events.findIndex(
      (event) => event.type === "cast" && event.sourceId === "caster",
    );
    expect(castResult.events[castIndex + 1]).toMatchObject({
      type: "energy",
      unitId: "caster",
      amount: -100,
      value: 0,
      reason: "cast-reset",
    });

    const dodgeContent = clonedContent();
    const tashigi = dodgeContent.units.find((unit) => unit.id === "tashigi")!;
    tashigi.stats.range = 10;
    const dodgeResult = simulateBattle(
      team("a", [setupUnit("dodged-attacker", "tashigi", 0, 5)]),
      team(
        "b",
        [setupUnit("dodger", "chopper", 0, 0)],
        activeEffects({ kind: "dodge-percent", value: 100 }),
      ),
      { seed: "dodge-event", maxTicks: 1 },
      dodgeContent,
    );
    const attackIndex = dodgeResult.events.findIndex(
      (event) =>
        event.type === "attack" && event.sourceId === "dodged-attacker",
    );
    expect(dodgeResult.events.slice(attackIndex, attackIndex + 3)).toMatchObject([
      { type: "attack", critical: false },
      { type: "energy", reason: "attack", amount: 10 },
      { type: "dodge", sourceId: "dodged-attacker", targetId: "dodger" },
    ]);
    expect(
      dodgeResult.events.some(
        (event) =>
          event.type === "damage" && event.sourceId === "dodged-attacker",
      ),
    ).toBe(false);

    const buffContent = clonedContent();
    const killer = buffContent.units.find((unit) => unit.id === "tashigi")!;
    const victim = buffContent.units.find((unit) => unit.id === "chopper")!;
    killer.stats.attack = 10_000;
    killer.stats.range = 10;
    victim.stats.health = 1;
    victim.stats.defense = 0;
    victim.stats.range = 0;
    const buffResult = simulateBattle(
      team(
        "a",
        [setupUnit("killer", "tashigi", 0, 5)],
        activeEffects({ kind: "stacking-attack-percent", value: 7 }),
      ),
      team("b", [setupUnit("victim", "chopper", 0, 0)]),
      { seed: "stacking-buff-event", maxTicks: 1 },
      buffContent,
    );
    const deathIndex = buffResult.events.findIndex(
      (event) => event.type === "death" && event.unitId === "victim",
    );
    expect(buffResult.events[deathIndex + 1]).toMatchObject({
      type: "buff",
      sourceId: "killer",
      targetId: "killer",
      stat: "attack",
      amount: 700,
      value: 10_700,
      reason: "stacking-attack",
    });
  });

  it("emits damage before the omnivamp heal caused by that damage", () => {
    const content = clonedContent();
    const tashigi = content.units.find((unit) => unit.id === "tashigi")!;
    const usopp = content.units.find((unit) => unit.id === "usopp")!;
    for (const definition of [tashigi, usopp]) {
      definition.stats = {
        health: 1_000,
        attack: 100,
        defense: 0,
        range: 10,
        attackIntervalMs: 100,
        moveIntervalMs: 100,
      };
    }

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("z-vamp", "tashigi", 0, 5)],
        activeEffects(
          { kind: "critical-chance-percent", value: -10 },
          { kind: "omnivamp-percent", value: 100 },
        ),
      ),
      team(
        "b",
        [setupUnit("a-opener", "usopp", 0, 0)],
        activeEffects({ kind: "critical-chance-percent", value: -10 }),
      ),
      { seed: "omnivamp-event-order", maxTicks: 1 },
      content,
    );
    const damageIndex = result.events.findIndex(
      (event) => event.type === "damage" && event.sourceId === "z-vamp",
    );
    const healIndex = result.events.findIndex(
      (event) => event.type === "heal" && event.sourceId === "z-vamp",
    );

    expect(damageIndex).toBeGreaterThan(-1);
    expect(healIndex).toBeGreaterThan(damageIndex);
  });
});
