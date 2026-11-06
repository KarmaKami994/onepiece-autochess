import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CONTENT, createMatch, getFoodDefinition, prepareHarborOffers, type MatchState } from "../game";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { installRuntimeBoundaryChecks, readVoyageFixture, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

function harbor() {
  const state = createMatch("b09-galley-ui"); state.round = 16; state.stageId = "pvp-16";
  const player = state.players[0];
  player.units["galley-zoro"] = { id: "galley-zoro", definitionId: "zoro", star: 1, items: [], acquiredOrder: 1 };
  player.board["2,5"] = "galley-zoro"; state.pool.zoro -= 1;
  prepareHarborOffers(state, DEFAULT_CONTENT);
  return state;
}
async function resume(page: Page, state: MatchState) {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/"); await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
}

test("harbor food survives reload, serves accessibly once and remains frozen through battle resume", async ({ page }, testInfo) => {
  const state = harbor(); const offer = state.pendingHarborOffers["player-1"].find(offer => offer.kind === "food")!;
  if (offer.kind !== "food") throw new Error("Expected a food offer");
  const food = getFoodDefinition(offer.foodId, DEFAULT_CONTENT)!;
  await resume(page, state);
  const card = page.locator(".harbor-screen button.reward-card").filter({ has: page.getByText(food.name, { exact: true }) });
  await expect(card).toBeVisible(); await expect(card).toContainText("no equipment slot");
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(card).toBeVisible(); await card.click();
  const galley = page.getByRole("region", { name: "Ship's galley" });
  const serve = galley.getByRole("button", { name: `Serve ${food.name} (1 portions)` });
  await expect(serve).toBeDisabled();
  await galley.getByRole("combobox", { name: "Meal recipient" }).selectOption("galley-zoro");
  await expect(serve).toBeEnabled(); await serve.focus(); await page.keyboard.press("Enter");
  await expect(galley.getByRole("status")).toContainText(`Served: ${food.name}`);
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.players[0].foodInventory?.length).toBe(0);
  await page.screenshot({ path: `tmp/b09-galley-${testInfo.project.name}.png`, fullPage: true });
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(galley.getByRole("status")).toContainText(food.name); await expect(galley.getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: /START BATTLE/ }).click();
  await expect(page.getByLabel("Battle meals")).toBeVisible();
  await expect(page.getByLabel("Battle meals")).toContainText(food.name);
  const mealBounds = await page.getByLabel("Battle meals").boundingBox();
  const controlsBounds = await page.getByLabel("Combat presentation controls").boundingBox();
  expect(mealBounds).not.toBeNull(); expect(controlsBounds).not.toBeNull();
  expect(mealBounds!.y).toBeGreaterThanOrEqual(controlsBounds!.y + controlsBounds!.height);
  await page.screenshot({ path: `tmp/b09-battle-meals-${testInfo.project.name}.png`, fullPage: true });
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.foodHistory?.filter(receipt => receipt.playerId === "player-1" && receipt.kind === "applied").length).toBe(1);
  const saved = (await readVoyageFixture(page))!.state as MatchState;
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.getByLabel("Battle meals")).toContainText(food.name);
  const restored = (await readVoyageFixture(page))!.state as MatchState;
  expect(restored.players[0].foodInventory).toEqual([]); expect(restored.battleMeals).toEqual(saved.battleMeals);
  expect(restored.lastResults).toEqual(saved.lastResults);
});

test("full galley disables only food, explains the limit and permits sailing on", async ({ page }) => {
  const state = harbor(); state.players[0].foodInventory = ["cola-tonic", "cola-tonic", "pirate-curry"];
  await resume(page, state);
  const foodCard = page.locator(".harbor-screen button.reward-card").filter({ hasText: "FOOD ·" });
  await expect(foodCard).toBeDisabled(); await expect(foodCard).toContainText("Galley stock is full");
  await expect(page.locator(".harbor-screen button.reward-card:enabled")).toHaveCount(2);
  await page.getByRole("button", { name: "SAIL ON WITHOUT SUPPLIES" }).click();
  await expect(page.getByRole("region", { name: "Ship's galley" })).toContainText("3/3");
});

test("food codex is separate from all equipment recipes", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "Food & galley", exact: true }).click();
  await expect(page.locator(".reference-card")).toHaveCount(3);
  await page.getByLabel("Search codex").fill("cola");
  await expect(page.locator(".reference-card")).toHaveCount(1);
  await expect(page.locator(".reference-card")).toContainText("+15 starting Energy");
  await expect(page.locator(".reference-card")).toContainText("forfeits");
});
