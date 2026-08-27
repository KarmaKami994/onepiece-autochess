import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
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

function team(
  id: string,
  units: BattleSetupUnit[],
  activeTraits: ActiveTrait[] = [],
): BattleTeam {
  return { id, units, activeTraits };
}

function startingEnergy(value: number): ActiveTrait[] {
  return [
    {
      traitId: "phase8a-starting-energy",
      count: 1,
      tierIndex: 0,
      tier: {
        required: 1,
        label: `${value} starting energy`,
        effects: [{ kind: "starting-energy", value }],
      },
    },
  ];
}

function definition(content: GameContent, id: string) {
  const result = content.units.find((unit) => unit.id === id);
  if (!result) throw new Error(`Missing ${id} definition`);
  return result;
}

function enemyDefinition(content: GameContent, id: string) {
  const result = content.enemies.find((enemy) => enemy.id === id);
  if (!result) throw new Error(`Missing ${id} enemy definition`);
  return result;
}

function sourceEvents(
  events: BattleEvent[],
  sourceId: string,
): BattleEvent[] {
  return events.filter(
    (event) =>
      ("sourceId" in event && event.sourceId === sourceId) ||
      (event.type === "unit-displace" && event.unitId === sourceId),
  );
}

function resultHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

describe("Phase 8A PAC-style combat cadence and Tashigi lunge", () => {
  it("declares targetless support abilities and the lunge mechanic in content", () => {
    const chopper = definition(DEFAULT_CONTENT, "chopper");
    const tashigi = definition(DEFAULT_CONTENT, "tashigi");
    const nami = definition(DEFAULT_CONTENT, "nami");

    expect(chopper.ability.requiresTarget).toBe(false);
    expect(tashigi.ability).toMatchObject({
      requiresTarget: false,
      signatureMechanics: [{ kind: "lunge" }],
    });
    expect(nami.ability.requiresTarget ?? true).toBe(true);
    expect(tashigi.ability.castAnimationMs).toBeGreaterThan(0);
    expect("castTimeMs" in tashigi.ability).toBe(false);
  });

  it("moves toward an out-of-range target before a targeted cast", () => {
    const content = clonedContent();
    const nami = definition(content, "nami");
    const chopper = definition(content, "chopper");
    nami.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 1,
      attackIntervalMs: 100,
      moveIntervalMs: 100,
    };
    chopper.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 100,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("caster", "nami", 0, 5)],
        startingEnergy(100),
      ),
      team("b", [setupUnit("target", "chopper", 0, 0)]),
      { seed: "phase8a-target-range", maxTicks: 5 },
      content,
    );
    const moves = result.events.filter(
      (event) => event.type === "unit-move" && event.unitId === "caster",
    );
    const cast = result.events.find(
      (event) => event.type === "cast" && event.sourceId === "caster",
    );

    expect(moves.map((event) => event.tick)).toEqual([1, 2, 3, 4]);
    expect(cast).toMatchObject({
      type: "cast",
      tick: 5,
      sourceId: "caster",
      targetIds: ["target"],
    });
  });

  it("shares one action window between attacks and targeted casts", () => {
    const content = clonedContent();
    const nami = definition(content, "nami");
    const chopper = definition(content, "chopper");
    nami.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 10,
      attackIntervalMs: 400,
      moveIntervalMs: 100,
    };
    chopper.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 0,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("caster", "nami", 0, 5)],
        startingEnergy(90),
      ),
      team("b", [setupUnit("target", "chopper", 0, 0)]),
      { seed: "phase8a-shared-action-window", maxTicks: 5 },
      content,
    );
    const actions = result.events.filter(
      (event) =>
        (event.type === "attack" || event.type === "cast") &&
        event.sourceId === "caster",
    );

    expect(actions.map((event) => [event.type, event.tick])).toEqual([
      ["attack", 1],
      ["cast", 5],
    ]);
  });

  it("lets Chopper heal the most injured ally from a movement action", () => {
    const content = clonedContent();
    const chopper = definition(content, "chopper");
    const weakAttacker = definition(content, "usopp");
    const strongAttacker = definition(content, "garp");
    const ally = enemyDefinition(content, "marine-recruit");

    chopper.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 1,
      attackIntervalMs: 100,
      moveIntervalMs: 100,
    };
    ally.stats = {
      health: 2_000,
      attack: 1,
      defense: 0,
      range: 100,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };
    weakAttacker.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 100,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };
    strongAttacker.stats = {
      health: 100_000,
      attack: 500,
      defense: 0,
      range: 100,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };

    const result = simulateBattle(
      team(
        "a",
        [
          setupUnit("doctor", "chopper", 0, 5),
          setupUnit("injured-ally", "marine-recruit", 7, 5),
        ],
        startingEnergy(95),
      ),
      team("b", [
        setupUnit("weak-enemy", "usopp", 0, 0),
        setupUnit("strong-enemy", "garp", 7, 0),
      ]),
      { seed: "phase8a-chopper-moving-cast", maxTicks: 2 },
      content,
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "unit-move",
        tick: 1,
        unitId: "doctor",
      }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "cast",
        tick: 2,
        sourceId: "doctor",
        targetIds: ["injured-ally"],
      }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "heal",
        tick: 2,
        sourceId: "doctor",
        targetId: "injured-ally",
      }),
    );
  });

  it("lunges to the first free neighbor in row-major order and resolves immediately", () => {
    const content = clonedContent();
    const tashigi = definition(content, "tashigi");
    const target = definition(content, "chopper");
    const blocker = enemyDefinition(content, "marine-recruit");
    tashigi.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 1,
      attackIntervalMs: 1_000,
      moveIntervalMs: 400,
    };
    tashigi.ability.castAnimationMs = 9_999;
    target.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 0,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };
    blocker.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 100,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };

    const battle = () =>
      simulateBattle(
        team(
          "a",
          [
            setupUnit("tashigi", "tashigi", 7, 5),
            setupUnit("block-1", "marine-recruit", 2, 1),
            setupUnit("block-2", "marine-recruit", 3, 1),
            setupUnit("block-3", "marine-recruit", 4, 1),
            setupUnit("block-4", "marine-recruit", 2, 2),
          ],
          startingEnergy(100),
        ),
        team("b", [setupUnit("target", "chopper", 3, 2)]),
        { seed: "phase8a-row-major-lunge", maxTicks: 2 },
        content,
      );
    const first = battle();
    const second = battle();
    const relevant = sourceEvents(first.events, "tashigi").filter(
      (event) =>
        event.type === "cast" ||
        event.type === "unit-displace" ||
        event.type === "damage",
    );

    expect(relevant.slice(0, 3).map((event) => [event.type, event.tick])).toEqual([
      ["cast", 1],
      ["unit-displace", 1],
      ["damage", 1],
    ]);
    expect(relevant[1]).toMatchObject({
      type: "unit-displace",
      unitId: "tashigi",
      sourceId: "tashigi",
      abilityId: "flash-cut",
      movementKind: "lunge",
      from: { x: 7, y: 5 },
      to: { x: 4, y: 2 },
    });
    expect(first.events).toContainEqual(
      expect.objectContaining({
        type: "attack",
        tick: 2,
        sourceId: "tashigi",
        targetId: "target",
      }),
    );
    expect(resultHash(first)).toBe(resultHash(second));
  });

  it("uses the first valid row-major neighbor when the target is on a corner", () => {
    const content = clonedContent();
    const tashigi = definition(content, "tashigi");
    const target = definition(content, "chopper");
    tashigi.stats.health = 100_000;
    target.stats.health = 100_000;
    target.stats.range = 0;

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("tashigi", "tashigi", 7, 5)],
        startingEnergy(100),
      ),
      team("b", [setupUnit("target", "chopper", 0, 0)]),
      { seed: "phase8a-corner-lunge", maxTicks: 1 },
      content,
    );
    const displacement = result.events.find(
      (event) =>
        event.type === "unit-displace" && event.unitId === "tashigi",
    );

    expect(displacement).toMatchObject({
      type: "unit-displace",
      from: { x: 7, y: 5 },
      to: { x: 1, y: 0 },
    });
  });

  it("consumes energy but deals no damage when all lunge cells are blocked", () => {
    const content = clonedContent();
    const tashigi = definition(content, "tashigi");
    const target = definition(content, "chopper");
    const blocker = enemyDefinition(content, "marine-recruit");
    tashigi.stats.health = 100_000;
    target.stats.health = 100_000;
    target.stats.range = 0;
    blocker.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 100,
      attackIntervalMs: 10_000,
      moveIntervalMs: 10_000,
    };
    const occupiedNeighbors = [
      [2, 1],
      [3, 1],
      [4, 1],
      [2, 2],
      [4, 2],
      [2, 3],
      [3, 3],
      [4, 3],
    ].map(([x, y], index) =>
      setupUnit(`block-${index}`, "marine-recruit", x, y),
    );

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("tashigi", "tashigi", 7, 5), ...occupiedNeighbors],
        startingEnergy(100),
      ),
      team("b", [setupUnit("target", "chopper", 3, 2)]),
      { seed: "phase8a-blocked-lunge", maxTicks: 1 },
      content,
    );
    const finalTashigi = result.finalUnits.find(
      (unit) => unit.id === "tashigi",
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "cast",
        tick: 1,
        sourceId: "tashigi",
      }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "energy",
        tick: 1,
        unitId: "tashigi",
        amount: -100,
        value: 0,
        reason: "cast-reset",
      }),
    );
    expect(
      result.events.some(
        (event) =>
          event.type === "unit-displace" && event.unitId === "tashigi",
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.type === "damage" &&
          event.sourceId === "tashigi" &&
          event.damageKind === "ability",
      ),
    ).toBe(false);
    expect(finalTashigi).toMatchObject({ x: 7, y: 5, energy: 0 });
  });

  it("caps energy at 100 instead of allowing PAC-style overcharge", () => {
    const content = clonedContent();
    const nami = definition(content, "nami");
    const target = definition(content, "chopper");
    nami.stats = {
      health: 100_000,
      attack: 1,
      defense: 0,
      range: 10,
      attackIntervalMs: 100,
      moveIntervalMs: 100,
    };
    target.stats.health = 100_000;
    target.stats.range = 0;

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("attacker", "nami", 0, 5)],
        startingEnergy(95),
      ),
      team("b", [setupUnit("target", "chopper", 0, 0)]),
      { seed: "phase8a-energy-cap", maxTicks: 1 },
      content,
    );
    const attackEnergy = result.events.find(
      (event) =>
        event.type === "energy" &&
        event.unitId === "attacker" &&
        event.reason === "attack",
    );

    expect(attackEnergy).toMatchObject({ amount: 5, value: 100 });
    expect(
      result.events
        .filter((event) => event.type === "energy")
        .every((event) => event.value >= 0 && event.value <= 100),
    ).toBe(true);
  });
});
