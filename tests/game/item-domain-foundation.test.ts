import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  advanceMatchPhase,
  applyCommand,
  canonicalItemRecipeKey,
  createMatch,
  deserializeMatch,
  getItemDefinition,
  resolveItemRecipe,
  serializeMatch,
  type GameContent,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
  type UnitInstance,
} from "../../game";

const PLAYER_CONTEXT = { actorPlayerId: "player-1" };
const LEGACY_ITEM_IDS = [
  "black-blade",
  "meat-platter",
  "clima-tact",
  "sniper-goggles",
  "sea-prism-stone",
  "armament-wraps",
  "den-den-mushi",
  "cola-engine",
];

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => candidate.id === "player-1");
  if (!player) throw new Error("Missing human player fixture.");
  return player;
}

function resetRoster(player: PlayerState): void {
  player.units = {};
  player.board = {};
  player.bench = player.bench.map(() => null);
  player.inventory = [];
}

function addFixtureUnit(
  state: MatchState,
  definitionId = "zoro",
): UnitInstance {
  const unit = addUnitToPlayer(state, human(state), definitionId, DEFAULT_CONTENT);
  if (!unit) throw new Error("Could not add fixture unit.");
  return unit;
}

function equip(
  state: MatchState,
  unitId: string,
  itemId: string,
  content: GameContent = DEFAULT_CONTENT,
) {
  return applyCommand(
    state,
    { type: "EQUIP_ITEM", unitId, itemId },
    PLAYER_CONTEXT,
    content,
  );
}

function winningPvEReward(seed: string): string[] {
  const state = createMatch(seed);
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
  return advanceMatchPhase(state).pendingItemChoices["player-1"];
}

function carouselItems(seed: string): string[] {
  const state = createMatch(seed);
  state.round = 3;
  state.phase = "item-choice";
  state.pendingItemChoices = {};
  return advanceMatchPhase(state).carouselChoices.map((choice) => choice.itemId);
}

function mergeThree(
  seed: string,
  firstItems: string[],
  secondItems: string[],
  thirdItem: string,
): MatchState {
  const state = createMatch(seed);
  const player = human(state);
  resetRoster(player);
  const first = addFixtureUnit(state);
  first.items = [...firstItems];
  const second = addFixtureUnit(state);
  second.items = [...secondItems];
  const third = addUnitToPlayer(
    state,
    player,
    "zoro",
    DEFAULT_CONTENT,
    thirdItem,
  );
  if (!third) throw new Error("Could not add third merge fixture.");
  return state;
}

describe("P4A item catalog and recipes", () => {
  it("defines the exact 10-component, 55-completed, 65-item catalog", () => {
    expect(DEFAULT_CONTENT.items.filter((item) => item.kind === "component"))
      .toHaveLength(10);
    expect(DEFAULT_CONTENT.items.filter((item) => item.kind === "completed"))
      .toHaveLength(55);
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
    expect(new Set(DEFAULT_CONTENT.items.map((item) => item.id))).toHaveLength(65);
    for (const legacyId of LEGACY_ITEM_IDS) {
      expect(getItemDefinition(legacyId)?.kind).toBe("completed");
    }
  });

  it("covers every self-inclusive unordered component pair exactly once", () => {
    const componentIds = DEFAULT_CONTENT.items
      .filter((item) => item.kind === "component")
      .map((item) => item.id);
    const expectedKeys = componentIds.flatMap((firstId, firstIndex) =>
      componentIds
        .slice(firstIndex)
        .map((secondId) => canonicalItemRecipeKey(firstId, secondId))
    );
    const recipeKeys = Object.keys(DEFAULT_CONTENT.itemRecipes);

    expect(recipeKeys).toHaveLength(55);
    expect(new Set(recipeKeys)).toHaveLength(55);
    expect(new Set(recipeKeys)).toEqual(new Set(expectedKeys));
    for (const resultId of Object.values(DEFAULT_CONTENT.itemRecipes)) {
      expect(getItemDefinition(resultId)?.kind).toBe("completed");
    }
  });

  it("resolves recipes independently of component order", () => {
    expect(resolveItemRecipe("jet-dial", "armament-plate", DEFAULT_CONTENT))
      .toBe("armament-wraps");
    expect(resolveItemRecipe("armament-plate", "jet-dial", DEFAULT_CONTENT))
      .toBe("armament-wraps");
  });

  it("keeps acquisition on the legacy eight-item pool in its original order", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual(LEGACY_ITEM_IDS);
    expect(DEFAULT_CONTENT.acquirableItemIds).toEqual(LEGACY_ITEM_IDS);
  });

  it("preserves deterministic PvE rewards for representative pre-P4A seeds", () => {
    expect(winningPvEReward("p4a-reward-1")).toEqual([
      "clima-tact",
      "cola-engine",
      "den-den-mushi",
    ]);
    expect(winningPvEReward("p4a-reward-2")).toEqual([
      "black-blade",
      "den-den-mushi",
      "sniper-goggles",
    ]);
  });

  it("preserves deterministic carousel items for representative pre-P4A seeds", () => {
    expect(carouselItems("p4a-carousel-1")).toEqual([
      "sea-prism-stone",
      "den-den-mushi",
      "black-blade",
      "black-blade",
      "meat-platter",
      "cola-engine",
      "den-den-mushi",
      "meat-platter",
      "sniper-goggles",
    ]);
    expect(carouselItems("p4a-carousel-2")).toEqual([
      "clima-tact",
      "den-den-mushi",
      "black-blade",
      "cola-engine",
      "sea-prism-stone",
      "meat-platter",
      "black-blade",
      "meat-platter",
      "sea-prism-stone",
    ]);
  });
});

describe("P4A equip and crafting", () => {
  it("equips a first component normally", () => {
    const state = createMatch("first-component");
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    human(state).inventory.push("jet-dial");

    const result = equip(state, unit.id, "jet-dial");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(human(result.state).units[unit.id].items).toEqual(["jet-dial"]);
      expect(human(result.state).inventory).toEqual([]);
    }
  });

  it.each([
    ["jet-dial", "armament-plate"],
    ["armament-plate", "jet-dial"],
  ])("crafts the second component in either order", (firstId, secondId) => {
    let state = createMatch(`craft-${firstId}`);
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    human(state).inventory.push(firstId, secondId);
    const first = equip(state, unit.id, firstId);
    if (!first.ok) throw new Error(first.error.message);
    state = first.state;

    const crafted = equip(state, unit.id, secondId);

    expect(crafted.ok).toBe(true);
    if (crafted.ok) {
      expect(human(crafted.state).units[unit.id].items).toEqual([
        "armament-wraps",
      ]);
    }
  });

  it("crafts at cap and replaces the held component in place", () => {
    const state = createMatch("craft-at-cap");
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    unit.items = ["black-blade", "jet-dial", "meat-platter"];
    human(state).inventory.push("armament-plate");

    const crafted = equip(state, unit.id, "armament-plate");

    expect(crafted.ok).toBe(true);
    if (crafted.ok) {
      expect(human(crafted.state).units[unit.id].items).toEqual([
        "black-blade",
        "armament-wraps",
        "meat-platter",
      ]);
    }
  });

  it("returns a duplicate crafted result to inventory", () => {
    const state = createMatch("duplicate-craft");
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    unit.items = ["clima-tact", "devil-fruit-essence"];
    human(state).inventory.push("cola-canister");

    const crafted = equip(state, unit.id, "cola-canister");

    expect(crafted.ok).toBe(true);
    if (crafted.ok) {
      expect(human(crafted.state).units[unit.id].items).toEqual(["clima-tact"]);
      expect(human(crafted.state).inventory).toEqual(["clima-tact"]);
    }
  });

  it("rejects a direct completed duplicate without mutation", () => {
    const state = createMatch("direct-duplicate");
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    unit.items = ["black-blade"];
    human(state).inventory.push("black-blade");
    const before = structuredClone(state);

    const result = equip(state, unit.id, "black-blade");

    expect(result).toMatchObject({ ok: false, error: { code: "ITEM_DUPLICATE" } });
    expect(result.state).toEqual(before);
  });

  it("keeps normal completed equip rejected at cap", () => {
    const state = createMatch("completed-at-cap");
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    unit.items = ["black-blade", "meat-platter", "clima-tact"];
    human(state).inventory.push("sniper-goggles");

    const result = equip(state, unit.id, "sniper-goggles");

    expect(result).toMatchObject({ ok: false, error: { code: "ITEM_CAP" } });
    expect(result.state).toBe(state);
  });

  it("fails a malformed missing recipe without consuming either component", () => {
    const content = structuredClone(DEFAULT_CONTENT);
    delete content.itemRecipes[
      canonicalItemRecipeKey("jet-dial", "armament-plate")
    ];
    const state = createMatch("missing-recipe", content);
    resetRoster(human(state));
    const unit = addUnitToPlayer(state, human(state), "zoro", content);
    if (!unit) throw new Error("Could not add malformed-content fixture.");
    unit.items = ["jet-dial"];
    human(state).inventory.push("armament-plate");
    const before = structuredClone(state);

    const result = equip(state, unit.id, "armament-plate", content);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "ITEM_RECIPE_NOT_FOUND" },
    });
    expect(result.state).toEqual(before);
  });

  it("returns held components and completed items when selling", () => {
    const state = createMatch("sell-items");
    resetRoster(human(state));
    const unit = addFixtureUnit(state);
    unit.items = ["jet-dial", "black-blade"];

    const sold = applyCommand(
      state,
      { type: "SELL_UNIT", unitId: unit.id },
      PLAYER_CONTEXT,
    );

    expect(sold.ok).toBe(true);
    if (sold.ok) {
      expect(human(sold.state).inventory).toEqual(["jet-dial", "black-blade"]);
    }
  });
});

describe("P4A deterministic merge item handling", () => {
  it("retains distinct completed items and returns completed duplicates", () => {
    const state = mergeThree(
      "merge-duplicates",
      ["black-blade"],
      ["black-blade"],
      "meat-platter",
    );
    const player = human(state);
    const merged = Object.values(player.units)[0];

    expect(merged).toMatchObject({ star: 2, items: ["black-blade", "meat-platter"] });
    expect(player.inventory).toEqual(["black-blade"]);
  });

  it("retains at most one component, returns excess, and never auto-crafts", () => {
    const state = mergeThree(
      "merge-components",
      ["jet-dial"],
      ["armament-plate"],
      "sniper-lens",
    );
    const player = human(state);
    const merged = Object.values(player.units)[0];

    expect(merged.items).toEqual(["jet-dial"]);
    expect(player.inventory).toEqual(["armament-plate", "sniper-lens"]);
    expect(merged.items).not.toContain("armament-wraps");
  });

  it("prioritizes completed items and preserves existing overflow returns", () => {
    const state = mergeThree(
      "merge-overflow",
      ["black-blade", "jet-dial", "meat-platter"],
      ["clima-tact", "armament-plate"],
      "sniper-goggles",
    );
    const player = human(state);
    const merged = Object.values(player.units)[0];

    expect(merged.items).toEqual(["black-blade", "meat-platter", "clima-tact"]);
    expect(player.inventory).toEqual([
      "sniper-goggles",
      "jet-dial",
      "armament-plate",
    ]);
  });

  it("produces the same merge result for identical state", () => {
    const first = mergeThree(
      "deterministic-merge",
      ["black-blade", "jet-dial"],
      ["meat-platter", "armament-plate"],
      "clima-tact",
    );
    const second = mergeThree(
      "deterministic-merge",
      ["black-blade", "jet-dial"],
      ["meat-platter", "armament-plate"],
      "clima-tact",
    );

    expect(second).toEqual(first);
  });
});

describe("P4A form and save compatibility", () => {
  it.each([
    ["jet-dial", "armament-plate", "luffy-gear-4-boundman"],
    ["sniper-lens", "sea-prism-shard", "luffy-gear-4-snakeman"],
  ])(
    "preserves crafted Gear 4 catalysts",
    (firstId, secondId, expectedFormId) => {
      let state = createMatch(`crafted-${expectedFormId}`);
      resetRoster(human(state));
      const luffy = addFixtureUnit(state, "luffy");
      luffy.star = 3;
      human(state).inventory.push(firstId, secondId);
      const first = equip(state, luffy.id, firstId);
      if (!first.ok) throw new Error(first.error.message);
      state = first.state;

      const crafted = equip(state, luffy.id, secondId);

      expect(crafted.ok).toBe(true);
      if (crafted.ok) {
        expect(human(crafted.state).units[luffy.id]).toMatchObject({
          formId: expectedFormId,
        });
      }
    },
  );

  it("does not let raw components trigger Gear 4", () => {
    const state = createMatch("raw-components-no-form");
    resetRoster(human(state));
    const luffy = addFixtureUnit(state, "luffy");
    luffy.star = 3;
    human(state).inventory.push("armament-plate");

    const result = equip(state, luffy.id, "armament-plate");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(human(result.state).units[luffy.id]).not.toHaveProperty("formId");
    }
  });

  it("does not transition from a duplicate crafted catalyst returned to inventory", () => {
    const state = createMatch("duplicate-catalyst-no-transition");
    resetRoster(human(state));
    const luffy = addFixtureUnit(state, "luffy");
    luffy.star = 3;
    luffy.items = ["armament-wraps", "jet-dial"];
    human(state).inventory.push("armament-plate");

    const result = equip(state, luffy.id, "armament-plate");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(human(result.state).units[luffy.id]).not.toHaveProperty("formId");
      expect(human(result.state).inventory).toEqual(["armament-wraps"]);
    }
  });

  it("keeps Robin's existing progression unchanged", () => {
    const state = createMatch("robin-progression");
    resetRoster(human(state));
    const robin = addFixtureUnit(state, "robin");
    robin.star = 3;
    human(state).inventory.push("black-blade");

    const result = equip(state, robin.id, "black-blade");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(human(result.state).units[robin.id].formId).toBe(
        "robin-demonio-fleur",
      );
    }
  });

  it("keeps schema 6 and restores legacy item IDs", () => {
    const state = createMatch("legacy-item-save");
    state.contentVersion = "1.15.1";
    const player = human(state);
    player.inventory = [...LEGACY_ITEM_IDS];
    const restored = deserializeMatch(serializeMatch(state));

    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(restored.schemaVersion).toBe(6);
    expect(human(restored).inventory).toEqual(LEGACY_ITEM_IDS);
    expect(restored.contentVersion).toBe("1.16.0");
  });
});
