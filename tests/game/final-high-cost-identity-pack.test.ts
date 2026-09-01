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
type EnergyEvent = Extract<BattleEvent, { type: "energy" }>;
type StatusEvent = Extract<BattleEvent, { type: "status" }>;

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
}

function definition(content: GameContent, id: string) {
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
    health?: number;
    attack?: number;
    defense?: number;
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
          traitId: "final-high-cost-identity-test",
          count: 1,
          tierIndex: 0,
          tier: {
            required: 1,
            label: "Final high-cost identity test",
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
    cast?: boolean;
    enemyEffects?: TraitEffect[];
    seed?: string;
    sourceEffects?: TraitEffect[];
    sourcePosition?: Position;
  } = {},
): BattleResult {
  const source = options.sourcePosition ?? { x: 2, y: 2 };
  const sourceEffects = [
    ...(options.cast === false
      ? []
      : [{ kind: "starting-energy", value: 100 } as const]),
    ...(options.sourceEffects ?? []),
  ];
  return simulateBattle(
    team(
      "a",
      [setupUnit(sourceDefinitionId, sourceDefinitionId, source.x, source.y)],
      sourceEffects,
    ),
    team("b", enemies, options.enemyEffects),
    { seed: options.seed ?? `${sourceDefinitionId}-high-cost`, maxTicks: 1 },
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

describe("Final high-cost identity content", () => {
  it("replaces Garp's stun with knockback without changing base values", () => {
    const garp = definition(DEFAULT_CONTENT, "garp");

    expect(garp).toMatchObject({
      cost: 5,
      traits: ["navy", "guardian", "brawler"],
      stats: {
        health: 1_250,
        attack: 110,
        defense: 45,
        range: 2,
        attackIntervalMs: 1_100,
        moveIntervalMs: 400,
      },
      ability: {
        id: "galaxy-impact",
        power: 360,
        targeting: "nearest-enemy",
        pattern: "all-enemies",
        castAnimationMs: 700,
        signatureMechanics: [{ kind: "knockback" }],
      },
    });
    expect(garp.ability.stunMs).toBeUndefined();
    expect(JSON.parse(JSON.stringify(garp.ability))).toEqual(garp.ability);
  });

  it("adds Mihawk's serializable ability-only Defense Pierce", () => {
    const mihawk = definition(DEFAULT_CONTENT, "mihawk");

    expect(mihawk).toMatchObject({
      cost: 5,
      traits: ["warlord", "swordsman"],
      stats: {
        health: 1_000,
        attack: 135,
        defense: 36,
        range: 3,
        attackIntervalMs: 900,
        moveIntervalMs: 400,
      },
      ability: {
        id: "black-blade-wave",
        power: 660,
        targeting: "farthest-enemy",
        pattern: "line",
        castAnimationMs: 700,
        defensePiercePercent: 50,
      },
    });
    expect(JSON.parse(JSON.stringify(mihawk.ability))).toEqual(mihawk.ability);
    expect(DEFAULT_CONTENT.version).toBe("1.16.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });
});

describe("Garp Galaxy Impact knockback", () => {
  it("damages every enemy before deterministic knockback without stunning", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { defense: 40 });
    const battle = () =>
      runSingleTick(
        content,
        "garp",
        [
          setupUnit("b-forty-defense", "marine-recruit", 2, 4),
          setupUnit("a-zero-defense", "chopper", 4, 2),
        ],
        { seed: "garp-global-knockback" },
      );

    const first = battle();
    const second = battle();
    const firstDisplacementIndex = first.events.findIndex(
      (event) => event.type === "unit-displace" && event.sourceId === "garp",
    );
    const lastDamageIndex = first.events.findLastIndex(
      (event) => event.type === "damage" && event.sourceId === "garp",
    );

    expect(abilityDamage(first, "garp")).toMatchObject([
      { targetId: "a-zero-defense", amount: 360 },
      { targetId: "b-forty-defense", amount: 257 },
    ]);
    expect(statuses(first, "garp")).toHaveLength(0);
    expect(displacements(first, "garp")).toMatchObject([
      {
        unitId: "a-zero-defense",
        abilityId: "galaxy-impact",
        movementKind: "knockback",
        from: { x: 4, y: 2 },
        to: { x: 5, y: 2 },
      },
      {
        unitId: "b-forty-defense",
        abilityId: "galaxy-impact",
        movementKind: "knockback",
        from: { x: 2, y: 4 },
        to: { x: 2, y: 5 },
      },
    ]);
    expect(lastDamageIndex).toBeLessThan(firstDisplacementIndex);
    expect(first).toEqual(second);
  });

  it("does not knock back an enemy killed by Galaxy Impact", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { health: 360 });
    configureCombatant(content, "marine-recruit");
    const result = runSingleTick(content, "garp", [
      setupUnit("a-dead", "chopper", 4, 2),
      setupUnit("b-survivor", "marine-recruit", 2, 4),
    ]);

    expect(abilityDamage(result, "garp")).toHaveLength(2);
    expect(displacements(result, "garp").map((event) => event.unitId)).toEqual([
      "b-survivor",
    ]);
  });

  it("keeps damage when a destination is blocked or outside the board", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTick(content, "garp", [
      setupUnit("a-blocked", "chopper", 6, 2),
      setupUnit("b-trigger", "chopper", 3, 2),
      setupUnit("z-edge", "chopper", 7, 2),
    ]);

    expect(
      abilityDamage(result, "garp").find(
        (event) => event.targetId === "a-blocked",
      ),
    ).toMatchObject({ amount: 360 });
    expect(
      displacements(result, "garp").some(
        (event) => event.unitId === "a-blocked" || event.unitId === "z-edge",
      ),
    ).toBe(false);
  });
});

describe("Mihawk Black Blade Wave Defense Pierce", () => {
  it("uses exact 50 percent Pierce math and remains deterministic", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { defense: 40 });
    const battle = () =>
      runSingleTick(content, "mihawk", [
        setupUnit("target", "chopper", 5, 2),
      ]);

    const first = battle();
    const second = battle();

    expect(abilityDamage(first, "mihawk")).toMatchObject([
      { targetId: "target", amount: 550 },
    ]);
    expect(first).toEqual(second);
  });

  it("leaves zero-Defense damage unchanged", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    const result = runSingleTick(content, "mihawk", [
      setupUnit("target", "chopper", 5, 2),
    ]);

    expect(abilityDamage(result, "mihawk")).toMatchObject([{ amount: 660 }]);
  });

  it("pierces each line target independently and ignores enemies outside it", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper");
    configureCombatant(content, "marine-recruit", { defense: 40 });
    const result = runSingleTick(content, "mihawk", [
      setupUnit("a-zero", "chopper", 3, 2),
      setupUnit("b-forty", "marine-recruit", 5, 2),
      setupUnit("c-outside", "chopper", 3, 3),
    ]);

    expect(abilityDamage(result, "mihawk")).toMatchObject([
      { targetId: "a-zero", amount: 660 },
      { targetId: "b-forty", amount: 550 },
    ]);
    expect(
      result.finalUnits.find((unit) => unit.id === "c-outside"),
    ).toMatchObject({ hp: 1_000, x: 3, y: 3 });
  });

  it("applies pierced mitigation before existing shield and Energy semantics", () => {
    const content = clonedContent();
    configureCombatant(content, "chopper", { defense: 40 });
    const result = runSingleTick(
      content,
      "mihawk",
      [setupUnit("target", "chopper", 5, 2)],
      { enemyEffects: [{ kind: "shield-flat", value: 100 }] },
    );
    const damagedEnergy = result.events.filter(
      (event): event is EnergyEvent =>
        event.type === "energy" &&
        event.unitId === "target" &&
        event.reason === "damaged",
    );

    expect(abilityDamage(result, "mihawk")).toMatchObject([
      { amount: 550, shieldDamage: 100, healthDamage: 450 },
    ]);
    expect(damagedEnergy).toMatchObject([{ amount: 5, value: 5 }]);
  });

  it.each([0, -1, 101, 1.5])(
    "treats invalid defensePiercePercent %s as no Pierce",
    (defensePiercePercent) => {
      const content = clonedContent();
      definition(content, "mihawk").ability.defensePiercePercent =
        defensePiercePercent;
      configureCombatant(content, "chopper", { defense: 40 });

      const result = runSingleTick(content, "mihawk", [
        setupUnit("target", "chopper", 5, 2),
      ]);

      expect(abilityDamage(result, "mihawk")).toMatchObject([
        { amount: 471 },
      ]);
    },
  );
});

describe("Generic ability Defense Pierce", () => {
  it("applies to an unrelated ability but not the same unit's normal attack", () => {
    const abilityContent = clonedContent();
    definition(abilityContent, "nami").ability.defensePiercePercent = 50;
    configureCombatant(abilityContent, "nami", { attack: 100, range: 3 });
    configureCombatant(abilityContent, "chopper", { defense: 40 });
    const abilityResult = runSingleTick(abilityContent, "nami", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    const attackContent = clonedContent();
    definition(attackContent, "nami").ability.defensePiercePercent = 50;
    configureCombatant(attackContent, "nami", { attack: 100, range: 3 });
    configureCombatant(attackContent, "chopper", { defense: 40 });
    const attackResult = runSingleTick(
      attackContent,
      "nami",
      [setupUnit("target", "chopper", 3, 2)],
      {
        cast: false,
        sourceEffects: [{ kind: "critical-chance-percent", value: -100 }],
      },
    );

    expect(abilityDamage(abilityResult, "nami")).toMatchObject([
      { amount: 120 },
    ]);
    expect(
      attackResult.events.filter(
        (event): event is DamageEvent =>
          event.type === "damage" && event.damageKind === "attack",
      ),
    ).toMatchObject([{ amount: 71 }]);
  });

  it("propagates Pierce through generic hits and sequential strikes", () => {
    const hitsContent = clonedContent();
    definition(hitsContent, "luffy").ability.defensePiercePercent = 50;
    configureCombatant(hitsContent, "chopper", { defense: 40 });
    const hitsResult = runSingleTick(hitsContent, "luffy", [
      setupUnit("target", "chopper", 3, 2),
    ]);

    const sequentialContent = clonedContent();
    definition(sequentialContent, "zoro").ability.defensePiercePercent = 50;
    configureCombatant(sequentialContent, "chopper", { defense: 40 });
    const sequentialResult = runSingleTick(sequentialContent, "zoro", [
      setupUnit("target", "chopper", 2, 1),
    ]);

    expect(
      abilityDamage(hitsResult, "luffy").map((event) => event.amount),
    ).toEqual([62, 62, 62]);
    expect(
      abilityDamage(sequentialResult, "zoro").map((event) => event.amount),
    ).toEqual([88, 88, 119]);
  });
});
