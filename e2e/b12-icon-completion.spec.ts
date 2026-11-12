import { expect, test, type Locator, type Page } from "@playwright/test";
import { advanceMatchPhase, createMatch, DEFAULT_CONTENT, type MatchState } from "../game";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { createTeamPlan } from "../game/teamPlanner";
import { newVoyageReplay, observeVoyage } from "../app/chronicle";
import { installRuntimeBoundaryChecks, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

async function loaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
}
async function menu(page: Page) {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
}
async function resume(page: Page, state: MatchState) {
  await menu(page); await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
}
function preparation() {
  const state = createMatch("b12-ui-icons"); state.round = 6; state.stageId = "pvp-6";
  const player = state.players[0];
  player.units["b12-zoro"] = { id: "b12-zoro", definitionId: "zoro", star: 1, items: ["sniper-lens"], acquiredOrder: 1 };
  player.board["2,5"] = "b12-zoro"; state.pool.zoro -= 1;
  player.inventory = ["black-blade-shard", "sea-prism-stone", "emperors-jolly-roger"];
  return state;
}

test("all four icon families load in the real codex with unchanged names, recipes and no external requests", async ({ page }, info) => {
  await menu(page); await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  for (const [tab, family, count] of [["Items & recipes", "items", 65], ["Food & galley", "food", 3], ["Bonds", "traits", 13], ["Status", "status", 12]] as const) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    const cards = page.locator(".reference-card"); await expect(cards).toHaveCount(count);
    for (let i = 0; i < count; i += 1) {
      const image = cards.nth(i).locator(`img[src^="/assets/${family}/"]`);
      await image.scrollIntoViewIfNeeded(); await loaded(image);
    }
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${family}-codex.png`) });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("inventory, crafting and inspector share the new identities and keep the glyph on image-decode failure", async ({ page }, info) => {
  // A successful local response with undecodable bytes exercises onError without
  // suppressing the ordinary console/network boundary assertions.
  await page.route("**/assets/items/sea-prism-stone.svg", route => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "undecodable icon fixture" }));
  await resume(page, preparation());
  await expect(page.locator(".phaser-stage-frame canvas")).toBeVisible();
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-camera-zoom", /\d/);
  const inventory = page.getByRole("complementary", { name: "Treasure inventory" });
  await inventory.getByRole("combobox", { name: "Select crew for orders" }).selectOption("b12-zoro");
  const shard = inventory.getByRole("button", { name: /^Equip Black Blade Shard/ });
  await loaded(shard.locator("img"));
  await expect(shard).toHaveAttribute("data-tooltip", /crafts and equips Black Blade/);
  const stoneItem = DEFAULT_CONTENT.items.find(item => item.id === "sea-prism-stone")!;
  const stone = inventory.getByRole("button", { name: `Equip ${stoneItem.name} to Zoro`, exact: true });
  await expect(stone).toBeVisible();
  await expect(stone.locator("img")).toHaveCount(0);
  await expect(stone).toContainText(stoneItem.icon);
  await page.screenshot({ path: info.outputPath("inventory-craft-fallback.png") });
  await shard.click();
  const inspector = page.locator(".unit-inspector");
  await loaded(inspector.locator('img[src="/assets/items/black-blade.svg"]'));
  await expect(inspector).toContainText("Black Blade");
  await page.screenshot({ path: info.outputPath("inspector.png") });
});

test("planner equipment previews use the same item artwork and retain legal isolated combat", async ({ page }, info) => {
  await menu(page); await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  const plan = createTeamPlan(); plan.name = "B12 shared identities";
  plan.teams.a = [{ id: "zoro", definitionId: "zoro", star: 1, items: ["black-blade", "phoenix-feather", "emperors-jolly-roger"], position: { x: 1, y: 3 } }];
  plan.teams.b = [{ id: "nami", definitionId: "nami", star: 1, items: [], position: { x: 1, y: 3 } }];
  await page.getByLabel("Import plan", { exact: true }).setInputFiles({ name: "b12.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(plan)) });
  await page.getByRole("button", { name: "Team A column 2 row 4, Zoro", exact: true }).click();
  const preview = page.getByLabel("Team A equipment preview", { exact: true });
  await expect(preview.locator("img")).toHaveCount(3);
  for (const id of plan.teams.a[0].items) await loaded(preview.locator(`img[src="/assets/items/${id}.svg"]`));
  await preview.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath("planner-equipment.png") });
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  await expect(page.getByRole("region", { name: "Combat test result" }).locator("canvas")).toBeVisible();
});

test("carousel loads the same local item assets into Phaser", async ({ page }, info) => {
  const state = createMatch("b12-regatta"); state.round = 3; state.phase = "item-choice";
  const carousel = advanceMatchPhase(state); expect(carousel.phase).toBe("carousel");
  const paths = new Set<string>();
  page.on("response", response => { if (new URL(response.url()).pathname.startsWith("/assets/items/") && response.ok()) paths.add(new URL(response.url()).pathname); });
  await resume(page, carousel);
  await expect(page.locator("[data-carousel-ready=true]")).toBeVisible();
  await expect.poll(() => paths.size).toBeGreaterThan(0);
  await page.locator(".carousel-screen canvas").screenshot({ path: info.outputPath("carousel.png") });
});

test("Chronicle resolves recorded inventory through current artwork while preserving recorded names", async ({ page }, info) => {
  await menu(page); await page.getByRole("button", { name: /VOYAGE CHRONICLE/ }).click();
  const state = preparation();
  const replay = observeVoyage(newVoyageReplay(state, DEFAULT_CONTENT, "b12-import", 1), state, 2);
  await page.getByLabel("Import replay", { exact: true }).setInputFiles({ name: "b12-replay.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(replay)) });
  await page.getByRole("button", { name: "View b12-ui-icons", exact: true }).click();
  const details = page.locator(".replay-snapshot-details");
  for (const id of state.players[0].inventory) await loaded(details.locator(`img[src="/assets/items/${id}.svg"]`));
  await expect(details).toContainText("Black Blade Shard");
  await details.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath("chronicle.png") });
});
