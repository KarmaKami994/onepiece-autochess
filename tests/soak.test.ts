import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  createMatch,
  type GameContent,
  type MatchState,
} from "../game";

function fastSoakContent(): GameContent {
  const content = JSON.parse(JSON.stringify(DEFAULT_CONTENT)) as GameContent;
  content.version = "soak-1";
  content.config.startHealth = 14;
  content.config.combatMaxTicks = 30;
  content.config.recordBattleEvents = false;
  for (const enemy of content.enemies) {
    enemy.stats.health = Math.min(enemy.stats.health, 80);
    enemy.stats.attack = 1;
    enemy.stats.defense = 0;
  }
  for (const personality of content.botPersonalities) {
    personality.rerollAggression = Math.min(
      personality.rerollAggression,
      0.25,
    );
    personality.levelAggression = Math.min(
      personality.levelAggression,
      0.5,
    );
    personality.economyReserve = Math.min(personality.economyReserve, 8);
  }
  return content;
}

function assertLegalState(state: MatchState, content: GameContent): void {
  expect(
    Object.values(state.pool).every(
      (count) => Number.isInteger(count) && count >= 0,
    ),
  ).toBe(true);
  for (const player of state.players) {
    expect(player.gold).toBeGreaterThanOrEqual(0);
    expect(player.level).toBeGreaterThanOrEqual(2);
    expect(player.level).toBeLessThanOrEqual(content.config.maxLevel);
    expect(Object.keys(player.board).length).toBeLessThanOrEqual(
      player.level,
    );
    expect(player.bench).toHaveLength(content.config.benchSize);
    expect(
      new Set([
        ...Object.values(player.board),
        ...player.bench.filter(
          (unitId): unitId is string => unitId !== null,
        ),
      ]).size,
    ).toBe(Object.keys(player.units).length);
  }

  for (const definition of content.units) {
    const inShops = state.players.reduce(
      (sum, player) =>
        sum +
        player.shop.filter((definitionId) => definitionId === definition.id)
          .length,
      0,
    );
    const ownedCopies = state.players.reduce(
      (sum, player) =>
        sum +
        Object.values(player.units)
          .filter((unit) => unit.definitionId === definition.id)
          .reduce(
            (unitSum, unit) =>
              unitSum + (unit.star === 1 ? 1 : unit.star === 2 ? 3 : 9),
            0,
          ),
      0,
    );
    expect(
      state.pool[definition.id] + inShops + ownedCopies,
      `pool conservation failed for ${definition.id}`,
    ).toBe(content.config.poolCopiesByCost[definition.cost - 1]);
  }
}

describe("50-seed complete headless match soak", () => {
  it(
    "autoplays every seed through elimination to one legal winner",
    () => {
      const content = fastSoakContent();
      const winningBoards: Record<string, number> = {};
      const visitedPhases = new Set<string>();

      for (let seed = 0; seed < 50; seed += 1) {
        let state = createMatch(`full-match-${seed}`, content);
        const human = state.players.find(
          (player) => player.id === "player-1",
        )!;
        human.personalityId = "balanced";

        let transitions = 0;
        while (state.phase !== "game-over" && transitions < 160) {
          visitedPhases.add(state.phase);
          const currentHuman = state.players.find(
            (player) => player.id === "player-1",
          );
          if (currentHuman?.alive) {
            currentHuman.isBot = state.phase === "preparation";
          }
          state = advanceMatchPhase(state, content);
          const advancedHuman = state.players.find(
            (player) => player.id === "player-1",
          );
          if (advancedHuman && state.phase !== "preparation") {
            advancedHuman.isBot = false;
          }
          transitions += 1;
        }

        expect(
          state.phase,
          `seed ${seed} exceeded the phase guard at round ${state.round}`,
        ).toBe("game-over");
        expect(transitions).toBeLessThan(160);
        const alive = state.players.filter((player) => player.alive);
        expect(alive).toHaveLength(1);
        expect(state.winnerId).toBe(alive[0].id);
        expect(alive[0].placement).toBe(1);
        assertLegalState(state, content);

        const winnerDefinitions = new Set(
          Object.values(alive[0].board)
            .map((unitId) => alive[0].units[unitId]?.definitionId)
            .filter(
              (definitionId): definitionId is string =>
                typeof definitionId === "string",
            ),
        );
        for (const definitionId of winnerDefinitions) {
          winningBoards[definitionId] =
            (winningBoards[definitionId] ?? 0) + 1;
        }
      }

      expect(visitedPhases).toEqual(
        new Set(["preparation", "battle", "item-choice", "carousel"]),
      );
      expect(Object.keys(winningBoards).length).toBeGreaterThanOrEqual(8);
      expect(Math.max(...Object.values(winningBoards))).toBeLessThanOrEqual(
        45,
      );
    },
    120_000,
  );
});
