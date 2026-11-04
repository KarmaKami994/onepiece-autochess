import { expect, test, type Page } from "@playwright/test";
import { createMatch, type MatchState, type UnitInstance } from "../game";
import { installRuntimeBoundaryChecks } from "./helpers";

installRuntimeBoundaryChecks();

function completedVoyage(won: boolean, legacy = false): MatchState {
  const state = createMatch("b01-results-browser");
  state.phase = "game-over";
  state.winnerId = won ? "player-1" : "bot-1";
  state.round = 42;
  const human = state.players[0];
  human.level = 9;
  human.alive = won;
  human.placement = won ? 1 : 2;
  const deployed: UnitInstance[] = ["luffy", "robin", "nami", "zoro", "usopp", "sanji", "chopper", "franky", "brook"]
    .map((definitionId, index) => ({
      id: `deployed-${index}`, definitionId, star: index < 2 ? 3 : 1,
      ...(index === 0 ? { formId: "luffy-gear-4-boundman" }
        : index === 1 ? { formId: "robin-demonio-fleur" } : {}),
      items: index === 0 ? ["armament-wraps", "sniper-goggles", "sea-prism-stone"] : [],
      acquiredOrder: index,
    }));
  const reserve: UnitInstance[] = ["shanks", "mihawk", "garp"].map((definitionId, index) => ({
    id: `reserve-${index}`, definitionId, star: 2,
    items: index === 0 ? ["clima-tact"] : [], acquiredOrder: 9 + index,
  }));
  human.finalCrew = [...deployed, ...reserve];
  human.units = {};
  human.board = {};
  human.bench.fill(null);
  if (!legacy) human.finalLineup = {
    deployed: deployed.map((unit, index) => ({ ...unit, position: { x: index % 8, y: 4 + Math.floor(index / 8) } })),
    reserve,
  };
  return state;
}

async function openResults(page: Page, state: MatchState): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete");
  });
  await page.goto("/");
  await page.evaluate(async (saved) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("grand-line-auto-chess", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("voyages");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("voyages", "readwrite");
      transaction.objectStore("voyages").put({
        state: saved, seed: saved.seed, updatedAt: Date.now(),
        schemaVersion: 6, contentVersion: saved.contentVersion, replayBattle: false,
      }, "active-voyage");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, state);
  await page.reload();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".results-screen")).toBeVisible();
}

for (const won of [true, false]) {
  test(`complete final lineup remains readable after resume (winner=${won})`, async ({ page }, testInfo) => {
    await openResults(page, completedVoyage(won));
    const deployed = page.getByRole("region", { name: "LAST DEPLOYED CREW", exact: true });
    const reserve = page.getByRole("region", { name: "RESERVE AT VOYAGE END", exact: true });
    await expect(deployed.locator(".final-crew-card")).toHaveCount(9);
    await expect(reserve.locator(".final-crew-card")).toHaveCount(3);
    await expect(deployed).toContainText("Luffy — Gear 4: Boundman");
    await expect(deployed).toContainText("Robin — Demonio Fleur");
    await expect(deployed.locator(".final-crew-card").first()).toContainText("Sea Prism Stone");
    await expect(page.locator(".result-stats > div").filter({ hasText: "CREW SHOWN" }).locator("strong")).toHaveText("12");
    await expect(page.locator(".result-stats > div").filter({ hasText: "ITEMS SHOWN" }).locator("strong")).toHaveText("4");
    await deployed.locator(".final-crew-card").last().scrollIntoViewIfNeeded();
    await expect(deployed.locator(".final-crew-card").last()).toContainText("Brook");
    await page.screenshot({ path: testInfo.outputPath("final-lineup.png") });
    const menu = page.getByRole("button", { name: "TITLE SCREEN", exact: true });
    await menu.scrollIntoViewIfNeeded();
    await expect(menu).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    await expect(deployed.locator(".final-crew-card")).toHaveCount(9);
    await expect(reserve.locator(".final-crew-card")).toHaveCount(3);
  });
}

test("legacy result shows every saved unit without guessing deployment", async ({ page }) => {
  await openResults(page, completedVoyage(false, true));
  await expect(page.getByRole("region", { name: "SAVED CREW — DEPLOYMENT UNKNOWN", exact: true })
    .locator(".final-crew-card")).toHaveCount(12);
  await expect(page.locator(".result-lineup-note")).toContainText("without guessing");
  await expect(page.locator(".results-traits")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "LAST DEPLOYED CREW", exact: true })).toHaveCount(0);
});
