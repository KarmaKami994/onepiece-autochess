import { expect, test } from "@playwright/test";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { createMatch } from "../game";
import { installRuntimeBoundaryChecks, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("B16 presents all five recruits and activates the nine-member crew without Big Mom", async ({ page }) => {
  const state = createMatch("b16-whole-cake-hud");
  state.round = 6;
  state.stageId = "pvp-6";
  const player = state.players[0];
  player.level = 9;
  const recruits = ["perospero", "smoothie", "oven", "brulee", "daifuku"];
  const crew = [...recruits, "pudding", "cracker", "katakuri", "pekoms"];
  for (const [index, id] of [...crew, "big-mom"].entries()) {
    player.units[id] = { id, definitionId: id, star: 1, items: [], acquiredOrder: index + 1 };
    state.pool[id] -= 1;
  }
  for (const [index, id] of crew.entries()) player.board[`${index % 8},${5 - Math.floor(index / 8)}`] = id;
  player.bench[0] = "big-mom";

  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();

  const stage = page.locator(".phaser-stage-frame");
  for (const id of recruits) await expect(stage).toHaveAttribute("data-presented-animations", new RegExp(`${id}-v2`));
  const bond = "Big Mom Pirates synergy details";
  await page.getByRole("button", { name: bond, exact: true }).hover();
  const details = page.getByRole("dialog", { name: bond, exact: true });
  await expect(details.locator(".current-tier")).toContainText("42%");
  await expect(details.locator(".current-tier")).toContainText("Zeus, Prometheus and Napoleon");
});
