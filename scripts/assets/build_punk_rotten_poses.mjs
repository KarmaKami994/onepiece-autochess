import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const art = path.join(root, "art/production/kid-punk-rotten");
const visuals = path.join(root, "public/assets/forms/kid-punk-rotten");
const selection = JSON.parse(await readFile(path.join(art, "selection.json"), "utf8"));
const master = await readFile(path.join(art, "master.png"));
if (createHash("sha256").update(master).digest("hex") !== selection.sourceSha256) {
  throw new Error("Unexpected Punk Rotten master image.");
}

const frameSize = 128;
const pivot = { x: 64, y: 116 };
const columns = 8;

async function part(name, maxWidth, maxHeight) {
  const cropped = await sharp(master).extract(selection.parts[name]).png().toBuffer();
  return sharp(cropped).trim({ background: "#00000000" })
    .resize(maxWidth, maxHeight, { fit: "inside", kernel: "nearest" })
    .png().toBuffer({ resolveWithObject: true });
}

const torso = await part("torso", 52, 94);
const leftFist = await part("leftFist", 34, 47);
const rightFist = await part("rightFist", 32, 46);

// Offsets for the torso, the left fist and the right fist in the order x/y.
const clips = {
  idle: [
    [0, 0, 0, 0, 0, 0], [0, -1, 0, -1, 0, 1], [0, -3, 1, -2, -1, 0],
    [0, -4, 1, -1, -1, -2], [0, -3, 0, 0, 0, -2], [0, -1, 0, 0, 0, -1],
  ],
  move: [
    [0, 0, -2, 0, -3, 0], [1, -1, -2, -1, -3, 1], [2, -3, -1, -3, -2, 0], [3, -4, 0, -4, -1, -2],
    [3, -2, 1, -2, 0, -3], [2, 0, 1, 0, 1, -2], [1, 1, 0, 1, 0, 0], [0, 0, -1, 0, -1, 1],
  ],
  attack: [
    [-2, -1, -1, 0, -7, -2], [-4, -3, -2, -1, -12, -7], [-2, -3, 0, -2, -5, -4], [3, -2, 4, -3, 4, -4],
    [4, 0, 5, -2, 4, -3], [2, 1, 4, 0, 1, 0], [1, 0, 2, 0, -1, 1], [0, 0, 0, 0, 0, 0],
  ],
  cast: [
    [0, 0, 0, 0, 0, 0], [0, -2, -2, -2, 1, -2], [0, -4, -4, -5, 3, -5], [0, -6, -4, -7, 4, -7],
    [0, -6, -3, -8, 4, -8], [0, -3, 10, -7, -9, -7], [1, 0, 23, -6, -22, -6], [1, 1, 29, -5, -26, -5],
    [0, 1, 23, -4, -22, -4], [0, 0, 11, -3, -10, -3], [0, 0, 4, -1, -4, -1], [0, 0, 0, 0, 0, 0],
  ],
  hit: [[-3, -2, -2, 1, -5, -3], [-5, 1, 1, 3, -7, -1], [-3, 1, 2, 2, -4, 0], [0, 0, 0, 0, 0, 0]],
  defeat: [
    [-2, -1, -2, 0, 2, 0], [-3, 1, -3, 2, 3, 2], [-4, 4, -4, 6, 3, 5], [-5, 7, -4, 9, 4, 8],
    [-5, 10, -4, 14, 4, 13], [-5, 13, -4, 19, 4, 17], [-5, 15, -4, 24, 4, 23], [-5, 15, -4, 24, 4, 23],
  ],
};

function place(piece, center, baseline) {
  return {
    input: piece.data,
    left: Math.max(0, Math.min(frameSize - piece.info.width, center - Math.floor(piece.info.width / 2))),
    top: Math.max(0, Math.min(frameSize - piece.info.height, baseline - piece.info.height)),
  };
}

const makeFrame = ([bodyX, bodyY, leftX, leftY, rightX, rightY]) =>
  sharp({ create: { width: frameSize, height: frameSize, channels: 4, background: "#00000000" } })
    .composite([
      place(torso, 64 + bodyX, 109 + bodyY),
      place(leftFist, 20 + leftX, 102 + leftY),
      place(rightFist, 108 + rightX, 101 + rightY),
    ]).png().toBuffer();

const timeline = Object.entries(clips).flatMap(([state, offsets]) => offsets.map((pose) => ({ state, pose })));
const frames = await Promise.all(timeline.map(({ pose }) => makeFrame(pose)));
const mapped = timeline.map(({ state }, index) => {
  const x = index % columns * frameSize;
  const y = Math.floor(index / columns) * frameSize;
  return { state, sourceRect: { x, y, width: frameSize, height: frameSize }, sourcePivot: { x: x + pivot.x, y: y + pivot.y } };
});
const poseSheet = await sharp({
  create: { width: columns * frameSize, height: Math.ceil(frames.length / columns) * frameSize, channels: 4, background: "#00000000" },
}).composite(frames.map((input, index) => ({ input, left: mapped[index].sourceRect.x, top: mapped[index].sourceRect.y })))
  .png({ palette: true, colours: 256, dither: 0 }).toBuffer();

async function pixelPortrait(input) {
  const indexed = await sharp(input).resize(48, 48, { kernel: "nearest" })
    .png({ palette: true, colours: 64, dither: 0 }).toBuffer();
  const { data } = await sharp(indexed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const runsByColour = new Map();
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48;) {
      const start = x;
      const pixel = data.subarray((y * 48 + x) * 4, (y * 48 + x + 1) * 4);
      x++;
      while (x < 48 && data.subarray((y * 48 + x) * 4, (y * 48 + x + 1) * 4).equals(pixel)) x++;
      if (pixel[3] < 128) continue;
      const colour = pixel.subarray(0, 3).toString("hex");
      const runs = runsByColour.get(colour) ?? [];
      runs.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
      runsByColour.set(colour, runs);
    }
  }
  return [...runsByColour].map(([colour, runs]) => `<path fill="#${colour}" d="${runs.join("")}"/>`).join("");
}

const body = await pixelPortrait(frames[0]);
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" shape-rendering="crispEdges"><title>Kid — Punk Rotten</title>${body}</svg>\n`;
await mkdir(visuals, { recursive: true });
await Promise.all([
  writeFile(path.join(art, "poses.png"), poseSheet),
  writeFile(path.join(art, "frame-map.json"), `${JSON.stringify({ schemaVersion: 1, frames: mapped }, null, 2)}\n`),
  writeFile(path.join(visuals, "portrait.svg"), svg(128)),
  writeFile(path.join(visuals, "token.svg"), svg(64)),
]);
