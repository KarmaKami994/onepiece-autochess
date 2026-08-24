import { describe, expect, it } from "vitest";
import {
  advanceMatchPhase,
  createMatch,
  getStageDefinition,
  planBotFormation,
  runBotTurn,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
  type StarLevel,
} from "../../game";

function resetCrew(player: PlayerState, level: number): void {
  player.level = level;
  player.gold = 0;
  player.shop = player.shop.map(() => null);
  player.board = {};
  player.bench = player.bench.map(() => null);
  player.units = {};
}

function addCrew(
  player: PlayerState,
  id: string,
  definitionId: string,
  acquiredOrder: number,
  star: StarLevel = 1,
): void {
  player.units[id] = {
    id,
    definitionId,
    star,
    items: [],
    acquiredOrder,
  };
}

function result(
  overrides: Partial<MatchBattleResult>,
): MatchBattleResult {
  return {
    playerAId: "player-1",
    playerBId: "bot-1",
    ghostOfPlayerId: null,
    winnerId: "player-1",
    timedOut: false,
    playerADamage: 0,
    playerBDamage: 5,
    durationTicks: 10,
    events: [],
    initialUnits: [],
    finalUnits: [],
    ...overrides,
  };
}

function preparePvpResolution(
  state: MatchState,
  round: number,
  battleResult: MatchBattleResult,
): MatchState {
  state.round = round;
  state.stageId = getStageDefinition(round).id;
  state.phase = "battle";
  state.lastResults = [battleResult];
  return state;
}

function adjacentPairs(
  positions: Array<{ x: number; y: number }>,
): number {
  let pairs = 0;
  for (let left = 0; left < positions.length; left += 1) {
    for (let right = left + 1; right < positions.length; right += 1) {
      const distance = Math.max(
        Math.abs(positions[left].x - positions[right].x),
        Math.abs(positions[left].y - positions[right].y),
      );
      if (distance <= 1) pairs += 1;
    }
  }
  return pairs;
}

describe("deterministic bot formation planning", () => {
  it("is pure, stable, and does not peek at current pairings", () => {
    const state = createMatch("formation-purity");
    const bot = state.players.find((player) => player.id === "bot-1")!;
    resetCrew(bot, 4);
    addCrew(bot, "crew-usopp", "usopp", 1);
    addCrew(bot, "crew-nami", "nami", 2);
    addCrew(bot, "crew-smoker", "smoker", 3);
    addCrew(bot, "crew-zoro", "zoro", 4);
    bot.board = {
      "0,3": "crew-usopp",
      "7,5": "crew-smoker",
    };
    bot.bench[0] = "crew-nami";
    bot.bench[1] = "crew-zoro";
    bot.lastOpponents = ["bot-2"];
    const rival = state.players.find((player) => player.id === "bot-2")!;
    resetCrew(rival, 2);
    addCrew(rival, "rival-luffy", "luffy", 1);
    rival.board = { "2,3": "rival-luffy" };
    const before = structuredClone(state);

    const first = planBotFormation(state, bot.id);
    const second = planBotFormation(state, bot.id);
    const withUnrelatedPairing = structuredClone(state);
    withUnrelatedPairing.pairings = [
      {
        playerAId: bot.id,
        playerBId: "bot-7",
        ghostOfPlayerId: null,
      },
    ];

    expect(first).toEqual(second);
    expect(planBotFormation(withUnrelatedPairing, bot.id)).toEqual(first);
    expect(state).toEqual(before);
    expect(state.rngState).toBe(before.rngState);
  });

  it("keeps ranged carries back, tanks forward, and sword users central", () => {
    const state = createMatch("formation-roles");
    const bot = state.players.find((player) => player.id === "bot-1")!;
    bot.personalityId = "balanced";
    resetCrew(bot, 4);
    addCrew(bot, "crew-usopp", "usopp", 1);
    addCrew(bot, "crew-nami", "nami", 2);
    addCrew(bot, "crew-smoker", "smoker", 3);
    addCrew(bot, "crew-zoro", "zoro", 4);
    bot.bench.splice(
      0,
      4,
      "crew-usopp",
      "crew-nami",
      "crew-smoker",
      "crew-zoro",
    );

    const byUnit = new Map(
      planBotFormation(state, bot.id).map((placement) => [
        placement.unitId,
        placement.position,
      ]),
    );

    expect(byUnit.get("crew-usopp")?.y).toBe(5);
    expect(byUnit.get("crew-nami")?.y).toBe(5);
    expect(byUnit.get("crew-smoker")?.y).toBe(3);
    expect(byUnit.get("crew-zoro")?.y).toBe(4);
  });

  it("preserves the frontline personality as a deterministic row bias", () => {
    const state = createMatch("formation-frontline-personality");
    const bot = state.players.find((player) => player.id === "bot-1")!;
    resetCrew(bot, 1);
    addCrew(bot, "crew-law", "law", 1);
    bot.bench[0] = "crew-law";
    bot.personalityId = "balanced";
    const balanced = planBotFormation(state, bot.id);
    bot.personalityId = "vanguard";
    const vanguard = planBotFormation(state, bot.id);

    expect(balanced[0].position.y).toBe(4);
    expect(vanguard[0].position.y).toBe(3);
  });

  it("spreads against the last living opponent's line and area threats", () => {
    const base = createMatch("formation-threat-response");
    const bot = base.players.find((player) => player.id === "bot-2")!;
    bot.personalityId = "treasurer";
    resetCrew(bot, 4);
    addCrew(bot, "crew-ace", "ace", 1);
    addCrew(bot, "crew-nami", "nami", 2);
    addCrew(bot, "crew-robin", "robin", 3);
    addCrew(bot, "crew-usopp", "usopp", 4);
    bot.bench.splice(
      0,
      4,
      "crew-ace",
      "crew-nami",
      "crew-robin",
      "crew-usopp",
    );
    const unscouted = planBotFormation(base, bot.id);

    const scouted = structuredClone(base);
    const scoutedBot = scouted.players.find(
      (player) => player.id === bot.id,
    )!;
    const livingRival = scouted.players.find(
      (player) => player.id === "bot-1",
    )!;
    const deadRecentRival = scouted.players.find(
      (player) => player.id === "bot-3",
    )!;
    resetCrew(livingRival, 2);
    addCrew(livingRival, "rival-luffy", "luffy", 1);
    addCrew(livingRival, "rival-smoker", "smoker", 2);
    livingRival.board = {
      "1,3": "rival-luffy",
      "6,3": "rival-smoker",
    };
    deadRecentRival.alive = false;
    scoutedBot.lastOpponents = [livingRival.id, deadRecentRival.id];
    const threatAware = planBotFormation(scouted, scoutedBot.id);

    expect(
      adjacentPairs(threatAware.map((placement) => placement.position)),
    ).toBeLessThan(
      adjacentPairs(unscouted.map((placement) => placement.position)),
    );
    const onlyLivingHistory = structuredClone(scouted);
    onlyLivingHistory.players.find(
      (player) => player.id === bot.id,
    )!.lastOpponents = [livingRival.id];
    expect(planBotFormation(onlyLivingHistory, bot.id)).toEqual(threatAware);
  });

  it("repositions deployed units through a legal, capped final board", () => {
    const state = createMatch("formation-reposition");
    const bot = state.players.find((player) => player.id === "bot-1")!;
    bot.personalityId = "balanced";
    resetCrew(bot, 3);
    addCrew(bot, "crew-ace", "ace", 1);
    addCrew(bot, "crew-usopp", "usopp", 2, 2);
    addCrew(bot, "crew-smoker", "smoker", 3);
    addCrew(bot, "crew-tashigi", "tashigi", 4);
    bot.board = {
      "0,3": "crew-usopp",
      "1,5": "crew-smoker",
      "2,4": "crew-tashigi",
    };
    bot.bench[0] = "crew-ace";
    const plan = planBotFormation(state, bot.id);

    const next = runBotTurn(state, bot.id);
    const arranged = next.players.find((player) => player.id === bot.id)!;
    const expectedBoard = Object.fromEntries(
      plan.map((placement) => [
        `${placement.position.x},${placement.position.y}`,
        placement.unitId,
      ]),
    );

    expect(arranged.board).toEqual(expectedBoard);
    expect(Object.keys(arranged.board)).toHaveLength(3);
    expect(Object.values(arranged.board)).toContain("crew-ace");
    expect(Object.values(arranged.board)).not.toContain("crew-tashigi");
    expect(
      Object.keys(arranged.board).every((key) => {
        const [x, y] = key.split(",").map(Number);
        return x >= 0 && x < 8 && y >= 3 && y < 6;
      }),
    ).toBe(true);
    expect(state.players.find((player) => player.id === bot.id)!.ready).toBe(
      false,
    );
    expect(arranged.ready).toBe(true);
  });
});

describe("recent PvP battle history", () => {
  it("records mirrored direct results and caps each captain at five", () => {
    let state = createMatch("recent-battle-cap");
    for (let index = 0; index < 6; index += 1) {
      const winnerId = index % 2 === 0 ? "player-1" : "bot-1";
      state = preparePvpResolution(
        state,
        20 + index,
        result({
          winnerId,
          playerADamage: winnerId === "bot-1" ? 3 : 0,
          playerBDamage: winnerId === "player-1" ? 5 : 0,
        }),
      );
      state = advanceMatchPhase(state);
    }
    const human = state.players.find((player) => player.id === "player-1")!;
    const bot = state.players.find((player) => player.id === "bot-1")!;

    expect(human.recentBattles).toHaveLength(5);
    expect(bot.recentBattles).toHaveLength(5);
    expect(human.recentBattles.map((entry) => entry.round)).toEqual([
      21, 22, 23, 24, 25,
    ]);
    expect(human.recentBattles.at(-1)).toEqual({
      round: 25,
      opponentId: "bot-1",
      outcome: "loss",
      isGhost: false,
      captainDamageDealt: 0,
      captainDamageTaken: 3,
    });
    expect(bot.recentBattles.at(-1)).toEqual({
      round: 25,
      opponentId: "player-1",
      outcome: "win",
      isGhost: false,
      captainDamageDealt: 3,
      captainDamageTaken: 0,
    });
  });

  it("marks ghost records without adding history to the ghost owner", () => {
    let state = createMatch("recent-battle-ghost");
    state = preparePvpResolution(
      state,
      7,
      result({
        playerBId: null,
        ghostOfPlayerId: "bot-2",
        winnerId: "bot-2",
        playerADamage: 4,
        playerBDamage: 0,
      }),
    );

    state = advanceMatchPhase(state);

    expect(
      state.players.find((player) => player.id === "player-1")!
        .recentBattles,
    ).toEqual([
      {
        round: 7,
        opponentId: "bot-2",
        outcome: "loss",
        isGhost: true,
        captainDamageDealt: 0,
        captainDamageTaken: 4,
      },
    ]);
    expect(
      state.players.find((player) => player.id === "bot-2")!.recentBattles,
    ).toEqual([]);
  });

  it("does not add PvE encounters to captain history", () => {
    const state = createMatch("recent-battle-pve");
    state.phase = "battle";
    state.lastResults = [
      result({
        playerBId: null,
        ghostOfPlayerId: null,
        winnerId: "player-1",
        playerADamage: 0,
        playerBDamage: 0,
      }),
    ];

    const next = advanceMatchPhase(state);

    expect(
      next.players.find((player) => player.id === "player-1")!.recentBattles,
    ).toEqual([]);
  });
});
