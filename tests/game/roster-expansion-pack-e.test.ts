import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  createMatch,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
  type Position,
  type TraitEffect,
  type UnitDefinition,
} from "../../game";

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type DisplaceEvent = Extract<BattleEvent, { type: "unit-displace" }>;
type StatusEvent = Extract<BattleEvent, { type: "status" }>;

const PACK_E_IDS = ["ivankov", "jinbe", "kuma", "kizaru"] as const;

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
          traitId: "roster-expansion-pack-e-test",
          count: 1,
          tierIndex: 0,
          tier: {
            required: 1,
            label: "Pack E test",
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
    enemyEffects?: TraitEffect[];
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
  return simulateBattle(
    team(
      "a",
      [
        setupUnit(sourceDefinitionId, sourceDefinitionId, source.x, source.y),
        ...(options.allies ?? []),
      ],
      sourceEffects,
    ),
    team("b", enemies, options.enemyEffects),
    { seed: options.seed ?? `${sourceDefinitionId}-pack-e`, maxTicks: 1 },
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

function runIvankovEmergency(
  content: GameContent,
  incomingDamage: number,
  seed = "ivankov-emergency",
): BattleResult {
  configureCombatant(content, "ivankov", { health: 1_000, range: 3 });
  definition(content, "ivankov").stats.attackIntervalMs = 100;
  definition(content, "ivankov").stats.moveIntervalMs = 100;
  configureCombatant(content, "marine-recruit", { health: 1_000 });
  configureCombatant(content, "nami", {
    attack: 1,
    health: 10_000,
    range: 100,
  });
  configureCombatant(content, "garp", {
    attack: incomingDamage,
    health: 10_000,
    range: 100,
  });
  return simulateBattle(
    team(
      "a",
      [
        setupUnit("ivankov", "ivankov", 0, 5),
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
      [{ kind: "critical-chance-percent", value: -100 }],
    ),
    { seed, maxTicks: 2 },
    content,
  );
}

describe("Roster Expansion Pack E content", () => {
  it("declares the four locked units with existing mechanics only", () => {
    expect(definition(DEFAULT_CONTENT, "ivankov")).toMatchObject({
      name: "Ivankov",
      cost: 2,
      traits: ["revolutionary", "specialist"],
      stats: {
        health: 700,
        attack: 52,
        defense: 20,
        range: 3,
        attackIntervalMs: 1_200,
        moveIntervalMs: 500,
      },
      ability: {
        id: "healing-hormone",
        name: "Healing Hormone",
        effect: "heal",
        power: 260,
        targeting: "lowest-health-ally",
        pattern: "single-ally",
        requiresTarget: false,
        conditionalShield: { healthThresholdPercent: 50, power: 120 },
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "jinbe")).toMatchObject({
      name: "Jinbe",
      cost: 3,
      traits: ["straw-hat", "guardian"],
      stats: {
        health: 1_020,
        attack: 76,
        defense: 38,
        range: 1,
        attackIntervalMs: 1_100,
        moveIntervalMs: 500,
      },
      ability: {
        id: "fish-man-shockwave",
        name: "Fish-Man Shockwave",
        power: 255,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        signatureMechanics: [{ kind: "knockback" }],
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "kuma")).toMatchObject({
      name: "Kuma",
      cost: 3,
      traits: ["revolutionary", "guardian"],
      stats: {
        health: 960,
        attack: 70,
        defense: 36,
        range: 2,
        attackIntervalMs: 1_200,
        moveIntervalMs: 500,
      },
      ability: {
        id: "ursus-shock",
        name: "Ursus Shock",
        power: 145,
        targeting: "nearest-enemy",
        pattern: "all-enemies",
        castAnimationMs: 600,
        signatureMechanics: [{ kind: "knockback" }],
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "kizaru")).toMatchObject({
      name: "Kizaru",
      cost: 4,
      traits: ["navy", "marksman"],
      stats: {
        health: 800,
        attack: 100,
        defense: 20,
        range: 5,
        attackIntervalMs: 950,
        moveIntervalMs: 500,
      },
      ability: {
        id: "sacred-jewel",
        name: "Sacred Jewel",
        power: 420,
        targeting: "farthest-enemy",
        pattern: "line",
        defensePiercePercent: 40,
        castAnimationMs: 600,
      },
      assetPath: "/assets/characters/placeholder.svg",
    });

    expect(definition(DEFAULT_CONTENT, "ivankov").ability.signatureMechanics)
      .toBeUndefined();
    for (const id of ["jinbe", "kuma"] as const) {
      expect(definition(DEFAULT_CONTENT, id).ability.stunMs).toBeUndefined();
    }
    for (const id of PACK_E_IDS) {
      const packAbility = definition(DEFAULT_CONTENT, id).ability;
      expect(packAbility.stunMs).toBeUndefined();
      expect(packAbility.burnPower).toBeUndefined();
      expect(packAbility.energyDrain).toBeUndefined();
      expect(packAbility.hits).toBeUndefined();
      expect(packAbility.sequentialStrike).toBeUndefined();
      expect(JSON.parse(JSON.stringify(packAbility))).toEqual(packAbility);
    }
  });

  it("expands the generic roster and pool to the locked distribution", () => {
    expect(DEFAULT_CONTENT.units).toHaveLength(30);
    expect(
      [1, 2, 3, 4, 5].map(
        (cost) => DEFAULT_CONTENT.units.filter((unit) => unit.cost === cost).length,
      ),
    ).toEqual([6, 7, 6, 7, 4]);
    expect(DEFAULT_CONTENT.version).toBe("1.17.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);

    const state = createMatch("pack-e-pool", DEFAULT_CONTENT);
    for (const id of PACK_E_IDS) {
      const unit = definition(DEFAULT_CONTENT, id);
      const copiesInShops = state.players.reduce(
        (total, player) =>
          total + player.shop.filter((shopId) => shopId === id).length,
        0,
      );
      expect(state.pool[id] + copiesInShops).toBe(
        DEFAULT_CONTENT.config.poolCopiesByCost[unit.cost - 1],
      );
    }
  });
});

describe("Ivankov Healing Hormone", () => {
  it.each([500, 600])(
    "heals the lowest ally then shields at or below 50%% after %i damage",
    (incomingDamage) => {
      const content = clonedContent();
      const result = runIvankovEmergency(content, incomingDamage);
      const supportEvents = result.events.filter(
        (event) =>
          (event.type === "heal" || event.type === "shield") &&
          event.sourceId === "ivankov",
      );

      expect(
        result.events.find(
          (event) => event.type === "cast" && event.sourceId === "ivankov",
        ),
      ).toMatchObject({ targetIds: ["injured-ally"] });
      expect(supportEvents).toMatchObject([
        { type: "heal", targetId: "injured-ally", amount: 260 },
        { type: "shield", targetId: "injured-ally", amount: 120 },
      ]);
      expect(
        result.events.some(
          (event) =>
            (event.type === "damage" ||
              event.type === "status" ||
              event.type === "unit-displace") &&
            event.sourceId === "ivankov",
        ),
      ).toBe(false);
    },
  );

  it("heals without shielding above 50% pre-heal health", () => {
    const content = clonedContent();
    const result = runIvankovEmergency(content, 499);

    expect(
      result.events.filter(
        (event) => event.type === "heal" && event.sourceId === "ivankov",
      ),
    ).toMatchObject([{ targetId: "injured-ally", amount: 260 }]);
    expect(
      result.events.some(
        (event) => event.type === "shield" && event.sourceId === "ivankov",
      ),
    ).toBe(false);
  });

  it("replays the threshold heal and shield deterministically", () => {
    const content = clonedContent();
    const first = runIvankovEmergency(content, 500, "ivankov-determinism");
    const second = runIvankovEmergency(content, 500, "ivankov-determinism");

    expect(first).toEqual(second);
  });
});

describe("Jinbe Fish-Man Shockwave", () => {
  it("damages the adjacent set before deterministic survivor knockback", () => {
    const content = clonedContent();
    configureCombatant(content, "jinbe", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { defense: 40 });
    configureCombatant(content, "nami", { health: 255 });
    const battle = () =>
      runSingleTick(
        content,
        "jinbe",
        [
          setupUnit("a-zero", "chopper", 3, 2),
          setupUnit("b-forty", "marine-recruit", 3, 3),
          setupUnit("z-dead", "nami", 3, 1),
        ],
        { seed: "jinbe-adjacent-knockback" },
      );

    const first = battle();
    const second = battle();
    const lastDamageIndex = first.events.findLastIndex(
      (event) => event.type === "damage" && event.sourceId === "jinbe",
    );
    const firstDisplacementIndex = first.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "jinbe",
    );

    expect(abilityDamage(first, "jinbe")).toMatchObject([
      { targetId: "a-zero", amount: 255 },
      { targetId: "b-forty", amount: 182 },
      { targetId: "z-dead", amount: 255 },
    ]);
    expect(displacements(first, "jinbe")).toMatchObject([
      {
        unitId: "a-zero",
        abilityId: "fish-man-shockwave",
        movementKind: "knockback",
      },
      {
        unitId: "b-forty",
        abilityId: "fish-man-shockwave",
        movementKind: "knockback",
      },
    ]);
    expect(
      displacements(first, "jinbe").some((event) => event.unitId === "z-dead"),
    ).toBe(false);
    expect(lastDamageIndex).toBeLessThan(firstDisplacementIndex);
    expect(first).toEqual(second);
  });

  it("keeps damage when every knockback destination is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "jinbe", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { range: 100 });
    const result = runSingleTick(
      content,
      "jinbe",
      [setupUnit("target", "chopper", 6, 3)],
      {
        allies: [
          setupUnit("horizontal-blocker", "marine-recruit", 7, 3),
          setupUnit("vertical-blocker", "marine-recruit", 6, 4),
        ],
        sourcePosition: { x: 1, y: 3 },
      },
    );

    expect(abilityDamage(result, "jinbe")).toMatchObject([
      { targetId: "target", amount: 255 },
    ]);
    expect(displacements(result, "jinbe")).toHaveLength(0);
  });
});

describe("Kuma Ursus Shock", () => {
  it("damages every enemy before deterministic survivor knockback", () => {
    const content = clonedContent();
    configureCombatant(content, "kuma", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "nami", { health: 145 });
    const battle = () =>
      runSingleTick(
        content,
        "kuma",
        [
          setupUnit("a-horizontal", "chopper", 4, 2),
          setupUnit("b-vertical", "chopper", 2, 4),
          setupUnit("z-dead", "nami", 4, 4),
        ],
        { seed: "kuma-global-knockback", sourcePosition: { x: 2, y: 2 } },
      );

    const first = battle();
    const second = battle();
    const lastDamageIndex = first.events.findLastIndex(
      (event) => event.type === "damage" && event.sourceId === "kuma",
    );
    const firstDisplacementIndex = first.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "kuma",
    );

    expect(abilityDamage(first, "kuma")).toMatchObject([
      { targetId: "a-horizontal", amount: 145 },
      { targetId: "b-vertical", amount: 145 },
      { targetId: "z-dead", amount: 145 },
    ]);
    expect(displacements(first, "kuma")).toMatchObject([
      {
        unitId: "a-horizontal",
        abilityId: "ursus-shock",
        movementKind: "knockback",
        to: { x: 5, y: 2 },
      },
      {
        unitId: "b-vertical",
        abilityId: "ursus-shock",
        movementKind: "knockback",
        to: { x: 2, y: 5 },
      },
    ]);
    expect(
      displacements(first, "kuma").some((event) => event.unitId === "z-dead"),
    ).toBe(false);
    expect(statuses(first, "kuma")).toHaveLength(0);
    expect(lastDamageIndex).toBeLessThan(firstDisplacementIndex);
    expect(first).toEqual(second);
  });

  it("keeps global damage for blocked and out-of-board targets", () => {
    const content = clonedContent();
    configureCombatant(content, "kuma", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { range: 100 });
    const result = runSingleTick(
      content,
      "kuma",
      [
        setupUnit("blocked", "chopper", 6, 3),
        setupUnit("edge", "chopper", 7, 5),
      ],
      {
        allies: [
          setupUnit("horizontal-blocker", "marine-recruit", 7, 3),
          setupUnit("vertical-blocker", "marine-recruit", 6, 4),
        ],
        sourcePosition: { x: 1, y: 3 },
      },
    );

    expect(abilityDamage(result, "kuma")).toMatchObject([
      { targetId: "blocked", amount: 145 },
      { targetId: "edge", amount: 145 },
    ]);
    expect(displacements(result, "kuma")).toHaveLength(0);
    expect(result.finalUnits.find((unit) => unit.id === "blocked")).toMatchObject({
      x: 6,
      y: 3,
    });
    expect(result.finalUnits.find((unit) => unit.id === "edge")).toMatchObject({
      x: 7,
      y: 5,
    });
  });
});

describe("Kizaru Sacred Jewel", () => {
  it("uses farthest line targeting and exact generic 40% Defense Pierce", () => {
    const content = clonedContent();
    configureCombatant(content, "kizaru", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { defense: 40 });
    const battle = () =>
      runSingleTick(
        content,
        "kizaru",
        [
          setupUnit("a-zero", "chopper", 4, 2),
          setupUnit("b-farthest-forty", "marine-recruit", 6, 2),
          setupUnit("z-outside", "chopper", 3, 4),
        ],
        { seed: "kizaru-defense-pierce" },
      );

    const first = battle();
    const second = battle();
    expect(
      first.events.find(
        (event) => event.type === "cast" && event.sourceId === "kizaru",
      ),
    ).toMatchObject({ targetIds: ["a-zero", "b-farthest-forty"] });
    expect(abilityDamage(first, "kizaru")).toMatchObject([
      { targetId: "a-zero", amount: 420 },
      { targetId: "b-farthest-forty", amount: 338 },
    ]);
    expect(first.finalUnits.find((unit) => unit.id === "z-outside"))
      .toMatchObject({ hp: 1_000 });
    expect(first.finalUnits.find((unit) => unit.id === "b-farthest-forty"))
      .toMatchObject({ defense: 40 });
    expect(combatDefinition(content, "marine-recruit").stats.defense).toBe(40);
    expect(statuses(first, "kizaru")).toHaveLength(0);
    expect(displacements(first, "kizaru")).toHaveLength(0);
    expect(
      first.events.some(
        (event) =>
          event.type === "damage" &&
          event.sourceId === "kizaru" &&
          event.damageKind === "burn",
      ),
    ).toBe(false);
    expect(first).toEqual(second);
  });

  it("keeps normal attacks on full Defense", () => {
    const content = clonedContent();
    configureCombatant(content, "kizaru", { attack: 100, range: 10 });
    configureCombatant(content, "marine-recruit", { defense: 40 });
    const result = runSingleTick(
      content,
      "kizaru",
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
          event.sourceId === "kizaru" &&
          event.damageKind === "attack",
      ),
    ).toMatchObject([{ targetId: "target", amount: 71 }]);
  });
});
