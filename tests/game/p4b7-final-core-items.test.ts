import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  createMatch,
  deserializeMatch,
  hashSeed,
  nextRandom,
  reconcileProductionFormProgression,
  serializeMatch,
  simulateBattle,
  type AbilityDefinition,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type GameContent,
  type ItemDefinition,
  type TraitEffect,
  type UnitDefinition,
  type UnitInstance,
  type UnitStats,
} from "../../game";

const P4B7_IDS = [
  "flame-flame-grimoire",
  "miracle-talisman",
  "mystery-treasure-chest",
  "smoke-star-escape",
  "phoenix-feather",
  "banquet-belt",
  "reversal-band",
  "mera-mera-ember",
  "bombardier-band",
  "bodyguard-band",
  "nullification-bandanna",
  "efficient-bandanna",
] as const;

const TRAIT_GRANT_IDS = new Set([
  "emperors-jolly-roger",
  "specialists-log-pose",
  "marine-justice-coat",
  "marksmans-thunder-dial",
  "captains-logbook",
  "brawlers-rumble-emblem",
  "guardians-sea-prism-crest",
  "revolutionary-flame",
  "straw-hat-token",
  "swordsmans-knot",
]);

const ACQUISITION_IDS = [
  "jolly-roger-fragment", "devil-fruit-essence", "cola-canister",
  "jet-dial", "sniper-lens", "sea-king-meat", "sea-prism-shard",
  "black-blade-shard", "armament-plate", "captains-sash",
];

function productionItem(id: string): ItemDefinition {
  const item = DEFAULT_CONTENT.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing production item ${id}.`);
  return structuredClone(item);
}

function fixtureItem(
  id: string,
  effects: ItemDefinition["effects"] = [],
  behaviors: ItemDefinition["behaviors"] = [],
): ItemDefinition {
  return {
    id,
    name: id,
    description: "P4B7 fixture item.",
    icon: "fixture",
    kind: "completed",
    effects,
    behaviors,
  };
}

const START_100 = fixtureItem("p4b7-start-100", [
  { kind: "starting-energy", value: 100 },
]);
const START_90 = fixtureItem("p4b7-start-90", [
  { kind: "starting-energy", value: 90 },
]);
const START_70 = fixtureItem("p4b7-start-70", [
  { kind: "starting-energy", value: 70 },
]);
const START_SHIELD_45 = fixtureItem("p4b7-shield-45", [
  { kind: "shield-flat", value: 45 },
]);
const DODGE_50 = fixtureItem("p4b7-dodge-50", [
  { kind: "dodge-percent", value: 50 },
]);
const RUNE_PROTECT = fixtureItem(
  "p4b7-rune-protect",
  [],
  [{ kind: "starting-rune-protect", durationMs: 60_000 }],
);

function stats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 1_000,
    attack: 1,
    defense: 0,
    specialDefense: 0,
    range: 10,
    attackIntervalMs: 60_000,
    moveIntervalMs: 60_000,
    ...overrides,
  };
}

function ability(overrides: Partial<AbilityDefinition> = {}): AbilityDefinition {
  return {
    id: "fixture-ability",
    name: "Fixture Ability",
    description: "P4B7 fixture ability.",
    targeting: "self",
    pattern: "single",
    effect: "heal",
    power: 1,
    castAnimationMs: 0,
    requiresTarget: false,
    ...overrides,
  };
}

type Combatant = {
  id: string;
  teamId: "a" | "b";
  x: number;
  y: number;
  star?: 1 | 2 | 3;
  items?: string[];
  stats?: Partial<UnitStats>;
  ability?: Partial<AbilityDefinition>;
};

function run(
  combatants: Combatant[],
  options: {
    maxTicks?: number;
    seed?: string;
    extraItems?: ItemDefinition[];
    teamAEffects?: TraitEffect[];
    teamBEffects?: TraitEffect[];
  } = {},
): BattleResult {
  const content: GameContent = structuredClone(DEFAULT_CONTENT);
  content.units = combatants.map(
    (combatant): UnitDefinition => ({
      id: `${combatant.id}-definition`,
      name: combatant.id,
      cost: 1,
      traits: [],
      stats: stats(combatant.stats),
      ability: ability({
        id: `${combatant.id}-ability`,
        ...combatant.ability,
      }),
      assetPath: "",
    }),
  );
  content.forms = [];
  content.enemies = [];
  for (const item of options.extraItems ?? []) {
    content.items = content.items.filter((candidate) => candidate.id !== item.id);
    content.items.push(structuredClone(item));
  }
  const team = (teamId: "a" | "b", effects: TraitEffect[]) => ({
    id: teamId,
    units: combatants
      .filter((combatant) => combatant.teamId === teamId)
      .map(
        (combatant): BattleSetupUnit => ({
          id: combatant.id,
          definitionId: `${combatant.id}-definition`,
          star: combatant.star ?? 1,
          items: combatant.items ?? [],
          position: { x: combatant.x, y: combatant.y },
        }),
      ),
    activeTraits: effects.length
      ? [{
          traitId: `${teamId}-fixture`,
          count: 1,
          tierIndex: 0,
          tier: { required: 1, label: "Fixture", effects },
        }]
      : [],
  });
  return simulateBattle(
    team("a", options.teamAEffects ?? [
      { kind: "critical-chance-percent", value: -100 },
    ]),
    team("b", options.teamBEffects ?? [
      { kind: "critical-chance-percent", value: -100 },
    ]),
    { seed: options.seed ?? "p4b7", maxTicks: options.maxTicks ?? 1 },
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
  if (!found) throw new Error(`Missing battle unit ${id}.`);
  return found;
}

function damageFrom(result: BattleResult, sourceId: string) {
  return events(result, "damage").filter((event) => event.sourceId === sourceId);
}

function findSeed(
  predicate: (values: number[]) => boolean,
  rolls = 2,
): string {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `p4b7-seed-${index}`;
    let state = hashSeed(seed);
    const values: number[] = [];
    for (let rollIndex = 0; rollIndex < rolls; rollIndex += 1) {
      const random = nextRandom(state);
      state = random.state;
      values.push(random.value);
    }
    if (predicate(values)) return seed;
  }
  throw new Error("No deterministic fixture seed found.");
}

function wonderCandidates(held: readonly string[]): string[] {
  return [...new Set(Object.values(DEFAULT_CONTENT.itemRecipes))]
    .filter(
      (itemId) =>
        itemId !== "mystery-treasure-chest" &&
        !TRAIT_GRANT_IDS.has(itemId) &&
        !held.includes(itemId),
    )
    .sort((left, right) => left.localeCompare(right));
}

function drawWonder(
  state: number,
  held: readonly string[],
): { state: number; items: string[] } {
  const available = wonderCandidates(held);
  const items: string[] = [];
  let currentState = state;
  for (let rollIndex = 0; rollIndex < 2; rollIndex += 1) {
    const candidates = available.filter((itemId) => !items.includes(itemId));
    const random = nextRandom(currentState);
    currentState = random.state;
    items.push(candidates[Math.floor(random.value * candidates.length)]);
  }
  return { state: currentState, items };
}

describe("P4B7 production content", () => {
  it("defines the twelve exact static identities and typed behaviors", () => {
    expect(productionItem("flame-flame-grimoire")).toMatchObject({
      effects: [{ kind: "ability-power-percent", value: 30 }, { kind: "attack-flat", value: 9 }],
      behaviors: [{ kind: "on-special-damage-burn-resistance", burnDurationMs: 3_000, specialDefenseDelta: -1 }],
    });
    expect(productionItem("miracle-talisman")).toMatchObject({
      effects: [{ kind: "defense-flat", value: 3 }],
      behaviors: [{ kind: "low-health-protect-energy", healthThresholdPercent: 30, energy: 50, protectMs: 1_500 }],
    });
    expect(productionItem("mystery-treasure-chest").behaviors).toEqual([{ kind: "battle-random-items", rolls: 2 }]);
    expect(productionItem("smoke-star-escape")).toMatchObject({
      effects: [{ kind: "critical-chance-percent", value: 10 }],
      behaviors: [{ kind: "low-health-smoke-escape", healthThresholdPercent: 40, statusMs: 4_000, shield: 150 }],
    });
    expect(productionItem("phoenix-feather").behaviors).toEqual([{ kind: "resurrect-once", delayMs: 2_000 }]);
    expect(productionItem("banquet-belt")).toMatchObject({
      effects: [{ kind: "health-flat", value: 150 }, { kind: "shield-flat", value: 45 }],
      behaviors: [{ kind: "combat-stat-delta-amplifier", percent: 25 }],
    });
    expect(productionItem("reversal-band")).toMatchObject({
      effects: [{ kind: "special-defense-flat", value: 20 }, { kind: "shield-flat", value: 150 }],
      behaviors: [{ kind: "enemy-debuff-inversion" }],
    });
    expect(productionItem("mera-mera-ember")).toMatchObject({
      effects: [{ kind: "attack-flat", value: 15 }, { kind: "defense-flat", value: 3 }],
      behaviors: [{ kind: "start-base-attack-self-burn", burnDurationMs: 300_000 }],
    });
    expect(productionItem("bombardier-band")).toMatchObject({
      effects: [{ kind: "shield-flat", value: 150 }, { kind: "attack-flat", value: 9 }],
      behaviors: [{ kind: "shield-depletion-explosion", percent: 50 }],
    });
    expect(productionItem("bodyguard-band")).toMatchObject({
      effects: [{ kind: "defense-flat", value: 12 }, { kind: "shield-flat", value: 150 }],
      behaviors: [{ kind: "lethal-cover" }],
    });
    expect(productionItem("nullification-bandanna")).toMatchObject({
      effects: [{ kind: "shield-flat", value: 90 }],
      behaviors: [{ kind: "cannot-cast-energy-attacks", attackConversionPercent: 60 }],
    });
    expect(productionItem("efficient-bandanna")).toMatchObject({
      effects: [{ kind: "shield-flat", value: 45 }, { kind: "starting-energy", value: 15 }],
      behaviors: [{ kind: "start-horizontal-max-energy", percent: 85 }],
    });
  });

  it("completes all 45 non-trait recipes alongside the 10 P4C trait outputs", () => {
    const outputs = [...new Set(Object.values(DEFAULT_CONTENT.itemRecipes))];
    const nonTraitIds = outputs.filter((itemId) => !TRAIT_GRANT_IDS.has(itemId));
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
    expect(outputs).toHaveLength(55);
    expect(nonTraitIds).toHaveLength(45);
    expect(TRAIT_GRANT_IDS).toHaveLength(10);
    expect(
      nonTraitIds.filter((itemId) => {
        const item = productionItem(itemId);
        return item.effects.length === 0 && (item.behaviors?.length ?? 0) === 0;
      }),
    ).toEqual([]);
    expect(
      [...TRAIT_GRANT_IDS].every((itemId) => {
        const item = productionItem(itemId);
        return Boolean(item.grantedTraitId);
      }),
    ).toBe(true);
    expect(P4B7_IDS).toHaveLength(12);
  });
});

describe("Flame-Flame Grimoire and stat-delta adaptations", () => {
  it("procs per Special hit, stacks Special Defense loss, and never recurses from Burn", () => {
    const result = run([
      {
        id: "caster",
        teamId: "a",
        x: 0,
        y: 0,
        items: ["flame-flame-grimoire", START_100.id],
        ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "special", power: 1_000, hits: 2 },
      },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000, specialDefense: 100 } },
    ], { maxTicks: 11, extraItems: [START_100] });
    const damage = damageFrom(result, "caster");
    expect(damage.slice(0, 2).map((event) => event.amount)).toEqual([650, 653]);
    expect(events(result, "status").filter((event) => event.status === "burn")).toHaveLength(2);
    expect(damage.filter((event) => event.damageKind === "burn")).toHaveLength(1);
  });

  it("lets Rune Protect block Burn but not the direct Special Defense delta", () => {
    const result = run([
      {
        id: "caster",
        teamId: "a",
        x: 0,
        y: 0,
        items: ["flame-flame-grimoire", START_100.id],
        ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "special", power: 1_000, hits: 2 },
      },
      { id: "target", teamId: "b", x: 0, y: 1, items: [RUNE_PROTECT.id], stats: { health: 10_000, specialDefense: 100 } },
    ], { extraItems: [START_100, RUNE_PROTECT] });
    expect(damageFrom(result, "caster").map((event) => event.amount)).toEqual([650, 653]);
    expect(events(result, "status").filter((event) => event.status === "burn")).toEqual([]);
  });

  it("inverts Grimoire's enemy debuff for Reversal Band holders", () => {
    const result = run([
      {
        id: "caster",
        teamId: "a",
        x: 0,
        y: 0,
        items: ["flame-flame-grimoire", START_100.id],
        ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "special", power: 1_000, hits: 2 },
      },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["reversal-band"], stats: { health: 10_000, specialDefense: 100 } },
    ], { extraItems: [START_100] });
    expect(damageFrom(result, "caster").slice(0, 2).map((event) => event.amount)).toEqual([590, 588]);
  });

  it("does not invert statuses, timed resistance reduction, or Energy drain", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, stunMs: 1_000, burnPower: 10, burnDurationMs: 3_000, energyDrain: 15 } },
      { id: "razor", teamId: "a", x: 1, y: 0, items: ["armor-piercing-scope"], stats: { attack: 1 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["reversal-band", START_70.id], stats: { health: 10_000 } },
    ], { extraItems: [START_100, START_70] });
    const statuses = events(result, "status").filter((event) => event.targetId === "target");
    expect(statuses.map((event) => event.status)).toEqual(expect.arrayContaining(["stun", "burn", "resistance-reduction"]));
    expect(events(result, "energy").some((event) => event.unitId === "target" && event.reason === "ability-drain" && event.amount === -15)).toBe(true);
  });

  it("amplifies Soul Dew, Rush Flag, Upgrade, Mach, Muscle, and Mera combat buffs without double application", () => {
    const soul = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: ["banquet-belt", "clima-tact", START_90.id], stats: { attackIntervalMs: 1_000 }, ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { maxTicks: 11, extraItems: [START_90] });
    expect(damageFrom(soul, "caster").find((event) => event.damageKind === "ability")?.amount).toBe(106);

    const rush = run([
      { id: "flag", teamId: "a", x: 0, y: 0, items: ["rush-flag"] },
      { id: "holder", teamId: "a", x: 1, y: 0, items: ["banquet-belt"], stats: { attackIntervalMs: 10_000 } },
      { id: "target", teamId: "b", x: 1, y: 1, stats: { health: 20_000 } },
    ], { maxTicks: 82 });
    expect(events(rush, "attack").filter((event) => event.sourceId === "holder").map((event) => event.tick)).toEqual([1, 81]);

    const upgrade = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["banquet-belt", "cola-engine"], stats: { attackIntervalMs: 10_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 20_000 } },
    ], { maxTicks: 90 });
    expect(events(upgrade, "attack").filter((event) => event.sourceId === "holder").map((event) => event.tick).slice(0, 2)).toEqual([1, 87]);

    const mach = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["banquet-belt", "jet-sash"], stats: { attackIntervalMs: 10_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 20_000 } },
    ], { maxTicks: 185 });
    expect(events(mach, "attack").filter((event) => event.sourceId === "holder").map((event) => event.tick).slice(0, 3)).toEqual([1, 92, 144]);

    const muscle = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["banquet-belt", "armament-wraps"], stats: { health: 10_000, attack: 100 } },
      { id: "attacker", teamId: "b", x: 0, y: 1, stats: { attack: 10, attackIntervalMs: 100 } },
    ], { maxTicks: 2 });
    expect(unit(muscle, "holder").attack).toBe(103);

    const mera = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["banquet-belt", "mera-mera-ember"], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ]);
    expect(unit(mera, "holder", true).attack).toBe(240);
  });
});

describe("Miracle Talisman and Protect", () => {
  it("uses strict under-30% comparison", () => {
    const exact = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 700 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["miracle-talisman"] },
    ], { extraItems: [START_100] });
    const below = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 701 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["miracle-talisman"] },
    ], { extraItems: [START_100] });
    expect(unit(exact, "target").hp).toBe(300);
    expect(events(exact, "status").filter((event) => event.status === "protect")).toEqual([]);
    expect(unit(below, "target").hp).toBe(1_000);
    expect(events(below, "status").filter((event) => event.status === "protect")).toHaveLength(1);
  });

  it("absorbs Shield first, cancels HP damage, grants Energy, and applies 1.5s Protect", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 1_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["miracle-talisman", START_SHIELD_45.id] },
    ], { extraItems: [START_100, START_SHIELD_45] });
    expect(damageFrom(result, "caster")[0]).toMatchObject({ shieldDamage: 45, healthDamage: 0, amount: 45 });
    expect(unit(result, "target")).toMatchObject({ hp: 1_000, shield: 0, energy: 50 });
    expect(events(result, "status").find((event) => event.status === "protect")).toMatchObject({ durationTicks: 15 });
  });

  it("blocks damage, healing, and positive Energy while allowing drain and remains consumed", () => {
    const result = run([
      { id: "a-trigger", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 800 } },
      { id: "b-drain", teamId: "a", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 1, energyDrain: 15 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["miracle-talisman", "clima-tact"], stats: { attack: 1 } },
    ], { maxTicks: 10, extraItems: [START_100] });
    expect(events(result, "status").filter((event) => event.status === "protect")).toHaveLength(1);
    expect(damageFrom(result, "b-drain")).toEqual([]);
    expect(unit(result, "target").energy).toBe(35);
    expect(events(result, "heal").filter((event) => event.targetId === "target")).toEqual([]);
  });

  it("returns zero healing while Protect is active", () => {
    const result = run([
      { id: "a-first", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 500 } },
      { id: "a-trigger", teamId: "a", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 300 } },
      { id: "b-healer", teamId: "b", x: 2, y: 2, items: [START_90.id], stats: { attackIntervalMs: 100 }, ability: { targeting: "lowest-health-ally", pattern: "single-ally", requiresTarget: true, effect: "heal", power: 200 } },
      { id: "z-target", teamId: "b", x: 0, y: 1, items: ["miracle-talisman"] },
    ], { maxTicks: 2, extraItems: [START_100, START_90] });
    expect(unit(result, "z-target").hp).toBe(500);
    expect(events(result, "heal").filter((event) => event.sourceId === "b-healer")).toEqual([]);
  });
});

describe("Mystery Treasure Chest", () => {
  it("removes itself battle-only and produces two deterministic distinct eligible items", () => {
    const setupItems = ["mystery-treasure-chest"];
    const combatants: Combatant[] = [
      { id: "holder", teamId: "a", x: 0, y: 0, items: setupItems },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ];
    const first = run(combatants, { seed: "wonder-deterministic" });
    const second = run(combatants, { seed: "wonder-deterministic" });
    const battleItems = unit(first, "holder", true).items ?? [];
    expect(first).toEqual(second);
    expect(battleItems).toHaveLength(2);
    expect(new Set(battleItems)).toHaveLength(2);
    expect(battleItems).not.toContain("mystery-treasure-chest");
    expect(battleItems.every((itemId) => !TRAIT_GRANT_IDS.has(itemId))).toBe(true);
    expect(setupItems).toEqual(["mystery-treasure-chest"]);
  });

  it("applies generated static and start behaviors", () => {
    let seed = "";
    for (let index = 0; index < 10_000; index += 1) {
      const candidate = `wonder-mera-${index}`;
      if (drawWonder(hashSeed(candidate), ["mystery-treasure-chest"]).items.includes("mera-mera-ember")) {
        seed = candidate;
        break;
      }
    }
    expect(seed).not.toBe("");
    const result = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["mystery-treasure-chest"], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { seed });
    expect(unit(result, "holder", true).items).toContain("mera-mera-ember");
    expect(unit(result, "holder", true).attack).toBeGreaterThanOrEqual(215);
    expect(events(result, "status").some((event) => event.sourceId === "holder" && event.status === "burn")).toBe(true);
  });

  it("still consumes the discarded second roll at the three-item cap", () => {
    const seed = "wonder-cap";
    const firstHeld = ["mystery-treasure-chest", "black-blade", "meat-platter"];
    const firstDraw = drawWonder(hashSeed(seed), firstHeld);
    const secondDraw = drawWonder(firstDraw.state, ["mystery-treasure-chest"]);
    const result = run([
      { id: "a-cap", teamId: "a", x: 0, y: 0, items: firstHeld },
      { id: "b-next", teamId: "a", x: 1, y: 0, items: ["mystery-treasure-chest"] },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { seed });
    expect(unit(result, "a-cap", true).items).toEqual(["black-blade", "meat-platter", firstDraw.items[0]]);
    expect(unit(result, "b-next", true).items).toEqual(secondDraw.items);
  });

  it("can generate Phoenix Feather without rerolling its battle items on resurrection", () => {
    let seed = "";
    for (let index = 0; index < 10_000; index += 1) {
      const candidate = `wonder-phoenix-${index}`;
      const rolled = drawWonder(
        hashSeed(candidate),
        ["mystery-treasure-chest"],
      ).items;
      if (rolled.includes("phoenix-feather") && !rolled.includes("miracle-talisman")) {
        seed = candidate;
        break;
      }
    }
    expect(seed).not.toBe("");
    const persistentItems = ["mystery-treasure-chest"];
    const result = run([
      { id: "killer", teamId: "a", x: 0, y: 0, stats: { attack: 5_000, attackIntervalMs: 60_000 } },
      { id: "holder", teamId: "b", x: 0, y: 1, items: persistentItems },
    ], { seed, maxTicks: 21 });
    expect(unit(result, "holder", true).items).toContain("phoenix-feather");
    expect(unit(result, "holder").items).toEqual(unit(result, "holder", true).items);
    expect(events(result, "unit-resurrect")).toHaveLength(1);
    expect(persistentItems).toEqual(["mystery-treasure-chest"]);
  });
});

describe("Smoke-Star Escape, Blind, and Paralysis", () => {
  it("triggers only while alive below 40%, then applies statuses, Shield, and escape once", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 601 } },
      { id: "holder", teamId: "b", x: 1, y: 1, items: ["smoke-star-escape"] },
    ], { maxTicks: 2, extraItems: [START_100] });
    expect(unit(result, "holder")).toMatchObject({ hp: 399, shield: 150 });
    expect(events(result, "status").filter((event) => event.status === "blind" || event.status === "paralysis")).toHaveLength(2);
    expect(events(result, "unit-displace")).toMatchObject([{ unitId: "holder", movementKind: "escape" }]);
  });

  it("does not trigger at exactly 40% and lets Rune Protect block both statuses", () => {
    const exact = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 600 } },
      { id: "holder", teamId: "b", x: 0, y: 1, items: ["smoke-star-escape"] },
    ], { extraItems: [START_100] });
    expect(events(exact, "unit-displace")).toEqual([]);

    const protectedEnemy = run([
      { id: "protected", teamId: "a", x: 0, y: 0, items: [RUNE_PROTECT.id] },
      { id: "caster", teamId: "a", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 601 } },
      { id: "holder", teamId: "b", x: 1, y: 1, items: ["smoke-star-escape"] },
    ], { extraItems: [START_100, RUNE_PROTECT] });
    expect(events(protectedEnemy, "status").filter((event) => event.targetId === "protected" && (event.status === "blind" || event.status === "paralysis"))).toEqual([]);
  });

  it("Blind preserves the dodge roll and Observation Goggles still force a hit", () => {
    const seed = findSeed(([dodge, critical]) => dodge < 0.5 && critical < 0.4);
    const result = run([
      { id: "a-blinded", teamId: "a", x: 0, y: 0, items: ["observation-goggles"], stats: { attack: 100 } },
      { id: "b-trigger", teamId: "a", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 601 } },
      { id: "holder", teamId: "b", x: 1, y: 1, items: ["smoke-star-escape"] },
    ], { seed, extraItems: [START_100], teamAEffects: [{ kind: "critical-chance-percent", value: 30 }], teamBEffects: [] });
    expect(events(result, "dodge").filter((event) => event.sourceId === "a-blinded")).toEqual([]);
    expect(events(result, "attack").find((event) => event.sourceId === "a-blinded")?.critical).toBe(true);
  });

  it("Paralysis preserves the dodge roll then prevents dodge", () => {
    const seed = findSeed(([dodge, critical]) => dodge < 0.5 && critical < 0.4);
    const result = run([
      { id: "a-attacker", teamId: "a", x: 0, y: 2, stats: { attack: 100 } },
      { id: "holder", teamId: "a", x: 1, y: 1, items: ["smoke-star-escape"] },
      { id: "b-paralyzed", teamId: "b", x: 0, y: 1, items: [DODGE_50.id] },
      { id: "b-trigger", teamId: "b", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 601 } },
    ], { seed, extraItems: [DODGE_50, START_100], teamAEffects: [{ kind: "critical-chance-percent", value: 30 }], teamBEffects: [] });
    expect(events(result, "dodge").filter((event) => event.targetId === "b-paralyzed")).toEqual([]);
    expect(events(result, "attack").find((event) => event.sourceId === "a-attacker")?.critical).toBe(true);
  });

  it("keeps all Smoke effects when no cell is empty and lets self-escape ignore Boots", () => {
    const fullBoard: Combatant[] = [];
    for (let y = 0; y < DEFAULT_CONTENT.config.boardHeight; y += 1) {
      for (let x = 0; x < DEFAULT_CONTENT.config.boardWidth; x += 1) {
        if (x === 3 && y === 3) continue;
        fullBoard.push({
          id: x === 3 && y === 2 ? "caster" : `filler-${y}-${x}`,
          teamId: "a",
          x,
          y,
          ...(x === 3 && y === 2
            ? {
                items: [START_100.id],
                ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage" as const, damageType: "true" as const, power: 601 },
              }
            : {}),
        });
      }
    }
    fullBoard.push({ id: "holder", teamId: "b", x: 3, y: 3, items: ["smoke-star-escape"] });
    const blocked = run(fullBoard, { extraItems: [START_100] });
    expect(events(blocked, "unit-displace").filter((event) => event.unitId === "holder")).toEqual([]);
    expect(events(blocked, "shield").some((event) => event.targetId === "holder" && event.amount === 150)).toBe(true);

    const boots = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 601 } },
      { id: "holder", teamId: "b", x: 0, y: 1, items: ["smoke-star-escape", "sea-prism-boots"] },
    ], { extraItems: [START_100] });
    expect(events(boots, "unit-displace")).toMatchObject([{ unitId: "holder", movementKind: "escape" }]);
  });
});

describe("Phoenix Feather resurrection", () => {
  it("waits two seconds, stays battle-active, returns full, and grants no kill credit", () => {
    const result = run([
      { id: "killer", teamId: "a", x: 0, y: 0, stats: { attack: 2_000, attackIntervalMs: 3_000 } },
      { id: "phoenix", teamId: "b", x: 0, y: 1, items: ["phoenix-feather"] },
    ], { maxTicks: 21 });
    expect(events(result, "unit-resurrect")).toMatchObject([{ tick: 21, unitId: "phoenix", hp: 1_000, maxHp: 1_000 }]);
    expect(events(result, "death").filter((event) => event.unitId === "phoenix")).toEqual([]);
    expect(unit(result, "phoenix")).toMatchObject({ hp: 1_000, energy: 0, shield: 0 });
    expect(result.durationTicks).toBe(21);
  });

  it("reserves its cell through resurrection while remaining untargetable", () => {
    const result = run([
      {
        id: "mover",
        teamId: "a",
        x: 0,
        y: 0,
        items: [START_100.id],
        stats: { range: 1, moveIntervalMs: 100 },
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: false,
          effect: "damage",
          damageType: "true",
          power: 2_000,
        },
      },
      {
        id: "phoenix",
        teamId: "b",
        x: 1,
        y: 0,
        items: ["phoenix-feather"],
      },
      {
        id: "survivor",
        teamId: "b",
        x: 2,
        y: 0,
        stats: { health: 10_000 },
      },
    ], { maxTicks: 21, extraItems: [START_100] });

    expect(events(result, "unit-resurrect")).toMatchObject([
      { tick: 21, unitId: "phoenix" },
    ]);
    expect(
      events(result, "unit-move").some(
        (event) => event.to.x === 1 && event.to.y === 0,
      ),
    ).toBe(false);
    expect(
      events(result, "attack").some(
        (event) => event.tick > 1 && event.targetId === "phoenix",
      ),
    ).toBe(false);
    expect(
      events(result, "cast").some(
        (event) => event.tick > 1 && event.targetIds.includes("phoenix"),
      ),
    ).toBe(false);
    const battleActivePositions = result.finalUnits
      .filter((candidate) => candidate.hp > 0 || candidate.state === "resurrecting")
      .map((candidate) => `${candidate.x},${candidate.y}`);
    expect(new Set(battleActivePositions).size).toBe(battleActivePositions.length);
  });

  it("does not let Lunge enter a resurrecting Phoenix cell", () => {
    const result = run([
      {
        id: "killer",
        teamId: "a",
        x: 0,
        y: 1,
        items: [START_100.id],
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: false,
          effect: "damage",
          damageType: "true",
          power: 2_000,
        },
      },
      {
        id: "lunger",
        teamId: "a",
        x: 6,
        y: 3,
        items: [START_90.id],
        stats: { attackIntervalMs: 100 },
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: true,
          effect: "damage",
          damageType: "true",
          power: 1,
          signatureMechanics: [{ kind: "lunge" }],
        },
      },
      {
        id: "phoenix",
        teamId: "b",
        x: 0,
        y: 0,
        items: ["phoenix-feather"],
      },
      {
        id: "survivor",
        teamId: "b",
        x: 1,
        y: 1,
        stats: { health: 10_000 },
      },
    ], { maxTicks: 2, extraItems: [START_100, START_90] });

    expect(events(result, "unit-displace")).toMatchObject([
      {
        tick: 2,
        unitId: "lunger",
        movementKind: "lunge",
        to: { x: 1, y: 0 },
      },
    ]);
    expect(unit(result, "phoenix")).toMatchObject({
      state: "resurrecting",
      x: 0,
      y: 0,
    });
  });

  it("does not let Knockback or Pull enter a resurrecting Phoenix cell", () => {
    const knockback = run([
      {
        id: "controller",
        teamId: "a",
        x: 0,
        y: 0,
        items: [START_90.id],
        stats: { attackIntervalMs: 100 },
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: true,
          effect: "damage",
          damageType: "true",
          power: 1,
          signatureMechanics: [{ kind: "knockback" }],
        },
      },
      {
        id: "killer",
        teamId: "a",
        x: 3,
        y: 0,
        items: [START_100.id],
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: false,
          effect: "damage",
          damageType: "true",
          power: 2_000,
        },
      },
      { id: "target", teamId: "b", x: 1, y: 0, stats: { health: 10_000 } },
      {
        id: "phoenix",
        teamId: "b",
        x: 2,
        y: 0,
        items: ["phoenix-feather"],
      },
    ], { maxTicks: 2, extraItems: [START_100, START_90] });
    expect(
      events(knockback, "unit-displace").filter(
        (event) => event.movementKind === "knockback",
      ),
    ).toEqual([]);
    expect(unit(knockback, "target")).toMatchObject({ x: 1, y: 0 });

    const pull = run([
      {
        id: "controller",
        teamId: "a",
        x: 4,
        y: 0,
        items: [START_90.id],
        stats: { attackIntervalMs: 100 },
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: true,
          effect: "damage",
          damageType: "true",
          power: 1,
          signatureMechanics: [{ kind: "pull" }],
        },
      },
      {
        id: "killer",
        teamId: "a",
        x: 3,
        y: 1,
        items: [START_100.id],
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: false,
          effect: "damage",
          damageType: "true",
          power: 2_000,
        },
      },
      { id: "target", teamId: "b", x: 2, y: 0, stats: { health: 10_000 } },
      {
        id: "phoenix",
        teamId: "b",
        x: 3,
        y: 0,
        items: ["phoenix-feather"],
      },
    ], { maxTicks: 2, extraItems: [START_100, START_90] });
    expect(
      events(pull, "unit-displace").filter(
        (event) => event.movementKind === "pull",
      ),
    ).toEqual([]);
    expect(unit(pull, "target")).toMatchObject({ x: 2, y: 0 });
  });

  it("does not let Smoke-Star Escape select a resurrecting Phoenix cell", () => {
    const combatants: Combatant[] = [];
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        if ((x === 0 && y === 0) || (x === 3 && y === 3)) continue;
        combatants.push({
          id: `blocker-${x}-${y}`,
          teamId: "a",
          x,
          y,
          stats: { range: 0 },
        });
      }
    }
    const killer = combatants.find(
      (candidate) => candidate.x === 3 && candidate.y === 2,
    );
    if (!killer) throw new Error("Missing Phoenix killer fixture.");
    killer.items = [START_100.id];
    killer.ability = {
      targeting: "nearest-enemy",
      requiresTarget: false,
      effect: "damage",
      damageType: "true",
      power: 2_000,
    };
    const damager = combatants.find(
      (candidate) => candidate.x === 0 && candidate.y === 1,
    );
    if (!damager) throw new Error("Missing Smoke-Star damager fixture.");
    damager.items = [START_90.id];
    damager.stats = { attack: 1, range: 10, attackIntervalMs: 100 };
    damager.ability = {
      targeting: "nearest-enemy",
      requiresTarget: true,
      effect: "damage",
      damageType: "true",
      power: 601,
    };
    combatants.push(
      {
        id: "holder",
        teamId: "b",
        x: 0,
        y: 0,
        items: ["smoke-star-escape"],
      },
      {
        id: "phoenix",
        teamId: "b",
        x: 3,
        y: 3,
        items: ["phoenix-feather"],
      },
    );

    const result = run(combatants, {
      maxTicks: 2,
      extraItems: [START_100, START_90],
    });
    expect(unit(result, "phoenix")).toMatchObject({
      state: "resurrecting",
      x: 3,
      y: 3,
    });
    expect(
      events(result, "unit-displace").filter(
        (event) => event.unitId === "holder" && event.movementKind === "escape",
      ),
    ).toEqual([]);
    expect(events(result, "shield")).toContainEqual(
      expect.objectContaining({ targetId: "holder", amount: 150 }),
    );
  });

  it("restores baseline stats and dynamic counters, then dies normally to a second lethal hit", () => {
    const result = run([
      { id: "killer", teamId: "a", x: 0, y: 0, stats: { attack: 2_000, attackIntervalMs: 2_200 } },
      { id: "phoenix", teamId: "b", x: 0, y: 1, items: ["phoenix-feather", "armament-wraps"], stats: { attack: 100 } },
    ], { maxTicks: 24 });
    expect(events(result, "unit-resurrect")).toHaveLength(1);
    expect(events(result, "death").filter((event) => event.unitId === "phoenix")).toHaveLength(1);
    expect(unit(result, "phoenix").state).toBe("dead");
  });

  it("resets damage-received stacks and denies stacking-Attack kill credit", () => {
    const reset = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, stats: { attack: 300, attackIntervalMs: 100 } },
      { id: "phoenix", teamId: "b", x: 0, y: 1, items: ["phoenix-feather", "armament-wraps"], stats: { attack: 100 } },
    ], { maxTicks: 24 });
    expect(events(reset, "unit-resurrect")).toHaveLength(1);
    expect(unit(reset, "phoenix").attack).toBe(100);

    const noCredit = run([
      { id: "killer", teamId: "a", x: 0, y: 0, stats: { attack: 2_000 } },
      { id: "phoenix", teamId: "b", x: 0, y: 1, items: ["phoenix-feather"] },
    ], { maxTicks: 2, teamAEffects: [{ kind: "stacking-attack-percent", value: 50 }, { kind: "critical-chance-percent", value: -100 }] });
    expect(unit(noCredit, "killer").attack).toBe(2_000);
    expect(events(noCredit, "buff")).toEqual([]);
  });

  it("keeps consumed Miracle behavior consumed across resurrection", () => {
    const result = run([
      { id: "killer", teamId: "a", x: 0, y: 0, stats: { attack: 5_000, attackIntervalMs: 1_700 } },
      { id: "phoenix", teamId: "b", x: 0, y: 1, items: ["miracle-talisman", "phoenix-feather"] },
    ], { maxTicks: 40 });
    expect(events(result, "status").filter((event) => event.status === "protect")).toHaveLength(1);
    expect(events(result, "unit-resurrect")).toHaveLength(1);
    expect(events(result, "death").filter((event) => event.unitId === "phoenix")).toHaveLength(1);
  });

  it("does not reroll Wonder items and reinitializes Mera self-Burn plus Gas Mask", () => {
    const result = run([
      { id: "killer", teamId: "a", x: 0, y: 0, stats: { attack: 5_000, attackIntervalMs: 60_000 } },
      { id: "stunner", teamId: "a", x: 1, y: 0, items: [START_90.id], stats: { attack: 1, attackIntervalMs: 100 }, ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, stunMs: 1_000 } },
      { id: "phoenix", teamId: "b", x: 0, y: 1, items: ["phoenix-feather", "mera-mera-ember", "gas-mask"] },
    ], { maxTicks: 24, extraItems: [START_90] });
    expect(events(result, "status").filter((event) => event.sourceId === "phoenix" && event.status === "burn").map((event) => event.tick)).toEqual([0, 21]);
    expect(events(result, "status").filter((event) => event.targetId === "phoenix" && event.status === "stun")).toEqual([]);
    expect(unit(result, "phoenix", true).items).toEqual(unit(result, "phoenix").items);
  });
});

describe("Mera, Bombardier, and Bodyguard ordering", () => {
  it("self-Burn bypasses Rune Protect, uses 5% Max HP, and Sea Prism Stone halves it", () => {
    const normal = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["mera-mera-ember", "gas-mask"], stats: { health: 1_000, specialDefense: 40 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { maxTicks: 11 });
    const reduced = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["mera-mera-ember", "gas-mask", "sea-prism-stone"], stats: { health: 1_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { maxTicks: 11 });
    expect(events(normal, "status").find((event) => event.status === "burn")).toMatchObject({ tick: 0, durationTicks: 3_000 });
    expect(damageFrom(normal, "holder").find((event) => event.damageKind === "burn")?.amount).toBe(35);
    expect(damageFrom(reduced, "holder").find((event) => event.damageKind === "burn")?.amount).toBe(17);
  });

  it("counts only runtime Shield and explodes once for half the gained amount", () => {
    const result = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["bombardier-band", "star-shield-dial", START_100.id] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { attack: 1_000, specialDefense: 100 } },
    ], { maxTicks: 2, extraItems: [START_100] });
    const explosion = damageFrom(result, "holder").find((event) => event.damageKind === "item");
    expect(explosion?.amount).toBe(12);
    expect(damageFrom(result, "holder").filter((event) => event.damageKind === "item")).toHaveLength(1);
  });

  it("consumes a zero-meter Bombardier trigger before later runtime Shield", () => {
    const result = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["bombardier-band", "smoke-star-escape"] },
      { id: "enemy", teamId: "b", x: 0, y: 1, stats: { attack: 500, attackIntervalMs: 100 } },
    ], { maxTicks: 2 });
    expect(damageFrom(result, "holder").filter((event) => event.damageKind === "item")).toEqual([]);
  });

  it("lets the deterministic adjacent Bodyguard take original raw lethal damage after target Shield", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 1, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "physical", power: 200 } },
      { id: "target", teamId: "b", x: 1, y: 1, items: [START_SHIELD_45.id], stats: { health: 100 } },
      { id: "cover-z", teamId: "b", x: 2, y: 1, items: ["bodyguard-band"] },
      { id: "cover-a", teamId: "b", x: 0, y: 1, items: ["bodyguard-band"] },
    ], { extraItems: [START_100, START_SHIELD_45] });
    expect(unit(result, "target")).toMatchObject({ hp: 100, shield: 0 });
    expect(damageFrom(result, "caster").find((event) => event.targetId === "target")).toMatchObject({ shieldDamage: 45, healthDamage: 0 });
    expect(damageFrom(result, "caster").find((event) => event.targetId === "cover-a")?.amount).toBe(178);
    expect(damageFrom(result, "caster").some((event) => event.targetId === "cover-z")).toBe(false);
  });

  it("does not cover a Bodyguard holder and resolves Miracle before Cover before Phoenix", () => {
    const selfCover = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 2_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["bodyguard-band"] },
      { id: "other-cover", teamId: "b", x: 1, y: 1, items: ["bodyguard-band"] },
    ], { extraItems: [START_100] });
    expect(unit(selfCover, "target").state).toBe("dead");

    const priority = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 2_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["miracle-talisman", "phoenix-feather"] },
      { id: "cover", teamId: "b", x: 1, y: 1, items: ["bodyguard-band"] },
    ], { extraItems: [START_100] });
    expect(events(priority, "status").filter((event) => event.status === "protect")).toHaveLength(1);
    expect(events(priority, "unit-resurrect")).toEqual([]);
    expect(damageFrom(priority, "caster").some((event) => event.targetId === "cover")).toBe(false);
  });

  it("uses Bodyguard before Phoenix and resurrects only after the cover is gone", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "true", power: 2_000 } },
      { id: "attacker", teamId: "a", x: 0, y: 2, stats: { attack: 2_000, attackIntervalMs: 60_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["phoenix-feather"] },
      { id: "cover", teamId: "b", x: 1, y: 1, items: ["bodyguard-band"] },
    ], { maxTicks: 21, extraItems: [START_100] });
    expect(events(result, "death").find((event) => event.unitId === "cover")?.tick).toBe(1);
    expect(events(result, "unit-resurrect")).toMatchObject([{ tick: 21, unitId: "target" }]);
    expect(events(result, "death").filter((event) => event.unitId === "target")).toEqual([]);
  });
});

describe("Nullification and Efficient Bandannas", () => {
  it("prevents casts and spends current Energy as dodge-proof primary Special damage before +10 Energy", () => {
    const result = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["nullification-bandanna", START_70.id, "flame-flame-grimoire"], stats: { attack: 100 }, ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [fixtureItem("unused").id], stats: { health: 10_000, specialDefense: 0 } },
    ], { extraItems: [START_70, fixtureItem("unused", [{ kind: "dodge-percent", value: 100 }])] });
    expect(events(result, "cast")).toEqual([]);
    expect(events(result, "dodge")).toHaveLength(1);
    expect(damageFrom(result, "holder").map((event) => event.amount)).toContain(70);
    expect(events(result, "status").some((event) => event.status === "burn" && event.sourceId === "holder")).toBe(true);
    expect(events(result, "energy").filter((event) => event.unitId === "holder").slice(0, 2).map((event) => event.amount)).toEqual([-70, 10]);
  });

  it("converts static item, trait, and amplified dynamic AP into local-scale Attack once", () => {
    const staticResult = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["nullification-bandanna", "devil-fruit-essence"], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { teamAEffects: [{ kind: "ability-power-percent", value: 10 }, { kind: "critical-chance-percent", value: -100 }] });
    expect(unit(staticResult, "holder", true).attack).toBe(112);

    const dynamic = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["nullification-bandanna", "banquet-belt", "clima-tact"], stats: { attack: 100, attackIntervalMs: 1_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { maxTicks: 11 });
    expect(unit(dynamic, "holder").attack).toBe(104);
  });

  it("keeps Red Orb conversion away from stored Special damage and lets Loaded Dice copy it", () => {
    const redOrb = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["nullification-bandanna", START_70.id, "advanced-armament-orb"], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000, specialDefense: 1_000 } },
    ], { extraItems: [START_70] });
    expect(damageFrom(redOrb, "holder").map((event) => event.amount)).toEqual([97, 6, 33]);

    const seed = findSeed(([bounce]) => bounce < 0.5, 1);
    const noCrit = fixtureItem("p4b7-no-crit", [{ kind: "critical-chance-percent", value: -100 }]);
    const loaded = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["nullification-bandanna", START_70.id, "ricochet-dial", noCrit.id], stats: { attack: 100 } },
      { id: "primary", teamId: "b", x: 0, y: 1, stats: { health: 10_000, range: 0 } },
      { id: "bounce", teamId: "b", x: 1, y: 1, stats: { health: 10_000, range: 0 } },
    ], { seed, extraItems: [START_70, noCrit] });
    expect(damageFrom(loaded, "holder").filter((event) => event.targetId === "bounce").map((event) => event.amount)).toEqual([75, 53]);
  });

  it("applies horizontal Max Energy support, deterministic overlap, clamping, and cast threshold", () => {
    const result = run([
      { id: "left", teamId: "a", x: 0, y: 0, items: ["efficient-bandanna"] },
      { id: "holder", teamId: "a", x: 1, y: 0, items: ["efficient-bandanna", START_100.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1 } },
      { id: "vertical", teamId: "a", x: 1, y: 1 },
      { id: "target", teamId: "b", x: 1, y: 2 },
    ], { extraItems: [START_100] });
    expect(unit(result, "left", true)).toMatchObject({ maxEnergy: 72, energy: 15, shield: 45 });
    expect(unit(result, "holder", true)).toMatchObject({ maxEnergy: 72, energy: 72 });
    expect(unit(result, "vertical", true).maxEnergy).toBe(100);
    expect(events(result, "cast").some((event) => event.sourceId === "holder")).toBe(true);
  });

  it("caps post-cast and item Energy gains at the reduced Max Energy", () => {
    const burst = fixtureItem(
      "p4b7-energy-burst",
      [],
      [{ kind: "on-ability-cast-energy", baseEnergy: 200, perCastEnergy: 0, maxEnergy: 200 }],
    );
    const result = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["efficient-bandanna", START_70.id, burst.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000, range: 0 } },
    ], { extraItems: [START_70, burst] });
    expect(events(result, "cast")).toHaveLength(1);
    expect(events(result, "energy").filter((event) => event.unitId === "holder").at(-1)?.value).toBe(85);
    expect(unit(result, "holder").energy).toBe(85);
  });
});

describe("P4B7 compatibility contracts", () => {
  it("preserves acquisition, Gear 4, schema-6 saves, version, and deterministic battle output", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual(ACQUISITION_IDS);
    const formFor = (itemId: string) => {
      const luffy: UnitInstance = {
        id: "luffy",
        definitionId: "luffy",
        star: 3,
        items: [itemId],
        acquiredOrder: 1,
      };
      reconcileProductionFormProgression(luffy);
      return luffy.formId;
    };
    expect(formFor("armament-wraps")).toBe("luffy-gear-4-boundman");
    expect(formFor("sniper-goggles")).toBe("luffy-gear-4-snakeman");

    const state = createMatch("p4b7-save");
    state.players[0].inventory = [...P4B7_IDS];
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored.players[0].inventory).toEqual([...P4B7_IDS]);
    expect(DEFAULT_CONTENT.version).toBe("1.28.0");
    expect(restored.contentVersion).toBe("1.28.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);

    const battle = () => run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["mystery-treasure-chest"] },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { seed: "p4b7-equality", maxTicks: 20 });
    expect(battle()).toEqual(battle());
  });
});
