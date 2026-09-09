import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
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
  type GameContent,
  type ItemDefinition,
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
const COMPONENT_ITEM_IDS = [
  "jolly-roger-fragment", "devil-fruit-essence", "cola-canister",
  "jet-dial", "sniper-lens", "sea-king-meat", "sea-prism-shard",
  "black-blade-shard", "armament-plate", "captains-sash",
];

const P4B3_ITEM_IDS = [
  "clima-tact",
  "cola-engine",
  "energy-siphon-scope",
  "shark-tooth-charm",
  "jet-sash",
];

function productionItem(id: string): ItemDefinition {
  const item = DEFAULT_CONTENT.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing production item ${id}.`);
  return structuredClone(item);
}

function stats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 100_000,
    attack: 30,
    defense: 0,
    specialDefense: 0,
    range: 10,
    attackIntervalMs: 1_000,
    moveIntervalMs: 500,
    ...overrides,
  };
}

function ability(id: string, overrides: Partial<AbilityDefinition> = {}): AbilityDefinition {
  return {
    id: `${id}-ability`,
    name: `${id} ability`,
    description: "P4B3 fixture ability.",
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
    ability: ability(id, abilityOverrides),
    assetPath: "",
  };
}

function setup(
  id: string,
  definitionId: string,
  items: string[] = [],
  x = 0,
  y = 0,
): BattleSetupUnit {
  return { id, definitionId, star: 1, items, position: { x, y } };
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
            traitId: `${id}-fixture-trait`,
            count: 1,
            tierIndex: 0,
            tier: { required: 1, label: "Fixture", effects },
          },
        ]
      : [],
  };
}

type FixtureOptions = {
  sourceItems?: string[];
  targetItems?: string[];
  extraItems?: ItemDefinition[];
  sourceStats?: Partial<UnitStats>;
  targetStats?: Partial<UnitStats>;
  sourceAbility?: Partial<AbilityDefinition>;
  targetAbility?: Partial<AbilityDefinition>;
  sourceEffects?: TraitEffect[];
  targetEffects?: TraitEffect[];
  sourcePosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  maxTicks?: number;
  seed?: string;
  tickMs?: number;
};

function battle(options: FixtureOptions = {}): BattleResult {
  const source = definition(
    "fixture-source",
    options.sourceStats,
    options.sourceAbility,
  );
  const target = definition(
    "fixture-target",
    options.targetStats,
    options.targetAbility,
  );
  const sourceItems = options.sourceItems ?? [];
  const targetItems = options.targetItems ?? [];
  const itemIds = [...new Set([...sourceItems, ...targetItems])];
  const content = structuredClone(DEFAULT_CONTENT);
  content.units = [source, target];
  content.forms = [];
  content.enemies = [];
  const extraItems = options.extraItems ?? [];
  content.items = itemIds.map(
    (itemId) =>
      structuredClone(extraItems.find((item) => item.id === itemId)) ??
      productionItem(itemId),
  );
  if (options.tickMs !== undefined) {
    content.config.combatTickMs = options.tickMs;
  }
  return simulateBattle(
    team(
      "a",
      [
        setup(
          "source",
          source.id,
          sourceItems,
          options.sourcePosition?.x ?? 0,
          options.sourcePosition?.y ?? 1,
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
          targetItems,
          options.targetPosition?.x ?? 0,
          options.targetPosition?.y ?? 0,
        ),
      ],
      options.targetEffects ?? [{ kind: "critical-chance-percent", value: -10 }],
    ),
    { seed: options.seed ?? "p4b3-fixture", maxTicks: options.maxTicks ?? 1 },
    content,
  );
}

function attackTicks(result: BattleResult, sourceId = "source"): number[] {
  return result.events
    .filter(
      (event): event is Extract<BattleEvent, { type: "attack" }> =>
        event.type === "attack" && event.sourceId === sourceId,
    )
    .map((event) => event.tick);
}

function energyEvents(result: BattleResult, unitId?: string) {
  return result.events.filter(
    (event): event is Extract<BattleEvent, { type: "energy" }> =>
      event.type === "energy" && (unitId === undefined || event.unitId === unitId),
  );
}

function itemEnergyEvents(result: BattleResult, unitId?: string) {
  return energyEvents(result, unitId).filter((event) => event.reason === "item");
}

function runTeams(
  teamA: BattleTeam,
  teamB: BattleTeam,
  definitions: UnitDefinition[],
  itemIds: string[],
  maxTicks = 1,
): BattleResult {
  const content: GameContent = structuredClone(DEFAULT_CONTENT);
  content.units = definitions;
  content.forms = [];
  content.enemies = [];
  content.items = itemIds.map(productionItem);
  return simulateBattle(teamA, teamB, { seed: "p4b3-multi", maxTicks }, content);
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

describe("P4B3 item content", () => {
  it("defines exactly the five approved behavior identities and values", () => {
    expect(productionItem("clima-tact")).toMatchObject({
      effects: [],
      behaviors: [
        {
          kind: "periodic-ability-power-energy",
          intervalMs: 1_000,
          abilityPowerPercent: 5,
          energy: 5,
        },
      ],
    });
    expect(productionItem("jet-sash")).toMatchObject({
      effects: [
        { kind: "shield-flat", value: 45 },
        { kind: "attack-speed-percent", value: 10 },
      ],
      behaviors: [
        {
          kind: "periodic-attack-speed",
          intervalMs: 3_000,
          attackSpeedPercent: 20,
        },
      ],
    });
    expect(productionItem("cola-engine")).toMatchObject({
      effects: [
        { kind: "ability-power-percent", value: 10 },
        { kind: "attack-speed-percent", value: 10 },
      ],
      behaviors: [
        { kind: "on-basic-attack-attack-speed", attackSpeedPercent: 5 },
      ],
    });
    expect(productionItem("cola-engine").effects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "health-flat" }),
        expect.objectContaining({ kind: "omnivamp-percent" }),
      ]),
    );
    expect(productionItem("shark-tooth-charm")).toMatchObject({
      effects: [
        { kind: "attack-flat", value: 21 },
        { kind: "starting-energy", value: 15 },
      ],
      behaviors: [
        { kind: "on-basic-attack-energy", energy: 5, killBonusEnergy: 15 },
      ],
    });
    expect(productionItem("energy-siphon-scope")).toMatchObject({
      effects: [
        { kind: "starting-energy", value: 15 },
        { kind: "critical-chance-percent", value: 25 },
      ],
      behaviors: [
        { kind: "on-critical-basic-attack-energy-steal", amount: 10 },
      ],
    });
    expect(
      DEFAULT_CONTENT.items
        .filter((item) => item.kind === "completed" && item.behaviors?.some(
          (behavior) => behavior.kind === "periodic-ability-power-energy" ||
            behavior.kind === "periodic-attack-speed" ||
            behavior.kind === "on-basic-attack-attack-speed" ||
            behavior.kind === "on-basic-attack-energy" ||
            behavior.kind === "on-critical-basic-attack-energy-steal",
        ))
        .map((item) => item.id),
    ).toEqual(P4B3_ITEM_IDS);
  });

  it("keeps P4B2 components and applies the P4B5 Armament Wraps identity", () => {
    expect(productionItem("devil-fruit-essence").effects).toEqual([
      { kind: "ability-power-percent", value: 10 },
    ]);
    expect(productionItem("black-blade").effects).toEqual([
      { kind: "critical-chance-percent", value: 50 },
      { kind: "attack-flat", value: 9 },
    ]);
    expect(productionItem("meat-platter").effects).toEqual([
      { kind: "health-flat", value: 300 },
      { kind: "starting-shield-max-health-percent", value: 20 },
    ]);
    expect(productionItem("sea-prism-stone").effects).toEqual([
      { kind: "special-defense-flat", value: 40 },
    ]);
    expect(productionItem("armament-wraps").effects).toEqual([
      { kind: "attack-speed-percent", value: 10 },
      { kind: "defense-flat", value: 3 },
    ]);
  });
});

describe("P4B3 periodic behavior", () => {
  it("starts Soul Dew after one full rounded-up interval and stacks AP and Energy", () => {
    const result = battle({
      sourceItems: ["clima-tact"],
      sourceStats: { range: 0, attackIntervalMs: 60_000 },
      targetStats: { range: 0, attackIntervalMs: 60_000 },
      sourceAbility: { requiresTarget: false },
      sourceEffects: [
        { kind: "starting-energy", value: 90 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      sourcePosition: { x: 0, y: 7 },
      targetPosition: { x: 0, y: 0 },
      maxTicks: 20,
    });
    expect(itemEnergyEvents(result, "source")).toMatchObject([
      { tick: 10, amount: 5, value: 95 },
      { tick: 20, amount: 5, value: 100 },
    ]);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "cast", tick: 20, sourceId: "source" }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "damage",
        tick: 20,
        sourceId: "source",
        damageKind: "ability",
        amount: 110,
      }),
    );

    const rounded = battle({
      sourceItems: ["clima-tact"],
      sourceStats: { range: 0, attackIntervalMs: 60_000 },
      targetStats: { range: 0, attackIntervalMs: 60_000 },
      sourcePosition: { x: 0, y: 7 },
      targetPosition: { x: 0, y: 0 },
      tickMs: 300,
      maxTicks: 4,
    });
    expect(itemEnergyEvents(rounded, "source").map((event) => event.tick)).toEqual([4]);
  });

  it("caps Soul Dew Energy and stops periodic effects after the holder dies", () => {
    const capped = battle({
      sourceItems: ["clima-tact"],
      sourceStats: { range: 0, attackIntervalMs: 60_000 },
      targetStats: { range: 0, attackIntervalMs: 60_000 },
      sourceEffects: [
        { kind: "starting-energy", value: 98 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      sourcePosition: { x: 0, y: 7 },
      maxTicks: 10,
    });
    expect(itemEnergyEvents(capped, "source")).toMatchObject([
      { tick: 10, amount: 2, value: 100 },
    ]);

    const dead = battle({
      sourceItems: ["clima-tact"],
      sourceStats: { health: 1, range: 10, attackIntervalMs: 60_000 },
      targetStats: { attack: 100, attackIntervalMs: 60_000 },
      maxTicks: 20,
    });
    expect(itemEnergyEvents(dead, "source")).toEqual([]);
  });

  it("applies Mach Ribbon at 3 seconds without rescheduling an existing cooldown", () => {
    const result = battle({
      sourceItems: ["jet-sash"],
      sourceStats: { attackIntervalMs: 2_000 },
      targetStats: { attack: 1, attackIntervalMs: 60_000 },
      maxTicks: 80,
    });
    expect(result.initialUnits.find((unit) => unit.id === "source")?.shield).toBe(45);
    expect(attackTicks(result)).toEqual([1, 19, 37, 52, 67, 80]);
  });
});

describe("P4B3 basic-attack behavior", () => {
  it("makes Upgrade cumulative against its post-static baseline and immediately schedules the next cooldown", () => {
    const successful = battle({
      sourceItems: ["cola-engine"],
      sourceStats: { attackIntervalMs: 1_100 },
      targetStats: { attack: 1, attackIntervalMs: 60_000 },
      maxTicks: 20,
    });
    expect(attackTicks(successful)).toEqual([1, 11, 20]);

    const dodged = battle({
      sourceItems: ["cola-engine"],
      sourceStats: { attackIntervalMs: 1_100 },
      targetStats: { attack: 1, attackIntervalMs: 60_000 },
      targetEffects: [
        { kind: "dodge-percent", value: 100 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      maxTicks: 20,
    });
    expect(attackTicks(dodged)).toEqual([1, 11, 20]);
    expect(dodged.events.filter((event) => event.type === "dodge")).toHaveLength(3);
  });

  it("combines Mach Ribbon and Upgrade dynamic Speed additively", () => {
    const result = battle({
      sourceItems: ["jet-sash", "cola-engine"],
      sourceStats: { attackIntervalMs: 3_000 },
      targetStats: { attack: 1, attackIntervalMs: 60_000 },
      maxTicks: 83,
    });
    expect(attackTicks(result)).toEqual([1, 25, 48, 67, 83]);
  });

  it("does not trigger Upgrade from a cast and consumes no extra RNG", () => {
    const result = battle({
      sourceItems: ["cola-engine"],
      sourceStats: { attackIntervalMs: 1_000 },
      sourceEffects: [
        { kind: "starting-energy", value: 100 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      maxTicks: 9,
    });
    expect(result.events.filter((event) => event.type === "cast")).toHaveLength(1);
    expect(attackTicks(result)).toEqual([]);

    const staticOnly = productionItem("cola-engine");
    staticOnly.id = "static-cola-engine";
    delete staticOnly.behaviors;
    const withUpgrade = battle({ sourceItems: ["cola-engine"], maxTicks: 1, seed: "rng" });
    const withoutUpgrade = battle({
      sourceItems: [staticOnly.id],
      extraItems: [staticOnly],
      maxTicks: 1,
      seed: "rng",
    });
    expect(
      withUpgrade.events.filter((event) => event.type === "attack" || event.type === "dodge"),
    ).toEqual(
      withoutUpgrade.events.filter(
        (event) => event.type === "attack" || event.type === "dodge",
      ),
    );
  });

  it("grants Deep Sea Tooth base and item Energy on hit, dodge, and kill", () => {
    const hit = battle({ sourceItems: ["shark-tooth-charm"], maxTicks: 1 });
    expect(hit.initialUnits.find((unit) => unit.id === "source")).toMatchObject({
      attack: 51,
      energy: 15,
    });
    expect(
      energyEvents(hit, "source").filter(
        (event) => event.reason === "attack" || event.reason === "item",
      ),
    ).toMatchObject([
      { reason: "attack", amount: 10, value: 25 },
      { reason: "item", amount: 5, value: 30 },
    ]);

    const dodge = battle({
      sourceItems: ["shark-tooth-charm"],
      targetEffects: [
        { kind: "dodge-percent", value: 100 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      maxTicks: 1,
    });
    expect(itemEnergyEvents(dodge, "source")).toMatchObject([{ amount: 5 }]);

    const kill = battle({
      sourceItems: ["shark-tooth-charm"],
      targetStats: { health: 20 },
      maxTicks: 1,
    });
    expect(
      energyEvents(kill, "source").filter(
        (event) => event.reason === "attack" || event.reason === "item",
      ),
    ).toMatchObject([
      { reason: "attack", amount: 10 },
      { reason: "item", amount: 5 },
      { reason: "item", amount: 15 },
    ]);
  });

  it("caps Deep Sea Tooth Energy, does not double-award a kill, and ignores ability kills", () => {
    const capped = battle({
      sourceItems: ["shark-tooth-charm"],
      sourceEffects: [
        { kind: "starting-energy", value: 80 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      maxTicks: 1,
    });
    expect(capped.finalUnits.find((unit) => unit.id === "source")?.energy).toBe(100);

    const attacker = definition("attacker", { attack: 100 });
    const victim = definition("victim", { health: 1, attack: 1 });
    const simultaneous = runTeams(
      team("a", [
        setup("a-1", attacker.id, ["shark-tooth-charm"], 0, 1),
        setup("a-2", attacker.id, ["shark-tooth-charm"], 1, 1),
      ], [{ kind: "critical-chance-percent", value: -10 }]),
      team("b", [setup("target", victim.id, [], 0, 0)], [
        { kind: "critical-chance-percent", value: -10 },
      ]),
      [attacker, victim],
      ["shark-tooth-charm"],
    );
    expect(itemEnergyEvents(simultaneous, "a-1").map((event) => event.amount)).toEqual([
      5,
      15,
    ]);
    expect(itemEnergyEvents(simultaneous, "a-2").map((event) => event.amount)).toEqual([5]);

    const abilityKill = battle({
      sourceItems: ["shark-tooth-charm"],
      sourceAbility: { power: 1_000 },
      sourceEffects: [
        { kind: "starting-energy", value: 85 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      targetStats: { health: 10 },
      maxTicks: 1,
    });
    expect(itemEnergyEvents(abilityKill, "source")).toEqual([]);
  });

  it("steals target Energy only on a critical basic attack with source capping", () => {
    const critical = battle({
      sourceItems: ["energy-siphon-scope"],
      targetItems: ["cola-canister"],
      sourceEffects: [{ kind: "critical-chance-percent", value: 65 }],
      targetEffects: [{ kind: "critical-chance-percent", value: -10 }],
      maxTicks: 1,
    });
    expect(itemEnergyEvents(critical)).toMatchObject([
      { unitId: "target", amount: -10 },
      { unitId: "source", amount: 10 },
    ]);

    const partial = battle({
      sourceItems: ["energy-siphon-scope"],
      sourceEffects: [{ kind: "critical-chance-percent", value: 65 }],
      targetEffects: [{ kind: "critical-chance-percent", value: -10 }],
      maxTicks: 1,
    });
    expect(itemEnergyEvents(partial)).toMatchObject([
      { unitId: "target", amount: -5 },
      { unitId: "source", amount: 5 },
    ]);

    const capped = battle({
      sourceItems: ["energy-siphon-scope"],
      targetItems: ["cola-canister"],
      sourceEffects: [
        { kind: "starting-energy", value: 80 },
        { kind: "critical-chance-percent", value: 65 },
      ],
      targetEffects: [{ kind: "critical-chance-percent", value: -10 }],
      maxTicks: 1,
    });
    expect(itemEnergyEvents(capped)).toMatchObject([
      { unitId: "target", amount: -10 },
      { unitId: "source", amount: 0, value: 100 },
    ]);
  });

  it("does not steal on dodge, non-critical attack, or ability critical", () => {
    const dodged = battle({
      sourceItems: ["energy-siphon-scope"],
      targetItems: ["cola-canister"],
      sourceEffects: [{ kind: "critical-chance-percent", value: 65 }],
      targetEffects: [
        { kind: "dodge-percent", value: 100 },
        { kind: "critical-chance-percent", value: -10 },
      ],
      maxTicks: 1,
    });
    expect(itemEnergyEvents(dodged)).toEqual([]);

    const nonCritical = battle({
      sourceItems: ["energy-siphon-scope"],
      targetItems: ["cola-canister"],
      sourceEffects: [{ kind: "critical-chance-percent", value: -35 }],
      maxTicks: 1,
    });
    expect(itemEnergyEvents(nonCritical)).toEqual([]);

    const abilityCritItem: ItemDefinition = {
      id: "ability-crit-fixture",
      name: "Ability Crit Fixture",
      description: "Fixture",
      icon: "fixture",
      kind: "completed",
      effects: [{ kind: "ability-crit" }],
    };
    const abilityCritical = battle({
      sourceItems: ["energy-siphon-scope", abilityCritItem.id],
      targetItems: ["cola-canister"],
      extraItems: [abilityCritItem],
      sourceEffects: [
        { kind: "starting-energy", value: 85 },
        { kind: "critical-chance-percent", value: 65 },
      ],
      maxTicks: 1,
    });
    expect(abilityCritical.events).toContainEqual(
      expect.objectContaining({ type: "cast", sourceId: "source" }),
    );
    expect(itemEnergyEvents(abilityCritical)).toEqual([]);

    const attacker = definition("scope-attacker", { attack: 100 });
    const victim = definition("scope-victim", { health: 1, attack: 1 });
    const zeroEnergy = runTeams(
      team(
        "a",
        [
          setup("a-1", attacker.id, ["energy-siphon-scope"], 0, 1),
          setup("a-2", attacker.id, ["energy-siphon-scope"], 1, 1),
        ],
        [{ kind: "critical-chance-percent", value: 65 }],
      ),
      team("b", [setup("target", victim.id, [], 0, 0)], [
        { kind: "critical-chance-percent", value: -10 },
      ]),
      [attacker, victim],
      ["energy-siphon-scope"],
    );
    expect(itemEnergyEvents(zeroEnergy, "a-1").map((event) => event.amount)).toEqual([5]);
    expect(itemEnergyEvents(zeroEnergy, "a-2")).toEqual([]);

    const staticScope = productionItem("energy-siphon-scope");
    staticScope.id = "static-energy-siphon-scope";
    delete staticScope.behaviors;
    const withScope = battle({
      sourceItems: ["energy-siphon-scope"],
      sourceEffects: [{ kind: "critical-chance-percent", value: 20 }],
      seed: "scope-rng",
      maxTicks: 1,
    });
    const withoutScope = battle({
      sourceItems: [staticScope.id],
      extraItems: [staticScope],
      sourceEffects: [{ kind: "critical-chance-percent", value: 20 }],
      seed: "scope-rng",
      maxTicks: 1,
    });
    expect(
      withScope.events.filter((event) => event.type === "attack" || event.type === "dodge"),
    ).toEqual(
      withoutScope.events.filter(
        (event) => event.type === "attack" || event.type === "dodge",
      ),
    );
  });
});

describe("P4B3 regressions", () => {
  it("keeps acquisition RNG, Gear 4 catalysts, and seeded combat deterministic", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual(COMPONENT_ITEM_IDS);
    expect(DEFAULT_CONTENT.acquirableItemIds).toEqual(COMPONENT_ITEM_IDS);
    expect(winningPvEReward("p4a-reward-1")).toEqual([
      "jet-dial",
      "sniper-lens",
      "devil-fruit-essence",
    ]);
    expect(carouselItems("p4a-carousel-1")).toEqual([
      "armament-plate",
      "devil-fruit-essence",
      "black-blade-shard",
      "jolly-roger-fragment",
      "black-blade-shard",
      "sniper-lens",
      "jolly-roger-fragment",
      "devil-fruit-essence",
      "cola-canister",
    ]);

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

    const first = battle({
      sourceItems: ["clima-tact", "cola-engine", "shark-tooth-charm"],
      targetItems: ["jet-sash", "energy-siphon-scope"],
      seed: "p4b3-determinism",
      maxTicks: 100,
    });
    const second = battle({
      sourceItems: ["clima-tact", "cola-engine", "shark-tooth-charm"],
      targetItems: ["jet-sash", "energy-siphon-scope"],
      seed: "p4b3-determinism",
      maxTicks: 100,
    });
    expect(second).toEqual(first);
  });

  it("bumps GameContent only and restores schema-6 saves with stable item IDs", () => {
    const state = createMatch("p4b3-schema-six");
    state.contentVersion = "1.17.0";
    const player = state.players.find((candidate) => candidate.id === "player-1");
    if (!player) throw new Error("Missing player-1.");
    player.inventory = [...LEGACY_ITEM_IDS, "jet-sash", "shark-tooth-charm", "energy-siphon-scope"];
    const restored = deserializeMatch(serializeMatch(state));
    expect(DEFAULT_CONTENT.version).toBe("1.24.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.24.0");
    expect(restored.players.find((candidate) => candidate.id === "player-1")?.inventory).toEqual(
      player.inventory,
    );
  });
});
