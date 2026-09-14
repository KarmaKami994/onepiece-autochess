import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { tsImport } from "tsx/esm/api";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const animationsRoot = path.join(publicRoot, "assets", "animations");

async function requireFile(file) {
  await access(file);
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function validateImage(file, expectedWidth, expectedHeight) {
  await requireFile(file);
  const metadata = await sharp(file).metadata();
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(`${path.relative(root, file)} is ${metadata.width}x${metadata.height}; expected ${expectedWidth}x${expectedHeight}`);
  }
}

async function validateAnimation(directory) {
  const name = path.basename(directory);
  const manifestPath = path.join(directory, `${name}.json`);
  const imagePath = path.join(directory, `${name}.png`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.meta?.size) {
    await validateImage(imagePath, manifest.meta.size.w, manifest.meta.size.h);
    if (!Array.isArray(manifest.frames) || manifest.frames.length === 0) throw new Error(`${name} has no animation frames`);
    return;
  }
  const frame = manifest.frame;
  if (!frame || manifest.frameCount !== 46 || !Array.isArray(manifest.frames) || manifest.frames.length !== 46) throw new Error(`${name} has invalid v2 metadata`);
  const columns = frame.columns ?? 8;
  await validateImage(imagePath, frame.width * columns, frame.height * Math.ceil(manifest.frameCount / columns));
  const atlas = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const clipName of ["idle", "move", "attack", "cast", "hit", "defeat"]) {
    const clip = manifest.clips?.[clipName];
    if (!clip) throw new Error(`${name} is missing ${clipName}`);
    let visible = false;
    for (let index = clip.start; index <= clip.end && !visible; index += 1) {
      const frameX = (index % columns) * frame.width;
      const frameY = Math.floor(index / columns) * frame.height;
      for (let y = 0; y < frame.height && !visible; y += 1) {
        for (let x = 0; x < frame.width; x += 1) {
          if (atlas.data[((frameY + y) * atlas.info.width + frameX + x) * atlas.info.channels + 3] > 0) {
            visible = true;
            break;
          }
        }
      }
    }
    if (!visible) throw new Error(`${name} has a fully transparent ${clipName} clip`);
  }
}

async function validateSvg(file, square = true) {
  const source = await readFile(file, "utf8");
  if (!/^<svg\b/.test(source) || !source.includes("</svg>")) throw new Error(`${path.relative(root, file)} is not an SVG document`);
  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) throw new Error(`${path.relative(root, file)} is missing the SVG image namespace`);
  const externalContent = source.replace('xmlns="http://www.w3.org/2000/svg"', "");
  if (/<script\b|javascript:|https?:\/\/|data:image|<foreignObject\b/i.test(externalContent)) throw new Error(`${path.relative(root, file)} contains an unsafe SVG construct`);
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/\s+/).map(Number);
  if (square && (!viewBox || viewBox.length !== 4 || viewBox[2] !== viewBox[3])) throw new Error(`${path.relative(root, file)} must have a square viewBox`);
}

async function validateCarousel() {
  const manifest = JSON.parse(await readFile(path.join(publicRoot, "assets", "carousel", "carousel-manifest.json"), "utf8"));
  for (const key of ["arena", "boats", "bounties"]) {
    const asset = manifest[key];
    await validateImage(path.join(publicRoot, asset.file.replace(/^\//, "")), asset.width, asset.height);
  }
}

const [{ DEFAULT_CONTENT }, animationManifest] = await Promise.all([
  tsImport(pathToFileURL(path.join(root, "game", "content.ts")).href, import.meta.url),
  tsImport(pathToFileURL(path.join(root, "components", "crewAnimationManifest.ts")).href, import.meta.url),
]);
const sourceMatrix = JSON.parse(await readFile(path.join(root, "art", "animation-v2", "source-matrix.json"), "utf8"));
const itemSpecs = JSON.parse(await readFile(path.join(root, "art", "ui-icons", "item-icons.json"), "utf8"));
const traitSpecs = JSON.parse(await readFile(path.join(root, "art", "ui-icons", "trait-icons.json"), "utf8"));
const statusSpecs = JSON.parse(await readFile(path.join(root, "art", "ui-icons", "status-icons.json"), "utf8"));

if (DEFAULT_CONTENT.units.length !== 34) throw new Error(`Expected 34 units, found ${DEFAULT_CONTENT.units.length}`);
for (const unit of DEFAULT_CONTENT.units) {
  if (unit.assetPath.endsWith("/placeholder.svg")) throw new Error(`${unit.id} still uses the production placeholder`);
  await requireFile(path.join(publicRoot, unit.assetPath.replace(/^\//, "")));
  await requireFile(path.join(publicRoot, "assets", "portraits", `${unit.id}.png`));
  await requireFile(path.join(publicRoot, "assets", "tokens", `${unit.id}.png`));
  const preferred = animationManifest.getCrewAnimationDefinition(unit.id);
  if (preferred?.version !== "v2") throw new Error(`${unit.id} lacks preferred v2 animation`);
  await requireFile(path.join(publicRoot, preferred.sheetPath.replace(/^\//, "")));
}

if (DEFAULT_CONTENT.enemies.length !== 29) throw new Error(`Expected 29 PvE enemy profiles, found ${DEFAULT_CONTENT.enemies.length}`);
for (const enemy of DEFAULT_CONTENT.enemies) {
  if (enemy.assetPath.endsWith("/placeholder.svg")) throw new Error(`${enemy.id} still uses the production placeholder`);
  await requireFile(path.join(publicRoot, enemy.assetPath.replace(/^\//, "")));
  await requireFile(path.join(publicRoot, "assets", "portraits", `${enemy.id}.png`));
  await requireFile(path.join(publicRoot, "assets", "tokens", `${enemy.id}.png`));
  if (animationManifest.getCrewAnimationDefinition(enemy.id)?.version !== "v2") throw new Error(`${enemy.id} lacks preferred v2 animation`);
}

const itemIds = DEFAULT_CONTENT.items.map((item) => item.id).sort();
const specItemIds = itemSpecs.items.map((item) => item.id).sort();
if (itemIds.length !== 65 || JSON.stringify(itemIds) !== JSON.stringify(specItemIds)) throw new Error("Item icon specs must exactly cover all 65 items");
if (DEFAULT_CONTENT.items.filter((item) => item.kind === "component").length !== 10 || DEFAULT_CONTENT.items.filter((item) => item.kind === "completed").length !== 55) throw new Error("Expected 10 components and 55 completed items");
const runtimeItemNames = (await readdir(path.join(publicRoot, "assets", "items"))).filter((name) => name.endsWith(".svg")).map((name) => name.slice(0, -4)).sort();
if (JSON.stringify(runtimeItemNames) !== JSON.stringify(itemIds)) throw new Error("Runtime item SVGs contain an orphan or missing item ID");
for (const itemId of itemIds) await validateSvg(path.join(publicRoot, "assets", "items", `${itemId}.svg`));

const traitIds = DEFAULT_CONTENT.traits.map((trait) => trait.id).sort();
const specTraitIds = traitSpecs.traits.map((trait) => trait.id).sort();
if (traitIds.length !== 13 || JSON.stringify(traitIds) !== JSON.stringify(specTraitIds)) throw new Error("Trait visuals must exactly cover all 13 traits");
for (const traitId of traitIds) await validateSvg(path.join(publicRoot, "assets", "traits", `${traitId}.svg`));

if (DEFAULT_CONTENT.forms.length !== 4) throw new Error(`Expected four forms, found ${DEFAULT_CONTENT.forms.length}`);
for (const form of DEFAULT_CONTENT.forms) {
  if (!form.presentation?.portrait || !form.presentation?.token) throw new Error(`${form.id} lacks form presentation paths`);
  await validateSvg(path.join(publicRoot, form.presentation.portrait.replace(/^\//, "")));
  await validateSvg(path.join(publicRoot, form.presentation.token.replace(/^\//, "")));
  await validateSvg(path.join(publicRoot, "assets", "forms", form.id, "overlay.svg"));
}
for (const status of statusSpecs.statuses) await validateSvg(path.join(publicRoot, "assets", "status", `${status.id}.svg`));

for (const entry of sourceMatrix.entries) {
  const source = path.join(root, entry.source.localPath);
  await requireFile(source);
  if (await sha256(source) !== entry.source.sha256) throw new Error(`${entry.id} source SHA-256 does not match the source matrix`);
  if (!entry.permission?.status || !entry.permission?.note) throw new Error(`${entry.id} lacks permission provenance`);
  if (entry.source.sheetUrl && (!entry.source.contributor || !entry.source.dimensions)) throw new Error(`${entry.id} lacks source-page provenance`);
}

await Promise.all([
  requireFile(path.join(root, "ASSET_PROVENANCE.md")),
  requireFile(path.join(root, "ASSET_LICENSE.md")),
  requireFile(path.join(publicRoot, "assets", "maps", "pirate-ship.png")),
  requireFile(path.join(publicRoot, "assets", "maps", "marine-harbor.png")),
  ...["p7-crew-contact-sheet.png", "p7-pve-contact-sheet.png", "p7-item-contact-sheet.png", "p7-trait-status-contact-sheet.png", "p12-pve-contact-sheet.png"].map((file) => requireFile(path.join(root, "art", "qa", file))),
]);
const animationEntries = await readdir(animationsRoot, { withFileTypes: true });
await Promise.all(animationEntries.filter((entry) => entry.isDirectory()).map((entry) => validateAnimation(path.join(animationsRoot, entry.name))));
await validateCarousel();
process.stdout.write(`Validated ${DEFAULT_CONTENT.units.length} crew, ${DEFAULT_CONTENT.enemies.length} PvE, ${itemIds.length} item, ${traitIds.length} trait, ${DEFAULT_CONTENT.forms.length} form assets, ${animationEntries.filter((entry) => entry.isDirectory()).length} animation atlases, status icons, maps, Carousel assets, and provenance inputs.\n`);
