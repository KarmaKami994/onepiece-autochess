import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "../game/content";
import { animationCandidates, resolveInitialBoardAssets, resolveMissingAnimationDefinitions } from "../components/boardAssets";
import { crewSheetKey, getCrewAnimationDefinitions, LUFFY_V2_ANIMATION } from "../components/crewAnimationManifest";
import { itemVisual } from "../components/gameVisualManifest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => readFile(path.join(root, file));
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const pilots = ["koala", "kaido", "robin-demonio-fleur"];
type Frame = { state: string; poseId: string; sourceRect: { x: number; y: number; width: number; height: number }; sourcePivot: { x: number; y: number } };
type AuthoredSource = { pilotFor?: string; source: { localPath: string; sha256: string; frameMap: string; frameMapSha256: string; strategy: string } };

describe("B10 frozen art and presentation", () => {
  it("pins the three local body sources and semantic maps without adding content definitions", async () => {
    const matrix = JSON.parse((await read("art/animation-v2/source-matrix.json")).toString()) as { entries: AuthoredSource[] };
    const entries = matrix.entries.filter((entry) => entry.pilotFor);
    expect(entries.map((entry) => entry.pilotFor).sort()).toEqual([...pilots].sort());
    for (const entry of entries) {
      expect(entry.source.strategy).toBe("authored-frame-map");
      expect(sha(await read(entry.source.localPath))).toBe(entry.source.sha256);
      expect(sha(await read(entry.source.frameMap))).toBe(entry.source.frameMapSha256);
      expect(DEFAULT_CONTENT.units.some((unit) => unit.id === `${entry.pilotFor}-b10`)).toBe(false);
      expect(DEFAULT_CONTENT.enemies.some((unit) => unit.id === `${entry.pilotFor}-b10`)).toBe(false);
    }
    expect(DEFAULT_CONTENT.units).toHaveLength(34);
    expect(DEFAULT_CONTENT.forms).toHaveLength(4);
    expect(LUFFY_V2_ANIMATION.originX).toBe(40 / 128);
  });

  it("keeps six clips, hard alpha, meaningful distinct source drawings and the original runtime contract", async () => {
    const minimum: Record<string, number> = { idle: 3, move: 6, attack: 5, cast: 6, hit: 2, defeat: 5 };
    for (const id of pilots) {
      const directory = `art/production/b10/${id}`;
      const body = await read(`${directory}/body-poses.png`);
      const mapping = JSON.parse((await read(`${directory}/frame-map.json`)).toString()) as { frames: Frame[] };
      expect(mapping.frames).toHaveLength(46);
      const raw = await sharp(body).ensureAlpha().raw().toBuffer();
      const alpha = new Set(Array.from({ length: raw.length / 4 }, (_, index) => raw[index * 4 + 3]));
      expect([...alpha].sort((a, b) => a - b)).toEqual([0, 255]);
      for (const [state, count] of Object.entries(minimum)) {
        const frames = mapping.frames.filter((frame) => frame.state === state);
        const poseHashes = new Set<string>();
        for (const frame of frames) {
          expect(frame.sourcePivot).toEqual({ x: frame.sourceRect.x + 64, y: frame.sourceRect.y + 116 });
          // Materialize the cell first: Sharp executes trim before extract in a
          // single pipeline, which would apply board coordinates to a trimmed image.
          const cell = await sharp(body).extract({ left: frame.sourceRect.x, top: frame.sourceRect.y, width: 128, height: 128 }).png().toBuffer();
          const trimmed = await sharp(cell).trim().raw().toBuffer();
          poseHashes.add(sha(trimmed));
        }
        // This catches held/translated copies; human clip review still decides
        // anatomy, identity and choreography, which hashes cannot establish.
        expect(poseHashes.size, `${id}/${state}`).toBeGreaterThanOrEqual(count);
      }
      const atlas = await read(`public/assets/animations/${id}-b10-v2/${id}-b10-v2.png`);
      expect(atlas.byteLength).toBeLessThanOrEqual(512 * 1024);
      expect(await sharp(atlas).metadata()).toMatchObject({ width: 1024, height: 768 });
      const metadata = JSON.parse((await read(`public/assets/animations/${id}-b10-v2/${id}-b10-v2.json`)).toString());
      expect(metadata).toMatchObject({ pipeline: "authored-frame-map-v1", frameCount: 46, frame: { destinationPivot: { x: 64, y: 116 } } });
      expect(Object.values(metadata.clips)).toEqual([
        { start: 0, end: 5, frameRate: 8, repeat: -1 }, { start: 6, end: 13, frameRate: 16, repeat: 0 },
        { start: 14, end: 21, frameRate: 14, repeat: 0 }, { start: 22, end: 33, frameRate: 12, repeat: 0 },
        { start: 34, end: 37, frameRate: 12, repeat: 0 }, { start: 38, end: 45, frameRate: 10, repeat: 0 },
      ]);
    }
  });

  it("selects the body only for Robin's form, keeps the old bodies and loads only visible identities", () => {
    const base = getCrewAnimationDefinitions("robin");
    const form = getCrewAnimationDefinitions("robin", "robin-demonio-fleur");
    expect(form.slice(0, -1)).toEqual(base);
    expect(form.at(-1)).toMatchObject({ contentId: "robin", formId: "robin-demonio-fleur", assetKey: "robin-demonio-fleur-b10-v2" });
    expect(getCrewAnimationDefinitions("zoro", "robin-demonio-fleur")).toEqual(getCrewAnimationDefinitions("zoro"));
    expect(getCrewAnimationDefinitions("robin", "unknown")).toEqual(base);
    expect(animationCandidates("koala").map((definition) => definition.assetKey)).toEqual(["koala-b10-v2", "koala-v2"]);
    expect(animationCandidates("kaido").map((definition) => definition.assetKey)).toEqual(["kaido-b10-v2", "kaido-v2"]);
    const visible = [{ contentId: "robin" }, { contentId: "robin", formId: "robin-demonio-fleur" }, { contentId: "robin", formId: "robin-demonio-fleur" }];
    expect(resolveInitialBoardAssets(visible, "marine-harbor").animations.map((definition) => definition.assetKey).sort()).toEqual(["robin-b11-v2", "robin-demonio-fleur-b10-v2"]);
  });

  it("requests a visible form even with a cached base, and falls back after the form fails", () => {
    const units = [{ contentId: "robin", formId: "robin-demonio-fleur" }];
    const formKey = crewSheetKey("robin-demonio-fleur-b10-v2");
    const status = { textureExists: (key: string) => key === crewSheetKey("robin-b11-v2"), requestedKeys: new Set<string>(), failedKeys: new Set<string>() };
    expect(resolveMissingAnimationDefinitions(units, status).map((definition) => definition.assetKey)).toEqual(["robin-demonio-fleur-b10-v2"]);
    expect(resolveMissingAnimationDefinitions(units, { ...status, requestedKeys: new Set([formKey]), failedKeys: new Set([formKey]) })).toEqual([]);
    expect(resolveMissingAnimationDefinitions(units, { ...status, textureExists: () => false, requestedKeys: new Set([formKey]), failedKeys: new Set([formKey]) }).map((definition) => definition.assetKey)).toEqual(["robin-b11-v2"]);
  });

  it("keeps the three icon IDs, glyph fallbacks, standalone SVG budget and frozen output hashes", async () => {
    for (const id of ["sea-prism-shard", "black-blade", "emperors-jolly-roger"]) {
      expect(itemVisual(id, "?")).toMatchObject({ imagePath: `/assets/items/${id}.svg`, fallbackGlyph: "?" });
      const svg = (await read(`public/assets/items/${id}.svg`)).toString();
      expect(svg).toContain('width="96" height="96" viewBox="0 0 48 48"');
      expect(svg).toContain('shape-rendering="crispEdges"');
      expect(svg.length).toBeLessThanOrEqual(12 * 1024);
      expect(svg).not.toMatch(/<image|data:|https?:\/\/(?!www\.w3\.org)/);
    }
    const frozen = JSON.parse((await read("art/production/b10/outputs.json")).toString()) as { outputs: { path: string; sha256: string }[] };
    for (const output of frozen.outputs) expect(sha(await read(output.path)), output.path).toBe(output.sha256);
  });
});
