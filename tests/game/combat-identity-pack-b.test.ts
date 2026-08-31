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
  options: { health?: number; range?: number } = {},
): void {
  const unit = combatDefinition(content, id);
  unit.stats = {
    ...unit.stats,
    health: options.health ?? 1_000,
    attack: 1,
    defense: 0,
    range: options.range ?? 0,
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
          traitId: "combat-identity-pack-b-test",
          count: 1,
          tierIndex: 0,
          tier: {
            required: 1,
            label: "Combat identity pack B test",
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
    { seed: options.seed ?? `${sourceDefinitionId}-pack-b`, maxTicks: 1 },
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
      event.type === "energy" &&
      event.reason === "ability-drain",
  );
}

describe("Combat Identity Pack B content", () => {
  it("declares the four locked identities without changing base values", () => {
    expect(definition(DEFAULT_CONTENT, "sabo")).toMatchObject({
      cost: 2,
      traits: ["revolutionary", "brotherhood", "brawler"],
      stats: {
        health: 760,
        attack: 72,
        defense: 23,
        range: 1,
        attackIntervalMs: 1_000,
        moveIntervalMs: 400,
      },
      ability: {
        id: "dragon-claw",
        power: 190,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        stunMs: 600,
      },
    });
    expect(definition(DEFAULT_CONTENT, "luffy")).toMatchObject({
      cost: 3,
      traits: [
        "straw-hat",
        "supernova",
        "brotherhood",
        "captain",
        "brawler",
      ],
      stats: {
        health: 900,
        attack: 80,
        defense: 28,
        range: 2,
        attackIntervalMs: 900,
        moveIntervalMs: 400,
      },
      ability: {
        id: "gum-gum-gatling",
        power: 75,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        hits: 3,
        signatureMechanics: [{ kind: "knockback" }],
      },
    });
    expect(definition(DEFAULT_CONTENT, "kid")).toMatchObject({
      cost: 3,
      traits: ["supernova", "captain"],
      stats: {
        health: 920,
        attack: 78,
        defense: 32,
        range: 2,
        attackIntervalMs: 1_100,
        moveIntervalMs: 500,
      },
      ability: {
        id: "magnetic-crush",
        power: 275,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        stunMs: 800,
        signatureMechanics: [{ kind: "pull" }],
      },
    });
    expect(definition(DEFAULT_CONTENT, "crocodile")).toMatchObject({
      cost: 3,
      traits: ["warlord", "specialist", "marksman"],
      stats: {
        health: 760,
        attack: 74,
        defense: 22,
        range: 4,
        attackIntervalMs: 1_100,
        moveIntervalMs: 500,
      },
      ability: {
        id: "desert-spada",
        power: 300,
        targeting: "farthest-enemy",
        pattern: "line",
        energyDrain: 15,
      },
    });
    expect(DEFAULT_CONTENT.version).toBe("1.15.1");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });
});

describe("Sabo Dragon Claw stun", () => {
  it("damages, grants damaged Energy, then briefly stuns every survivor", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "sabo",
      [
        setupUnit("a-primary", "chopper", 3, 2),
        setupUnit("b-adjacent", "chopper", 4, 2),
      ],
      { enemyEnergy: 40 },
    );

    expect(abilityDamage(result, "sabo")).toMatchObject([
      { targetId: "a-primary", amount: 190 },
      { targetId: "b-adjacent", amount: 190 },
    ]);
    expect(statuses(result, "sabo")).toMatchObject([
      { targetId: "a-primary", status: "stun", durationTicks: 6 },
      { targetId: "b-adjacent", status: "stun", durationTicks: 6 },
    ]);
    for (const targetId of ["a-primary", "b-adjacent"]) {
      const damageIndex = result.events.findIndex(
        (event) => event.type === "damage" && event.targetId === targetId,
      );
      const energyIndex = result.events.findIndex(
        (event) =>
          event.type === "energy" &&
          event.unitId === targetId &&
          event.reason === "damaged",
      );
      const stunIndex = result.events.findIndex(
        (event) => event.type === "status" && event.targetId === targetId,
      );
      expect(damageIndex).toBeLessThan(energyIndex);
      expect(energyIndex).toBeLessThan(stunIndex);
    }
    expect(displacements(result, "sabo")).toHaveLength(0);
    expect(drains(result)).toHaveLength(0);
    expect(statuses(result, "sabo").some((event) => event.status === "burn"))
      .toBe(false);
  });

  it("does not stun a target killed by the unchanged 190 damage", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 190 });
    const result = runSingleTickCast(content, "sabo", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    expect(abilityDamage(result, "sabo")).toMatchObject([{ amount: 190 }]);
    expect(statuses(result, "sabo")).toHaveLength(0);
  });
});

describe("Luffy Gum-Gum Gatling knockback", () => {
  it("keeps three full-power hits and per-hit Energy before knockback", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "luffy",
      [
        setupUnit("a-primary", "chopper", 3, 2),
        setupUnit("b-adjacent", "chopper", 3, 3),
      ],
      { enemyEnergy: 0 },
    );
    const damage = abilityDamage(result, "luffy");
    const firstKnockbackIndex = result.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "luffy",
    );
    const lastDamageIndex = result.events.findLastIndex(
      (event) => event.type === "damage" && event.sourceId === "luffy",
    );

    for (const targetId of ["a-primary", "b-adjacent"]) {
      expect(
        damage
          .filter((event) => event.targetId === targetId)
          .map((event) => event.amount),
      ).toEqual([75, 75, 75]);
      expect(
        result.events.filter(
          (event) =>
            event.type === "energy" &&
            event.unitId === targetId &&
            event.reason === "damaged",
        ),
      ).toHaveLength(3);
    }
    expect(displacements(result, "luffy")).toMatchObject([
      {
        unitId: "a-primary",
        movementKind: "knockback",
        from: { x: 3, y: 2 },
        to: { x: 4, y: 2 },
      },
      {
        unitId: "b-adjacent",
        movementKind: "knockback",
        from: { x: 3, y: 3 },
        to: { x: 4, y: 3 },
      },
    ]);
    expect(lastDamageIndex).toBeLessThan(firstKnockbackIndex);
  });

  it("does not knock back a target killed by the third hit", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 225 });
    const result = runSingleTickCast(content, "luffy", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    expect(abilityDamage(result, "luffy")).toHaveLength(3);
    expect(displacements(result, "luffy")).toHaveLength(0);
  });

  it("keeps all damage when the knockback destination is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "luffy", [
      setupUnit("a-target", "chopper", 3, 2),
      setupUnit("z-blocker", "chopper", 4, 2),
    ]);

    expect(
      abilityDamage(result, "luffy").filter(
        (event) => event.targetId === "a-target",
      ),
    ).toHaveLength(3);
    expect(
      displacements(result, "luffy").some(
        (event) => event.unitId === "a-target",
      ),
    ).toBe(false);
  });
});

describe("Kid Magnetic Crush pull", () => {
  it.each([
    {
      label: "horizontal",
      target: { x: 4, y: 2 },
      destination: { x: 3, y: 2 },
    },
    {
      label: "vertical",
      target: { x: 2, y: 4 },
      destination: { x: 2, y: 3 },
    },
  ])("pulls a survivor exactly one $label cell", ({ target, destination }) => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "kid", [
      setupUnit("target", "chopper", target.x, target.y),
    ]);

    expect(abilityDamage(result, "kid")).toMatchObject([{ amount: 275 }]);
    expect(statuses(result, "kid")).toMatchObject([
      { status: "stun", durationTicks: 8 },
    ]);
    expect(displacements(result, "kid")).toMatchObject([
      {
        unitId: "target",
        abilityId: "magnetic-crush",
        movementKind: "pull",
        from: target,
        to: destination,
      },
    ]);
  });

  it("prefers horizontal movement for an equal diagonal", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "kid", [
      setupUnit("target", "chopper", 3, 3),
    ]);

    expect(displacements(result, "kid")).toMatchObject([
      { from: { x: 3, y: 3 }, to: { x: 2, y: 3 } },
    ]);
  });

  it("uses the vertical fallback when the preferred diagonal cell is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "kid", [
      setupUnit("a-target", "chopper", 3, 3),
      setupUnit("z-blocker", "chopper", 2, 3),
    ]);

    expect(displacements(result, "kid")).toContainEqual(
      expect.objectContaining({
        unitId: "a-target",
        from: { x: 3, y: 3 },
        to: { x: 3, y: 2 },
      }),
    );
  });

  it("does not pull an aligned adjacent target into Kid's occupied cell", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "kid", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    expect(abilityDamage(result, "kid")).toHaveLength(1);
    expect(statuses(result, "kid")).toHaveLength(1);
    expect(displacements(result, "kid")).toHaveLength(0);
  });

  it("keeps damage and stun when both pull candidates are blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(content, "kid", [
      setupUnit("a-target", "chopper", 3, 3),
      setupUnit("z-horizontal", "chopper", 2, 3),
      setupUnit("z-vertical", "chopper", 3, 2),
    ]);

    expect(
      abilityDamage(result, "kid").find(
        (event) => event.targetId === "a-target",
      ),
    ).toMatchObject({ amount: 275 });
    expect(
      statuses(result, "kid").find(
        (event) => event.targetId === "a-target",
      ),
    ).toMatchObject({ status: "stun", durationTicks: 8 });
    expect(
      displacements(result, "kid").some(
        (event) => event.unitId === "a-target",
      ),
    ).toBe(false);
  });

  it("does not stun or pull a target killed by the unchanged damage", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 275 });
    const result = runSingleTickCast(content, "kid", [
      setupUnit("target", "chopper", 4, 2),
    ]);

    expect(abilityDamage(result, "kid")).toMatchObject([{ amount: 275 }]);
    expect(statuses(result, "kid")).toHaveLength(0);
    expect(displacements(result, "kid")).toHaveLength(0);
  });

  it("resolves collisions by unit id after all damage and stun deterministically", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    definition(content, "kid").stats.range = 10;
    const battle = () =>
      runSingleTickCast(
        content,
        "kid",
        [
          setupUnit("b-second", "chopper", 3, 4),
          setupUnit("a-first", "chopper", 4, 3),
        ],
        { seed: "kid-pull-collision-order" },
      );

    const first = battle();
    const second = battle();
    const pulls = displacements(first, "kid");
    const firstPullIndex = first.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "kid",
    );
    const lastStatusIndex = first.events.findLastIndex(
      (event) => event.type === "status" && event.sourceId === "kid",
    );

    expect(pulls).toMatchObject([
      { unitId: "a-first", to: { x: 3, y: 3 }, movementKind: "pull" },
      { unitId: "b-second", to: { x: 2, y: 4 }, movementKind: "pull" },
    ]);
    expect(abilityDamage(first, "kid")).toHaveLength(2);
    expect(statuses(first, "kid")).toHaveLength(2);
    expect(lastStatusIndex).toBeLessThan(firstPullIndex);
    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(pulls))).toEqual(pulls);
  });
});

describe("Crocodile Desert Spada Energy Drain", () => {
  it("keeps farthest line damage and drains only surviving original targets", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "crocodile",
      [
        setupUnit("a-near", "chopper", 3, 2),
        setupUnit("b-far", "chopper", 5, 2),
        setupUnit("c-outside", "chopper", 3, 3),
      ],
      { enemyEnergy: 40, sourcePosition: { x: 1, y: 2 } },
    );
    const firstDrainIndex = result.events.findIndex(
      (event) => event.type === "energy" && event.reason === "ability-drain",
    );
    const lastDamagedEnergyIndex = result.events.findLastIndex(
      (event) => event.type === "energy" && event.reason === "damaged",
    );

    expect(abilityDamage(result, "crocodile")).toMatchObject([
      { targetId: "a-near", amount: 300 },
      { targetId: "b-far", amount: 300 },
    ]);
    expect(drains(result)).toMatchObject([
      { unitId: "a-near", amount: -15, value: 30 },
      { unitId: "b-far", amount: -15, value: 30 },
    ]);
    expect(
      result.finalUnits.find((unit) => unit.id === "c-outside")?.energy,
    ).toBe(40);
    expect(lastDamagedEnergyIndex).toBeLessThan(firstDrainIndex);
  });

  it("does not drain a dead line target", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 300 });
    configureCombatant(content, "marine-recruit");
    const result = runSingleTickCast(
      content,
      "crocodile",
      [
        setupUnit("a-dead", "chopper", 3, 2),
        setupUnit("b-survivor", "marine-recruit", 5, 2),
      ],
      { enemyEnergy: 40, sourcePosition: { x: 1, y: 2 } },
    );

    expect(drains(result).map((event) => event.unitId)).toEqual([
      "b-survivor",
    ]);
  });

  it("inherits clamped generic drain without a zero-delta event", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTickCast(
      content,
      "crocodile",
      [setupUnit("target", "chopper", 5, 2)],
      { enemyEnergy: 0, sourcePosition: { x: 1, y: 2 } },
    );

    expect(drains(result)).toMatchObject([
      { unitId: "target", amount: -5, value: 0 },
    ]);
    expect(drains(result).some((event) => event.amount === 0))
      .toBe(false);
  });
});
