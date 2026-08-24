import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { scanSpriteSheet } from "./sprite_sheet_scanner.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..", "..");
const DEFAULT_MATRIX = path.join(
  PROJECT_ROOT,
  "art",
  "animation-v2",
  "source-matrix.json",
);
const BUILDABLE_PERMISSION_STATES = new Set(["confirmed", "project-owned"]);

export const V2_CLIPS = Object.freeze({
  idle: { start: 0, end: 5, frameRate: 8, repeat: -1 },
  move: { start: 6, end: 13, frameRate: 16, repeat: 0 },
  attack: { start: 14, end: 21, frameRate: 14, repeat: 0 },
  cast: { start: 22, end: 33, frameRate: 12, repeat: 0 },
  hit: { start: 34, end: 37, frameRate: 12, repeat: 0 },
  defeat: { start: 38, end: 45, frameRate: 10, repeat: 0 },
});

const CLIP_ORDER = Object.keys(V2_CLIPS);
const TOTAL_FRAMES = 46;
const MAX_AUTO_SOURCE_ASPECT_RATIO = 2.5;

function parseArguments(argv) {
  const options = {
    asset: "all",
    matrix: DEFAULT_MATRIX,
    strict: false,
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--strict") {
      options.strict = true;
      continue;
    }
    if (token === "--check") {
      options.check = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument ${token}`);
    const name = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    options[name] = value;
    index += 1;
  }
  options.matrix = path.resolve(options.matrix);
  for (const outputName of ["sheet", "metadata", "framesDir", "gif"]) {
    if (options[outputName]) options[outputName] = path.resolve(options[outputName]);
  }
  return options;
}

function resolveProjectPath(value) {
  return value ? path.resolve(PROJECT_ROOT, value) : null;
}

function stateForFrame(index) {
  const state = CLIP_ORDER.find((candidate) => {
    const clip = V2_CLIPS[candidate];
    return index >= clip.start && index <= clip.end;
  });
  if (!state) throw new Error(`Frame ${index} is outside the v2 clip contract`);
  return state;
}

function durationForState(state) {
  return Math.round(1_000 / V2_CLIPS[state].frameRate);
}

function validateMatrix(matrix) {
  if (matrix.schemaVersion !== 1) throw new Error("Unsupported source matrix schema");
  if (!Array.isArray(matrix.entries)) throw new Error("Source matrix entries must be an array");
  const ids = new Set();
  for (const entry of matrix.entries) {
    if (!entry.id || !/^[a-z0-9-]+$/.test(entry.id)) {
      throw new Error(`Invalid source matrix id ${JSON.stringify(entry.id)}`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate source matrix id ${entry.id}`);
    ids.add(entry.id);
    if (!entry.source?.strategy || !entry.source?.localPath) {
      throw new Error(`${entry.id} must declare a source strategy and localPath`);
    }
    if (!entry.permission?.status || !entry.permission?.note) {
      throw new Error(`${entry.id} must declare an explicit permission status and note`);
    }
    if (entry.pivot?.x !== 64 || entry.pivot?.y !== 116) {
      throw new Error(`${entry.id} must use the standard (64,116) v2 pivot`);
    }
  }
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function deriveIdleVisualTopPx(frames, frameWidth = 128, frameHeight = 128) {
  let visualTop = frameHeight;
  const idleFrames = frames.slice(V2_CLIPS.idle.start, V2_CLIPS.idle.end + 1);
  for (const frame of idleFrames) {
    const { data, info } = await sharp(frame.png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let y = 0; y < Math.min(frameHeight, info.height); y += 1) {
      let visible = false;
      for (let x = 0; x < Math.min(frameWidth, info.width); x += 1) {
        if (data[(y * info.width + x) * info.channels + 3] > 8) {
          visible = true;
          break;
        }
      }
      if (visible) {
        visualTop = Math.min(visualTop, y);
        break;
      }
    }
  }
  return visualTop < frameHeight ? visualTop : Math.round(frameHeight * 0.25);
}

async function inspectEntry(entry) {
  const sourcePath = resolveProjectPath(entry.source.localPath);
  let sourceExists = true;
  let actualSha256 = null;
  try {
    actualSha256 = await sha256(sourcePath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    sourceExists = false;
  }
  const permissionReady = BUILDABLE_PERMISSION_STATES.has(entry.permission.status);
  const hashReady = Boolean(entry.source.sha256);
  const hashMatches = hashReady && actualSha256 === entry.source.sha256;
  const frameMapReady =
    entry.source.strategy === "procedural-cutout" || Boolean(entry.source.frameMap);
  const buildable = sourceExists && permissionReady && hashMatches && frameMapReady;
  let reason = null;
  if (!sourceExists) reason = "source missing";
  else if (!permissionReady) reason = `permission ${entry.permission.status}`;
  else if (!hashReady) reason = "source SHA-256 not recorded";
  else if (!hashMatches) reason = `source SHA-256 mismatch (${actualSha256})`;
  else if (!frameMapReady) reason = "frame map missing";
  return { entry, sourcePath, sourceExists, actualSha256, buildable, reason };
}

function requireOutputOptions(options) {
  for (const name of ["sheet", "metadata", "framesDir", "gif"]) {
    if (!options[name]) throw new Error(`Missing --${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
}

function makeEffectBuffer(state, localIndex, colorHex, attackStyle, castStyle) {
  const buffer = Buffer.alloc(128 * 128 * 4);
  const red = Number.parseInt(colorHex.slice(1, 3), 16);
  const green = Number.parseInt(colorHex.slice(3, 5), 16);
  const blue = Number.parseInt(colorHex.slice(5, 7), 16);
  const setPixel = (x, y, alpha = 255, color = [red, green, blue]) => {
    if (x < 0 || y < 0 || x >= 128 || y >= 128) return;
    const offset = (y * 128 + x) * 4;
    buffer[offset] = color[0];
    buffer[offset + 1] = color[1];
    buffer[offset + 2] = color[2];
    buffer[offset + 3] = alpha;
  };
  const rectangle = (left, top, width, height, alpha = 255, color) => {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) setPixel(x, y, alpha, color);
    }
  };
  const diamond = (cx, cy, radius, thickness = 2) => {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const distance = Math.abs(x) + Math.abs(y);
        if (distance <= radius && distance > radius - thickness) setPixel(cx + x, cy + y, 210);
      }
    }
  };

  if (state === "attack" && localIndex >= 2 && localIndex <= 5) {
    const progress = localIndex - 2;
    if (attackStyle === "shot") {
      rectangle(78 + progress * 7, 69 - progress, 8, 4, 240);
      rectangle(82 + progress * 7, 67 - progress, 3, 2, 180);
    } else if (attackStyle === "beam") {
      rectangle(70, 60 + progress, 46, 3, 225);
      rectangle(76, 58 + progress, 30, 1, 150);
    } else if (attackStyle === "bite") {
      rectangle(76 + progress * 4, 61, 4, 18, 220);
      rectangle(82 + progress * 4, 65, 4, 10, 180);
    } else {
      for (let step = 0; step < 9; step += 1) {
        rectangle(73 + step * 4, 77 - step * 3 + progress, 4, 3, 220);
      }
    }
  }
  if (state === "cast") {
    const phase = localIndex % 6;
    if (castStyle === "beam") {
      const width = Math.min(52, 8 + phase * 9);
      rectangle(70, 56, width, 6, 210);
      rectangle(76, 54, Math.max(2, width - 12), 2, 150);
    } else if (castStyle === "waves") {
      diamond(64, 73, 18 + phase * 3, 2);
      if (phase > 2) diamond(64, 73, 8 + phase * 2, 2);
    } else {
      diamond(64, 72, 12 + phase * 4, 2);
      rectangle(60, 34 - phase, 8, 4, 180);
    }
  }
  if (state === "hit") {
    rectangle(42 + localIndex * 10, 45, 4, 4, 220, [255, 102, 92]);
    rectangle(78 - localIndex * 7, 54, 3, 3, 180, [255, 180, 120]);
  }
  return buffer;
}

function proceduralTransform(state, localIndex) {
  if (state === "idle") {
    return { x: [0, 0, 1, 0, -1, 0][localIndex], y: [0, -1, -2, -1, 0, 1][localIndex], scaleX: 1, scaleY: 1 };
  }
  if (state === "move") {
    return {
      x: [-4, -2, 0, 2, 4, 2, 0, -2][localIndex],
      y: [0, -2, -3, -1, 0, -2, -3, -1][localIndex],
      scaleX: 1,
      scaleY: 1,
    };
  }
  if (state === "attack") {
    return { x: [0, 2, 5, 9, 12, 8, 3, 0][localIndex], y: [0, 0, -1, -2, -2, -1, 0, 0][localIndex], scaleX: 1, scaleY: 1 };
  }
  if (state === "cast") {
    return { x: [0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0][localIndex], y: [0, -1, -2, -3, -2, -1, 0, -1, -2, -1, 0, 0][localIndex], scaleX: 1, scaleY: 1 };
  }
  if (state === "hit") {
    return { x: [-4, 4, -2, 0][localIndex], y: [0, -1, 0, 0][localIndex], scaleX: 1, scaleY: 1 };
  }
  const scaleY = [1, 0.94, 0.86, 0.76, 0.64, 0.51, 0.38, 0.24][localIndex];
  const scaleX = [1, 1.02, 1.05, 1.08, 1.12, 1.16, 1.2, 1.24][localIndex];
  return { x: localIndex * 2, y: 0, scaleX, scaleY };
}

function paletteSimilarity(left, right) {
  const leftColors = new Set(left.palette.map((entry) => entry.color));
  const rightColors = new Set(right.palette.map((entry) => entry.color));
  let intersection = 0;
  for (const color of leftColors) if (rightColors.has(color)) intersection += 1;
  return intersection / (leftColors.size + rightColors.size - intersection);
}

function selectCharacterCandidates(candidates) {
  if (!candidates.length) throw new Error("No sprite candidates passed the component filter");
  let baseIndex = 0;
  for (let index = 0; index < Math.min(50, candidates.length); index += 1) {
    let similarFrames = 0;
    for (let lookahead = index; lookahead < Math.min(index + 10, candidates.length); lookahead += 1) {
      if (paletteSimilarity(candidates[index], candidates[lookahead]) >= 0.3) {
        similarFrames += 1;
      }
    }
    if (similarFrames >= 5) {
      baseIndex = index;
      break;
    }
  }
  const base = candidates[baseIndex];
  const selected = candidates.filter(
    (candidate) =>
      paletteSimilarity(base, candidate) >= 0.08 &&
      candidate.height >= base.height * 0.45 &&
      candidate.height <= base.height * 1.9 &&
      candidate.width <= Math.max(190, base.width * 2.4) &&
      candidate.width / candidate.height <= MAX_AUTO_SOURCE_ASPECT_RATIO,
  );
  if (selected.length < 6) {
    throw new Error(`Only ${selected.length} character-like sprite candidates were detected`);
  }
  return { baseIndex, base, selected };
}

function cycleFrom(candidates, start, count) {
  return Array.from({ length: count }, (_, index) =>
    candidates[(start + index) % candidates.length],
  );
}

function serializableFrames(frames) {
  return frames.map((frame) => {
    const serialized = { ...frame };
    delete serialized.png;
    delete serialized.path;
    return serialized;
  });
}

function selectAutoFrames(characterCandidates) {
  const total = characterCandidates.length;
  const horizontal = characterCandidates.filter(
    (candidate) => candidate.width / candidate.height >= 1.05,
  );
  const defeatCandidates = horizontal.length >= 2
    ? horizontal.slice(-8)
    : characterCandidates.slice(-8);
  if (total < TOTAL_FRAMES) {
    const idleSources = characterCandidates.slice(0, Math.min(4, total));
    const attackStart = Math.min(4, total - 1);
    const castStart = Math.min(12, total - 1);
    return [
      ...cycleFrom(idleSources, 0, 6),
      ...cycleFrom(idleSources, 0, 8),
      ...cycleFrom(characterCandidates, attackStart, 8),
      ...cycleFrom(characterCandidates, castStart, 12),
      ...cycleFrom(characterCandidates, Math.max(0, total - 4), 4),
      ...cycleFrom(defeatCandidates, 0, 8),
    ];
  }
  const castStart = Math.min(
    Math.max(22, Math.floor(total * 0.35)),
    Math.max(0, total - 12),
  );
  const hitStart = Math.max(0, total - 16);
  return [
    ...cycleFrom(characterCandidates, 0, 6),
    ...cycleFrom(characterCandidates, Math.min(6, total - 1), 8),
    ...cycleFrom(characterCandidates, Math.min(14, total - 1), 8),
    ...cycleFrom(characterCandidates, castStart, 12),
    ...cycleFrom(characterCandidates, hitStart, 4),
    ...cycleFrom(defeatCandidates, 0, 8),
  ];
}

async function renderAutoFrameMap(status, options) {
  const { entry, sourcePath, actualSha256 } = status;
  const scan = await scanSpriteSheet(sourcePath, entry.scanOptions ?? {});
  const { baseIndex, selected: characterCandidates } = selectCharacterCandidates(
    scan.candidates,
  );
  const selectedFrames = selectAutoFrames(characterCandidates);
  if (selectedFrames.length !== TOTAL_FRAMES) {
    throw new Error(`${entry.id} auto frame selection produced ${selectedFrames.length} frames`);
  }
  const sourceMetadata = await sharp(sourcePath).metadata();
  const usage = new Map();
  for (const candidate of selectedFrames) {
    usage.set(candidate, (usage.get(candidate) ?? 0) + 1);
  }
  const frames = [];
  await mkdir(options.framesDir, { recursive: true });
  for (const [index, candidate] of selectedFrames.entries()) {
    const state = stateForFrame(index);
    const clip = V2_CLIPS[state];
    const localIndex = index - clip.start;
    const extracted = await sharp(sourcePath)
      .extract({
        left: candidate.sourceRect.x,
        top: candidate.sourceRect.y,
        width: candidate.sourceRect.width,
        height: candidate.sourceRect.height,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let pixel = 0; pixel < extracted.info.width * extracted.info.height; pixel += 1) {
      const offset = pixel * 4;
      if (
        extracted.data[offset] === scan.backgroundRgb[0] &&
        extracted.data[offset + 1] === scan.backgroundRgb[1] &&
        extracted.data[offset + 2] === scan.backgroundRgb[2]
      ) extracted.data[offset + 3] = 0;
    }
    const fitted = await sharp(extracted.data, { raw: extracted.info })
      .resize({
        width: entry.recipe?.maxWidth ?? 116,
        height: entry.recipe?.maxHeight ?? 112,
        fit: "inside",
        kernel: sharp.kernel.nearest,
        withoutEnlargement: true,
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    const transform = proceduralTransform(state, localIndex);
    const repeated = (usage.get(candidate) ?? 0) > 1;
    const supplements = [];
    const visual = state === "defeat"
      ? await sharp(fitted.data)
          .resize(
            fitted.info.width,
            Math.max(1, Math.round(fitted.info.height * transform.scaleY)),
            { kernel: sharp.kernel.nearest },
          )
          .png()
          .toBuffer({ resolveWithObject: true })
      : fitted;
    if (state === "defeat") supplements.push("nearest-defeat-compression");
    const left = Math.max(
      0,
      Math.min(
        128 - visual.info.width,
        Math.round(entry.pivot.x - visual.info.width / 2 + (repeated ? transform.x : 0)),
      ),
    );
    const top = Math.max(
      0,
      Math.min(
        128 - visual.info.height,
        Math.round(entry.pivot.y - visual.info.height + (repeated ? transform.y : 0)),
      ),
    );
    const composites = [{ input: visual.data, left, top }];
    if (repeated && (state === "attack" || state === "cast" || state === "hit")) {
      const effect = makeEffectBuffer(
        state,
        localIndex,
        entry.recipe?.effectColor ?? "#8fd3ff",
        entry.recipe?.attackEffect ?? "slash",
        entry.recipe?.castEffect ?? "pulse",
      );
      composites.push({
        input: effect,
        raw: { width: 128, height: 128, channels: 4 },
        left: 0,
        top: 0,
      });
      supplements.push("local-pixel-effect");
    }
    if (repeated) supplements.push("integer-offset");
    const png = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png({ palette: true, colours: 256, dither: 0 })
      .toBuffer();
    const framePath = path.join(options.framesDir, `frame-${String(index).padStart(2, "0")}.png`);
    await writeFile(framePath, png);
    frames.push({
      index,
      state,
      durationMs: durationForState(state),
      componentIndex: scan.candidates.indexOf(candidate),
      sourceRect: candidate.sourceRect,
      sourcePivot: {
        x: candidate.sourceRect.x + Math.floor(candidate.sourceRect.width / 2),
        y: candidate.sourceRect.y + candidate.sourceRect.height,
      },
      destination: { x: left, y: top },
      supplements,
      png,
      path: framePath,
    });
  }
  await writeAtlasAndGif(frames, options);
  const metadata = {
    schemaVersion: 2,
    pipeline: "auto-connected-components-v1",
    assetId: entry.id,
    assetKey: entry.outputAssetKey,
    source: entry.source.localPath,
    sourcePage: entry.source.sheetUrl,
    contributor: entry.source.contributor,
    sourceSha256: actualSha256,
    sourceDimensions: { width: sourceMetadata.width, height: sourceMetadata.height },
    permission: entry.permission,
    detection: {
      backgroundRgb: scan.backgroundRgb,
      componentCount: scan.componentCount,
      candidateCount: scan.candidates.length,
      characterCandidateCount: characterCandidates.length,
      baseCandidateIndex: baseIndex,
    },
    frame: {
      width: 128,
      height: 128,
      columns: 8,
      destinationPivot: entry.pivot,
      idleVisualTopPx: await deriveIdleVisualTopPx(frames),
    },
    frameCount: TOTAL_FRAMES,
    clips: V2_CLIPS,
    frames: serializableFrames(frames),
  };
  await mkdir(path.dirname(options.metadata), { recursive: true });
  await writeFile(options.metadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function renderProceduralCutout(status, options) {
  const { entry, sourcePath, actualSha256 } = status;
  const sourceMetadata = await sharp(sourcePath).metadata();
  const maxWidth = entry.recipe?.maxWidth ?? 96;
  const maxHeight = entry.recipe?.maxHeight ?? 108;
  const trimmed = await sharp(sourcePath)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const frames = [];
  await mkdir(options.framesDir, { recursive: true });
  for (let index = 0; index < TOTAL_FRAMES; index += 1) {
    const state = stateForFrame(index);
    const clip = V2_CLIPS[state];
    const localIndex = index - clip.start;
    const transform = proceduralTransform(state, localIndex);
    const width = Math.max(1, Math.round(trimmed.info.width * transform.scaleX));
    const height = Math.max(1, Math.round(trimmed.info.height * transform.scaleY));
    const sprite = await sharp(trimmed.data)
      .resize(width, height, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();
    const left = Math.max(0, Math.min(128 - width, Math.round(entry.pivot.x - width / 2 + transform.x)));
    const top = Math.max(0, Math.min(128 - height, Math.round(entry.pivot.y - height + transform.y)));
    const effect = makeEffectBuffer(
      state,
      localIndex,
      entry.recipe?.effectColor ?? "#8fd3ff",
      entry.recipe?.attackEffect ?? "slash",
      entry.recipe?.castEffect ?? "pulse",
    );
    const png = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: sprite, left, top },
        { input: effect, raw: { width: 128, height: 128, channels: 4 }, left: 0, top: 0 },
      ])
      .png({ palette: true, colours: 256, dither: 0 })
      .toBuffer();
    const framePath = path.join(options.framesDir, `frame-${String(index).padStart(2, "0")}.png`);
    await writeFile(framePath, png);
    frames.push({
      index,
      state,
      durationMs: durationForState(state),
      transform: { x: transform.x, y: transform.y, scaleX: transform.scaleX, scaleY: transform.scaleY },
      effect: state === "attack" ? entry.recipe?.attackEffect : state === "cast" ? entry.recipe?.castEffect : state === "hit" ? "impact-pixels" : null,
      png,
      path: framePath,
    });
  }

  await writeAtlasAndGif(frames, options);
  const metadata = {
    schemaVersion: 2,
    pipeline: "procedural-static-cutout-v1",
    assetId: entry.id,
    assetKey: entry.outputAssetKey,
    source: entry.source.localPath,
    sourceSha256: actualSha256,
    sourceDimensions: { width: sourceMetadata.width, height: sourceMetadata.height },
    permission: entry.permission,
    frame: {
      width: 128,
      height: 128,
      columns: 8,
      destinationPivot: entry.pivot,
      idleVisualTopPx: await deriveIdleVisualTopPx(frames),
    },
    frameCount: TOTAL_FRAMES,
    clips: V2_CLIPS,
    frames: serializableFrames(frames),
  };
  await mkdir(path.dirname(options.metadata), { recursive: true });
  await writeFile(options.metadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function renderFrameMap(status, options) {
  const { entry, sourcePath, actualSha256 } = status;
  const frameMapPath = resolveProjectPath(entry.source.frameMap);
  const mapping = JSON.parse(await readFile(frameMapPath, "utf8"));
  if (mapping.frames?.length !== TOTAL_FRAMES) {
    throw new Error(`${entry.id} frame map must contain exactly ${TOTAL_FRAMES} frames`);
  }
  const sourceMetadata = await sharp(sourcePath).metadata();
  const backgroundRgb = mapping.backgroundRgb ?? null;
  const frames = [];
  await mkdir(options.framesDir, { recursive: true });
  for (const [index, frame] of mapping.frames.entries()) {
    const extracted = await sharp(sourcePath)
      .extract({
        left: frame.sourceRect.x,
        top: frame.sourceRect.y,
        width: frame.sourceRect.width,
        height: frame.sourceRect.height,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = Buffer.from(extracted.data);
    if (backgroundRgb) {
      for (let pixel = 0; pixel < extracted.info.width * extracted.info.height; pixel += 1) {
        const offset = pixel * 4;
        if (
          rgba[offset] === backgroundRgb[0] &&
          rgba[offset + 1] === backgroundRgb[1] &&
          rgba[offset + 2] === backgroundRgb[2]
        ) rgba[offset + 3] = 0;
      }
    }
    const left = entry.pivot.x - (frame.sourcePivot.x - frame.sourceRect.x);
    const top = entry.pivot.y - (frame.sourcePivot.y - frame.sourceRect.y);
    if (left < 0 || top < 0 || left + extracted.info.width > 128 || top + extracted.info.height > 128) {
      throw new Error(`${entry.id} frame ${index} does not fit the 128x128 canvas`);
    }
    const png = await sharp({
      create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: rgba, raw: extracted.info, left, top }])
      .png({ palette: true, colours: 256, dither: 0 })
      .toBuffer();
    const state = stateForFrame(index);
    const framePath = path.join(options.framesDir, `frame-${String(index).padStart(2, "0")}.png`);
    await writeFile(framePath, png);
    frames.push({
      index,
      state,
      durationMs: frame.durationMs ?? durationForState(state),
      sourceRect: frame.sourceRect,
      sourcePivot: frame.sourcePivot,
      destination: { x: left, y: top },
      png,
      path: framePath,
    });
  }
  await writeAtlasAndGif(frames, options);
  const metadata = {
    schemaVersion: 2,
    pipeline: "licensed-frame-map-v1",
    assetId: entry.id,
    assetKey: entry.outputAssetKey,
    source: entry.source.localPath,
    sourceSha256: actualSha256,
    sourceDimensions: { width: sourceMetadata.width, height: sourceMetadata.height },
    permission: entry.permission,
    frame: {
      width: 128,
      height: 128,
      columns: 8,
      destinationPivot: entry.pivot,
      idleVisualTopPx: await deriveIdleVisualTopPx(frames),
    },
    frameCount: TOTAL_FRAMES,
    clips: V2_CLIPS,
    frames: serializableFrames(frames),
  };
  await mkdir(path.dirname(options.metadata), { recursive: true });
  await writeFile(options.metadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function writeAtlasAndGif(frames, options) {
  await mkdir(path.dirname(options.sheet), { recursive: true });
  await mkdir(path.dirname(options.gif), { recursive: true });
  await sharp({
    create: {
      width: 128 * 8,
      height: 128 * 6,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      frames.map((frame, index) => ({
        input: frame.png,
        left: (index % 8) * 128,
        top: Math.floor(index / 8) * 128,
      })),
    )
    .png({ palette: true, colours: 256, dither: 0 })
    .toFile(options.sheet);
  await sharp(frames.map((frame) => frame.path), { join: { animated: true } })
    .gif({ delay: frames.map((frame) => frame.durationMs), loop: 0, dither: 0 })
    .toFile(options.gif);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const matrix = JSON.parse(await readFile(options.matrix, "utf8"));
  validateMatrix(matrix);
  const selected = options.asset === "all"
    ? matrix.entries
    : matrix.entries.filter((entry) => entry.id === options.asset);
  if (selected.length === 0) throw new Error(`Unknown v2 asset ${options.asset}`);
  if (!options.check && selected.length !== 1) {
    throw new Error("Build one asset at a time; use the PowerShell batch wrapper for all assets");
  }

  const statuses = [];
  for (const entry of selected) statuses.push(await inspectEntry(entry));
  for (const status of statuses) {
    if (status.buildable) console.log(`[build:v2] ${status.entry.id}`);
    else console.log(`[fallback:v1] ${status.entry.id}: ${status.reason}`);
  }
  if (options.check) return;
  const status = statuses[0];
  if (!status.buildable) {
    if (options.strict) throw new Error(`${status.entry.id} cannot be built: ${status.reason}`);
    return;
  }
  requireOutputOptions(options);
  if (status.entry.source.strategy === "procedural-cutout") {
    await renderProceduralCutout(status, options);
  } else if (status.entry.source.strategy === "auto-frame-map") {
    await renderAutoFrameMap(status, options);
  } else if (status.entry.source.strategy === "licensed-frame-map") {
    await renderFrameMap(status, options);
  } else {
    throw new Error(`Unsupported source strategy ${status.entry.source.strategy}`);
  }
  console.log(`[built:v2] ${status.entry.id}: ${options.sheet}`);
}

await main();
