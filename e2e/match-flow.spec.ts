import { expect, test } from "@playwright/test";
import {
  advanceVisiblePhase,
  cameraFrameForStage,
  installRuntimeBoundaryChecks,
  openFreshVoyage,
} from "./helpers";

installRuntimeBoundaryChecks();

test("complete voyage covers PvE reward, carousel, PvP, resume, and results", async ({
  page,
}) => {
  await openFreshVoyage(page);

  const recruit = page.locator("button.shop-card:not([disabled])").first();
  await expect(recruit).toBeVisible();
  await recruit.hover();
  const shopPreview = page.locator(".shop-decision-preview");
  await expect(shopPreview).toBeVisible();
  await expect(shopPreview).toContainText("ABILITY");
  await expect(shopPreview).toContainText("RECRUITMENT IMPACT");
  const [previewBounds, previewFooterBounds] = await Promise.all([
    shopPreview.boundingBox(),
    page.locator(".match-footer").boundingBox(),
  ]);
  expect(previewBounds).not.toBeNull();
  expect(previewFooterBounds).not.toBeNull();
  expect(previewBounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((previewBounds?.x ?? 0) + (previewBounds?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  expect((previewBounds?.y ?? 0) + (previewBounds?.height ?? 0)).toBeLessThanOrEqual(
    previewFooterBounds?.y ?? 0,
  );
  const hoverPreview = await shopPreview.innerText();
  await page.mouse.move(0, 0);
  await expect(shopPreview).toBeHidden();
  await recruit.focus();
  await expect(shopPreview).toBeVisible();
  expect((await shopPreview.innerText()).replace(/\s+/g, " ").trim()).toBe(
    hoverPreview.replace(/\s+/g, " ").trim(),
  );
  await recruit.click();
  const deploy = page.getByRole("button", { name: "DEPLOY", exact: true });
  await expect(deploy).toBeVisible();
  await deploy.click();

  await page.locator("button.shop-card:not([disabled])").first().click();
  await expect(deploy).toBeVisible();
  await deploy.click();
  await expect(page.locator(".crew-capacity")).toContainText("2");

  await expect(page.locator(".opponent-banner strong")).toHaveText(
    "East Blue Patrol",
  );

  await page.getByRole("button", { name: /START BATTLE|SET SAIL/i }).click();
  await page
    .getByRole("button", { name: /SKIP ANIMATION|CONTINUE/i })
    .click();

  await expect(page.locator(".reward-screen")).toBeVisible();
  await page.locator("button.reward-card").first().click();
  await expect(page.locator(".match-screen")).toBeVisible();

  let sawCarousel = false;
  for (let step = 0; step < 40; step += 1) {
    if (await page.locator(".carousel-screen").isVisible()) {
      sawCarousel = true;
      break;
    }
    await advanceVisiblePhase(page);
    await page.waitForTimeout(35);
  }
  expect(sawCarousel).toBe(true);
  const regatta = page.locator(".bounty-regatta-screen");
  await expect(
    regatta.getByRole("heading", { name: "BOUNTY REGATTA" }),
  ).toBeVisible();
  const regattaApplication = regatta.getByRole("application", {
    name: /Bounty Regatta/i,
  });
  await expect(regattaApplication).toBeVisible();
  await expect(regatta.locator(".regatta-status")).toContainText(
    /ANCHOR LOCKED|SAIL NOW/,
  );
  await expect(regatta.getByRole("list", { name: /Captains/i }).locator("li"))
    .toHaveCount(8);
  const regattaRenderer = regattaApplication.locator("..");
  await expect(regattaRenderer).toHaveAttribute("data-carousel-ready", "true");
  await expect(regatta.locator(".regatta-preview")).toBeVisible();

  await expect(regatta.locator(".regatta-status")).toContainText("SAIL NOW", {
    timeout: 8_000,
  });
  const canvas = regatta.locator("canvas");
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  await canvas.click({
    position: {
      x: (canvasBounds?.width ?? 0) / 2,
      y: (canvasBounds?.height ?? 0) / 2,
    },
  });
  await expect
    .poll(async () => Number(await regattaRenderer.getAttribute("data-target-y")))
    .toBeLessThan(500);
  const remainingBeforeReload = Number(
    await regatta.locator(".carousel-timer strong").innerText(),
  );
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByRole("button", { name: /CONTINUE/i })).toBeEnabled();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(regatta).toBeVisible();
  const remainingAfterReload = Number(
    await regatta.locator(".carousel-timer strong").innerText(),
  );
  expect(remainingAfterReload).toBeLessThanOrEqual(remainingBeforeReload);
  await expect(page.locator(".match-screen")).toBeVisible({ timeout: 40_000 });

  const returnedStage = page.locator(".phaser-stage-frame");
  const returnedCanvas = returnedStage.locator("canvas");
  await expect(returnedStage).toHaveAttribute("data-camera-zoom", /\d/);
  const [returnedStageBounds, returnedCanvasBounds] = await Promise.all([
    returnedStage.boundingBox(),
    returnedCanvas.boundingBox(),
  ]);
  expect(returnedStageBounds).not.toBeNull();
  expect(returnedCanvasBounds).not.toBeNull();
  expect(returnedCanvasBounds?.width).toBeCloseTo(
    returnedStageBounds?.width ?? 0,
    0,
  );
  expect(returnedCanvasBounds?.height).toBeCloseTo(
    returnedStageBounds?.height ?? 0,
    0,
  );
  const returnedFrame = await cameraFrameForStage(
    page,
    returnedCanvasBounds?.width ?? 0,
    returnedCanvasBounds?.height ?? 0,
  );
  expect(
    Number(await returnedStage.getAttribute("data-camera-zoom")),
  ).toBeCloseTo(returnedFrame.zoom, 4);

  await page.getByRole("button", { name: /START BATTLE|SET SAIL/i }).click();
  await expect(page.locator(".opponent-banner .tiny-label")).toHaveText(
    "ENGAGED WITH",
  );
  const pvpOpponent = await page.locator(".opponent-banner strong").innerText();
  expect([
    "East Blue Patrol",
    "Rifle Line",
    "Raider Ambush",
    "Calm Belt",
    "Pacifista Test",
    "Siege of Justice",
  ]).not.toContain(pvpOpponent);
  await page.getByRole("button", { name: /SKIP ANIMATION/i }).click();
  await expect(page.locator(".action-toast strong")).toHaveText(
    /VICTORY|DEFEAT|DRAW/,
  );
  await expect(page.locator(".action-toast p")).toHaveText(
    /health remained|Captain damage|no Captain damage/i,
  );

  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByRole("button", { name: /CONTINUE/i })).toBeEnabled();
  await page.getByRole("button", { name: /CONTINUE/i }).click();
  await expect(page.locator(".match-screen")).toBeVisible();

  for (let step = 0; step < 300; step += 1) {
    if (await page.locator(".results-screen").isVisible()) break;
    await advanceVisiblePhase(page);
    await page.waitForTimeout(35);
  }

  await expect(page.locator(".results-screen")).toBeVisible();
  await expect(page.locator(".placement-medal")).toContainText("#");
  await expect(page.locator(".final-crew-card").first()).toBeVisible();
  await expect(page.locator(".final-crew-card").first()).toContainText("★");
  const resultsBounds = await page.locator(".results-panel").boundingBox();
  expect(resultsBounds).not.toBeNull();
  expect(resultsBounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(resultsBounds?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((resultsBounds?.x ?? 0) + (resultsBounds?.width ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  expect((resultsBounds?.y ?? 0) + (resultsBounds?.height ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0,
  );
});
