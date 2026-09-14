import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  createMatch,
  getBotTargetLevel,
  getBotXpActionBudget,
  getUnitDefinition,
  runBotTurn,
  scoreBotInstance,
  scoreBotUnit,
  type BotPersonality,
  type GameContent,
  type MatchState,
  type PlayerState,
} from "../../game";

const personality: BotPersonality = {
  id: "progression-test",
  name: "Progression Test",
  economyReserve: 0,
  levelAggression: 0.6,
  rerollAggression: 1,
  preferredTraits: [],
  formation: "spread",
};

function setup(
  seed: string,
  overrides: Partial<BotPersonality> = {},
): { state: MatchState; bot: PlayerState; content: GameContent } {
  const content = {
    ...DEFAULT_CONTENT,
    botPersonalities: [{ ...personality, ...overrides }],
  };
  const state = createMatch(seed, content);
  const bot = state.players.find((player) => player.id === "bot-1")!;
  bot.personalityId = personality.id;
  bot.shop = bot.shop.map(() => null);
  bot.units = {
    "test-nami": {
      id: "test-nami",
      definitionId: "nami",
      star: 1,
      items: [],
      acquiredOrder: 1,
    },
    "test-usopp": {
      id: "test-usopp",
      definitionId: "usopp",
      star: 1,
      items: [],
      acquiredOrder: 2,
    },
  };
  bot.board = { "0,5": "test-nami", "1,5": "test-usopp" };
  bot.bench = bot.bench.map(() => null);
  bot.gold = 20;
  return { state, bot, content };
}

function afterTurn(state: MatchState, content: GameContent): PlayerState {
  return runBotTurn(state, "bot-1", content).players.find(
    (player) => player.id === "bot-1",
  )!;
}

describe("P1B adaptive bot progression", () => {
  it("uses the exact monotonic, capped round curve", () => {
    const expected = [
      [1, 2], [4, 2], [5, 3], [9, 3], [10, 4], [14, 4],
      [15, 5], [19, 5], [20, 6], [24, 6], [25, 7], [29, 7],
      [30, 8], [34, 8], [35, 9], [40, 9],
    ];
    for (const [round, target] of expected) {
      expect(getBotTargetLevel(round, personality, DEFAULT_CONTENT.config)).toBe(target);
    }
    const levels = Array.from({ length: 50 }, (_, index) =>
      getBotTargetLevel(index + 1, personality, DEFAULT_CONTENT.config),
    );
    expect(levels.every((level, index) => index === 0 || level >= levels[index - 1])).toBe(true);
    expect(Math.max(...levels)).toBe(DEFAULT_CONTENT.config.maxLevel);
    expect(getBotTargetLevel(1, personality, { ...DEFAULT_CONTENT.config, startLevel: 3 })).toBe(3);
  });

  it("grants exactly one capped target level at aggression 0.75", () => {
    const below = { ...personality, levelAggression: 0.749 };
    const oriented = { ...personality, levelAggression: 0.75 };
    expect(getBotTargetLevel(10, below, DEFAULT_CONTENT.config)).toBe(4);
    expect(getBotTargetLevel(10, oriented, DEFAULT_CONTENT.config)).toBe(5);
    expect(getBotTargetLevel(35, oriented, DEFAULT_CONTENT.config)).toBe(9);
  });

  it("uses the exact bounded XP action budget", () => {
    for (const [aggression, budget] of [[0, 1], [0.2, 1], [0.21, 2], [0.6, 3], [0.75, 4], [1, 5], [2, 5]]) {
      expect(getBotXpActionBudget({ ...personality, levelAggression: aggression })).toBe(budget);
    }
  });

  it("prioritizes legal XP over a reroll below target", () => {
    const { state, bot, content } = setup("p1b-xp-priority");
    state.round = 5;
    bot.gold = 4;
    const result = afterTurn(state, content);
    expect(result.level).toBe(3);
    expect(result.gold).toBe(0);
  });

  it("never spends XP or reroll gold below the reserve", () => {
    const { state, bot, content } = setup("p1b-reserve", { economyReserve: 10 });
    state.round = 10;
    bot.gold = 13;
    const result = afterTurn(state, content);
    expect(result.level).toBe(2);
    expect(result.gold).toBe(13);
  });

  it("rerolls for a roster deficit, buys, then catches up on XP", () => {
    const { state, bot, content } = setup("p1b-roster-catchup");
    state.round = 10;
    bot.level = 3;
    bot.gold = 30;
    const result = afterTurn(state, content);
    expect(Object.keys(result.units).length).toBeGreaterThan(2);
    expect(result.level).toBe(4);
  });

  it("preserves gold below target when the XP budget is exhausted", () => {
    const { state, bot, content } = setup("p1b-xp-budget", { levelAggression: 0 });
    state.round = 15;
    bot.gold = 20;
    const result = afterTurn(state, content);
    expect(result.level).toBe(3);
    expect(result.gold).toBe(16);
  });

  it("retains the existing reroll budget at target and is deterministic", () => {
    const { state, bot, content } = setup("p1b-at-target");
    state.round = 1;
    bot.gold = 10;
    const first = runBotTurn(state, bot.id, content);
    const second = runBotTurn(state, bot.id, content);
    expect(first).toEqual(second);
    expect(first.players.find((player) => player.id === bot.id)!.gold).toBeLessThan(10);
    expect(first.players.find((player) => player.id === bot.id)!.level).toBe(2);
  });

  it("keeps unit and instance scoring constants unchanged", () => {
    const { bot, content } = setup("p1b-scoring");
    bot.units = {};
    bot.board = {};
    const definition = getUnitDefinition("nami", content)!;
    const base = scoreBotUnit("nami", bot, personality, content);
    expect(base).toBe(definition.cost * 25);
    const unit = { id: "nami-copy", definitionId: "nami", star: 1 as const, items: [], acquiredOrder: 1 };
    bot.units[unit.id] = unit;
    expect(scoreBotUnit("nami", bot, personality, content)).toBe(base + 24);
    expect(scoreBotUnit("nami", bot, { ...personality, preferredTraits: [definition.traits[0]] }, content)).toBe(base + 24 + 20);
    const instanceBase = scoreBotInstance(unit, bot, personality, content);
    expect(scoreBotInstance({ ...unit, star: 2 }, bot, personality, content)).toBe(instanceBase + 100);
    expect(scoreBotInstance({ ...unit, star: 3 }, bot, personality, content)).toBe(instanceBase + 260);
    expect(scoreBotInstance({ ...unit, items: ["clima-tact"] }, bot, personality, content)).toBe(instanceBase + 18);
  });
});
