import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ICON_FAMILIES, ICON_PILOTS, iconCataloguePath, iconSourcePath, readPixelIcon } from "./pixel_icon_source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const records = [], inputs = [];
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
async function pin(file) { const bytes = await readFile(path.join(root, file)); return { path: file, bytes: bytes.length, sha256: sha(bytes) }; }
async function sheet(entries, name) {
  const columns = 5, width = 224, height = 140;
  const overlays = [];
  for (const [index, entry] of entries.entries()) {
    const left = index % columns * width, top = Math.floor(index / columns) * height;
    const label = escape(entry.id.replaceAll("-", " "));
    const caption = `<svg xmlns="http://www.w3.org/2000/svg" width="224" height="140"><rect width="224" height="140" fill="#101827"/><rect x="112" width="112" height="104" fill="#f1e9d6"/><g fill="#f8e7bc" font-family="monospace" font-size="10"><text x="5" y="119" textLength="${Math.min(210, label.length * 6)}" lengthAdjust="spacingAndGlyphs">${label}</text><text x="5" y="134">24 / 32 / 48 px · dark / light</text></g></svg>`;
    overlays.push({ input: Buffer.from(caption), left, top });
    for (const offset of [0, 112]) for (const [i, size] of [24, 32, 48].entries()) {
      const x = [2, 28, 62][i];
      overlays.push({ input: await sharp(path.join(root, entry.path)).resize(size, size, { kernel: "nearest" }).png().toBuffer(), left: left + offset + x, top: top + Math.round((104 - size) / 2) });
    }
  }
  await sharp({ create: { width: columns * width, height: Math.ceil(entries.length / columns) * height, channels: 4, background: "#101827" } }).composite(overlays).png().toFile(path.join(root, `art/qa/b12/${name}.png`));
}

await mkdir(path.join(root, "art/qa/b12"), { recursive: true });
for (const [family, key] of Object.entries(ICON_FAMILIES)) {
  const cataloguePath = iconCataloguePath(family);
  const catalogue = JSON.parse(await readFile(path.join(root, cataloguePath), "utf8"));
  inputs.push(await pin(cataloguePath));
  await mkdir(path.join(root, `public/assets/${family}`), { recursive: true });
  for (const spec of catalogue[key]) {
    const runtimePath = `public/assets/${family}/${spec.id}.svg`;
    await writeFile(path.join(root, runtimePath), await readPixelIcon(root, family, spec));
    const sourcePath = iconSourcePath(family, spec.id);
    const retainedPilot = family === "items" && ICON_PILOTS.has(spec.id);
    records.push({ family, id: spec.id, kind: spec.kind, traitBadge: spec.traitBadge, retainedPilot,
      source: await pin(sourcePath), master: await pin(sourcePath.replace(/\.json$/, ".png")), editableSvg: await pin(sourcePath.replace(/\.json$/, ".svg")),
      ...(retainedPilot ? { original: await pin(`art/production/b10/icons/${spec.id}.svg`) } : {}), output: await pin(runtimePath) });
  }
  await sheet(records.filter(r => r.family === family).map(r => ({ id: r.id, path: r.output.path })), family);
}
await sheet(records.filter(r => r.family === "items" && /prism|cola|book|codex|grimoire|sash|blade|goggles|scope/.test(r.id)).map(r => ({ id: r.id, path: r.output.path })), "identity-comparisons");
for (const file of ["scripts/assets/author_b12_icons.mjs", "scripts/assets/pixel_icon_source.mjs", "scripts/assets/build_b12_icons.mjs", "scripts/assets/build_food_icons.mjs"]) inputs.push(await pin(file));
await writeFile(path.join(root, "art/production/b12/provenance.json"), JSON.stringify({
  author: "One Piece Auto Chess project", permission: "Original project-authored pixel artwork; no external download, tracing, provider or new licence dependency. Three accepted B10 icon masters retained byte-for-byte at runtime.",
  contract: "48px editable palette/rows; upper-left light, warm outline, up to four tones per material; exact integer 2x rectangle SVG export, transparent margin; no embedded raster or external requests.",
  catalogue: "Existing art/ui-icons/*-icons.json only; IDs, kind, traitBadge and fallback mapping unchanged. Outputs are evidence, not a second maintained item catalogue.",
  inputs, outputs: records,
}, null, 2) + "\n");
// Preserve the existing food provenance interface used by validation and B09.
const foodSource = JSON.parse(await readFile(path.join(root, "art/ui-icons/food-icons.json"), "utf8"));
await writeFile(path.join(root, "art/ui-icons/food-provenance.json"), JSON.stringify({
  author: foodSource.author, permission: foodSource.permission,
  sourcePath: iconCataloguePath("food"), sourceSha256: sha(await readFile(path.join(root, iconCataloguePath("food")))),
  generatorPath: "scripts/assets/build_food_icons.mjs", generatorSha256: sha(await readFile(path.join(root, "scripts/assets/build_food_icons.mjs"))),
  outputs: records.filter(r => r.family === "food").map(r => ({ id: r.id, path: r.output.path, sha256: r.output.sha256 })),
}, null, 2) + "\n");
process.stdout.write(`Exported ${records.length} frozen B12 icons and source/output hashes, reusing three B10 pilots.\n`);
