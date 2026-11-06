import { expect, test } from "@playwright/test";
import { createMatch, stageBattleEnvironment, DEFAULT_CONTENT, type MatchState } from "../game";
import { createVoyageSaveEnvelope } from "../app/voyagePersistence";
import { installRuntimeBoundaryChecks, readVoyageFixture, storeVoyageFixture } from "./helpers";

installRuntimeBoundaryChecks();

test("Punk Hazard exposes its frozen cells before combat and resumes the exact environment", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("grand-line-auto-chess.first-voyage.v1", "complete");
    localStorage.setItem("grand-line-auto-chess.settings.v1", JSON.stringify({ muted: true, reducedMotion: true, highContrast: true }));
  });
  await page.goto("/");
  const state = createMatch("b08-ui-punk-hazard"); state.round = 32; state.stageId = "seraphim-deployment";
  state.battleEnvironment = stageBattleEnvironment(32, DEFAULT_CONTENT);
  const player = state.players[0]; player.level = 2;
  for (const [index, id] of ["kuzan", "luffy"].entries()) {
    const unitId = `ui-${id}`;
    player.units[unitId] = { id: unitId, definitionId: id, star: 3, items: [], acquiredOrder: index + 1 };
    player.board[`${3 + index},4`] = unitId; state.pool[id] -= 9;
  }
  await storeVoyageFixture(page, createVoyageSaveEnvelope(state, state.seed, Date.now()));
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await page.getByRole("button", { name: "Pause voyage", exact: true }).click();
  const environment = page.getByLabel("Battle environment", { exact: true });
  await expect(environment).toContainText("SNOW"); await expect(environment).toContainText("FROST PATCH");
  await environment.locator("summary").click(); await expect(environment).toContainText("1.3 in Snow");
  await expect(page.getByRole("list", { name: "Board field cells" }).locator("li")).toHaveCount(4);
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-weather", "snow");
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.battleEnvironment).toEqual(state.battleEnvironment);
  await page.screenshot({ path: `tmp/b08-snow-setup-${page.viewportSize()!.width}.png`, fullPage: true });
  await page.reload(); await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".phase-clock")).toHaveAttribute("data-clock-label", "PAUSED");
  await expect(page.getByLabel("Battle environment", { exact: true })).toContainText("SNOW");
  await page.getByRole("button", { name: /^START BATTLE\b/i }).click();
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-phase", "battle");
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.lastResults[0]?.environment).toEqual(state.battleEnvironment);
  await expect.poll(async () => ((await readVoyageFixture(page))?.state as MatchState | undefined)?.lastResults.some(result => result.events.some(event => event.type === "status" && event.status === "freeze"))).toBe(true);
});

test("the planner saves explicit weather/fields and replays an isolated combat with visible configuration", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: /CREW TOOLS/i }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.getByRole("textbox", { name: "Plan name", exact: true }).fill("B08 frozen practice");
  await page.getByRole("combobox", { name: "Weather", exact: true }).selectOption("snow");
  await page.getByRole("checkbox", { name: /^Frost Patch:/ }).check();
  await page.getByRole("combobox", { name: "Team A recruit", exact: true }).selectOption("kuzan");
  await page.getByRole("button", { name: "Add to Team A", exact: true }).click();
  await page.getByRole("button", { name: "Add to Team B", exact: true }).click();
  await page.getByRole("button", { name: "Save plan locally", exact: true }).click();
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  const board = page.locator(".planner-battle .phaser-stage-frame");
  await expect(board).toHaveAttribute("data-weather", "snow"); await expect(board).toHaveAttribute("data-field-count", "1");
  await expect(page.getByRole("list", { name: "Board field cells" }).locator("li")).toHaveCount(4);
  await page.screenshot({ path: `tmp/b08-planner-${page.viewportSize()!.width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Replay combat test", exact: true }).click();
  await expect(page.locator(".planner-battle .phaser-stage-frame")).toHaveAttribute("data-weather", "snow");
  await page.reload(); await page.getByRole("button", { name: /CREW TOOLS/i }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.getByText("Saved plans (1/20)", { exact: true }).click();
  await page.getByRole("button", { name: "Load B08 frozen practice", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Weather", exact: true })).toHaveValue("snow");
  await expect(page.getByRole("checkbox", { name: /^Frost Patch:/ })).toBeChecked();
});

test("the codex explains all four new statuses and both authored field rules", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: /CREW TOOLS/i }).click();
  await page.getByRole("button", { name: "Status", exact: true }).click();
  const cards = page.locator(".reference-card"); await expect(cards).toHaveCount(12);
  for (const status of ["Poison", "Freeze", "Sleep", "Locked"]) await expect(page.getByRole("heading", { name: status, exact: true })).toBeVisible();
  await expect(page.locator('[data-reference-id="sleep"]')).toContainText("300 ms");
  await expect(page.locator('[data-reference-id="locked"]')).toContainText("range is 1");
  await page.getByRole("button", { name: "Weather & fields", exact: true }).click();
  await expect(cards).toHaveCount(5);
  await expect(page.locator('[data-reference-id="charged-deck"]')).toContainText("R14 Skypiea Judgment");
  await expect(page.locator('[data-reference-id="frost-patch"]')).toContainText("R32 Punk Hazard");
});
