import { describe, expect, it } from "vitest";
import {
  buildItemDecisionPreview,
  buildShopDecisionPreview,
  rankItemDecisionPreviews,
} from "../components/decisionSupport";
import { DEFAULT_CONTENT } from "../game/content";
import type { PlayerState, StarLevel, UnitInstance } from "../game/types";

function instance(
  id: string,
  definitionId: string,
  star: StarLevel = 1,
  items: string[] = [],
): UnitInstance {
  return {
    id,
    definitionId,
    star,
    items,
    acquiredOrder: Number(id.replace(/\D/g, "")) || 0,
  };
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: "human",
    name: "Straw Hat Captain",
    isBot: false,
    personalityId: null,
    alive: true,
    hp: 100,
    gold: 10,
    level: 4,
    xp: 0,
    board: {},
    bench: Array.from({ length: 8 }, () => null),
    units: {},
    shop: Array.from({ length: 6 }, () => null),
    shopLocked: false,
    inventory: [],
    finalCrew: [],
    ready: false,
    winStreak: 0,
    lossStreak: 0,
    lastOpponents: [],
    recentBattles: [],
    placement: null,
    ...overrides,
  };
}

describe("shop decision support", () => {
  it("returns canonical stats, ability, and an explicit fielded trait projection", () => {
    const nami = instance("unit-1", "nami");
    const current = player({
      board: { "0,3": nami.id },
      units: { [nami.id]: nami },
    });
    const before = JSON.stringify(current);

    const preview = buildShopDecisionPreview("luffy", current, DEFAULT_CONTENT);

    expect(preview.available).toBe(true);
    if (!preview.available) return;
    expect(preview).toMatchObject({
      name: "Luffy",
      cost: 3,
      affordable: true,
      canReceive: true,
      disabledReason: null,
      stats: { health: 900, attack: 80, defense: 28, range: 2 },
      ability: {
        name: "Gum-Gum Gatling",
        effect: "damage",
        power: 75,
        hits: 3,
      },
    });
    const strawHat = preview.traits.find((trait) => trait.id === "straw-hat");
    expect(strawHat).toMatchObject({
      name: "Straw Hat",
      currentCount: 1,
      afterPurchaseCount: 2,
      deltaIfFielded: 1,
      projectionRequiresFielding: true,
      nextThreshold: 2,
      activatesTier: true,
      afterPurchaseTier: { required: 2, label: "+10% health" },
    });
    expect(preview.traits).toHaveLength(5);
    expect(JSON.stringify(current)).toBe(before);
  });

  it("does not count a duplicate definition twice in the fielded trait projection", () => {
    const luffy = instance("unit-1", "luffy");
    const current = player({
      board: { "0,3": luffy.id },
      units: { [luffy.id]: luffy },
    });
    const preview = buildShopDecisionPreview("luffy", current, DEFAULT_CONTENT);

    expect(preview.available).toBe(true);
    if (!preview.available) return;
    expect(preview.traits.find((trait) => trait.id === "straw-hat")).toMatchObject(
      {
        currentCount: 1,
        afterPurchaseCount: 1,
        deltaIfFielded: 0,
        projectionRequiresFielding: false,
      },
    );
  });

  it("predicts a chained three-star merge and permits it on a full bench", () => {
    const owned = [
      instance("unit-1", "luffy", 1),
      instance("unit-2", "luffy", 1),
      instance("unit-3", "luffy", 2),
      instance("unit-4", "luffy", 2),
      instance("unit-5", "nami"),
      instance("unit-6", "usopp"),
      instance("unit-7", "chopper"),
      instance("unit-8", "tashigi"),
    ];
    const current = player({
      bench: owned.map((unit) => unit.id),
      units: Object.fromEntries(owned.map((unit) => [unit.id, unit])),
    });

    const preview = buildShopDecisionPreview("luffy", current, DEFAULT_CONTENT);

    expect(preview.available).toBe(true);
    if (!preview.available) return;
    expect(preview.canReceive).toBe(true);
    expect(preview.merge).toMatchObject({
      before: {
        oneStar: 2,
        twoStar: 2,
        threeStar: 0,
        equivalentCopies: 8,
      },
      afterPurchase: {
        oneStar: 0,
        twoStar: 0,
        threeStar: 1,
        equivalentCopies: 9,
      },
      purchaseMerges: true,
      purchaseUpgrade: 3,
      progress: { current: 8, afterPurchase: 0, required: 9, targetStar: 3 },
    });
    expect(preview.merge.progress.label).toBe("BUY → ★★★");
  });

  it("mirrors native purchase error precedence for gold and bench capacity", () => {
    const owned = Array.from({ length: 8 }, (_, index) =>
      instance(`unit-${index + 1}`, index % 2 ? "nami" : "usopp"),
    );
    const full = player({
      gold: 5,
      bench: owned.map((unit) => unit.id),
      units: Object.fromEntries(owned.map((unit) => [unit.id, unit])),
    });
    const benchBlocked = buildShopDecisionPreview(
      "mihawk",
      full,
      DEFAULT_CONTENT,
    );
    expect(benchBlocked.available && benchBlocked.disabledReason).toEqual({
      code: "BENCH_FULL",
      message: "The bench is full and this purchase would not combine.",
    });

    const goldBlocked = buildShopDecisionPreview(
      "mihawk",
      { ...full, gold: 0 },
      DEFAULT_CONTENT,
    );
    expect(goldBlocked.available && goldBlocked.disabledReason).toEqual({
      code: "NOT_ENOUGH_GOLD",
      message: "Not enough gold.",
    });
    expect(buildShopDecisionPreview(null, full, DEFAULT_CONTENT)).toMatchObject({
      available: false,
      disabledReason: { code: "EMPTY_SHOP_SLOT" },
    });
  });
});

describe("item and carousel decision support", () => {
  function itemTestPlayer(): PlayerState {
    const zoro = instance("unit-1", "zoro", 2);
    const usopp = instance("unit-2", "usopp");
    const robin = instance("unit-3", "robin");
    return player({
      board: {
        "0,3": zoro.id,
        "1,3": usopp.id,
        "2,3": robin.id,
      },
      units: {
        [zoro.id]: zoro,
        [usopp.id]: usopp,
        [robin.id]: robin,
      },
    });
  }

  it("finds the strongest carrier while preserving a selected-unit explanation", () => {
    const current = itemTestPlayer();
    const preview = buildItemDecisionPreview(
      "sniper-goggles",
      current,
      DEFAULT_CONTENT,
      "unit-1",
    );

    expect(preview.available).toBe(true);
    if (!preview.available) return;
    expect(preview.bestFit).toMatchObject({
      unitId: "unit-2",
      unitName: "Usopp",
      eligible: true,
      score: 80,
    });
    expect(preview.bestFit?.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effect: "range-flat",
          affinities: ["long-range"],
        }),
        expect.objectContaining({
          effect: "critical-chance-percent",
          affinities: ["marksman"],
        }),
      ]),
    );
    expect(preview.selectedFit).toMatchObject({
      unitId: "unit-1",
      unitName: "Zoro",
      score: 32,
    });
    expect(preview.explanation).toContain("fits Zoro");
  });

  it("uses another owned unit when the selected carrier has three items", () => {
    const current = itemTestPlayer();
    current.units["unit-1"].items = [
      "black-blade",
      "meat-platter",
      "cola-engine",
    ];

    const preview = buildItemDecisionPreview(
      "black-blade",
      current,
      DEFAULT_CONTENT,
      "unit-1",
    );

    expect(preview.available).toBe(true);
    if (!preview.available) return;
    expect(preview.selectedFit).toMatchObject({
      unitId: "unit-1",
      eligible: false,
      score: null,
      disabledReason: "ITEM_SLOTS_FULL",
    });
    expect(preview.bestFit?.unitId).toBe("unit-2");
    expect(preview.explanation).toContain("fits Usopp");
    expect(preview.duplicateOwned).toBe(true);
  });

  it("ranks carousel items by the engine-compatible roster score", () => {
    const current = itemTestPlayer();
    const ranked = rankItemDecisionPreviews(
      ["sniper-goggles", "black-blade", "clima-tact"],
      current,
      DEFAULT_CONTENT,
    );

    expect(ranked.map((preview) => preview.itemId)).toEqual([
      "black-blade",
      "sniper-goggles",
      "clima-tact",
    ]);
    expect(
      ranked.map((preview) => (preview.available ? preview.score : null)),
    ).toEqual([93.05, 80, 70.25]);
    expect(ranked[0].available && ranked[0].bestFit?.unitName).toBe("Zoro");
  });

  it("returns a stable unavailable result for missing item content", () => {
    expect(
      buildItemDecisionPreview(
        "missing-treasure",
        itemTestPlayer(),
        DEFAULT_CONTENT,
      ),
    ).toEqual({
      available: false,
      itemId: "missing-treasure",
      disabledReason: {
        code: "ITEM_NOT_FOUND",
        message: "That item is unavailable.",
      },
    });
  });
});
