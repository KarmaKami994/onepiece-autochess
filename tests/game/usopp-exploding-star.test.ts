import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  simulateBattle,
  type ActiveTrait,
  type BattleEvent,
  type BattleResult,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
  type Position,
  type TraitEffect,
} from "../../game";

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type DisplaceEvent = Extract<BattleEvent, { type: "unit-displace" }>;

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
}

function definition(content: GameContent, id: string) {
  const result = content.units.find((unit) => unit.id === id);
  if (!result) throw new Error(`Missing ${id} definition`);
  return result;
}

function configureUnit(
  content: GameContent,
  id: string,
  health = 1_000,
): void {
  const unit = definition(content, id);
  unit.stats = {
    ...unit.stats,
    health,
    attack: 1,
    defense: 0,
    range: 100,
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
    : [{
        traitId: "usopp-knockback-test",
        count: 1,
        tierIndex: 0,
        tier: { required: 1, label: "Usopp knockback test", effects },
      }];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return { id, units, activeTraits: activeEffects(...effects) };
}

function runUsoppBattle(
  content: GameContent,
  enemies: BattleSetupUnit[],
  allies: BattleSetupUnit[] = [],
  options: { seed?: string; sourcePosition?: Position } = {},
): BattleResult {
  const source = options.sourcePosition ?? { x: 2, y: 2 };
  return simulateBattle(
    team(
      "a",
      [setupUnit("usopp", "usopp", source.x, source.y), ...allies],
      [{ kind: "starting-energy", value: 100 }],
    ),
    team("b", enemies),
    { seed: options.seed ?? "usopp-exploding-star", maxTicks: 1 },
    content,
  );
}

function abilityDamage(result: BattleResult): DamageEvent[] {
  return result.events.filter(
    (event): event is DamageEvent =>
      event.type === "damage" &&
      event.damageKind === "ability" &&
      event.sourceId === "usopp",
  );
}

function knockbacks(result: BattleResult): DisplaceEvent[] {
  return result.events.filter(
    (event): event is DisplaceEvent =>
      event.type === "unit-displace" && event.movementKind === "knockback",
  );
}

describe("Usopp Exploding Star knockback", () => {
  it("declares knockback without changing Usopp's numbers or save schema", () => {
    const usopp = definition(DEFAULT_CONTENT, "usopp");

    expect(usopp).toMatchObject({
      cost: 1,
      traits: ["straw-hat", "marksman"],
      stats: {
        health: 500,
        attack: 52,
        defense: 10,
        range: 5,
        attackIntervalMs: 1_200,
        moveIntervalMs: 500,
      },
      ability: {
        id: "exploding-star",
        name: "Exploding Star",
        power: 160,
        targeting: "farthest-enemy",
        pattern: "adjacent",
        signatureMechanics: [{ kind: "knockback" }],
      },
    });
    expect(DEFAULT_CONTENT.version).toBe("1.8.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });

  it("deals the unchanged damage before moving a survivor one cell away", () => {
    const content = clonedContent();
    configureUnit(content, "chopper");

    const result = runUsoppBattle(content, [
      setupUnit("target", "chopper", 4, 2),
    ]);

    expect(abilityDamage(result)).toMatchObject([
      { targetId: "target", amount: 160 },
    ]);
    expect(knockbacks(result)).toEqual([
      expect.objectContaining({
        sourceId: "usopp",
        unitId: "target",
        abilityId: "exploding-star",
        movementKind: "knockback",
        from: { x: 4, y: 2 },
        to: { x: 5, y: 2 },
      }),
    ]);
    expect(result.finalUnits.find((unit) => unit.id === "target")).toMatchObject({
      x: 5,
      y: 2,
    });
  });

  it("does not displace a target killed by the ability", () => {
    const content = clonedContent();
    configureUnit(content, "chopper", 160);

    const result = runUsoppBattle(content, [
      setupUnit("target", "chopper", 4, 2),
    ]);

    expect(abilityDamage(result)).toHaveLength(1);
    expect(knockbacks(result)).toHaveLength(0);
  });

  it("uses the secondary away axis when the preferred cell is occupied", () => {
    const content = clonedContent();
    configureUnit(content, "chopper");
    configureUnit(content, "nami");

    const result = runUsoppBattle(
      content,
      [setupUnit("target", "chopper", 4, 3)],
      [setupUnit("blocker", "nami", 5, 3)],
    );

    expect(knockbacks(result)).toMatchObject([
      { unitId: "target", from: { x: 4, y: 3 }, to: { x: 4, y: 4 } },
    ]);
  });

  it("keeps damage when every away cell is blocked", () => {
    const content = clonedContent();
    configureUnit(content, "chopper");
    configureUnit(content, "nami");

    const result = runUsoppBattle(
      content,
      [setupUnit("target", "chopper", 6, 3)],
      [
        setupUnit("horizontal-blocker", "nami", 7, 3),
        setupUnit("vertical-blocker", "nami", 6, 4),
      ],
    );

    expect(abilityDamage(result)).toMatchObject([
      { targetId: "target", amount: 160 },
    ]);
    expect(knockbacks(result)).toHaveLength(0);
    expect(result.finalUnits.find((unit) => unit.id === "target")).toMatchObject({
      x: 6,
      y: 3,
    });
  });

  it("damages every AoE target before attempting each survivor's knockback", () => {
    const content = clonedContent();
    configureUnit(content, "chopper");

    const result = runUsoppBattle(content, [
      setupUnit("a-target", "chopper", 5, 2),
      setupUnit("b-target", "chopper", 5, 3),
    ]);
    const damageIndexes = result.events.flatMap((event, index) =>
      event.type === "damage" && event.sourceId === "usopp" ? [index] : [],
    );
    const displacementIndexes = result.events.flatMap((event, index) =>
      event.type === "unit-displace" && event.sourceId === "usopp" ? [index] : [],
    );

    expect(abilityDamage(result).map((event) => event.targetId)).toEqual([
      "a-target",
      "b-target",
    ]);
    expect(knockbacks(result)).toMatchObject([
      { unitId: "a-target", to: { x: 6, y: 2 } },
      { unitId: "b-target", to: { x: 6, y: 3 } },
    ]);
    expect(Math.max(...damageIndexes)).toBeLessThan(
      Math.min(...displacementIndexes),
    );
  });

  it("resolves destination collisions by unit id deterministically and serializes", () => {
    const content = clonedContent();
    configureUnit(content, "chopper");
    configureUnit(content, "nami");
    const battle = () =>
      runUsoppBattle(
        content,
        [
          setupUnit("a-first", "chopper", 2, 3),
          setupUnit("b-second", "chopper", 3, 2),
        ],
        [
          setupUnit("a-blocker", "nami", 2, 4),
          setupUnit("b-blocker", "nami", 4, 2),
        ],
        { seed: "usopp-collision-order", sourcePosition: { x: 0, y: 0 } },
      );

    const first = battle();
    const second = battle();

    expect(first).toEqual(second);
    expect(knockbacks(first)).toMatchObject([
      { unitId: "a-first", to: { x: 3, y: 3 } },
    ]);
    expect(first.finalUnits.find((unit) => unit.id === "b-second")).toMatchObject({
      x: 3,
      y: 2,
    });
    expect(JSON.parse(JSON.stringify(first.events))).toEqual(first.events);
  });
});
