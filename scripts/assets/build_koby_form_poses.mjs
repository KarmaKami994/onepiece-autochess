import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = await readFile(path.join(root, "art/licensed-reference/treasure-cruise/Coby-4250.png"));
const sourceSha = "85e3455d437298754df1f9681a847acfef68c1ad53ea5e02c44c3b161a3d5d8a";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (hash(source) !== sourceSha) throw new Error("Unexpected Koby #4250 source SHA-256.");

// Source rectangle followed by the planted-foot pivot in sheet coordinates.
const poses = {
  calm: [6, 524, 105, 190, 53, 709],
  ready: [130, 525, 104, 190, 177, 709],
  poised: [419, 527, 108, 190, 469, 714],
  watch: [529, 527, 104, 190, 578, 714],
  stride: [540, 189, 133, 165, 600, 350],
  strideBack: [676, 189, 126, 165, 734, 350],
  step: [806, 337, 135, 169, 865, 500],
  guard: [166, 351, 132, 168, 228, 515],
  brace: [4, 356, 126, 163, 62, 514],
  launch: [167, 184, 162, 163, 243, 343],
  leap: [835, 4, 172, 178, 922, 170],
  punch: [331, 189, 208, 116, 411, 305],
};

// Each clip preserves the 6/8/8/12/4/8 v2 frame contract.
const sequences = {
  idle: ["calm", "ready", "poised", "watch", "poised", "ready"],
  move: ["stride", "strideBack", "step", "strideBack", "stride", "strideBack", "step", "guard"],
  attack: ["guard", "step", "launch", "punch", "punch", "strideBack", "guard", "ready"],
  cast: ["brace", "guard", "leap", "launch", "launch", "impact", "impact", "punch", "stride", "guard", "poised", "ready"],
  hit: ["hit", "hit", "brace", "ready"],
  defeat: ["brace", "hit", "fall1", "fall2", "fall3", "fall4", "fall4", "fall4"],
};
const supplements = {
  impact: { sourcePose: "punch", lightning: true },
  hit: { sourcePose: "brace", x: -3, y: 2 },
  fall1: { sourcePose: "brace", x: -3, y: 8 },
  fall2: { sourcePose: "brace", x: -6, y: 18 },
  fall3: { sourcePose: "brace", x: -8, y: 30 },
  fall4: { sourcePose: "brace", x: -8, y: 45 },
};

async function scaledCrop(left, top, width, height, outputWidth, outputHeight) {
  const pixels = await sharp(source).extract({ left, top, width, height }).png().toBuffer();
  return sharp(pixels).resize(outputWidth, outputHeight, { fit: "fill", kernel: "nearest" }).png().toBuffer();
}

const lightning = await scaledCrop(7, 185, 151, 162, 34, 36);
const frameSize = 128;
const anchor = { x: 64, y: 116 };
const scale = 0.42;
const bodyFrames = new Map();
for (const poseId of new Set(Object.values(sequences).flat())) {
  const supplement = supplements[poseId];
  const [left, top, width, height, pivotX, pivotY] = poses[supplement?.sourcePose ?? poseId];
  const outputWidth = Math.round(width * scale);
  const outputHeight = Math.round(height * scale);
  const drawTop = anchor.y - Math.round((pivotY - top) * scale) + (supplement?.y ?? 0);
  const drawLeft = anchor.x - Math.round((pivotX - left) * scale) + (supplement?.x ?? 0);
  const sprite = await scaledCrop(left, top, width, height, outputWidth, outputHeight);
  const visibleHeight = Math.min(outputHeight, frameSize - drawTop);
  const input = visibleHeight === outputHeight ? sprite : await sharp(sprite)
    .extract({ left: 0, top: 0, width: outputWidth, height: visibleHeight }).png().toBuffer();
  const layers = [{ input, left: drawLeft, top: drawTop }];
  if (supplement?.lightning) layers.push({ input: lightning, left: 92, top: 45 });
  const frame = await sharp({ create: { width: frameSize, height: frameSize, channels: 4, background: "#00000000" } })
    .composite(layers).png().toBuffer();
  bodyFrames.set(poseId, frame);
}

const columns = 6;
const xyForIndex = (index) => ({ x: (index % columns) * frameSize, y: Math.floor(index / columns) * frameSize });
const uniqueIds = [...bodyFrames.keys()];
const poseSheet = await sharp({
  create: { width: columns * frameSize, height: Math.ceil(uniqueIds.length / columns) * frameSize, channels: 4, background: "#00000000" },
}).composite(uniqueIds.map((id, index) => {
  const { x, y } = xyForIndex(index);
  return { input: bodyFrames.get(id), left: x, top: y };
})).png().toBuffer();
const frames = Object.entries(sequences).flatMap(([state, sequence]) => sequence.map((poseId) => {
  const { x, y } = xyForIndex(uniqueIds.indexOf(poseId));
  return { state, poseId, sourceRect: { x, y, width: frameSize, height: frameSize }, sourcePivot: { x: x + anchor.x, y: y + anchor.y } };
}));

async function svgPixels(input, width, height, xOffset, yOffset) {
  const indexed = await sharp(input).resize(width, height, { fit: "inside", kernel: "nearest" })
    .png({ palette: true, colours: 96, dither: 0 }).toBuffer();
  const { data, info } = await sharp(indexed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colours = new Map();
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width;) {
      const start = x;
      const pixel = data.subarray((y * info.width + x) * 4, (y * info.width + x + 1) * 4);
      x++;
      while (x < info.width && data.subarray((y * info.width + x) * 4, (y * info.width + x + 1) * 4).equals(pixel)) x++;
      if (pixel[3] < 128) continue;
      const colour = pixel.subarray(0, 3).toString("hex");
      const segments = colours.get(colour) ?? [];
      segments.push(`M${xOffset + start} ${yOffset + y}h${x - start}v1h-${x - start}z`);
      colours.set(colour, segments);
    }
  }
  return [...colours].map(([colour, segments]) => `<path fill="#${colour}" d="${segments.join("")}"/>`).join("");
}

const body = await sharp(bodyFrames.get("calm")).trim({ background: "#00000000" }).png().toBuffer();
const portraitBody = await svgPixels(body, 31, 45, 19, 11);
const overlay = await svgPixels(lightning, 27, 28, 35, 16);
const svg = (size, contents) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" shape-rendering="crispEdges"><title>Koby — Honesty Impact</title>${contents}</svg>\n`;
const artDirectory = path.join(root, "art/production/koby-honesty-impact");
const visualDirectory = path.join(root, "public/assets/forms/koby-honesty-impact");
await Promise.all([mkdir(artDirectory, { recursive: true }), mkdir(visualDirectory, { recursive: true })]);
await Promise.all([
  writeFile(path.join(artDirectory, "poses.png"), poseSheet),
  writeFile(path.join(artDirectory, "frame-map.json"), `${JSON.stringify({ schemaVersion: 1, frames }, null, 2)}\n`),
  writeFile(path.join(visualDirectory, "portrait.svg"), svg(128, overlay + portraitBody)),
  writeFile(path.join(visualDirectory, "token.svg"), svg(64, overlay + portraitBody)),
  writeFile(path.join(visualDirectory, "overlay.svg"), svg(128, overlay)),
]);
