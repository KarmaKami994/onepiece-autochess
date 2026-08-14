import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  applyCommand,
  createMatch,
  createPairings,
  runBotTurn,
  type MatchBattleResult,
  type MatchState,
} from "../../game";

function timeout(state: MatchState): MatchState {
  const result = applyCommand(state, { type: "TIMER_EXPIRED" });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

describe("pairing and bots", () => {
  it("pairs deterministically and creates one harmless ghost when odd", () => {
    const state = createMatch("odd-pairing");
    state.players.at(-1)!.alive = false;
    const first = createPairings(state);
    const second = createPairings(state);
    expect(first).toEqual(second);
    expect(first.pairings).toHaveLength(4);
    expect(
      first.pairings.filter((pairing) => pairing.ghostOfPlayerId),
    ).toHaveLength(1);
    const directlyPaired = first.pairings.flatMap((pairing) => [
      pairing.playerAId,
      ...(pairing.playerBId ? [pairing.playerBId] : []),
    ]);
    expect(new Set(directlyPaired).size).toBe(7);
  });

  it("runs bots through the same economy and command rules", () => {
    const state = createMatch("bot-turn");
    const next = runBotTurn(state, "bot-1");
    const bot = next.players.find((player) => player.id === "bot-1")!;
    expect(bot.ready).toBe(true);
    expect(bot.gold).toBeGreaterThanOrEqual(0);
    expect(Object.keys(bot.board).length).toBeLessThanOrEqual(bot.level);
    expect(Object.keys(bot.units).length).toBeGreaterThan(0);
    expect(state.players.find((player) => player.id === "bot-1")!.ready).toBe(
      false,
    );
  });

  it("equips bot inventory deterministically onto best-fit units", () => {
    const state = createMatch("bot-items-best-fit");
    const bot = state.players.find((player) => player.id === "bot-1")!;
    bot.gold = 0;
    bot.level = 2;
    bot.shop = bot.shop.map(() => null);
    bot.inventory = ["sniper-goggles", "meat-platter"];
    bot.units = {
      "bot-usopp": {
        id: "bot-usopp",
        definitionId: "usopp",
        star: 1,
        items: [],
        acquiredOrder: 1,
      },
      "bot-smoker": {
        id: "bot-smoker",
        definitionId: "smoker",
        star: 1,
        items: [],
        acquiredOrder: 2,
      },
    };
    bot.bench = bot.bench.map(() => null);
    bot.board = {
      "0,5": "bot-usopp",
      "1,5": "bot-smoker",
    };

    const first = runBotTurn(state, bot.id);
    const second = runBotTurn(state, bot.id);
    const firstBot = first.players.find((player) => player.id === bot.id)!;

    expect(first).toEqual(second);
    expect(firstBot.inventory).toEqual([]);
    expect(firstBot.units["bot-usopp"].items).toEqual(["sniper-goggles"]);
    expect(firstBot.units["bot-smoker"].items).toEqual(["meat-platter"]);
    expect(
      Object.values(firstBot.units).every(
        (unit) => unit.items.length <= DEFAULT_CONTENT.config.itemCap,
      ),
    ).toBe(true);
    expect(bot.inventory).toEqual(["sniper-goggles", "meat-platter"]);
    expect(bot.units["bot-usopp"].items).toEqual([]);
    expect(bot.units["bot-smoker"].items).toEqual([]);
  });

  it("uses equip-command legality and stops at the item cap", () => {
    const state = createMatch("bot-items-cap");
    const bot = state.players.find((player) => player.id === "bot-1")!;
    bot.gold = 0;
    bot.level = 1;
    bot.shop = bot.shop.map(() => null);
    bot.inventory = ["clima-tact", "cola-engine", "unknown-item"];
    bot.units = {
      "bot-nami": {
        id: "bot-nami",
        definitionId: "nami",
        star: 1,
        items: ["black-blade", "meat-platter"],
        acquiredOrder: 1,
      },
    };
    bot.bench = bot.bench.map(() => null);
    bot.board = { "0,5": "bot-nami" };

    const next = runBotTurn(state, bot.id);
    const nextBot = next.players.find((player) => player.id === bot.id)!;

    expect(nextBot.units["bot-nami"].items).toEqual([
      "black-blade",
      "meat-platter",
      "clima-tact",
    ]);
    expect(nextBot.units["bot-nami"].items).toHaveLength(
      DEFAULT_CONTENT.config.itemCap,
    );
    expect(nextBot.inventory).toEqual(["cola-engine", "unknown-item"]);
    expect(nextBot.units["bot-nami"].items).not.toContain("unknown-item");
  });
});

describe("round and special-stage flow", () => {
  it("runs preparation to a complete PvE battle", () => {
    const state = createMatch("pve-start");
    const result = applyCommand(state, {
      type: "END_PREPARATION",
      playerId: "player-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.phase).toBe("battle");
    expect(result.state.stageId).toBe("east-blue-patrol");
    expect(result.state.lastResults).toHaveLength(8);
    expect(
      result.state.lastResults.every(
        (battle) => battle.durationTicks <= 450,
      ),
    ).toBe(true);
  });

  it("does not reward a player who loses a PvE round", () => {
    let state = createMatch("pve-loss");
    state = timeout(state);
    const humanResult = state.lastResults.find(
      (result) => result.playerAId === "player-1",
    );
    expect(humanResult?.winnerId).not.toBe("player-1");
    state = timeout(state);
    expect(state.phase).toBe("preparation");
    expect(state.round).toBe(2);
    expect(state.pendingItemChoices["player-1"]).toBeUndefined();
    expect(
      state.players.find((player) => player.id === "player-1")!.inventory,
    ).toEqual([]);
  });

  it("offers rewards only to PvE winners and accepts a choice", () => {
    const state = createMatch("pve-win-reward");
    state.phase = "battle";
    state.lastResults = state.players.map(
      (player): MatchBattleResult => ({
        playerAId: player.id,
        playerBId: null,
        ghostOfPlayerId: null,
        winnerId: player.id,
        timedOut: false,
        playerADamage: 0,
        playerBDamage: 0,
        durationTicks: 1,
        events: [],
        initialUnits: [],
        finalUnits: [],
      }),
    );
    const resolved = advanceMatchPhase(state);
    expect(resolved.phase).toBe("item-choice");
    const choices = resolved.pendingItemChoices["player-1"];
    expect(choices).toHaveLength(3);
    const choice = applyCommand(resolved, {
      type: "CHOOSE_ITEM",
      playerId: "player-1",
      choiceId: choices[0],
    });
    expect(choice.ok).toBe(true);
    if (choice.ok) {
      expect(choice.state.round).toBe(2);
      expect(choice.state.phase).toBe("preparation");
      expect(
        choice.state.players.find(
          (player) => player.id === "player-1",
        )!.inventory,
      ).toContain(choices[0]);
    }
  });

  it("reaches carousel rounds and timeout drafts for the human and bots", () => {
    let state = createMatch("carousel-flow");
    for (let targetRound = 1; targetRound <= 3; targetRound += 1) {
      expect(state.round).toBe(targetRound);
      expect(state.phase).toBe("preparation");
      state = timeout(state);
      expect(state.phase).toBe("battle");
      state = timeout(state);
      if (state.phase === "item-choice") {
        state = timeout(state);
      }
    }
    expect(state.round).toBe(4);
    expect(state.phase).toBe("carousel");
    expect(state.carouselChoices).toHaveLength(8);
    expect(
      new Set(state.carouselChoices.map((choice) => choice.itemId)).size,
    ).toBe(8);
    const inventoryBefore = state.players.reduce(
      (total, player) => total + player.inventory.length,
      0,
    );
    state = timeout(state);
    expect(state.round).toBe(4);
    expect(state.phase).toBe("preparation");
    const inventoryAfter = state.players.reduce(
      (total, player) => total + player.inventory.length,
      0,
    );
    expect(inventoryAfter - inventoryBefore).toBe(8);
  });
});

describe("elimination and phase guards", () => {
  it("eliminates, assigns placement, and returns owned copies to the pool", () => {
    const state = createMatch("elimination");
    const human = state.players.find((player) => player.id === "player-1")!;
    const oldOffer = human.shop[0]!;
    state.pool[oldOffer] += 1;
    human.shop[0] = null;
    human.units["test-nami"] = {
      id: "test-nami",
      definitionId: "nami",
      star: 2,
      items: [],
      acquiredOrder: 0,
    };
    human.bench[0] = "test-nami";
    state.pool.nami -= 3;
    const poolBeforeResolve = state.pool.nami;
    const reservedNami = human.shop.filter(
      (definitionId) => definitionId === "nami",
    ).length;
    for (const survivor of state.players.filter(
      (candidate) => candidate.id !== human.id,
    )) {
      survivor.shopLocked = true;
    }
    state.phase = "battle";
    state.lastResults = [
      {
        playerAId: human.id,
        playerBId: null,
        ghostOfPlayerId: "bot-1",
        winnerId: "bot-1",
        timedOut: false,
        playerADamage: 999,
        playerBDamage: 0,
        durationTicks: 1,
        events: [],
        initialUnits: [],
        finalUnits: [],
      },
    ];
    const next = advanceMatchPhase(state);
    const eliminated = next.players.find(
      (player) => player.id === "player-1",
    )!;
    expect(eliminated.alive).toBe(false);
    expect(eliminated.placement).toBe(8);
    expect(eliminated.finalCrew).toMatchObject([
      {
        id: "test-nami",
        definitionId: "nami",
        star: 2,
      },
    ]);
    expect(next.pool.nami).toBe(poolBeforeResolve + 3 + reservedNami);
  });

  it("rejects planning commands during battle", () => {
    const state = createMatch("phase-guard");
    state.phase = "battle";
    expect(
      applyCommand(state, {
        type: "REROLL_SHOP",
        playerId: "player-1",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "WRONG_PHASE" },
    });
  });

  it("declares a winner when only one player remains", () => {
    const state = createMatch("winner");
    const [winner, ...losers] = state.players;
    for (const loser of losers) {
      loser.alive = false;
      loser.hp = 0;
    }
    state.phase = "battle";
    state.lastResults = [];
    const next = advanceMatchPhase(state);
    expect(next.phase).toBe("game-over");
    expect(next.winnerId).toBe(winner.id);
    expect(winner.id).toBe("player-1");
  });
});

describe("fixed configuration", () => {
  it("matches the requested board and economy constants", () => {
    expect(DEFAULT_CONTENT.config).toMatchObject({
      boardWidth: 8,
      boardHeight: 6,
      deployRows: 3,
      benchSize: 8,
      shopSize: 6,
      startHealth: 100,
      startGold: 5,
      startLevel: 2,
      maxLevel: 9,
      rerollCost: 1,
      buyXpCost: 4,
      buyXpAmount: 4,
      autoXpPerRound: 2,
      baseIncome: 5,
      combatTickMs: 100,
      combatMaxTicks: 450,
    });
  });
});
