// Explicit authoring step only. Never called by build, CI or assets:all.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "art/production/b10");
const curation = JSON.parse(await readFile(path.join(SOURCE, "curation.json"), "utf8"));
const CELL = curation.draftGrid.cellSize;

function bounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3]) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("Empty authoring pose");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

// Discard isolated neighbour-cell fragments before registration. The character
// (including held weapon / wings) is one explicitly selected connected body.
function keepBody(pixels) {
  const visited = new Uint8Array(CELL * CELL);
  let body = [];
  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || !pixels[start * 4 + 3]) continue;
    const component = [start]; visited[start] = 1;
    for (let cursor = 0; cursor < component.length; cursor += 1) {
      const pixel = component[cursor], x = pixel % CELL, y = Math.floor(pixel / CELL);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx, ny = y + dy, next = ny * CELL + nx;
        if (nx < 0 || ny < 0 || nx >= CELL || ny >= CELL || visited[next] || !pixels[next * 4 + 3]) continue;
        visited[next] = 1; component.push(next);
      }
    }
    if (component.length > body.length) body = component;
  }
  const selected = new Uint8Array(CELL * CELL);
  for (const pixel of body) selected[pixel] = 1;
  for (let pixel = 0; pixel < selected.length; pixel += 1) if (!selected[pixel]) pixels.fill(0, pixel * 4, pixel * 4 + 4);
}

for (const pilot of curation.pilots) {
  const directory = path.join(SOURCE, pilot.id);
  const existing = await access(path.join(directory, "body-poses.png")).then(() => true, () => false);
  if (existing && !process.argv.includes("--replace-authoring-source")) {
    throw new Error(`${pilot.id}: frozen source already exists; use --replace-authoring-source only for an intentional new authoring pass`);
  }
  const source = await sharp(path.join(directory, "draft.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rawPoses = [];
  for (let index = 0; index < 36; index += 1) {
    const pixels = Buffer.alloc(CELL * CELL * 4);
    const ox = index % 6 * CELL, oy = Math.floor(index / 6) * CELL;
    for (let y = 0; y < CELL; y += 1) for (let x = 0; x < CELL; x += 1) {
      const input = ((oy + y) * source.info.width + ox + x) * 4;
      const output = (y * CELL + x) * 4;
      if (source.data[input + 3] >= curation.alphaCutoff) {
        source.data.copy(pixels, output, input, input + 3);
        pixels[output + 3] = 255;
      }
    }
    keepBody(pixels);
    rawPoses.push({ pixels, bounds: bounds(pixels, CELL, CELL) });
  }
  const scale = pilot.masterHeight / rawPoses[pilot.masterPose].bounds.height;
  const poses = [];
  for (const pose of rawPoses) {
    const crop = pose.bounds;
    const width = Math.round(crop.width * scale), height = Math.round(crop.height * scale);
    const png = await sharp(pose.pixels, { raw: { width: CELL, height: CELL, channels: 4 } })
      .extract(crop).resize(width, height, { kernel: sharp.kernel.nearest }).png().toBuffer();
    const left = 64 - Math.round((pilot.sourceAnchorX - crop.left) * scale);
    const top = 116 - height;
    if (left < 0 || top < 0 || left + width > 128 || top + height > 128) throw new Error(`${pilot.id}: authoring pose exceeds cell`);
    poses.push({ input: png, left: poses.length % 6 * 128 + left, top: Math.floor(poses.length / 6) * 128 + top });
  }
  await mkdir(directory, { recursive: true });
  const board = await sharp({ create: { width: 768, height: 768, channels: 4, background: "#00000000" } })
    .composite(poses).png({ palette: true, colours: curation.paletteColours, dither: 0 }).toBuffer();
  await writeFile(path.join(directory, "body-poses.png"), board);
  await sharp(board).extract({ left: 0, top: 0, width: 128, height: 128 }).png().toFile(path.join(directory, "master.png"));
  await sharp({ create: { width: 768, height: 768, channels: 4, background: "#00000000" } }).png().toFile(path.join(directory, "fx-poses.png"));
  const frames = Object.entries(curation.clips).flatMap(([state, indices]) => indices.map((pose) => {
    const x = pose % 6 * 128, y = Math.floor(pose / 6) * 128;
    return { state, poseId: `${state}-${pose % 6}`, sourceRect: { x, y, width: 128, height: 128 }, sourcePivot: { x: x + 64, y: y + 116 } };
  }));
  await writeFile(path.join(directory, "frame-map.json"), JSON.stringify({ schemaVersion: 1, frames }, null, 2) + "\n");
  console.log(`Authored frozen pose board / master / explicit mapping for ${pilot.id}`);
}
