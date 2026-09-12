import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  adjustedChancePercent,
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

const P4B5_IDS = [
  "healing-bubble",
  "armament-sash",
  "impact-dial",
  "den-den-mushi",
  "ricochet-dial",
  "armament-wraps",
  "advanced-armament-orb",
] as const;

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
  effects: ItemDefinition["effects"],
  behaviors: ItemDefinition["behaviors"] = [],
): ItemDefinition {
  return {
    id,
    name: id,
    description: "P4B5 fixture item.",
    icon: "fixture",
    kind: "completed",
    effects,
    behaviors,
  };
}

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
    description: "P4B5 fixture ability.",
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
  const definitions: UnitDefinition[] = combatants.map((unit) => ({
    id: `${unit.id}-definition`,
    name: unit.id,
    cost: 1,
    traits: [],
    stats: stats(unit.stats),
    ability: ability({ id: `${unit.id}-ability`, ...unit.ability }),
    assetPath: "",
  }));
  content.units = definitions;
  content.forms = [];
  content.enemies = [];
  for (const override of options.extraItems ?? []) {
    content.items = content.items.filter((item) => item.id !== override.id);
    content.items.push(structuredClone(override));
  }
  const battleTeam = (
    teamId: "a" | "b",
    effects: TraitEffect[],
  ) => ({
    id: teamId,
    units: combatants
      .filter((unit) => unit.teamId === teamId)
      .map((unit): BattleSetupUnit => ({
        id: unit.id,
        definitionId: `${unit.id}-definition`,
        star: 1,
        items: unit.items ?? [],
        position: { x: unit.x, y: unit.y },
      })),
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
    battleTeam("a", options.teamAEffects ?? []),
    battleTeam("b", options.teamBEffects ?? []),
    { seed: options.seed ?? "p4b5", maxTicks: options.maxTicks ?? 1 },
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

function findSeed(
  predicate: (values: number[]) => boolean,
  rolls = 3,
): string {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `p4b5-roll-${index}`;
    let state = hashSeed(seed);
    const values: number[] = [];
    for (let roll = 0; roll < rolls; roll += 1) {
      const next = nextRandom(state);
      state = next.state;
      values.push(next.value);
    }
    if (predicate(values)) return seed;
  }
  throw new Error("No deterministic fixture seed found.");
}

function winningPvEReward(seed: string): string[] {
  const state = createMatch(seed);
  state.round = 2;
  state.stageId = "rifle-line";
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

describe("P4B5 combat item content", () => {
  it("defines exactly the seven approved identities and values", () => {
    expect(productionItem("healing-bubble")).toMatchObject({
      effects: [{ kind: "health-flat", value: 45 }],
      behaviors: [{
        kind: "periodic-adjacent-heal-overheal-energy",
        intervalMs: 2_000,
        healMaxHealthPercent: 5,
        overhealEnergyPercent: 10,
      }],
    });
    expect(productionItem("armament-sash")).toMatchObject({
      effects: [
        { kind: "shield-flat", value: 45 },
        { kind: "critical-chance-percent", value: 30 },
      ],
      behaviors: [{
        kind: "on-critical-basic-attack-shield-damage-percent",
        percent: 33,
      }],
    });
    expect(productionItem("impact-dial")).toMatchObject({
      effects: [
        { kind: "attack-speed-percent", value: 10 },
        { kind: "attack-flat", value: 9 },
      ],
      behaviors: [{
        kind: "on-basic-attack-target-max-health-physical",
        percent: 8,
      }],
    });
    expect(productionItem("den-den-mushi")).toMatchObject({
      effects: [
        { kind: "starting-energy", value: 15 },
        { kind: "attack-speed-percent", value: 10 },
      ],
      behaviors: [{
        kind: "every-n-basic-attacks-chain",
        every: 3,
        targets: 2,
        specialDamage: 30,
        energyDrain: 15,
      }],
    });
    expect(productionItem("ricochet-dial")).toMatchObject({
      effects: [
        { kind: "attack-speed-percent", value: 10 },
        { kind: "special-defense-flat", value: 3 },
        { kind: "luck-flat", value: 20 },
      ],
      behaviors: [{
        kind: "on-basic-attack-bounce",
        chancePercent: 50,
        damagePercent: 75,
      }],
    });
    expect(productionItem("armament-wraps")).toMatchObject({
      effects: [
        { kind: "attack-speed-percent", value: 10 },
        { kind: "defense-flat", value: 3 },
      ],
      behaviors: [{
        kind: "on-damage-received-stack",
        maxEvents: 20,
        eventsPerProc: 2,
        attack: 3,
        defense: 2,
        attackSpeedPercent: 5,
      }],
    });
    expect(productionItem("armament-wraps").effects).not.toContainEqual(
      expect.objectContaining({ kind: "special-defense-flat" }),
    );
    expect(productionItem("advanced-armament-orb")).toMatchObject({
      effects: [{ kind: "attack-flat", value: 30 }],
      behaviors: [{ kind: "basic-attack-true-damage-percent", percent: 25 }],
    });
  });
});

describe("P4B5 Healing Bubble", () => {
  it("waits a full interval and affects only the living holder and 8-neighborhood allies", () => {
    const neighbors = [
      ["neighbor-1", 2, 2], ["neighbor-2", 3, 2], ["neighbor-3", 4, 2],
      ["neighbor-4", 2, 3], ["neighbor-5", 4, 3], ["neighbor-6", 2, 4],
      ["neighbor-7", 3, 4], ["neighbor-8", 4, 4],
    ] as const;
    const combatants: Combatant[] = [
      { id: "holder", teamId: "a", x: 3, y: 3, items: ["healing-bubble"] },
      ...neighbors.map(([id, x, y]) => ({
        id,
        teamId: "a" as const,
        x,
        y,
        stats: id === "neighbor-1" ? { health: 10 } : {},
      })),
      { id: "far-ally", teamId: "a", x: 7, y: 0 },
      { id: "enemy-killer", teamId: "b", x: 1, y: 1, stats: { attack: 100 } },
      { id: "enemy-damager", teamId: "b", x: 5, y: 4, stats: { attack: 40 } },
    ];
    const before = run(combatants, { maxTicks: 19 });
    expect(events(before, "heal")).toEqual([]);
    expect(events(before, "energy").filter((event) => event.reason === "item")).toEqual([]);

    const result = run(combatants, { maxTicks: 20 });
    expect(unit(result, "holder", true).maxHp).toBe(1_045);
    const itemEnergy = events(result, "energy").filter(
      (event) => event.reason === "item" && event.tick === 20,
    );
    expect(itemEnergy.map((event) => event.unitId).sort()).toEqual([
      "holder",
      "neighbor-2",
      "neighbor-3",
      "neighbor-4",
      "neighbor-5",
      "neighbor-6",
      "neighbor-7",
      "neighbor-8",
    ]);
    expect(itemEnergy.find((event) => event.unitId === "neighbor-8")).toMatchObject({
      amount: 1,
      value: 16,
    });
    expect(events(result, "heal").find((event) => event.targetId === "neighbor-8"))
      .toMatchObject({ tick: 20, sourceId: "holder", amount: 40 });
    expect(itemEnergy.find((event) => event.unitId === "holder")?.amount).toBe(5);
    expect(itemEnergy.some((event) => event.unitId === "neighbor-1")).toBe(false);
    expect(itemEnergy.some((event) => event.unitId === "far-ally")).toBe(false);
    expect(itemEnergy.some((event) => event.unitId.startsWith("enemy"))).toBe(false);
  });

  it("caps adapted overheal Energy at 100", () => {
    const startEnergy = fixtureItem("start-energy", [
      { kind: "starting-energy", value: 90 },
    ]);
    const result = run([
      { id: "holder", teamId: "a", x: 0, y: 0, items: ["healing-bubble", startEnergy.id] },
      { id: "enemy", teamId: "b", x: 0, y: 1 },
    ], { maxTicks: 20, extraItems: [startEnergy] });
    expect(events(result, "energy").find(
      (event) => event.unitId === "holder" && event.reason === "item" && event.tick === 20,
    )).toMatchObject({ amount: 0, value: 100 });
  });
});

describe("P4B5 primary attack modifiers", () => {
  const noCrit = fixtureItem("no-crit", [
    { kind: "critical-chance-percent", value: -100 },
  ]);
  const forcedCrit = fixtureItem("forced-crit", [
    { kind: "critical-chance-percent", value: 100 },
  ]);
  const forcedDodge = fixtureItem("forced-dodge", [
    { kind: "dodge-percent", value: 100 },
  ]);

  it("uses complete raw critical primary damage for Armament Sash regardless of mitigation", () => {
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["armament-sash", forcedCrit.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { defense: 100 } },
    ], { extraItems: [forcedCrit] });
    expect(unit(result, "source", true).shield).toBe(45);
    expect(events(result, "damage").find((event) => event.sourceId === "source")?.amount).toBe(100);
    expect(events(result, "shield").filter((event) => event.sourceId === "source"))
      .toEqual([expect.objectContaining({ targetId: "source", amount: 66 })]);
  });

  it("does not grant Armament Sash shield on a non-critical or dodged attack", () => {
    const nonCritical = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["armament-sash", noCrit.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { extraItems: [noCrit] });
    const dodged = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["armament-sash", forcedCrit.id], stats: { attack: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [forcedDodge.id] },
    ], { extraItems: [forcedCrit, forcedDodge] });
    expect(events(nonCritical, "shield")).toEqual([]);
    expect(events(dodged, "dodge")).toHaveLength(1);
    expect(events(dodged, "shield")).toEqual([]);
  });

  it("adds Impact Dial physical damage after crit and preserves it on dodge", () => {
    const normal = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["impact-dial", noCrit.id], stats: { attack: 30 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { extraItems: [noCrit] });
    const critical = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["impact-dial", forcedCrit.id], stats: { attack: 30 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { extraItems: [forcedCrit] });
    const dodged = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["impact-dial", forcedCrit.id], stats: { attack: 30 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [forcedDodge.id] },
    ], { extraItems: [forcedCrit, forcedDodge] });
    expect(events(normal, "damage").find((event) => event.sourceId === "source")?.amount).toBe(119);
    expect(events(critical, "damage").find((event) => event.sourceId === "source")?.amount).toBe(158);
    expect(events(dodged, "dodge")).toHaveLength(1);
    expect(events(dodged, "damage").find((event) => event.sourceId === "source")?.amount).toBe(80);
  });

  it("applies Impact Dial attack speed without rewriting its max-HP ratio", () => {
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["impact-dial", noCrit.id], stats: { attack: 1, attackIntervalMs: 1_000 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 100_000 } },
    ], { maxTicks: 10, extraItems: [noCrit] });
    expect(events(result, "attack").filter((event) => event.sourceId === "source").map((event) => event.tick))
      .toEqual([1, 10]);
  });

  it.each([
    { critical: false, expected: [75, 25] },
    { critical: true, expected: [150, 50] },
  ])("splits exactly 25% of base damage to True on critical=$critical", ({ critical, expected }) => {
    const critItem = critical ? forcedCrit : noCrit;
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["advanced-armament-orb", critItem.id], stats: { attack: 70 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
    ], { extraItems: [critItem] });
    expect(events(result, "damage").filter((event) => event.sourceId === "source").map((event) => event.amount))
      .toEqual(expected);
    expect(expected.reduce((sum, amount) => sum + amount, 0)).toBe(critical ? 200 : 100);
  });

  it("leaves ability damage unaffected by Advanced Armament Orb", () => {
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["advanced-armament-orb"], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1 },
    ], { teamAEffects: [{ kind: "starting-energy", value: 100 }] });
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "source" && event.damageKind === "ability",
    ).map((event) => event.amount)).toEqual([100]);
  });
});

describe("P4B5 Den Den Mushi and Ricochet Dial", () => {
  const noCrit = fixtureItem("no-crit", [
    { kind: "critical-chance-percent", value: -100 },
  ]);
  const forcedDodge = fixtureItem("forced-dodge", [
    { kind: "dodge-percent", value: 100 },
  ]);
  const startEnergy = fixtureItem("target-energy", [
    { kind: "starting-energy", value: 50 },
  ]);

  it("counts attempts including dodge and chains on only the third to two closest living enemies", () => {
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["den-den-mushi", noCrit.id], stats: { attackIntervalMs: 100 } },
      { id: "primary", teamId: "b", x: 0, y: 1, items: [forcedDodge.id, startEnergy.id], stats: { specialDefense: 50 } },
      { id: "second", teamId: "b", x: 1, y: 1, items: [startEnergy.id], stats: { specialDefense: 50 } },
      { id: "third", teamId: "b", x: 4, y: 0, items: [startEnergy.id], stats: { specialDefense: 50 } },
    ], { maxTicks: 3, extraItems: [noCrit, forcedDodge, startEnergy] });
    expect(unit(result, "source", true).energy).toBe(15);
    expect(events(result, "attack").filter((event) => event.sourceId === "source")).toHaveLength(3);
    expect(events(result, "dodge").filter((event) => event.sourceId === "source")).toHaveLength(3);
    const chainDamage = events(result, "damage").filter(
      (event) => event.sourceId === "source" && event.damageKind === "item",
    );
    expect(chainDamage.map((event) => [event.tick, event.targetId, event.amount])).toEqual([
      [3, "primary", 20],
      [3, "second", 20],
    ]);
    expect(events(result, "energy").filter(
      (event) => event.reason === "item" && event.amount === -15,
    ).map((event) => event.unitId)).toEqual(["primary", "second"]);
    expect(chainDamage.some((event) => event.targetId === "third")).toBe(false);
  });

  it("uses one deterministic Luck-adjusted bounce roll and copies raw Red/Impact components", () => {
    const chance = adjustedChancePercent(50, 20) / 100;
    const seed = findSeed(([first]) => first < chance, 1);
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["advanced-armament-orb", "impact-dial", "ricochet-dial", noCrit.id], stats: { attack: 61 } },
      { id: "primary", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
      { id: "low", teamId: "b", x: 1, y: 1, stats: { health: 5_000 } },
      { id: "high", teamId: "b", x: 0, y: 2, stats: { health: 6_000 } },
    ], {
      seed,
      extraItems: [noCrit],
      teamBEffects: [{ kind: "critical-chance-percent", value: -100 }],
    });
    expect(adjustedChancePercent(50, 20)).toBeGreaterThan(50);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "source" && event.targetId === "primary",
    ).map((event) => event.amount)).toEqual([875, 25]);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "source" && event.targetId === "low",
    ).map((event) => event.amount)).toEqual([656, 19]);
    expect(events(result, "damage").some(
      (event) => event.sourceId === "source" && event.targetId === "high",
    )).toBe(false);
    expect(result).toEqual(run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["advanced-armament-orb", "impact-dial", "ricochet-dial", noCrit.id], stats: { attack: 61 } },
      { id: "primary", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
      { id: "low", teamId: "b", x: 1, y: 1, stats: { health: 5_000 } },
      { id: "high", teamId: "b", x: 0, y: 2, stats: { health: 6_000 } },
    ], {
      seed,
      extraItems: [noCrit],
      teamBEffects: [{ kind: "critical-chance-percent", value: -100 }],
    }));
  });

  it("does not roll or bounce when the raw primary bundle is zero", () => {
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["ricochet-dial", noCrit.id] },
      { id: "primary", teamId: "b", x: 0, y: 1, items: [forcedDodge.id] },
      { id: "candidate", teamId: "b", x: 1, y: 1 },
    ], { extraItems: [noCrit, forcedDodge] });
    expect(events(result, "dodge")).toHaveLength(1);
    expect(events(result, "damage").filter((event) => event.sourceId === "source")).toEqual([]);
  });

  it("keeps Blue Orb out of Loaded Dice's copied bundle", () => {
    const chance = adjustedChancePercent(50, 20) / 100;
    const seed = findSeed((values) => values[0] >= chance && values[1] >= chance && values[2] < chance);
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["den-den-mushi", "ricochet-dial", noCrit.id], stats: { attack: 20, attackIntervalMs: 100 } },
      { id: "primary", teamId: "b", x: 0, y: 1, stats: { health: 10_000 } },
      { id: "bounce", teamId: "b", x: 1, y: 1, stats: { health: 10_000 } },
    ], {
      maxTicks: 3,
      seed,
      extraItems: [noCrit],
      teamBEffects: [{ kind: "critical-chance-percent", value: -100 }],
    });
    expect(events(result, "damage").filter(
      (event) => event.tick === 3 && event.sourceId === "source" && event.targetId === "bounce",
    ).map((event) => event.amount)).toEqual([30, 15]);
  });
});

describe("P4B5 Armament Wraps", () => {
  const shield = fixtureItem("fixture-shield", [{ kind: "shield-flat", value: 5 }]);
  const noCrit = fixtureItem("no-crit", [{ kind: "critical-chance-percent", value: -100 }]);
  const forcedDodge = fixtureItem("forced-dodge", [{ kind: "dodge-percent", value: 100 }]);

  it("counts actual shield and HP damage and procs every second positive event", () => {
    const result = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: [noCrit.id], stats: { attack: 10, attackIntervalMs: 200 } },
      { id: "holder", teamId: "b", x: 0, y: 1, items: ["armament-wraps", shield.id], stats: { attack: 10, health: 10_000 } },
    ], { maxTicks: 3, extraItems: [shield, noCrit] });
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "attacker" && event.targetId === "holder",
    ).map((event) => ({ shield: event.shieldDamage, health: event.healthDamage })))
      .toEqual([{ shield: 5, health: 4 }, { shield: 0, health: 9 }]);
    expect(unit(result, "holder")).toMatchObject({ attack: 13, defense: 5 });
  });

  it("ignores zero-damage dodges and counts item damage through applyDamage", () => {
    const result = run([
      { id: "attacker", teamId: "a", x: 0, y: 0, items: ["den-den-mushi", noCrit.id], stats: { attackIntervalMs: 100 } },
      { id: "holder", teamId: "b", x: 0, y: 1, items: ["armament-wraps", forcedDodge.id], stats: { attack: 10 } },
    ], { maxTicks: 3, extraItems: [noCrit, forcedDodge] });
    expect(events(result, "dodge").filter((event) => event.sourceId === "attacker")).toHaveLength(3);
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "attacker" && event.targetId === "holder",
    )).toHaveLength(1);
    expect(unit(result, "holder")).toMatchObject({ attack: 10, defense: 3 });
  });

  it("caps at 20 damage events and ten local Attack/Defense procs", () => {
    const startEnergy = fixtureItem("start-energy", [{ kind: "starting-energy", value: 100 }]);
    const result = run([
      { id: "burner", teamId: "a", x: 0, y: 0, items: [startEnergy.id], ability: { targeting: "nearest-enemy", requiresTarget: true, effect: "damage", power: 10, burnPower: 10, burnDurationMs: 30_000 } },
      { id: "holder", teamId: "b", x: 0, y: 1, items: ["armament-wraps"], stats: { attack: 10, health: 100_000 } },
    ], { maxTicks: 210, extraItems: [startEnergy] });
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "burner" && event.targetId === "holder",
    ).length).toBeGreaterThan(20);
    expect(unit(result, "holder")).toMatchObject({ attack: 40, defense: 23 });
  });

  it("does not retroactively rewrite an already scheduled attack cooldown", () => {
    const result = run([
      { id: "a-attacker", teamId: "a", x: 0, y: 0, items: [noCrit.id], stats: { attack: 10, attackIntervalMs: 200 } },
      { id: "z-holder", teamId: "b", x: 0, y: 1, items: ["armament-wraps", noCrit.id], stats: { attack: 1, health: 100_000, attackIntervalMs: 2_000 } },
    ], { maxTicks: 19, extraItems: [noCrit] });
    expect(events(result, "attack").filter((event) => event.sourceId === "z-holder").map((event) => event.tick))
      .toEqual([1, 19]);
  });

  it("reacts normally to Blue Orb and Loaded Dice item damage", () => {
    const chance = adjustedChancePercent(50, 20) / 100;
    const seed = findSeed((values) => values[0] >= chance && values[1] >= chance && values[2] < chance);
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["den-den-mushi", "ricochet-dial", noCrit.id], stats: { attack: 20, attackIntervalMs: 100 } },
      { id: "primary", teamId: "b", x: 0, y: 1, items: [noCrit.id], stats: { health: 10_000 } },
      { id: "holder", teamId: "b", x: 1, y: 1, items: ["armament-wraps", noCrit.id], stats: { attack: 10, health: 10_000 } },
    ], { maxTicks: 3, seed, extraItems: [noCrit] });
    expect(events(result, "damage").filter(
      (event) => event.tick === 3 && event.sourceId === "source" && event.targetId === "holder",
    ).map((event) => event.amount)).toEqual([30, 14]);
    expect(unit(result, "holder")).toMatchObject({ attack: 13, defense: 5 });
  });

  it("keeps Armament Wraps as the Boundman catalyst", () => {
    const luffy: UnitInstance = {
      id: "luffy",
      definitionId: "luffy",
      star: 3,
      items: ["armament-wraps"],
      acquiredOrder: 1,
    };
    reconcileProductionFormProgression(luffy);
    expect(luffy.formId).toBe("luffy-gear-4-boundman");
  });
});

describe("P4B5 ordering and contracts", () => {
  it("uses the full Red Orb plus Impact Dial primary bundle for Black Belt", () => {
    const forcedCrit = fixtureItem("forced-crit", [{ kind: "critical-chance-percent", value: 100 }]);
    const result = run([
      { id: "source", teamId: "a", x: 0, y: 0, items: ["armament-sash", "advanced-armament-orb", "impact-dial", forcedCrit.id], stats: { attack: 61 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000, defense: 100 } },
    ], { extraItems: [forcedCrit] });
    expect(events(result, "damage").filter(
      (event) => event.sourceId === "source" && event.targetId === "target",
    ).map((event) => event.amount)).toEqual([475, 50]);
    expect(events(result, "shield").find((event) => event.sourceId === "source")?.amount).toBe(330);
  });

  it("makes Scope Lens plus Blue Orb independent of equipment array order", () => {
    const forcedCrit = fixtureItem("forced-crit", [{ kind: "critical-chance-percent", value: 100 }]);
    const targetEnergy = fixtureItem("target-energy", [{ kind: "starting-energy", value: 100 }]);
    const combatants = (items: string[]): Combatant[] => [
      { id: "source", teamId: "a", x: 0, y: 0, items: [...items, forcedCrit.id], stats: { attack: 1, attackIntervalMs: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, items: [targetEnergy.id], stats: { health: 10_000 } },
    ];
    const options = { maxTicks: 3, extraItems: [forcedCrit, targetEnergy] };
    const scopeFirst = run(combatants(["energy-siphon-scope", "den-den-mushi"]), options);
    const blueFirst = run(combatants(["den-den-mushi", "energy-siphon-scope"]), options);
    expect(scopeFirst.events).toEqual(blueFirst.events);
    expect(scopeFirst.finalUnits.map((battleUnit) => ({ ...battleUnit, items: [] })))
      .toEqual(blueFirst.finalUnits.map((battleUnit) => ({ ...battleUnit, items: [] })));
  });

  it("preserves acquisition RNG, recipes, Gear 4, stable saves, version, and determinism", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual(ACQUISITION_IDS);
    expect(DEFAULT_CONTENT.acquirableItemIds).toEqual(ACQUISITION_IDS);
    expect(winningPvEReward("p4a-reward-1")).toEqual([
      "jet-dial", "sniper-lens", "devil-fruit-essence",
    ]);
    expect(carouselItems("p4a-carousel-1")).toEqual([
      "armament-plate", "devil-fruit-essence", "black-blade-shard",
      "jolly-roger-fragment", "black-blade-shard", "sniper-lens",
      "jolly-roger-fragment", "devil-fruit-essence", "cola-canister",
    ]);
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
    expect(Object.keys(DEFAULT_CONTENT.itemRecipes)).toHaveLength(55);

    const state = createMatch("p4b5-save");
    state.contentVersion = "1.19.0";
    state.players[0].inventory = DEFAULT_CONTENT.items.map((item) => item.id);
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored.players[0].inventory).toEqual(state.players[0].inventory);
    expect(DEFAULT_CONTENT.version).toBe("1.29.0");
    expect(restored.contentVersion).toBe("1.29.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);

    const fixture: Combatant[] = [
      { id: "source", teamId: "a", x: 0, y: 0, items: [...P4B5_IDS], stats: { health: 10_000, attack: 50, attackIntervalMs: 100 } },
      { id: "target", teamId: "b", x: 0, y: 1, stats: { health: 10_000, attack: 50, attackIntervalMs: 100 } },
    ];
    expect(run(fixture, { maxTicks: 20, seed: "p4b5-equality" }))
      .toEqual(run(fixture, { maxTicks: 20, seed: "p4b5-equality" }));
  });
});
