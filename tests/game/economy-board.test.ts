import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  applyCommand as applyDomainCommand,
  createMatch,
  getActiveTraits,
  type GameCommand,
  type MatchState,
  type PlayerState,
} from "../../game";

function applyCommand(state: MatchState, command: GameCommand) {
  return applyDomainCommand(state, command, { actorPlayerId: "player-1" });
}

function player(state: MatchState): PlayerState {
  const found = state.players.find((candidate) => candidate.id === "player-1");
  if (!found) {
    throw new Error("Missing test player");
  }
  return found;
}

function forceOffer(
  state: MatchState,
  definitionId: string,
  shopIndex = 0,
): void {
  const current = player(state).shop[shopIndex];
  if (current) {
    state.pool[current] += 1;
  }
  player(state).shop[shopIndex] = definitionId;
  state.pool[definitionId] -= 1;
}

function buyForced(
  state: MatchState,
  definitionId: string,
): MatchState {
  forceOffer(state, definitionId);
  const result = applyCommand(state, {
    type: "BUY_UNIT",
    shopIndex: 0,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

describe("shop, economy, pool, and upgrades", () => {
  it("starts with the requested economy and reserves shop copies", () => {
    const state = createMatch("economy");
    expect(player(state)).toMatchObject({
      hp: 100,
      gold: 5,
      level: 2,
    });
    expect(player(state).shop).toHaveLength(6);
    expect(player(state).bench).toHaveLength(8);
    for (const definition of DEFAULT_CONTENT.units) {
      const copiesInShops = state.players.reduce(
        (total, candidate) =>
          total +
          candidate.shop.filter((id) => id === definition.id).length,
        0,
      );
      expect(state.pool[definition.id] + copiesInShops).toBe(
        DEFAULT_CONTENT.config.poolCopiesByCost[definition.cost - 1],
      );
    }
  });

  it("rerolls for one gold without leaking pool copies", () => {
    const state = createMatch("reroll");
    const beforeTotal = Object.values(state.pool).reduce(
      (sum, count) => sum + count,
      0,
    );
    const result = applyCommand(state, {
      type: "REROLL_SHOP",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(player(result.state).gold).toBe(4);
    expect(
      Object.values(result.state.pool).reduce(
        (sum, count) => sum + count,
        0,
      ),
    ).toBe(beforeTotal);
  });

  it("applies base income, capped interest and streak, win gold, and auto XP", () => {
    const state = createMatch("income-caps");
    const human = player(state);
    human.gold = 50;
    human.winStreak = 6;
    human.lossStreak = 0;
    human.level = 2;
    human.xp = 0;
    state.round = 5;
    state.phase = "battle";
    state.lastResults = [
      {
        playerAId: human.id,
        playerBId: "bot-1",
        ghostOfPlayerId: null,
        winnerId: human.id,
        timedOut: false,
        playerADamage: 0,
        playerBDamage: 0,
        durationTicks: 1,
        events: [],
        initialUnits: [],
        finalUnits: [],
      },
    ];

    const next = advanceMatchPhase(state);
    expect(player(next).gold).toBe(66);
    expect(player(next)).toMatchObject({
      level: 3,
      xp: 0,
      winStreak: 7,
    });
  });

  it("atomically combines three copies and returns all copies on sale", () => {
    let state = createMatch("merge");
    player(state).gold = 99;
    const startingOffer = player(state).shop[0];
    if (startingOffer) {
      state.pool[startingOffer] += 1;
      player(state).shop[0] = null;
    }
    const poolBefore = state.pool.nami;
    state = buyForced(state, "nami");
    state = buyForced(state, "nami");
    state = buyForced(state, "nami");
    const nami = Object.values(player(state).units).filter(
      (unit) => unit.definitionId === "nami",
    );
    expect(nami).toHaveLength(1);
    expect(nami[0].star).toBe(2);
    expect(state.pool.nami).toBe(poolBefore - 3);

    const goldBeforeSale = player(state).gold;
    const sale = applyCommand(state, {
      type: "SELL_UNIT",
      unitId: nami[0].id,
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) {
      return;
    }
    expect(sale.state.pool.nami).toBe(poolBefore);
    expect(player(sale.state).gold).toBe(goldBeforeSale + 3);
  });

  it("permits a full-bench purchase only when it immediately merges", () => {
    let state = createMatch("full-merge");
    player(state).gold = 99;
    state = buyForced(state, "nami");
    state = buyForced(state, "nami");
    for (const definitionId of [
      "usopp",
      "chopper",
      "tashigi",
      "sanji",
      "robin",
      "smoker",
    ]) {
      state = buyForced(state, definitionId);
    }
    expect(player(state).bench.every(Boolean)).toBe(true);
    forceOffer(state, "kid");
    const beforeRejectedPurchase = structuredClone(state);
    const rejectedPurchase = applyCommand(state, {
      type: "BUY_UNIT",
      shopIndex: 0,
    });
    expect(rejectedPurchase.ok).toBe(false);
    expect(rejectedPurchase.state).toEqual(beforeRejectedPurchase);

    const mergeResult = (() => {
      forceOffer(state, "nami");
      return applyCommand(state, {
        type: "BUY_UNIT",
        shopIndex: 0,
      });
    })();
    expect(mergeResult.ok).toBe(true);
    if (!mergeResult.ok) {
      return;
    }
    expect(
      Object.values(player(mergeResult.state).units).find(
        (unit) => unit.definitionId === "nami",
      )?.star,
    ).toBe(2);
  });
});

describe("board, item, and trait rules", () => {
  it("enforces three deployment rows, level capacity, and swapping", () => {
    let state = createMatch("board");
    player(state).gold = 99;
    state = buyForced(state, "nami");
    state = buyForced(state, "usopp");
    state = buyForced(state, "tashigi");
    const [first, second, third] = player(state).bench.filter(
      (value): value is string => Boolean(value),
    );

    const invalid = applyCommand(state, {
      type: "MOVE_UNIT",
      unitId: first,
      to: { zone: "board", x: 0, y: 0 },
    });
    expect(invalid.ok).toBe(false);

    for (const [index, unitId] of [first, second].entries()) {
      const move = applyCommand(state, {
        type: "MOVE_UNIT",
        unitId,
        to: { zone: "board", x: index, y: 5 },
      });
      expect(move.ok).toBe(true);
      if (move.ok) {
        state = move.state;
      }
    }
    const overCap = applyCommand(state, {
      type: "MOVE_UNIT",
      unitId: third,
      to: { zone: "board", x: 2, y: 5 },
    });
    expect(overCap.ok).toBe(false);

    const swap = applyCommand(state, {
      type: "MOVE_UNIT",
      unitId: third,
      to: { zone: "board", x: 0, y: 5 },
    });
    expect(swap.ok).toBe(true);
    if (swap.ok) {
      expect(player(swap.state).board["0,5"]).toBe(third);
      expect(player(swap.state).bench).toContain(first);
    }
  });

  it("equips only owned items up to the three-item cap", () => {
    let state = createMatch("items");
    player(state).gold = 99;
    state = buyForced(state, "nami");
    const unitId = player(state).bench.find(
      (value): value is string => Boolean(value),
    )!;
    player(state).inventory = [
      "black-blade",
      "meat-platter",
      "clima-tact",
      "sniper-goggles",
    ];
    for (const itemId of [
      "black-blade",
      "meat-platter",
      "clima-tact",
    ]) {
      const equip = applyCommand(state, {
        type: "EQUIP_ITEM",
        unitId,
        itemId,
      });
      expect(equip.ok).toBe(true);
      if (equip.ok) {
        state = equip.state;
      }
    }
    expect(player(state).units[unitId].items).toHaveLength(3);
    expect(
      applyCommand(state, {
        type: "EQUIP_ITEM",
        unitId,
        itemId: "sniper-goggles",
      }).ok,
    ).toBe(false);

    const sale = applyCommand(state, {
      type: "SELL_UNIT",
      unitId,
    });
    expect(sale.ok).toBe(true);
    if (sale.ok) {
      expect(player(sale.state).inventory.sort()).toEqual(
        [
          "black-blade",
          "clima-tact",
          "meat-platter",
          "sniper-goggles",
        ].sort(),
      );
    }
  });

  it("counts distinct deployed definitions for traits", () => {
    let state = createMatch("traits");
    player(state).gold = 99;
    state = buyForced(state, "nami");
    state = buyForced(state, "nami");
    state = buyForced(state, "usopp");
    player(state).level = 3;
    const ids = player(state).bench.filter(
      (value): value is string => Boolean(value),
    );
    ids.forEach((unitId, index) => {
      const result = applyCommand(state, {
        type: "MOVE_UNIT",
        unitId,
        to: { zone: "board", x: index, y: 5 },
      });
      if (result.ok) {
        state = result.state;
      }
    });
    const strawHat = getActiveTraits(player(state)).find(
      (trait) => trait.traitId === "straw-hat",
    );
    expect(strawHat?.count).toBe(2);
    expect(strawHat?.tierIndex).toBe(0);
  });
});
