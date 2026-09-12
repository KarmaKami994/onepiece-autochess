import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
} from "../game";
import {
  CREW_ANIMATION_MANIFEST,
  CREW_V2_ANIMATIONS,
  PVE_ANIMATION_MANIFEST,
  getCrewAnimationDefinition,
  getCrewAnimationDefinitions,
  resolveAnimationCandidates,
} from "../components/crewAnimationManifest";
import {
  FORM_VISUALS,
  STATUS_VISUALS,
  TRAIT_VISUALS,
  formVisualDefinition,
  itemVisual,
  traitVisual,
} from "../components/gameVisualManifest";
import {
  resolveInitialBoardAssets,
  resolveMissingAnimationDefinitions,
} from "../components/boardAssets";

const projectRoot = path.resolve(import.meta.dirname, "..");
const newCrewIds = [
  "koby",
  "koala",
  "franky",
  "brook",
  "ivankov",
  "jinbe",
  "kuma",
  "kizaru",
  "kuzan",
  "akainu",
  "shanks",
  "blackbeard",
  "killer",
  "buggy",
  "capone-bege",
  "whitebeard",
] as const;
const existingCrewIds = [
  "luffy",
  "zoro",
  "nami",
  "usopp",
  "chopper",
  "tashigi",
  "sanji",
  "robin",
  "smoker",
  "sabo",
  "kid",
  "crocodile",
  "law",
  "ace",
  "hancock",
  "doflamingo",
  "garp",
  "mihawk",
] as const;
const pveIds = [
  "marine-recruit",
  "rifle-marine",
  "pirate-raider",
  "sea-king",
  "pacifista",
  "vice-admiral",
  "cipher-pol-agent",
  "seraphim",
] as const;
const forbiddenSvgContent = [
  "<script",
  "javascript:",
  "http://",
  "https://",
  "data:image",
  "foreignobject",
] as const;

async function expectFile(relativePath: string): Promise<void> {
  expect((await stat(path.join(projectRoot, relativePath))).size).toBeGreaterThan(0);
}

describe("P7 major asset production", () => {
  it("completes real static and preferred v2 presentation for all crew", async () => {
    expect(DEFAULT_CONTENT.version).toBe("1.29.0");
    expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
    expect(DEFAULT_CONTENT.units).toHaveLength(34);
    expect(DEFAULT_CONTENT.units.some((unit) =>
      unit.assetPath.endsWith("/placeholder.svg"),
    )).toBe(false);

    for (const unit of DEFAULT_CONTENT.units) {
      expect(unit.assetPath).toBe(`/assets/characters/${unit.id}.png`);
      await expectFile(`public/assets/characters/${unit.id}.png`);
      await expectFile(`public/assets/portraits/${unit.id}.png`);
      await expectFile(`public/assets/tokens/${unit.id}.png`);
      expect(getCrewAnimationDefinition(unit.id)).toMatchObject({
        contentId: unit.id,
        version: "v2",
        frameCount: 46,
      });
    }

    for (const id of existingCrewIds) {
      expect(getCrewAnimationDefinitions(id).at(-1)?.version).toBe("v2");
    }
    for (const id of newCrewIds) {
      expect(CREW_ANIMATION_MANIFEST).not.toHaveProperty(id);
      expect(getCrewAnimationDefinitions(id).map((entry) => entry.version))
        .toEqual(["v2"]);
    }
  });

  it("supports v2-only candidates, legacy fallback, and visible-only loading", () => {
    expect(resolveAnimationCandidates(
      undefined,
      [CREW_V2_ANIMATIONS.koby],
    )).toEqual([CREW_V2_ANIMATIONS.koby]);
    expect(getCrewAnimationDefinitions("nami").map((entry) => entry.version))
      .toEqual(["v1", "v2"]);

    const initial = resolveInitialBoardAssets(
      [{ contentId: "koby" }, { contentId: "nami" }, { contentId: "koby" }],
      "pirate-ship",
    );
    expect(initial.animations.map((entry) => entry.contentId)).toEqual([
      "koby",
      "nami",
    ]);
    expect(resolveMissingAnimationDefinitions(
      [{ contentId: "koby" }],
      {
        textureExists: () => false,
        requestedKeys: new Set(),
        failedKeys: new Set(),
      },
    )).toEqual([CREW_V2_ANIMATIONS.koby]);
  });

  it("completes real static and v2 presentation for all eight PvE identities", async () => {
    expect(DEFAULT_CONTENT.enemies.map((enemy) => enemy.id)).toEqual(pveIds);
    for (const enemy of DEFAULT_CONTENT.enemies) {
      expect(enemy.assetPath).toBe(`/assets/enemies/${enemy.id}.png`);
      await expectFile(`public/assets/enemies/${enemy.id}.png`);
      await expectFile(`public/assets/portraits/${enemy.id}.png`);
      await expectFile(`public/assets/tokens/${enemy.id}.png`);
      expect(PVE_ANIMATION_MANIFEST[enemy.id as keyof typeof PVE_ANIMATION_MANIFEST])
        .toMatchObject({ contentId: enemy.id, version: "v2", frameCount: 46 });
    }
  });

  it("preserves all gameplay content while changing presentation metadata only", () => {
    const normalized = JSON.stringify(DEFAULT_CONTENT, (key, value) =>
      ["version", "assetPath", "presentation"].includes(key)
        ? undefined
        : value,
    );
    expect(createHash("sha256").update(normalized).digest("hex"))
      .toBe("6c29a90d0dae4868a8cac709ed09936e2bb10cb9a18297d7c21dccd58ae11dd9");
  });

  it("maps all 65 item identities and preserves recipes and glyph fallback", async () => {
    expect(DEFAULT_CONTENT.items).toHaveLength(65);
    expect(DEFAULT_CONTENT.items.filter((item) => item.kind === "component"))
      .toHaveLength(10);
    expect(DEFAULT_CONTENT.items.filter((item) => item.kind === "completed"))
      .toHaveLength(55);
    expect(Object.keys(DEFAULT_CONTENT.itemRecipes)).toHaveLength(55);
    expect(DEFAULT_CONTENT.items.filter((item) => item.grantedTraitId))
      .toHaveLength(10);

    const runtimeIds = (await readdir(path.join(projectRoot, "public/assets/items")))
      .filter((name) => name.endsWith(".svg"))
      .map((name) => name.slice(0, -4))
      .sort();
    expect(runtimeIds).toEqual(DEFAULT_CONTENT.items.map((item) => item.id).sort());
    for (const item of DEFAULT_CONTENT.items) {
      expect(item.icon.length).toBeGreaterThan(0);
      expect(itemVisual(item.id, item.icon)).toMatchObject({
        imagePath: `/assets/items/${item.id}.svg`,
        fallbackGlyph: item.icon,
      });
    }
    expect(itemVisual("synthetic-missing", "?")).toMatchObject({
      imagePath: "",
      fallbackGlyph: "?",
    });
  });

  it("maps all traits, statuses, and forms with explicit safe fallbacks", async () => {
    expect(DEFAULT_CONTENT.traits).toHaveLength(13);
    expect(Object.keys(TRAIT_VISUALS).sort()).toEqual(
      DEFAULT_CONTENT.traits.map((trait) => trait.id).sort(),
    );
    expect(TRAIT_VISUALS.emperor.imagePath).toBe("/assets/traits/emperor.svg");
    expect(traitVisual("synthetic-trait")).toMatchObject({
      imagePath: "",
      fallbackGlyph: "◆",
    });
    expect(Object.keys(STATUS_VISUALS)).toHaveLength(8);
    expect(Object.keys(FORM_VISUALS)).toHaveLength(4);
    for (const form of DEFAULT_CONTENT.forms) {
      const visual = formVisualDefinition(form.id);
      expect(form.presentation).toMatchObject({
        portrait: visual?.portrait,
        token: visual?.token,
      });
      await expectFile(`public/${visual?.portrait.slice(1) ?? "missing"}`);
      await expectFile(`public/${visual?.token.slice(1) ?? "missing"}`);
      await expectFile(`public/${visual?.overlay.slice(1) ?? "missing"}`);
    }
    expect(formVisualDefinition("synthetic-form")).toBeNull();
  });

  it("keeps every generated P7 SVG local, compact, and parser-compatible", async () => {
    const directories = ["items", "traits", "status"];
    const formIds = DEFAULT_CONTENT.forms.map((form) => form.id);
    const files = (
      await Promise.all(directories.map(async (directory) =>
        (await readdir(path.join(projectRoot, "public/assets", directory)))
          .filter((name) => name.endsWith(".svg"))
          .map((name) => `public/assets/${directory}/${name}`),
      ))
    ).flat().concat(formIds.flatMap((id) => [
      `public/assets/forms/${id}/portrait.svg`,
      `public/assets/forms/${id}/token.svg`,
      `public/assets/forms/${id}/overlay.svg`,
    ]));

    expect(files).toHaveLength(65 + 13 + 8 + 12);
    for (const file of files) {
      const source = await readFile(path.join(projectRoot, file), "utf8");
      const lower = source.toLowerCase();
      expect(source.length, `${file} exceeds the compact-icon budget`)
        .toBeLessThanOrEqual(12 * 1024);
      expect(lower, `${file} is not an SVG document`).toMatch(/^<svg\b/);
      expect(lower, `${file} requires the SVG image namespace`).toContain(
        'xmlns="http://www.w3.org/2000/svg"',
      );
      expect(lower, `${file} requires a square viewBox`).toMatch(
        /viewbox="0 0 (\d+) \1"/,
      );
      const externalContent = lower.replace(
        'xmlns="http://www.w3.org/2000/svg"',
        "",
      );
      for (const forbidden of forbiddenSvgContent) {
        expect(externalContent, `${file} contains ${forbidden}`).not.toContain(
          forbidden,
        );
      }
    }
  });
});
