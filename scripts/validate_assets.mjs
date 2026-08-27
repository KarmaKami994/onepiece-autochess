import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const animationsRoot = path.join(root, "public", "assets", "animations");

async function requireFile(file) {
  await access(file);
}

async function validateImage(file, expectedWidth, expectedHeight) {
  await requireFile(file);
  const metadata = await sharp(file).metadata();
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(
      `${path.relative(root, file)} is ${metadata.width}x${metadata.height}; expected ${expectedWidth}x${expectedHeight}`,
    );
  }
}

async function validateAnimation(directory) {
  const name = path.basename(directory);
  const manifestPath = path.join(directory, `${name}.json`);
  const imagePath = path.join(directory, `${name}.png`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.meta?.size) {
    await validateImage(imagePath, manifest.meta.size.w, manifest.meta.size.h);
    if (!Array.isArray(manifest.frames) || manifest.frames.length === 0) {
      throw new Error(`${name} has no animation frames`);
    }
    return;
  }
  const frame = manifest.frame;
  if (!frame || !Number.isInteger(manifest.frameCount) || manifest.frameCount <= 0) {
    throw new Error(`${name} has invalid v2 metadata`);
  }
  const columns = frame.columns ?? 8;
  const rows = Math.ceil(manifest.frameCount / columns);
  await validateImage(imagePath, frame.width * columns, frame.height * rows);
  for (const clip of ["idle", "move", "attack", "cast", "hit", "defeat"]) {
    if (!manifest.clips?.[clip]) throw new Error(`${name} is missing ${clip}`);
  }
}

async function validateCarousel() {
  const manifestPath = path.join(
    root,
    "public",
    "assets",
    "carousel",
    "carousel-manifest.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const key of ["arena", "boats", "bounties"]) {
    const asset = manifest[key];
    const file = path.join(root, "public", asset.file.replace(/^\//, ""));
    await validateImage(file, asset.width, asset.height);
  }
}

await Promise.all([
  requireFile(path.join(root, "ASSET_PROVENANCE.md")),
  requireFile(path.join(root, "ASSET_LICENSE.md")),
  requireFile(path.join(root, "public", "assets", "maps", "pirate-ship.png")),
  requireFile(path.join(root, "public", "assets", "maps", "marine-harbor.png")),
]);
const entries = await readdir(animationsRoot, { withFileTypes: true });
await Promise.all(
  entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => validateAnimation(path.join(animationsRoot, entry.name))),
);
await validateCarousel();
process.stdout.write(
  `Validated ${entries.filter((entry) => entry.isDirectory()).length} animation atlases, maps, Carousel assets, and provenance files.\n`,
);
