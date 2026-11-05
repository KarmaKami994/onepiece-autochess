import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createMatch, simulateBattle, type MatchState } from "../game";
import { newVoyageReplay, observeVoyage } from "../app/chronicle";
import { DEFAULT_CONTENT } from "../game";
import { installRuntimeBoundaryChecks } from "./helpers";

installRuntimeBoundaryChecks();

function finalBattle(): MatchState {
  const state = createMatch("b04-browser-voyage"); state.round = 6; state.stageId = "pvp-6"; state.phase = "battle";
  state.players.forEach((player, index) => { player.alive = index < 2; player.placement = index < 2 ? null : index + 1; player.hp = index === 0 ? 100 : index === 1 ? 1 : 0; player.units = {}; player.board = {}; player.bench.fill(null); });
  state.players[0].units.robin = { id: "robin", definitionId: "robin", formId: "robin-demonio-fleur", star: 3, items: ["armament-wraps"], acquiredOrder: 1 };
  state.players[0].board = { "1,4": "robin" };
  state.players[1].units.luffy = { id: "luffy", definitionId: "luffy", star: 1, items: [], acquiredOrder: 1 };
  state.players[1].board = { "1,4": "luffy" };
  const result = simulateBattle({ id: "player-1", units: [{ ...state.players[0].units.robin, id: "player-1:robin", position: { x: 1, y: 2 } }] }, { id: "bot-1", units: [{ ...state.players[1].units.luffy, id: "bot-1:luffy", position: { x: 2, y: 2 } }] }, { seed: "b04-browser-voyage", maxTicks: 200 });
  state.lastResults = [{ ...result, playerAId: "player-1", playerBId: "bot-1", ghostOfPlayerId: null, playerADamage: 0, playerBDamage: 99 }];
  state.pairings = [{ playerAId: "player-1", playerBId: "bot-1", ghostOfPlayerId: null }];
  return state;
}
async function activeSave(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("grand-line-auto-chess", 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const value = await new Promise<unknown>((resolve, reject) => { const request = db.transaction("voyages").objectStore("voyages").get("active-voyage"); request.onsuccess = () => resolve(request.result as unknown); request.onerror = () => reject(request.error); }); db.close(); return JSON.stringify(value);
  });
}
async function installVoyage(page: Page) {
  await page.addInitScript(() => { localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"); localStorage.setItem("grand-line-auto-chess.settings.v1", JSON.stringify({ muted: true })); });
  await page.goto("/");
  await page.evaluate(async (state) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("grand-line-auto-chess", 1); request.onupgradeneeded = () => request.result.createObjectStore("voyages"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction("voyages", "readwrite"); tx.objectStore("voyages").put({ state, seed: state.seed, updatedAt: Date.now(), schemaVersion: 6, contentVersion: state.contentVersion, replayBattle: false }, "active-voyage"); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, finalBattle());
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/ }).click();
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-phase", "battle");
}
async function openChronicle(page: Page) {
  const button = page.getByRole("button", { name: /VOYAGE CHRONICLE/ }); await expect(button).toBeInViewport(); await button.click();
  await expect(page.getByRole("heading", { name: "VOYAGE CHRONICLE", exact: true })).toBeVisible();
}
function count(page: Page) { return page.locator(".profile-records > div").filter({ has: page.getByText("Completed voyages", { exact: true }) }).locator("dd"); }

test("local completion survives restart once; replay pauses, switches perspective and phase without touching active save", async ({ page }, testInfo) => {
  await installVoyage(page);
  await page.getByRole("button", { name: /SKIP ANIMATION/ }).click();
  await expect(page.locator(".results-screen")).toBeVisible();
  await expect.poll(async () => JSON.parse(await activeSave(page)) as { state: { phase: string } }).toMatchObject({ state: { phase: "game-over" } });
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/ }).click();
  await expect(page.locator(".results-screen")).toBeVisible();
  await page.reload();
  await openChronicle(page);
  await expect(count(page)).toHaveText("1");
  await expect(page.locator(".replay-library > li")).toHaveCount(1);
  const before = await activeSave(page);
  await page.getByRole("button", { name: "View b04-browser-voyage", exact: true }).click();
  const viewer = page.getByRole("region", { name: "Voyage replay", exact: true });
  await expect(viewer).toContainText("Partial recording from round 6");
  const stage = viewer.locator(".phaser-stage-frame"); const meter = viewer.locator(".combat-report");
  await expect(stage).toHaveAttribute("data-camera-zoom", /\d/);
  await expect(stage).toHaveAttribute("data-playback-paused", "true");
  await viewer.getByRole("button", { name: "Play replay", exact: true }).click();
  await expect.poll(async () => Number(await meter.getAttribute("data-elapsed-ms"))).toBeGreaterThan(0);
  await viewer.getByRole("button", { name: "Pause replay", exact: true }).click();
  await expect(stage).toHaveAttribute("data-playback-paused", "true");
  const elapsed = await meter.getAttribute("data-elapsed-ms"); await page.waitForTimeout(350); expect(await meter.getAttribute("data-elapsed-ms")).toBe(elapsed);
  await viewer.getByRole("combobox", { name: "Replay speed", exact: true }).selectOption("4");
  await viewer.getByRole("button", { name: "Play replay", exact: true }).click();
  await expect(meter).toHaveAttribute("data-complete", "true", { timeout: 12_000 });
  await meter.locator("summary").click(); await expect(meter).toContainText("Robin — Demonio Fleur");
  await viewer.getByRole("combobox", { name: "Replay perspective", exact: true }).selectOption("bot-1");
  await expect(meter).toHaveAttribute("data-complete", "false"); await expect(stage).toHaveAttribute("data-playback-paused", "true");
  await meter.locator("summary").click(); await expect(meter.locator("tbody")).toContainText("Luffy");
  await viewer.getByRole("button", { name: "Next phase", exact: true }).click();
  await expect(viewer).toContainText("game-over");
  await expect(viewer.getByRole("button", { name: "Play replay", exact: true })).toBeDisabled();
  expect(await activeSave(page)).toBe(before);
  await page.screenshot({ path: testInfo.outputPath("chronicle.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "← TITLE SCREEN", exact: true }).click();
  await page.getByRole("button", { name: /CONTINUE/ }).click(); await expect(page.locator(".results-screen")).toBeVisible();
});

test("imports are isolated and uncredited; resets retain dedupe and collection opens the codex", async ({ page }) => {
  await installVoyage(page); await page.getByRole("button", { name: /SKIP ANIMATION/ }).click(); await expect(page.locator(".results-screen")).toBeVisible();
  await expect.poll(async () => JSON.parse(await activeSave(page)) as { state: { phase: string } }).toMatchObject({ state: { phase: "game-over" } });
  await page.reload(); await openChronicle(page); await expect(count(page)).toHaveText("1");
  const before = await activeSave(page);
  await page.getByLabel("Import replay", { exact: true }).setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("alert")).toContainText("malformed"); await expect(page.locator(".replay-library > li")).toHaveCount(1); expect(await activeSave(page)).toBe(before);
  const state = finalBattle(); const replay = observeVoyage(newVoyageReplay(state, DEFAULT_CONTENT, "foreign", 1), state, 2);
  const importFile = (value: unknown) => page.getByLabel("Import replay", { exact: true }).setInputFiles({ name: "replay.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
  await importFile({ ...replay, seed: "imported-foreign", contentVersion: "old-version" });
  await expect(page.locator(".replay-library > li")).toHaveCount(2); await expect(count(page)).toHaveText("1");
  await page.getByRole("button", { name: "View imported-foreign", exact: true }).click(); await expect(page.locator(".chronicle-warning")).toContainText("Playback disabled");
  const archiveDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Export archive", exact: true }).click(); const archiveFile = await archiveDownload; expect(archiveFile.suggestedFilename()).toBe("grand-line-replay-archive.json");
  const archive = await readFile((await archiveFile.path())!, "utf8");
  const profileDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Export profile", exact: true }).click(); const profileFile = await profileDownload; const profile = await readFile((await profileFile.path())!, "utf8");
  await page.locator(".chronicle-collection > summary").click(); await page.getByRole("button", { name: "Robin → Codex", exact: true }).click(); await expect(page.getByLabel("Search codex", { exact: true })).toHaveValue("Robin");
  await page.getByRole("button", { name: /TITLE SCREEN/ }).click(); await openChronicle(page);
  await page.getByRole("button", { name: "Reset profile and collection…", exact: true }).click(); await page.getByRole("button", { name: "Confirm selected reset", exact: true }).click(); await expect(count(page)).toHaveText("0"); await expect(page.locator(".replay-library > li")).toHaveCount(2);
  await page.getByRole("button", { name: /TITLE SCREEN/ }).click(); await page.getByRole("button", { name: /CONTINUE/ }).click(); await expect(page.locator(".results-screen")).toBeVisible(); await page.reload(); await openChronicle(page); await expect(count(page)).toHaveText("0");
  await page.getByRole("button", { name: "Clear replay archive…", exact: true }).click(); await page.getByRole("button", { name: "Confirm selected reset", exact: true }).click(); await expect(page.locator(".replay-library > li")).toHaveCount(0); await expect(count(page)).toHaveText("0");
  expect(JSON.parse(await activeSave(page)).state.seed).toBe(JSON.parse(before).state.seed);
  await page.getByRole("button", { name: /TITLE SCREEN/ }).click(); await page.getByRole("button", { name: /CONTINUE/ }).click(); await expect(page.locator(".results-screen")).toBeVisible(); await page.reload(); await openChronicle(page); await expect(page.locator(".replay-library > li")).toHaveCount(0);
  await page.getByLabel("Import archive backup", { exact: true }).setInputFiles({ name: "archive.json", mimeType: "application/json", buffer: Buffer.from(archive) }); await expect(page.locator(".replay-library > li")).toHaveCount(2); await expect(count(page)).toHaveText("0");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Restore profile backup", { exact: true }).setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(profile) }); await expect(count(page)).toHaveText("1");
});
