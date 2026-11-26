import { expect, test } from "@playwright/test";
import { BOARD_GEOMETRY } from "../components/boardGeometry";
import { boardWorldPoint } from "./helpers";

test("two local captains keep independent shops and share a server-run round", async ({ page, browser }) => {
  const otherContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  try {
    await page.goto("/");
    await page.getByRole("link", { name: "Local multiplayer" }).click();
    await page.getByRole("button", { name: "Join local match" }).click();
    await expect(page.getByRole("status")).toContainText("Waiting for the other captain");
    const other = await otherContext.newPage();
    await other.goto(page.url());
    await other.getByRole("button", { name: "Join local match" }).click();
    await expect(page.getByRole("main", { name: "Captain 1's local match" })).toBeVisible();
    await expect(other.getByRole("main", { name: "Captain 2's local match" })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveAttribute("data-clock-label", "PREPARE");
    await expect(other.getByRole("timer")).toHaveAttribute("data-clock-label", "PREPARE");

    await page.locator("button.shop-card").first().click();
    await expect(page.getByLabel("Shop slot 1, empty")).toBeVisible();
    await expect(other.getByLabel("Shop slot 1, empty")).toHaveCount(0);
    await expect(page.locator(".board-loading")).toBeHidden();
    const x = BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth / 2;
    const from = await boardWorldPoint(page, x, BOARD_GEOMETRY.benchCenterY);
    const to = await boardWorldPoint(page, x, BOARD_GEOMETRY.gridY + 5.5 * BOARD_GEOMETRY.cellHeight);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator(".crew-capacity strong")).toHaveText(/^1\//);
    await expect(other.locator(".crew-capacity strong")).toHaveText(/^0\//);

    await page.reload();
    await expect(page.getByRole("main", { name: "Captain 1's local match" })).toBeVisible();
    await expect(page.getByLabel("Shop slot 1, empty")).toBeVisible();
    await expect(page.locator(".crew-capacity strong")).toHaveText(/^1\//);

    await page.getByRole("button", { name: "Ready for battle" }).click();
    await expect(page.getByRole("button", { name: "Waiting for captain" })).toBeDisabled();
    await expect(other.getByRole("timer")).toHaveAttribute("data-clock-label", "PREPARE");
    await other.getByRole("button", { name: "Ready for battle" }).click();
    await expect(page.getByRole("timer")).toHaveAttribute("data-clock-label", "BATTLE");
    await expect(other.getByRole("timer")).toHaveAttribute("data-clock-label", "BATTLE");
    await expect(page.getByRole("heading", { name: "Local round complete" })).toBeVisible({ timeout: 50_000 });
    await expect(other.getByRole("heading", { name: "Local round complete" })).toBeVisible();
    await page.getByRole("button", { name: "Back to menu" }).click();
    await other.getByRole("button", { name: "Back to menu" }).click();
    await expect(page.getByRole("button", { name: /New voyage/i })).toBeVisible();
    await expect(other.getByRole("button", { name: /New voyage/i })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});
