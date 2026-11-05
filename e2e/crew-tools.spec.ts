import { expect, test, type Page } from "@playwright/test";
import { createMatch } from "../game";
import { createTeamPlan } from "../game/teamPlanner";
import { installRuntimeBoundaryChecks } from "./helpers";

installRuntimeBoundaryChecks();

async function openTools(page: Page) {
  await page.goto("/");
  const entry = page.getByRole("button", { name: /CREW TOOLS/ });
  await expect(entry).toBeInViewport();
  await expect(entry).toBeEnabled();
  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "CREW TOOLS", exact: true })).toBeVisible();
}

function examplePlan() {
  const plan = createTeamPlan();
  plan.name = "Practice saved crew";
  plan.teams.a = [{ id: "luffy", definitionId: "luffy", star: 3, items: ["armament-wraps"], position: { x: 0, y: 3 } }];
  plan.teams.b = [{ id: "robin", definitionId: "robin", star: 3, items: [], position: { x: 1, y: 3 } }];
  return plan;
}

test("codex covers searchable crew, all recipes, forms, PvE and exact recruitment rounds", async ({ page }, testInfo) => {
  await openTools(page);
  await expect(page.locator(".reference-card")).toHaveCount(34);
  await page.getByLabel("Search codex").fill("nami thunder");
  await expect(page.locator(".reference-card")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Cost", exact: true }).selectOption("1");
  await page.getByRole("combobox", { name: "Bond", exact: true }).selectOption("straw-hat");
  await page.locator(".reference-card summary").click();
  await expect(page.locator(".reference-card")).toContainText("Special Defense");
  const sections = page.getByRole("navigation", { name: "Codex sections" });
  await sections.getByRole("button", { name: "Items & recipes", exact: true }).click();
  await expect(page.locator(".reference-card")).toHaveCount(65);
  await page.getByRole("combobox", { name: "Item kind", exact: true }).selectOption("completed");
  await expect(page.locator(".reference-card")).toHaveCount(55);
  const wraps = page.locator('[data-reference-id="armament-wraps"]');
  await wraps.locator("summary").click();
  await expect(wraps).toContainText("Recipe:");
  await sections.getByRole("button", { name: "Forms", exact: true }).click();
  await expect(page.locator(".reference-card")).toHaveCount(4);
  await expect(page.locator('[data-reference-id="chopper-monster-point"]')).toContainText("8 seconds");
  await sections.getByRole("button", { name: "PvE", exact: true }).click();
  await page.getByLabel("Search codex").fill("kaido");
  await expect(page.locator(".reference-card")).toHaveCount(1);
  await expect(page.locator(".reference-card")).toContainText("PvE only");
  await sections.getByRole("button", { name: "Rounds", exact: true }).click();
  await page.getByRole("combobox", { name: "Stage kind", exact: true }).selectOption("voyage-choice");
  await expect(page.locator(".reference-card")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("codex.png") });
  await page.getByRole("button", { name: /TITLE SCREEN/ }).click();
  await expect(page.getByRole("button", { name: /NEW VOYAGE/ })).toBeVisible();
});

test("planner edits positions, detects illegal equipment and persists/imports/exports independently", async ({ page }, testInfo) => {
  await openTools(page);
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.getByRole("button", { name: "Add to Team A", exact: true }).click();
  await page.getByRole("combobox", { name: "Team A column", exact: true }).selectOption({ value: "2" });
  await expect(page.getByRole("button", { name: /Team A column 3 row 4,/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("combobox", { name: "Team A item 1", exact: true }).selectOption("armament-wraps");
  await page.getByRole("combobox", { name: "Team A item 2", exact: true }).selectOption("armament-wraps");
  await expect(page.getByRole("alert")).toContainText("duplicate completed items");
  await expect(page.getByRole("button", { name: "Save plan locally", exact: true })).toBeDisabled();
  const file = page.getByLabel("Import plan", { exact: true });
  await file.setInputFiles({ name: "valid-plan.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(examplePlan())) });
  await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Practice saved crew");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Team A crew", exact: true })).toContainText("Luffy — Gear 4: Boundman");
  await page.getByRole("button", { name: "Save plan locally", exact: true }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export plan", exact: true }).click();
  expect((await exported).suggestedFilename()).toBe("grand-line-team-plan.json");
  await file.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"format":"invalid"}') });
  await expect(page.getByRole("alert")).toContainText("Not a supported");
  await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Practice saved crew");
  await page.reload();
  await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.locator(".saved-plans summary").click();
  await page.getByRole("button", { name: "Load Practice saved crew", exact: true }).click();
  await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue("Practice saved crew");
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  const result = page.getByRole("region", { name: "Combat test result", exact: true });
  await expect(result).toBeVisible();
  await expect(result.locator(".phaser-stage-frame")).toHaveAttribute("data-camera-zoom", /\d/);
  const recap = result.getByRole("heading").first();
  const first = await recap.innerText();
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  await expect(recap).toHaveText(first);
  await page.getByRole("button", { name: "Replay combat test", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("planner.png") });
});

test("using crew tools leaves an existing voyage checkpoint byte-for-byte unchanged", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async (state) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("grand-line-auto-chess", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("voyages");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("voyages", "readwrite");
      transaction.objectStore("voyages").put({ state, seed: state.seed, updatedAt: 123, schemaVersion: 6, contentVersion: state.contentVersion, replayBattle: false }, "active-voyage");
      transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
    }); database.close();
  }, createMatch("untouched-voyage"));
  const checkpoint = () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("grand-line-auto-chess", 1); request.onsuccess = () => resolve(request.result); });
    const value = await new Promise<unknown>((resolve) => { const request = database.transaction("voyages").objectStore("voyages").get("active-voyage"); request.onsuccess = () => resolve(request.result); });
    database.close(); return JSON.stringify(value);
  });
  const before = await checkpoint();
  await page.reload();
  await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.getByLabel("Import plan", { exact: true }).setInputFiles({ name: "plan.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(examplePlan())) });
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  await page.getByRole("button", { name: "Save plan locally", exact: true }).click();
  await page.getByRole("button", { name: /TITLE SCREEN/ }).click();
  expect(await checkpoint()).toBe(before);
  await expect(page.getByRole("button", { name: /CONTINUE/ })).toBeEnabled();
});
