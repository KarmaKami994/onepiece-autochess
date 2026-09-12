import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  getActiveTraitEffectGrants,
  getActiveTraitsForUnits,
  simulateBattle,
  type AbilityDefinition,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type GameContent,
  type ItemDefinition,
  type TraitBehavior,
  type TraitEffect,
  type UnitDefinition,
  type UnitStats,
} from "../../game";
import { createTraitViews } from "../../app/selectors";

const START_100: ItemDefinition = {
  id: "p6-start-100",
  name: "Start 100",
  description: "Fixture",
  icon: "◇",
  kind: "completed",
  effects: [{ kind: "starting-energy", value: 100 }],
};
const NO_CRIT: ItemDefinition = {
  id: "p6-no-crit",
  name: "No Crit",
  description: "Fixture",
  icon: "◇",
  kind: "completed",
  effects: [{ kind: "critical-chance-percent", value: -100 }],
};
const FORCE_CRIT: ItemDefinition = {
  id: "p6-force-crit",
  name: "Force Crit",
  description: "Fixture",
  icon: "◇",
  kind: "completed",
  effects: [{ kind: "critical-chance-percent", value: 100 }],
};
const FORCE_DODGE: ItemDefinition = {
  id: "p6-force-dodge",
  name: "Force Dodge",
  description: "Fixture",
  icon: "◇",
  kind: "completed",
  effects: [{ kind: "dodge-percent", value: 100 }],
};
const POST_CAST_ONE_HUNDRED: ItemDefinition = {
  id: "p6-post-cast-100",
  name: "Post Cast 100",
  description: "Fixture",
  icon: "◇",
  kind: "completed",
  effects: [],
  behaviors: [{
    kind: "on-ability-cast-energy",
    baseEnergy: 100,
    perCastEnergy: 0,
    maxEnergy: 100,
  }],
};
const POST_CAST_SEVENTY_SEVEN: ItemDefinition = {
  ...POST_CAST_ONE_HUNDRED,
  id: "p6-post-cast-77",
  name: "Post Cast 77",
  behaviors: [{
    kind: "on-ability-cast-energy",
    baseEnergy: 77,
    perCastEnergy: 0,
    maxEnergy: 77,
  }],
};
const POST_CAST_FIVE: ItemDefinition = {
  ...POST_CAST_ONE_HUNDRED,
  id: "p6-post-cast-5",
  name: "Post Cast 5",
  behaviors: [{
    kind: "on-ability-cast-energy",
    baseEnergy: 5,
    perCastEnergy: 0,
    maxEnergy: 5,
  }],
};
const PERIODIC_ONE_HUNDRED: ItemDefinition = {
  id: "p6-periodic-100",
  name: "Periodic 100",
  description: "Fixture",
  icon: "◇",
  kind: "completed",
  effects: [],
  behaviors: [{
    kind: "periodic-ability-power-energy",
    intervalMs: 100,
    abilityPowerPercent: 0,
    energy: 100,
  }],
};

type FixtureUnit = {
  id: string;
  definitionId?: string;
  teamId: "a" | "b";
  x: number;
  y: number;
  traits?: string[];
  items?: string[];
  star?: 1 | 2 | 3;
  stats?: Partial<UnitStats>;
  ability?: Partial<AbilityDefinition>;
};

function stats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 1_000,
    attack: 100,
    defense: 0,
    specialDefense: 0,
    range: 10,
    attackIntervalMs: 1_000,
    moveIntervalMs: 60_000,
    ...overrides,
  };
}

function ability(overrides: Partial<AbilityDefinition> = {}): AbilityDefinition {
  return {
    id: "p6-fixture-ability",
    name: "Fixture Ability",
    description: "Fixture",
    targeting: "nearest-enemy",
    pattern: "single",
    effect: "damage",
    power: 100,
    castAnimationMs: 0,
    ...overrides,
  };
}

function run(
  fixtures: FixtureUnit[],
  options: {
    seed?: string;
    maxTicks?: number;
    items?: ItemDefinition[];
  } = {},
): BattleResult {
  const content: GameContent = structuredClone(DEFAULT_CONTENT);
  content.forms = [];
  content.enemies = [];
  content.units = [
    ...new Map(fixtures.map((fixture) => {
      const definitionId = fixture.definitionId ?? `${fixture.id}-definition`;
      return [definitionId, {
        id: definitionId,
        name: fixture.id,
        cost: 1,
        traits: fixture.traits ?? [],
        stats: stats(fixture.stats),
        ability: ability({ id: `${definitionId}-ability`, ...fixture.ability }),
        assetPath: "",
      } satisfies UnitDefinition] as const;
    })).values(),
  ];
  for (const item of [
    START_100,
    NO_CRIT,
    FORCE_CRIT,
    FORCE_DODGE,
    POST_CAST_ONE_HUNDRED,
    POST_CAST_SEVENTY_SEVEN,
    POST_CAST_FIVE,
    PERIODIC_ONE_HUNDRED,
    ...(options.items ?? []),
  ]) {
    content.items = content.items.filter((candidate) => candidate.id !== item.id);
    content.items.push(structuredClone(item));
  }
  const makeTeam = (teamId: "a" | "b") => {
    const units = fixtures
      .filter((fixture) => fixture.teamId === teamId)
      .map((fixture): BattleSetupUnit => ({
        id: fixture.id,
        definitionId: fixture.definitionId ?? `${fixture.id}-definition`,
        star: fixture.star ?? 1,
        items: fixture.items ?? [],
        position: { x: fixture.x, y: fixture.y },
      }));
    return {
      id: teamId,
      units,
      activeTraits: getActiveTraitsForUnits(units, content),
    };
  };
  return simulateBattle(
    makeTeam("a"),
    makeTeam("b"),
    { seed: options.seed ?? "p6", maxTicks: options.maxTicks ?? 1 },
    content,
  );
}

function events<T extends BattleEvent["type"]>(result: BattleResult, type: T) {
  return result.events.filter(
    (event): event is Extract<BattleEvent, { type: T }> => event.type === type,
  );
}

function unit(result: BattleResult, id: string, initial = false) {
  const found = (initial ? result.initialUnits : result.finalUnits).find(
    (candidate) => candidate.id === id,
  );
  if (!found) throw new Error(`Missing fixture ${id}.`);
  return found;
}

const expectedTraits: Record<
  string,
  { category: "origin" | "role"; tiers: Array<{
    required: number;
    scope: "team" | "holders";
    effects: TraitEffect[];
    behaviors: TraitBehavior[];
  }> }
> = {
  "straw-hat": { category: "origin", tiers: [
    { required: 2, scope: "team", effects: [{ kind: "max-health-percent", value: 10 }], behaviors: [{ kind: "first-straw-hat-cast-rally", energy: 8 }] },
    { required: 4, scope: "team", effects: [{ kind: "max-health-percent", value: 15 }, { kind: "attack-speed-percent", value: 10 }], behaviors: [{ kind: "first-straw-hat-cast-rally", energy: 12 }] },
    { required: 6, scope: "team", effects: [{ kind: "max-health-percent", value: 25 }, { kind: "attack-speed-percent", value: 20 }], behaviors: [{ kind: "first-straw-hat-cast-rally", energy: 16 }] },
  ] },
  navy: { category: "origin", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "defense-flat", value: 14 }], behaviors: [{ kind: "start-navy-formation-shield", shieldPerAdjacentHolder: 40, adjacentHolderCap: 2 }] },
    { required: 3, scope: "holders", effects: [{ kind: "defense-flat", value: 28 }, { kind: "shield-flat", value: 100 }], behaviors: [{ kind: "start-navy-formation-shield", shieldPerAdjacentHolder: 70, adjacentHolderCap: 2 }] },
  ] },
  warlord: { category: "origin", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "omnivamp-percent", value: 8 }, { kind: "starting-energy", value: 10 }], behaviors: [{ kind: "on-warlord-kill-sustain", healMaxHealthPercent: 6, energy: 10 }] },
    { required: 4, scope: "holders", effects: [{ kind: "omnivamp-percent", value: 18 }, { kind: "starting-energy", value: 25 }], behaviors: [{ kind: "on-warlord-kill-sustain", healMaxHealthPercent: 10, energy: 20 }] },
  ] },
  supernova: { category: "origin", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "attack-percent", value: 8 }, { kind: "stacking-attack-percent", value: 3 }, { kind: "stacking-ability-power-percent", value: 3 }], behaviors: [] },
    { required: 4, scope: "holders", effects: [{ kind: "attack-percent", value: 18 }, { kind: "stacking-attack-percent", value: 7 }, { kind: "stacking-ability-power-percent", value: 7 }], behaviors: [] },
  ] },
  brotherhood: { category: "origin", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "emergency-shield-percent", value: 22 }], behaviors: [{ kind: "on-brotherhood-holder-death-rally", healMaxHealthPercent: 6, attackSpeedPercent: 8 }] },
    { required: 3, scope: "holders", effects: [{ kind: "emergency-shield-percent", value: 38 }], behaviors: [{ kind: "on-brotherhood-holder-death-rally", healMaxHealthPercent: 10, attackSpeedPercent: 12 }] },
  ] },
  revolutionary: { category: "origin", tiers: [
    { required: 1, scope: "holders", effects: [{ kind: "dodge-percent", value: 10 }], behaviors: [{ kind: "on-revolutionary-basic-dodge-energy", energy: 5 }] },
    { required: 2, scope: "holders", effects: [{ kind: "dodge-percent", value: 20 }], behaviors: [{ kind: "on-revolutionary-basic-dodge-energy", energy: 8 }] },
  ] },
  emperor: { category: "origin", tiers: [
    { required: 1, scope: "team", effects: [{ kind: "max-health-percent", value: 4 }, { kind: "attack-percent", value: 4 }], behaviors: [{ kind: "start-emperor-star-shield", shieldPerStar: 20 }] },
    { required: 2, scope: "team", effects: [{ kind: "max-health-percent", value: 8 }, { kind: "attack-percent", value: 8 }], behaviors: [{ kind: "start-emperor-star-shield", shieldPerStar: 35 }] },
  ] },
  captain: { category: "role", tiers: [
    { required: 2, scope: "team", effects: [{ kind: "shield-flat", value: 100 }], behaviors: [{ kind: "first-captain-cast-command", energy: 5 }] },
    { required: 3, scope: "team", effects: [{ kind: "shield-flat", value: 225 }], behaviors: [{ kind: "first-captain-cast-command", energy: 10 }] },
  ] },
  brawler: { category: "role", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "max-health-percent", value: 6 }, { kind: "attack-speed-percent", value: 4 }], behaviors: [{ kind: "every-n-direct-damage-counter", every: 10, attackDamagePercent: 50 }] },
    { required: 4, scope: "holders", effects: [{ kind: "max-health-percent", value: 25 }, { kind: "attack-speed-percent", value: 18 }], behaviors: [{ kind: "every-n-direct-damage-counter", every: 10, attackDamagePercent: 75 }] },
  ] },
  swordsman: { category: "role", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "critical-chance-percent", value: 18 }, { kind: "critical-power-percent", value: 25 }], behaviors: [] },
    { required: 3, scope: "holders", effects: [{ kind: "critical-chance-percent", value: 38 }, { kind: "critical-power-percent", value: 50 }], behaviors: [] },
  ] },
  marksman: { category: "role", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "range-flat", value: 1 }, { kind: "critical-chance-percent", value: 10 }], behaviors: [{ kind: "every-n-successful-basic-volley", every: 4, shots: 2, attackDamagePercent: 50 }] },
    { required: 3, scope: "holders", effects: [{ kind: "range-flat", value: 2 }, { kind: "critical-chance-percent", value: 20 }], behaviors: [{ kind: "every-n-successful-basic-volley", every: 3, shots: 2, attackDamagePercent: 50 }] },
  ] },
  specialist: { category: "role", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "ability-power-percent", value: 20 }], behaviors: [{ kind: "post-specialist-cast-energy", energy: 5 }] },
    { required: 4, scope: "holders", effects: [{ kind: "ability-power-percent", value: 45 }, { kind: "starting-energy", value: 15 }], behaviors: [{ kind: "post-specialist-cast-energy", energy: 10 }] },
  ] },
  guardian: { category: "role", tiers: [
    { required: 2, scope: "holders", effects: [{ kind: "defense-flat", value: 15 }, { kind: "shield-flat", value: 90 }], behaviors: [{ kind: "first-direct-hit-guard-point", shield: 60, runeProtectMs: 2_000 }] },
    { required: 3, scope: "holders", effects: [{ kind: "defense-flat", value: 32 }, { kind: "shield-flat", value: 220 }], behaviors: [{ kind: "first-direct-hit-guard-point", shield: 120, runeProtectMs: 3_000 }] },
  ] },
};

describe("P6 trait content and scope", () => {
  it("locks all 13 identities, thresholds, static values, scopes, behaviors, and versions", () => {
    expect(DEFAULT_CONTENT.traits.map((trait) => trait.id)).toEqual(Object.keys(expectedTraits));
    for (const trait of DEFAULT_CONTENT.traits) {
      const expected = expectedTraits[trait.id];
      expect(trait.category).toBe(expected.category);
      expect(trait.tiers.map((tier) => ({
        required: tier.required,
        scope: tier.effectScope,
        effects: tier.effects,
        behaviors: tier.behaviors ?? [],
      }))).toEqual(expected.tiers);
    }
    expect(DEFAULT_CONTENT.version).toBe("1.29.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });

  it("preserves the flattened helper while exposing deterministic scoped grants", () => {
    const active = getActiveTraitsForUnits([
      { definitionId: "luffy", items: [] },
      { definitionId: "nami", items: [] },
    ]);
    expect(getActiveTraitEffectGrants(active).filter((grant) => grant.traitId === "straw-hat"))
      .toEqual([{ traitId: "straw-hat", scope: "team", effect: { kind: "max-health-percent", value: 10 } }]);
  });

  it("applies crew-wide effects to allies and representative holder effects only to holders", () => {
    const result = run([
      { id: "straw-1", teamId: "a", x: 0, y: 0, traits: ["straw-hat"] },
      { id: "straw-2", teamId: "a", x: 2, y: 0, traits: ["straw-hat"] },
      { id: "navy-1", teamId: "a", x: 4, y: 0, traits: ["navy"] },
      { id: "navy-2", teamId: "a", x: 6, y: 0, traits: ["navy"] },
      { id: "outsider", teamId: "a", x: 7, y: 2 },
      { id: "enemy", teamId: "b", x: 7, y: 5 },
    ], { maxTicks: 0 });
    expect(unit(result, "outsider", true).maxHp).toBe(1_100);
    expect(unit(result, "navy-1", true).defense).toBe(14);
    expect(unit(result, "outsider", true).defense).toBe(0);
  });

  it("makes a granted-trait holder eligible for holder scope without affecting a non-holder", () => {
    const result = run([
      { id: "native", teamId: "a", x: 0, y: 0, traits: ["swordsman"], items: [FORCE_CRIT.id] },
      { id: "granted", teamId: "a", x: 1, y: 0, items: ["swordsmans-knot", FORCE_CRIT.id] },
      { id: "ally", teamId: "a", x: 2, y: 0, items: [FORCE_CRIT.id] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ]);
    const damage = events(result, "damage").filter((event) => event.damageKind === "attack");
    expect(damage.find((event) => event.sourceId === "native")?.amount).toBe(225);
    expect(damage.find((event) => event.sourceId === "granted")?.amount).toBe(225);
    expect(damage.find((event) => event.sourceId === "ally")?.amount).toBe(200);
  });

  it("builds semantic keyboard-ready views from typed tier content", () => {
    const active = DEFAULT_CONTENT.traits.map((trait) => ({
      traitId: trait.id,
      count: trait.tiers[0].required,
      tierIndex: 0,
      tier: trait.tiers[0],
    }));
    const views = createTraitViews(active, DEFAULT_CONTENT);
    expect(views).toHaveLength(13);
    expect(views.every((view) => view.semanticDescription.includes(view.scopeLabel))).toBe(true);
    expect(views.every((view) => view.staticEffects.length > 0)).toBe(true);
    expect(views.find((view) => view.id === "emperor")).toMatchObject({
      category: "Origin",
      scopeLabel: "Crew-wide",
      behaviorDescriptions: [expect.stringContaining("20 Shield")],
    });
    expect(views.find((view) => view.id === "swordsman")).toMatchObject({
      scopeLabel: "Trait holders only",
      staticEffects: ["+18% Critical Chance", "+25% Critical Power"],
    });
  });

  it("announces current, active, next, and maximum trait thresholds", () => {
    const strawHat = DEFAULT_CONTENT.traits.find(
      (trait) => trait.id === "straw-hat",
    );
    if (!strawHat) throw new Error("Missing Straw Hat trait fixture.");
    const views = createTraitViews([
      {
        traitId: "straw-hat",
        count: 1,
        tierIndex: -1,
        tier: null,
      },
      {
        traitId: "straw-hat",
        count: 2,
        tierIndex: 0,
        tier: strawHat.tiers[0],
      },
      {
        traitId: "straw-hat",
        count: 6,
        tierIndex: 2,
        tier: strawHat.tiers[2],
      },
    ], DEFAULT_CONTENT);
    expect(views.map((view) => view.semanticDescription)).toEqual([
      expect.stringContaining(
        "Current count: 6. Active threshold: 6. Maximum tier reached.",
      ),
      expect.stringContaining(
        "Current count: 2. Active threshold: 2. Next threshold: 4.",
      ),
      expect.stringContaining(
        "Current count: 1. Inactive. Next threshold: 2.",
      ),
    ]);
  });
});

describe("P6 start and cast ordering", () => {
  it("uses zero/one/two Navy neighbors with diagonal adjacency and a cap of two", () => {
    const result = run([
      { id: "isolated", teamId: "a", x: 7, y: 0, traits: ["navy"] },
      { id: "paired-a", teamId: "a", x: 0, y: 0, traits: ["navy"] },
      { id: "paired-b", teamId: "a", x: 1, y: 1, traits: ["navy"] },
      { id: "cluster-a", teamId: "a", x: 3, y: 3, traits: ["navy"] },
      { id: "cluster-b", teamId: "a", x: 4, y: 3, traits: ["navy"] },
      { id: "cluster-c", teamId: "a", x: 3, y: 4, traits: ["navy"] },
      { id: "cluster-d", teamId: "a", x: 4, y: 4, traits: ["navy"] },
      { id: "enemy", teamId: "b", x: 7, y: 5 },
    ], { maxTicks: 0 });
    expect(unit(result, "isolated", true).shield).toBe(100);
    expect(unit(result, "paired-a", true).shield).toBe(170);
    expect(unit(result, "cluster-a", true).shield).toBe(240);
  });

  it("counts a trait-granted Emperor holder's stars without changing distinct-definition tiers", () => {
    const result = run([
      { id: "native", teamId: "a", x: 0, y: 0, traits: ["emperor"] },
      { id: "granted", teamId: "a", x: 1, y: 0, items: ["emperors-jolly-roger"], star: 3 },
      { id: "ally", teamId: "a", x: 2, y: 0 },
      { id: "enemy", teamId: "b", x: 7, y: 5 },
    ], { maxTicks: 0 });
    expect(unit(result, "ally", true).shield).toBe(140);
  });

  it("counts duplicate deployed Emperor stars while retaining one distinct-definition tier contribution", () => {
    const result = run([
      { id: "emperor-a", definitionId: "shared-emperor", teamId: "a", x: 0, y: 0, traits: ["emperor"], star: 2 },
      { id: "emperor-b", definitionId: "shared-emperor", teamId: "a", x: 1, y: 0, traits: ["emperor"], star: 2 },
      { id: "ally", teamId: "a", x: 2, y: 0 },
      { id: "enemy", teamId: "b", x: 7, y: 5 },
    ], { maxTicks: 0 });
    expect(unit(result, "ally", true)).toMatchObject({ maxHp: 1_040, shield: 80 });
  });

  it("resolves Navy formation diagonals/cap and Emperor duplicate-star aura in stable order", () => {
    const result = run([
      { id: "navy-a", teamId: "a", x: 0, y: 0, traits: ["navy"] },
      { id: "navy-b", teamId: "a", x: 1, y: 1, traits: ["navy"] },
      { id: "navy-c", teamId: "a", x: 0, y: 1, traits: ["navy"] },
      { id: "navy-d", teamId: "a", x: 7, y: 0, traits: ["navy"] },
      { id: "emperor-a", teamId: "a", x: 3, y: 0, traits: ["emperor"], star: 2 },
      { id: "emperor-b", teamId: "a", x: 4, y: 0, traits: ["emperor"], star: 2 },
      { id: "ally", teamId: "a", x: 6, y: 2 },
      { id: "enemy", teamId: "b", x: 7, y: 5 },
    ], { maxTicks: 0 });
    expect(unit(result, "navy-a", true).shield).toBe(100 + 140 + 140);
    expect(unit(result, "navy-d", true).shield).toBe(100 + 140);
    expect(unit(result, "ally", true).shield).toBe(140);
    expect(events(result, "shield").map((event) => event.sourceId).slice(0, 3))
      .toEqual(["navy-a", "navy-b", "navy-c"]);
  });

  it("orders item, Specialist, Straw Hat, then Captain Energy and consumes team rallies once", () => {
    const result = run([
      { id: "a-source", teamId: "a", x: 0, y: 0, traits: ["specialist", "straw-hat", "captain"], items: [START_100.id, POST_CAST_FIVE.id] },
      { id: "b-specialist", teamId: "a", x: 1, y: 0, traits: ["specialist"] },
      { id: "c-straw", teamId: "a", x: 2, y: 0, traits: ["straw-hat"] },
      { id: "d-captain", teamId: "a", x: 3, y: 0, traits: ["captain"] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ]);
    const sourceEnergy = events(result, "energy")
      .filter(
        (event) =>
          event.unitId === "a-source" &&
          event.amount > 0 &&
          (event.reason === "item" || event.reason === "trait"),
      )
      .map((event) => [event.reason, event.amount]);
    expect(sourceEnergy.slice(-4)).toEqual([
      ["item", 5],
      ["trait", 5],
      ["trait", 8],
      ["trait", 5],
    ]);
    expect(unit(result, "c-straw").energy).toBe(23);
    expect(unit(result, "b-specialist").energy).toBe(15);
  });

  it("uses Specialist refund every cast while Straw Hat and Captain remain once per team", () => {
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, traits: ["specialist", "straw-hat", "captain"], items: [START_100.id, POST_CAST_SEVENTY_SEVEN.id], stats: { attackIntervalMs: 100 } },
      { id: "specialist", teamId: "a", x: 1, y: 0, traits: ["specialist"] },
      { id: "straw", teamId: "a", x: 2, y: 0, traits: ["straw-hat"] },
      { id: "captain", teamId: "a", x: 3, y: 0, traits: ["captain"] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { maxTicks: 2 });
    const traitGains = events(result, "energy").filter(
      (event) => event.unitId === "source" && event.reason === "trait",
    );
    expect(traitGains.map((event) => event.amount)).toEqual([5, 8, 5, 5]);
  });
});

describe("P6 reactive combat identities", () => {
  it("grants Revolutionary Energy only for the final successful basic dodge", () => {
    const dodged = run([
      { id: "revolutionary", teamId: "a", x: 0, y: 0, traits: ["revolutionary"], items: [FORCE_DODGE.id], stats: { attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 500 } },
    ]);
    expect(events(dodged, "dodge")).toHaveLength(1);
    expect(events(dodged, "energy").filter((event) => event.unitId === "revolutionary" && event.reason === "trait"))
      .toMatchObject([{ amount: 5 }]);

    const forcedHit = run([
      { id: "revolutionary", teamId: "a", x: 0, y: 0, traits: ["revolutionary"], items: [FORCE_DODGE.id], stats: { attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: ["observation-goggles", NO_CRIT.id] },
    ]);
    expect(events(forcedHit, "dodge")).toHaveLength(0);
    expect(events(forcedHit, "energy").filter((event) => event.unitId === "revolutionary" && event.reason === "trait"))
      .toEqual([]);
  });

  it("fires tier-two Marksman volley after the fourth successful primary without item/basic recursion", () => {
    const result = run([
      { id: "marksman", teamId: "a", x: 0, y: 0, traits: ["marksman"], items: [NO_CRIT.id], stats: { attackIntervalMs: 100 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["marksman"], items: [NO_CRIT.id], stats: { attack: 1, range: 0, attackIntervalMs: 60_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000, attackIntervalMs: 60_000 } },
    ], { maxTicks: 4 });
    const primary = events(result, "damage").filter(
      (event) => event.sourceId === "marksman" && event.damageKind === "attack",
    );
    const volley = events(result, "damage").filter(
      (event) => event.sourceId === "marksman" && event.damageKind === "item",
    );
    expect(primary).toHaveLength(4);
    expect(volley.map((event) => event.amount)).toEqual([50, 50]);
    expect(events(result, "energy").filter((event) => event.unitId === "marksman" && event.reason === "attack"))
      .toHaveLength(4);
    expect(events(result, "energy").filter((event) => event.unitId === "target" && event.reason === "damaged"))
      .toMatchObject([{ amount: 5 }, { amount: 5 }, { amount: 5 }, { amount: 5 }]);
  });

  it("does not advance Marksman volley on a dodged primary", () => {
    const result = run([
      { id: "marksman", teamId: "a", x: 0, y: 0, traits: ["marksman"], items: [NO_CRIT.id], stats: { attackIntervalMs: 100 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["marksman"], stats: { attackIntervalMs: 60_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [FORCE_DODGE.id], stats: { health: 10_000, attackIntervalMs: 60_000 } },
    ], { maxTicks: 4 });
    expect(events(result, "dodge").filter((event) => event.sourceId === "marksman")).toHaveLength(4);
    expect(events(result, "damage").filter((event) => event.sourceId === "marksman" && event.damageKind === "item"))
      .toEqual([]);
  });

  it("skips the second Marksman shot when the first bonus shot kills", () => {
    const result = run([
      { id: "marksman", teamId: "a", x: 0, y: 0, traits: ["marksman"], items: [NO_CRIT.id], stats: { attackIntervalMs: 100 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["marksman"], items: [NO_CRIT.id], stats: { attack: 1, attackIntervalMs: 60_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 451, attackIntervalMs: 60_000 } },
    ], { maxTicks: 4 });
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "marksman" && event.damageKind === "item",
    ).map((event) => event.amount)).toEqual([50]);
  });

  it("activates Guardian Guard Point once after positive direct damage but not after lethal damage", () => {
    const result = run([
      { id: "guardian", teamId: "a", x: 0, y: 0, traits: ["guardian"], stats: { attackIntervalMs: 60_000 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["guardian"], stats: { attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attackIntervalMs: 100 } },
    ], { maxTicks: 2 });
    expect(events(result, "shield").filter((event) => event.sourceId === "guardian" && event.amount === 60))
      .toHaveLength(1);
    expect(events(result, "status").filter((event) => event.targetId === "guardian" && event.status === "rune-protect"))
      .toMatchObject([{ durationTicks: 20 }]);

    const lethal = run([
      { id: "guardian", teamId: "a", x: 0, y: 0, traits: ["guardian"], stats: { health: 10 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["guardian"] },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 500 } },
    ]);
    expect(events(lethal, "shield").filter((event) => event.sourceId === "guardian" && event.amount === 60))
      .toEqual([]);
  });

  it("counters exactly the tenth adjacent direct hit with Physical damage and existing Knockback", () => {
    const result = run([
      { id: "brawler", teamId: "a", x: 0, y: 0, traits: ["brawler"], items: [NO_CRIT.id], stats: { health: 10_000, attack: 100, range: 0, attackIntervalMs: 60_000 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["brawler"], stats: { range: 0, attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { health: 10_000, attack: 1, attackIntervalMs: 100 } },
    ], { maxTicks: 10 });
    const counters = events(result, "damage").filter(
      (event) => event.sourceId === "brawler" && event.damageKind === "item",
    );
    expect(counters.map((event) => event.amount)).toEqual([50]);
    expect(events(result, "unit-displace").filter((event) => event.abilityId === "brawler-counterstrike"))
      .toHaveLength(1);
    expect(events(result, "energy").filter((event) => event.unitId === "attacker" && event.reason === "damaged"))
      .toEqual([]);
    expect(events(result, "energy").filter((event) => event.unitId === "brawler" && event.reason === "damaged"))
      .toHaveLength(10);
    expect(events(result, "energy").filter((event) => event.unitId === "attacker" && event.reason === "attack"))
      .toHaveLength(10);
  });

  it("aggregates split covered basics once per recipient while preserving Guard and Brawler cadence", () => {
    const fixtures: FixtureUnit[] = [
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["advanced-armament-orb", NO_CRIT.id], stats: { attack: 10, attackIntervalMs: 100 } },
      { id: "protected", teamId: "b", x: 0, y: 1, stats: { health: 1, range: 0, attackIntervalMs: 60_000 } },
      { id: "cover", teamId: "b", x: 1, y: 1, traits: ["brawler", "guardian"], items: ["bodyguard-band", NO_CRIT.id], stats: { health: 10_000, attack: 100, range: 0, attackIntervalMs: 60_000 } },
      { id: "second", teamId: "b", x: 7, y: 0, traits: ["brawler", "guardian"], stats: { range: 0, attackIntervalMs: 60_000 } },
    ];
    const beforeTenth = run(fixtures, { maxTicks: 5 });
    expect(events(beforeTenth, "damage").filter(
      (event) => event.sourceId === "cover" && event.damageKind === "item",
    )).toEqual([]);

    const result = run(fixtures, { seed: "split-cover", maxTicks: 10 });
    expect(result).toEqual(run(fixtures, { seed: "split-cover", maxTicks: 10 }));
    expect(events(result, "damage").filter(
      (event) =>
        event.sourceId === "attacker" &&
        event.targetId === "cover" &&
        event.damageKind === "attack",
    )).toHaveLength(20);
    expect(events(result, "shield").filter(
      (event) => event.sourceId === "cover" && event.amount === 60,
    )).toHaveLength(1);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "cover" && event.damageKind === "item",
    ).map((event) => event.amount)).toEqual([50]);
    expect(events(result, "energy").filter(
      (event) => event.unitId === "cover" && event.reason !== "damaged",
    )).toEqual([]);
  });

  it("keeps ability multi-hits as one Brawler reaction per actual hit", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], stats: { attackIntervalMs: 60_000 }, ability: { hits: 10, power: 1, damageType: "true" } },
      { id: "brawler", teamId: "b", x: 0, y: 1, traits: ["brawler"], items: [NO_CRIT.id], stats: { health: 10_000, attack: 100, attackIntervalMs: 60_000 } },
      { id: "second", teamId: "b", x: 7, y: 0, traits: ["brawler"], stats: { attackIntervalMs: 60_000 } },
    ]);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "caster" && event.damageKind === "ability",
    )).toHaveLength(10);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "brawler" && event.damageKind === "item",
    ).map((event) => event.amount)).toEqual([50]);
  });

  it("advances covered Marksman primaries once and volleys into the original target", () => {
    const result = run([
      { id: "marksman", teamId: "a", x: 0, y: 0, traits: ["marksman"], items: [NO_CRIT.id], stats: { attackIntervalMs: 100 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["marksman"], stats: { range: 0, attackIntervalMs: 60_000 } },
      { id: "primary-target", teamId: "b", x: 0, y: 1, stats: { health: 75, range: 0, attackIntervalMs: 60_000 } },
      { id: "z-cover", teamId: "b", x: 1, y: 1, items: ["bodyguard-band"], stats: { health: 200, range: 0, attackIntervalMs: 60_000 } },
    ], { maxTicks: 4 });
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "marksman" && event.damageKind === "attack",
    ).map((event) => event.targetId)).toEqual([
      "z-cover",
      "z-cover",
      "z-cover",
      "z-cover",
    ]);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "marksman" && event.damageKind === "item",
    ).map((event) => event.targetId)).toEqual([
      "primary-target",
      "primary-target",
    ]);
  });

  it("excludes P6 start Shields from Bombardier while counting runtime Guard Point Shield", () => {
    const startShield = run([
      { id: "holder", teamId: "a", x: 0, y: 0, traits: ["navy", "emperor"], items: ["bombardier-band", "star-shield-dial", START_100.id], stats: { attackIntervalMs: 60_000 } },
      { id: "navy", teamId: "a", x: 1, y: 0, traits: ["navy"], stats: { attackIntervalMs: 60_000 } },
      { id: "enemy", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 1_000, specialDefense: 100, attackIntervalMs: 60_000 } },
    ]);
    expect(events(startShield, "shield").filter(
      (event) => event.targetId === "holder",
    ).map((event) => event.amount)).toEqual([40, 20, 50]);
    expect(events(startShield, "damage").filter(
      (event) => event.sourceId === "holder" && event.damageKind === "item",
    ).map((event) => event.amount)).toEqual([12]);

    const guardPoint = run([
      { id: "holder", teamId: "a", x: 0, y: 0, traits: ["guardian"], items: ["bombardier-band"], stats: { health: 10_000, attackIntervalMs: 60_000 } },
      { id: "guardian", teamId: "a", x: 7, y: 0, traits: ["guardian"], stats: { attackIntervalMs: 60_000 } },
      { id: "enemy", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { health: 10_000, attack: 100, specialDefense: 0, attackIntervalMs: 100 } },
    ], { maxTicks: 4 });
    expect(events(guardPoint, "shield").filter(
      (event) => event.sourceId === "holder" && event.amount === 60,
    )).toHaveLength(1);
    expect(events(guardPoint, "damage").filter(
      (event) => event.sourceId === "holder" && event.damageKind === "item",
    ).map((event) => event.amount)).toEqual([30]);
  });

  it("lets existing retaliation suppression and forced-movement immunity govern Brawler counters", () => {
    const suppressed = run([
      { id: "brawler", teamId: "a", x: 0, y: 0, traits: ["brawler"], stats: { health: 10_000, attackIntervalMs: 60_000 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["brawler"], stats: { attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: ["impact-proof-gauntlets", NO_CRIT.id], stats: { health: 10_000, attack: 1, attackIntervalMs: 100 } },
    ], { maxTicks: 10 });
    expect(events(suppressed, "damage").filter(
      (event) => event.sourceId === "brawler" && event.damageKind === "item",
    )).toEqual([]);

    const immovable = run([
      { id: "brawler", teamId: "a", x: 0, y: 0, traits: ["brawler"], stats: { health: 10_000, attackIntervalMs: 60_000 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["brawler"], stats: { attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: ["sea-prism-boots", NO_CRIT.id], stats: { health: 10_000, attack: 1, attackIntervalMs: 100 } },
    ], { maxTicks: 10 });
    expect(events(immovable, "damage").filter(
      (event) => event.sourceId === "brawler" && event.damageKind === "item",
    )).toHaveLength(1);
    expect(events(immovable, "unit-displace").filter(
      (event) => event.abilityId === "brawler-counterstrike",
    )).toEqual([]);

    const blocked = run([
      { id: "brawler", teamId: "a", x: 0, y: 0, traits: ["brawler"], stats: { health: 10_000, attackIntervalMs: 60_000 } },
      { id: "second", teamId: "a", x: 7, y: 0, traits: ["brawler"], stats: { attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { health: 10_000, attack: 1, attackIntervalMs: 100 } },
      { id: "blocker", teamId: "b", x: 0, y: 2, stats: { health: 10_000, attackIntervalMs: 60_000 } },
    ], { maxTicks: 10 });
    expect(events(blocked, "damage").filter(
      (event) => event.sourceId === "brawler" && event.damageKind === "item",
    )).toHaveLength(1);
    expect(events(blocked, "unit-displace").filter(
      (event) => event.abilityId === "brawler-counterstrike",
    )).toEqual([]);
  });

  it("respects Efficient Bandanna's reduced Max Energy for Specialist refund", () => {
    const result = run([
      { id: "specialist", teamId: "a", x: 0, y: 0, traits: ["specialist"], items: [START_100.id, "efficient-bandanna"] },
      { id: "second", teamId: "a", x: 1, y: 0, traits: ["specialist"] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ]);
    expect(unit(result, "specialist")).toMatchObject({ maxEnergy: 85, energy: 10 });
    expect(events(result, "energy").filter(
      (event) => event.unitId === "specialist" && event.reason === "trait",
    )).toMatchObject([{ amount: 5, value: 5 }]);
  });
});

describe("P6 kill, death, and Phoenix runtime", () => {
  it("resolves Warlord sustain before Supernova Attack/AP growth on attributed kill", () => {
    const result = run([
      { id: "killer", teamId: "a", x: 0, y: 0, traits: ["warlord", "supernova"], items: [START_100.id, POST_CAST_ONE_HUNDRED.id, NO_CRIT.id], stats: { attack: 100, attackIntervalMs: 100 }, ability: { power: 200 } },
      { id: "warlord", teamId: "a", x: 7, y: 0, traits: ["warlord"] },
      { id: "supernova", teamId: "a", x: 6, y: 0, traits: ["supernova"] },
      { id: "victim", teamId: "b", x: 0, y: 1, stats: { health: 100, attack: 100 } },
      { id: "later", teamId: "b", x: 1, y: 1, stats: { health: 10_000, attackIntervalMs: 60_000 } },
    ], { maxTicks: 2 });
    expect(unit(result, "killer").attack).toBe(111);
    expect(events(result, "heal").filter(
      (event) =>
        event.sourceId === "killer" &&
        event.targetId === "killer" &&
        event.tick === 1,
    )).toMatchObject([{ amount: 60 }]);
    expect(events(result, "energy").filter((event) => event.unitId === "killer" && event.reason === "trait"))
      .toMatchObject([{ amount: 0 }]);
    expect(events(result, "damage").filter((event) => event.sourceId === "killer" && event.damageKind === "ability").map((event) => event.amount))
      .toEqual([100, 206]);
  });

  it("rallies only surviving Brotherhood holders on actual death", () => {
    const result = run([
      { id: "fallen", teamId: "a", x: 0, y: 0, traits: ["brotherhood"], stats: { health: 10, attackIntervalMs: 60_000 } },
      { id: "brother", teamId: "a", x: 1, y: 0, traits: ["brotherhood"], stats: { attackIntervalMs: 60_000 } },
      { id: "outsider", teamId: "a", x: 2, y: 0, stats: { attackIntervalMs: 60_000 } },
      { id: "attacker-a", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 100 } },
      { id: "attacker-b", teamId: "b", x: 1, y: 1, items: [NO_CRIT.id], stats: { attack: 100 } },
      { id: "attacker-c", teamId: "b", x: 2, y: 1, items: [NO_CRIT.id], stats: { attack: 100 } },
    ]);
    expect(events(result, "death").some((event) => event.unitId === "fallen")).toBe(true);
    expect(events(result, "heal").filter((event) => event.sourceId === "fallen").map((event) => event.targetId))
      .toEqual(["brother"]);
    expect(unit(result, "brother").hp).toBeGreaterThan(unit(result, "outsider").hp);
  });

  it("does not rally Brotherhood on Miracle prevention or Bodyguard victim survival", () => {
    const miracle = run([
      { id: "protected", teamId: "a", x: 0, y: 0, traits: ["brotherhood"], items: ["miracle-talisman"] },
      { id: "brother", teamId: "a", x: 1, y: 0, traits: ["brotherhood"] },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 10_000 } },
    ]);
    expect(events(miracle, "death").filter((event) => event.unitId === "protected")).toEqual([]);
    expect(events(miracle, "heal").filter((event) => event.sourceId === "protected")).toEqual([]);

    const bodyguard = run([
      { id: "protected", teamId: "a", x: 0, y: 0, traits: ["brotherhood"] },
      { id: "brother", teamId: "a", x: 2, y: 0, traits: ["brotherhood"] },
      { id: "cover", teamId: "a", x: 1, y: 0, items: ["bodyguard-band"] },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 10_000 } },
    ]);
    expect(events(bodyguard, "death").filter((event) => event.unitId === "protected")).toEqual([]);
    expect(events(bodyguard, "heal").filter((event) => event.sourceId === "protected")).toEqual([]);
  });

  it("does not treat Phoenix resurrection entry as death and resets per-unit Guard runtime", () => {
    const result = run([
      { id: "phoenix", teamId: "a", x: 0, y: 0, traits: ["brotherhood", "guardian"], items: ["phoenix-feather"], stats: { health: 100, attackIntervalMs: 60_000 } },
      { id: "brother", teamId: "a", x: 2, y: 0, traits: ["brotherhood"], stats: { health: 10_000, attackIntervalMs: 60_000 } },
      { id: "guardian", teamId: "a", x: 7, y: 0, traits: ["guardian"], stats: { health: 10_000, attackIntervalMs: 60_000 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, items: [NO_CRIT.id], stats: { attack: 100, attackIntervalMs: 100 } },
    ], { maxTicks: 25 });
    expect(events(result, "unit-resurrect")).toMatchObject([{ tick: 23, unitId: "phoenix" }]);
    expect(events(result, "death").filter((event) => event.unitId === "phoenix"))
      .toMatchObject([{ tick: 25 }]);
    expect(events(result, "heal").filter((event) => event.sourceId === "phoenix"))
      .toMatchObject([{ tick: 25, targetId: "brother" }]);
    expect(events(result, "shield").filter((event) => event.sourceId === "phoenix" && event.amount === 60))
      .toHaveLength(2);
  });

  it("resets per-unit growth while preserving consumed team casts and not replaying start shields", () => {
    const result = run([
      { id: "phoenix", teamId: "a", x: 0, y: 0, traits: ["straw-hat", "navy", "supernova", "emperor", "captain", "specialist"], items: ["phoenix-feather", START_100.id, PERIODIC_ONE_HUNDRED.id], stats: { health: 1_000, attack: 100, attackIntervalMs: 100 }, ability: { power: 200 } },
      { id: "helper", teamId: "a", x: 1, y: 0, traits: ["straw-hat", "navy", "supernova", "captain", "specialist"], stats: { health: 100_000, attackIntervalMs: 60_000 } },
      { id: "victim", teamId: "b", x: 0, y: 1, stats: { health: 100, attack: 100, attackIntervalMs: 60_000 } },
      { id: "later", teamId: "b", x: 0, y: 2, stats: { health: 100_000, attack: 800, attackIntervalMs: 100 } },
    ], { maxTicks: 23 });
    expect(events(result, "unit-resurrect")).toMatchObject([{ tick: 22, unitId: "phoenix" }]);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "phoenix" && event.damageKind === "ability",
    ).map((event) => event.amount)).toEqual([100, 246, 240]);
    expect(unit(result, "phoenix").attack).toBe(112);
    expect(events(result, "energy").filter(
      (event) => event.unitId === "phoenix" && event.reason === "trait",
    ).map((event) => event.amount)).toEqual([5, 8, 5, 5, 5]);
    expect(events(result, "shield").filter(
      (event) => event.targetId === "phoenix" && event.tick > 0,
    )).toEqual([]);
  });

  it("produces identical representative multi-trait results without extra behavior RNG", () => {
    const fixtures: FixtureUnit[] = [
      { id: "all-a", teamId: "a", x: 0, y: 0, traits: ["straw-hat", "navy", "supernova", "brotherhood", "revolutionary", "emperor", "captain", "brawler", "swordsman", "marksman", "specialist", "guardian"], items: [START_100.id, NO_CRIT.id] },
      { id: "all-b", teamId: "a", x: 1, y: 0, traits: ["straw-hat", "navy", "supernova", "brotherhood", "revolutionary", "captain", "brawler", "swordsman", "marksman", "specialist", "guardian"] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ];
    expect(run(fixtures, { seed: "p6-deterministic", maxTicks: 20 }))
      .toEqual(run(fixtures, { seed: "p6-deterministic", maxTicks: 20 }));
  });
});
