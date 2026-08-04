import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error(`Missing --${name}`);
  }
  return path.resolve(process.argv[index + 1]);
}

const sourcePath = argument("source");
const mapPath = argument("map");
const sheetPath = argument("sheet");
const metadataPath = argument("metadata");
const framesDirectory = argument("frames-dir");
const gifPath = argument("gif");

const mapping = JSON.parse(await readFile(mapPath, "utf8"));
const sourceBytes = await readFile(sourcePath);
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
if (sourceSha256 !== mapping.sourceSha256) {
  throw new Error(`Unexpected source SHA-256 ${sourceSha256}`);
}
const sourceMetadata = await sharp(sourcePath).metadata();
if (
  sourceMetadata.width !== mapping.sourceDimensions.width ||
  sourceMetadata.height !== mapping.sourceDimensions.height
) {
  throw new Error(
    `Unexpected source dimensions ${sourceMetadata.width}x${sourceMetadata.height}`,
  );
}

const [backgroundRed, backgroundGreen, backgroundBlue] = mapping.backgroundRgb;
const frameWidth = mapping.frame.width;
const frameHeight = mapping.frame.height;
const columns = mapping.frame.columns;
const rows = Math.ceil(mapping.frames.length / columns);
const destinationPivot = mapping.frame.destinationPivot;
const renderedFrames = [];

await mkdir(path.dirname(sheetPath), { recursive: true });
await mkdir(path.dirname(metadataPath), { recursive: true });
await mkdir(framesDirectory, { recursive: true });

for (const [index, frame] of mapping.frames.entries()) {
  const { sourceRect, sourcePivot } = frame;
  const extracted = await sharp(sourcePath)
    .extract({
      left: sourceRect.x,
      top: sourceRect.y,
      width: sourceRect.width,
      height: sourceRect.height,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(sourceRect.width * sourceRect.height * 4);
  for (let pixel = 0; pixel < sourceRect.width * sourceRect.height; pixel += 1) {
    const sourceOffset = pixel * extracted.info.channels;
    const outputOffset = pixel * 4;
    const red = extracted.data[sourceOffset];
    const green = extracted.data[sourceOffset + 1];
    const blue = extracted.data[sourceOffset + 2];
    const isBackground =
      red === backgroundRed &&
      green === backgroundGreen &&
      blue === backgroundBlue;
    rgba[outputOffset] = red;
    rgba[outputOffset + 1] = green;
    rgba[outputOffset + 2] = blue;
    rgba[outputOffset + 3] = isBackground ? 0 : 255;
  }

  const left = destinationPivot.x - (sourcePivot.x - sourceRect.x);
  const top = destinationPivot.y - (sourcePivot.y - sourceRect.y);
  if (
    left < 0 ||
    top < 0 ||
    left + sourceRect.width > frameWidth ||
    top + sourceRect.height > frameHeight
  ) {
    throw new Error(
      `Frame ${index} does not fit ${frameWidth}x${frameHeight}: ${JSON.stringify({ left, top, sourceRect })}`,
    );
  }

  const png = await sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: rgba,
        raw: {
          width: sourceRect.width,
          height: sourceRect.height,
          channels: 4,
        },
        left,
        top,
      },
    ])
    .png({ palette: true, colours: 256, dither: 0 })
    .toBuffer();
  const framePath = path.join(
    framesDirectory,
    `frame-${String(index).padStart(2, "0")}.png`,
  );
  await writeFile(framePath, png);
  renderedFrames.push({ png, path: framePath, left, top });
}

await sharp({
  create: {
    width: frameWidth * columns,
    height: frameHeight * rows,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(
    renderedFrames.map((frame, index) => ({
      input: frame.png,
      left: (index % columns) * frameWidth,
      top: Math.floor(index / columns) * frameHeight,
    })),
  )
  .png({ palette: true, colours: 256, dither: 0 })
  .toFile(sheetPath);

await sharp(
  renderedFrames.map((frame) => frame.path),
  { join: { animated: true } },
)
  .gif({
    delay: mapping.frames.map((frame) => frame.durationMs),
    loop: 0,
    dither: 0,
  })
  .toFile(gifPath);

const metadata = {
  schemaVersion: mapping.schemaVersion,
  source: mapping.source,
  sourceSha256,
  sourceDimensions: mapping.sourceDimensions,
  backgroundRgb: mapping.backgroundRgb,
  frame: mapping.frame,
  frameCount: mapping.frames.length,
  clips: mapping.clips,
  frames: mapping.frames.map((frame, index) => ({
    index,
    state: frame.state,
    durationMs: frame.durationMs,
    sourceRect: frame.sourceRect,
    sourcePivot: frame.sourcePivot,
    destination: {
      x: renderedFrames[index].left,
      y: renderedFrames[index].top,
    },
  })),
};
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(
  `Built ${renderedFrames.length} frames at ${frameWidth}x${frameHeight}`,
);
