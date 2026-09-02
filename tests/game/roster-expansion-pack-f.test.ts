import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  applyCommand as applyDomainCommand,
  createMatch,
  getActiveTraits,
  getActiveTraitEffects,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type GameCommand,
  type GameContent,
  type MatchState,
  type PlayerState,
  type Position,
  type TraitEffect,
  type UnitDefinition,
} from "../../game";

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type DisplaceEvent = Extract<BattleEvent, { type: "unit-displace" }>;
type EnergyEvent = Extract<BattleEvent, { type: "energy" }>;
type StatusEvent = Extract<BattleEvent, { type: "status" }>;

const PACK_F_IDS = ["kuzan", "akainu", "shanks", "blackbeard"] as const;

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
}

function definition(content: GameContent, id: string): UnitDefinition {
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
    attack?: number;
    defense?: number;
    health?: number;
    range?: number;
  } = {},
): void {
  const unit = combatDefinition(content, id);
  unit.stats = {
    ...unit.stats,
    health: options.health ?? 1_000,
    attack: options.attack ?? 1,
    defense: options.defense ?? 0,
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
          traitId: "roster-expansion-pack-f-test",
          count: 1,
          tierIndex: 0,
          tier: {
            required: 1,
            label: "Pack F test",
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

function runSingleTick(
  content: GameContent,
  sourceDefinitionId: string,
  enemies: BattleSetupUnit[],
  options: {
    allies?: BattleSetupUnit[];
    cast?: boolean;
    enemyEnergy?: number;
    seed?: string;
    sourceEffects?: TraitEffect[];
    sourcePosition?: Position;
  } = {},
): BattleResult {
  const source = options.sourcePosition ?? { x: 1, y: 2 };
  const sourceEffects = [
    ...(options.cast === false
      ? []
      : [{ kind: "starting-energy", value: 100 } as const]),
    ...(options.sourceEffects ?? []),
  ];
  const enemyEffects =
    options.enemyEnergy === undefined
      ? []
      : [{ kind: "starting-energy", value: options.enemyEnergy } as const];
  return simulateBattle(
    team(
      "a",
      [
        setupUnit(sourceDefinitionId, sourceDefinitionId, source.x, source.y),
        ...(options.allies ?? []),
      ],
      sourceEffects,
    ),
    team("b", enemies, enemyEffects),
    { seed: options.seed ?? `${sourceDefinitionId}-pack-f`, maxTicks: 1 },
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

function displacements(
  result: BattleResult,
  sourceId: string,
): DisplaceEvent[] {
  return result.events.filter(
    (event): event is DisplaceEvent =>
      event.type === "unit-displace" && event.sourceId === sourceId,
  );
}

function statuses(result: BattleResult, sourceId: string): StatusEvent[] {
  return result.events.filter(
    (event): event is StatusEvent =>
      event.type === "status" && event.sourceId === sourceId,
  );
}

function drains(result: BattleResult): EnergyEvent[] {
  return result.events.filter(
    (event): event is EnergyEvent =>
      event.type === "energy" && event.reason === "ability-drain",
  );
}

function player(state: MatchState): PlayerState {
  const result = state.players.find((candidate) => candidate.id === "player-1");
  if (!result) throw new Error("Missing test player");
  return result;
}

function applyCommand(state: MatchState, command: GameCommand): MatchState {
  const result = applyDomainCommand(state, command, { actorPlayerId: "player-1" });
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function buyForced(state: MatchState, definitionId: string): MatchState {
  const current = player(state).shop[0];
  if (current) state.pool[current] += 1;
  player(state).shop[0] = definitionId;
  state.pool[definitionId] -= 1;
  return applyCommand(state, { type: "BUY_UNIT", shopIndex: 0 });
}

function deployedTraits(...definitionIds: string[]): ActiveTrait[] {
  let state = createMatch(`pack-f-traits-${definitionIds.join("-")}`);
  player(state).gold = 99;
  player(state).level = 5;
  for (const [index, definitionId] of definitionIds.entries()) {
    state = buyForced(state, definitionId);
    const unitId = player(state).bench.find(
      (candidate): candidate is string => Boolean(candidate),
    );
    if (!unitId) throw new Error(`Missing purchased ${definitionId}`);
    state = applyCommand(state, {
      type: "MOVE_UNIT",
      unitId,
      to: { zone: "board", x: index, y: 5 },
    });
  }
  return getActiveTraits(player(state));
}

describe("Roster Expansion Pack F content", () => {
  it("declares the four locked units with existing mechanics only", () => {
    expect(definition(DEFAULT_CONTENT, "kuzan")).toMatchObject({
      name: "Kuzan",
      cost: 4,
      traits: ["navy", "specialist"],
      stats: {
        health: 900,
        attack: 84,
        defense: 30,
        range: 4,
        attackIntervalMs: 1_100,
        moveIntervalMs: 500,
      },
      ability: {
        id: "ice-age",
        name: "Ice Age",
        power: 190,
        targeting: "nearest-enemy",
        pattern: "all-enemies",
        stunMs: 700,
        castAnimationMs: 650,
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "akainu")).toMatchObject({
      name: "Akainu",
      cost: 4,
      traits: ["navy", "brawler"],
      stats: {
        health: 980,
        attack: 94,
        defense: 34,
        range: 2,
        attackIntervalMs: 1_000,
        moveIntervalMs: 500,
      },
      ability: {
        id: "great-eruption",
        name: "Great Eruption",
        power: 340,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        burnPower: 32,
        burnDurationMs: 4_000,
        castAnimationMs: 650,
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "shanks")).toMatchObject({
      name: "Shanks",
      cost: 5,
      traits: ["emperor", "captain", "swordsman"],
      stats: {
        health: 1_080,
        attack: 128,
        defense: 40,
        range: 2,
        attackIntervalMs: 900,
        moveIntervalMs: 400,
      },
      ability: {
        id: "divine-departure",
        name: "Divine Departure",
        power: 540,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        defensePiercePercent: 35,
        castAnimationMs: 700,
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "blackbeard")).toMatchObject({
      name: "Blackbeard",
      cost: 5,
      traits: ["emperor", "captain", "specialist"],
      stats: {
        health: 1_220,
        attack: 105,
        defense: 40,
        range: 3,
        attackIntervalMs: 1_100,
        moveIntervalMs: 500,
      },
      ability: {
        id: "black-hole",
        name: "Black Hole",
        power: 220,
        targeting: "nearest-enemy",
        pattern: "all-enemies",
        energyDrain: 20,
        castAnimationMs: 700,
        signatureMechanics: [{ kind: "pull" }],
      },
      assetPath: "/assets/characters/placeholder.svg",
    });

    for (const id of PACK_F_IDS) {
      const packAbility = definition(DEFAULT_CONTENT, id).ability;
      expect(packAbility.hits).toBeUndefined();
      expect(packAbility.sequentialStrike).toBeUndefined();
      expect(JSON.parse(JSON.stringify(packAbility))).toEqual(packAbility);
    }
  });

  it("completes the generic roster and pool at the locked distribution", () => {
    expect(DEFAULT_CONTENT.units).toHaveLength(30);
    expect(
      [1, 2, 3, 4, 5].map(
        (cost) => DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost).length,
      ),
    ).toEqual([6, 7, 6, 7, 4]);
    expect(DEFAULT_CONTENT.traits).toHaveLength(13);
    expect(DEFAULT_CONTENT.version).toBe("1.16.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);

    const state = createMatch("pack-f-pool", DEFAULT_CONTENT);
    for (const id of PACK_F_IDS) {
      const unit = definition(DEFAULT_CONTENT, id);
      const copiesInShops = state.players.reduce(
        (total, candidate) =>
          total + candidate.shop.filter((shopId) => shopId === id).length,
        0,
      );
      expect(state.pool[id] + copiesInShops).toBe(
        DEFAULT_CONTENT.config.poolCopiesByCost[unit.cost - 1],
      );
    }
  });
});

describe("Emperor origin", () => {
  it("uses exact highest tiers for unique Emperor definitions and leaves Captain unchanged", () => {
    const shanks = deployedTraits("shanks");
    const blackbeard = deployedTraits("blackbeard");
    const pair = deployedTraits("shanks", "blackbeard");
    const duplicateShanks = deployedTraits("shanks", "shanks");
    const duplicateBlackbeard = deployedTraits("blackbeard", "blackbeard");

    expect(DEFAULT_CONTENT.traits.find((trait) => trait.id === "emperor"))
      .toMatchObject({
        description:
          "Emperors embolden the entire crew, with a stronger bonus when multiple Emperors unite.",
        tiers: [
          {
            required: 1,
            label: "+4% health and attack",
            effects: [
              { kind: "max-health-percent", value: 4 },
              { kind: "attack-percent", value: 4 },
            ],
          },
          {
            required: 2,
            label: "+8% health and attack",
            effects: [
              { kind: "max-health-percent", value: 8 },
              { kind: "attack-percent", value: 8 },
            ],
          },
        ],
      });

    expect(shanks.find((trait) => trait.traitId === "emperor")).toMatchObject({
      count: 1,
      tierIndex: 0,
      tier: {
        required: 1,
        effects: [
          { kind: "max-health-percent", value: 4 },
          { kind: "attack-percent", value: 4 },
        ],
      },
    });
    expect(blackbeard.find((trait) => trait.traitId === "emperor"))
      .toMatchObject({ count: 1, tierIndex: 0, tier: { required: 1 } });
    expect(pair.find((trait) => trait.traitId === "emperor")).toMatchObject({
      count: 2,
      tierIndex: 1,
      tier: {
        required: 2,
        label: "+8% health and attack",
        effects: [
          { kind: "max-health-percent", value: 8 },
          { kind: "attack-percent", value: 8 },
        ],
      },
    });
    expect(duplicateShanks.find((trait) => trait.traitId === "emperor"))
      .toMatchObject({ count: 1, tierIndex: 0, tier: { required: 1 } });
    expect(duplicateBlackbeard.find((trait) => trait.traitId === "emperor"))
      .toMatchObject({ count: 1, tierIndex: 0, tier: { required: 1 } });
    expect(getActiveTraitEffects(pair)).toContainEqual({
      kind: "max-health-percent",
      value: 8,
    });
    expect(getActiveTraitEffects(pair)).toContainEqual({
      kind: "attack-percent",
      value: 8,
    });
    expect(getActiveTraitEffects(pair)).not.toContainEqual({
      kind: "max-health-percent",
      value: 4,
    });
    expect(getActiveTraitEffects(pair)).not.toContainEqual({
      kind: "attack-percent",
      value: 4,
    });
    expect(pair.find((trait) => trait.traitId === "captain")).toMatchObject({
      count: 2,
      tierIndex: 0,
      tier: {
        required: 2,
        effects: [{ kind: "shield-flat", value: 100 }],
      },
    });
    expect(DEFAULT_CONTENT.traits.find((trait) => trait.id === "captain")?.tiers)
      .toEqual([
        {
          required: 2,
          effects: [{ kind: "shield-flat", value: 100 }],
          label: "100 starting shield",
        },
        {
          required: 3,
          effects: [{ kind: "shield-flat", value: 225 }],
          label: "225 starting shield",
        },
      ]);
  });

  it("applies the non-cumulative two-Emperor tier to the whole team", () => {
    const content = clonedContent();
    for (const id of ["shanks", "blackbeard", "chopper", "marine-recruit"]) {
      configureCombatant(content, id, { health: 1_000, attack: 100 });
    }
    const activeTraits = deployedTraits("shanks", "blackbeard");
    const result = simulateBattle(
      {
        id: "a",
        units: [
          setupUnit("shanks-unit", "shanks", 0, 5),
          setupUnit("blackbeard-unit", "blackbeard", 1, 5),
          setupUnit("crew-unit", "chopper", 2, 5),
        ],
        activeTraits,
      },
      {
        id: "b",
        units: [setupUnit("enemy", "marine-recruit", 7, 0)],
        activeTraits: [],
      },
      { seed: "emperor-team-wide", maxTicks: 1 },
      content,
    );

    for (const unitId of ["shanks-unit", "blackbeard-unit", "crew-unit"]) {
      expect(result.initialUnits.find((unit) => unit.id === unitId))
        .toMatchObject({ maxHp: 1_080, attack: 108 });
    }
  });
});

describe("Kuzan Ice Age", () => {
  it("damages every enemy normally, stuns survivors, and replays deterministically", () => {
    const content = clonedContent();
    configureCombatant(content, "kuzan", { range: 10 });
    configureCombatant(content, "chopper", { defense: 40 });
    configureCombatant(content, "marine-recruit");
    const battle = () =>
      runSingleTick(
        content,
        "kuzan",
        [
          setupUnit("a-near", "chopper", 3, 2),
          setupUnit("b-global", "marine-recruit", 7, 5),
        ],
        { seed: "kuzan-ice-age" },
      );

    const first = battle();
    const second = battle();
    expect(abilityDamage(first, "kuzan")).toMatchObject([
      { targetId: "a-near", amount: 135 },
      { targetId: "b-global", amount: 190 },
    ]);
    expect(statuses(first, "kuzan")).toMatchObject([
      { targetId: "a-near", status: "stun", durationTicks: 7 },
      { targetId: "b-global", status: "stun", durationTicks: 7 },
    ]);
    expect(displacements(first, "kuzan")).toHaveLength(0);
    expect(
      first.events.some(
        (event) =>
          event.type === "damage" &&
          event.sourceId === "kuzan" &&
          event.damageKind === "burn",
      ),
    ).toBe(false);
    expect(first).toEqual(second);
  });
});

describe("Akainu Great Eruption", () => {
  it("burns only the nearest adjacent cluster without control or displacement", () => {
    const content = clonedContent();
    configureCombatant(content, "akainu", { range: 10 });
    configureCombatant(content, "chopper", { defense: 40 });
    configureCombatant(content, "marine-recruit");
    const battle = () =>
      runSingleTick(
        content,
        "akainu",
        [
          setupUnit("a-primary", "chopper", 3, 2),
          setupUnit("b-adjacent", "marine-recruit", 4, 2),
          setupUnit("c-outside", "marine-recruit", 7, 5),
        ],
        { seed: "akainu-great-eruption" },
      );

    const first = battle();
    const second = battle();
    expect(
      first.events.find(
        (event) => event.type === "cast" && event.sourceId === "akainu",
      ),
    ).toMatchObject({ targetIds: ["a-primary", "b-adjacent"] });
    expect(abilityDamage(first, "akainu")).toMatchObject([
      { targetId: "a-primary", amount: 242 },
      { targetId: "b-adjacent", amount: 340 },
    ]);
    expect(statuses(first, "akainu")).toMatchObject([
      { targetId: "a-primary", status: "burn", durationTicks: 40 },
      { targetId: "b-adjacent", status: "burn", durationTicks: 40 },
    ]);
    expect(first.finalUnits.find((unit) => unit.id === "c-outside"))
      .toMatchObject({ hp: 1_000 });
    expect(displacements(first, "akainu")).toHaveLength(0);
    expect(statuses(first, "akainu").some((event) => event.status === "stun"))
      .toBe(false);
    expect(first).toEqual(second);
  });
});

describe("Shanks Divine Departure", () => {
  it("uses nearest adjacent targeting and exact generic 35% Defense Pierce", () => {
    const content = clonedContent();
    configureCombatant(content, "shanks", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { defense: 40 });
    const battle = () =>
      runSingleTick(
        content,
        "shanks",
        [
          setupUnit("a-nearest-zero", "chopper", 3, 2),
          setupUnit("b-adjacent-forty", "marine-recruit", 4, 2),
          setupUnit("z-outside", "chopper", 7, 5),
        ],
        { seed: "shanks-defense-pierce" },
      );

    const first = battle();
    const second = battle();
    expect(
      first.events.find(
        (event) => event.type === "cast" && event.sourceId === "shanks",
      ),
    ).toMatchObject({ targetIds: ["a-nearest-zero", "b-adjacent-forty"] });
    expect(abilityDamage(first, "shanks")).toMatchObject([
      { targetId: "a-nearest-zero", amount: 540 },
      { targetId: "b-adjacent-forty", amount: 428 },
    ]);
    expect(first.finalUnits.find((unit) => unit.id === "b-adjacent-forty"))
      .toMatchObject({ defense: 40 });
    expect(combatDefinition(content, "marine-recruit").stats.defense).toBe(40);
    expect(statuses(first, "shanks")).toHaveLength(0);
    expect(displacements(first, "shanks")).toHaveLength(0);
    expect(
      first.events.some(
        (event) =>
          event.type === "damage" &&
          event.sourceId === "shanks" &&
          event.damageKind === "burn",
      ),
    ).toBe(false);
    expect(first).toEqual(second);
  });

  it("keeps normal attacks on full Defense", () => {
    const content = clonedContent();
    configureCombatant(content, "shanks", { attack: 128, range: 10 });
    configureCombatant(content, "marine-recruit", { defense: 40 });
    const result = runSingleTick(
      content,
      "shanks",
      [setupUnit("target", "marine-recruit", 3, 2)],
      {
        cast: false,
        sourceEffects: [{ kind: "critical-chance-percent", value: -100 }],
      },
    );

    expect(
      result.events.filter(
        (event): event is DamageEvent =>
          event.type === "damage" &&
          event.sourceId === "shanks" &&
          event.damageKind === "attack",
      ),
    ).toMatchObject([{ targetId: "target", amount: 91 }]);
  });
});

describe("Blackbeard Black Hole", () => {
  it("damages all original enemies, drains survivors, then pulls deterministically", () => {
    const content = clonedContent();
    configureCombatant(content, "blackbeard", { range: 10 });
    configureCombatant(content, "chopper", { health: 220 });
    configureCombatant(content, "marine-recruit");
    const battle = () =>
      runSingleTick(
        content,
        "blackbeard",
        [
          setupUnit("a-dead", "chopper", 3, 3),
          setupUnit("b-horizontal", "marine-recruit", 5, 3),
          setupUnit("c-vertical", "marine-recruit", 4, 5),
        ],
        {
          enemyEnergy: 40,
          seed: "blackbeard-black-hole",
          sourcePosition: { x: 1, y: 3 },
        },
      );

    const first = battle();
    const second = battle();
    const firstPullIndex = first.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "blackbeard",
    );
    const lastDrainIndex = first.events.findLastIndex(
      (event) => event.type === "energy" && event.reason === "ability-drain",
    );

    expect(abilityDamage(first, "blackbeard")).toMatchObject([
      { targetId: "a-dead", amount: 220 },
      { targetId: "b-horizontal", amount: 220 },
      { targetId: "c-vertical", amount: 220 },
    ]);
    expect(drains(first)).toMatchObject([
      { unitId: "b-horizontal", amount: -20, value: 25 },
      { unitId: "c-vertical", amount: -20, value: 25 },
    ]);
    expect(displacements(first, "blackbeard")).toMatchObject([
      {
        unitId: "b-horizontal",
        abilityId: "black-hole",
        movementKind: "pull",
      },
      {
        unitId: "c-vertical",
        abilityId: "black-hole",
        movementKind: "pull",
      },
    ]);
    expect(drains(first).some((event) => event.unitId === "a-dead")).toBe(false);
    expect(
      displacements(first, "blackbeard").some(
        (event) => event.unitId === "a-dead",
      ),
    ).toBe(false);
    expect(lastDrainIndex).toBeLessThan(firstPullIndex);
    expect(first).toEqual(second);
  });

  it("clamps Energy Drain and emits no zero-delta drain", () => {
    const content = clonedContent();
    configureCombatant(content, "blackbeard", { range: 10 });
    configureCombatant(content, "marine-recruit");
    const clamped = runSingleTick(
      content,
      "blackbeard",
      [setupUnit("target", "marine-recruit", 3, 2)],
      { enemyEnergy: 5 },
    );
    expect(drains(clamped)).toMatchObject([
      { unitId: "target", amount: -10, value: 0 },
    ]);

    definition(content, "blackbeard").ability.effect = "shield";
    const zero = runSingleTick(
      content,
      "blackbeard",
      [setupUnit("target", "marine-recruit", 3, 2)],
      { seed: "blackbeard-zero-energy" },
    );
    expect(zero.finalUnits.find((unit) => unit.id === "target")?.energy).toBe(0);
    expect(drains(zero)).toHaveLength(0);
  });

  it("preserves damage and Energy Drain when pull is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "blackbeard", { range: 10 });
    configureCombatant(content, "marine-recruit");
    const result = runSingleTick(
      content,
      "blackbeard",
      [setupUnit("target", "marine-recruit", 3, 3)],
      {
        allies: [setupUnit("blocker", "marine-recruit", 2, 3)],
        enemyEnergy: 40,
        sourcePosition: { x: 1, y: 3 },
      },
    );

    expect(abilityDamage(result, "blackbeard")).toMatchObject([
      { targetId: "target", amount: 220 },
    ]);
    expect(drains(result)).toMatchObject([
      { unitId: "target", amount: -20, value: 25 },
    ]);
    expect(displacements(result, "blackbeard")).toHaveLength(0);
    expect(result.finalUnits.find((unit) => unit.id === "target")).toMatchObject({
      x: 3,
      y: 3,
    });
  });
});
