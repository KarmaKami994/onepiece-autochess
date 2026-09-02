import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  adjustedChancePercent,
  advanceMatchPhase,
  createMatch,
  deserializeMatch,
  reconcileProductionFormProgression,
  serializeMatch,
  simulateBattle,
  type AbilityDefinition,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type ItemDefinition,
  type ItemEffect,
  type MatchBattleResult,
  type TraitEffect,
  type UnitDefinition,
  type UnitInstance,
  type UnitStats,
} from "../../game";

const LEGACY_ITEM_IDS = [
  "black-blade",
  "meat-platter",
  "clima-tact",
  "sniper-goggles",
  "sea-prism-stone",
  "armament-wraps",
  "den-den-mushi",
  "cola-engine",
];

const COMPONENT_EFFECTS: Record<string, ItemEffect[]> = {
  "jolly-roger-fragment": [],
  "devil-fruit-essence": [{ kind: "ability-power-percent", value: 10 }],
  "cola-canister": [{ kind: "starting-energy", value: 15 }],
  "jet-dial": [{ kind: "attack-speed-percent", value: 10 }],
  "sniper-lens": [{ kind: "critical-chance-percent", value: 10 }],
  "sea-king-meat": [{ kind: "health-flat", value: 45 }],
  "sea-prism-shard": [{ kind: "special-defense-flat", value: 3 }],
  "black-blade-shard": [{ kind: "attack-flat", value: 9 }],
  "armament-plate": [{ kind: "defense-flat", value: 3 }],
  "captains-sash": [{ kind: "shield-flat", value: 45 }],
};

function productionItem(id: string): ItemDefinition {
  const result = DEFAULT_CONTENT.items.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Missing production item ${id}.`);
  return structuredClone(result);
}

function fixtureItem(id: string, effects: ItemEffect[]): ItemDefinition {
  return {
    id,
    name: id,
    description: "P4B2 fixture item.",
    icon: "fixture",
    kind: "completed",
    effects,
  };
}

function stats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 10_000,
    attack: 30,
    defense: 0,
    specialDefense: 0,
    range: 10,
    attackIntervalMs: 1_000,
    moveIntervalMs: 500,
    ...overrides,
  };
}

function ability(id: string): AbilityDefinition {
  return {
    id: `${id}-ability`,
    name: `${id} ability`,
    description: "P4B2 fixture ability.",
    targeting: "nearest-enemy",
    pattern: "single",
    effect: "damage",
    power: 100,
    castAnimationMs: 0,
  };
}

function definition(
  id: string,
  overrides: Partial<UnitStats> = {},
): UnitDefinition {
  return {
    id,
    name: id,
    cost: 1,
    traits: [],
    stats: stats(overrides),
    ability: ability(id),
    assetPath: "",
  };
}

function setup(
  id: string,
  definitionId: string,
  x: number,
  y: number,
  items: string[] = [],
): BattleSetupUnit {
  return {
    id,
    definitionId,
    star: 1,
    items,
    position: { x, y },
  };
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return {
    id,
    units,
    activeTraits: effects.length
      ? [
          {
            traitId: "fixture-trait",
            count: 1,
            tierIndex: 0,
            tier: { required: 1, label: "Fixture", effects },
          },
        ]
      : [],
  };
}

type BattleFixture = {
  sourceItems?: string[];
  targetItems?: string[];
  itemDefinitions?: ItemDefinition[];
  sourceStats?: Partial<UnitStats>;
  targetStats?: Partial<UnitStats>;
  sourceEffects?: TraitEffect[];
  targetEffects?: TraitEffect[];
  sourcePosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  damageType?: "physical" | "special";
  seed?: string;
  maxTicks?: number;
};

function battle(options: BattleFixture = {}): BattleResult {
  const source = definition("fixture-source", options.sourceStats);
  source.ability.damageType = options.damageType;
  const target = definition("fixture-target", options.targetStats);
  const sourceItems = options.sourceItems ?? [];
  const targetItems = options.targetItems ?? [];
  const itemDefinitions =
    options.itemDefinitions ??
    [...new Set([...sourceItems, ...targetItems])].map(productionItem);
  const content = structuredClone(DEFAULT_CONTENT);
  content.units = [source, target];
  content.forms = [];
  content.items = itemDefinitions;
  content.enemies = [];
  return simulateBattle(
    team(
      "a",
      [
        setup(
          "source",
          source.id,
          options.sourcePosition?.x ?? 0,
          options.sourcePosition?.y ?? 5,
          sourceItems,
        ),
      ],
      options.sourceEffects ?? [{ kind: "critical-chance-percent", value: -10 }],
    ),
    team(
      "b",
      [
        setup(
          "target",
          target.id,
          options.targetPosition?.x ?? 0,
          options.targetPosition?.y ?? 0,
          targetItems,
        ),
      ],
      options.targetEffects ?? [{ kind: "critical-chance-percent", value: -10 }],
    ),
    {
      seed: options.seed ?? "p4b2-fixture",
      maxTicks: options.maxTicks ?? 1,
    },
    content,
  );
}

function initial(result: BattleResult, id: "source" | "target") {
  const unit = result.initialUnits.find((candidate) => candidate.id === id);
  if (!unit) throw new Error(`Missing initial ${id}.`);
  return unit;
}

function damageEvents(
  result: BattleResult,
  kind?: "attack" | "ability" | "burn",
): Extract<BattleEvent, { type: "damage" }>[] {
  return result.events.filter(
    (event): event is Extract<BattleEvent, { type: "damage" }> =>
      event.type === "damage" && (kind === undefined || event.damageKind === kind),
  );
}

function winningPvEReward(seed: string): string[] {
  const state = createMatch(seed);
  state.phase = "battle";
  state.lastResults = state.players.map(
    (player): MatchBattleResult => ({
      playerAId: player.id,
      playerBId: null,
      ghostOfPlayerId: null,
      winnerId: player.id,
      timedOut: false,
      playerADamage: 0,
      playerBDamage: 0,
      durationTicks: 1,
      events: [],
      initialUnits: [],
      finalUnits: [],
    }),
  );
  return advanceMatchPhase(state).pendingItemChoices["player-1"];
}

function carouselItems(seed: string): string[] {
  const state = createMatch(seed);
  state.round = 3;
  state.phase = "item-choice";
  state.pendingItemChoices = {};
  return advanceMatchPhase(state).carouselChoices.map((choice) => choice.itemId);
}

describe("P4B2 component and simple item content", () => {
  it("defines all ten translated component identities and keeps the 65-item catalog", () => {
    const components = DEFAULT_CONTENT.items.filter(
      (candidate) => candidate.kind === "component",
    );
    expect(components).toHaveLength(10);
    expect(Object.fromEntries(components.map((entry) => [entry.id, entry.effects])))
      .toEqual(COMPONENT_EFFECTS);
    expect(DEFAULT_CONTENT.items.filter((candidate) => candidate.kind === "completed"))
      .toHaveLength(55);
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
  });

  it("defines exactly the five approved completed item identities", () => {
    expect(productionItem("devil-fruit-codex").effects).toEqual([
      { kind: "ability-power-percent", value: 100 },
    ]);
    expect(productionItem("black-blade").effects).toEqual([
      { kind: "critical-chance-percent", value: 50 },
      { kind: "attack-flat", value: 9 },
    ]);
    expect(productionItem("black-blade").effects).not.toContainEqual(
      { kind: "attack-flat", value: 24 },
    );
    expect(productionItem("black-blade").effects).not.toContainEqual(
      { kind: "critical-chance-percent", value: 12 },
    );
    expect(productionItem("sniper-goggles").effects).toEqual([
      { kind: "range-flat", value: 2 },
      { kind: "critical-chance-percent", value: 15 },
      { kind: "special-defense-flat", value: 3 },
    ]);
    expect(productionItem("sniper-goggles").effects).not.toContainEqual(
      expect.objectContaining({ kind: "defense-flat" }),
    );
    expect(productionItem("meat-platter").effects).toEqual([
      { kind: "health-flat", value: 300 },
      { kind: "starting-shield-max-health-percent", value: 20 },
    ]);
    expect(productionItem("lucky-pirate-ribbon").effects).toEqual([
      { kind: "shield-flat", value: 45 },
      { kind: "ability-power-percent", value: 50 },
      { kind: "luck-flat", value: 20 },
      { kind: "dodge-percent", value: 15 },
    ]);
  });

  it("preserves the deferred legacy completed items exactly", () => {
    expect(productionItem("sea-prism-stone").effects).toEqual([
      { kind: "defense-flat", value: 25 },
      { kind: "special-defense-flat", value: 25 },
      { kind: "health-flat", value: 120 },
    ]);
    expect(productionItem("armament-wraps").effects).toEqual([
      { kind: "attack-flat", value: 14 },
      { kind: "defense-flat", value: 14 },
      { kind: "special-defense-flat", value: 14 },
    ]);
    expect(productionItem("clima-tact").effects).toEqual([
      { kind: "ability-power-percent", value: 25 },
      { kind: "starting-energy", value: 20 },
    ]);
    expect(productionItem("den-den-mushi").effects).toEqual([
      { kind: "attack-speed-percent", value: 18 },
      { kind: "starting-energy", value: 10 },
    ]);
    expect(productionItem("cola-engine").effects).toEqual([
      { kind: "health-flat", value: 160 },
      { kind: "attack-speed-percent", value: 12 },
      { kind: "omnivamp-percent", value: 8 },
    ]);
  });

  it("keeps acquisition order and representative fixed-seed selections unchanged", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual(LEGACY_ITEM_IDS);
    expect(DEFAULT_CONTENT.acquirableItemIds).toEqual(LEGACY_ITEM_IDS);
    expect(winningPvEReward("p4a-reward-1")).toEqual([
      "clima-tact",
      "cola-engine",
      "den-den-mushi",
    ]);
    expect(carouselItems("p4a-carousel-1")).toEqual([
      "sea-prism-stone",
      "den-den-mushi",
      "black-blade",
      "black-blade",
      "meat-platter",
      "cola-engine",
      "den-den-mushi",
      "meat-platter",
      "sniper-goggles",
    ]);
  });

  it("keeps Gear 4 catalysts stable and rejects every raw component", () => {
    const formFor = (itemId: string): string | undefined => {
      const luffy: UnitInstance = {
        id: `luffy-${itemId}`,
        definitionId: "luffy",
        star: 3,
        items: [itemId],
        acquiredOrder: 1,
      };
      reconcileProductionFormProgression(luffy);
      return luffy.formId;
    };
    expect(formFor("sniper-goggles")).toBe("luffy-gear-4-snakeman");
    expect(formFor("armament-wraps")).toBe("luffy-gear-4-boundman");
    for (const componentId of Object.keys(COMPONENT_EFFECTS)) {
      expect(formFor(componentId)).toBeUndefined();
    }
  });

  it("bumps only GameContent and restores schema-6 saves with all legacy IDs", () => {
    const state = createMatch("p4b2-schema-six");
    state.contentVersion = "1.16.0";
    const player = state.players.find((candidate) => candidate.id === "player-1");
    if (!player) throw new Error("Missing player-1.");
    player.inventory = [...LEGACY_ITEM_IDS];
    const restored = deserializeMatch(serializeMatch(state));
    expect(DEFAULT_CONTENT.version).toBe("1.17.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.17.0");
    expect(
      restored.players.find((candidate) => candidate.id === "player-1")?.inventory,
    ).toEqual(LEGACY_ITEM_IDS);
  });
});

describe("P4B2 battle application", () => {
  it("applies translated component health, attack, defense, shield, and energy", () => {
    const result = battle({
      sourceItems: [
        "cola-canister",
        "sea-king-meat",
        "black-blade-shard",
        "armament-plate",
        "captains-sash",
      ],
      sourceStats: { health: 1_000, attack: 30, defense: 0 },
      maxTicks: 0,
    });
    expect(initial(result, "source")).toMatchObject({
      hp: 1_045,
      maxHp: 1_045,
      attack: 39,
      defense: 3,
      shield: 45,
      energy: 15,
    });
  });

  it("applies Devil Fruit Essence and Devil Fruit Codex through existing AP damage", () => {
    const cast = (itemId: string) =>
      damageEvents(
        battle({
          sourceItems: [itemId],
          sourceEffects: [
            { kind: "starting-energy", value: 100 },
            { kind: "critical-chance-percent", value: -10 },
          ],
        }),
        "ability",
      )[0]?.amount;
    expect(cast("devil-fruit-essence")).toBe(110);
    expect(cast("devil-fruit-codex")).toBe(200);
  });

  it("applies Jet Dial attack speed and Sniper Lens critical chance", () => {
    const attacks = (sourceItems: string[]) =>
      damageEvents(
        battle({ sourceItems, maxTicks: 19 }),
        "attack",
      ).length;
    expect(attacks(["jet-dial"])).toBeGreaterThan(attacks([]));

    const critical = battle({
      sourceItems: ["sniper-lens"],
      sourceStats: { attack: 30 },
      sourceEffects: [{ kind: "critical-chance-percent", value: 80 }],
    });
    expect(damageEvents(critical, "attack")[0]?.amount).toBe(60);
  });

  it("keeps component Defense and Special Defense independent", () => {
    const damageAgainst = (
      itemId: "armament-plate" | "sea-prism-shard",
      damageType: "physical" | "special",
    ) =>
      damageEvents(
        battle({
          targetItems: [itemId],
          sourceEffects: [
            { kind: "starting-energy", value: 100 },
            { kind: "critical-chance-percent", value: -10 },
          ],
          damageType,
          itemDefinitions: [productionItem(itemId)],
        }),
        "ability",
      )[0]?.amount;
    expect(damageAgainst("armament-plate", "physical")).toBe(97);
    expect(damageAgainst("armament-plate", "special")).toBe(100);
    expect(damageAgainst("sea-prism-shard", "physical")).toBe(100);
    expect(damageAgainst("sea-prism-shard", "special")).toBe(97);
  });

  it("uses existing Crit Power for Black Blade critical attacks", () => {
    const result = battle({
      sourceItems: ["black-blade"],
      sourceStats: { attack: 30 },
      sourceEffects: [{ kind: "critical-chance-percent", value: 40 }],
    });
    expect(initial(result, "source").attack).toBe(39);
    expect(damageEvents(result, "attack")[0]?.amount).toBe(78);
  });

  it("lets Sniper Goggles extend legal reach without changing targeting", () => {
    const atDistanceFour = (sourceItems: string[]) =>
      battle({
        sourceItems,
        sourceStats: { range: 1 },
        sourcePosition: { x: 0, y: 5 },
        targetPosition: { x: 0, y: 1 },
        maxTicks: 10,
      });
    const sourceAttacks = (result: BattleResult) =>
      damageEvents(result, "attack").filter((event) => event.sourceId === "source");
    const ordinary = atDistanceFour([]);
    const extended = atDistanceFour(["sniper-goggles"]);
    expect(initial(ordinary, "source").range).toBe(1);
    expect(initial(extended, "source").range).toBe(3);
    expect(sourceAttacks(extended)[0]?.tick).toBeLessThan(
      sourceAttacks(ordinary)[0]?.tick ?? Number.POSITIVE_INFINITY,
    );

    const special = battle({
      targetItems: ["sniper-goggles"],
      sourceEffects: [
        { kind: "starting-energy", value: 100 },
        { kind: "critical-chance-percent", value: -10 },
      ],
    });
    expect(damageEvents(special, "ability")[0]?.amount).toBe(97);
  });

  it("applies Meat Platter shield from final starting Max HP after traits", () => {
    const plain = battle({
      targetItems: ["meat-platter"],
      targetStats: { health: 1_000 },
      maxTicks: 0,
    });
    expect(initial(plain, "target")).toMatchObject({ maxHp: 1_300, shield: 260 });

    const traitBoosted = battle({
      targetItems: ["meat-platter"],
      targetStats: { health: 1_000 },
      targetEffects: [{ kind: "max-health-percent", value: 50 }],
      maxTicks: 0,
    });
    expect(initial(traitBoosted, "target")).toMatchObject({
      maxHp: 1_950,
      shield: 390,
    });
  });

  it("makes percentage shield independent of item order and sums percentages once", () => {
    const hp = fixtureItem("fixture-hp", [{ kind: "health-flat", value: 300 }]);
    const percent = fixtureItem("fixture-percent", [
      { kind: "starting-shield-max-health-percent", value: 20 },
    ]);
    const orderedShield = (targetItems: string[]) =>
      initial(
        battle({
          targetItems,
          itemDefinitions: [hp, percent],
          targetStats: { health: 1_000 },
          maxTicks: 0,
        }),
        "target",
      ).shield;
    expect(orderedShield([hp.id, percent.id])).toBe(260);
    expect(orderedShield([percent.id, hp.id])).toBe(260);

    const ten = fixtureItem("fixture-ten-percent", [
      { kind: "starting-shield-max-health-percent", value: 10 },
    ]);
    const fifteen = fixtureItem("fixture-fifteen-percent", [
      { kind: "starting-shield-max-health-percent", value: 15 },
    ]);
    const summed = battle({
      targetItems: [ten.id, fifteen.id],
      itemDefinitions: [ten, fifteen],
      targetStats: { health: 333 },
      maxTicks: 0,
    });
    expect(initial(summed, "target").shield).toBe(83);
  });

  it("applies Lucky Pirate Ribbon AP, shield, seeded Dodge, and Luck adjustment", () => {
    const cast = battle({
      sourceItems: ["lucky-pirate-ribbon"],
      sourceEffects: [
        { kind: "starting-energy", value: 100 },
        { kind: "critical-chance-percent", value: -10 },
      ],
    });
    expect(initial(cast, "source").shield).toBe(45);
    expect(damageEvents(cast, "ability")[0]?.amount).toBe(150);
    expect(adjustedChancePercent(15, 20)).toBeGreaterThan(15);

    const dodgeOnly = fixtureItem("fixture-dodge-only", [
      { kind: "dodge-percent", value: 15 },
    ]);
    const lucky = productionItem("lucky-pirate-ribbon");
    const difference = Array.from({ length: 200 }, (_, index) => `p4b2-dodge-${index}`)
      .find((seed) => {
        const ordinary = battle({
          targetItems: [dodgeOnly.id],
          itemDefinitions: [dodgeOnly],
          seed,
        });
        const luckAdjusted = battle({
          targetItems: [lucky.id],
          itemDefinitions: [lucky],
          seed,
        });
        const dodged = (result: BattleResult) =>
          result.events.some((event) => event.type === "dodge");
        return !dodged(ordinary) && dodged(luckAdjusted);
      });
    expect(difference).toBeDefined();
    if (!difference) throw new Error("Missing deterministic Luck/Dodge fixture.");
    const first = battle({
      targetItems: [lucky.id],
      itemDefinitions: [lucky],
      seed: difference,
    });
    const second = battle({
      targetItems: [lucky.id],
      itemDefinitions: [lucky],
      seed: difference,
    });
    expect(first).toEqual(second);
    expect(first.events.some((event) => event.type === "dodge")).toBe(true);
  });

  it("lets Captain's Sash starting shield absorb damage normally", () => {
    const result = battle({ targetItems: ["captains-sash"] });
    const damage = damageEvents(result, "attack")[0];
    expect(initial(result, "target").shield).toBe(45);
    expect(damage).toMatchObject({ amount: 30, shieldDamage: 30, healthDamage: 0 });
  });
});
