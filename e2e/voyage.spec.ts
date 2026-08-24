import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import sharp from "sharp";
import {
  BOARD_GEOMETRY,
  gameplayCameraFrame,
  gameplayWorldPointToScreen,
  safeScreenBoundsWithinStage,
  type BoardBounds,
} from "../components/boardGeometry";

const APP_ORIGIN = "http://localhost:3100";

type QaState = {
  consoleErrors: string[];
  externalRequests: string[];
  missingAssets: string[];
  requestFailures: string[];
};

function isLocalRuntimeUrl(rawUrl: string): boolean {
  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) return true;
  try {
    const url = new URL(rawUrl);
    const app = new URL(APP_ORIGIN);
    return url.hostname === app.hostname && url.port === app.port;
  } catch {
    return false;
  }
}

async function openFreshVoyage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "grand-line-auto-chess.first-voyage.v1",
      "complete",
    );
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /GRAND LINE/i })).toBeVisible();
  await page.getByRole("button", { name: /NEW VOYAGE/i }).click();
  await expect(page.locator(".match-screen")).toBeVisible();
}

async function openFirstVoyage(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: /GRAND LINE/i })).toBeVisible();
  await page.getByRole("button", { name: /NEW VOYAGE/i }).click();
  await expect(page.locator(".match-screen")).toBeVisible();
}

const BENCH_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const;

function screenBounds(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): BoardBounds {
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
  };
}

async function cameraFrameForStage(
  page: Page,
  viewportWidth: number,
  viewportHeight: number,
) {
  const [stageBounds, boardColumnBounds] = await Promise.all([
    page.locator(".phaser-stage-frame").boundingBox(),
    page.locator(".board-column").boundingBox(),
  ]);
  if (!stageBounds) throw new Error("Phaser stage has no layout box");
  if (!boardColumnBounds) throw new Error("Board column has no layout box");
  const safeBounds = safeScreenBoundsWithinStage(
    screenBounds(stageBounds),
    screenBounds(boardColumnBounds),
    viewportWidth,
    viewportHeight,
  );
  if (!safeBounds) throw new Error("Board column produced no safe screen bounds");
  return gameplayCameraFrame(viewportWidth, viewportHeight, safeBounds);
}

async function boardWorldPoint(
  page: Page,
  worldX: number,
  worldY: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.locator(".phaser-stage-frame canvas");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Phaser canvas has no layout box");
  const frame = await cameraFrameForStage(
    page,
    bounds.width,
    bounds.height,
  );
  const screen = gameplayWorldPointToScreen(
    { x: worldX, y: worldY },
    frame,
    bounds.width,
    bounds.height,
  );
  return {
    x: bounds.x + screen.x,
    y: bounds.y + screen.y,
  };
}

async function firstFramePalette(contentId: string): Promise<Set<number>> {
  const key = `${contentId}-v2`;
  const { data } = await sharp(
    path.join(
      process.cwd(),
      "public",
      "assets",
      "animations",
      key,
      `${key}.png`,
    ),
  )
    .extract({ left: 0, top: 0, width: 128, height: 128 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const palette = new Set<number>();
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 200) continue;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    if (red + green + blue < 150) continue;
    palette.add((red << 16) | (green << 8) | blue);
  }
  return palette;
}

async function renderedBenchSignals(
  page: Page,
  contentId: string,
): Promise<{ sprite: number; hp: number; name: number }> {
  const canvas = page.locator(".phaser-stage-frame canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Phaser canvas has no layout box");
  const png = await canvas.screenshot({ animations: "disabled" });
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const palette = await firstFramePalette(contentId);
  const frame = await cameraFrameForStage(
    page,
    info.width,
    info.height,
  );
  const worldToPixel = (worldX: number, worldY: number) => {
    const screen = gameplayWorldPointToScreen(
      { x: worldX, y: worldY },
      frame,
      info.width,
      info.height,
    );
    return { x: Math.round(screen.x), y: Math.round(screen.y) };
  };
  const topLeft = worldToPixel(
    BOARD_GEOMETRY.gridX,
    BOARD_GEOMETRY.benchCenterY - 52,
  );
  const bottomRight = worldToPixel(
    BOARD_GEOMETRY.gridX + BOARD_GEOMETRY.cellWidth,
    BOARD_GEOMETRY.benchCenterY + 27,
  );
  const minX = Math.max(0, Math.min(topLeft.x, bottomRight.x));
  const maxX = Math.min(
    info.width - 1,
    Math.max(topLeft.x, bottomRight.x),
  );
  const minY = Math.max(0, Math.min(topLeft.y, bottomRight.y));
  const maxY = Math.min(
    info.height - 1,
    Math.max(topLeft.y, bottomRight.y),
  );
  const near = (
    red: number,
    green: number,
    blue: number,
    expected: readonly [number, number, number],
    tolerance: number,
  ) =>
    Math.abs(red - expected[0]) <= tolerance &&
    Math.abs(green - expected[1]) <= tolerance &&
    Math.abs(blue - expected[2]) <= tolerance;
  let sprite = 0;
  let hp = 0;
  let name = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      if (palette.has((red << 16) | (green << 8) | blue)) sprite += 1;
      if (near(red, green, blue, [90, 210, 122], 4)) hp += 1;
      if (near(red, green, blue, [246, 231, 190], 7)) name += 1;
    }
  }
  return { sprite, hp, name };
}

async function advanceVisiblePhase(page: Page): Promise<boolean> {
  const result = page.locator(".results-screen");
  if (await result.isVisible()) return false;

  const reward = page.locator("button.reward-card").first();
  if (await reward.isVisible()) {
    await reward.click();
    return true;
  }
  const carousel = page.locator("button.carousel-choice").first();
  if (await carousel.isVisible()) {
    await carousel.click();
    return true;
  }

  const advance = page
    .getByRole("button", {
      name: /START BATTLE|SET SAIL|SKIP ANIMATION|CONTINUE/i,
    })
    .first();
  if ((await advance.isVisible()) && (await advance.isEnabled())) {
    await advance.click();
    return true;
  }
  await page.waitForTimeout(50);
  return true;
}

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = [];
  const externalRequests: string[] = [];
  const missingAssets: string[] = [];
  const requestFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    const url = request.url();
    if (!isLocalRuntimeUrl(url)) externalRequests.push(url);
  });
  page.on("websocket", (socket) => {
    if (!isLocalRuntimeUrl(socket.url())) externalRequests.push(socket.url());
  });
  page.on("response", (response) => {
    if (isLocalRuntimeUrl(response.url()) && response.status() === 404) {
      missingAssets.push(response.url());
    }
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "request failed";
    if (
      isLocalRuntimeUrl(request.url()) &&
      errorText !== "net::ERR_ABORTED"
    ) {
      requestFailures.push(`${request.url()} (${errorText})`);
    }
  });
  (page as Page & { __qa?: QaState }).__qa = {
    consoleErrors,
    externalRequests,
    missingAssets,
    requestFailures,
  };
});

test.afterEach(async ({ page }) => {
  const qa = (page as Page & { __qa?: QaState }).__qa;
  expect(qa?.consoleErrors ?? []).toEqual([]);
  expect(qa?.externalRequests ?? []).toEqual([]);
  expect(qa?.missingAssets ?? []).toEqual([]);
  expect(qa?.requestFailures ?? []).toEqual([]);
});

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

test("complete voyage covers PvE reward, carousel, PvP, resume, and results", async ({
  page,
}) => {
  await openFreshVoyage(page);

  const recruit = page.locator("button.shop-card:not([disabled])").first();
  await expect(recruit).toBeVisible();
  await recruit.hover();
  const shopPreview = page.locator(".shop-decision-preview");
  await expect(shopPreview).toBeVisible();
  await expect(shopPreview).toContainText("ABILITY");
  await expect(shopPreview).toContainText("RECRUITMENT IMPACT");
  const [previewBounds, previewFooterBounds] = await Promise.all([
    shopPreview.boundingBox(),
    page.locator(".match-footer").boundingBox(),
  ]);
  expect(previewBounds).not.toBeNull();
  expect(previewFooterBounds).not.toBeNull();
  expect(previewBounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((previewBounds?.x ?? 0) + (previewBounds?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  expect((previewBounds?.y ?? 0) + (previewBounds?.height ?? 0)).toBeLessThanOrEqual(
    previewFooterBounds?.y ?? 0,
  );
  const hoverPreview = await shopPreview.innerText();
  await page.mouse.move(0, 0);
  await expect(shopPreview).toBeHidden();
  await recruit.focus();
  await expect(shopPreview).toBeVisible();
  expect((await shopPreview.innerText()).replace(/\s+/g, " ").trim()).toBe(
    hoverPreview.replace(/\s+/g, " ").trim(),
  );
  await recruit.click();
  const deploy = page.getByRole("button", { name: "DEPLOY", exact: true });
  await expect(deploy).toBeVisible();
  await deploy.click();

  await page.locator("button.shop-card:not([disabled])").first().click();
  await expect(deploy).toBeVisible();
  await deploy.click();
  await expect(page.locator(".crew-capacity")).toContainText("2");

  await expect(page.locator(".opponent-banner strong")).toHaveText(
    "East Blue Patrol",
  );

  await page.getByRole("button", { name: /START BATTLE|SET SAIL/i }).click();
  await page
    .getByRole("button", { name: /SKIP ANIMATION|CONTINUE/i })
    .click();

  await expect(page.locator(".reward-screen")).toBeVisible();
  await page.locator("button.reward-card").first().click();
  await expect(page.locator(".match-screen")).toBeVisible();

  let sawCarousel = false;
  for (let step = 0; step < 40; step += 1) {
    if (await page.locator(".carousel-screen").isVisible()) {
      sawCarousel = true;
      break;
    }
    await advanceVisiblePhase(page);
    await page.waitForTimeout(35);
  }
  expect(sawCarousel).toBe(true);
  const recommendedCarouselChoice = page.locator(
    "button.carousel-choice.is-recommended",
  );
  await expect(recommendedCarouselChoice).toHaveCount(1);
  await recommendedCarouselChoice.focus();
  await expect(page.locator(".carousel-center")).toContainText(
    "AUTO-PICK FAVORITE",
  );
  const carouselShortcut = await recommendedCarouselChoice.locator("kbd").innerText();
  await page.keyboard.press(`Digit${carouselShortcut}`);
  await expect(page.locator(".match-screen")).toBeVisible();

  await page.getByRole("button", { name: /START BATTLE|SET SAIL/i }).click();
  await expect(page.locator(".opponent-banner .tiny-label")).toHaveText(
    "ENGAGED WITH",
  );
  const pvpOpponent = await page.locator(".opponent-banner strong").innerText();
  expect([
    "East Blue Patrol",
    "Rifle Line",
    "Raider Ambush",
    "Calm Belt",
    "Pacifista Test",
    "Siege of Justice",
  ]).not.toContain(pvpOpponent);
  await page.getByRole("button", { name: /SKIP ANIMATION/i }).click();
  await expect(page.locator(".action-toast strong")).toHaveText(
    /VICTORY|DEFEAT|DRAW/,
  );
  await expect(page.locator(".action-toast p")).toHaveText(
    /health remained|Captain damage|no Captain damage/i,
  );

  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByRole("button", { name: /CONTINUE/i })).toBeEnabled();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".match-screen")).toBeVisible();

  for (let step = 0; step < 300; step += 1) {
    if (await page.locator(".results-screen").isVisible()) break;
    await advanceVisiblePhase(page);
    await page.waitForTimeout(35);
  }

  await expect(page.locator(".results-screen")).toBeVisible();
  await expect(page.locator(".placement-medal")).toContainText("#");
  await expect(page.locator(".final-crew-card").first()).toBeVisible();
  await expect(page.locator(".final-crew-card").first()).toContainText("★");
  const resultsBounds = await page.locator(".results-panel").boundingBox();
  expect(resultsBounds).not.toBeNull();
  expect(resultsBounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(resultsBounds?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((resultsBounds?.x ?? 0) + (resultsBounds?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  expect((resultsBounds?.y ?? 0) + (resultsBounds?.height ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0,
  );
});

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

  await page.locator("button.shop-card:not([disabled])").first().click();
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

    const recruit = page.locator("button.shop-card:not([disabled])").first();
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
    expect(signals.hp, `bench rendering: ${JSON.stringify(signals)}`).toBeGreaterThan(4);
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
