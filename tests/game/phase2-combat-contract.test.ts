import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  applyCommand,
  createMatch,
  simulateBattle,
  type ActiveTrait,
  type BattleSetupUnit,
  type BattleTeam,
  type GameContent,
} from "../../game";

function clonedContent(): GameContent {
  return structuredClone(DEFAULT_CONTENT);
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

function team(
  id: string,
  units: BattleSetupUnit[],
  activeTraits: ActiveTrait[] = [],
): BattleTeam {
  return { id, units, activeTraits };
}

function makeDurableFastAttacker(
  content: GameContent,
  definitionId: string,
  range: number,
): void {
  const definition = content.units.find((unit) => unit.id === definitionId);
  if (!definition) throw new Error(`Missing ${definitionId} definition`);
  definition.stats = {
    health: 100_000,
    attack: 1,
    defense: 0,
    range,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
  };
}

describe("Phase 2 combat rules from the vertical-slice contract", () => {
  it("pathfinds deterministically around a friendly wall instead of oscillating at it", () => {
    const content = clonedContent();
    makeDurableFastAttacker(content, "tashigi", 1);
    makeDurableFastAttacker(content, "usopp", 100);
    makeDurableFastAttacker(content, "chopper", 100);

    const wall = Array.from({ length: 7 }, (_, x) =>
      setupUnit(`wall-${x}`, "usopp", x, 4),
    );
    const teamA = team("a", [
      setupUnit("runner", "tashigi", 3, 5),
      ...wall,
    ]);
    const teamB = team("b", [setupUnit("target", "chopper", 3, 0)]);

    const first = simulateBattle(
      teamA,
      teamB,
      { seed: "path-around-wall", maxTicks: 12 },
      content,
    );
    const second = simulateBattle(
      teamA,
      teamB,
      { seed: "path-around-wall", maxTicks: 12 },
      content,
    );
    const runnerMoves = first.events.filter(
      (event) => event.type === "unit-move" && event.unitId === "runner",
    );

    expect(first).toEqual(second);
    expect(runnerMoves.length).toBeGreaterThan(0);
    expect(
      runnerMoves.some(
        (event) => event.type === "unit-move" && event.to.y <= 3,
      ),
      "the runner should route through the gap at x=7 and cross the wall",
    ).toBe(true);
  });

  it("breaks symmetric shortest-path ties by stable board coordinates", () => {
    const content = clonedContent();
    makeDurableFastAttacker(content, "tashigi", 1);
    makeDurableFastAttacker(content, "usopp", 100);
    makeDurableFastAttacker(content, "chopper", 100);

    const result = simulateBattle(
      team("a", [
        setupUnit("runner", "tashigi", 3, 5),
        setupUnit("blocker", "usopp", 3, 4),
      ]),
      team("b", [setupUnit("target", "chopper", 3, 1)]),
      { seed: "symmetric-path-tie", maxTicks: 1 },
      content,
    );
    const firstMove = result.events.find(
      (event) => event.type === "unit-move" && event.unitId === "runner",
    );

    expect(firstMove).toMatchObject({
      type: "unit-move",
      from: { x: 3, y: 5 },
      to: { x: 2, y: 5 },
    });
  });

  it("targets a ray from caster through the primary target, not the target's full cross", () => {
    const content = clonedContent();
    const smoker = content.units.find((unit) => unit.id === "smoker");
    if (!smoker) throw new Error("Missing smoker definition");
    smoker.ability.power = 1;

    const fullEnergy: ActiveTrait = {
      traitId: "test-full-energy",
      count: 1,
      tierIndex: 0,
      tier: {
        required: 1,
        label: "Start ready",
        effects: [{ kind: "starting-energy", value: 100 }],
      },
    };
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("caster", "smoker", 0, 5)],
        [fullEnergy],
      ),
      team("b", [
        setupUnit("primary", "chopper", 0, 2),
        setupUnit("behind-primary", "chopper", 0, 0),
        setupUnit("perpendicular", "chopper", 5, 2),
      ]),
      { seed: "line-ray", maxTicks: 1 },
      content,
    );
    const cast = result.events.find(
      (event) => event.type === "cast" && event.sourceId === "caster",
    );

    expect(cast?.type).toBe("cast");
    if (!cast || cast.type !== "cast") return;
    expect(cast.targetIds).toEqual(["behind-primary", "primary"]);
    expect(cast.targetIds).not.toContain("perpendicular");
  });

  it("keeps diagonal line casts thin when the ray crosses exact grid corners", () => {
    const content = clonedContent();
    const smoker = content.units.find((unit) => unit.id === "smoker");
    if (!smoker) throw new Error("Missing smoker definition");
    smoker.ability.power = 1;

    const fullEnergy: ActiveTrait = {
      traitId: "test-full-energy",
      count: 1,
      tierIndex: 0,
      tier: {
        required: 1,
        label: "Start ready",
        effects: [{ kind: "starting-energy", value: 100 }],
      },
    };
    const result = simulateBattle(
      team(
        "a",
        [setupUnit("caster", "smoker", 0, 5)],
        [fullEnergy],
      ),
      team("b", [
        setupUnit("primary-diagonal", "chopper", 2, 3),
        setupUnit("behind-diagonal", "chopper", 4, 1),
        setupUnit("corner-side", "chopper", 3, 3),
      ]),
      { seed: "diagonal-line-corner", maxTicks: 1 },
      content,
    );
    const cast = result.events.find(
      (event) => event.type === "cast" && event.sourceId === "caster",
    );

    expect(cast?.type).toBe("cast");
    if (!cast || cast.type !== "cast") return;
    expect(cast.targetIds).toEqual([
      "behind-diagonal",
      "primary-diagonal",
    ]);
    expect(cast.targetIds).not.toContain("corner-side");
  });

  it("uses total remaining team HP over original team max HP, including dead units, at timeout", () => {
    const content = clonedContent();
    const garp = content.units.find((unit) => unit.id === "garp");
    const chopper = content.units.find((unit) => unit.id === "chopper");
    if (!garp || !chopper) throw new Error("Missing timeout test definitions");
    garp.stats = {
      health: 1_000,
      attack: 10_000,
      defense: 0,
      range: 10,
      attackIntervalMs: 100,
      moveIntervalMs: 100,
    };
    chopper.stats = {
      health: 100,
      attack: 1,
      defense: 0,
      range: 10,
      attackIntervalMs: 100,
      moveIntervalMs: 100,
    };

    const result = simulateBattle(
      team("a", [setupUnit("a-killer", "garp", 0, 5)]),
      team("b", [
        setupUnit("b-near", "chopper", 0, 0),
        setupUnit("b-far", "chopper", 7, 0),
      ]),
      { seed: "aggregate-health-timeout", maxTicks: 1 },
      content,
    );

    const aUnits = result.finalUnits.filter((unit) => unit.teamId === "a");
    const bUnits = result.finalUnits.filter((unit) => unit.teamId === "b");
    const remainingRatio = (units: typeof result.finalUnits) =>
      units.reduce((sum, unit) => sum + unit.hp, 0) /
      units.reduce((sum, unit) => sum + unit.maxHp, 0);

    expect(result.timedOut).toBe(true);
    expect(bUnits.some((unit) => unit.state === "dead")).toBe(true);
    expect(remainingRatio(aUnits)).toBeGreaterThan(remainingRatio(bUnits));
    expect(result.winner).toBe("a");
    expect(result.winnerId).toBe("a");
  });

  it("scales PvE loss damage with surviving enemy stars instead of the round number", () => {
    const damageWithEnemyCount = (enemyCount: number): number => {
      const content = clonedContent();
      content.config.recordBattleEvents = false;
      const firstStage = content.stages.find((stage) => stage.round === 1);
      if (!firstStage) throw new Error("Missing first PvE stage");
      firstStage.enemyWave = [
        { enemyId: "marine-recruit", count: enemyCount },
      ];

      const state = createMatch(`pve-survivors-${enemyCount}`, content);
      const battle = applyCommand(
        state,
        { type: "END_PREPARATION", playerId: "player-1" },
        content,
      );
      if (!battle.ok) throw new Error(battle.error.message);
      const humanResult = battle.state.lastResults.find(
        (result) => result.playerAId === "player-1",
      );
      if (!humanResult) throw new Error("Missing human PvE result");

      const resolved = advanceMatchPhase(battle.state, content);
      const human = resolved.players.find(
        (player) => player.id === "player-1",
      );
      if (!human) throw new Error("Missing human player");
      expect(DEFAULT_CONTENT.config.startHealth - human.hp).toBe(
        humanResult.playerADamage,
      );
      return humanResult.playerADamage;
    };

    const oneSurvivorDamage = damageWithEnemyCount(1);
    const threeSurvivorDamage = damageWithEnemyCount(3);

    expect(oneSurvivorDamage).toBe(2);
    expect(threeSurvivorDamage).toBe(4);
    expect(threeSurvivorDamage).toBeGreaterThan(oneSurvivorDamage);
  });
});
