import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  adjustedChancePercent,
  simulateBattle,
  type AbilityDefinition,
  type ActiveTrait,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
  type ItemDefinition,
  type ItemEffect,
  type TraitEffect,
  type UnitDefinition,
  type UnitFormDefinition,
  type UnitStats,
} from "../../game";

const PRODUCTION_COMBAT_HASH =
  "eb0ceb385e0c2c497238507a26067bd6c82572b2a2491b6611849d6a13d6486a";

function stats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 10_000,
    attack: 1,
    defense: 0,
    range: 10,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
    ...overrides,
  };
}

function ability(
  overrides: Partial<AbilityDefinition> = {},
): AbilityDefinition {
  return {
    id: "fixture-ability",
    name: "Fixture Ability",
    description: "P4B1 isolated combat fixture.",
    targeting: "nearest-enemy",
    pattern: "single",
    effect: "damage",
    power: 100,
    castAnimationMs: 0,
    ...overrides,
  };
}

function definition(
  id: string,
  statOverrides: Partial<UnitStats> = {},
  abilityOverrides: Partial<AbilityDefinition> = {},
): UnitDefinition {
  return {
    id,
    name: id,
    cost: 1,
    traits: [],
    stats: stats(statOverrides),
    ability: ability({ id: `${id}-ability`, ...abilityOverrides }),
    assetPath: "",
  };
}

function item(id: string, effects: ItemEffect[]): ItemDefinition {
  return {
    id,
    name: id,
    description: "P4B1 isolated item fixture.",
    icon: "fixture",
    kind: "completed",
    effects,
  };
}

function content(
  units: UnitDefinition[],
  items: ItemDefinition[] = [],
  forms: UnitFormDefinition[] = [],
): GameContent {
  const fixture = structuredClone(DEFAULT_CONTENT);
  fixture.units = units;
  fixture.items = items;
  fixture.forms = forms;
  fixture.enemies = [];
  return fixture;
}

function setup(
  id: string,
  definitionId: string,
  x: number,
  y: number,
  items: string[] = [],
  formId?: string,
): BattleSetupUnit {
  return {
    id,
    definitionId,
    ...(formId ? { formId } : {}),
    star: 1,
    items,
    position: { x, y },
  };
}

function activeEffects(...effects: TraitEffect[]): ActiveTrait[] {
  return [
    {
      traitId: "fixture-trait",
      count: 1,
      tierIndex: 0,
      tier: { required: 1, label: "Fixture", effects },
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

type CastFixture = {
  ability?: Partial<AbilityDefinition>;
  sourceStats?: Partial<UnitStats>;
  targetStats?: Partial<UnitStats>;
  sourceItems?: ItemDefinition[];
  targetItems?: ItemDefinition[];
  targetCount?: number;
  seed?: string;
  maxTicks?: number;
  criticalChanceBonus?: number;
  targetForm?: UnitFormDefinition;
};

function castFixture(options: CastFixture = {}): BattleResult {
  const source = definition(
    "fixture-caster",
    options.sourceStats,
    options.ability,
  );
  const targets = Array.from(
    { length: options.targetCount ?? 1 },
    (_, index) =>
      definition(`fixture-target-${index + 1}`, options.targetStats),
  );
  const sourceItems = options.sourceItems ?? [];
  const targetItems = options.targetItems ?? [];
  const fixtureContent = content(
    [source, ...targets],
    [...sourceItems, ...targetItems],
    options.targetForm ? [options.targetForm] : [],
  );
  return simulateBattle(
    team(
      "a",
      [
        setup(
          "caster",
          source.id,
          0,
          5,
          sourceItems.map((entry) => entry.id),
        ),
      ],
      [
        { kind: "starting-energy", value: 100 },
        {
          kind: "critical-chance-percent",
          value: options.criticalChanceBonus ?? -10,
        },
      ],
    ),
    team(
      "b",
      targets.map((target, index) =>
        setup(
          `target-${index + 1}`,
          target.id,
          index,
          0,
          targetItems.map((entry) => entry.id),
          options.targetForm?.baseDefinitionId === target.id
            ? options.targetForm.id
            : undefined,
        ),
      ),
      [{ kind: "critical-chance-percent", value: -10 }],
    ),
    {
      seed: options.seed ?? "p4b1-cast",
      maxTicks: options.maxTicks ?? 1,
    },
    fixtureContent,
  );
}

type BasicFixture = {
  sourceStats?: Partial<UnitStats>;
  targetStats?: Partial<UnitStats>;
  sourceItems?: ItemDefinition[];
  targetItems?: ItemDefinition[];
  sourceEffects?: TraitEffect[];
  targetEffects?: TraitEffect[];
  seed?: string;
};

function basicFixture(options: BasicFixture = {}): BattleResult {
  const source = definition("fixture-attacker", options.sourceStats);
  const target = definition("fixture-defender", options.targetStats);
  const sourceItems = options.sourceItems ?? [];
  const targetItems = options.targetItems ?? [];
  return simulateBattle(
    team(
      "a",
      [
        setup(
          "attacker",
          source.id,
          0,
          5,
          sourceItems.map((entry) => entry.id),
        ),
      ],
      options.sourceEffects ?? [
        { kind: "critical-chance-percent", value: -10 },
      ],
    ),
    team(
      "b",
      [
        setup(
          "defender",
          target.id,
          0,
          0,
          targetItems.map((entry) => entry.id),
        ),
      ],
      options.targetEffects ?? [
        { kind: "critical-chance-percent", value: -10 },
      ],
    ),
    { seed: options.seed ?? "p4b1-basic", maxTicks: 1 },
    content([source, target], [...sourceItems, ...targetItems]),
  );
}

function damageEvents(
  result: BattleResult,
  sourceId: string,
  damageKind?: "attack" | "ability" | "burn",
): Extract<BattleEvent, { type: "damage" }>[] {
  return result.events.filter(
    (event): event is Extract<BattleEvent, { type: "damage" }> =>
      event.type === "damage" &&
      event.sourceId === sourceId &&
      (damageKind === undefined || event.damageKind === damageKind),
  );
}

function attackEvent(
  result: BattleResult,
  sourceId = "attacker",
): Extract<BattleEvent, { type: "attack" }> {
  const event = result.events.find(
    (candidate): candidate is Extract<BattleEvent, { type: "attack" }> =>
      candidate.type === "attack" && candidate.sourceId === sourceId,
  );
  if (!event) throw new Error(`Missing attack event for ${sourceId}.`);
  return event;
}

describe("P4B1 damage type and Special Defense primitives", () => {
  it("falls back from absent Special Defense to Defense", () => {
    const result = castFixture({ targetStats: { defense: 100 } });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });

  it("uses explicit Special Defense instead of Defense", () => {
    const result = castFixture({
      targetStats: { defense: 100, specialDefense: 25 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(80);
  });

  it("uses Defense for physical damage", () => {
    const result = castFixture({
      ability: { damageType: "physical" },
      targetStats: { defense: 100, specialDefense: 0 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });

  it("uses Special Defense for special damage", () => {
    const result = castFixture({
      ability: { damageType: "special" },
      targetStats: { defense: 0, specialDefense: 100 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });

  it("lets true damage bypass both resistances", () => {
    const result = castFixture({
      ability: { damageType: "true" },
      targetStats: { defense: 10_000, specialDefense: 10_000 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(100);
  });

  it("lets shields absorb true damage before health", () => {
    const shieldItem = item("fixture-shield", [
      { kind: "shield-flat", value: 75 },
    ]);
    const result = castFixture({
      ability: { damageType: "true" },
      targetItems: [shieldItem],
    });
    expect(damageEvents(result, "caster", "ability")[0]).toMatchObject({
      amount: 100,
      shieldDamage: 75,
      healthDamage: 25,
    });
  });

  it("retains the exact local resistance formula", () => {
    const result = castFixture({
      ability: { power: 125 },
      targetStats: { specialDefense: 25 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(
      Math.max(1, Math.floor((125 * 100) / (100 + 25))),
    );
  });

  it("classifies basic attacks as physical", () => {
    const result = basicFixture({
      sourceStats: { attack: 100 },
      targetStats: { defense: 100, specialDefense: 0 },
    });
    expect(damageEvents(result, "attacker", "attack")[0].amount).toBe(50);
  });

  it("defaults direct ability damage to special", () => {
    const result = castFixture({
      targetStats: { defense: 0, specialDefense: 100 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });

  it("supports explicitly physical ability damage", () => {
    const result = castFixture({
      ability: { damageType: "physical" },
      targetStats: { defense: 100, specialDefense: 0 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });

  it("supports explicitly true ability damage", () => {
    const result = castFixture({
      ability: { damageType: "true" },
      targetStats: { defense: 100, specialDefense: 100 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(100);
  });

  it("applies pierce to the resistance selected by damage type", () => {
    const result = castFixture({
      ability: { damageType: "special", defensePiercePercent: 50 },
      targetStats: { defense: 500, specialDefense: 100 },
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(66);
  });

  it("mitigates burn with Special Defense", () => {
    const result = castFixture({
      ability: { power: 1, burnPower: 100, burnDurationMs: 2_000 },
      sourceStats: { attackIntervalMs: 10_000 },
      targetStats: { defense: 0, specialDefense: 100 },
      maxTicks: 11,
    });
    expect(damageEvents(result, "caster", "burn")[0].amount).toBe(50);
  });

  it("applies Special Defense fallback through a persistent form", () => {
    const persistentForm: UnitFormDefinition = {
      id: "fixture-persistent",
      baseDefinitionId: "fixture-target-1",
      name: "Fixture Persistent",
      lifecycle: "persistent",
      stats: { defense: 25 },
    };
    const result = castFixture({
      targetStats: { defense: 100 },
      targetForm: persistentForm,
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(80);
  });

  it("updates Special Defense during a battle-temporary form", () => {
    const caster = definition(
      "fixture-caster",
      { attackIntervalMs: 8_000 },
      { power: 100 },
    );
    const chopper = definition("chopper", {
      health: 10_000,
      defense: 0,
    });
    const monsterPoint: UnitFormDefinition = {
      id: "chopper-monster-point",
      baseDefinitionId: "chopper",
      name: "Monster Point Fixture",
      lifecycle: "battle-temporary",
      stats: { specialDefense: 100 },
    };
    const fixtureContent = content([caster, chopper], [], [monsterPoint]);
    const result = simulateBattle(
      team(
        "a",
        [setup("caster", caster.id, 0, 5)],
        [
          { kind: "starting-energy", value: 90 },
          { kind: "critical-chance-percent", value: -10 },
        ],
      ),
      {
        id: "b",
        units: [setup("target", chopper.id, 0, 0)],
        activeTraits: [
          {
            traitId: "straw-hat",
            count: 1,
            tierIndex: 0,
            tier: { required: 1, label: "Fixture", effects: [] },
          },
        ],
      },
      { seed: "p4b1-temporary-form", maxTicks: 81 },
      fixtureContent,
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "unit-transform",
        unitId: "target",
        toFormId: "chopper-monster-point",
      }),
    );
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });
});

describe("P4B1 critical power, Luck, and item primitives", () => {
  it("defaults critical power to 200 percent", () => {
    const result = castFixture({
      ability: { canCritByDefault: true },
      criticalChanceBonus: 90,
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(200);
  });

  it("keeps current basic critical attacks at exactly two times attack", () => {
    const criticalChance = item("fixture-critical", [
      { kind: "critical-chance-percent", value: 90 },
    ]);
    const result = basicFixture({
      sourceStats: { attack: 30 },
      sourceItems: [criticalChance],
      sourceEffects: [],
    });
    expect(attackEvent(result).critical).toBe(true);
    expect(damageEvents(result, "attacker", "attack")[0].amount).toBe(60);
  });

  it("adds critical-power-percent to the default critical magnitude", () => {
    const criticalItem = item("fixture-critical-power", [
      { kind: "critical-chance-percent", value: 90 },
      { kind: "critical-power-percent", value: 50 },
    ]);
    const result = basicFixture({
      sourceStats: { attack: 30 },
      sourceItems: [criticalItem],
      sourceEffects: [],
    });
    expect(damageEvents(result, "attacker", "attack")[0].amount).toBe(75);
  });

  it("creates starting shield from shield-flat", () => {
    const shieldItem = item("fixture-starting-shield", [
      { kind: "shield-flat", value: 75 },
    ]);
    const result = basicFixture({ targetItems: [shieldItem] });
    expect(
      result.initialUnits.find((unit) => unit.id === "defender")?.shield,
    ).toBe(75);
  });

  it("adds special-defense-flat only to Special Defense", () => {
    const resistanceItem = item("fixture-special-defense", [
      { kind: "special-defense-flat", value: 100 },
    ]);
    const result = castFixture({ targetItems: [resistanceItem] });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(50);
  });

  it("applies luck-flat to an existing basic critical roll", () => {
    const chanceItem = item("fixture-crit-chance", [
      { kind: "critical-chance-percent", value: 40 },
    ]);
    const luckyChanceItem = item("fixture-lucky-crit", [
      { kind: "critical-chance-percent", value: 40 },
      { kind: "luck-flat", value: 50 },
    ]);
    const unlucky = basicFixture({
      sourceItems: [chanceItem],
      sourceEffects: [],
      seed: "p4b1-luck-2",
    });
    const lucky = basicFixture({
      sourceItems: [luckyChanceItem],
      sourceEffects: [],
      seed: "p4b1-luck-2",
    });
    expect(attackEvent(unlucky).critical).toBe(false);
    expect(attackEvent(lucky).critical).toBe(true);
  });

  it("keeps 50 percent unchanged at zero Luck", () => {
    expect(adjustedChancePercent(50, 0)).toBe(50);
  });

  it("uses the PAC exponent formula for positive Luck", () => {
    expect(adjustedChancePercent(50, 20)).toBeCloseTo(
      100 * 0.5 ** 0.8,
      12,
    );
  });

  it("keeps zero base chance at zero under extreme Luck", () => {
    expect(adjustedChancePercent(0, 10_000)).toBe(0);
  });

  it("honors the requested probability cap", () => {
    expect(adjustedChancePercent(90, 100, 60)).toBe(60);
  });

  it("applies Luck to existing dodge rolls", () => {
    const luckItem = item("fixture-dodge-luck", [
      { kind: "luck-flat", value: 50 },
    ]);
    const ordinary = basicFixture({
      targetEffects: [
        { kind: "critical-chance-percent", value: -10 },
        { kind: "dodge-percent", value: 50 },
      ],
      seed: "p4b1-luck-2",
    });
    const lucky = basicFixture({
      targetItems: [luckItem],
      targetEffects: [
        { kind: "critical-chance-percent", value: -10 },
        { kind: "dodge-percent", value: 50 },
      ],
      seed: "p4b1-luck-2",
    });
    expect(
      ordinary.events.some(
        (event) => event.type === "dodge" && event.targetId === "defender",
      ),
    ).toBe(false);
    expect(
      lucky.events.some(
        (event) => event.type === "dodge" && event.targetId === "defender",
      ),
    ).toBe(true);
  });

  it("keeps Ability Crit disabled by default", () => {
    const result = castFixture({ criticalChanceBonus: 90 });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(100);
  });

  it("enables Ability Crit through an ability-crit item effect", () => {
    const abilityCritItem = item("fixture-ability-crit", [
      { kind: "ability-crit" },
    ]);
    const result = castFixture({
      sourceItems: [abilityCritItem],
      criticalChanceBonus: 90,
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(200);
  });

  it("enables Ability Crit through canCritByDefault", () => {
    const result = castFixture({
      ability: { canCritByDefault: true },
      criticalChanceBonus: 90,
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(200);
  });

  it("uses the holder's Critical Power for Ability Crit", () => {
    const criticalItem = item("fixture-ability-critical-power", [
      { kind: "ability-crit" },
      { kind: "critical-power-percent", value: 75 },
    ]);
    const result = castFixture({
      sourceItems: [criticalItem],
      criticalChanceBonus: 90,
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(275);
  });

  it("shares one Ability-Crit result across every target", () => {
    const criticalItem = item("fixture-multi-target-crit", [
      { kind: "ability-crit" },
    ]);
    const result = castFixture({
      ability: { pattern: "all-enemies" },
      sourceItems: [criticalItem],
      targetCount: 2,
      criticalChanceBonus: 40,
      seed: "p4b1-roll-3",
    });
    expect(
      damageEvents(result, "caster", "ability").map((event) => event.amount),
    ).toEqual([200, 200]);
  });

  it("shares one Ability-Crit result across multi-hit and sequential strikes", () => {
    const criticalItem = item("fixture-shared-hit-crit", [
      { kind: "ability-crit" },
    ]);
    const multiHit = castFixture({
      ability: { hits: 2 },
      sourceItems: [criticalItem],
      criticalChanceBonus: 40,
      seed: "p4b1-roll-3",
    });
    const sequential = castFixture({
      ability: {
        sequentialStrike: { hitWeightsBasisPoints: [5_000, 5_000] },
      },
      sourceItems: [criticalItem],
      criticalChanceBonus: 40,
      seed: "p4b1-roll-3",
    });
    expect(
      damageEvents(multiHit, "caster", "ability").map(
        (event) => event.amount,
      ),
    ).toEqual([200, 200]);
    expect(
      damageEvents(sequential, "caster", "ability").map(
        (event) => event.amount,
      ),
    ).toEqual([100, 100]);
  });

  it("applies Ability Crit to direct healing and shields", () => {
    const criticalItem = item("fixture-support-crit", [
      { kind: "ability-crit" },
      { kind: "critical-chance-percent", value: 90 },
    ]);
    const healer = definition(
      "fixture-healer",
      { health: 1_000 },
      {
        targeting: "self",
        pattern: "single-ally",
        effect: "heal",
        power: 100,
        requiresTarget: false,
        conditionalShield: { healthThresholdPercent: 100, power: 60 },
      },
    );
    const enemy = definition("fixture-enemy", { attack: 500 });
    const healResult = simulateBattle(
      team(
        "a",
        [setup("healer", healer.id, 0, 5, [criticalItem.id])],
        [{ kind: "starting-energy", value: 95 }],
      ),
      team(
        "b",
        [setup("enemy", enemy.id, 0, 0)],
        [{ kind: "critical-chance-percent", value: -10 }],
      ),
      { seed: "p4b1-critical-heal", maxTicks: 2 },
      content([healer, enemy], [criticalItem]),
    );
    const shieldResult = castFixture({
      ability: {
        targeting: "self",
        pattern: "single-ally",
        effect: "shield",
        requiresTarget: false,
      },
      sourceItems: [criticalItem],
    });
    expect(healResult.events).toContainEqual(
      expect.objectContaining({ type: "heal", sourceId: "healer", amount: 200 }),
    );
    expect(healResult.events).toContainEqual(
      expect.objectContaining({
        type: "shield",
        sourceId: "healer",
        amount: 120,
      }),
    );
    expect(shieldResult.events).toContainEqual(
      expect.objectContaining({
        type: "shield",
        sourceId: "caster",
        amount: 200,
      }),
    );
  });

  it("does not multiply burn power on an Ability Crit", () => {
    const result = castFixture({
      ability: {
        canCritByDefault: true,
        burnPower: 50,
        burnDurationMs: 2_000,
      },
      sourceStats: { attackIntervalMs: 10_000 },
      criticalChanceBonus: 90,
      maxTicks: 11,
    });
    expect(damageEvents(result, "caster", "ability")[0].amount).toBe(200);
    expect(damageEvents(result, "caster", "burn")[0].amount).toBe(50);
  });

  it("remains deterministic with Luck and Ability Crit enabled", () => {
    const criticalItem = item("fixture-deterministic-crit", [
      { kind: "ability-crit" },
      { kind: "luck-flat", value: 20 },
    ]);
    const battle = () =>
      castFixture({
        sourceItems: [criticalItem],
        criticalChanceBonus: 40,
        seed: "p4b1-deterministic",
        maxTicks: 20,
      });
    expect(battle()).toEqual(battle());
  });
});

describe("P4B1 compatibility locks", () => {
  it("preserves the representative production combat result byte-for-byte", () => {
    const productionTeam = (
      id: string,
      definitionId: string,
      x: number,
      y: number,
    ): BattleTeam => ({
      id,
      units: [setup(`${id}-unit`, definitionId, x, y)],
      activeTraits: [],
    });
    const result = simulateBattle(
      productionTeam("a", "luffy", 3, 5),
      productionTeam("b", "zoro", 3, 0),
      { seed: "p4b1-production-regression" },
    );
    expect(
      createHash("sha256").update(JSON.stringify(result)).digest("hex"),
    ).toBe(PRODUCTION_COMBAT_HASH);
  });

  it("keeps GameContent at 1.16.0", () => {
    expect(DEFAULT_CONTENT.version).toBe("1.16.0");
  });

  it("keeps save schema 6", () => {
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });
});
