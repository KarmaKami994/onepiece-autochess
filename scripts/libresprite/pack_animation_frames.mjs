import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [, , inputDirectory, outputFile] = process.argv;
if (!inputDirectory || !outputFile) {
  throw new Error("Usage: node pack_animation_frames.mjs <input-directory> <output.gif>");
}

const frames = (await readdir(inputDirectory))
  .filter((name) => /^frame-\d+\.svg$/.test(name))
  .sort()
  .map((name) => path.join(inputDirectory, name));
if (frames.length !== 17) throw new Error(`Expected 17 frames, found ${frames.length}`);

const delays = [170, 170, 170, 170, 90, 80, 110, 100, 110, 100, 90, 120, 120, 150, 100, 120, 220];
await sharp(frames, { join: { animated: true } })
  .gif({ delay: delays, loop: 0, dither: 0 })
  .toFile(outputFile);
