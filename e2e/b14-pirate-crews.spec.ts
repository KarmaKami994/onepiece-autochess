import { expect, test } from "@playwright/test";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { createMatch } from "../game";
import { installRuntimeBoundaryChecks, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("B14 loads the five recruits and displays both active pirate crew bonds", async ({ page }) => {
  const state = createMatch("b14-pirate-crews-hud");
  state.round = 6;
  state.stageId = "pvp-6";
  const player = state.players[0];
  player.level = 9;
  const recruits = ["heat", "wire", "shachi", "penguin", "jean-bart"];
  const crew = [...recruits, "kid", "killer", "law", "bepo"];
  for (const [index, id] of crew.entries()) {
    player.units[id] = { id, definitionId: id, star: 1, items: [], acquiredOrder: index + 1 };
    player.board[`${index % 8},${5 - Math.floor(index / 8)}`] = id;
    state.pool[id] -= 1;
  }

  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();

  const stage = page.locator(".phaser-stage-frame");
  for (const id of recruits) {
    await expect(stage).toHaveAttribute("data-presented-animations", new RegExp(`${id}-v2`));
  }

  for (const [bond, crewSize, effect] of [
    ["Kid Pirates", 4, "+12% Attack"],
    ["Heart Pirates", 5, "115 starting Shield"],
  ] as const) {
    await page.getByRole("button", { name: `${bond} synergy details`, exact: true }).hover();
    const details = page.getByRole("dialog", { name: `${bond} synergy details`, exact: true });
    await expect(details.locator(".current-tier")).toContainText(effect);
    const portraits = details.getByLabel(`${bond} crew`).locator("img");
    await expect(portraits).toHaveCount(crewSize);
    await expect.poll(() => portraits.evaluateAll(images =>
      images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
    )).toBe(true);
  }
});
