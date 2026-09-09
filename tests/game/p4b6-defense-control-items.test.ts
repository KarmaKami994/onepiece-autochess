import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  advanceMatchPhase,
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
  type MatchBattleResult,
  type TraitEffect,
  type UnitDefinition,
  type UnitInstance,
  type UnitStats,
} from "../../game";

const P4B6_IDS = [
  "barrier-bubble",
  "rush-flag",
  "sea-prism-boots",
  "observation-goggles",
  "gas-mask",
  "armor-piercing-scope",
  "impact-proof-gauntlets",
  "iron-pirate-helm",
  "sea-prism-stone",
  "guard-point-dummy",
  "reflect-dial",
  "spiked-armament",
] as const;

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
    description: "P4B6 fixture item.",
    icon: "fixture",
    kind: "completed",
    effects,
    behaviors,
  };
}

const START_ENERGY = fixtureItem("start-energy", [
  { kind: "starting-energy", value: 100 },
]);
const START_ENERGY_90 = fixtureItem("start-energy-90", [
  { kind: "starting-energy", value: 90 },
]);
const NO_CRIT = fixtureItem("no-crit", [
  { kind: "critical-chance-percent", value: -100 },
]);
const FORCE_CRIT = fixtureItem("force-crit", [
  { kind: "critical-chance-percent", value: 90 },
]);
const FORCE_DODGE = fixtureItem("force-dodge", [
  { kind: "dodge-percent", value: 100 },
]);

function stats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 2_000,
    attack: 100,
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
    description: "P4B6 fixture ability.",
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
          star: 1,
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
    team("a", options.teamAEffects ?? []),
    team("b", options.teamBEffects ?? []),
    { seed: options.seed ?? "p4b6", maxTicks: options.maxTicks ?? 1 },
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
  if (!found) throw new Error(`Missing unit ${id}.`);
  return found;
}

function damageFrom(result: BattleResult, sourceId: string) {
  return events(result, "damage").filter((event) => event.sourceId === sourceId);
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

describe("P4B6 content", () => {
  it("defines exactly the twelve approved static and behavior identities", () => {
    expect(productionItem("barrier-bubble")).toMatchObject({
      effects: [{ kind: "ability-power-percent", value: 10 }],
      behaviors: [{ kind: "start-horizontal-shield-rune-protect", shieldMaxHealthPercent: 20, runeProtectMs: 5_000 }],
    });
    expect(productionItem("rush-flag")).toMatchObject({
      effects: [], behaviors: [{ kind: "start-horizontal-attack-speed", attackSpeedPercent: 20 }],
    });
    expect(productionItem("sea-prism-boots")).toMatchObject({
      effects: [{ kind: "ability-power-percent", value: 50 }, { kind: "defense-flat", value: 12 }],
      behaviors: [{ kind: "forced-movement-immunity" }],
    });
    expect(productionItem("observation-goggles")).toMatchObject({
      effects: [{ kind: "attack-speed-percent", value: 50 }],
      behaviors: [{ kind: "basic-attacks-cannot-miss" }],
    });
    expect(productionItem("gas-mask")).toMatchObject({
      effects: [{ kind: "critical-chance-percent", value: 10 }, { kind: "defense-flat", value: 3 }],
      behaviors: [{ kind: "starting-rune-protect", durationMs: 60_000 }],
    });
    expect(productionItem("armor-piercing-scope")).toMatchObject({
      effects: [{ kind: "attack-speed-percent", value: 10 }, { kind: "critical-chance-percent", value: 10 }, { kind: "critical-power-percent", value: 50 }],
      behaviors: [{ kind: "on-basic-attack-resistance-reduction", durationMs: 2_000 }],
    });
    expect(productionItem("impact-proof-gauntlets")).toMatchObject({
      effects: [{ kind: "shield-flat", value: 180 }, { kind: "attack-flat", value: 18 }],
      behaviors: [{ kind: "shield-damage-multiplier", multiplierPercent: 200, suppressRetaliation: true }],
    });
    expect(productionItem("iron-pirate-helm")).toMatchObject({
      effects: [{ kind: "defense-flat", value: 25 }],
      behaviors: [{ kind: "incoming-critical-bonus-negation" }],
    });
    expect(productionItem("sea-prism-stone")).toEqual(expect.objectContaining({
      effects: [{ kind: "special-defense-flat", value: 40 }],
      behaviors: [{ kind: "burn-damage-reduction-percent", percent: 50 }],
    }));
    expect(productionItem("guard-point-dummy")).toMatchObject({
      effects: [{ kind: "defense-flat", value: 3 }, { kind: "special-defense-flat", value: 3 }],
      behaviors: [{ kind: "incoming-nontrue-damage-reduction-percent", percent: 30, basicAttackTargetPriority: true }],
    });
    expect(productionItem("reflect-dial")).toMatchObject({
      effects: [{ kind: "special-defense-flat", value: 10 }, { kind: "ability-power-percent", value: 10 }],
      behaviors: [{ kind: "reflect-special-resistance-blocked" }],
    });
    expect(productionItem("spiked-armament")).toMatchObject({
      effects: [{ kind: "defense-flat", value: 6 }, { kind: "health-flat", value: 45 }],
      behaviors: [{ kind: "on-basic-attack-received-retaliate-wound", woundMs: 3_000 }],
    });

    const kinds = new Set(
      P4B6_IDS.flatMap((id) => productionItem(id).behaviors?.map((entry) => entry.kind) ?? []),
    );
    expect(
      DEFAULT_CONTENT.items
        .filter((item) => !P4B6_IDS.includes(item.id as (typeof P4B6_IDS)[number]))
        .some((item) => item.behaviors?.some((entry) => kinds.has(entry.kind))),
    ).toBe(false);
  });
});

describe("P4B6 start support", () => {
  it("applies Barrier Bubble only to holder and horizontal allies using final Max HP", () => {
    const health = fixtureItem("health", [{ kind: "health-flat", value: 45 }]);
    const result = run([
      { id: "bubble", teamId: "a", x: 1, y: 1, items: ["barrier-bubble"] },
      { id: "left", teamId: "a", x: 0, y: 1, items: [health.id] },
      { id: "right", teamId: "a", x: 2, y: 1 },
      { id: "vertical", teamId: "a", x: 1, y: 2 },
      { id: "far", teamId: "a", x: 3, y: 1 },
      { id: "enemy", teamId: "b", x: 0, y: 1 },
    ], { extraItems: [health], teamAEffects: [{ kind: "max-health-percent", value: 10 }] });
    expect(unit(result, "left", true)).toMatchObject({ maxHp: 2_249, shield: 450 });
    expect(unit(result, "bubble", true).shield).toBe(440);
    expect(unit(result, "right", true).shield).toBe(440);
    expect(unit(result, "vertical", true).shield).toBe(0);
    expect(unit(result, "far", true).shield).toBe(0);
    expect(unit(result, "enemy", true).shield).toBe(0);
  });

  it("stacks Bubble shields, takes maximum Rune expiry, and blocks immediate Razor", () => {
    const result = run([
      { id: "razor", teamId: "a", x: 1, y: 0, items: ["armor-piercing-scope", NO_CRIT.id] },
      { id: "left-bubble", teamId: "b", x: 0, y: 0, items: ["barrier-bubble"] },
      { id: "protected", teamId: "b", x: 1, y: 0 },
      { id: "right-bubble", teamId: "b", x: 2, y: 0, items: ["barrier-bubble"] },
    ], { extraItems: [NO_CRIT] });
    expect(unit(result, "protected", true).shield).toBe(800);
    expect(events(result, "status").filter((event) => event.status === "resistance-reduction")).toEqual([]);
  });

  it("is deterministic and independent of support item-array order", () => {
    const combatants = (items: string[]): Combatant[] => [
      { id: "support", teamId: "a", x: 0, y: 0, items },
      { id: "ally", teamId: "a", x: 1, y: 0 },
      { id: "enemy", teamId: "b", x: 0, y: 1 },
    ];
    const left = run(combatants(["barrier-bubble", "rush-flag"]), { seed: "support-order" });
    const right = run(combatants(["rush-flag", "barrier-bubble"]), { seed: "support-order" });
    const normalizeItems = (result: BattleResult) => ({
      ...result,
      initialUnits: result.initialUnits.map((entry) => ({ ...entry, items: [...(entry.items ?? [])].sort() })),
      finalUnits: result.finalUnits.map((entry) => ({ ...entry, items: [...(entry.items ?? [])].sort() })),
    });
    expect(normalizeItems(left)).toEqual(normalizeItems(right));
  });

  it("expires Barrier Bubble Rune Protect after exactly five seconds", () => {
    const result = run([
      { id: "stunner", teamId: "a", x: 0, y: 0, stats: { attack: 1, attackIntervalMs: 500 }, ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, stunMs: 100 } },
      { id: "bubble", teamId: "b", x: 0, y: 2, items: ["barrier-bubble"] },
    ], { maxTicks: 51, extraItems: [NO_CRIT], teamAEffects: [{ kind: "critical-chance-percent", value: -100 }] });
    expect(events(result, "status").filter((event) => event.status === "stun")).toMatchObject([{ tick: 51, durationTicks: 1 }]);
  });

  it("adds Rush Flags and keeps dynamic Speed anchored to the supported baseline", () => {
    const oneFlag = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["rush-flag", "cola-engine", NO_CRIT.id], stats: { attackIntervalMs: 10_000, attack: 1 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 20_000 } },
    ], { maxTicks: 100, extraItems: [NO_CRIT] });
    expect(events(oneFlag, "attack").filter((event) => event.sourceId === "attacker").map((event) => event.tick).slice(0, 2)).toEqual([1, 73]);

    const twoFlags = run([
      { id: "left", teamId: "a", x: 0, y: 0, items: ["rush-flag"] },
      { id: "attacker", teamId: "a", x: 1, y: 0, items: ["cola-engine", NO_CRIT.id], stats: { attackIntervalMs: 10_000, attack: 1 } },
      { id: "right", teamId: "a", x: 2, y: 0, items: ["rush-flag"] },
      { id: "target", teamId: "b", x: 1, y: 1, stats: { health: 20_000 } },
    ], { maxTicks: 100, extraItems: [NO_CRIT] });
    expect(events(twoFlags, "attack").filter((event) => event.sourceId === "attacker").map((event) => event.tick).slice(0, 2)).toEqual([1, 63]);
  });
});

describe("P4B6 immunity and timed status primitives", () => {
  it.each(["knockback", "pull"] as const)("Sea-Prism Boots block enemy %s", (kind) => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, signatureMechanics: [{ kind }] } },
      { id: "boots", teamId: "b", x: 2, y: 0, items: ["sea-prism-boots"] },
    ], { extraItems: [START_ENERGY] });
    expect(events(result, "unit-displace")).toEqual([]);
  });

  it("does not block the holder's own Lunge", () => {
    const result = run([
      { id: "boots", teamId: "a", x: 0, y: 5, items: ["sea-prism-boots", START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, signatureMechanics: [{ kind: "lunge" }] } },
      { id: "target", teamId: "b", x: 0, y: 0 },
    ], { extraItems: [START_ENERGY] });
    expect(events(result, "unit-displace")).toMatchObject([{ unitId: "boots", movementKind: "lunge" }]);
  });

  it("Observation Goggles preserve the dodge roll then force the attack to hit", () => {
    let seed = "";
    for (let index = 0; index < 10_000; index += 1) {
      const candidate = `xray-${index}`;
      const first = nextRandom(hashSeed(candidate));
      const second = nextRandom(first.state);
      if (first.value < 0.5 && second.value < 0.5) {
        seed = candidate;
        break;
      }
    }
    expect(seed).not.toBe("");
    const dodge50 = fixtureItem("dodge-50", [{ kind: "dodge-percent", value: 50 }]);
    const crit40 = fixtureItem("crit-40", [{ kind: "critical-chance-percent", value: 40 }]);
    const result = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["observation-goggles", crit40.id] },
      { id: "target", teamId: "b", x: 0, y: 1, items: [dodge50.id] },
    ], { seed, extraItems: [dodge50, crit40] });
    expect(events(result, "dodge")).toEqual([]);
    expect(events(result, "attack")[0]).toMatchObject({ critical: true });
  });

  it("Gas Mask blocks Stun and Burn and represents exactly sixty seconds", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY_90.id], stats: { attack: 1, attackIntervalMs: 59_900 }, ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, stunMs: 100, burnPower: 10, burnDurationMs: 1_000 } },
      { id: "masked", teamId: "b", x: 0, y: 1, items: ["gas-mask"], stats: { health: 20_000 } },
    ], { maxTicks: 600, extraItems: [START_ENERGY_90], teamAEffects: [{ kind: "critical-chance-percent", value: -100 }] });
    const statuses = events(result, "status").filter((event) => event.status === "stun" || event.status === "burn");
    expect(statuses[0]?.tick).toBe(600);
    expect(statuses.filter((event) => event.tick < 600)).toEqual([]);
  });
});

describe("P4B6 Razor, mitigation, and critical ordering", () => {
  it("applies Razor before the same hit to both resistances while True is unaffected", () => {
    const chain = fixtureItem("special-chain", [], [{ kind: "every-n-basic-attacks-chain", every: 1, targets: 1, specialDamage: 100, energyDrain: 0 }]);
    const trueSplit = fixtureItem("true-split", [], [{ kind: "basic-attack-true-damage-percent", percent: 25 }]);
    const result = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["armor-piercing-scope", chain.id, trueSplit.id, NO_CRIT.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { defense: 100, specialDefense: 100 } },
    ], { extraItems: [chain, trueSplit, NO_CRIT] });
    expect(damageFrom(result, "attacker").map((event) => event.amount)).toEqual([50, 25, 66]);
    expect(events(result, "status").find((event) => event.status === "resistance-reduction")).toMatchObject({ durationTicks: 20 });
  });

  it("does not apply Razor on dodge or through Rune Protect", () => {
    const dodged = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["armor-piercing-scope"] },
      { id: "target", teamId: "b", x: 0, y: 1, items: [FORCE_DODGE.id] },
    ], { extraItems: [FORCE_DODGE] });
    const protectedResult = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["armor-piercing-scope", NO_CRIT.id] },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["gas-mask"] },
    ], { extraItems: [NO_CRIT] });
    expect(events(dodged, "status").filter((event) => event.status === "resistance-reduction")).toEqual([]);
    expect(events(protectedResult, "status").filter((event) => event.status === "resistance-reduction")).toEqual([]);
  });

  it("restores full resistance when Razor expires", () => {
    const chain = fixtureItem("special-chain", [], [{ kind: "every-n-basic-attacks-chain", every: 1, targets: 1, specialDamage: 1, energyDrain: 0 }]);
    const result = run([
      { id: "burner", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, burnPower: 100, burnDurationMs: 3_000 } },
      { id: "razor", teamId: "a", x: 1, y: 0, items: ["armor-piercing-scope", chain.id, NO_CRIT.id] },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 20_000, defense: 100, specialDefense: 100 } },
    ], { maxTicks: 21, extraItems: [START_ENERGY, chain, NO_CRIT] });
    expect(events(result, "damage").filter((event) => event.damageKind === "burn").map((event) => event.amount)).toEqual([66, 50]);
  });

  it("Iron Pirate Helm preserves Crit identity but negates basic bonus and scales Armament Sash from reduced raw damage", () => {
    const normal = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [FORCE_CRIT.id, "armament-sash"], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { extraItems: [FORCE_CRIT] });
    const helmet = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [FORCE_CRIT.id, "armament-sash"], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["iron-pirate-helm"] },
    ], { extraItems: [FORCE_CRIT] });
    expect(events(helmet, "attack")[0].critical).toBe(true);
    expect(damageFrom(normal, "attacker")[0].amount).toBe(200);
    expect(damageFrom(helmet, "attacker")[0].amount).toBe(80);
    expect(events(helmet, "shield")).toMatchObject([{ sourceId: "attacker", amount: 33 }]);
  });

  it("applies one shared Ability Crit but suppresses its bonus only for Helmet targets", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id, FORCE_CRIT.id], ability: { targeting: "nearest-enemy", pattern: "all-enemies", requiresTarget: false, effect: "damage", power: 100, canCritByDefault: true } },
      { id: "helmet", teamId: "b", x: 0, y: 1, items: ["iron-pirate-helm"], stats: { defense: 0 } },
      { id: "normal", teamId: "b", x: 1, y: 1 },
    ], { extraItems: [START_ENERGY, FORCE_CRIT] });
    expect(damageFrom(result, "caster").map((event) => [event.targetId, event.amount])).toEqual([["helmet", 100], ["normal", 200]]);
  });

  it("switches sequential Crit weighting off after retargeting from a normal target to Iron Pirate Helm", () => {
    const result = run([
      {
        id: "caster",
        teamId: "a",
        x: 0,
        y: 0,
        items: [START_ENERGY.id, FORCE_CRIT.id],
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: true,
          effect: "damage",
          power: 100,
          canCritByDefault: true,
          sequentialStrike: {
            hitWeightsBasisPoints: [5_000, 5_000],
            retargetOnKill: "nearest-in-range",
          },
        },
      },
      { id: "normal", teamId: "b", x: 0, y: 1, stats: { health: 100 } },
      { id: "helmet", teamId: "b", x: 1, y: 1, items: ["iron-pirate-helm"] },
    ], { extraItems: [START_ENERGY, FORCE_CRIT] });

    expect(damageFrom(result, "caster").map((event) => [event.targetId, event.amount])).toEqual([
      ["normal", 100],
      ["helmet", 50],
    ]);
  });

  it("switches sequential Crit weighting on after retargeting from Iron Pirate Helm to a normal target", () => {
    const result = run([
      {
        id: "caster",
        teamId: "a",
        x: 0,
        y: 0,
        items: [START_ENERGY.id, FORCE_CRIT.id],
        ability: {
          targeting: "nearest-enemy",
          requiresTarget: true,
          effect: "damage",
          power: 100,
          canCritByDefault: true,
          sequentialStrike: {
            hitWeightsBasisPoints: [5_000, 5_000],
            retargetOnKill: "nearest-in-range",
          },
        },
      },
      { id: "helmet", teamId: "b", x: 0, y: 1, items: ["iron-pirate-helm"], stats: { health: 50 } },
      { id: "normal", teamId: "b", x: 1, y: 1 },
    ], { extraItems: [START_ENERGY, FORCE_CRIT] });

    expect(damageFrom(result, "caster").map((event) => [event.targetId, event.amount])).toEqual([
      ["helmet", 50],
      ["normal", 100],
    ]);
  });
});

describe("P4B6 shield and non-True damage ordering", () => {
  it("Protective Pads double Physical damage entering Shield and preserve overflow", () => {
    const shield = fixtureItem("shield-50", [{ kind: "shield-flat", value: 50 }]);
    const withShield = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["impact-proof-gauntlets", NO_CRIT.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [shield.id] },
    ], { extraItems: [shield, NO_CRIT] });
    const withoutShield = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["impact-proof-gauntlets", NO_CRIT.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { extraItems: [NO_CRIT] });
    expect(damageFrom(withShield, "attacker")[0]).toMatchObject({ amount: 236, shieldDamage: 50, healthDamage: 186 });
    expect(damageFrom(withoutShield, "attacker")[0].amount).toBe(118);
  });

  it.each(["special", "true"] as const)("Protective Pads double %s damage against Shield", (damageType) => {
    const shield = fixtureItem("shield-50", [{ kind: "shield-flat", value: 50 }]);
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: ["impact-proof-gauntlets", START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType, power: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [shield.id] },
    ], { extraItems: [shield, START_ENERGY] });
    expect(damageFrom(result, "caster")[0]).toMatchObject({ amount: 200, shieldDamage: 50, healthDamage: 150 });
  });

  it("Poke Doll reduces post-resistance Physical and Special damage but not True", () => {
    const results = (["physical", "special", "true"] as const).map((damageType) => run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType, power: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["guard-point-dummy"], stats: { defense: 100, specialDefense: 100 } },
    ], { extraItems: [START_ENERGY] }));
    expect(results.map((result) => damageFrom(result, "caster")[0].amount)).toEqual([34, 34, 100]);
  });

  it("applies Poke Doll reduction before Protective Pads doubles Shield damage", () => {
    const shield = fixtureItem("shield-50", [{ kind: "shield-flat", value: 50 }]);
    const result = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["impact-proof-gauntlets", NO_CRIT.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: ["guard-point-dummy", shield.id] },
    ], { extraItems: [shield, NO_CRIT] });
    expect(damageFrom(result, "attacker")[0]).toMatchObject({ amount: 158, shieldDamage: 50, healthDamage: 108 });
  });

  it("Poke Doll wins only an identical-nearest basic tie and does not affect Ability targeting", () => {
    const basic = run([
      { id: "attacker", teamId: "a", x: 1, y: 1, items: [NO_CRIT.id] },
      { id: "a-normal", teamId: "b", x: 0, y: 1 },
      { id: "z-doll", teamId: "b", x: 2, y: 1, items: ["guard-point-dummy"] },
    ], { extraItems: [NO_CRIT] });
    const farther = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [NO_CRIT.id] },
      { id: "a-normal", teamId: "b", x: 0, y: 1 },
      { id: "z-doll", teamId: "b", x: 0, y: 2, items: ["guard-point-dummy"] },
    ], { extraItems: [NO_CRIT] });
    const cast = run([
      { id: "caster", teamId: "a", x: 1, y: 1, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1 } },
      { id: "a-normal", teamId: "b", x: 0, y: 1 },
      { id: "z-doll", teamId: "b", x: 2, y: 1, items: ["guard-point-dummy"] },
    ], { extraItems: [START_ENERGY] });
    expect(events(basic, "attack").find((event) => event.sourceId === "attacker")?.targetId).toBe("z-doll");
    expect(events(farther, "attack").find((event) => event.sourceId === "attacker")?.targetId).toBe("a-normal");
    expect(events(cast, "cast")[0].targetIds).toEqual(["a-normal"]);
  });
});

describe("P4B6 Burn and retaliation", () => {
  it("Sea Prism Stone halves Burn raw damage before Special mitigation", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, burnPower: 100, burnDurationMs: 1_000 } },
      { id: "vest", teamId: "b", x: 0, y: 1, items: ["sea-prism-stone"], stats: { specialDefense: 60 } },
    ], { maxTicks: 11, extraItems: [START_ENERGY] });
    expect(events(result, "damage").find((event) => event.damageKind === "burn")?.amount).toBe(25);
  });

  it("Power Lens reflects only resistance-blocked Special damage before Doll and Shield", () => {
    const shield = fixtureItem("shield-100", [{ kind: "shield-flat", value: 100 }]);
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "special", power: 110 } },
      { id: "lens", teamId: "b", x: 0, y: 1, items: ["reflect-dial", "guard-point-dummy", shield.id], stats: { specialDefense: 90 } },
    ], { extraItems: [START_ENERGY, shield] });
    expect(damageFrom(result, "caster")[0]).toMatchObject({ amount: 37, shieldDamage: 37 });
    expect(damageFrom(result, "lens")[0]).toMatchObject({ amount: 56, healthDamage: 56 });
  });

  it("Razor lowers Lens reflection; Physical, True, Burn, Pads, and retaliation do not reflect", () => {
    const chain = fixtureItem("special-chain", [], [{ kind: "every-n-basic-attacks-chain", every: 1, targets: 1, specialDamage: 100, energyDrain: 0 }]);
    const razor = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["armor-piercing-scope", chain.id, NO_CRIT.id] },
      { id: "lens", teamId: "b", x: 0, y: 1, items: ["reflect-dial"], stats: { specialDefense: 90 } },
    ], { extraItems: [chain, NO_CRIT] });
    expect(damageFrom(razor, "lens")[0].amount).toBe(34);

    for (const damageType of ["physical", "true"] as const) {
      const result = run([
        { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType, power: 100 } },
        { id: "lens", teamId: "b", x: 0, y: 1, items: ["reflect-dial"] },
      ], { extraItems: [START_ENERGY] });
      expect(damageFrom(result, "lens").filter((event) => event.damageKind === "item")).toEqual([]);
    }

    const pads = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: ["impact-proof-gauntlets", START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "special", power: 100 } },
      { id: "lens", teamId: "b", x: 0, y: 1, items: ["reflect-dial"] },
    ], { extraItems: [START_ENERGY] });
    expect(damageFrom(pads, "lens").filter((event) => event.damageKind === "item")).toEqual([]);

    const burn = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 1, burnPower: 100, burnDurationMs: 1_000 } },
      { id: "lens", teamId: "b", x: 0, y: 1, items: ["reflect-dial"] },
    ], { maxTicks: 11, extraItems: [START_ENERGY] });
    expect(damageFrom(burn, "lens").filter((event) => event.damageKind === "item")).toEqual([]);
  });

  it("prevents Power Lens loops while reflected damage still drives Armament Wraps", () => {
    const result = run([
      { id: "caster", teamId: "a", x: 0, y: 0, items: [START_ENERGY.id, "reflect-dial", "armament-wraps"], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", damageType: "special", power: 100, hits: 2 } },
      { id: "lens", teamId: "b", x: 0, y: 1, items: ["reflect-dial"] },
    ], { extraItems: [START_ENERGY] });
    expect(damageFrom(result, "lens").filter((event) => event.damageKind === "item")).toHaveLength(2);
    expect(damageFrom(result, "caster").filter((event) => event.damageKind === "item")).toEqual([]);
    expect(unit(result, "caster").attack).toBe(103);
  });

  it("Sticky Barb retaliates on adjacent hit or dodge with the exact formula and Wound", () => {
    const hit = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [NO_CRIT.id] },
      { id: "barb", teamId: "b", x: 1, y: 1, items: ["spiked-armament"], stats: { defense: 100 } },
    ], { extraItems: [NO_CRIT] });
    const dodge = run([
      { id: "attacker", teamId: "a", x: 0, y: 0 },
      { id: "barb", teamId: "b", x: 1, y: 1, items: ["spiked-armament", FORCE_DODGE.id], stats: { defense: 100 } },
    ], { extraItems: [FORCE_DODGE] });
    expect(damageFrom(hit, "barb")[0].amount).toBe(57);
    expect(events(hit, "status").find((event) => event.status === "wound")).toMatchObject({ durationTicks: 30 });
    expect(events(dodge, "dodge")).toHaveLength(1);
    expect(damageFrom(dodge, "barb")[0].amount).toBe(57);
  });

  it("does not retaliate at range and still retaliates after a lethal incoming attack", () => {
    const ranged = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [NO_CRIT.id] },
      { id: "barb", teamId: "b", x: 0, y: 2, items: ["spiked-armament"] },
    ], { extraItems: [NO_CRIT] });
    const lethal = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [NO_CRIT.id], stats: { attack: 10_000 } },
      { id: "barb", teamId: "b", x: 0, y: 1, items: ["spiked-armament"], stats: { health: 1 } },
    ], { extraItems: [NO_CRIT] });
    expect(damageFrom(ranged, "barb").filter((event) => event.damageKind === "item")).toEqual([]);
    expect(damageFrom(lethal, "barb").filter((event) => event.damageKind === "item")).toHaveLength(1);
  });

  it("Rune Protect blocks Sticky Wound but not True retaliation; Pads block both", () => {
    const protectedResult = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["gas-mask", NO_CRIT.id] },
      { id: "barb", teamId: "b", x: 0, y: 1, items: ["spiked-armament"], stats: { defense: 100, range: 0 } },
    ], { extraItems: [NO_CRIT] });
    const pads = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["impact-proof-gauntlets", NO_CRIT.id] },
      { id: "barb", teamId: "b", x: 0, y: 1, items: ["spiked-armament"] },
    ], { extraItems: [NO_CRIT] });
    expect(damageFrom(protectedResult, "barb").filter((event) => event.damageKind === "item")).toHaveLength(1);
    expect(events(protectedResult, "status").filter((event) => event.status === "wound")).toEqual([]);
    expect(damageFrom(pads, "barb").filter((event) => event.damageKind === "item")).toEqual([]);
    expect(events(pads, "status").filter((event) => event.status === "wound")).toEqual([]);
  });

  it("Wound makes Healing Bubble produce neither healing nor overheal Energy", () => {
    const result = run([
      { id: "healer", teamId: "a", x: 0, y: 0, items: ["healing-bubble", NO_CRIT.id], stats: { attack: 1 } },
      { id: "barb", teamId: "b", x: 0, y: 1, items: ["spiked-armament"] },
    ], { maxTicks: 20, extraItems: [NO_CRIT] });
    expect(events(result, "status").some((event) => event.status === "wound")).toBe(true);
    expect(events(result, "heal").filter((event) => event.sourceId === "healer")).toEqual([]);
    expect(events(result, "energy").filter((event) => event.unitId === "healer" && event.reason === "item")).toEqual([]);
  });

  it("blocks the normal heal authority while Wound is active", () => {
    const result = run([
      { id: "healer", teamId: "a", x: 0, y: 0, items: [START_ENERGY_90.id, NO_CRIT.id], stats: { attack: 1, attackIntervalMs: 1_000 }, ability: { effect: "heal", targeting: "self", pattern: "single", requiresTarget: false, power: 100 } },
      { id: "barb", teamId: "b", x: 0, y: 1, items: ["spiked-armament"], stats: { defense: 100, range: 0 } },
    ], { maxTicks: 11, extraItems: [START_ENERGY_90, NO_CRIT] });
    expect(events(result, "cast").filter((event) => event.sourceId === "healer").map((event) => event.tick)).toEqual([11]);
    expect(events(result, "heal").filter((event) => event.sourceId === "healer")).toEqual([]);
  });
});

describe("P4B6 contracts", () => {
  it("preserves acquisition, catalog, recipes, Gear 4 IDs, schema saves, version, and determinism", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual([
      "jolly-roger-fragment", "devil-fruit-essence", "cola-canister",
      "jet-dial", "sniper-lens", "sea-king-meat", "sea-prism-shard",
      "black-blade-shard", "armament-plate", "captains-sash",
    ]);
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
    expect(Object.keys(DEFAULT_CONTENT.itemRecipes)).toHaveLength(55);
    expect(winningPvEReward("p4a-reward-1")).toEqual(["jet-dial", "sniper-lens", "devil-fruit-essence"]);
    expect(carouselItems("p4a-carousel-1")).toEqual([
      "armament-plate", "devil-fruit-essence", "black-blade-shard",
      "jolly-roger-fragment", "black-blade-shard", "sniper-lens",
      "jolly-roger-fragment", "devil-fruit-essence", "cola-canister",
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
    expect(formFor("armament-wraps")).toBe("luffy-gear-4-boundman");
    expect(formFor("sniper-goggles")).toBe("luffy-gear-4-snakeman");
    expect(DEFAULT_CONTENT.version).toBe("1.25.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);

    const state = createMatch("p4b6-save");
    state.players[0].inventory = DEFAULT_CONTENT.items.map((item) => item.id);
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.25.0");
    expect(restored.players[0].inventory).toEqual(state.players[0].inventory);

    const combatants: Combatant[] = [
      { id: "a", teamId: "a", x: 0, y: 0, items: ["armor-piercing-scope"] },
      { id: "b", teamId: "b", x: 0, y: 1, items: ["guard-point-dummy"] },
    ];
    expect(run(combatants, { seed: "same" })).toEqual(run(combatants, { seed: "same" }));
  });
});
