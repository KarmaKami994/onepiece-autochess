import { expect, test } from "@playwright/test";
import { createTeamPlan, simulateTeamPlan } from "../game/teamPlanner";
import { installRuntimeBoundaryChecks, openFreshVoyage } from "./helpers";

installRuntimeBoundaryChecks();

test("contributions follow visible playback, finish exactly, and reset on replay with accessible form cues", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("grand-line-auto-chess.settings.v1", JSON.stringify({ muted: true, animationSpeed: 4, reducedMotion: true, highContrast: true })));
  const plan = createTeamPlan();
  plan.teams.a = [{ id: "luffy", definitionId: "luffy", star: 3, items: ["armament-wraps"], position: { x: 0, y: 3 } }];
  plan.teams.b = [{ id: "robin", definitionId: "robin", star: 3, items: [], position: { x: 1, y: 3 } }];
  const run = simulateTeamPlan(plan);
  if (!run.ok) throw new Error(run.errors.join(" "));
  const ownId = run.teamA.units[0].id;
  const own = run.result.events.filter((event) => "sourceId" in event && event.sourceId === ownId);
  const expected = [
    own.reduce((sum, event) => sum + (event.type === "damage" ? event.healthDamage : 0), 0),
    own.reduce((sum, event) => sum + (event.type === "damage" ? event.shieldDamage : 0), 0),
    own.reduce((sum, event) => sum + (event.type === "heal" ? event.amount : 0), 0),
    own.reduce((sum, event) => sum + (event.type === "shield" ? event.amount : 0), 0),
  ];
  expect(expected[0]).toBeGreaterThan(0);
  await page.goto("/");
  await page.getByRole("button", { name: /CREW TOOLS/ }).click();
  await page.getByRole("button", { name: "TEAM PLANNER", exact: true }).click();
  await page.getByLabel("Import plan", { exact: true }).setInputFiles({ name: "readability.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(plan)) });
  await page.getByRole("button", { name: "RUN COMBAT TEST", exact: true }).click();
  const meter = page.locator(".combat-report");
  await expect(meter).toHaveAttribute("data-complete", "false");
  await meter.locator("summary").click();
  const row = meter.locator(`tr[data-fighter-id="${ownId}"]`);
  await expect(row).toContainText("Gear 4: Boundman");
  expect(Number(await row.locator("td").first().innerText())).toBeLessThan(expected[0]);
  await expect(meter).toHaveAttribute("data-complete", "true", { timeout: 30_000 });
  expect((await row.locator("td").allTextContents()).map(Number)).toEqual(expected);
  await expect(meter.locator("summary")).toContainText("FINAL");
  await meter.getByRole("button", { name: "Opponent", exact: true }).click();
  await expect(meter).toContainText("Robin — Demonio Fleur");
  await expect(meter.locator("tbody")).not.toContainText("Luffy — Gear 4: Boundman");
  await page.screenshot({ path: testInfo.outputPath("contributions.png") });
  await page.getByRole("button", { name: "Replay combat test", exact: true }).click();
  await expect(meter).toHaveAttribute("data-complete", "false");
  await meter.locator("summary").click();
  await expect(meter).toHaveAttribute("data-complete", "true", { timeout: 30_000 });
  expect((await row.locator("td").allTextContents()).map(Number)).toEqual(expected);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("viewed combat changes clear prior contributions and live economy does not restart playback", async ({ page }) => {
  await openFreshVoyage(page);
  await page.locator("button.shop-card:not([disabled])").first().click();
  await page.getByRole("button", { name: "DEPLOY", exact: true }).click();
  await page.getByRole("button", { name: /START BATTLE/i }).click();
  const meter = page.locator(".combat-report");
  await meter.locator("summary").click();
  await expect(meter.locator("tbody")).toContainText(/.+/);
  const initialId = await meter.locator("tbody tr").first().getAttribute("data-fighter-id");
  await page.getByRole("button", { name: /^Watch Rival 1's battle,/ }).click();
  await expect(meter.locator(`tr[data-fighter-id="${initialId}"]`)).toHaveCount(0);
  await expect(meter.locator("tbody tr").first()).toHaveAttribute("data-fighter-id", /^bot-1:/);
  const before = Number(await meter.getAttribute("data-elapsed-ms"));
  await page.getByRole("button", { name: /REROLL/i }).click();
  expect(Number(await meter.getAttribute("data-elapsed-ms"))).toBeGreaterThanOrEqual(before);
  await page.getByRole("combobox", { name: "Battle animation speed", exact: true }).selectOption("0.5");
  await expect(meter).toHaveAttribute("data-complete", "false");
  await expect(page.locator(".phaser-stage-frame")).toHaveAttribute("data-phase", "battle");
});

test("local tracks, independent controls, mute and persisted legacy settings work after interaction", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("grand-line-auto-chess.settings.v1", JSON.stringify({ volume: 0.6, muted: false }));
    const RealAudio = window.Audio;
    const captures: HTMLAudioElement[] = [];
    Object.assign(window, { b03Audio: captures });
    window.Audio = class extends RealAudio { constructor(src?: string) { super(src); captures.push(this); } };
  });
  const currentTrack = () => page.evaluate(() => {
    const captures = (window as Window & { b03Audio?: HTMLAudioElement[] }).b03Audio ?? [];
    const current = captures.findLast((audio) => audio.src.endsWith(".wav"));
    return current ? { src: current.src, volume: current.volume, paused: current.paused, readyState: current.readyState, loop: current.loop } : null;
  });
  await page.goto("/");
  await expect.poll(async () => (await currentTrack())?.paused).toBe(true);
  await page.getByRole("button", { name: /SETTINGS/ }).click();
  await expect(page.getByRole("slider", { name: /Master volume/ })).toHaveValue("0.6");
  await expect.poll(async () => (await currentTrack())?.paused).toBe(false);
  await expect.poll(async () => (await currentTrack())?.readyState ?? 0).toBeGreaterThanOrEqual(2);
  await page.getByRole("slider", { name: /Music volume/ }).fill("0.2");
  await page.getByRole("slider", { name: /Effects volume/ }).fill("0.7");
  await expect.poll(async () => (await currentTrack())?.volume).toBeCloseTo(0.12, 3);
  await page.getByRole("combobox", { name: /Music track/ }).selectOption("pursuit");
  await expect.poll(async () => (await currentTrack())?.src ?? "").toContain("/assets/audio/pursuit.wav");
  await expect.poll(async () => (await currentTrack())?.paused).toBe(false);
  const mute = page.getByRole("checkbox", { name: /Mute all sound/ });
  await mute.focus(); await page.keyboard.press("Space");
  await expect(mute).toBeChecked();
  await expect.poll(async () => (await currentTrack())?.paused).toBe(true);
  await mute.focus(); await page.keyboard.press("Space");
  await expect(mute).not.toBeChecked();
  await expect.poll(async () => (await currentTrack())?.paused).toBe(false);
  expect((await currentTrack())?.loop).toBe(true);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("grand-line-auto-chess.settings.v1") ?? "{}") as { musicTrack?: string })).toMatchObject({ musicTrack: "pursuit", musicVolume: 0.2, effectsVolume: 0.7 });
});
