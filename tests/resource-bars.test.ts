import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_UNIT_ANIMATION_DEFINITIONS,
  type CrewAnimationDefinition,
} from "../components/crewAnimationManifest";
import {
  RESOURCE_BAR_COLORS,
  RESOURCE_BAR_GEOMETRY,
  resourceBarFill,
  resourceHealthAfterSet,
  resourceHealthAfterTransform,
  resourceBarLayout,
} from "../components/unitResourceBar";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("combat resource bars", () => {
  it("only shows resource bars for active board units during battle", () => {
    const input = {
      spriteY: 12,
      frameHeight: 128,
      displaySize: 88,
      originY: 116 / 128,
      idleVisualTopPx: 42,
    };

    expect(
      resourceBarLayout({ ...input, phase: "battle", zone: "board" }).visible,
    ).toBe(true);
    expect(
      resourceBarLayout({ ...input, phase: "preparation", zone: "board" })
        .visible,
    ).toBe(false);
    expect(
      resourceBarLayout({ ...input, phase: "battle", zone: "bench" }).visible,
    ).toBe(false);
  });

  it("anchors the complete stack above the visible idle sprite", () => {
    const layout = resourceBarLayout({
      phase: "battle",
      zone: "board",
      spriteY: 12,
      frameHeight: 128,
      displaySize: 88,
      originY: 116 / 128,
      idleVisualTopPx: 42,
    });

    const stackBottom =
      layout.energyY + RESOURCE_BAR_GEOMETRY.energyOuterHeight / 2;
    expect(layout.visualTopY - stackBottom).toBe(
      RESOURCE_BAR_GEOMETRY.spriteGap,
    );
    expect(layout.statusY).toBeLessThan(layout.healthY);
  });

  it("uses a safe top-quarter fallback for irregular atlas metadata", () => {
    for (const idleVisualTopPx of [145, -1, Number.NaN, undefined]) {
      const layout = resourceBarLayout({
        phase: "battle",
        zone: "board",
        spriteY: 8,
        frameHeight: 128,
        displaySize: 60,
        originY: 116 / 128,
        idleVisualTopPx,
      });
      expect(layout.idleVisualTopPx).toBe(32);
      expect(layout.healthY).toBeLessThan(layout.visualTopY);
    }
  });

  it("uses team colors and appends shield inside one bounded strip", () => {
    const player = resourceBarFill({
      hp: 1_000,
      maxHp: 1_000,
      shield: 500,
      energy: 0,
      team: "player",
    });
    const enemy = resourceBarFill({
      hp: 500,
      maxHp: 1_000,
      shield: 2_000,
      energy: 0,
      team: "enemy",
    });

    expect(player.healthColor).toBe(RESOURCE_BAR_COLORS.playerHealth);
    expect(enemy.healthColor).toBe(RESOURCE_BAR_COLORS.enemyHealth);
    expect(player.healthWidth).toBeGreaterThan(0);
    expect(player.shieldWidth).toBeGreaterThan(0);
    expect(player.healthWidth + player.shieldWidth).toBeCloseTo(
      RESOURCE_BAR_GEOMETRY.width,
    );
    expect(enemy.healthWidth + enemy.shieldWidth).toBeLessThanOrEqual(
      RESOURCE_BAR_GEOMETRY.width,
    );
  });

  it("clamps overheal, highlights full energy, and emits stable segments", () => {
    const fill = resourceBarFill({
      hp: 1_500,
      maxHp: 1_000,
      shield: 0,
      energy: 140,
      team: "player",
    });

    expect(fill.hp).toBe(1_000);
    expect(fill.healthWidth).toBe(RESOURCE_BAR_GEOMETRY.width);
    expect(fill.energy).toBe(100);
    expect(fill.energyWidth).toBe(RESOURCE_BAR_GEOMETRY.width);
    expect(fill.energyColor).toBe(RESOURCE_BAR_COLORS.energyReady);
    expect(fill.segmentXs).toHaveLength(
      RESOURCE_BAR_GEOMETRY.segmentCount - 1,
    );
    expect(fill.segmentXs).toEqual([...fill.segmentXs].sort((a, b) => a - b));
  });

  it("changes the playback HP pool at transform and uses it for later damage and final HP", () => {
    const initial = { current: 550, max: 650 };
    const transformed = resourceHealthAfterTransform(700, 800);
    const damaged = resourceHealthAfterSet(
      transformed,
      transformed.current - 100,
    );
    const reconciled = resourceHealthAfterSet(damaged, 750);

    expect(initial).toEqual({ current: 550, max: 650 });
    expect(transformed).toEqual({ current: 700, max: 800 });
    expect(damaged).toEqual({ current: 600, max: 800 });
    expect(reconciled).toEqual({ current: 750, max: 800 });
  });

  it("keeps every v2 runtime anchor synchronized with generated metadata", async () => {
    const definitions = ALL_UNIT_ANIMATION_DEFINITIONS.filter(
      (definition) => definition.version === "v2",
    );
    expect(definitions).toHaveLength(23);

    for (const definition of definitions) {
      const metadata = JSON.parse(
        await readFile(
          path.join(
            projectRoot,
            "public",
            definition.sheetPath.replace(/^\/assets\//, "assets/"),
          ).replace(/\.png$/, ".json"),
          "utf8",
        ),
      ) as { frame: { idleVisualTopPx?: number } };
      expectValidIdleTop(definition);
      expect(metadata.frame.idleVisualTopPx).toBe(
        definition.idleVisualTopPx,
      );
    }
  });
});

function expectValidIdleTop(definition: CrewAnimationDefinition) {
  expect(definition.idleVisualTopPx).toBeGreaterThanOrEqual(0);
  expect(definition.idleVisualTopPx).toBeLessThan(
    (definition.originY ?? 0.5) * definition.frameHeight,
  );
}
