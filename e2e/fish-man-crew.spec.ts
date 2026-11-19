import { expect, test } from "@playwright/test";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { createMatch } from "../game";
import { installRuntimeBoundaryChecks, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("Fish-Man crew and both Tidal Guard thresholds are visible in a resumed voyage", async ({ page }) => {
  const state = createMatch("fish-man-hud");
  state.round = 6;
  state.stageId = "pvp-6";
  const player = state.players[0];
  player.level = 4;
  const crew = ["hatchan", "kuroobi", "fisher-tiger", "jinbe"];
  for (const [index, id] of crew.entries()) {
    player.units[id] = { id, definitionId: id, star: 1, items: [], acquiredOrder: index + 1 };
    player.board[`${index + 1},5`] = id;
    state.pool[id] -= 1;
  }

  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  const stage = page.locator(".phaser-stage-frame");
  for (const asset of ["hatchan-v2", "kuroobi-v2", "fisher-tiger-v2"]) {
    await expect(stage).toHaveAttribute("data-presented-animations", new RegExp(asset));
  }

  const row = page.getByRole("button", { name: "Fish-Man synergy details", exact: true });
  await row.hover();
  const details = page.getByRole("dialog", { name: "Fish-Man synergy details", exact: true });
  await expect(details.locator(".current-tier")).toContainText("Adjacent allies each gain 80 Shield");
  await expect(details).toContainText("gain 55 Shield");
  await expect(details.getByLabel("Fish-Man crew").locator("img")).toHaveCount(4);
  await expect.poll(() => details.getByLabel("Fish-Man crew").locator("img").evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
  )).toBe(true);
});
