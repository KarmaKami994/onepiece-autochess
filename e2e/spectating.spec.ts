import { expect, test } from "@playwright/test";
import { installRuntimeBoundaryChecks, openFreshVoyage } from "./helpers";

installRuntimeBoundaryChecks();

test("living captains can be watched while local battle economy stays active", async ({
  page,
}) => {
  await openFreshVoyage(page);
  await page.locator("button.shop-card:not([disabled])").first().click();
  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
  await page.getByRole("button", { name: /START BATTLE/i }).click();

  const stage = page.locator(".phaser-stage-frame");
  const body = page.locator(".match-body");
  const standings = page.getByRole("complementary", {
    name: "Captain standings",
  });
  await expect(stage).toHaveAttribute("data-phase", "battle");
  await expect(stage).toHaveAttribute("data-interaction-mode", "bench-only");
  const ownSequence = await stage.getAttribute("data-event-sequence");
  const startingStage = await page.locator(".round-medallion strong").innerText();
  const startingTimer = Number(await page.locator(".phase-clock strong").innerText());

  const firstRival = standings.getByRole("button", {
    name: /^Watch Rival 1's battle,/,
  });
  await expect(firstRival).toBeEnabled();
  await firstRival.click();

  await expect(body).toHaveAttribute("data-watching", "true");
  await expect(page.locator(".opponent-banner .tiny-label")).toHaveText(
    "WATCHING",
  );
  await expect(page.locator(".opponent-banner strong")).toContainText(
    "Rival 1 vs East Blue Patrol",
  );
  await expect(
    page.getByRole("button", { name: "RETURN TO YOUR FIGHT", exact: true }),
  ).toBeVisible();
  await expect(stage).toHaveAttribute("data-interaction-mode", "none");
  const firstRivalSequence = await stage.getAttribute("data-event-sequence");
  expect(firstRivalSequence).toBeTruthy();
  expect(firstRivalSequence).not.toBe(ownSequence);

  const reroll = page.getByRole("button", { name: /REROLL/i });
  const lock = page.getByRole("button", { name: /^L\s*LOCK/i });
  const buyXp = page.getByRole("button", { name: /BUY XP/i });
  await expect(page.locator(".shop-wrap")).toBeVisible();
  await expect(reroll).toBeEnabled();
  await expect(lock).toBeEnabled();
  await expect(buyXp).toBeEnabled();

  const gold = page.locator(".gold-pouch strong");
  const goldBeforeReroll = Number(await gold.innerText());
  await reroll.click();
  await expect(gold).toHaveText(String(goldBeforeReroll - 1));
  await expect(body).toHaveAttribute("data-watching", "true");
  await expect(stage).toHaveAttribute(
    "data-event-sequence",
    firstRivalSequence!,
  );

  await standings
    .getByRole("button", { name: /^Watch Rival 2's battle,/ })
    .click();
  await expect(page.locator(".opponent-banner strong")).toContainText(
    "Rival 2 vs East Blue Patrol",
  );
  const secondRivalSequence = await stage.getAttribute("data-event-sequence");
  expect(secondRivalSequence).not.toBe(firstRivalSequence);

  await standings
    .getByRole("button", { name: /^Return to your fight,/ })
    .click();
  await expect(body).toHaveAttribute("data-watching", "false");
  await expect(stage).toHaveAttribute("data-interaction-mode", "bench-only");
  await expect(stage).toHaveAttribute("data-event-sequence", ownSequence!);
  await expect(page.locator(".round-medallion strong")).toHaveText(startingStage);
  const endingTimer = Number(await page.locator(".phase-clock strong").innerText());
  expect(endingTimer).toBeLessThanOrEqual(startingTimer);

  await firstRival.click();
  await page.getByRole("button", { name: /SKIP ANIMATION/i }).click();
  await expect(
    page.locator(".reward-screen, .match-body").first(),
  ).toBeVisible();
  if (await page.locator(".reward-screen").isVisible()) {
    await page.locator("button.reward-card").first().click();
  }
  await expect(page.locator(".match-body")).toHaveAttribute(
    "data-watching",
    "false",
  );
  await expect(stage).toHaveAttribute("data-phase", "preparation");
  await expect(stage).toHaveAttribute("data-interaction-mode", "formation");
});
