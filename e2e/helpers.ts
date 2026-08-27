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

export function installRuntimeBoundaryChecks(): void {
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
      if (isLocalRuntimeUrl(request.url()) && errorText !== "net::ERR_ABORTED") {
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
}

export async function openFreshVoyage(page: Page): Promise<void> {
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

export async function openFirstVoyage(page: Page): Promise<void> {
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

export const BENCH_VIEWPORTS = [
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

export async function cameraFrameForStage(
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

export async function boardWorldPoint(
  page: Page,
  worldX: number,
  worldY: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.locator(".phaser-stage-frame canvas");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Phaser canvas has no layout box");
  const frame = await cameraFrameForStage(page, bounds.width, bounds.height);
  const screen = gameplayWorldPointToScreen(
    { x: worldX, y: worldY },
    frame,
    bounds.width,
    bounds.height,
  );
  return { x: bounds.x + screen.x, y: bounds.y + screen.y };
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

export async function renderedBenchSignals(
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
  const frame = await cameraFrameForStage(page, info.width, info.height);
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
  const maxX = Math.min(info.width - 1, Math.max(topLeft.x, bottomRight.x));
  const minY = Math.max(0, Math.min(topLeft.y, bottomRight.y));
  const maxY = Math.min(info.height - 1, Math.max(topLeft.y, bottomRight.y));
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

export async function advanceVisiblePhase(page: Page): Promise<boolean> {
  const result = page.locator(".results-screen");
  if (await result.isVisible()) return false;

  const reward = page.locator("button.reward-card").first();
  if (await reward.isVisible()) {
    await reward.click();
    return true;
  }
  const regatta = page.locator(".bounty-regatta-screen");
  if (await regatta.isVisible()) {
    const canvas = regatta.locator("canvas");
    await expect(canvas).toBeVisible();
    const bounds = await canvas.boundingBox();
    if (bounds) {
      await canvas.click({
        position: { x: bounds.width / 2, y: bounds.height / 2 },
      });
    }
    await expect(page.locator(".match-screen")).toBeVisible({ timeout: 40_000 });
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
