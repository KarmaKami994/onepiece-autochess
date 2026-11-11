// Authoring contact sheets only. Never part of build, CI or runtime.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { scanSpriteSheet } from "./sprite_sheet_scanner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = path.join(ROOT, "tmp/b11-source-inspection");
const matrix = JSON.parse(await readFile(path.join(ROOT, "art/animation-v2/source-matrix.json"), "utf8"));
const excluded = new Set(["koala", "kaido", "killer", "caesar-clown", "pica"]);
const entries = matrix.entries.filter((entry) => entry.source.strategy === "auto-frame-map" && !excluded.has(entry.id));
const selectedId = process.argv.find((arg) => arg.startsWith("--asset="))?.slice(8);
const states = ["idle", "move", "attack", "cast", "hit", "defeat"];
const CELL_W = 64, CELL_H = 76, COLUMNS = 20, PER_PAGE = 240;
const rectKey = (rect) => JSON.stringify(rect);

function pixelsFor(source, rect, background) {
  const pixels = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const start = ((rect.y + y) * source.info.width + rect.x) * 4;
    source.data.copy(pixels, y * rect.width * 4, start, start + rect.width * 4);
  }
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset] === background[0] && pixels[offset + 1] === background[1] && pixels[offset + 2] === background[2]) pixels.fill(0, offset, offset + 4);
  }
  return pixels;
}

async function tile(source, rect, background) {
  return sharp(pixelsFor(source, rect, background), { raw: { width: rect.width, height: rect.height, channels: 4 } })
    .resize({ width: 58, height: 58, fit: "inside", kernel: sharp.kernel.nearest }).png().toBuffer({ resolveWithObject: true });
}

for (const entry of entries.filter((candidate) => !selectedId || candidate.id === selectedId)) {
  const directory = path.join(OUTPUT, entry.id); await mkdir(directory, { recursive: true });
  const scan = await scanSpriteSheet(path.join(ROOT, entry.source.localPath), { ...entry.scanOptions, minHeight: 10, maxHeight: 300, maxWidth: 300, minArea: 90, padding: 3 });
  const source = await sharp(path.join(ROOT, entry.source.localPath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const legacy = JSON.parse(await readFile(path.join(ROOT, "public/assets/animations", entry.outputAssetKey, `${entry.outputAssetKey}.json`), "utf8"));
  const baseRect = legacy.frames[0].sourceRect;
  const base = pixelsFor(source, baseRect, scan.backgroundRgb);
  const frequencies = new Map();
  for (let offset = 0; offset < base.length; offset += 4) if (base[offset + 3]) {
    const colour = base[offset] << 16 | base[offset + 1] << 8 | base[offset + 2];
    frequencies.set(colour, (frequencies.get(colour) ?? 0) + 1);
  }
  const baseColours = new Set([...frequencies].sort((a, b) => b[1] - a[1]).slice(0, 64).map(([colour]) => colour));
  const legacyRects = new Set(legacy.frames.map((frame) => rectKey(frame.sourceRect)));
  const candidates = scan.candidates.map((candidate, index) => ({ ...candidate, index })).filter((candidate) => {
    if (legacyRects.has(rectKey(candidate.sourceRect))) return true;
    return candidate.palette.filter((colour) => baseColours.has(colour.color)).length >= 3 && candidate.height >= Math.max(10, baseRect.height * 0.16) && candidate.height <= baseRect.height * 2.5 && candidate.width <= Math.max(140, baseRect.width * 5);
  });
  const legacyIndices = Object.fromEntries(states.map((state) => [state, legacy.frames.filter((frame) => frame.state === state).map((frame) => candidates.find((candidate) => rectKey(candidate.sourceRect) === rectKey(frame.sourceRect))?.index ?? null)]));
  await writeFile(path.join(directory, "candidates.json"), JSON.stringify({ id: entry.id, source: entry.source, backgroundRgb: scan.backgroundRgb, baseRect, legacyIndices, candidates: candidates.map(({ index, sourceRect, x, y, width, height }) => ({ index, sourceRect, x, y, width, height })) }, null, 2) + "\n");
  for (let page = 0; page * PER_PAGE < candidates.length; page += 1) {
    const batch = candidates.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    const layers = [];
    for (const [offset, candidate] of batch.entries()) {
      const x = offset % COLUMNS * CELL_W, y = Math.floor(offset / COLUMNS) * CELL_H + 24;
      const image = await tile(source, candidate.sourceRect, scan.backgroundRgb);
      layers.push({ input: image.data, left: x + Math.floor((CELL_W - image.info.width) / 2), top: y + 2 });
      layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="14"><text x="32" y="11" text-anchor="middle" fill="#f5edcf" font-size="10" font-family="monospace">${candidate.index}</text></svg>`), left: x, top: y + 59 });
    }
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="24"><text x="8" y="18" fill="#ffe3a0" font-size="14" font-family="monospace">${entry.id} / SOURCE CANDIDATES / ${page + 1}</text></svg>`;
    layers.push({ input: Buffer.from(label), left: 0, top: 0 });
    await sharp({ create: { width: COLUMNS * CELL_W, height: Math.ceil(batch.length / COLUMNS) * CELL_H + 24, channels: 4, background: "#243747" } }).composite(layers).png().toFile(path.join(directory, `page-${page}.png`));
  }
  console.log(`${entry.id}: ${candidates.length} candidates / ${Math.ceil(candidates.length / PER_PAGE)} pages; original runtime untouched`);
}
