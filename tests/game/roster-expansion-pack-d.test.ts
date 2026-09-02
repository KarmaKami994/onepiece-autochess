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
  type UnitDefinition,
} from "../../game";

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type DisplaceEvent = Extract<BattleEvent, { type: "unit-displace" }>;
type StatusEvent = Extract<BattleEvent, { type: "status" }>;

const PACK_D_IDS = ["koby", "koala", "franky", "brook"] as const;

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
  options: { defense?: number; health?: number; range?: number } = {},
): void {
  const unit = combatDefinition(content, id);
  unit.stats = {
    ...unit.stats,
    health: options.health ?? 1_000,
    attack: 1,
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

function startingEnergy(): ActiveTrait[] {
  return [
    {
      traitId: "roster-expansion-pack-d-test",
      count: 1,
      tierIndex: 0,
      tier: {
        required: 1,
        label: "Pack D test",
        effects: [{ kind: "starting-energy", value: 100 }],
      },
    },
  ];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  activeTraits: ActiveTrait[] = [],
): BattleTeam {
  return { id, units, activeTraits };
}

function runSingleTickCast(
  content: GameContent,
  sourceDefinitionId: string,
  enemies: BattleSetupUnit[],
  options: {
    allies?: BattleSetupUnit[];
    seed?: string;
    sourcePosition?: Position;
  } = {},
): BattleResult {
  const source = options.sourcePosition ?? { x: 1, y: 2 };
  return simulateBattle(
    team(
      "a",
      [
        setupUnit(sourceDefinitionId, sourceDefinitionId, source.x, source.y),
        ...(options.allies ?? []),
      ],
      startingEnergy(),
    ),
    team("b", enemies),
    { seed: options.seed ?? `${sourceDefinitionId}-pack-d`, maxTicks: 1 },
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

describe("Roster Expansion Pack D content", () => {
  it("declares the four locked units with no new mechanics", () => {
    expect(definition(DEFAULT_CONTENT, "koby")).toMatchObject({
      name: "Koby",
      cost: 1,
      traits: ["navy", "brawler"],
      stats: {
        health: 610,
        attack: 54,
        defense: 16,
        range: 1,
        attackIntervalMs: 1_050,
        moveIntervalMs: 400,
      },
      ability: {
        id: "shave-strike",
        name: "Shave Strike",
        power: 165,
        targeting: "nearest-enemy",
        pattern: "single",
        requiresTarget: false,
        signatureMechanics: [{ kind: "lunge" }],
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "koala")).toMatchObject({
      name: "Koala",
      cost: 1,
      traits: ["revolutionary", "brawler"],
      stats: {
        health: 560,
        attack: 50,
        defense: 14,
        range: 1,
        attackIntervalMs: 1_050,
        moveIntervalMs: 400,
      },
      ability: {
        id: "fish-man-karate",
        name: "Fish-Man Karate",
        power: 135,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        stunMs: 300,
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "franky")).toMatchObject({
      name: "Franky",
      cost: 2,
      traits: ["straw-hat", "guardian"],
      stats: {
        health: 860,
        attack: 66,
        defense: 30,
        range: 2,
        attackIntervalMs: 1_150,
        moveIntervalMs: 500,
      },
      ability: {
        id: "coup-de-vent",
        name: "Coup de Vent",
        power: 205,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        signatureMechanics: [{ kind: "knockback" }],
      },
      assetPath: "/assets/characters/placeholder.svg",
    });
    expect(definition(DEFAULT_CONTENT, "brook")).toMatchObject({
      name: "Brook",
      cost: 2,
      traits: ["straw-hat", "swordsman"],
      stats: {
        health: 660,
        attack: 72,
        defense: 18,
        range: 2,
        attackIntervalMs: 900,
        moveIntervalMs: 400,
      },
      ability: {
        id: "soul-solid",
        name: "Soul Solid",
        power: 215,
        targeting: "farthest-enemy",
        pattern: "line",
        stunMs: 400,
      },
      assetPath: "/assets/characters/placeholder.svg",
    });

    expect(definition(DEFAULT_CONTENT, "koby").ability.stunMs).toBeUndefined();
    expect(definition(DEFAULT_CONTENT, "koala").ability.signatureMechanics)
      .toBeUndefined();
    expect(definition(DEFAULT_CONTENT, "franky").ability.stunMs).toBeUndefined();
    expect(definition(DEFAULT_CONTENT, "brook").ability.signatureMechanics)
      .toBeUndefined();
    for (const id of PACK_D_IDS) {
      const packAbility = definition(DEFAULT_CONTENT, id).ability;
      expect(packAbility.burnPower).toBeUndefined();
      expect(packAbility.energyDrain).toBeUndefined();
      expect(packAbility.defensePiercePercent).toBeUndefined();
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
    expect(DEFAULT_CONTENT.version).toBe("1.16.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);

    const state = createMatch("pack-d-pool", DEFAULT_CONTENT);
    for (const id of PACK_D_IDS) {
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

describe("Koby Shave Strike", () => {
  it("reuses deterministic lunge and normal mitigated damage", () => {
    const content = clonedContent();
    configureCombatant(content, "koby");
    configureCombatant(content, "chopper", { defense: 40 });
    const battle = () =>
      runSingleTickCast(
        content,
        "koby",
        [setupUnit("target", "chopper", 3, 2)],
        { seed: "koby-lunge", sourcePosition: { x: 7, y: 5 } },
      );

    const first = battle();
    const second = battle();
    expect(abilityDamage(first, "koby")).toMatchObject([
      { targetId: "target", amount: 117 },
    ]);
    expect(displacements(first, "koby")).toMatchObject([
      {
        unitId: "koby",
        abilityId: "shave-strike",
        movementKind: "lunge",
        from: { x: 7, y: 5 },
        to: { x: 2, y: 1 },
      },
    ]);
    expect(first).toEqual(second);
  });

  it("preserves existing no-valid-lunge-cell behavior", () => {
    const content = clonedContent();
    configureCombatant(content, "koby");
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { range: 100 });
    const occupiedNeighbors = [
      [2, 1], [3, 1], [4, 1], [2, 2],
      [4, 2], [2, 3], [3, 3], [4, 3],
    ].map(([x, y], index) =>
      setupUnit(`block-${index}`, "marine-recruit", x, y),
    );

    const result = runSingleTickCast(
      content,
      "koby",
      [setupUnit("target", "chopper", 3, 2)],
      { allies: occupiedNeighbors, sourcePosition: { x: 7, y: 5 } },
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "cast", sourceId: "koby" }),
    );
    expect(displacements(result, "koby")).toHaveLength(0);
    expect(abilityDamage(result, "koby")).toHaveLength(0);
  });
});

describe("Koala Fish-Man Karate", () => {
  it("damages and stuns only the original adjacent set for 300ms", () => {
    const content = clonedContent();
    configureCombatant(content, "koala", { range: 10 });
    configureCombatant(content, "chopper");
    const battle = () =>
      runSingleTickCast(
        content,
        "koala",
        [
          setupUnit("a-primary", "chopper", 3, 2),
          setupUnit("b-adjacent", "chopper", 3, 3),
          setupUnit("z-outside", "chopper", 6, 5),
        ],
        { seed: "koala-adjacent-stun" },
      );

    const first = battle();
    const second = battle();
    expect(abilityDamage(first, "koala")).toMatchObject([
      { targetId: "a-primary", amount: 135 },
      { targetId: "b-adjacent", amount: 135 },
    ]);
    expect(statuses(first, "koala")).toMatchObject([
      { targetId: "a-primary", status: "stun", durationTicks: 3 },
      { targetId: "b-adjacent", status: "stun", durationTicks: 3 },
    ]);
    expect(displacements(first, "koala")).toHaveLength(0);
    expect(first).toEqual(second);
  });
});

describe("Franky Coup de Vent", () => {
  it("damages the original adjacent set before deterministic survivor knockback", () => {
    const content = clonedContent();
    configureCombatant(content, "franky", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { health: 205 });
    const battle = () =>
      runSingleTickCast(
        content,
        "franky",
        [
          setupUnit("a-survivor", "chopper", 3, 2),
          setupUnit("b-survivor", "chopper", 3, 3),
          setupUnit("z-dead", "marine-recruit", 3, 1),
        ],
        { seed: "franky-adjacent-knockback" },
      );

    const first = battle();
    const second = battle();
    const damageIndexes = first.events.flatMap((event, index) =>
      event.type === "damage" && event.sourceId === "franky" ? [index] : [],
    );
    const displacementIndexes = first.events.flatMap((event, index) =>
      event.type === "unit-displace" && event.sourceId === "franky"
        ? [index]
        : [],
    );

    expect(abilityDamage(first, "franky")).toMatchObject([
      { targetId: "a-survivor", amount: 205 },
      { targetId: "b-survivor", amount: 205 },
      { targetId: "z-dead", amount: 205 },
    ]);
    expect(displacements(first, "franky")).toMatchObject([
      {
        unitId: "a-survivor",
        abilityId: "coup-de-vent",
        movementKind: "knockback",
      },
      {
        unitId: "b-survivor",
        abilityId: "coup-de-vent",
        movementKind: "knockback",
      },
    ]);
    expect(
      displacements(first, "franky").some((event) => event.unitId === "z-dead"),
    ).toBe(false);
    expect(Math.max(...damageIndexes)).toBeLessThan(
      Math.min(...displacementIndexes),
    );
    expect(first).toEqual(second);
  });

  it("keeps damage when every knockback destination is blocked", () => {
    const content = clonedContent();
    configureCombatant(content, "franky", { range: 10 });
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { range: 100 });
    const result = runSingleTickCast(
      content,
      "franky",
      [setupUnit("target", "chopper", 6, 3)],
      {
        allies: [
          setupUnit("horizontal-blocker", "marine-recruit", 7, 3),
          setupUnit("vertical-blocker", "marine-recruit", 6, 4),
        ],
        sourcePosition: { x: 1, y: 3 },
      },
    );

    expect(abilityDamage(result, "franky")).toMatchObject([
      { targetId: "target", amount: 205 },
    ]);
    expect(displacements(result, "franky")).toHaveLength(0);
  });
});

describe("Brook Soul Solid", () => {
  it("uses the farthest enemy line and existing 400ms stun deterministically", () => {
    const content = clonedContent();
    configureCombatant(content, "brook", { range: 10 });
    configureCombatant(content, "chopper");
    const battle = () =>
      runSingleTickCast(
        content,
        "brook",
        [
          setupUnit("a-line", "chopper", 4, 2),
          setupUnit("b-farthest", "chopper", 6, 2),
          setupUnit("z-outside", "chopper", 3, 4),
        ],
        { seed: "brook-farthest-line" },
      );

    const first = battle();
    const second = battle();
    expect(
      first.events.find(
        (event) => event.type === "cast" && event.sourceId === "brook",
      ),
    ).toMatchObject({ targetIds: ["a-line", "b-farthest"] });
    expect(abilityDamage(first, "brook")).toMatchObject([
      { targetId: "a-line", amount: 215 },
      { targetId: "b-farthest", amount: 215 },
    ]);
    expect(statuses(first, "brook")).toMatchObject([
      { targetId: "a-line", status: "stun", durationTicks: 4 },
      { targetId: "b-farthest", status: "stun", durationTicks: 4 },
    ]);
    expect(
      first.events.some(
        (event) => event.type === "status" && event.status !== "stun",
      ),
    ).toBe(false);
    expect(displacements(first, "brook")).toHaveLength(0);
    expect(first).toEqual(second);
  });
});
