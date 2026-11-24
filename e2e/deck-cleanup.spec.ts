import { expect, test } from "@playwright/test";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { boardCellCenter, boardDestinationCenter } from "../components/boardGeometry";
import { createMatch, type MatchState } from "../game";
import { boardWorldPoint, installRuntimeBoundaryChecks, openFreshVoyage, readVoyageFixture, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("S and dropping sell the intended crew, then battle fills the open slot", async ({ page }) => {
  const state = createMatch("deck-cleanup");
  const player = state.players[0];
  player.level = 2;
  const crew = ["koby", "nami", "zoro", "tashigi", "chopper"];
  for (const [index, definitionId] of crew.entries()) {
    player.units[definitionId] = { id: definitionId, definitionId, star: 1, items: definitionId === "zoro" ? ["sea-prism-stone"] : [], acquiredOrder: index + 1 };
    state.pool[definitionId] -= 1;
  }
  player.board["3,4"] = "koby";
  player.bench.splice(2, 4, ...crew.slice(1));
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  const stage = page.locator(".phaser-stage-frame");
  await expect(stage.locator("canvas").first()).toBeVisible();
  await expect(stage).toHaveAttribute("data-presented-animations", /zoro/);

  const gold = page.locator(".gold-pouch strong");
  const initialGold = Number(await gold.innerText());
  const roster = page.getByRole("list", { name: "Units on the tactical board" });
  const sellDrop = page.locator(".board-sell-drop");
  const nami = boardDestinationCenter({ zone: "bench", slot: 2 });
  const namiPoint = await boardWorldPoint(page, nami.x, nami.y);
  await page.mouse.click(namiPoint.x, namiPoint.y);
  await expect(page.getByLabel("Nami details", { exact: true })).toBeVisible();
  await expect(sellDrop).toHaveCount(0);
  await page.keyboard.press("s");
  await expect(roster).not.toContainText("Nami");
  await expect(gold).toHaveText(String(initialGold + 1));

  const koby = boardCellCenter(3, 4);
  const kobyPoint = await boardWorldPoint(page, koby.x, koby.y);
  await page.mouse.click(kobyPoint.x, kobyPoint.y);
  await expect(page.getByLabel("Koby details", { exact: true })).toBeVisible();
  const zoro = boardDestinationCenter({ zone: "bench", slot: 3 });
  const zoroPoint = await boardWorldPoint(page, zoro.x, zoro.y);
  await page.mouse.move(zoroPoint.x, zoroPoint.y);
  await page.mouse.down();
  await page.mouse.move(zoroPoint.x, zoroPoint.y - 18, { steps: 4 });
  await expect(sellDrop).toHaveText("Drop to sell 3 gold");
  const target = await sellDrop.boundingBox();
  if (!target) throw new Error("Missing sell target bounds.");
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await expect(sellDrop).toHaveAttribute("data-hovered", "true");
  await page.mouse.up();
  await expect(sellDrop).toHaveCount(0);
  await expect(roster).not.toContainText("Zoro");
  await expect(roster).toContainText("Koby, 1 star, player, column 4, row 5");
  await expect(gold).toHaveText(String(initialGold + 4));
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.players[0].inventory).toContain("sea-prism-stone");

  await page.getByRole("button", { name: /START BATTLE/i }).click();
  await expect(stage).toHaveAttribute("data-phase", "battle");
  await expect(roster).toContainText(/Tashigi, 1 star, player, column/);
  await expect(roster).toContainText("Chopper, 1 star, player, bench slot 6");
});

test("the timer displays a shrinking fill and a readable low-time warning", async ({ page }) => {
  await page.clock.install();
  await openFreshVoyage(page);
  const clock = page.getByRole("timer");
  const track = clock.locator(".phase-clock-track");
  const fill = clock.locator(".phase-clock-fill");
  await expect(clock).toHaveAttribute("data-clock-label", "PREPARE");
  await expect(track).toBeVisible();
  const usualColor = await fill.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(usualColor).not.toBe(await track.evaluate(element => getComputedStyle(element).backgroundColor));
  await page.clock.fastForward(14_000);
  await expect(clock).toHaveClass(/is-warning/);
  const remaining = Number(await clock.locator("strong").innerText());
  const ratio = await fill.evaluate(element => element.getBoundingClientRect().width / element.parentElement!.getBoundingClientRect().width);
  expect(ratio).toBeCloseTo(remaining / 20, 2);
  expect(await fill.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(usualColor);
  expect(await clock.evaluate(element => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight)).toBe(true);
});
