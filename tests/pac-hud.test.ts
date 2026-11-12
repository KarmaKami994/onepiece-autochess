import { describe, expect, it } from "vitest";
import { createMatch, DEFAULT_CONTENT } from "../game";
import { selectMatchView } from "../app/selectors";
import { matchingTraitUnits } from "../app/hud/PacHud";

describe("PAC HUD presentation adapters", () => {
  it("exposes local thresholds, member portraits and the actual stage route without mutating state", () => {
    const state = createMatch("pac-hud-view"); const player = state.players[0];
    player.units.zoro = { id: "zoro", definitionId: "zoro", star: 1, items: ["emperors-jolly-roger"], acquiredOrder: 1 };
    player.board["1,5"] = "zoro"; state.pool.zoro -= 1;
    const before = JSON.stringify(state); const view = selectMatchView(state);
    const strawHat = view.traits.find(trait => trait.id === "straw-hat")!;
    expect(strawHat.thresholds.map(tier => tier.required)).toEqual(DEFAULT_CONTENT.traits.find(trait => trait.id === "straw-hat")!.tiers.map(tier => tier.required));
    expect(strawHat.members.map(member => member.id)).toContain("zoro");
    expect(strawHat.members.every(member => member.portrait.startsWith("/assets/portraits/"))).toBe(true);
    expect(matchingTraitUnits("straw-hat", view.boardUnits, view.selectedDefinitionByUnit, view.itemsById).map(unit => unit.id)).toEqual(["zoro"]);
    expect(matchingTraitUnits("emperor", view.boardUnits, view.selectedDefinitionByUnit, view.itemsById).map(unit => unit.id)).toEqual(["zoro"]);
    expect(view.stagePath[0]).toMatchObject({ round: 1, kind: "pve" });
    expect(view.stagePath.find(stage => stage.round === 4)?.kind).toBe("carousel");
    expect(view.selectedDefinitionByUnit.get("zoro")?.stats.specialDefense).toBe(DEFAULT_CONTENT.units.find(unit => unit.id === "zoro")!.stats.specialDefense ?? DEFAULT_CONTENT.units.find(unit => unit.id === "zoro")!.stats.defense);
    expect(JSON.stringify(state)).toBe(before);
  });
});
