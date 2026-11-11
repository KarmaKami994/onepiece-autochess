import { expect, test } from "@playwright/test";
import { createTeamPlan } from "../game/teamPlanner";
import { installRuntimeBoundaryChecks } from "./helpers";

installRuntimeBoundaryChecks();

test("B10 pilots expose all six clips, both facings and retained variants in Animation Lab", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /ANIMATION LAB/ }).click();
  await expect(page.getByRole("heading", { name: "ANIMATION LAB", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "PAUSE", exact: true }).click();
  for (const id of ["koala", "kaido", "robin-demonio-fleur"]) {
    await page.getByRole("combobox", { name: "CHARACTER", exact: true }).selectOption(id);
    const preview = page.locator(`.animation-preview-panel[aria-label*="${id}-b10-v2"]`);
    await expect(preview).toBeVisible();
    await expect(preview.locator(".animation-preview-sprite")).toHaveCSS("background-image", new RegExp(`${id}-b10-v2.png`));
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
    await expect(page.locator(".animation-preview-panel")).toHaveCount(2);
    const bounds = await preview.boundingBox();
    const viewport = page.viewportSize();
    expect(bounds).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${id}-lab.png`), fullPage: true });
  }
  await page.getByRole("combobox", { name: "CHARACTER", exact: true }).selectOption("robin");
  await expect(page.locator('.animation-preview-panel[aria-label="robin robin-b11-v2 preview"]')).toBeVisible();
  await expect(page.locator('.animation-preview-panel[aria-label="robin robin-v2 preview"]')).toBeVisible();
  await page.getByLabel("Compare oldest fallback", { exact: true }).check();
  await expect(page.locator('.animation-preview-panel[aria-label="robin robin preview"]')).toBeVisible();
});

test("isolated combat loads the visible Koala and Demonio bodies without a roster preload", async ({ page }, testInfo) => {
  const sheets = new Set<string>();
  page.on("request", (request) => { if (request.url().includes("/assets/animations/")) sheets.add(new URL(request.url()).pathname); });
  await page.goto("/");
  await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  const plan = createTeamPlan();
  plan.name = "B10 presentation only";
  plan.teams.a = [{ id: "robin", definitionId: "robin", star: 3, formId: "robin-demonio-fleur", items: [], position: { x: 1, y: 3 } }];
  plan.teams.b = [{ id: "koala", definitionId: "koala", star: 3, items: [], position: { x: 1, y: 3 } }];
  await page.getByLabel("Import plan", { exact: true }).setInputFiles({ name: "b10.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  const result = page.getByRole("region", { name: "Combat test result", exact: true });
  await expect(result.locator(".phaser-stage-frame")).toHaveAttribute("data-camera-zoom", /\d/);
  await expect(result.locator("canvas")).toBeVisible();
  await expect.poll(() => [...sheets].sort()).toEqual([
    "/assets/animations/koala-b10-v2/koala-b10-v2.png",
    "/assets/animations/robin-demonio-fleur-b10-v2/robin-demonio-fleur-b10-v2.png",
  ]);
  await expect(result.getByRole("list", { name: "Units on the tactical board" })).toContainText("Demonio Fleur");
  const canvas = result.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeInViewport();
  await canvas.screenshot({ path: testInfo.outputPath("b10-combat.png") });
});
