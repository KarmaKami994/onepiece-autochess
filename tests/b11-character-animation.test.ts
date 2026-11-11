import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT } from "../game/content";
import { crewReference } from "../app/crewReference";
import { animationCandidates, resolveInitialBoardAssets, resolveMissingAnimationDefinitions } from "../components/boardAssets";
import { B11_ANIMATION_MANIFEST, FORM_ANIMATION_MANIFEST, crewSheetKey, getCrewAnimationDefinitions, type CrewAnimationState } from "../components/crewAnimationManifest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => readFile(path.join(root, file));
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
type Rect = { x: number; y: number; width: number; height: number };
type Frame = { state: CrewAnimationState; sourceRect: Rect; sourcePivot: { x: number; y: number } };
type Entry = { productionFor?: string; outputAssetKey: string; source: { localPath: string; sha256: string; frameMap: string; frameMapSha256: string } };
type Selection = { sourceType: string; preservedStates: string[]; supplementalStates: string[] | null; selections: Record<CrewAnimationState, { sourceRect?: Rect; candidate?: number }[]> };

function trimmedCellHash(pixels: Buffer, width: number, rect: Rect): string {
  let left = 128, top = 128, right = -1, bottom = -1;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    if (!pixels[((rect.y + y) * width + rect.x + x) * 4 + 3]) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  expect(right).toBeGreaterThanOrEqual(left);
  const digest = createHash("sha256").update(`${right - left + 1},${bottom - top + 1}:`);
  for (let y = top; y <= bottom; y++) {
    const start = ((rect.y + y) * width + rect.x + left) * 4;
    digest.update(pixels.subarray(start, start + (right - left + 1) * 4));
  }
  return digest.digest("hex");
}

describe("B11 complete character/form/PvE presentation", () => {
  it("covers all 34 crew, four own form bodies and 29 PvE definitions without introducing gameplay identities", () => {
    expect(DEFAULT_CONTENT.version).toBe("1.34.0");
    expect(DEFAULT_CONTENT.units).toHaveLength(34);
    expect(DEFAULT_CONTENT.enemies).toHaveLength(29);
    expect(DEFAULT_CONTENT.forms).toHaveLength(4);
    expect(Object.keys(B11_ANIMATION_MANIFEST)).toHaveLength(60);
    const preferred = [...DEFAULT_CONTENT.units, ...DEFAULT_CONTENT.enemies].map(unit => getCrewAnimationDefinitions(unit.id).at(-1));
    expect(preferred.every(definition => definition?.frameCount === 46)).toBe(true);
    for (const form of DEFAULT_CONTENT.forms) {
      const base = getCrewAnimationDefinitions(form.baseDefinitionId);
      const variants = getCrewAnimationDefinitions(form.baseDefinitionId, form.id);
      expect(variants.slice(0, -1)).toEqual(base);
      expect(variants.at(-1)).toMatchObject({ contentId: form.baseDefinitionId, formId: form.id, frameCount: 46, originX: 0.5, originY: 116 / 128 });
      expect(FORM_ANIMATION_MANIFEST[form.id]).toEqual(variants.at(-1));
      expect(getCrewAnimationDefinitions("zoro", form.id)).toEqual(getCrewAnimationDefinitions("zoro"));
    }
    expect(new Set([...preferred, ...Object.values(FORM_ANIMATION_MANIFEST)].map(definition => definition?.assetKey)).size).toBe(62);
    expect(animationCandidates("luffy").map(definition => definition.assetKey)).toEqual(["luffy-v2", "luffy"]);
    expect(animationCandidates("luffy")[0].originX).toBe(40 / 128);
    expect(animationCandidates("koala")[0].assetKey).toBe("koala-b10-v2");
    expect(animationCandidates("kaido")[0].assetKey).toBe("kaido-b10-v2");
    for (const entry of crewReference(DEFAULT_CONTENT).filter(entry => entry.category === "pve")) {
      expect(entry.imagePath).toBe(`/assets/portraits/${entry.id}.png`);
    }
  });

  it("pins all 58 new sources/maps and keeps complete six-clip local export packages", async () => {
    const matrix = JSON.parse((await read("art/animation-v2/source-matrix.json")).toString()) as { entries: Entry[] };
    const entries = matrix.entries.filter(entry => entry.productionFor);
    expect(entries).toHaveLength(58);
    const minimum: Record<CrewAnimationState, number> = { idle: 3, move: 6, attack: 5, cast: 6, hit: 2, defeat: 5 };
    for (const entry of entries) {
      const id = entry.productionFor!, directory = `art/production/b11/${id}`;
      const body = await read(entry.source.localPath);
      const rgba = await sharp(body).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(sha(body), id).toBe(entry.source.sha256);
      const map = await read(entry.source.frameMap);
      expect(sha(map), id).toBe(entry.source.frameMapSha256);
      const frames = (JSON.parse(map.toString()) as { frames: Frame[] }).frames;
      expect(frames, id).toHaveLength(46);
      const selection = JSON.parse((await read(`${directory}/selection.json`)).toString()) as Selection;
      for (const state of Object.keys(minimum) as CrewAnimationState[]) {
        const clip = frames.filter(frame => frame.state === state);
        const distinct = new Set<string>();
        for (const frame of clip) {
          expect(frame.sourcePivot).toEqual({ x: frame.sourceRect.x + 64, y: frame.sourceRect.y + 116 });
          distinct.add(trimmedCellHash(rgba.data, rgba.info.width, frame.sourceRect));
        }
        // Faithful imported short clips are explicitly documented source limits.
        // Every newly authored/native clip has the B10 true-drawing minimum.
        const original = selection.preservedStates.includes(state);
        expect(distinct.size, `${id}/${state}`).toBeGreaterThanOrEqual(original ? Math.min(minimum[state], new Set(selection.selections[state].map(pose => pose.candidate)).size) : minimum[state]);
      }
      const alpha = new Set<number>();
      for (let i = 3; i < rgba.data.length; i += 4) alpha.add(rgba.data[i]);
      expect([...alpha].sort((a, b) => a - b)).toEqual([0, 255]);
      const atlas = await read(`public/assets/animations/${entry.outputAssetKey}/${entry.outputAssetKey}.png`);
      expect(atlas.length, id).toBeLessThanOrEqual(512 * 1024);
      expect(await sharp(atlas).metadata()).toMatchObject({ width: 1024, height: 768 });
      for (const file of [`${directory}/body.aseprite`, `${directory}/master.png`, `${directory}/fx-poses.png`, `art/qa/b11/${id}/clips.png`, `art/qa/b11/${id}/all-clips.gif`]) await access(path.join(root, file));
    }
  });

  it("retains original good clips and freezes explicit source rectangles for the three hybrid sheets", async () => {
    for (const [id, preserved] of [
      ["garp", ["idle", "cast"]], ["capone-bege", ["idle"]], ["arlong", ["idle", "attack", "cast"]],
    ] as const) {
      const record = JSON.parse((await read(`art/production/b11/${id}/selection.json`)).toString()) as Selection;
      expect(record.sourceType).toBe("licensed-original-with-missing-clip-supplement");
      expect(record.preservedStates).toEqual(preserved);
      for (const state of preserved) expect(record.selections[state].every(pose => pose.sourceRect && pose.candidate !== undefined)).toBe(true);
      expect(record.supplementalStates?.some(state => new Set<string>(preserved).has(state))).toBe(false);
    }
  });

  it("preloads actual future transform/revive bodies only for deployed visible units, with base fallback and no foreign form", () => {
    const units = [{ id: "chopper-1", contentId: "chopper", zone: "board" }, { id: "bench", contentId: "luffy", zone: "bench" }];
    const events = [
      { kind: "transform", sourceId: "chopper-1", toFormId: "chopper-monster-point" },
      { kind: "transform", sourceId: "chopper-1" },
      { kind: "resurrect", targetId: "chopper-1", toFormId: "chopper-monster-point" },
      { kind: "transform", sourceId: "bench", toFormId: "luffy-gear-4-boundman" },
      { kind: "transform", sourceId: "hidden", toFormId: "robin-demonio-fleur" },
      { kind: "transform", sourceId: "chopper-1", toFormId: "luffy-gear-4-snakeman" },
    ];
    const plan = resolveInitialBoardAssets(units, "pirate-ship", events);
    expect(plan.animations.map(definition => definition.assetKey).sort()).toEqual(["chopper-b11-v2", "chopper-monster-point-b11-v2", "luffy-v2"]);
    const formKey = crewSheetKey("chopper-monster-point-b11-v2");
    const status = { textureExists: (key: string) => key === crewSheetKey("chopper-b11-v2") || key === crewSheetKey("luffy-v2"), requestedKeys: new Set<string>(), failedKeys: new Set<string>() };
    expect(resolveMissingAnimationDefinitions(units, status, events).map(definition => definition.assetKey)).toEqual(["chopper-monster-point-b11-v2"]);
    expect(resolveMissingAnimationDefinitions(units, { ...status, failedKeys: new Set([formKey]), requestedKeys: new Set([formKey]) }, events)).toEqual([]);
  });

  it("records exact exported hashes, isolated AI drafts and native sources for offline rebuilds", async () => {
    const frozen = JSON.parse((await read("art/production/b11/outputs.json")).toString()) as { outputs: { path: string; sha256: string }[] };
    for (const output of frozen.outputs) expect(sha(await read(output.path)), output.path).toBe(output.sha256);
    for (const form of DEFAULT_CONTENT.forms) for (const name of ["portrait", "token"]) {
      const svg = (await read(`public/assets/forms/${form.id}/${name}.svg`)).toString();
      expect(svg.length).toBeLessThanOrEqual(12 * 1024);
      expect(svg).not.toMatch(/<image|data:|https?:\/\/(?!www\.w3\.org)/);
    }
  });
});
