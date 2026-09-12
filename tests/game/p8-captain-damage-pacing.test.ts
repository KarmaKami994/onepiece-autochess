import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  CURRENT_SAVE_SCHEMA_VERSION,
  advanceMatchPhase,
  calculateLossDamage,
  createMatch,
  deserializeMatch,
  getStageDefinition,
  regenerateBattleResults,
  serializeMatch,
  type BattleUnitSnapshot,
  type GameContent,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
} from "../../game";
import {
  classifyCaptainDamageKind,
  nearestRank,
  summarizeCaptainDamagePacing,
  type CaptainDamagePacingMatchInput,
} from "../../scripts/run_production_soak";

function snapshot(
  id: string,
  teamId: string,
  options: Partial<BattleUnitSnapshot> = {},
): BattleUnitSnapshot {
  return {
    id,
    definitionId: "nami",
    teamId,
    star: 1,
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    shield: 0,
    energy: 0,
    maxEnergy: 100,
    attack: 10,
    defense: 10,
    range: 1,
    state: "seek",
    ...options,
  };
}

function player(state: MatchState, id: string): PlayerState {
  const found = state.players.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing player ${id}`);
  return found;
}

function setSoloUnit(
  target: PlayerState,
  definitionId: "nami" | "usopp",
  star: 1 | 2 | 3 = 1,
): void {
  const unitId = `${target.id}-${definitionId}`;
  target.units = {
    [unitId]: {
      id: unitId,
      definitionId,
      star,
      items: [],
      acquiredOrder: 1,
    },
  };
  target.board = { "0,0": unitId };
  target.bench = target.bench.map(() => null);
  target.isBot = false;
}

function deterministicCombatContent(): GameContent {
  return {
    ...DEFAULT_CONTENT,
    units: DEFAULT_CONTENT.units.map((definition) => {
      if (definition.id === "nami") {
        return {
          ...definition,
          stats: {
            ...definition.stats,
            health: 10_000,
            attack: 10_000,
            defense: 1_000,
            specialDefense: 1_000,
            attackIntervalMs: 100,
          },
        };
      }
      if (definition.id === "usopp") {
        return {
          ...definition,
          stats: {
            ...definition.stats,
            health: 1,
            attack: 1,
            defense: 0,
            specialDefense: 0,
            attackIntervalMs: 10_000,
          },
        };
      }
      return definition;
    }),
  };
}

function pairedBattle(
  round: number,
  options: { ghost?: boolean; strongPlayerA?: boolean } = {},
): MatchState {
  const state = createMatch(`p8-${round}-${JSON.stringify(options)}`);
  const playerA = player(state, "player-1");
  const playerB = player(state, "bot-1");
  state.players.forEach((candidate) => {
    candidate.alive = candidate.id === playerA.id || candidate.id === playerB.id;
    if (!candidate.alive) candidate.hp = 0;
  });
  setSoloUnit(
    playerA,
    options.strongPlayerA === false ? "usopp" : "nami",
  );
  setSoloUnit(
    playerB,
    options.strongPlayerA === false ? "nami" : "usopp",
  );
  state.round = round;
  state.stageId = getStageDefinition(round).id;
  state.phase = "battle";
  state.pairings = [
    {
      playerAId: playerA.id,
      playerBId: options.ghost ? null : playerB.id,
      ghostOfPlayerId: options.ghost ? playerB.id : null,
    },
  ];
  return regenerateBattleResults(state, deterministicCombatContent());
}

function frozenResult(
  playerId: string,
  damage: number,
): MatchBattleResult {
  return {
    playerAId: playerId,
    playerBId: null,
    ghostOfPlayerId: "bot-3",
    winnerId: "bot-3",
    timedOut: false,
    playerADamage: damage,
    playerBDamage: 0,
    durationTicks: 1,
    events: [],
    initialUnits: [],
    finalUnits: [],
  };
}

describe("P8 production pacing diagnostics", () => {
  it("classifies PvP, ghost, and PvE damage without inspecting gameplay state", () => {
    expect(classifyCaptainDamageKind("pvp", null)).toBe("pvp");
    expect(classifyCaptainDamageKind("pvp", "player-2")).toBe("ghost");
    expect(classifyCaptainDamageKind("pve", null)).toBe("pve");
  });

  it("uses deterministic nearest-rank percentiles", () => {
    const values = [7, 3, 5, 4];
    expect(nearestRank(values, 0.5)).toBe(4);
    expect(nearestRank(values, 0.9)).toBe(7);
    expect(nearestRank(values, 0.95)).toBe(7);
    expect(nearestRank([], 0.5)).toBe(0);
    expect(values).toEqual([7, 3, 5, 4]);
  });

  it("aggregates damage, eliminations, and stage reach deterministically without mutation", () => {
    const matches: CaptainDamagePacingMatchInput[] = [
      {
        damageEvents: [
          { round: 5, kind: "pvp", damage: 3 },
          { round: 5, kind: "ghost", damage: 4 },
          { round: 6, kind: "pve", damage: 5 },
        ],
        eliminationsByRound: { "5": 2, "6": 1 },
        stageReachRounds: [22, 24],
      },
      {
        damageEvents: [{ round: 8, kind: "pvp", damage: 7 }],
        eliminationsByRound: { "8": 1 },
        stageReachRounds: [22],
      },
    ];
    const before = structuredClone(matches);

    const first = summarizeCaptainDamagePacing(matches);
    const second = summarizeCaptainDamagePacing(matches);

    expect(first).toEqual(second);
    expect(matches).toEqual(before);
    expect(first).toMatchObject({
      damageEvents: 4,
      totalDamage: 19,
      averageDamage: 4.75,
      maxSingleLossDamage: 7,
      damageP50: 4,
      damageP90: 7,
      damageP95: 7,
      firstEliminationRound: {
        min: 5,
        max: 8,
        average: 6.5,
        median: 5,
      },
      eliminationsByRound: { "5": 2, "6": 1, "8": 1 },
    });
    expect(first.byKind).toEqual({
      pvp: {
        damageEvents: 2,
        totalDamage: 10,
        averageDamage: 5,
        maxSingleLossDamage: 7,
      },
      ghost: {
        damageEvents: 1,
        totalDamage: 4,
        averageDamage: 4,
        maxSingleLossDamage: 4,
      },
      pve: {
        damageEvents: 1,
        totalDamage: 5,
        averageDamage: 5,
        maxSingleLossDamage: 5,
      },
    });
    expect(first.byRound).toEqual({
      "5": {
        damageEvents: 2,
        totalDamage: 7,
        averageDamage: 3.5,
        eliminations: 2,
      },
      "6": {
        damageEvents: 1,
        totalDamage: 5,
        averageDamage: 5,
        eliminations: 1,
      },
      "8": {
        damageEvents: 1,
        totalDamage: 7,
        averageDamage: 7,
        eliminations: 1,
      },
    });
    expect(first.stageReach).toMatchObject({
      "22": { matchesReached: 2, rate: 1 },
      "24": { matchesReached: 1, rate: 0.5 },
      "27": { matchesReached: 0, rate: 0 },
      "36": { matchesReached: 0, rate: 0 },
    });
  });
});

describe("P8 captain damage formula", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [9, 3],
    [10, 3],
    [20, 5],
    [22, 6],
    [24, 6],
    [28, 7],
    [32, 8],
    [34, 9],
    [36, 9],
  ])("uses round %i pressure %i with no survivors", (round, expected) => {
    expect(calculateLossDamage(round, "winner", [])).toBe(expected);
  });

  it("returns zero for no winner and counts only living positive-HP winner survivors", () => {
    const units = [
      snapshot("living-a", "winner"),
      snapshot("living-b", "winner", { star: 3 }),
      snapshot("dead-state", "winner", { state: "dead" }),
      snapshot("zero-hp", "winner", { hp: 0 }),
      snapshot("enemy", "loser"),
    ];
    expect(calculateLossDamage(20, null, units)).toBe(0);
    expect(calculateLossDamage(20, "winner", units)).toBe(7);
  });

  it("is independent of star level and other survivor properties", () => {
    const damageForStar = (star: 1 | 2 | 3) =>
      calculateLossDamage(10, "winner", [
        snapshot(`star-${star}`, "winner", {
          star,
          formId: "robin-demonio-fleur",
          items: ["phoenix-feather"],
          hp: 1,
          maxHp: 99_999,
          shield: 50_000,
          attack: 99_999,
          defense: 999,
        }),
      ]);
    expect(damageForStar(1)).toBe(4);
    expect(damageForStar(2)).toBe(4);
    expect(damageForStar(3)).toBe(4);
    expect(
      calculateLossDamage(10, "winner", [
        snapshot("one-star", "winner", { star: 1 }),
        snapshot("three-star", "winner", { star: 3 }),
      ]),
    ).toBe(5);
  });

  it("counts a successfully resurrected Phoenix once and a dead Phoenix zero times", () => {
    expect(
      calculateLossDamage(36, "winner", [
        snapshot("resurrected", "winner", {
          items: ["phoenix-feather"],
          hp: 500,
          state: "seek",
        }),
        snapshot("dead-phoenix", "winner", {
          items: ["phoenix-feather"],
          hp: 0,
          state: "dead",
        }),
      ]),
    ).toBe(10);
  });
});

describe("P8 battle-result integration", () => {
  it.each([
    [5, 3],
    [21, 7],
    [34, 10],
  ])(
    "applies round-scaled PvP damage and history at round %i",
    (round, expectedDamage) => {
      const battle = pairedBattle(round);
      const result = battle.lastResults[0];
      expect(result).toMatchObject({
        winnerId: "player-1",
        playerADamage: 0,
        playerBDamage: expectedDamage,
      });
      const beforeWinnerGold = player(battle, "player-1").gold;
      const beforeLoserGold = player(battle, "bot-1").gold;
      const resolved = advanceMatchPhase(battle, deterministicCombatContent());
      const winner = player(resolved, "player-1");
      const loser = player(resolved, "bot-1");
      expect(loser.hp).toBe(100 - expectedDamage);
      expect(winner.hp).toBe(100);
      expect(winner.winStreak).toBe(1);
      expect(loser.lossStreak).toBe(1);
      expect(winner.gold - beforeWinnerGold).toBe(
        loser.gold - beforeLoserGold + DEFAULT_CONTENT.config.pvpWinGold,
      );
      expect(winner.recentBattles.at(-1)).toMatchObject({
        captainDamageDealt: expectedDamage,
        captainDamageTaken: 0,
      });
      expect(loser.recentBattles.at(-1)).toMatchObject({
        captainDamageDealt: 0,
        captainDamageTaken: expectedDamage,
      });
    },
  );

  it("damages only the real player after a ghost loss and preserves ghost-owner state", () => {
    const battle = pairedBattle(21, {
      ghost: true,
      strongPlayerA: false,
    });
    const ownerBefore = structuredClone(player(battle, "bot-1"));
    expect(battle.lastResults[0]).toMatchObject({
      ghostOfPlayerId: "bot-1",
      winnerId: "bot-1",
      playerADamage: 7,
      playerBDamage: 0,
    });

    const resolved = advanceMatchPhase(battle, deterministicCombatContent());
    const fighter = player(resolved, "player-1");
    const owner = player(resolved, "bot-1");
    expect(fighter.hp).toBe(93);
    expect(fighter.recentBattles.at(-1)).toMatchObject({
      opponentId: "bot-1",
      isGhost: true,
      captainDamageDealt: 0,
      captainDamageTaken: 7,
    });
    expect(owner.hp).toBe(ownerBefore.hp);
    expect(owner.winStreak).toBe(ownerBefore.winStreak);
    expect(owner.lossStreak).toBe(ownerBefore.lossStreak);
    expect(owner.recentBattles).toEqual(ownerBefore.recentBattles);
    expect(owner.lastOpponents).toEqual(ownerBefore.lastOpponents);
  });

  it("never damages the ghost owner when the real player wins", () => {
    const battle = pairedBattle(21, { ghost: true });
    const ownerHp = player(battle, "bot-1").hp;
    expect(battle.lastResults[0]).toMatchObject({
      winnerId: "player-1",
      playerADamage: 0,
      playerBDamage: 0,
    });
    const resolved = advanceMatchPhase(battle, deterministicCombatContent());
    expect(player(resolved, "bot-1").hp).toBe(ownerHp);
  });

  it("applies normal damage for a timed-out winner and zero for a timed-out draw", () => {
    const wonOnTimeout = pairedBattle(21);
    wonOnTimeout.lastResults[0].timedOut = true;
    const resolvedWinner = advanceMatchPhase(
      wonOnTimeout,
      deterministicCombatContent(),
    );
    expect(player(resolvedWinner, "bot-1").hp).toBe(93);

    const drawnOnTimeout = pairedBattle(21);
    drawnOnTimeout.lastResults[0] = {
      ...drawnOnTimeout.lastResults[0],
      winnerId: null,
      timedOut: true,
      playerADamage: 0,
      playerBDamage: 0,
    };
    const resolvedDraw = advanceMatchPhase(
      drawnOnTimeout,
      deterministicCombatContent(),
    );
    expect(player(resolvedDraw, "player-1").hp).toBe(100);
    expect(player(resolvedDraw, "bot-1").hp).toBe(100);
    expect(player(resolvedDraw, "player-1").recentBattles.at(-1)?.outcome).toBe(
      "draw",
    );
  });

  it.each([
    [24, 9],
    [28, 10],
    [32, 11],
    [36, 15],
  ])("uses the same formula for a PvE loss at round %i", (round, expected) => {
    const state = createMatch(`p8-pve-loss-${round}`);
    state.round = round;
    state.stageId = getStageDefinition(round).id;
    state.phase = "battle";
    for (const candidate of state.players) {
      candidate.board = {};
      candidate.isBot = false;
    }
    const battle = regenerateBattleResults(state);
    expect(battle.lastResults[0]).toMatchObject({
      winnerId: null,
      playerADamage: expected,
      playerBDamage: 0,
    });
  });

  it("keeps PvE wins damage-free", () => {
    const state = createMatch("p8-pve-win");
    state.round = 24;
    state.stageId = getStageDefinition(24).id;
    state.phase = "battle";
    state.players.forEach((candidate) => {
      setSoloUnit(candidate, "nami", 3);
    });
    const content = deterministicCombatContent();
    const weakPveContent: GameContent = {
      ...content,
      enemies: content.enemies.map((enemy) => ({
        ...enemy,
        stats: {
          ...enemy.stats,
          health: 1,
          attack: 1,
          defense: 0,
          specialDefense: 0,
          attackIntervalMs: 10_000,
        },
      })),
    };
    const battle = regenerateBattleResults(state, weakPveContent);
    expect(battle.lastResults[0]).toMatchObject({
      winnerId: "player-1",
      playerADamage: 0,
      playerBDamage: 0,
    });
  });

  it("preserves simultaneous-elimination placement regardless of result order", () => {
    const resolve = (reverse: boolean) => {
      const state = createMatch(`p8-simultaneous-${reverse}`);
      state.round = 34;
      state.stageId = getStageDefinition(34).id;
      state.phase = "battle";
      const first = player(state, "player-1");
      const second = player(state, "bot-1");
      first.hp = 10;
      second.hp = 8;
      first.level = 6;
      second.level = 5;
      const results = [
        frozenResult(first.id, 14),
        frozenResult(second.id, 14),
      ];
      state.lastResults = reverse ? results.reverse() : results;
      return advanceMatchPhase(state);
    };
    const normal = resolve(false);
    const reversed = resolve(true);
    expect(player(normal, "player-1").placement).toBe(7);
    expect(player(normal, "bot-1").placement).toBe(8);
    expect(player(reversed, "player-1").placement).toBe(7);
    expect(player(reversed, "bot-1").placement).toBe(8);
  });

  it("preserves the P10 PvE and carousel topology", () => {
    expect(
      DEFAULT_CONTENT.stages
        .filter((stage) => stage.kind === "pve")
        .map((stage) => stage.round),
    ).toEqual([1, 2, 3, 9, 10, 14, 19, 20, 24, 28, 32, 36, 40]);
    expect(
      DEFAULT_CONTENT.stages
        .filter((stage) => stage.kind === "carousel")
        .map((stage) => stage.round),
    ).toEqual([4, 12, 17, 22, 27, 34]);
  });

  it("restores schema-6 saves without rewriting history and uses P8 for future battles", () => {
    const state = createMatch("p8-save-restore");
    state.round = 21;
    const human = player(state, "player-1");
    human.recentBattles = [
      {
        round: 19,
        opponentId: "bot-2",
        outcome: "loss",
        isGhost: false,
        captainDamageDealt: 0,
        captainDamageTaken: 17,
      },
    ];
    const restored = deserializeMatch(serializeMatch(state));
    expect(restored.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(restored.schemaVersion).toBe(6);
    expect(restored.contentVersion).toBe("1.29.0");
    expect(player(restored, "player-1").recentBattles).toEqual(
      human.recentBattles,
    );

    const restoredHuman = player(restored, "player-1");
    const opponent = player(restored, "bot-1");
    restored.players.forEach((candidate) => {
      candidate.alive =
        candidate.id === restoredHuman.id || candidate.id === opponent.id;
      if (!candidate.alive) candidate.hp = 0;
    });
    setSoloUnit(restoredHuman, "nami");
    setSoloUnit(opponent, "usopp");
    restored.phase = "battle";
    restored.stageId = getStageDefinition(21).id;
    restored.pairings = [
      {
        playerAId: restoredHuman.id,
        playerBId: opponent.id,
        ghostOfPlayerId: null,
      },
    ];
    const futureBattle = regenerateBattleResults(
      restored,
      deterministicCombatContent(),
    );
    expect(futureBattle.lastResults[0].playerBDamage).toBe(7);
    expect(player(futureBattle, "player-1").recentBattles).toEqual(
      human.recentBattles,
    );
  });
});
