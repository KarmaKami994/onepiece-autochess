import { expect, test, type Page } from "@playwright/test";
import { advanceMatchPhase, createMatch, type MatchState } from "../game";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { BOARD_GEOMETRY } from "../components/boardGeometry";
import { preferredAnimation } from "../components/boardAssets";
import { advanceVisiblePhase, boardWorldPoint, installRuntimeBoundaryChecks, readVoyageFixture, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

function regattaFixture() {
  const state = createMatch("regatta-board-calibration");
  state.round = 3; state.stageId = "raider-ambush"; state.phase = "item-choice";
  const player = state.players[0]; player.level = 4; player.gold = 40;
  for (const [index, definitionId] of ["zoro", "koala", "chopper", "robin"].entries()) {
    const id = `calibration-${definitionId}`;
    player.units[id] = { id, definitionId, star: 1, items: [], acquiredOrder: index + 1 };
    state.pool[definitionId] -= 1;
  }
  player.board = { "1,3": "calibration-koala", "1,4": "calibration-chopper", "2,4": "calibration-robin" };
  player.bench[2] = "calibration-zoro";
  return advanceMatchPhase(state);
}

async function playerState(page: Page) {
  const saved = await readVoyageFixture(page);
  return (saved?.state as MatchState | undefined)?.players[0];
}

async function pick(page: Page, point: { x: number; y: number }, name: string) {
  const close = page.getByRole("button", { name: "Return to captain standings", exact: true });
  if (await close.isVisible()) await close.click();
  const screen = await boardWorldPoint(page, point.x, point.y);
  await page.mouse.click(screen.x, screen.y);
  await expect(page.locator(".unit-inspector")).toHaveAttribute("aria-label", `${name} details`);
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const source = await boardWorldPoint(page, from.x, from.y);
  const target = await boardWorldPoint(page, to.x, to.y);
  await page.mouse.move(source.x, source.y); await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 }); await page.mouse.up();
}

function cell(x: number, y: number) {
  return { x: BOARD_GEOMETRY.gridX + (x + .5) * BOARD_GEOMETRY.cellWidth,
    y: BOARD_GEOMETRY.gridY + (y + .5) * BOARD_GEOMETRY.cellHeight };
}

test("Regatta return picks the correct stacked crew and preserves bench/field dragging", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  const state = regattaFixture(); expect(state.phase).toBe("carousel");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator("[data-carousel-ready=true]")).toBeVisible();
  await advanceVisiblePhase(page);
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-phase", "preparation");
  await expect(page.locator(".board-loading")).toBeHidden();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.phase).toBe("preparation");
  const before = await playerState(page);
  const bench = { x: cell(2, 0).x, y: BOARD_GEOMETRY.benchCenterY };

  await pick(page, cell(1, 3), "Koala");
  await pick(page, cell(2, 4), "Robin");
  await pick(page, bench, "Zoro");
  await drag(page, bench, cell(2, 5));
  await expect.poll(async () => (await playerState(page))?.board["2,5"]).toBe("calibration-zoro");
  await pick(page, cell(2, 4), "Robin");
  await pick(page, cell(2, 5), "Zoro");
  await drag(page, cell(2, 5), cell(0, 5));
  await expect.poll(async () => (await playerState(page))?.board["0,5"]).toBe("calibration-zoro");
  await pick(page, cell(1, 4), "Chopper");
  await drag(page, cell(1, 4), cell(0, 4));
  await expect.poll(async () => (await playerState(page))?.board["0,4"]).toBe("calibration-chopper");
  await pick(page, cell(0, 4), "Chopper");
  await drag(page, cell(0, 4), cell(1, 4));
  await expect.poll(async () => (await playerState(page))?.board["1,4"]).toBe("calibration-chopper");
  await pick(page, cell(0, 5), "Zoro");
  await drag(page, cell(0, 5), bench);
  await expect.poll(async () => (await playerState(page))?.bench[2]).toBe("calibration-zoro");
  const after = await playerState(page);
  expect(after?.board["1,3"]).toBe("calibration-koala");
  expect(after?.board["2,4"]).toBe("calibration-robin");
  expect(after?.gold).toBe(before?.gold);
  expect(after?.inventory).toEqual(before?.inventory);
});

test("a late-loaded animated recruit keeps upper-body picking and dragging", async ({ page }) => {
  const state = createMatch("late-crew-hit-area"); state.round = 6; state.stageId = "pvp-6";
  const player = state.players[0]; player.level = 4; player.gold = 40;
  if (player.shop[0]) state.pool[player.shop[0]] += 1;
  player.shop[0] = "zoro"; state.pool.zoro -= 1;
  let releaseAnimations = () => {};
  const ready = new Promise<void>(resolve => { releaseAnimations = resolve; });
  let held = 0;
  await page.route("**/assets/animations/zoro*/**", async route => {
    held += 1; await ready; await route.continue();
  });
  try {
    await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
    await page.goto("/");
    await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
    await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
    await expect(page.locator(".board-loading")).toBeHidden();
    await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
    await page.getByRole("button", { name: /^Recruit Zoro / }).first().click();
    await expect.poll(() => held).toBeGreaterThan(0);
    await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
    const crew = page.getByRole("list", { name: "Units on the tactical board" });
    await expect(crew).toContainText("Zoro, 1 star, player, column 1, row 6");
    const animation = preferredAnimation("zoro")!;
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === animation.sheetPath && response.ok());
    const source = await boardWorldPoint(page, cell(0, 5).x, cell(0, 5).y);
    const target = await boardWorldPoint(page, cell(1, 5).x, cell(1, 5).y);
    await page.mouse.move(source.x, source.y); await page.mouse.down();
    await page.mouse.move(source.x + 12, source.y, { steps: 2 });
    releaseAnimations();
    await (await loaded).finished();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.mouse.move(target.x, target.y, { steps: 8 }); await page.mouse.up();
    await expect(crew).toContainText("Zoro, 1 star, player, column 2, row 6");
    await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-presented-animations", new RegExp(animation.assetKey));
    await pick(page, { x: cell(1, 5).x, y: cell(1, 5).y - 48 }, "Zoro");
    await expect(page.getByRole("button", { name: "TO BENCH", exact: true })).toBeEnabled();
  } finally { releaseAnimations(); }
});
