import { expect, test } from "@playwright/test";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { createMatch } from "../game";
import { installRuntimeBoundaryChecks, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("B15 presents the recruits and the full crew bond with Big Mom benched", async ({ page }) => {
  const state = createMatch("b15-big-mom-pirates-hud");
  state.round = 6;
  state.stageId = "pvp-6";
  const player = state.players[0];
  player.level = 5;
  const deployed = ["pudding", "cracker", "katakuri", "pekoms"];
  for (const [index, id] of [...deployed, "big-mom"].entries()) {
    player.units[id] = { id, definitionId: id, star: 1, items: [], acquiredOrder: index + 1 };
    state.pool[id] -= 1;
  }
  for (const [index, id] of deployed.entries()) player.board[`${index + 1},5`] = id;
  player.bench[0] = "big-mom";

  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();

  const stage = page.locator(".phaser-stage-frame");
  for (const id of ["pudding", "cracker", "katakuri", "big-mom"]) {
    await expect(stage).toHaveAttribute("data-presented-animations", new RegExp(`${id}-v2`));
  }

  const name = "Big Mom Pirates synergy details";
  await page.getByRole("button", { name, exact: true }).hover();
  await expect(page.getByRole("dialog", { name, exact: true }).locator(".current-tier")).toContainText("25%");
});
