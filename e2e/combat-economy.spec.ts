import { expect, test } from "@playwright/test";
import {
  installRuntimeBoundaryChecks,
  openFreshVoyage,
} from "./helpers";

installRuntimeBoundaryChecks();

test("battle economy mutates the live bench and survives direct resume", async ({
  page,
}) => {
  await openFreshVoyage(page);
  await page.locator("button.shop-card:not([disabled])").first().click();
  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
  await page.getByRole("button", { name: /START BATTLE/i }).click();

  const stage = page.locator(".phaser-stage-frame");
  await expect(stage).toHaveAttribute("data-phase", "battle");
  await expect(stage).toHaveAttribute("data-interaction-mode", "bench-only");
  const battleSequence = await stage.getAttribute("data-event-sequence");
  expect(battleSequence).toBeTruthy();

  const reroll = page.getByRole("button", { name: /REROLL/i });
  const lock = page.getByRole("button", { name: /^L\s*LOCK/i });
  const buyXp = page.getByRole("button", { name: /BUY XP/i });
  await expect(page.locator(".shop-wrap")).toBeVisible();
  await expect(page.locator("button.shop-card:not([disabled])").first()).toBeVisible();
  await expect(reroll).toBeEnabled();
  await expect(lock).toBeEnabled();
  await expect(buyXp).toBeEnabled();

  const gold = page.locator(".gold-pouch strong");
  const goldBeforeReroll = Number(await gold.innerText());
  await reroll.click();
  await expect(gold).toHaveText(String(goldBeforeReroll - 1));
  await expect(stage).toHaveAttribute("data-event-sequence", battleSequence!);

  await lock.click();
  await expect(page.getByRole("button", { name: /LOCKED/i })).toBeEnabled();
  await page.locator("button.shop-card:not([disabled])").first().click();

  const tacticalUnits = page.locator(
    'ul[aria-label="Units on the tactical board"]',
  );
  await expect(tacticalUnits).toContainText("bench slot 1");
  const inspector = page.locator(".unit-inspector");
  await expect(inspector).toBeVisible();
  const sell = inspector.getByRole("button", { name: /SELL/i });
  await expect(sell).toBeEnabled();
  await sell.click();
  await expect(tacticalUnits).not.toContainText("bench slot 1");
  await page.locator("button.shop-card:not([disabled])").first().click();
  await expect(tacticalUnits).toContainText("bench slot 1");
  await expect(stage).toHaveAttribute("data-event-sequence", battleSequence!);

  const savedGold = await gold.innerText();
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.waitForTimeout(150);
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();

  await expect(stage).toHaveAttribute("data-phase", "battle");
  await expect(stage).toHaveAttribute("data-event-sequence", battleSequence!);
  await expect(gold).toHaveText(savedGold);
  await expect(page.getByRole("button", { name: /LOCKED/i })).toBeEnabled();
  await expect(tacticalUnits).toContainText("bench slot 1");
});
