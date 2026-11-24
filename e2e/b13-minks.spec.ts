import { expect, test } from "@playwright/test";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { createMatch } from "../game";
import { installRuntimeBoundaryChecks, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("B13 shows the original Mink animations and the new synergy thresholds in a resumed voyage", async ({ page }) => {
  const state = createMatch("b13-minks-hud");
  state.round = 6;
  state.stageId = "pvp-6";
  const player = state.players[0];
  player.level = 8;
  const crew = ["bepo", "carrot", "pedro", "pekoms", "nami", "usopp", "chopper", "sanji"];
  for (const [index, id] of crew.entries()) {
    player.units[id] = { id, definitionId: id, star: 1, items: [], acquiredOrder: index + 1 };
    player.board[`${index},5`] = id;
    state.pool[id] -= 1;
  }

  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();

  const stage = page.locator(".phaser-stage-frame");
  for (const id of crew.slice(0, 4)) {
    await expect(stage).toHaveAttribute("data-presented-animations", new RegExp(`${id}-v2`));
  }
  await page.getByRole("button", { name: "Minks synergy details", exact: true }).hover();
  const minks = page.getByRole("dialog", { name: "Minks synergy details", exact: true });
  await expect(minks.locator(".current-tier")).toContainText("70 base Special damage");
  await expect(minks).toContainText("35 base Special damage");
  const portraits = minks.getByLabel("Minks crew").locator("img");
  await expect(portraits).toHaveCount(4);
  await expect.poll(() => portraits.evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
  )).toBe(true);

  await page.getByRole("button", { name: "Straw Hat synergy details", exact: true }).hover();
  const strawHat = page.getByRole("dialog", { name: "Straw Hat synergy details", exact: true });
  await expect(strawHat.locator(".current-tier")).toContainText("12 Energy");
  await expect(strawHat).toContainText("20 Energy");
});
