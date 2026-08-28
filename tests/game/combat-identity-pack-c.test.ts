import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
  type Position,
  type TraitEffect,
} from "../../game";

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type DisplaceEvent = Extract<BattleEvent, { type: "unit-displace" }>;
type EnergyEvent = Extract<BattleEvent, { type: "energy" }>;
type StatusEvent = Extract<BattleEvent, { type: "status" }>;

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
}

function definition(content: GameContent, id: string) {
  const result = content.units.find((unit) => unit.id === id);
  if (!result) throw new Error(`Missing ${id} definition`);
  return result;
}

function combatDefinition(content: GameContent, id: string) {
  const result =
    content.units.find((unit) => unit.id === id) ??
    content.enemies.find((unit) => unit.id === id);
  if (!result) throw new Error(`Missing ${id} combat definition`);
  return result;
}

function configureCombatant(
  content: GameContent,
  id: string,
  health = 1_000,
): void {
  const unit = combatDefinition(content, id);
  unit.stats = {
    ...unit.stats,
    health,
    attack: 1,
    defense: 0,
    range: 0,
    attackIntervalMs: 10_000,
    moveIntervalMs: 10_000,
  };
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
  return effects.length === 0
    ? []
    : [
        {
          traitId: "combat-identity-pack-c-test",
          count: 1,
          tierIndex: 0,
          tier: {
            required: 1,
            label: "Combat identity pack C test",
            effects,
          },
        },
      ];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return { id, units, activeTraits: activeEffects(...effects) };
}

function runSingleTickCast(
  content: GameContent,
  sourceDefinitionId: string,
  enemies: BattleSetupUnit[],
  options: {
    enemyEnergy?: number;
    seed?: string;
    sourcePosition?: Position;
  } = {},
): BattleResult {
  const source = options.sourcePosition ?? { x: 2, y: 2 };
  const enemyEffects =
    options.enemyEnergy === undefined
      ? []
      : [{ kind: "starting-energy", value: options.enemyEnergy } as const];
  return simulateBattle(
    team(
      "a",
      [setupUnit(sourceDefinitionId, sourceDefinitionId, source.x, source.y)],
      [{ kind: "starting-energy", value: 100 }],
    ),
    team("b", enemies, enemyEffects),
    { seed: options.seed ?? `${sourceDefinitionId}-pack-c`, maxTicks: 1 },
    content,
  );
}

function abilityDamage(result: BattleResult, sourceId: string): DamageEvent[] {
  return result.events.filter(
    (event): event is DamageEvent =>
      event.type === "damage" &&
      event.sourceId === sourceId &&
      event.damageKind === "ability",
  );
}

function statuses(result: BattleResult, sourceId: string): StatusEvent[] {
  return result.events.filter(
    (event): event is StatusEvent =>
      event.type === "status" && event.sourceId === sourceId,
  );
}

function displacements(
  result: BattleResult,
  sourceId: string,
): DisplaceEvent[] {
  return result.events.filter(
    (event): event is DisplaceEvent =>
      event.type === "unit-displace" && event.sourceId === sourceId,
  );
}

function drains(result: BattleResult): EnergyEvent[] {
  return result.events.filter(
    (event): event is EnergyEvent =>
      event.type === "energy" && event.reason === "ability-drain",
  );
}

describe("Combat Identity Pack C content", () => {
  it("declares the four locked identities without changing base values", () => {
    expect(definition(DEFAULT_CONTENT, "law")).toMatchObject({
      cost: 4,
      traits: ["supernova", "warlord", "captain"],
      stats: {
        health: 900,
        attack: 86,
        defense: 28,
        range: 3,
        attackIntervalMs: 1_000,
        moveIntervalMs: 400,
      },
      ability: {
        id: "room-shambles",
        power: 195,
        targeting: "nearest-enemy",
        pattern: "all-enemies",
        signatureMechanics: [{ kind: "pull" }],
      },
    });
    expect(definition(DEFAULT_CONTENT, "ace")).toMatchObject({
      cost: 4,
      traits: ["brotherhood", "marksman"],
      stats: {
        health: 820,
        attack: 90,
        defense: 22,
        range: 5,
        attackIntervalMs: 1_000,
        moveIntervalMs: 500,
      },
      ability: {
        id: "fire-fist",
        power: 390,
        targeting: "farthest-enemy",
        pattern: "adjacent",
        burnPower: 28,
        burnDurationMs: 4_000,
        signatureMechanics: [{ kind: "knockback" }],
      },
    });
    expect(definition(DEFAULT_CONTENT, "hancock")).toMatchObject({
      cost: 4,
      traits: ["warlord", "specialist"],
      stats: {
        health: 850,
        attack: 82,
        defense: 26,
        range: 4,
        attackIntervalMs: 1_000,
        moveIntervalMs: 500,
      },
      ability: {
        id: "mero-mero",
        power: 235,
        targeting: "nearest-enemy",
        pattern: "all-enemies",
        stunMs: 1_000,
        energyDrain: 10,
      },
    });
    expect(definition(DEFAULT_CONTENT, "doflamingo")).toMatchObject({
      cost: 4,
      traits: ["warlord", "specialist"],
      stats: {
        health: 900,
        attack: 88,
        defense: 28,
        range: 4,
        attackIntervalMs: 1_000,
        moveIntervalMs: 500,
      },
      ability: {
        id: "string-bind",
        power: 315,
        targeting: "lowest-health-enemy",
        pattern: "adjacent",
        stunMs: 1_400,
        signatureMechanics: [{ kind: "pull" }],
      },
    });
    expect(DEFAULT_CONTENT.version).toBe("1.11.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });
});

describe("Law ROOM/Shambles pull", () => {
  it("damages every enemy before deterministic pulls", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const battle = () =>
      runSingleTickCast(
        content,
        "law",
        [
          setupUnit("b-vertical", "chopper", 2, 4),
          setupUnit("a-horizontal", "chopper", 4, 3),
          setupUnit("c-adjacent", "chopper", 3, 2),
        ],
        { seed: "law-global-pull" },
      );
    const first = battle();
    const second = battle();
    const firstPullIndex = first.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "law",
    );
    const lastDamageIndex = first.events.findLastIndex(
      (event) => event.type === "damage" && event.sourceId === "law",
    );

    expect(abilityDamage(first, "law")).toMatchObject([
      { targetId: "a-horizontal", amount: 195 },
      { targetId: "b-vertical", amount: 195 },
      { targetId: "c-adjacent", amount: 195 },
    ]);
    expect(displacements(first, "law")).toMatchObject([
      {
        unitId: "a-horizontal",
        movementKind: "pull",
        from: { x: 4, y: 3 },
        to: { x: 3, y: 3 },
      },
      {
        unitId: "b-vertical",
        movementKind: "pull",
        from: { x: 2, y: 4 },
        to: { x: 2, y: 3 },
      },
    ]);
    expect(
      displacements(first, "law").some(
        (event) => event.unitId === "c-adjacent",
      ),
    ).toBe(false);
    expect(lastDamageIndex).toBeLessThan(firstPullIndex);
    expect(first).toEqual(second);
  });

  it("does not pull dead enemies and keeps damage when a survivor is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", 195);
    configureCombatant(content, "marine-recruit");
    const result = runSingleTickCast(content, "law", [
      setupUnit("a-blocked", "marine-recruit", 4, 3),
      setupUnit("b-dead", "chopper", 6, 5),
      setupUnit("z-horizontal", "marine-recruit", 3, 3),
      setupUnit("z-vertical", "marine-recruit", 4, 2),
    ]);

    expect(abilityDamage(result, "law")).toHaveLength(4);
    expect(
      displacements(result, "law").some(
        (event) => event.unitId === "a-blocked" || event.unitId === "b-dead",
      ),
    ).toBe(false);
  });
});

describe("Ace Fire Fist knockback", () => {
  it("keeps damage and burn before knocking surviving targets backward", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "ace",
      [
        setupUnit("a-primary", "chopper", 5, 2),
        setupUnit("b-adjacent", "chopper", 5, 3),
      ],
      { sourcePosition: { x: 1, y: 2 } },
    );
    const firstKnockbackIndex = result.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "ace",
    );
    const lastStatusIndex = result.events.findLastIndex(
      (event) => event.type === "status" && event.sourceId === "ace",
    );

    expect(abilityDamage(result, "ace")).toMatchObject([
      { targetId: "a-primary", amount: 390 },
      { targetId: "b-adjacent", amount: 390 },
    ]);
    expect(statuses(result, "ace")).toMatchObject([
      { targetId: "a-primary", status: "burn", durationTicks: 40 },
      { targetId: "b-adjacent", status: "burn", durationTicks: 40 },
    ]);
    expect(displacements(result, "ace")).toMatchObject([
      { unitId: "a-primary", movementKind: "knockback", to: { x: 6, y: 2 } },
      { unitId: "b-adjacent", movementKind: "knockback", to: { x: 6, y: 3 } },
    ]);
    expect(lastStatusIndex).toBeLessThan(firstKnockbackIndex);
  });

  it("does not knock back a target killed by Fire Fist", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", 390);
    const result = runSingleTickCast(
      content,
      "ace",
      [setupUnit("target", "chopper", 5, 2)],
      { sourcePosition: { x: 1, y: 2 } },
    );

    expect(abilityDamage(result, "ace")).toMatchObject([{ amount: 390 }]);
    expect(displacements(result, "ace")).toHaveLength(0);
  });

  it("keeps damage and burn when the knockback destination is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "ace",
      [
        setupUnit("a-target", "chopper", 5, 2),
        setupUnit("z-blocker", "chopper", 6, 2),
      ],
      { sourcePosition: { x: 1, y: 2 } },
    );

    expect(
      abilityDamage(result, "ace").find((event) => event.targetId === "a-target"),
    ).toMatchObject({ amount: 390 });
    expect(
      statuses(result, "ace").find((event) => event.targetId === "a-target"),
    ).toMatchObject({ status: "burn", durationTicks: 40 });
    expect(
      displacements(result, "ace").some((event) => event.unitId === "a-target"),
    ).toBe(false);
  });
});

describe("Hancock Mero Mero Energy Drain", () => {
  it("damages and stuns every enemy before draining exactly 10 Energy", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "hancock",
      [
        setupUnit("a-near", "chopper", 3, 2),
        setupUnit("b-global", "chopper", 7, 5),
      ],
      { enemyEnergy: 40 },
    );
    const firstDrainIndex = result.events.findIndex(
      (event) => event.type === "energy" && event.reason === "ability-drain",
    );
    const lastStatusIndex = result.events.findLastIndex(
      (event) => event.type === "status" && event.sourceId === "hancock",
    );

    expect(abilityDamage(result, "hancock")).toMatchObject([
      { targetId: "a-near", amount: 235 },
      { targetId: "b-global", amount: 235 },
    ]);
    expect(statuses(result, "hancock")).toMatchObject([
      { targetId: "a-near", status: "stun", durationTicks: 10 },
      { targetId: "b-global", status: "stun", durationTicks: 10 },
    ]);
    expect(drains(result)).toMatchObject([
      { unitId: "a-near", amount: -10, value: 35 },
      { unitId: "b-global", amount: -10, value: 35 },
    ]);
    for (const targetId of ["a-near", "b-global"]) {
      const damageIndex = result.events.findIndex(
        (event) => event.type === "damage" && event.targetId === targetId,
      );
      const damagedEnergyIndex = result.events.findIndex(
        (event) =>
          event.type === "energy" &&
          event.unitId === targetId &&
          event.reason === "damaged",
      );
      const stunIndex = result.events.findIndex(
        (event) => event.type === "status" && event.targetId === targetId,
      );
      expect(damageIndex).toBeLessThan(damagedEnergyIndex);
      expect(damagedEnergyIndex).toBeLessThan(stunIndex);
    }
    expect(lastStatusIndex).toBeLessThan(firstDrainIndex);
  });

  it("does not drain a dead all-enemies target", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", 235);
    configureCombatant(content, "marine-recruit");
    const result = runSingleTickCast(
      content,
      "hancock",
      [
        setupUnit("a-dead", "chopper", 3, 2),
        setupUnit("b-survivor", "marine-recruit", 7, 5),
      ],
      { enemyEnergy: 40 },
    );

    expect(abilityDamage(result, "hancock")).toHaveLength(2);
    expect(drains(result).map((event) => event.unitId)).toEqual(["b-survivor"]);
  });
});

describe("Doflamingo String Bind pull", () => {
  it("keeps the lowest-health-centered adjacent cluster and pulls survivors", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "doflamingo", [
      setupUnit("a-primary", "chopper", 3, 3),
      setupUnit("b-adjacent", "chopper", 4, 3),
      setupUnit("c-outside", "chopper", 7, 5),
    ]);
    const firstPullIndex = result.events.findIndex(
      (event) =>
        event.type === "unit-displace" && event.sourceId === "doflamingo",
    );
    const lastStatusIndex = result.events.findLastIndex(
      (event) => event.type === "status" && event.sourceId === "doflamingo",
    );

    expect(abilityDamage(result, "doflamingo")).toMatchObject([
      { targetId: "a-primary", amount: 315 },
      { targetId: "b-adjacent", amount: 315 },
    ]);
    expect(statuses(result, "doflamingo")).toMatchObject([
      { targetId: "a-primary", status: "stun", durationTicks: 14 },
      { targetId: "b-adjacent", status: "stun", durationTicks: 14 },
    ]);
    expect(displacements(result, "doflamingo")).toMatchObject([
      { unitId: "a-primary", movementKind: "pull", to: { x: 2, y: 3 } },
      { unitId: "b-adjacent", movementKind: "pull", to: { x: 3, y: 3 } },
    ]);
    expect(
      result.finalUnits.find((unit) => unit.id === "c-outside"),
    ).toMatchObject({ hp: 1_000, x: 7, y: 5 });
    expect(lastStatusIndex).toBeLessThan(firstPullIndex);
  });

  it("does not pull a dead affected enemy", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", 315);
    configureCombatant(content, "marine-recruit");
    const result = runSingleTickCast(content, "doflamingo", [
      setupUnit("a-dead", "chopper", 3, 3),
      setupUnit("b-survivor", "marine-recruit", 4, 3),
    ]);

    expect(abilityDamage(result, "doflamingo")).toHaveLength(2);
    expect(
      displacements(result, "doflamingo").map((event) => event.unitId),
    ).toEqual(["b-survivor"]);
  });

  it("keeps damage and stun when both pull candidates are blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "doflamingo", [
      setupUnit("a-blocked", "chopper", 3, 3),
      setupUnit("z-horizontal", "chopper", 2, 3),
      setupUnit("z-vertical", "chopper", 3, 2),
    ]);

    expect(
      abilityDamage(result, "doflamingo").find(
        (event) => event.targetId === "a-blocked",
      ),
    ).toMatchObject({ amount: 315 });
    expect(
      statuses(result, "doflamingo").find(
        (event) => event.targetId === "a-blocked",
      ),
    ).toMatchObject({ status: "stun", durationTicks: 14 });
    expect(
      displacements(result, "doflamingo").some(
        (event) => event.unitId === "a-blocked",
      ),
    ).toBe(false);
  });
});
