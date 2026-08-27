import { expect, test } from "@playwright/test";
import { installRuntimeBoundaryChecks, openFirstVoyage } from "./helpers";

installRuntimeBoundaryChecks();

test("first voyage tutorial teaches the real PvE reward and equip flow", async ({
  page,
}) => {
  await openFirstVoyage(page);

  const welcome = page.getByRole("dialog", {
    name: "WELCOME ABOARD, CAPTAIN",
  });
  await expect(welcome).toBeVisible();
  const begin = welcome.getByRole("button", { name: "SHOW ME THE ROPES" });
  await expect(begin).toBeFocused();
  await expect(welcome.locator(".tutorial-progress-track i")).toHaveCount(6);
  await begin.click();

  await expect(
    page.getByRole("heading", { name: "CHOOSE YOUR FIRST CREWMATE" }),
  ).toBeVisible();
  await page.keyboard.press("Digit1");
  await expect(
    page.getByRole("heading", { name: "MOVE THEM ONTO YOUR DECK" }),
  ).toBeVisible();
  await expect(page.locator(".unit-inspector")).toBeVisible();
  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "FIELD A SECOND CREWMATE" }),
  ).toBeVisible();
  await page.keyboard.press("Digit2");
  await expect(
    page.getByRole("button", { name: "DEPLOY", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
  await expect(page.locator(".crew-capacity")).toContainText("2/2");

  await expect(
    page.getByRole("heading", { name: "START THE BATTLE" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^START BATTLE\b/i }).click();
  await expect(
    page.getByRole("heading", { name: "WATCH THE PLAN UNFOLD" }),
  ).toBeVisible();
  await expect(page.locator(".opponent-banner strong")).toHaveText(
    "East Blue Patrol",
  );
  await page.getByRole("button", { name: /^SKIP ANIMATION\b/i }).click();

  await expect(
    page.getByRole("heading", { name: "CLAIM ONE REWARD" }),
  ).toBeVisible();
  const rewardChoice = page
    .getByRole("button", { name: /TAKE TREASURE/i })
    .first();
  await expect(rewardChoice).toBeVisible();
  await rewardChoice.click();

  await expect(
    page.getByRole("heading", { name: "ARM YOUR CREW" }),
  ).toBeVisible();
  const inventory = page.getByRole("complementary", {
    name: "Treasure inventory",
  });
  const crewOrder = inventory.getByRole("combobox", {
    name: "Select crew for orders",
  });
  await crewOrder.selectOption({ index: 1 });
  const equip = inventory.getByRole("button", { name: /^Equip / }).first();
  await expect(equip).toBeEnabled();
  await equip.click();

  await expect(page.getByText("GUIDE COMPLETE", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ARM YOUR CREW" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("grand-line-auto-chess.first-voyage.v1"),
      ),
    )
    .toBe("complete");
  await expect(page.locator(".save-indicator")).toContainText("LOG SAVED");

  await page.reload();
  await expect(page.getByRole("button", { name: /CONTINUE/i })).toBeEnabled();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".match-screen")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "WELCOME ABOARD, CAPTAIN" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel(/PREPARE, \d+ seconds remaining/i),
  ).toBeVisible();
});
