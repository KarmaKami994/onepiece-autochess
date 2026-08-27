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
  type TraitEffect,
} from "../../game";

type DamageEvent = Extract<BattleEvent, { type: "damage" }>;
type EnergyEvent = Extract<BattleEvent, { type: "energy" }>;

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
}

function definition(content: GameContent, id: string) {
  const result = content.units.find((unit) => unit.id === id);
  if (!result) throw new Error(`Missing ${id} definition`);
  return result;
}

function configureEnemy(
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
    range: 0,
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
        traitId: "nami-energy-drain-test",
        count: 1,
        tierIndex: 0,
        tier: { required: 1, label: "Nami energy drain test", effects },
      }];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return { id, units, activeTraits: activeEffects(...effects) };
}

function runNamiBattle(
  content: GameContent,
  enemies: BattleSetupUnit[],
  options: { enemyEnergy?: number; seed?: string } = {},
): BattleResult {
  const enemyEffects = options.enemyEnergy === undefined
    ? []
    : [{ kind: "starting-energy", value: options.enemyEnergy } as const];
  return simulateBattle(
    team(
      "a",
      [setupUnit("nami", "nami", 2, 2)],
      [{ kind: "starting-energy", value: 100 }],
    ),
    team("b", enemies, enemyEffects),
    { seed: options.seed ?? "nami-thunderbolt-tempo", maxTicks: 1 },
    content,
  );
}

function abilityDamage(result: BattleResult): DamageEvent[] {
  return result.events.filter(
    (event): event is DamageEvent =>
      event.type === "damage" &&
      event.sourceId === "nami" &&
      event.damageKind === "ability",
  );
}

function targetEnergy(result: BattleResult, targetId: string): EnergyEvent[] {
  return result.events.filter(
    (event): event is EnergyEvent =>
      event.type === "energy" && event.unitId === targetId,
  );
}

function drains(result: BattleResult): EnergyEvent[] {
  return result.events.filter(
    (event): event is EnergyEvent =>
      event.type === "energy" && event.reason === "ability-drain",
  );
}

describe("Nami Thunderbolt Tempo energy drain", () => {
  it("declares the drain without changing Nami's numbers or save schema", () => {
    const nami = definition(DEFAULT_CONTENT, "nami");

    expect(nami).toMatchObject({
      cost: 1,
      traits: ["straw-hat", "specialist"],
      stats: {
        health: 520,
        attack: 42,
        defense: 12,
        range: 4,
        attackIntervalMs: 1_300,
        moveIntervalMs: 500,
      },
      ability: {
        id: "thunderbolt-tempo",
        name: "Thunderbolt Tempo",
        power: 145,
        targeting: "nearest-enemy",
        pattern: "adjacent",
        energyDrain: 15,
      },
    });
    expect(DEFAULT_CONTENT.version).toBe("1.7.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(JSON.parse(JSON.stringify(nami.ability))).toEqual(nami.ability);
  });

  it("deals 145 damage, grants damaged Energy, then drains 15", () => {
    const content = clonedContent();
    configureEnemy(content, "chopper");

    const result = runNamiBattle(
      content,
      [setupUnit("target", "chopper", 3, 2)],
      { enemyEnergy: 40 },
    );
    const relevant = result.events.filter(
      (event) =>
        (event.type === "damage" && event.targetId === "target") ||
        (event.type === "energy" && event.unitId === "target"),
    );

    expect(relevant).toMatchObject([
      { type: "damage", amount: 145, damageKind: "ability" },
      { type: "energy", amount: 5, value: 45, reason: "damaged" },
      { type: "energy", amount: -15, value: 30, reason: "ability-drain" },
    ]);
    expect(result.finalUnits.find((unit) => unit.id === "target")?.energy).toBe(
      30,
    );
  });

  it("emits the effective clamped delta when less than 15 Energy remains", () => {
    const content = clonedContent();
    configureEnemy(content, "chopper");

    const result = runNamiBattle(
      content,
      [setupUnit("target", "chopper", 3, 2)],
      { enemyEnergy: 5 },
    );

    expect(targetEnergy(result, "target")).toMatchObject([
      { amount: 5, value: 10, reason: "damaged" },
      { amount: -10, value: 0, reason: "ability-drain" },
    ]);
  });

  it("does not emit a zero-delta drain when resolution finds zero Energy", () => {
    const content = clonedContent();
    configureEnemy(content, "chopper");
    definition(content, "nami").ability.effect = "shield";

    const result = runNamiBattle(content, [
      setupUnit("target", "chopper", 3, 2),
    ]);

    expect(result.finalUnits.find((unit) => unit.id === "target")?.energy).toBe(
      0,
    );
    expect(drains(result)).toHaveLength(0);
  });

  it("does not drain dead targets or enemies outside the original target set", () => {
    const content = clonedContent();
    configureEnemy(content, "chopper", 145);

    const result = runNamiBattle(
      content,
      [
        setupUnit("a-victim", "chopper", 3, 2),
        setupUnit("b-unrelated", "chopper", 5, 2),
      ],
      { enemyEnergy: 40 },
    );

    expect(abilityDamage(result).map((event) => event.targetId)).toEqual([
      "a-victim",
    ]);
    expect(drains(result)).toHaveLength(0);
    expect(
      result.finalUnits.find((unit) => unit.id === "b-unrelated")?.energy,
    ).toBe(40);
  });

  it("drains every surviving AoE target after all damage and remains deterministic", () => {
    const content = clonedContent();
    configureEnemy(content, "chopper");
    const battle = () =>
      runNamiBattle(
        content,
        [
          setupUnit("a-primary", "chopper", 3, 2),
          setupUnit("b-adjacent", "chopper", 4, 2),
          setupUnit("c-unrelated", "chopper", 6, 2),
        ],
        { enemyEnergy: 40, seed: "nami-aoe-determinism" },
      );

    const first = battle();
    const second = battle();
    const firstDrainIndex = first.events.findIndex(
      (event) => event.type === "energy" && event.reason === "ability-drain",
    );
    const lastDamagedEnergyIndex = first.events.findLastIndex(
      (event) => event.type === "energy" && event.reason === "damaged",
    );

    expect(abilityDamage(first).map((event) => event.targetId)).toEqual([
      "a-primary",
      "b-adjacent",
    ]);
    expect(drains(first)).toMatchObject([
      { unitId: "a-primary", amount: -15, value: 30 },
      { unitId: "b-adjacent", amount: -15, value: 30 },
    ]);
    expect(lastDamagedEnergyIndex).toBeLessThan(firstDrainIndex);
    expect(
      first.finalUnits.find((unit) => unit.id === "c-unrelated")?.energy,
    ).toBe(40);
    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(drains(first)))).toEqual(drains(first));
  });

  it.each([undefined, 0, -15, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "ignores invalid energyDrain configuration %s",
    (energyDrain) => {
      const content = clonedContent();
      configureEnemy(content, "chopper");
      definition(content, "nami").ability.energyDrain = energyDrain;

      const result = runNamiBattle(
        content,
        [setupUnit("target", "chopper", 3, 2)],
        { enemyEnergy: 40 },
      );

      expect(drains(result)).toHaveLength(0);
      expect(targetEnergy(result, "target")).toMatchObject([
        { amount: 5, value: 45, reason: "damaged" },
      ]);
    },
  );
});
