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

type AbilityHitEvent = Extract<BattleEvent, { type: "ability-hit" }>;
type DamageEvent = Extract<BattleEvent, { type: "damage" }>;

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
  health: number,
  range = 0,
): void {
  const unit = definition(content, id);
  unit.stats = {
    health,
    attack: 1,
    defense: 0,
    range,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
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
  return [{
    traitId: "zoro-sequence-test",
    count: 1,
    tierIndex: 0,
    tier: { required: 1, label: "Zoro sequence test", effects },
  }];
}

function team(
  id: string,
  units: BattleSetupUnit[],
  effects: TraitEffect[] = [],
): BattleTeam {
  return { id, units, activeTraits: activeEffects(...effects) };
}

function runZoroBattle(
  content: GameContent,
  enemies: BattleSetupUnit[],
  options: {
    zoroEffects?: TraitEffect[];
    enemyEffects?: TraitEffect[];
    seed?: string;
  } = {},
): BattleResult {
  return simulateBattle(
    team(
      "a",
      [setupUnit("zoro", "zoro", 2, 2)],
      options.zoroEffects ?? [{ kind: "starting-energy", value: 100 }],
    ),
    team("b", enemies, options.enemyEffects),
    { seed: options.seed ?? "zoro-oni-giri", maxTicks: 1 },
    content,
  );
}

function abilityHits(result: BattleResult, sourceId = "zoro"): AbilityHitEvent[] {
  return result.events.filter(
    (event): event is AbilityHitEvent =>
      event.type === "ability-hit" && event.sourceId === sourceId,
  );
}

function abilityDamage(
  result: BattleResult,
  sourceId = "zoro",
): DamageEvent[] {
  return result.events.filter(
    (event): event is DamageEvent =>
      event.type === "damage" &&
      event.damageKind === "ability" &&
      event.sourceId === sourceId,
  );
}

describe("Zoro Oni Giri sequential strikes", () => {
  it("declares the serializable three-strike content without changing save schema", () => {
    const zoro = definition(DEFAULT_CONTENT, "zoro");

    expect(zoro.ability).toMatchObject({
      id: "oni-giri",
      power: 355,
      targeting: "lowest-health-enemy",
      pattern: "single",
      sequentialStrike: {
        hitWeightsBasisPoints: [3_000, 3_000, 4_000],
        retargetOnKill: "nearest-in-range",
        finalHitBonus: {
          healthThresholdPercent: 35,
          damageBonusPercent: 25,
        },
      },
    });
    expect(zoro.ability.description).toContain("Strikes three times");
    expect(DEFAULT_CONTENT.version).toBe("1.17.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(JSON.parse(JSON.stringify(zoro.ability))).toEqual(zoro.ability);
  });

  it("emits three one-based hits whose normal raw budget remains 355", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 1_000);

    const result = runZoroBattle(content, [
      setupUnit("target", "chopper", 2, 1),
    ]);
    const hits = abilityHits(result);
    const damage = abilityDamage(result);

    expect(hits).toMatchObject([
      { hitIndex: 1, hitCount: 3, targetId: "target", finisher: false, tick: 1 },
      { hitIndex: 2, hitCount: 3, targetId: "target", finisher: false, tick: 1 },
      { hitIndex: 3, hitCount: 3, targetId: "target", finisher: false, tick: 1 },
    ]);
    expect(damage.map((event) => event.amount)).toEqual([106, 106, 143]);
    expect(damage.reduce((sum, event) => sum + event.amount, 0)).toBe(355);
    expect(
      result.events.filter(
        (event) =>
          event.type === "energy" &&
          event.unitId === "zoro" &&
          event.reason === "cast-reset",
      ),
    ).toHaveLength(1);
  });

  it("adds 25 percent raw damage to hit three at or below 35 percent HP", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 300);

    const result = runZoroBattle(
      content,
      [setupUnit("target", "chopper", 2, 1)],
      {
        enemyEffects: [{ kind: "emergency-shield-percent", value: 100 }],
      },
    );

    expect(abilityHits(result).map((event) => event.finisher)).toEqual([
      false,
      false,
      true,
    ]);
    expect(abilityDamage(result).map((event) => event.amount)).toEqual([
      106,
      106,
      178,
    ]);
  });

  it("does not activate the finisher above 35 percent HP", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 400);

    const result = runZoroBattle(content, [
      setupUnit("target", "chopper", 2, 1),
    ]);

    expect(abilityHits(result).map((event) => event.finisher)).toEqual([
      false,
      false,
      false,
    ]);
    expect(abilityDamage(result).map((event) => event.amount)).toEqual([
      106,
      106,
      143,
    ]);
  });

  it.each([
    { victimHealth: 100, targets: ["a-victim", "b-next", "b-next"] },
    { victimHealth: 150, targets: ["a-victim", "a-victim", "b-next"] },
  ])(
    "retargets after the current target dies with $victimHealth HP",
    ({ victimHealth, targets }) => {
      const content = clonedContent();
      configureUnit(content, "zoro", 10_000, 1);
      configureUnit(content, "chopper", victimHealth);
      configureUnit(content, "nami", 1_000);

      const result = runZoroBattle(content, [
        setupUnit("a-victim", "chopper", 2, 1),
        setupUnit("b-next", "nami", 1, 2),
      ]);

      expect(abilityHits(result).map((event) => event.targetId)).toEqual(targets);
    },
  );

  it("retargets the nearest living enemy still in effective range", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 100);
    configureUnit(content, "nami", 1_000);
    configureUnit(content, "usopp", 1_000);

    const result = runZoroBattle(
      content,
      [
        setupUnit("a-victim", "chopper", 2, 1),
        setupUnit("b-near", "nami", 1, 2),
        setupUnit("c-far", "usopp", 2, 0),
      ],
      {
        zoroEffects: [
          { kind: "starting-energy", value: 100 },
          { kind: "range-flat", value: 1 },
        ],
      },
    );

    expect(abilityHits(result).map((event) => event.targetId)).toEqual([
      "a-victim",
      "b-near",
      "b-near",
    ]);
  });

  it("breaks equal-distance retarget ties by unit id", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 100);
    configureUnit(content, "nami", 1_000);
    configureUnit(content, "usopp", 1_000);

    const result = runZoroBattle(
      content,
      [
        setupUnit("a-victim", "chopper", 2, 1),
        setupUnit("b-candidate", "nami", 0, 2),
        setupUnit("c-candidate", "usopp", 4, 2),
      ],
      {
        zoroEffects: [
          { kind: "starting-energy", value: 100 },
          { kind: "range-flat", value: 1 },
        ],
      },
    );

    expect(abilityHits(result).map((event) => event.targetId)).toEqual([
      "a-victim",
      "b-candidate",
      "b-candidate",
    ]);
  });

  it("stops without phantom hit events when no living enemy remains in range", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 100);
    configureUnit(content, "nami", 1_000);

    const result = runZoroBattle(content, [
      setupUnit("a-victim", "chopper", 2, 1),
      setupUnit("b-out-of-range", "nami", 2, 0),
    ]);

    expect(abilityHits(result).map((event) => event.targetId)).toEqual([
      "a-victim",
    ]);
    expect(abilityDamage(result)).toHaveLength(1);
  });

  it("keeps Luffy's generic hits as three full-power repeats", () => {
    const content = clonedContent();
    configureUnit(content, "luffy", 10_000, 2);
    configureUnit(content, "chopper", 1_000);

    const result = simulateBattle(
      team(
        "a",
        [setupUnit("luffy", "luffy", 2, 2)],
        [{ kind: "starting-energy", value: 100 }],
      ),
      team("b", [setupUnit("target", "chopper", 2, 1)]),
      { seed: "luffy-generic-hits", maxTicks: 1 },
      content,
    );

    expect(abilityDamage(result, "luffy").map((event) => event.amount)).toEqual([
      75,
      75,
      75,
    ]);
    expect(abilityHits(result, "luffy")).toHaveLength(0);
  });

  it("falls back safely when sequential strike weights are invalid", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 1_000);
    definition(content, "zoro").ability.sequentialStrike = {
      hitWeightsBasisPoints: [3_000, 3_000],
      retargetOnKill: "nearest-in-range",
    };

    const result = runZoroBattle(content, [
      setupUnit("target", "chopper", 2, 1),
    ]);

    expect(abilityHits(result)).toHaveLength(0);
    expect(abilityDamage(result).map((event) => event.amount)).toEqual([355]);
  });

  it("falls back when valid weights would allocate a zero-power strike", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 1_000);
    definition(content, "zoro").ability.power = 2;

    const result = runZoroBattle(content, [
      setupUnit("target", "chopper", 2, 1),
    ]);

    expect(abilityHits(result)).toHaveLength(0);
    expect(abilityDamage(result).map((event) => event.amount)).toEqual([2]);
  });

  it("replays identically and keeps every battle event JSON serializable", () => {
    const content = clonedContent();
    configureUnit(content, "zoro", 10_000, 1);
    configureUnit(content, "chopper", 100);
    configureUnit(content, "nami", 1_000);
    const battle = () =>
      runZoroBattle(
        content,
        [
          setupUnit("a-victim", "chopper", 2, 1),
          setupUnit("b-next", "nami", 1, 2),
        ],
        { seed: "zoro-deterministic-replay" },
      );

    const first = battle();
    const second = battle();

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first.events))).toEqual(first.events);
  });
});
