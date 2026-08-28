import { expect, test } from "@playwright/test";
import { BOARD_GEOMETRY } from "../components/boardGeometry";
import {
  BENCH_VIEWPORTS,
  boardWorldPoint,
  installRuntimeBoundaryChecks,
  openFreshVoyage,
  renderedBenchSignals,
} from "./helpers";

installRuntimeBoundaryChecks();

test("desktop layout fits and keyboard economy controls remain accessible", async ({
  page,
}) => {
  await openFreshVoyage(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.keyboard.press("KeyL");
  await expect(page.getByRole("button", { name: /LOCKED/i })).toBeVisible();
  await page.keyboard.press("KeyL");
});

test("full-playfield map keeps sprite picking and drag placement calibrated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFreshVoyage(page);
  await expect(page.locator(".board-loading")).toBeHidden();

  const bodyBounds = await page.locator(".match-body").boundingBox();
  const frameBounds = await page.locator(".phaser-stage-frame").boundingBox();
  const canvasBounds = await page
    .locator(".phaser-stage-frame canvas")
    .boundingBox();
  expect(bodyBounds).not.toBeNull();
  expect(frameBounds).not.toBeNull();
  expect(canvasBounds).not.toBeNull();
  expect(Math.abs((frameBounds?.width ?? 0) - (bodyBounds?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((frameBounds?.height ?? 0) - (bodyBounds?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((canvasBounds?.width ?? 0) - (frameBounds?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((canvasBounds?.height ?? 0) - (frameBounds?.height ?? 0))).toBeLessThan(1);

  const animatedRecruit = page
    .locator('button.shop-card:not([disabled])')
    .filter({ has: page.locator('img[src^="/assets/portraits/"]') })
    .first();
  await expect(animatedRecruit).toBeVisible();
  await animatedRecruit.click();
  const inspector = page.locator(".unit-inspector");
  await expect(inspector).toBeVisible();
  const inspectorLabel = await inspector.getAttribute("aria-label");
  const unitName = inspectorLabel?.replace(/ details$/, "") ?? "";
  expect(unitName).not.toBe("");

  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
  const accessibleUnit = page
    .locator('ul[aria-label="Units on the tactical board"] li')
    .filter({ hasText: unitName });
  await expect(accessibleUnit).toContainText("column 1, row 6");
  await page
    .getByRole("button", { name: "Return to captain standings" })
    .click();

  const deployedCenter = await boardWorldPoint(
    page,
    BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth / 2,
    BOARD_GEOMETRY.gridY + 5 * BOARD_GEOMETRY.cellHeight + BOARD_GEOMETRY.cellHeight / 2,
  );
  const upperSprite = await boardWorldPoint(
    page,
    BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth / 2,
    BOARD_GEOMETRY.gridY + 5 * BOARD_GEOMETRY.cellHeight - 24,
  );
  await page.mouse.click(upperSprite.x, upperSprite.y);
  await expect(inspector).toBeVisible();

  const nextCell = await boardWorldPoint(
    page,
    BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth * 1.5,
    BOARD_GEOMETRY.gridY + 5 * BOARD_GEOMETRY.cellHeight + BOARD_GEOMETRY.cellHeight / 2,
  );
  await page.mouse.move(upperSprite.x, upperSprite.y);
  await page.mouse.down();
  await page.mouse.move(deployedCenter.x, deployedCenter.y, { steps: 2 });
  await page.mouse.move(nextCell.x, nextCell.y, { steps: 4 });
  await page.mouse.up();
  await expect(accessibleUnit).toContainText("column 2, row 6");
});

for (const viewport of BENCH_VIEWPORTS) {
  test(`bench presentation and drag stay usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-1280",
      "The explicit viewport matrix only needs to run in one browser project.",
    );
    await page.setViewportSize(viewport);
    await openFreshVoyage(page);
    await expect(page.locator(".board-loading")).toBeHidden();

    const canvas = page.locator(".phaser-stage-frame canvas");
    const canvasBounds = await canvas.boundingBox();
    const footerBounds = await page.locator(".match-footer").boundingBox();
    expect(canvasBounds).not.toBeNull();
    expect(footerBounds).not.toBeNull();

    const visualTopLeft = await boardWorldPoint(
      page,
      BOARD_GEOMETRY.gridX,
      BOARD_GEOMETRY.benchCenterY - 52,
    );
    const visualBottomRight = await boardWorldPoint(
      page,
      BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth,
      BOARD_GEOMETRY.benchCenterY + 27,
    );
    expect(visualTopLeft.x).toBeGreaterThanOrEqual(canvasBounds?.x ?? 0);
    expect(visualTopLeft.y).toBeGreaterThanOrEqual(canvasBounds?.y ?? 0);
    expect(visualBottomRight.x).toBeLessThanOrEqual(
      (canvasBounds?.x ?? 0) + (canvasBounds?.width ?? 0),
    );
    expect(visualBottomRight.y).toBeLessThanOrEqual(
      (canvasBounds?.y ?? 0) + (canvasBounds?.height ?? 0),
    );
    expect(visualBottomRight.y).toBeLessThanOrEqual(footerBounds?.y ?? 0);

    const recruit = page
      .locator('button.shop-card:not([disabled])')
      .filter({ has: page.locator('img[src^="/assets/portraits/"]') })
      .first();
    await expect(recruit).toBeVisible();
    const portraitSrc = await recruit.locator("img").getAttribute("src");
    const contentId = portraitSrc?.match(/\/portraits\/([^/.]+)\.png/)?.[1];
    expect(contentId).toBeTruthy();
    await recruit.click();

    const inspector = page.locator(".unit-inspector");
    await expect(inspector).toBeVisible();
    const inspectorLabel = await inspector.getAttribute("aria-label");
    const unitName = inspectorLabel?.replace(/ details$/, "") ?? "";
    expect(unitName).not.toBe("");
    const tacticalUnits = page.locator(
      'ul[aria-label="Units on the tactical board"]',
    );
    await expect(tacticalUnits).toContainText(`${unitName}, 1 star, player, bench slot 1`);

    const signals = await renderedBenchSignals(page, contentId!);
    expect(signals.sprite, `bench rendering: ${JSON.stringify(signals)}`).toBeGreaterThan(4);
    expect(signals.hp, `bench rendering: ${JSON.stringify(signals)}`).toBe(0);
    expect(signals.name, `bench rendering: ${JSON.stringify(signals)}`).toBeGreaterThan(1);

    await page
      .getByRole("button", { name: "Return to captain standings" })
      .click();
    const benchCenter = await boardWorldPoint(
      page,
      BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth / 2,
      BOARD_GEOMETRY.benchCenterY,
    );
    await page.mouse.click(benchCenter.x, benchCenter.y);
    await expect(inspector).toHaveAttribute("aria-label", `${unitName} details`);

    await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
    await expect(tacticalUnits).toContainText("column 1, row 6");

    const secondRecruit = page
      .locator("button.shop-card:not([disabled])")
      .first();
    await expect(secondRecruit).toBeVisible();
    await secondRecruit.click();
    await expect(inspector).toBeVisible();
    await expect(tacticalUnits).toContainText("bench slot 1");

    const secondBenchCenter = await boardWorldPoint(
      page,
      BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth / 2,
      BOARD_GEOMETRY.benchCenterY,
    );
    const destination = await boardWorldPoint(
      page,
      BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth * 1.5,
      BOARD_GEOMETRY.gridY + BOARD_GEOMETRY.cellHeight * 5.5,
    );
    await page.mouse.move(secondBenchCenter.x, secondBenchCenter.y);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y, { steps: 6 });
    await page.mouse.up();

    await expect(page.locator(".crew-capacity")).toContainText("2/2");
    await expect(tacticalUnits).toContainText("column 2, row 6");
    await expect(tacticalUnits).not.toContainText("bench slot 1");
  });
}
