import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "assets", "maps");
const maps = [
  {
    source: path.join(
      root,
      "art",
      "generated",
      "maps",
      "pirate-ship-source.png",
    ),
    output: path.join(outputDirectory, "pirate-ship.png"),
  },
  {
    source: path.join(
      root,
      "art",
      "generated",
      "maps",
      "marine-harbor-source.png",
    ),
    output: path.join(outputDirectory, "marine-harbor.png"),
  },
];

await mkdir(outputDirectory, { recursive: true });

for (const map of maps) {
  await sharp(map.source)
    .resize(1520, 840, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.nearest,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(map.output);

  const metadata = await sharp(map.output).metadata();
  if (metadata.width !== 1520 || metadata.height !== 840) {
    throw new Error(`Unexpected board-map size for ${map.output}`);
  }
  console.log(`Built ${path.relative(root, map.output)} (1520x840)`);
}
