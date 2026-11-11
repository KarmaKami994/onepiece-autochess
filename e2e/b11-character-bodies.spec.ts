import { expect, test, type Page } from "@playwright/test";
import { createTeamPlan, simulateTeamPlan, type TeamPlan } from "../game/teamPlanner";
import { installRuntimeBoundaryChecks } from "./helpers";

installRuntimeBoundaryChecks();

async function openPlan(page: Page, plan: TeamPlan) {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.settings.v1", JSON.stringify({ muted: true, animationSpeed: 2, reducedMotion: true })));
  await page.goto("/");
  await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.getByLabel("Import plan", { exact: true }).setInputFiles({ name: "b11.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  const result = page.getByRole("region", { name: "Combat test result", exact: true });
  await expect(result.locator(".phaser-stage-frame")).toHaveAttribute("data-camera-zoom", /\d/);
  return result;
}

test("B11 own form and PvE bodies expose six clips, both facings and retained oldest fallback", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /ANIMATION LAB/ }).click();
  await page.getByRole("button", { name: "PAUSE", exact: true }).click();
  for (const id of ["killer", "caesar-clown", "pica", "luffy-gear-4-boundman", "luffy-gear-4-snakeman", "chopper-monster-point", "sea-king", "cp9-elite-laser"]) {
    await page.getByRole("combobox", { name: "CHARACTER", exact: true }).selectOption(id);
    const visualId = id === "cp9-elite-laser" ? "cp9-elite" : id;
    const preview = page.locator(`.animation-preview-panel[aria-label*="${visualId}-b11-v2"]`);
    await expect(preview).toBeVisible();
    for (const state of ["idle", "move", "attack", "cast", "hit", "defeat"]) {
      const button = page.getByRole("button", { name: state.toUpperCase(), exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Next frame", exact: true }).click();
    }
    await page.getByRole("button", { name: "← ENEMY", exact: true }).click();
    await expect(preview.locator(".animation-preview-sprite")).toHaveAttribute("style", /scaleX\(-1\)/);
    await page.getByRole("button", { name: "PLAYER →", exact: true }).click();
    await page.getByRole("button", { name: "IDLE", exact: true }).click();
    const bounds = await preview.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    if (id.includes("gear-4") || id === "chopper-monster-point") await page.screenshot({ path: testInfo.outputPath(`${id}-lab.png`), fullPage: true });
  }
  await page.getByRole("combobox", { name: "CHARACTER", exact: true }).selectOption("zoro");
  await expect(page.locator('.animation-preview-panel[aria-label="zoro zoro-v2 preview"]')).toBeVisible();
  await page.getByLabel("Compare oldest fallback", { exact: true }).check();
  await expect(page.locator('.animation-preview-panel[aria-label="zoro zoro preview"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("persistent Gear 4 and Demonio forms load their own bodies without loading unrelated crew", async ({ page }, testInfo) => {
  const sheets = new Set<string>();
  page.on("request", request => { if (request.url().includes("/assets/animations/")) sheets.add(new URL(request.url()).pathname); });
  const plan = createTeamPlan();
  plan.teams.a = [
    { id: "bound", definitionId: "luffy", star: 3, items: ["armament-wraps"], position: { x: 1, y: 3 } },
    { id: "snake", definitionId: "luffy", star: 3, items: ["sniper-goggles"], position: { x: 3, y: 3 } },
  ];
  plan.teams.b = [{ id: "demonio", definitionId: "robin", star: 3, items: [], position: { x: 2, y: 3 } }];
  const result = await openPlan(page, plan);
  const stage = result.locator(".phaser-stage-frame");
  for (const key of ["luffy-gear-4-boundman-b11-v2", "luffy-gear-4-snakeman-b11-v2", "robin-demonio-fleur-b10-v2"]) await expect(stage).toHaveAttribute("data-presented-animations", new RegExp(key));
  expect([...sheets].sort()).toEqual([
    "/assets/animations/luffy-gear-4-boundman-b11-v2/luffy-gear-4-boundman-b11-v2.png",
    "/assets/animations/luffy-gear-4-snakeman-b11-v2/luffy-gear-4-snakeman-b11-v2.png",
    "/assets/animations/robin-demonio-fleur-b10-v2/robin-demonio-fleur-b10-v2.png",
  ]);
  const canvas = result.locator("canvas"); await canvas.scrollIntoViewIfNeeded();
  await canvas.screenshot({ path: testInfo.outputPath("persistent-forms.png") });
});

test("Monster Point swaps in place and Phoenix restores the base body; replay starts from the frozen base", async ({ page }, testInfo) => {
  const plan = createTeamPlan(); plan.seed = "b11-phoenix-body";
  plan.teams.a = [
    { id: "chopper", definitionId: "chopper", star: 3, items: ["phoenix-feather", "banquet-belt"], position: { x: 0, y: 5 } },
    { id: "luffy", definitionId: "luffy", star: 1, items: [], position: { x: 7, y: 3 } },
    { id: "usopp", definitionId: "usopp", star: 1, items: [], position: { x: 6, y: 3 } },
  ];
  plan.teams.b = [{ id: "enemy", definitionId: "whitebeard", star: 3, items: [], position: { x: 7, y: 3 } }];
  const run = simulateTeamPlan(plan);
  if (!run.ok) throw new Error(run.errors.join(" "));
  const transform = run.result.events.find(event => event.type === "unit-transform");
  const revive = run.result.events.find(event => event.type === "unit-resurrect");
  expect(transform).toMatchObject({ tick: 80, toFormId: "chopper-monster-point" });
  expect(revive?.tick).toBeGreaterThan(transform!.tick);
  expect(revive).not.toHaveProperty("formId");
  const result = await openPlan(page, plan), stage = result.locator(".phaser-stage-frame");
  await expect(stage).toHaveAttribute("data-presented-animations", /"plan-a:chopper","chopper-b11-v2"/);
  const sequence = await stage.getAttribute("data-event-sequence");
  const canvas = result.locator("canvas"); await canvas.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-presented-animations", /"plan-a:chopper","chopper-monster-point-b11-v2"/, { timeout: 15_000 });
  await canvas.screenshot({ path: testInfo.outputPath("monster-point.png") });
  await expect(stage).toHaveAttribute("data-presented-animations", /"plan-a:chopper","chopper-b11-v2"/, { timeout: 15_000 });
  await expect(stage).toHaveAttribute("data-event-sequence", sequence!);
  await canvas.screenshot({ path: testInfo.outputPath("phoenix-base.png") });
  await expect(result.locator(".combat-report")).toHaveAttribute("data-complete", "true", { timeout: 30_000 });
  await page.getByRole("button", { name: "Replay combat test", exact: true }).click();
  await expect(result.locator(".phaser-stage-frame")).toHaveAttribute("data-presented-animations", /"plan-a:chopper","chopper-b11-v2"/);
  await expect(result.locator(".phaser-stage-frame")).toHaveAttribute("data-presented-animations", /chopper-monster-point-b11-v2/, { timeout: 15_000 });
});
