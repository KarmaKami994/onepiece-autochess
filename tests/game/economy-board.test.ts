import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONTENT,
  advanceMatchPhase,
  applyCommand as applyDomainCommand,
  createMatch,
  getActiveTraits,
  refillEmptyShopSlots,
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

function forceShop(
  state: MatchState,
  offers: Array<string | null>,
): void {
  const human = player(state);
  for (const definitionId of human.shop) {
    if (definitionId) state.pool[definitionId] += 1;
  }
  human.shop = [...offers];
  for (const definitionId of offers) {
    if (definitionId) state.pool[definitionId] -= 1;
  }
}

function accountedCopies(state: MatchState, definitionId: string): number {
  const poolCopies = state.pool[definitionId] ?? 0;
  const shopCopies = state.players.reduce(
    (total, candidate) =>
      total + candidate.shop.filter((offer) => offer === definitionId).length,
    0,
  );
  const ownedCopies = state.players.reduce(
    (total, candidate) =>
      total +
      Object.values(candidate.units)
        .filter((unit) => unit.definitionId === definitionId)
        .reduce(
          (unitTotal, unit) =>
            unitTotal + (unit.star === 3 ? 9 : unit.star === 2 ? 3 : 1),
          0,
        ),
    0,
  );
  return poolCopies + shopCopies + ownedCopies;
}

function advanceAutomaticShop(state: MatchState): MatchState {
  for (const candidate of state.players) {
    if (candidate.id !== "player-1" && candidate.alive) {
      candidate.shopLocked = true;
    }
  }
  state.round = 5;
  state.phase = "battle";
  state.lastResults = [];
  return advanceMatchPhase(state);
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

  it("retains a full locked shop without pool or RNG changes and clears the lock", () => {
    const state = createMatch("locked-full-shop");
    const offers = ["nami", "usopp", "koby", "koala", "sanji", "robin"];
    forceShop(state, offers);
    player(state).shopLocked = true;
    const poolBefore = structuredClone(state.pool);
    const rngBefore = state.rngState;

    const next = advanceAutomaticShop(state);

    expect(player(next).shop).toEqual(offers);
    expect(player(next).shopLocked).toBe(false);
    expect(next.pool).toEqual(poolBefore);
    expect(next.rngState).toBe(rngBefore);
  });

  it("refills only a purchased slot through the round transition and conserves every copy", () => {
    let state = createMatch("locked-purchased-slot");
    player(state).gold = 99;
    const offers = ["koby", "koala", "robin", "sanji", "usopp", "nami"];
    forceShop(state, offers);
    const purchase = applyCommand(state, { type: "BUY_UNIT", shopIndex: 2 });
    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    state = purchase.state;
    const lock = applyCommand(state, { type: "TOGGLE_SHOP_LOCK" });
    expect(lock.ok).toBe(true);
    if (!lock.ok) return;
    state = lock.state;
    for (const unit of DEFAULT_CONTENT.units.filter((unit) => unit.cost === 1)) {
      state.pool[unit.id] = 0;
    }
    const accountedBefore = Object.fromEntries(
      DEFAULT_CONTENT.units.map((unit) => [
        unit.id,
        accountedCopies(state, unit.id),
      ]),
    );
    const poolBefore = Object.values(state.pool).reduce(
      (total, count) => total + count,
      0,
    );

    const first = advanceAutomaticShop(structuredClone(state));
    const second = advanceAutomaticShop(structuredClone(state));
    const nextShop = player(first).shop;

    expect(nextShop[2]).not.toBeNull();
    expect(player(first).level).toBe(3);
    expect(
      DEFAULT_CONTENT.units.find((unit) => unit.id === nextShop[2])?.cost,
    ).toBe(2);
    expect(nextShop.filter(Boolean)).toHaveLength(DEFAULT_CONTENT.config.shopSize);
    for (const index of [0, 1, 3, 4, 5]) {
      expect(nextShop[index]).toBe(offers[index]);
    }
    expect(player(first).shopLocked).toBe(false);
    expect(
      Object.values(first.pool).reduce((total, count) => total + count, 0),
    ).toBe(poolBefore - 1);
    for (const unit of DEFAULT_CONTENT.units) {
      expect(accountedCopies(first, unit.id)).toBe(accountedBefore[unit.id]);
    }
    expect(first).toEqual(second);
  });

  it("consumes RNG only for empty locked slots", () => {
    const first = createMatch("locked-shop-rng");
    forceShop(first, ["nami", null, "usopp", null, "koby", null]);
    const second = structuredClone(first);
    player(second).shop = ["koala", null, "tashigi", null, "chopper", null];

    refillEmptyShopSlots(first, player(first), DEFAULT_CONTENT);
    refillEmptyShopSlots(second, player(second), DEFAULT_CONTENT);

    expect([1, 3, 5].map((index) => player(first).shop[index])).toEqual(
      [1, 3, 5].map((index) => player(second).shop[index]),
    );
    expect(player(first).shop).toMatchObject({
      0: "nami",
      2: "usopp",
      4: "koby",
    });
    expect(player(second).shop).toMatchObject({
      0: "koala",
      2: "tashigi",
      4: "chopper",
    });
    expect(first.rngState).toBe(second.rngState);
  });

  it("keeps a manual reroll full even while the shop is locked", () => {
    const state = createMatch("locked-manual-reroll");
    player(state).gold = 99;
    player(state).shopLocked = true;
    forceShop(state, ["shanks", "shanks", null, "shanks", "shanks", "shanks"]);

    const result = applyCommand(state, { type: "REROLL_SHOP" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(player(result.state).gold).toBe(98);
    expect(player(result.state).shop).toHaveLength(DEFAULT_CONTENT.config.shopSize);
    expect(player(result.state).shop.every((offer) => offer !== null)).toBe(true);
    expect(player(result.state).shop).not.toContain("shanks");
    expect(player(result.state).shopLocked).toBe(true);
  });

  it("preserves deterministic full automatic refreshes for unlocked shops", () => {
    const state = createMatch("unlocked-automatic-refresh");
    forceShop(state, Array.from({ length: 6 }, () => "shanks"));
    player(state).shopLocked = false;
    const shanksPoolBefore = state.pool.shanks;

    const first = advanceAutomaticShop(structuredClone(state));
    const second = advanceAutomaticShop(structuredClone(state));

    expect(player(first).shop).toHaveLength(DEFAULT_CONTENT.config.shopSize);
    expect(player(first).shop.every((offer) => offer !== null)).toBe(true);
    expect(player(first).shop).not.toContain("shanks");
    expect(first.pool.shanks).toBe(shanksPoolBefore + 6);
    expect(player(first).shopLocked).toBe(false);
    expect(first).toEqual(second);
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
