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
  options: {
    health?: number;
    attack?: number;
    range?: number;
  } = {},
): void {
  const unit = combatDefinition(content, id);
  unit.stats = {
    ...unit.stats,
    health: options.health ?? 1_000,
    attack: options.attack ?? 1,
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
  star: 1 | 2 | 3 = 1,
): BattleSetupUnit {
  return {
    id,
    definitionId,
    star,
    items: [],
    position: { x, y },
  };
}

function activeEffects(...effects: TraitEffect[]): ActiveTrait[] {
  return effects.length === 0
    ? []
    : [{
        traitId: "combat-identity-pack-a-test",
        count: 1,
        tierIndex: 0,
        tier: { required: 1, label: "Combat identity pack A test", effects },
      }];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return { id, units, activeTraits: activeEffects(...effects) };
}

function abilityDamage(result: BattleResult, sourceId: string): DamageEvent[] {
  return result.events.filter(
    (event): event is DamageEvent =>
      event.type === "damage" &&
      event.sourceId === sourceId &&
      event.damageKind === "ability",
  );
}

function knockbacks(result: BattleResult, sourceId: string): DisplaceEvent[] {
  return result.events.filter(
    (event): event is DisplaceEvent =>
      event.type === "unit-displace" &&
      event.sourceId === sourceId &&
      event.movementKind === "knockback",
  );
}

function runSingleTickCast(
  content: GameContent,
  sourceDefinitionId: string,
  enemies: BattleSetupUnit[],
  options: {
    allies?: BattleSetupUnit[];
    enemyEnergy?: number;
    seed?: string;
    sourcePosition?: Position;
  } = {},
): BattleResult {
  const source = options.sourcePosition ?? { x: 2, y: 2 };
  const enemyEffects = options.enemyEnergy === undefined
    ? []
    : [{ kind: "starting-energy", value: options.enemyEnergy } as const];
  return simulateBattle(
    team(
      "a",
      [
        setupUnit(sourceDefinitionId, sourceDefinitionId, source.x, source.y),
        ...(options.allies ?? []),
      ],
      [{ kind: "starting-energy", value: 100 }],
    ),
    team("b", enemies, enemyEffects),
    { seed: options.seed ?? `${sourceDefinitionId}-pack-a`, maxTicks: 1 },
    content,
  );
}

function runChopperEmergency(
  content: GameContent,
  damage: number,
  seed = "chopper-emergency-shield",
): BattleResult {
  configureCombatant(content, "chopper", { health: 1_000, range: 2 });
  definition(content, "chopper").stats.attackIntervalMs = 100;
  definition(content, "chopper").stats.moveIntervalMs = 100;
  configureCombatant(content, "marine-recruit", { health: 1_000 });
  configureCombatant(content, "nami", { health: 10_000, attack: 1, range: 100 });
  configureCombatant(content, "garp", {
    health: 10_000,
    attack: damage,
    range: 100,
  });
  return simulateBattle(
    team(
      "a",
      [
        setupUnit("doctor", "chopper", 0, 5),
        setupUnit("injured-ally", "marine-recruit", 7, 5),
      ],
      [{ kind: "starting-energy", value: 95 }],
    ),
    team(
      "b",
      [
        setupUnit("weak-enemy", "nami", 0, 0),
        setupUnit("strong-enemy", "garp", 7, 0),
      ],
      [{ kind: "critical-chance-percent", value: -10 }],
    ),
    { seed, maxTicks: 2 },
    content,
  );
}

describe("Combat Identity Pack A content", () => {
  it("declares only the requested mechanics without changing base values", () => {
    expect(definition(DEFAULT_CONTENT, "chopper")).toMatchObject({
      cost: 1,
      traits: ["straw-hat", "guardian"],
      stats: {
        health: 650,
        attack: 38,
        defense: 18,
        range: 2,
        attackIntervalMs: 1_300,
        moveIntervalMs: 500,
      },
      ability: {
        id: "emergency-cure",
        power: 220,
        effect: "heal",
        targeting: "lowest-health-ally",
        pattern: "single-ally",
        requiresTarget: false,
        conditionalShield: { healthThresholdPercent: 35, power: 100 },
      },
    });
    expect(definition(DEFAULT_CONTENT, "sanji").ability).toMatchObject({
      id: "diable-jambe",
      power: 235,
      burnPower: 18,
      burnDurationMs: 3_000,
      signatureMechanics: [{ kind: "knockback" }],
    });
    expect(definition(DEFAULT_CONTENT, "robin").ability).toMatchObject({
      id: "clutch",
      power: 205,
      stunMs: 1_200,
      energyDrain: 15,
    });
    expect(definition(DEFAULT_CONTENT, "smoker").ability).toMatchObject({
      id: "white-blow",
      power: 210,
      targeting: "nearest-enemy",
      pattern: "line",
      signatureMechanics: [{ kind: "knockback" }],
    });
    expect(DEFAULT_CONTENT.version).toBe("1.8.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });
});

describe("Chopper Emergency Cure conditional shield", () => {
  it.each([
    { damage: 700, startingHp: 300 },
    { damage: 650, startingHp: 350 },
  ])(
    "heals then shields a target beginning at $startingHp HP",
    ({ damage, startingHp }) => {
      const content = clonedContent();
      const result = runChopperEmergency(content, damage);
      const supportEvents = result.events.filter(
        (event) =>
          (event.type === "heal" || event.type === "shield") &&
          event.sourceId === "doctor",
      );

      expect(supportEvents).toMatchObject([
        { type: "heal", targetId: "injured-ally", amount: 220 },
        { type: "shield", targetId: "injured-ally", amount: 100 },
      ]);
      expect(
        result.events.find(
          (event) =>
            event.type === "damage" &&
            event.sourceId === "strong-enemy" &&
            event.targetId === "injured-ally",
        ),
      ).toMatchObject({ amount: damage });
      expect(startingHp + 220).toBeGreaterThan(350);
    },
  );

  it("heals without shielding above the emergency threshold", () => {
    const content = clonedContent();
    const result = runChopperEmergency(content, 600);

    expect(
      result.events.some(
        (event) => event.type === "heal" && event.sourceId === "doctor",
      ),
    ).toBe(true);
    expect(
      result.events.some(
        (event) => event.type === "shield" && event.sourceId === "doctor",
      ),
    ).toBe(false);
  });

  it.each([
    { healthThresholdPercent: -1, power: 100 },
    { healthThresholdPercent: 101, power: 100 },
    { healthThresholdPercent: 35, power: 0 },
    { healthThresholdPercent: 35.5, power: 100 },
  ])("ignores invalid conditional shield config %#", (conditionalShield) => {
    const content = clonedContent();
    definition(content, "chopper").ability.conditionalShield = conditionalShield;

    const result = runChopperEmergency(content, 700);

    expect(
      result.events.some(
        (event) => event.type === "heal" && event.sourceId === "doctor",
      ),
    ).toBe(true);
    expect(
      result.events.some(
        (event) => event.type === "shield" && event.sourceId === "doctor",
      ),
    ).toBe(false);
  });

  it("replays the emergency heal and shield deterministically", () => {
    const content = clonedContent();
    const first = runChopperEmergency(content, 700, "chopper-determinism");
    const second = runChopperEmergency(content, 700, "chopper-determinism");

    expect(first).toEqual(second);
  });
});

describe("Sanji Diable Jambe knockback", () => {
  it("keeps damage and burn before knocking a survivor backward", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");

    const result = runSingleTickCast(content, "sanji", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    expect(abilityDamage(result, "sanji")).toMatchObject([
      { targetId: "target", amount: 235 },
    ]);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "status",
        sourceId: "sanji",
        targetId: "target",
        status: "burn",
        durationTicks: 30,
      }),
    );
    expect(knockbacks(result, "sanji")).toMatchObject([
      {
        unitId: "target",
        abilityId: "diable-jambe",
        movementKind: "knockback",
        from: { x: 3, y: 2 },
        to: { x: 4, y: 2 },
      },
    ]);
  });

  it("does not knock back a target killed by the kick", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 235 });

    const result = runSingleTickCast(content, "sanji", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    expect(abilityDamage(result, "sanji")).toHaveLength(1);
    expect(knockbacks(result, "sanji")).toHaveLength(0);
  });

  it("keeps damage and burn when the knockback cell is occupied", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { range: 100 });

    const result = runSingleTickCast(
      content,
      "sanji",
      [setupUnit("target", "chopper", 3, 2)],
      { allies: [setupUnit("blocker", "marine-recruit", 4, 2)] },
    );

    expect(abilityDamage(result, "sanji")).toMatchObject([{ amount: 235 }]);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "status", status: "burn" }),
    );
    expect(knockbacks(result, "sanji")).toHaveLength(0);
  });
});

describe("Robin Clutch energy drain", () => {
  it("keeps damage and stun before using the shared Energy Drain", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");

    const result = runSingleTickCast(
      content,
      "robin",
      [setupUnit("target", "chopper", 3, 2)],
      { enemyEnergy: 40 },
    );
    const relevant = result.events.filter(
      (event) =>
        (event.type === "damage" && event.targetId === "target") ||
        (event.type === "energy" && event.unitId === "target") ||
        (event.type === "status" && event.targetId === "target"),
    );

    expect(relevant).toMatchObject([
      { type: "damage", amount: 205, damageKind: "ability" },
      { type: "energy", amount: 5, value: 45, reason: "damaged" },
      { type: "status", status: "stun", durationTicks: 12 },
      { type: "energy", amount: -15, value: 30, reason: "ability-drain" },
    ]);
  });

  it("does not drain a target killed by Clutch", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 205 });

    const result = runSingleTickCast(
      content,
      "robin",
      [setupUnit("target", "chopper", 3, 2)],
      { enemyEnergy: 40 },
    );

    expect(abilityDamage(result, "robin")).toHaveLength(1);
    expect(
      result.events.filter(
        (event): event is EnergyEvent =>
          event.type === "energy" && event.reason === "ability-drain",
      ),
    ).toHaveLength(0);
  });
});

describe("Smoker White Blow line knockback", () => {
  it("damages every line target before displacing each survivor", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");

    const result = runSingleTickCast(
      content,
      "smoker",
      [
        setupUnit("a-near", "chopper", 3, 2),
        setupUnit("b-far", "chopper", 5, 2),
      ],
      { sourcePosition: { x: 1, y: 2 } },
    );
    const firstDisplacementIndex = result.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "smoker",
    );
    const lastDamageIndex = result.events.findLastIndex(
      (event) => event.type === "damage" && event.sourceId === "smoker",
    );

    expect(abilityDamage(result, "smoker")).toMatchObject([
      { targetId: "a-near", amount: 210 },
      { targetId: "b-far", amount: 210 },
    ]);
    expect(knockbacks(result, "smoker")).toMatchObject([
      { unitId: "a-near", movementKind: "knockback", to: { x: 4, y: 2 } },
      { unitId: "b-far", movementKind: "knockback", to: { x: 6, y: 2 } },
    ]);
    expect(lastDamageIndex).toBeLessThan(firstDisplacementIndex);
  });

  it("does not displace dead line targets", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 210 });
    configureCombatant(content, "usopp");

    const result = runSingleTickCast(
      content,
      "smoker",
      [
        setupUnit("a-dead", "chopper", 3, 2),
        setupUnit("b-survivor", "usopp", 5, 2),
      ],
      { sourcePosition: { x: 1, y: 2 } },
    );

    expect(knockbacks(result, "smoker").map((event) => event.unitId)).toEqual([
      "b-survivor",
    ]);
  });

  it("leaves blocked and out-of-board line targets stationary", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { range: 100 });

    const result = runSingleTickCast(
      content,
      "smoker",
      [
        setupUnit("a-primary", "chopper", 3, 2),
        setupUnit("b-blocked", "chopper", 5, 2),
        setupUnit("c-edge", "chopper", 7, 2),
      ],
      {
        allies: [setupUnit("blocker", "marine-recruit", 6, 2)],
        sourcePosition: { x: 1, y: 2 },
      },
    );

    expect(abilityDamage(result, "smoker")).toHaveLength(3);
    expect(knockbacks(result, "smoker").map((event) => event.unitId)).toEqual([
      "a-primary",
    ]);
    expect(result.finalUnits.find((unit) => unit.id === "b-blocked")).toMatchObject({
      x: 5,
      y: 2,
    });
    expect(result.finalUnits.find((unit) => unit.id === "c-edge")).toMatchObject({
      x: 7,
      y: 2,
    });
  });

  it("resolves occupied line cells in deterministic unit-id order", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const battle = () =>
      runSingleTickCast(
        content,
        "smoker",
        [
          setupUnit("b-back", "chopper", 3, 2),
          setupUnit("a-front", "chopper", 4, 2),
        ],
        { seed: "smoker-collision-order", sourcePosition: { x: 1, y: 2 } },
      );

    const first = battle();
    const second = battle();

    expect(knockbacks(first, "smoker")).toMatchObject([
      { unitId: "a-front", from: { x: 4, y: 2 }, to: { x: 5, y: 2 } },
      { unitId: "b-back", from: { x: 3, y: 2 }, to: { x: 4, y: 2 } },
    ]);
    expect(first).toEqual(second);
  });
});
