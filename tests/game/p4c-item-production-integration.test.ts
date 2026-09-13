import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ACQUIRABLE_ITEM_IDS,
  DEFAULT_CONTENT,
  addUnitToPlayer,
  advanceMatchPhase,
  applyCommand,
  createMatch,
  getActiveTraits,
  getEffectiveUnitTraits,
  getItemDefinition,
  runBotTurn,
  type GameContent,
  type MatchBattleResult,
  type MatchState,
  type PlayerState,
  type UnitInstance,
} from "../../game";
import {
  activateItemEquip,
  createItemEquipPreview,
  createItemView,
} from "../../app/selectors";
import { InventoryTray } from "../../app/screens/GameScreens";
import type { BoardUnit } from "../../components/PhaserBoard";
import { carouselBountyColumn } from "../../components/PhaserCarousel";

const PLAYER_CONTEXT = { actorPlayerId: "player-1" };
const COMPONENT_IDS = [
  "jolly-roger-fragment",
  "devil-fruit-essence",
  "cola-canister",
  "jet-dial",
  "sniper-lens",
  "sea-king-meat",
  "sea-prism-shard",
  "black-blade-shard",
  "armament-plate",
  "captains-sash",
] as const;
const TRAIT_GRANTS = [
  ["emperors-jolly-roger", "emperor", []],
  ["specialists-log-pose", "specialist", [{ kind: "ability-power-percent", value: 20 }]],
  ["marine-justice-coat", "navy", [{ kind: "starting-energy", value: 30 }]],
  ["marksmans-thunder-dial", "marksman", [{ kind: "attack-speed-percent", value: 20 }]],
  ["revolutionary-flame", "revolutionary", [{ kind: "attack-flat", value: 18 }]],
  ["straw-hat-token", "straw-hat", [{ kind: "defense-flat", value: 6 }]],
  ["captains-logbook", "captain", [{ kind: "critical-chance-percent", value: 20 }]],
  ["brawlers-rumble-emblem", "brawler", [{ kind: "health-flat", value: 90 }]],
  ["guardians-sea-prism-crest", "guardian", [{ kind: "special-defense-flat", value: 6 }]],
  ["swordsmans-knot", "swordsman", [{ kind: "shield-flat", value: 90 }]],
] as const;

function human(state: MatchState): PlayerState {
  const player = state.players.find((candidate) => candidate.id === "player-1");
  if (!player) throw new Error("Missing player fixture.");
  return player;
}

function resetRoster(player: PlayerState): void {
  player.units = {};
  player.board = {};
  player.bench = player.bench.map(() => null);
  player.inventory = [];
}

function addUnit(
  state: MatchState,
  definitionId: string,
  boardX?: number,
): UnitInstance {
  const player = human(state);
  const unit = addUnitToPlayer(state, player, definitionId, DEFAULT_CONTENT);
  if (!unit) throw new Error("Could not add unit fixture.");
  if (boardX !== undefined) {
    const slot = player.bench.indexOf(unit.id);
    if (slot >= 0) player.bench[slot] = null;
    player.board[`${boardX},3`] = unit.id;
  }
  return unit;
}

function equip(state: MatchState, unitId: string, itemId: string) {
  return applyCommand(
    state,
    { type: "EQUIP_ITEM", unitId, itemId },
    PLAYER_CONTEXT,
    DEFAULT_CONTENT,
  );
}

function selectedBoardUnit(items: string[]): BoardUnit {
  return {
    id: "selected-unit",
    contentId: "zoro",
    name: "Roronoa Zoro",
    shortName: "Zoro",
    color: 0,
    team: "player",
    zone: "board",
    x: 0,
    y: 3,
    slot: 0,
    star: 1,
    items,
    hp: 750,
    maxHp: 750,
  };
}

describe("P4C item production integration", () => {
  it("defines the exact ten trait grants, values, component pool, and distinct glyphs", () => {
    expect(ACQUIRABLE_ITEM_IDS).toEqual(COMPONENT_IDS);
    expect(new Set(COMPONENT_IDS.map((id) => getItemDefinition(id)?.icon)).size).toBe(10);
    for (const [itemId, traitId, effects] of TRAIT_GRANTS) {
      expect(getItemDefinition(itemId)).toMatchObject({
        kind: "completed",
        grantedTraitId: traitId,
        effects,
      });
    }
    expect(DEFAULT_CONTENT.version).toBe("1.30.0");
  });

  it("counts deployed grants like native traits while deduping native and same-definition contributors", () => {
    const state = createMatch("p4c-trait-count");
    const player = human(state);
    resetRoster(player);
    const zoro = addUnit(state, "zoro", 0);
    zoro.items = ["swordsmans-knot"];
    const nami = addUnit(state, "nami", 1);
    nami.items = ["swordsmans-knot"];
    const secondNami = addUnit(state, "nami", 2);
    secondNami.items = ["swordsmans-knot"];
    const benched = addUnit(state, "luffy");
    benched.items = ["swordsmans-knot"];

    const swordsman = getActiveTraits(player).find((trait) => trait.traitId === "swordsman");
    expect(swordsman?.count).toBe(2);
    expect(swordsman?.tierIndex).toBe(0);
  });

  it("uses resolved persistent-form traits and dedupes an identical held grant", () => {
    const content: GameContent = {
      ...DEFAULT_CONTENT,
      forms: DEFAULT_CONTENT.forms.map((form) =>
        form.id === "luffy-gear-4-boundman"
          ? { ...form, traits: ["emperor"] }
          : form),
    };
    expect(getEffectiveUnitTraits({
      definitionId: "luffy",
      formId: "luffy-gear-4-boundman",
      items: ["emperors-jolly-roger"],
    }, content)).toEqual(["emperor"]);
  });

  it("rejects a directly redundant native trait grant without consuming inventory", () => {
    const state = createMatch("p4c-direct-redundant");
    const player = human(state);
    resetRoster(player);
    const zoro = addUnit(state, "zoro");
    player.inventory = ["swordsmans-knot"];

    const result = equip(state, zoro.id, "swordsmans-knot");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ITEM_TRAIT_DUPLICATE");
    expect(human(result.state).inventory).toEqual(["swordsmans-knot"]);
    expect(human(result.state).units[zoro.id].items).toEqual([]);
  });

  it("crafts a redundant trait grant successfully and moves the result to inventory", () => {
    const state = createMatch("p4c-redundant-craft");
    const player = human(state);
    resetRoster(player);
    const zoro = addUnit(state, "zoro");
    zoro.items = ["jolly-roger-fragment"];
    player.inventory = ["captains-sash"];

    const result = equip(state, zoro.id, "captains-sash");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(human(result.state).units[zoro.id].items).toEqual([]);
    expect(human(result.state).inventory).toEqual(["swordsmans-knot"]);
  });

  it("returns merge-redundant grants without auto-crafting or deleting them", () => {
    const state = createMatch("p4c-merge-return");
    const player = human(state);
    resetRoster(player);
    const first = addUnit(state, "zoro");
    first.items = ["swordsmans-knot"];
    addUnit(state, "zoro");
    addUnit(state, "zoro");

    const merged = Object.values(player.units)[0];
    expect(merged).toMatchObject({ star: 2, items: [] });
    expect(player.inventory).toEqual(["swordsmans-knot"]);
  });

  it("backfills all three completed slots after returning a native-trait grant", () => {
    const state = createMatch("p4c-completed-backfill");
    const player = human(state);
    resetRoster(player);
    const first = addUnit(state, "zoro");
    first.items = ["swordsmans-knot", "black-blade", "meat-platter"];
    const second = addUnit(state, "zoro");
    second.items = ["clima-tact"];
    addUnit(state, "zoro");

    const merged = Object.values(player.units)[0];
    expect(merged.items).toEqual(["black-blade", "meat-platter", "clima-tact"]);
    expect(player.inventory).toEqual(["swordsmans-knot"]);
  });

  it("backfills a component after returning a native-trait grant", () => {
    const state = createMatch("p4c-component-backfill");
    const player = human(state);
    resetRoster(player);
    const first = addUnit(state, "zoro");
    first.items = ["swordsmans-knot", "black-blade", "meat-platter"];
    const second = addUnit(state, "zoro");
    second.items = ["jet-dial"];
    addUnit(state, "zoro");

    const merged = Object.values(player.units)[0];
    expect(merged.items).toEqual(["black-blade", "meat-platter", "jet-dial"]);
    expect(player.inventory).toEqual(["swordsmans-knot"]);
  });

  it("returns a grant made redundant by the merged unit's resolved persistent form", () => {
    const content: GameContent = {
      ...DEFAULT_CONTENT,
      forms: DEFAULT_CONTENT.forms.map((form) =>
        form.id === "robin-demonio-fleur"
          ? { ...form, traits: ["emperor"] }
          : form),
    };
    const state = createMatch("p4c-form-merge", content);
    const player = human(state);
    resetRoster(player);
    const first = addUnitToPlayer(state, player, "robin", content);
    if (!first) throw new Error("Could not add Robin fixture.");
    first.items = ["emperors-jolly-roger"];
    for (let index = 1; index < 9; index += 1) {
      if (!addUnitToPlayer(state, player, "robin", content)) {
        throw new Error(`Could not add Robin fixture ${index}.`);
      }
    }

    const merged = Object.values(player.units)[0];
    expect(merged).toMatchObject({
      star: 3,
      formId: "robin-demonio-fleur",
      items: [],
    });
    expect(player.inventory).toEqual(["emperors-jolly-roger"]);
  });

  it("backfills after a persistent form makes a retained grant redundant", () => {
    const content: GameContent = {
      ...DEFAULT_CONTENT,
      forms: DEFAULT_CONTENT.forms.map((form) =>
        form.id === "robin-demonio-fleur"
          ? { ...form, traits: ["emperor"] }
          : form),
    };
    const state = createMatch("p4c-form-backfill", content);
    const player = human(state);
    resetRoster(player);
    for (let index = 0; index < 6; index += 1) {
      if (!addUnitToPlayer(state, player, "robin", content)) {
        throw new Error(`Could not add Robin fixture ${index}.`);
      }
    }
    const twoStars = Object.values(player.units)
      .filter((unit) => unit.star === 2)
      .sort((left, right) => left.acquiredOrder - right.acquiredOrder);
    twoStars[0].items = [
      "emperors-jolly-roger",
      "black-blade",
      "meat-platter",
    ];
    twoStars[1].items = ["clima-tact"];
    for (let index = 6; index < 9; index += 1) {
      if (!addUnitToPlayer(state, player, "robin", content)) {
        throw new Error(`Could not add Robin fixture ${index}.`);
      }
    }

    const merged = Object.values(player.units)[0];
    expect(merged).toMatchObject({
      star: 3,
      formId: "robin-demonio-fleur",
      items: ["black-blade", "meat-platter", "clima-tact"],
    });
    expect(player.inventory).toEqual(["emperors-jolly-roger"]);
  });

  it("keeps component acquisition deterministic, distinct for PvE, and victory-gated", () => {
    const state = createMatch("p4c-pve-reward");
    state.round = 2;
    state.stageId = "rifle-line";
    state.phase = "battle";
    state.lastResults = state.players.map((player): MatchBattleResult => ({
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
    }));
    const rewarded = advanceMatchPhase(state);
    const choices = rewarded.pendingItemChoices["player-1"];
    expect(choices).toHaveLength(3);
    expect(new Set(choices)).toHaveLength(3);
    expect(choices.every((id) => COMPONENT_IDS.includes(id as never))).toBe(true);

    state.lastResults = state.lastResults.map((result) => ({ ...result, winnerId: null }));
    expect(advanceMatchPhase(state).pendingItemChoices["player-1"]).toBeUndefined();
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "pve" && stage.round < 20).map((stage) => stage.round))
      .toEqual([1, 2, 3, 9, 14, 19]);
  });

  it("keeps carousel cadence and limits each component to two copies", () => {
    expect(DEFAULT_CONTENT.stages.filter((stage) => stage.kind === "carousel" && stage.round < 20).map((stage) => stage.round))
      .toEqual([4, 12, 17]);
    const state = createMatch("p4c-carousel");
    state.round = 3;
    state.phase = "item-choice";
    state.pendingItemChoices = {};
    const choices = advanceMatchPhase(state).carouselChoices.map((choice) => choice.itemId);
    const counts = new Map<string, number>();
    choices.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    expect(choices.every((id) => COMPONENT_IDS.includes(id as never))).toBe(true);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });

  it("exposes recipe/grant metadata and truthful selected-holder craft previews", () => {
    const component = createItemView("jolly-roger-fragment");
    const completed = createItemView("swordsmans-knot");
    expect(component.kind).toBe("component");
    expect(component.recipeResults).toHaveLength(10);
    expect(completed.grantedTrait).toEqual({ id: "swordsman", name: "Swordsman" });
    expect(completed.recipeComponents?.map((part) => part.id)).toEqual([
      "captains-sash",
      "jolly-roger-fragment",
    ]);
    const preview = createItemEquipPreview({
      definitionId: "zoro",
      items: ["jolly-roger-fragment", "black-blade", "meat-platter"],
    }, "captains-sash");
    expect(preview).toMatchObject({
      eligible: true,
      kind: "craft",
      resultId: "swordsmans-knot",
      returnsToInventory: true,
    });
  });

  it("renders semantic recipe details and keeps aria-disabled items focusable", () => {
    const component = createItemView("jolly-roger-fragment");
    const completedGrant = createItemView("swordsmans-knot");
    const unit = selectedBoardUnit([
      "black-blade",
      "meat-platter",
      "clima-tact",
    ]);
    const markup = renderToStaticMarkup(createElement(InventoryTray, {
      items: [component, completedGrant],
      units: [unit],
      selectedId: unit.id,
      selectedUnit: unit,
      selectedName: unit.name,
      disabled: false,
      help: "Choose an item.",
      highlighted: false,
      onSelect: () => undefined,
      onEquip: () => undefined,
    }));

    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup).not.toMatch(/<button[^>]*class="has-item"[^>]*disabled=""/);
    expect(markup).toContain('aria-describedby="inventory-item-details-0"');
    expect(markup).toContain("COMPONENT");
    expect(markup.match(/<li>/g)).toHaveLength(10);
    expect(markup).toContain("COMPLETED ITEM");
    expect(markup).toContain("Recipe components: Captain&#x27;s Sash + Jolly Roger Fragment.");
    expect(markup).toContain("Grants: Swordsman.");
  });

  it("suppresses aria-disabled activation while preserving valid activation", () => {
    const blockedPreview = createItemEquipPreview({
      definitionId: "zoro",
      items: [],
    }, "swordsmans-knot");
    const validPreview = createItemEquipPreview({
      definitionId: "luffy",
      items: [],
    }, "black-blade");
    const equipped: string[] = [];

    activateItemEquip("swordsmans-knot", blockedPreview, false, (itemId) => {
      equipped.push(itemId);
    });
    activateItemEquip("black-blade", validPreview, false, (itemId) => {
      equipped.push(itemId);
    });

    expect(blockedPreview?.eligible).toBe(false);
    expect(validPreview?.eligible).toBe(true);
    expect(equipped).toEqual(["black-blade"]);
  });

  it("uses legacy bounty frames only for the original eight sheet IDs", () => {
    expect(carouselBountyColumn({
      id: "legacy",
      itemId: "black-blade",
      name: "Black Blade",
      orbitIndex: 0,
      takenByPlayerId: null,
    })).toBe(0);
    expect(carouselBountyColumn({
      id: "component",
      itemId: "jolly-roger-fragment",
      name: "Jolly Roger Fragment",
      orbitIndex: 0,
      takenByPlayerId: null,
    })).toBeNull();
  });

  it("lets bots craft recipe-aware components while rejecting redundant direct grants", () => {
    const state = createMatch("p4c-bot-craft");
    const player = human(state);
    resetRoster(player);
    const zoro = addUnit(state, "zoro", 0);
    zoro.items = ["jolly-roger-fragment"];
    player.inventory = ["devil-fruit-essence", "swordsmans-knot"];
    player.gold = 0;
    player.shop = player.shop.map(() => null);
    player.isBot = true;
    player.personalityId = "balanced";

    const next = runBotTurn(state, player.id);
    const updated = human(next).units[zoro.id];
    expect(updated.items).toContain("specialists-log-pose");
    expect(updated.items).not.toContain("swordsmans-knot");
    expect(human(next).inventory).toContain("swordsmans-knot");
  });

  it("routes a duplicate craft result to a legal recipient and keeps processing", () => {
    const setup = () => {
      const state = createMatch("p4c-bot-duplicate-result");
      const player = human(state);
      resetRoster(player);
      const first = addUnit(state, "zoro", 0);
      first.items = ["black-blade", "sniper-lens"];
      const second = addUnit(state, "nami", 1);
      player.inventory = ["black-blade-shard", "meat-platter"];
      player.gold = 0;
      player.shop = player.shop.map(() => null);
      player.isBot = true;
      player.personalityId = "balanced";
      const crafted = equip(state, first.id, "black-blade-shard");
      if (!crafted.ok) throw new Error(crafted.error.message);
      return { state: crafted.state, firstId: first.id, secondId: second.id };
    };
    const firstRun = setup();
    const secondRun = setup();
    const firstResult = runBotTurn(firstRun.state, "player-1");
    const secondResult = runBotTurn(secondRun.state, "player-1");
    const player = human(firstResult);

    expect(firstResult).toEqual(secondResult);
    expect(player.inventory).toEqual([]);
    expect(player.units[firstRun.firstId].items.filter((id) => id === "black-blade"))
      .toHaveLength(1);
    expect(player.units[firstRun.secondId].items).toContain("black-blade");
    expect(Object.values(player.units).some((unit) => unit.items.includes("meat-platter")))
      .toBe(true);
  });

  it("skips a direct duplicate instead of stopping later legal item processing", () => {
    const state = createMatch("p4c-bot-direct-duplicate");
    const player = human(state);
    resetRoster(player);
    const zoro = addUnit(state, "zoro", 0);
    zoro.items = ["black-blade"];
    player.inventory = ["black-blade", "jolly-roger-fragment"];
    player.gold = 0;
    player.shop = player.shop.map(() => null);
    player.isBot = true;
    player.personalityId = "balanced";

    const next = runBotTurn(state, player.id);
    expect(human(next).units[zoro.id].items).toEqual([
      "black-blade",
      "jolly-roger-fragment",
    ]);
    expect(human(next).inventory).toEqual(["black-blade"]);
  });

  it("keeps duplicate-result component crafting legal at the item cap", () => {
    const state = createMatch("p4c-bot-craft-at-cap");
    const player = human(state);
    resetRoster(player);
    const zoro = addUnit(state, "zoro", 0);
    zoro.items = ["black-blade", "meat-platter", "sniper-lens"];
    player.inventory = ["black-blade-shard"];
    player.gold = 0;
    player.shop = player.shop.map(() => null);
    player.isBot = true;
    player.personalityId = "balanced";

    const next = runBotTurn(state, player.id);
    expect(human(next).units[zoro.id].items).toEqual([
      "black-blade",
      "meat-platter",
    ]);
    expect(human(next).inventory).toEqual(["black-blade"]);
  });

  it("keeps all ten trait grants out of Mystery Treasure Chest battle rolls", () => {
    expect(TRAIT_GRANTS.every(([itemId]) => getItemDefinition(itemId)?.grantedTraitId)).toBe(true);
  });
});
