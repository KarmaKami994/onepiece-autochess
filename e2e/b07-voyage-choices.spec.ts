import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CONTENT, advanceMatchPhase, createMatch, type MatchState } from "../game";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { installRuntimeBoundaryChecks, readVoyageFixture, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

async function menu(page: Page) {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete"));
  await page.goto("/");
}
async function resume(page: Page, state: MatchState) {
  await menu(page); await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
}
function harbor(round: number) {
  const state = createMatch(`b07-ui-harbor-${round}`); state.round = round - 1; state.phase = "item-choice";
  return advanceMatchPhase(state);
}

test("fresh voyage offers three reserved starters at the normal price and resumes without another starter", async ({ page }) => {
  await menu(page); await page.getByRole("button", { name: /NEW VOYAGE/i }).click();
  const starter = page.locator(".starter-recruitment-screen");
  await expect(starter.getByRole("heading", { name: "CHOOSE YOUR FIRST CREW" })).toBeVisible();
  await expect(starter.locator("button.reward-card")).toHaveCount(3);
  await expect(starter).toContainText("1-gold recruit");
  await starter.getByRole("button", { name: "Pause voyage", exact: true }).click();
  await starter.getByRole("button", { name: "Open settings", exact: true }).click();
  await page.getByRole("button", { name: "BACK TO DECK" }).click();
  await expect(starter.locator(".phase-clock")).toHaveAttribute("data-clock-label", "PAUSED");
  await page.screenshot({ path: `tmp/b07-starter-${page.viewportSize()!.width}.png`, fullPage: true });
  await starter.locator("button.reward-card").first().click();
  await expect(page.locator(".match-screen")).toBeVisible();
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.players[0].gold).toBe(DEFAULT_CONTENT.config.startGold - 1);
  const saved = (await readVoyageFixture(page))!; const state = saved.state as MatchState;
  expect(Object.values(state.players[0].units)).toHaveLength(1);
  expect(state.voyageChoiceHistory.filter(receipt => receipt.kind === "starter")).toHaveLength(8);
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".match-screen")).toBeVisible(); await expect(starter).toHaveCount(0);
  expect(((await readVoyageFixture(page))!.state as MatchState).players[0].gold).toBe(DEFAULT_CONTENT.config.startGold - 1);
});

test("harbor gift preserves offers across reload, grants once and exposes the authored codex", async ({ page }) => {
  const offered = harbor(16); await resume(page, offered);
  const screen = page.locator(".harbor-screen");
  await expect(screen.getByRole("heading", { name: "USOPP'S SUPPLY STOP" })).toBeVisible();
  await expect(screen.locator("button.reward-card")).toHaveCount(3);
  await screen.getByRole("button", { name: "Pause voyage", exact: true }).click();
  await expect.poll(async () => (await readVoyageFixture(page))?.phaseClock?.paused).toBe(true);
  const saved = (await readVoyageFixture(page))!.state as MatchState;
  expect(saved.pendingHarborOffers).toEqual(offered.pendingHarborOffers);
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(screen.locator(".phase-clock")).toHaveAttribute("data-clock-label", "PAUSED");
  await page.screenshot({ path: `tmp/b07-harbor-${page.viewportSize()!.width}.png`, fullPage: true });
  await screen.locator("button.reward-card").first().click();
  await expect(page.locator(".match-screen")).toBeVisible();
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.players[0].inventory.length).toBe(1);
  const next = (await readVoyageFixture(page))!.state as MatchState;
  expect(next.round).toBe(16); expect(next.players[0].gold).toBe(offered.players[0].gold);
  expect(next.voyageChoiceHistory.filter(receipt => receipt.kind === "harbor")).toHaveLength(8);
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await page.getByRole("button", { name: "Return to title", exact: true }).click();
  await page.getByRole("button", { name: /CREW TOOLS/i }).click();
  await page.getByRole("button", { name: "Voyage choices", exact: true }).click();
  await expect(page.getByText("Usopp's Supply Stop", { exact: true })).toBeVisible();
});

test("unaffordable workshop is skippable and timeout has the same deterministic effect", async ({ page }) => {
  await page.clock.install();
  const offered = harbor(18); offered.players[0].gold = 0; const expected = advanceMatchPhase(offered);
  await resume(page, offered);
  const screen = page.locator(".harbor-screen");
  await expect(screen.getByRole("heading", { name: "FRANKY'S WORKSHOP" })).toBeVisible();
  await expect(screen.locator("button.reward-card:disabled")).toHaveCount(2);
  await expect(screen.getByRole("button", { name: "SAIL ON WITHOUT SUPPLIES" })).toBeEnabled();
  await screen.getByRole("button", { name: "SAIL ON WITHOUT SUPPLIES" }).click();
  await expect(page.locator(".match-screen")).toBeVisible();
  await page.clock.fastForward(500);
  await expect.poll(async () => (await readVoyageFixture(page))?.state).toEqual(expected);
  await resume(page, offered);
  await expect(screen).toBeVisible();
  await page.clock.fastForward(38_000);
  await expect(screen).toHaveCount(0); await expect(page.locator(".match-screen")).toBeVisible();
  await page.clock.fastForward(500);
  await expect.poll(async () => (await readVoyageFixture(page))?.state).toEqual(expected);
});
