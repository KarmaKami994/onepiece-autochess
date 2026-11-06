import { expect, test, type Page } from "@playwright/test";
import { advanceMatchPhase, applyCommand, createMatch, type MatchState } from "../game";
import { createVoyageSaveEnvelope, type VoyageSaveEnvelope } from "../app/voyagePersistence";
import { installRuntimeBoundaryChecks, openFreshVoyage } from "./helpers";

installRuntimeBoundaryChecks();

async function writeSave(page: Page, saved: VoyageSaveEnvelope) {
  await page.evaluate(async envelope => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("grand-line-auto-chess", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("voyages");
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("voyages", "readwrite");
      transaction.objectStore("voyages").put(envelope, "active-voyage");
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, saved);
}

async function readSave(page: Page): Promise<VoyageSaveEnvelope> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("grand-line-auto-chess", 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const saved = await new Promise<VoyageSaveEnvelope>((resolve, reject) => {
      const request = db.transaction("voyages", "readonly").objectStore("voyages").get("active-voyage");
      request.onsuccess = () => resolve(request.result as VoyageSaveEnvelope); request.onerror = () => reject(request.error);
    });
    db.close(); return saved;
  });
}

async function loadSaved(page: Page, state: MatchState, autoContinueBattle = true) {
  await page.addInitScript(autoContinue => {
    localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete");
    localStorage.setItem("grand-line-auto-chess.settings.v1", JSON.stringify({ autoContinueBattle: autoContinue, animationSpeed: 4, muted: true }));
  }, autoContinueBattle);
  await page.goto("/");
  await writeSave(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
}

function battleFixture() {
  let state = createMatch("b06-live-playback");
  const actorPlayerId = state.players[0].id;
  for (let shopIndex = 0; shopIndex < 2; shopIndex++) {
    const bought = applyCommand(state, { type: "BUY_UNIT", shopIndex }, { actorPlayerId });
    if (!bought.ok) throw new Error(bought.error.message);
    state = bought.state;
  }
  const ids = state.players[0].bench.filter((id): id is string => Boolean(id));
  for (const [index, unitId] of ids.entries()) {
    const moved = applyCommand(state, { type: "MOVE_UNIT", unitId, to: { zone: "board", x: index + 2, y: 5 } }, { actorPlayerId });
    if (!moved.ok) throw new Error(moved.error.message);
    state = moved.state;
  }
  return advanceMatchPhase(state);
}

test("preparation preserves its clock across pause, settings and browser background", async ({ page }) => {
  await page.clock.install();
  await openFreshVoyage(page);
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  const clock = page.locator(".match-screen .phase-clock");
  await expect(clock).toHaveAttribute("data-clock-label", "PAUSED");
  await expect(page.locator(".match-screen canvas").first()).toBeVisible();
  await page.locator(".match-screen canvas").first().evaluate(canvas => { canvas.setAttribute("data-pacing-probe", "retained"); });
  await page.getByRole("button", { name: "Resume voyage", exact: true }).click();
  await page.clock.fastForward(6_000);
  const remaining = Number(await clock.locator("strong").innerText());
  expect(remaining).toBeGreaterThan(10); expect(remaining).toBeLessThanOrEqual(14);
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await expect(page.locator(".match-screen")).toBeHidden();
  await page.clock.fastForward(60_000);
  await page.getByRole("button", { name: "BACK TO DECK" }).click();
  expect(Number(await clock.locator("strong").innerText())).toBeLessThanOrEqual(remaining);
  expect(Number(await clock.locator("strong").innerText())).toBeGreaterThanOrEqual(remaining - 1);
  await expect(page.locator("canvas[data-pacing-probe='retained']")).toBeVisible();

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(clock).toHaveAttribute("data-clock-label", "PAUSED");
  const hiddenRemaining = await clock.locator("strong").innerText();
  await page.clock.fastForward(60_000);
  expect(await clock.locator("strong").innerText()).toBe(hiddenRemaining);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(clock).toHaveAttribute("data-clock-label", "PREPARE");
  await page.clock.fastForward(15_000);
  await expect(page.getByRole("button", { name: /SKIP ANIMATION/ })).toBeVisible();
  await expect(clock).toHaveAttribute("data-clock-label", "BATTLE");
});

test("preparation resumes its saved remaining budget and manual pause without offline countdown", async ({ page }) => {
  await page.clock.install();
  await openFreshVoyage(page);
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  await page.getByRole("button", { name: "Resume voyage", exact: true }).click();
  await page.clock.fastForward(6_000);
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  await page.clock.fastForward(500);
  await expect.poll(async () => (await readSave(page)).phaseClock?.paused).toBe(true);
  const saved = await readSave(page);
  expect(saved.phaseClock?.remainingMs).toBeGreaterThan(10_000);
  expect(saved.phaseClock?.remainingMs).toBeLessThan(15_000);
  await page.reload();
  await page.clock.fastForward(3_600_000);
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  const clock = page.locator(".match-screen .phase-clock");
  await expect(clock).toHaveAttribute("data-clock-label", "PAUSED");
  await expect(clock.locator("strong")).toHaveText(String(Math.ceil(saved.phaseClock!.remainingMs / 1_000)).padStart(2, "0"));
  await expect(page.getByRole("button", { name: "Resume voyage", exact: true })).toHaveAttribute("aria-pressed", "true");
});

for (const round of [10, 20]) {
  test(`R${round} uses 23-second recruitment and the existing pool-safe timeout`, async ({ page }) => {
    await page.clock.install();
    const state = createMatch(`b06-recruit-${round}`); state.round = round - 1; state.phase = "item-choice";
    const offered = advanceMatchPhase(state); const expected = advanceMatchPhase(offered);
    await loadSaved(page, offered);
    const clock = page.locator(".voyage-recruitment-screen .phase-clock");
    await expect(clock).toHaveAttribute("data-clock-label", "RECRUITMENT");
    expect(Number(await clock.locator("strong").innerText())).toBeGreaterThan(20);
    await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
    await page.clock.fastForward(60_000);
    await expect(page.locator(".voyage-recruitment-screen button.reward-card")).toHaveCount(3);
    await page.getByRole("button", { name: "Resume voyage", exact: true }).click();
    await page.clock.fastForward(24_000);
    await expect(page.locator(".voyage-recruitment-screen")).toHaveCount(0);
    await expect(page.locator(".match-screen")).toBeVisible();
    await page.clock.fastForward(500);
    await expect.poll(async () => (await readSave(page)).state).toEqual(expected);
  });
}

test("battle pause/settings preserve playback; manual continuation waits without changing the saved battle", async ({ page }) => {
  const battle = battleFixture();
  await loadSaved(page, battle, false);
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  const board = page.locator(".phaser-stage-frame");
  await expect(board).toHaveAttribute("data-playback-paused", "true");
  await expect(board.locator("canvas").first()).toBeVisible();
  const report = page.getByLabel("Combat contributions");
  const elapsed = await report.getAttribute("data-elapsed-ms");
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Auto-continue battles/ })).not.toBeChecked();
  await page.getByRole("button", { name: "BACK TO DECK" }).click();
  expect(await report.getAttribute("data-elapsed-ms")).toBe(elapsed);
  await page.getByRole("button", { name: "Resume voyage", exact: true }).click();
  await expect(page.locator(".phase-clock")).toHaveAttribute("data-clock-label", "CONTINUE", { timeout: 20_000 });
  await expect(page.locator(".phase-clock")).not.toHaveClass(/is-warning/);
  await expect(report).toHaveAttribute("data-complete", "true");
  expect((await readSave(page)).state).toEqual(battle);
  await page.screenshot({ path: `tmp/b06-manual-result-${page.viewportSize()!.width}.png`, fullPage: true });
  await page.getByRole("button", { name: /^CONTINUE/ }).click();
  await expect(page.locator(".phase-clock")).toHaveAttribute("data-clock-label", "PREPARE");
});
