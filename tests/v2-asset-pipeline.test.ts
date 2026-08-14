import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  CREW_V2_ANIMATIONS,
  PVE_ANIMATION_MANIFEST,
  getCrewAnimationDefinitions,
} from "../components/crewAnimationManifest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const matrixPath = path.join(
  projectRoot,
  "art",
  "animation-v2",
  "source-matrix.json",
);
const crewIds = [
  "ace",
  "chopper",
  "crocodile",
  "doflamingo",
  "garp",
  "hancock",
  "kid",
  "law",
  "mihawk",
  "nami",
  "robin",
  "sabo",
  "sanji",
  "smoker",
  "tashigi",
  "usopp",
  "zoro",
];
const pveIds = [
  "marine-recruit",
  "pacifista",
  "pirate-raider",
  "rifle-marine",
  "sea-king",
];

type SourceEntry = {
  id: string;
  kind: "crew" | "pve";
  outputAssetKey: string;
  fallbackAssetKey: string;
  source: {
    strategy: "auto-frame-map" | "licensed-frame-map" | "procedural-cutout";
    localPath: string;
    sha256: string | null;
    dimensions?: { width: number; height: number };
    gameUrl: string | null;
    sheetUrl: string | null;
    contributor: string | null;
    contributorBasis?: string;
    frameMap: string | null;
    derivedFrameMap?: string;
    referenceCandidate?: { usedInRuntime: boolean } | null;
  };
  pivot: { x: number; y: number };
  processing: string[];
  permission: { status: string; note: string };
};

type RuntimeMetadata = {
  schemaVersion: number;
  pipeline: string;
  sourceSha256: string;
  sourcePage?: string;
  contributor?: string;
  sourceDimensions: { width: number; height: number };
  permission: { status: string; note: string };
  detection?: { characterCandidateCount: number };
  frameCount: number;
  frame: { destinationPivot: { x: number; y: number } };
  clips: Record<string, { start: number; end: number }>;
  frames: Array<{
    index: number;
    state: string;
    sourceRect?: { x: number; y: number; width: number; height: number };
  }>;
};

async function sourceMatrix() {
  return JSON.parse(await readFile(matrixPath, "utf8")) as {
    schemaVersion: number;
    standard: {
      frameWidth: number;
      frameHeight: number;
      frameCount: number;
      columns: number;
      atlasWidth: number;
      atlasHeight: number;
      pivot: { x: number; y: number };
      clips: Record<string, { start: number; end: number }>;
      missingSourcePolicy: string;
    };
    entries: SourceEntry[];
  };
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readRuntimeMetadata(entry: SourceEntry) {
  return JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "public",
        "assets",
        "animations",
        entry.outputAssetKey,
        `${entry.outputAssetKey}.json`,
      ),
      "utf8",
    ),
  ) as RuntimeMetadata;
}

async function expectRuntimeBundle(entry: SourceEntry) {
  const outputRoot = path.join(
    projectRoot,
    "public",
    "assets",
    "animations",
    entry.outputAssetKey,
  );
  const sheet = await readFile(
    path.join(outputRoot, `${entry.outputAssetKey}.png`),
  );
  expect([...sheet.subarray(0, 8)]).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
  expect(sheet.readUInt32BE(16)).toBe(1024);
  expect(sheet.readUInt32BE(20)).toBe(768);
  const atlas = await sharp(sheet)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparentFrameBorders = true;
  for (let frame = 0; frame < 46; frame += 1) {
    const frameX = (frame % 8) * 128;
    const frameY = Math.floor(frame / 8) * 128;
    const alphaAt = (x: number, y: number) =>
      atlas.data[(y * atlas.info.width + x) * atlas.info.channels + 3];
    for (let pixel = 0; pixel < 128; pixel += 1) {
      transparentFrameBorders &&=
        alphaAt(frameX + pixel, frameY) === 0 &&
        alphaAt(frameX + pixel, frameY + 127) === 0 &&
        alphaAt(frameX, frameY + pixel) === 0 &&
        alphaAt(frameX + 127, frameY + pixel) === 0;
    }
  }
  expect(transparentFrameBorders).toBe(true);

  const editable = await stat(
    path.join(
      projectRoot,
      "art",
      "libresprite",
      `${entry.outputAssetKey}.aseprite`,
    ),
  );
  expect(editable.size).toBeGreaterThan(10_000);
  return readRuntimeMetadata(entry);
}

const expectedFrameStates = [
  ...Array<string>(6).fill("idle"),
  ...Array<string>(8).fill("move"),
  ...Array<string>(8).fill("attack"),
  ...Array<string>(12).fill("cast"),
  ...Array<string>(4).fill("hit"),
  ...Array<string>(8).fill("defeat"),
];

describe("animation v2 asset pipeline", () => {
  it("documents 17 confirmed crew imports and five project-owned PvE sources", async () => {
    const matrix = await sourceMatrix();
    expect(matrix.schemaVersion).toBe(1);
    expect(matrix.standard).toMatchObject({
      frameWidth: 128,
      frameHeight: 128,
      frameCount: 46,
      columns: 8,
      atlasWidth: 1024,
      atlasHeight: 768,
      pivot: { x: 64, y: 116 },
    });
    expect(matrix.standard.missingSourcePolicy).toContain("v1");

    const crew = matrix.entries.filter((entry) => entry.kind === "crew");
    const pve = matrix.entries.filter((entry) => entry.kind === "pve");
    expect(crew.map((entry) => entry.id).sort()).toEqual(crewIds);
    expect(pve.map((entry) => entry.id).sort()).toEqual(pveIds);

    for (const entry of matrix.entries) {
      expect(entry.pivot).toEqual({ x: 64, y: 116 });
      expect(entry.processing.length).toBeGreaterThan(2);
      expect(entry.permission.note.length).toBeGreaterThan(40);
      expect(entry.source.localPath).not.toMatch(/^https?:/);
      if (entry.source.sheetUrl) {
        expect(entry.source.sheetUrl).toMatch(
          /^https:\/\/spritedatabase\.net\/file\/\d+$/,
        );
      }
    }

    for (const entry of crew) {
      expect(entry.permission.status).toBe("confirmed");
      expect(entry.permission.note).toContain("Project-owner attestation");
      expect(entry.source.strategy).toBe("auto-frame-map");
      expect(entry.source.frameMap).toBe("auto:connected-components-v1");
      expect(entry.source.contributor).toBeTruthy();
      expect(entry.source.contributorBasis).toContain("file page read");
      expect(entry.source.derivedFrameMap).toBe(
        `public/assets/animations/${entry.outputAssetKey}/${entry.outputAssetKey}.json#frames`,
      );
      const source = await readFile(path.join(projectRoot, entry.source.localPath));
      expect(sha256(source)).toBe(entry.source.sha256);
      expect(getCrewAnimationDefinitions(entry.id).at(-1)).toMatchObject({
        assetKey: entry.outputAssetKey,
        kind: "crew",
        version: "v2",
      });
    }
  });

  it("builds every crew atlas from its SHA-pinned sheet without extreme source rectangles", async () => {
    const matrix = await sourceMatrix();
    for (const entry of matrix.entries.filter(
      (candidate) => candidate.kind === "crew",
    )) {
      const metadata = await expectRuntimeBundle(entry);
      expect(metadata).toMatchObject({
        schemaVersion: 2,
        pipeline: "auto-connected-components-v1",
        sourceSha256: entry.source.sha256,
        sourcePage: entry.source.sheetUrl,
        contributor: entry.source.contributor,
        permission: { status: "confirmed" },
        frameCount: 46,
        frame: { destinationPivot: { x: 64, y: 116 } },
      });
      expect(metadata.sourceDimensions).toEqual(entry.source.dimensions);
      expect(metadata.detection?.characterCandidateCount).toBeGreaterThanOrEqual(6);
      expect(metadata.frames.map((frame) => frame.index)).toEqual(
        Array.from({ length: 46 }, (_, index) => index),
      );
      expect(metadata.frames.map((frame) => frame.state)).toEqual(
        expectedFrameStates,
      );
      expect(Object.keys(metadata.clips).sort()).toEqual([
        "attack",
        "cast",
        "defeat",
        "hit",
        "idle",
        "move",
      ]);
      for (const frame of metadata.frames) {
        const rectangle = frame.sourceRect;
        expect(rectangle).toBeDefined();
        if (!rectangle) continue;
        expect(rectangle.width).toBeGreaterThan(0);
        expect(rectangle.height).toBeGreaterThan(0);
        expect(rectangle.width / rectangle.height).toBeLessThanOrEqual(2.5);
        expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(
          metadata.sourceDimensions.width,
        );
        expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(
          metadata.sourceDimensions.height,
        );
      }
    }
  });

  it("keeps all external PvE catalog candidates out of the runtime source path", async () => {
    const matrix = await sourceMatrix();
    for (const entry of matrix.entries.filter(
      (candidate) => candidate.kind === "pve",
    )) {
      expect(entry.permission.status).toBe("project-owned");
      expect(entry.source.strategy).toBe("procedural-cutout");
      expect(entry.source.localPath).toBe(`public/assets/enemies/${entry.id}.png`);
      if (entry.source.referenceCandidate) {
        expect(entry.source.referenceCandidate.usedInRuntime).toBe(false);
      }
      const bytes = await readFile(path.join(projectRoot, entry.source.localPath));
      expect(sha256(bytes)).toBe(entry.source.sha256);
    }
  });

  it("bundles every project-owned PvE v2 atlas, metadata file, and editable source", async () => {
    const matrix = await sourceMatrix();
    for (const entry of matrix.entries.filter(
      (candidate) => candidate.kind === "pve",
    )) {
      const metadata = await expectRuntimeBundle(entry);
      expect(metadata).toMatchObject({
        schemaVersion: 2,
        pipeline: "procedural-static-cutout-v1",
        sourceSha256: entry.source.sha256,
        frameCount: 46,
        frame: { destinationPivot: { x: 64, y: 116 } },
      });
      expect(metadata.frames.map((frame) => frame.index)).toEqual(
        Array.from({ length: 46 }, (_, index) => index),
      );
      expect(metadata.frames.map((frame) => frame.state)).toEqual(
        expectedFrameStates,
      );
    }
  });

  it("exposes all crew and PvE v2 atlases through the shared runtime manifest", () => {
    expect(Object.keys(CREW_V2_ANIMATIONS).sort()).toEqual(crewIds);
    expect(Object.keys(PVE_ANIMATION_MANIFEST).sort()).toEqual(pveIds);
    for (const contentId of crewIds) {
      const definitions = getCrewAnimationDefinitions(contentId);
      expect(definitions.map((definition) => definition.version)).toEqual([
        "v1",
        "v2",
      ]);
      expect(definitions.at(-1)).toMatchObject({
        contentId,
        assetKey: `${contentId}-v2`,
        kind: "crew",
        frameWidth: 128,
        frameHeight: 128,
        frameCount: 46,
        sheetColumns: 8,
        originX: 0.5,
        originY: 116 / 128,
      });
    }
    for (const [contentId, definition] of Object.entries(
      PVE_ANIMATION_MANIFEST,
    )) {
      expect(definition).toMatchObject({
        contentId,
        assetKey: `${contentId}-v2`,
        kind: "pve",
        version: "v2",
        frameWidth: 128,
        frameHeight: 128,
        frameCount: 46,
        sheetColumns: 8,
        originX: 0.5,
        originY: 116 / 128,
      });
      expect(getCrewAnimationDefinitions(contentId)).toEqual([definition]);
    }
  });

  it("records every generated v2 package and exact content hashes in provenance", async () => {
    const matrix = await sourceMatrix();
    const notes = await readFile(
      path.join(projectRoot, "ASSET_PROVENANCE.md"),
      "utf8",
    );
    expect(notes).toContain("source missing -> v1 fallback");
    expect(notes).toContain("art/animation-v2/source-matrix.json");
    expect(notes).toContain("scripts/assets/build_v2_animation.mjs");
    for (const entry of matrix.entries) {
      expect(notes).toContain(`\`${entry.outputAssetKey}\``);
      expect(notes).toContain(
        `art/libresprite/${entry.outputAssetKey}.aseprite`,
      );
      expect(notes).toContain(entry.source.sha256);
      const atlas = await readFile(
        path.join(
          projectRoot,
          "public",
          "assets",
          "animations",
          entry.outputAssetKey,
          `${entry.outputAssetKey}.png`,
        ),
      );
      expect(notes).toContain(sha256(atlas));
    }
  });
});
