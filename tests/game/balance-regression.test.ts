import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  createMatch,
  getTraitDefinition,
  getUnitDefinition,
  runBotTurn,
  type BotPersonality,
  type GameContent,
  type MatchState,
  type PlayerState,
} from "../../game";

const TEST_PERSONALITY: BotPersonality = {
  id: "test-bot",
  name: "Test Bot",
  economyReserve: 0,
  levelAggression: 0,
  rerollAggression: 0,
  preferredTraits: [],
  formation: "spread",
};

function testContent(
  personality: BotPersonality = TEST_PERSONALITY,
): GameContent {
  return {
    ...DEFAULT_CONTENT,
    botPersonalities: [personality],
  };
}

function bot(state: MatchState): PlayerState {
  const found = state.players.find((player) => player.id === "bot-1");
  if (!found) {
    throw new Error("Missing test bot");
  }
  return found;
}

function setShop(
  state: MatchState,
  player: PlayerState,
  offers: string[],
): void {
  for (const definitionId of player.shop) {
    if (definitionId) {
      state.pool[definitionId] += 1;
    }
  }
  player.shop = Array.from(
    { length: DEFAULT_CONTENT.config.shopSize },
    (_, index) => offers[index] ?? null,
  );
  for (const definitionId of offers) {
    state.pool[definitionId] -= 1;
  }
}

function fillBench(state: MatchState, player: PlayerState): void {
  const definitions = [
    "nami",
    "usopp",
    "chopper",
    "tashigi",
    "sanji",
    "robin",
    "smoker",
    "sabo",
  ];
  player.units = {};
  player.board = {};
  player.bench = definitions.map((definitionId, index) => {
    const unitId = `held-${index}`;
    player.units[unitId] = {
      id: unitId,
      definitionId,
      star: 1,
      items: [],
      acquiredOrder: index + 1,
    };
    state.pool[definitionId] -= 1;
    return unitId;
  });
}

describe("production balance regressions", () => {
  it("replaces a stale one-star bench unit with a clearly stronger offer", () => {
    const content = testContent();
    const state = createMatch("bot-bench-turnover", content);
    const player = bot(state);
    player.personalityId = TEST_PERSONALITY.id;
    player.gold = 50;
    state.round = 10;
    fillBench(state, player);
    setShop(state, player, ["ace"]);
    const namiPoolBefore = state.pool.nami;
    const acePoolBefore = state.pool.ace;

    const next = runBotTurn(state, player.id, content);
    const nextBot = bot(next);

    expect(nextBot.units["held-0"]).toBeUndefined();
    expect(
      Object.values(nextBot.units).some(
        (unit) => unit.definitionId === "ace",
      ),
    ).toBe(true);
    expect(Object.keys(nextBot.units)).toHaveLength(8);
    expect(next.pool.nami).toBe(namiPoolBefore + 1);
    expect(next.pool.ace).toBe(acePoolBefore);
  });

  it("never sells a full-bench unit for an offer it will not buy", () => {
    const cautious = {
      ...TEST_PERSONALITY,
      economyReserve: 10,
    };
    const content = testContent(cautious);
    const state = createMatch("bot-no-buy-no-sale", content);
    const player = bot(state);
    player.personalityId = cautious.id;
    player.gold = 4;
    state.round = 10;
    fillBench(state, player);
    setShop(state, player, ["ace"]);
    const unitIdsBefore = Object.keys(player.units).sort();
    const poolBefore = structuredClone(state.pool);

    const next = runBotTurn(state, player.id, content);
    const nextBot = bot(next);

    expect(Object.keys(nextBot.units).sort()).toEqual(unitIdsBefore);
    expect(next.pool).toEqual(poolBefore);
    expect(nextBot.shop[0]).toBe("ace");
  });

  it("normalizes an extreme connector before choosing equal-cost offers", () => {
    const brawler: BotPersonality = {
      ...TEST_PERSONALITY,
      preferredTraits: ["brawler", "brotherhood"],
    };
    const content = testContent(brawler);
    const state = createMatch("bot-connector-normalization", content);
    const player = bot(state);
    player.personalityId = brawler.id;
    player.gold = 3;
    player.units = {};
    player.board = {};
    player.bench = player.bench.map(() => null);
    state.round = 10;
    setShop(state, player, ["luffy", "zoro"]);

    const next = runBotTurn(state, player.id, content);
    const definitions = Object.values(bot(next).units).map(
      (unit) => unit.definitionId,
    );

    expect(definitions).toContain("zoro");
    expect(definitions).not.toContain("luffy");
  });

  it("keeps the measured outlier and early-brawler tuning explicit", () => {
    expect(getUnitDefinition("luffy")?.ability.power).toBe(75);
    expect(getUnitDefinition("sabo")?.ability.power).toBe(190);
    expect(getUnitDefinition("garp")?.ability.power).toBe(360);
    expect(getTraitDefinition("brawler")?.tiers[0].effects).toEqual([
      { kind: "max-health-percent", value: 6 },
      { kind: "attack-speed-percent", value: 4 },
    ]);
    expect(getTraitDefinition("brawler")?.tiers[1].effects).toEqual([
      { kind: "max-health-percent", value: 25 },
      { kind: "attack-speed-percent", value: 18 },
    ]);
  });
});
