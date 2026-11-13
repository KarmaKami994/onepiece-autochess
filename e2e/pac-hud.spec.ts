import { expect, test, type Page } from "@playwright/test";
import { createMatch, type MatchState } from "../game";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { installRuntimeBoundaryChecks, readVoyageFixture, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();
function fixture() {
  const state = createMatch("pac-hud-parity"); state.round = 6; state.stageId = "pvp-6";
  const player = state.players[0]; player.gold = 40;
  for (const [id, definitionId] of [["hud-zoro", "zoro"], ["hud-nami", "nami"], ["hud-chopper", "chopper"]]) {
    player.units[id] = { id, definitionId, star: 1, items: [], acquiredOrder: Object.keys(player.units).length + 1 }; state.pool[definitionId] -= 1;
  }
  player.board = { "2,5": "hud-zoro", "3,5": "hud-nami" }; player.bench[0] = "hud-chopper";
  player.inventory = ["jolly-roger-fragment", "black-blade-shard", "sniper-lens", "sea-prism-stone", "phoenix-feather", "jet-dial", "cola-canister", "captains-sash"];
  player.foodInventory = ["sea-king-bento", "cola-tonic", "pirate-curry"];
  return state;
}
async function resume(page: Page, state: MatchState) {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/"); await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-camera-zoom", /\d/);
}

test("PAC HUD keeps captains, six offers and synergy/recipe hovers readable without mutating the voyage", async ({ page }, info) => {
  await resume(page, fixture());
  const before = (await readVoyageFixture(page))!.state as MatchState;
  const captains = page.getByRole("complementary", { name: "Captain standings" });
  await expect(captains.locator("li")).toHaveCount(8);
  expect((await captains.boundingBox())!.width).toBeLessThanOrEqual(100);
  await expect(page.locator(".shop-card")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("pac-hud.png") });
  const synergy = page.getByRole("button", { name: "Straw Hat synergy details", exact: true });
  await synergy.hover();
  const synergyCard = page.getByRole("dialog", { name: "Straw Hat synergy details", exact: true });
  await expect(synergyCard).toBeVisible(); await expect(synergyCard.locator(".current-tier")).toHaveCount(1);
  await expect(synergyCard.getByLabel("Straw Hat crew")).toBeVisible();
  await expect.poll(() => synergyCard.locator(".synergy-members img").evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-highlighted-units", /hud-zoro/);
  await page.screenshot({ path: info.outputPath("synergy-hover.png") });
  const inventory = page.getByRole("complementary", { name: "Treasure inventory" });
  await inventory.getByRole("combobox", { name: "Select crew for orders" }).selectOption("hud-zoro");
  await expect(page.locator(".unit-inspector")).toBeVisible(); await expect(captains).toBeVisible();
  await expect(page.locator(".unit-inspector")).toContainText("SP. DEF");
  await expect(page.locator(".inspector-header")).toBeInViewport();
  await expect(page.locator(".inspector-stat").filter({ hasText: "SP. DEF" })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("crew-details.png") });
  const item = inventory.getByRole("button", { name: /^Equip Jolly Roger Fragment/ });
  await item.hover();
  const itemCard = page.getByRole("dialog", { name: "Jolly Roger Fragment details", exact: true });
  await expect(itemCard).toBeVisible(); await expect(itemCard.locator(".game-item-detail-combination")).toHaveCount(10);
  await expect(synergyCard).toHaveCount(0);
  const recipe = itemCard.getByRole("button", { name: /^Inspect / }).first();
  await recipe.hover(); await expect(page.locator(".pac-hud-tooltip.is-nested")).toBeVisible();
  await expect(page.locator(".pac-hud-tooltip.is-nested .game-item-detail-combinations")).toHaveCount(0);
  await expect(itemCard).toBeVisible();
  await page.screenshot({ path: info.outputPath("item-recipe-hover.png") });
  const after = (await readVoyageFixture(page))!.state as MatchState;
  expect(after.players[0].inventory).toEqual(before.players[0].inventory);
  expect(after.players[0].gold).toBe(before.players[0].gold);
  expect(after.players[0].units).toEqual(before.players[0].units);
});

test("keyboard recipe inspection and galley remain accessible through PAC cards", async ({ page }, info) => {
  await resume(page, fixture());
  const inventory = page.getByRole("complementary", { name: "Treasure inventory" });
  await inventory.getByRole("combobox", { name: "Select crew for orders" }).selectOption("hud-zoro");
  const item = inventory.getByRole("button", { name: /^Equip Jolly Roger Fragment/ });
  await item.focus(); await expect(page.getByRole("dialog", { name: "Jolly Roger Fragment details", exact: true })).toBeVisible();
  await item.press("F2");
  await expect(page.getByRole("dialog", { name: "Jolly Roger Fragment details", exact: true }).getByRole("button", { name: /^Inspect / }).first()).toBeFocused();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(item).toBeFocused(); await expect(page.locator(".pac-hud-tooltip")).toHaveCount(0);
  await page.getByRole("button", { name: "Open ship's galley", exact: true }).focus();
  const galley = page.getByRole("region", { name: "Ship's galley" });
  await expect(galley).toBeVisible(); await expect(galley.getByRole("button", { name: /Serve / })).toHaveCount(3);
  await expect(galley.getByRole("combobox", { name: "Meal recipient" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("galley-card.png") });
});

test("floating crew actions deploy and sell only the selected recruit without clicking the board behind", async ({ page }) => {
  const state = fixture(); state.players[0].level = 3;
  await resume(page, state);
  await page.getByRole("combobox", { name: "Select crew for orders" }).selectOption("hud-chopper");
  const crew = page.getByRole("list", { name: "Units on the tactical board" });
  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
  await expect(crew).toContainText("Chopper, 1 star, player, column 1, row 6");
  await expect(crew).not.toContainText("bench slot 1");
  await page.locator(".unit-inspector").getByRole("button", { name: /SELL/ }).click();
  await expect(crew).not.toContainText("Chopper");
  await expect(crew).toContainText("Zoro, 1 star, player, column 3, row 6");
  await expect(crew).toContainText("Nami, 1 star, player, column 4, row 6");
  await expect(page.locator(".gold-pouch strong")).toHaveText("41");
});
