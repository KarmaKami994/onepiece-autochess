import { expect, test } from "@playwright/test";
import { advanceMatchPhase, createMatch } from "../game";

for (const round of [10, 20] as const) {
  test(`round ${round} voyage recruitment presents and resolves three crew choices`, async ({ page }) => {
    const state = createMatch(`p11-e2e-${round}`);
    state.round = round - 1;
    state.phase = "item-choice";
    const offered = advanceMatchPhase(state);
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
          state: saved,
          seed: saved.seed,
          updatedAt: Date.now(),
          schemaVersion: 6,
          contentVersion: saved.contentVersion,
          replayBattle: false,
        }, "active-voyage");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    }, offered);
    await page.reload();
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    const recruitment = page.locator(".voyage-recruitment-screen");
    await expect(recruitment.getByRole("heading", {
      name: round === 10 ? "GRAND LINE RECRUITMENT" : "NEW WORLD RECRUITMENT",
    })).toBeVisible();
    await expect(recruitment.locator("button.reward-card")).toHaveCount(3);
    await expect(recruitment).toContainText("full bench converts the recruit");
    await expect(recruitment.locator("button.reward-card").first()).toContainText("GOLD VALUE");
    await recruitment.locator("button.reward-card").first().click();
    await expect(page.locator(".match-screen")).toBeVisible();
    await expect(page.locator(".voyage-recruitment-screen")).toHaveCount(0);
  });
}
