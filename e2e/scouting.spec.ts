import { expect, test } from "@playwright/test";
import { installRuntimeBoundaryChecks, openFreshVoyage } from "./helpers";

installRuntimeBoundaryChecks();

test("captain standings provide accessible read-only scouting", async ({
  page,
}) => {
  await openFreshVoyage(page);
  await expect(page.locator(".board-loading")).toBeHidden();

  const standings = page.getByRole("complementary", {
    name: "Captain standings",
  });
  const rival = standings.getByRole("button", { name: /^Scout Rival 1,/ });
  await expect(rival).toBeEnabled();
  await rival.click();

  await expect(page.locator('.match-body[data-scouting="true"]')).toBeVisible();
  await expect(page.locator('.phaser-stage-frame[data-phase="scouting"]')).toBeVisible();
  await expect(page.getByText("SCOUTING", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "RETURN TO YOUR CREW", exact: true }),
  ).toBeVisible();
  const intel = page.getByRole("complementary", {
    name: "Rival 1 captain intel",
  });
  await expect(intel).toContainText("READ ONLY");
  await expect(intel).toContainText("GOLD");
  await expect(intel).toContainText("RECENT BATTLES");

  const recruit = page.locator("button.shop-card:not([disabled])").first();
  await expect(recruit).toBeEnabled();
  await recruit.click();
  await expect(page.locator('.match-body[data-scouting="true"]')).toBeVisible();

  await standings
    .getByRole("button", { name: /^Return to your crew,/ })
    .click();
  await expect(page.locator('.match-body[data-scouting="false"]')).toBeVisible();

  await rival.click();
  await page.keyboard.press("Escape");
  await expect(page.locator('.match-body[data-scouting="false"]')).toBeVisible();
  await expect(page.locator(".settings-screen")).toHaveCount(0);

  await rival.click();
  await page.getByRole("button", { name: /START BATTLE/i }).click();
  await expect(page.locator('.match-body[data-scouting="false"]')).toBeVisible();
  await expect(page.locator('.phaser-stage-frame[data-phase="battle"]')).toBeVisible();
});
