// Local export of frozen B10 sources. No provider / network / draft generation.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { resolveExecutable, run } from "../asset_executables.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "art/production/b10");
const QA = path.join(ROOT, "art/qa/b10");
const curation = JSON.parse(await readFile(path.join(SOURCE, "curation.json"), "utf8"));
const matrix = JSON.parse(await readFile(path.join(ROOT, "art/animation-v2/source-matrix.json"), "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (file) => path.relative(ROOT, file).replaceAll("\\", "/");

async function pixelSvg(input, size, title) {
  // UI-sized derivative of the same master, with a compact path per colour.
  // Preserve the existing <=12KiB standalone SVG contract (no raster embeds).
  const { data, info } = await sharp(input).resize(48, 48, { kernel: sharp.kernel.nearest }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colours = new Map();
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width;) {
      const start = x, offset = (y * info.width + x) * 4;
      const pixel = data.subarray(offset, offset + 4);
      x += 1;
      while (x < info.width && data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4).equals(pixel)) x += 1;
      if (pixel[3]) {
        const colour = pixel.subarray(0, 3).toString("hex");
        const runs = colours.get(colour) ?? [];
        runs.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
        colours.set(colour, runs);
      }
    }
  }
  const paths = [...colours].map(([colour, runs]) => `<path fill="#${colour}" d="${runs.join("")}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${info.width} ${info.height}" shape-rendering="crispEdges"><title>${title}</title>${paths}</svg>\n`;
}
const editable = process.argv.includes("--editable");
if (editable && process.platform === "win32") {
  // LibreSprite writes its brush/preferences on exit, including in batch mode.
  // Keep those authoring-only files inside the ignored local tool directory.
  process.env.APPDATA = path.join(ROOT, ".codex-local/b10-editor");
  await mkdir(process.env.APPDATA, { recursive: true });
}
const libreSprite = editable ? await resolveExecutable({
  label: "LibreSprite", environmentVariable: "LIBRESPRITE_PATH", projectRoot: ROOT,
  localCandidates: [".codex-local/tools/LibreSprite-v1.1/libresprite.exe"],
  pathCandidates: ["libresprite", "aseprite"],
}) : null;
await mkdir(QA, { recursive: true });

const outputs = [];
const comparisons = [];
for (const pilot of curation.pilots) {
  const entry = matrix.entries.find((candidate) => candidate.pilotFor === pilot.id);
  if (!entry) throw new Error(`Missing pinned source entry: ${pilot.id}`);
  const directory = path.join(SOURCE, pilot.id);
  const output = path.join(ROOT, "public/assets/animations", entry.outputAssetKey);
  const qa = path.join(QA, pilot.id);
  await mkdir(output, { recursive: true }); await mkdir(qa, { recursive: true });
  const gif = path.join(qa, "all-clips.gif");
  const frames = path.join(ROOT, "tmp/b10-export", pilot.id);
  await run(process.execPath, [path.join(ROOT, "scripts/assets/build_v2_animation.mjs"),
    "--asset", entry.id, "--strict", "--sheet", path.join(output, `${entry.outputAssetKey}.png`),
    "--metadata", path.join(output, `${entry.outputAssetKey}.json`), "--frames-dir", frames, "--gif", gif,
  ], { cwd: ROOT });
  const metadata = JSON.parse(await readFile(path.join(output, `${entry.outputAssetKey}.json`), "utf8"));
  for (const [state, clip] of Object.entries(metadata.clips)) {
    const paths = Array.from({ length: clip.end - clip.start + 1 }, (_, index) => path.join(frames, `frame-${String(index + clip.start).padStart(2, "0")}.png`));
    await sharp(paths, { join: { animated: true } }).gif({ delay: paths.map(() => Math.round(1000 / clip.frameRate)), loop: 0, dither: 0 }).toFile(path.join(qa, `${state}.gif`));
  }
  // The drawing source is authoritative. Normal exports must not overwrite it.
  if (editable) {
    await run(libreSprite, ["-b", gif, "--save-as", path.join(directory, "body.aseprite")], { cwd: ROOT });
    await copyFile(path.join(directory, "body.aseprite"), path.join(ROOT, "art/libresprite", `${entry.outputAssetKey}.aseprite`));
  }
  const staticRoot = path.join(ROOT, "public/assets/pilots/b10", pilot.id);
  await mkdir(staticRoot, { recursive: true });
  for (const [name, size] of [["portrait", 320], ["token", 160]]) {
    await sharp(path.join(directory, "master.png")).resize(size, size, { kernel: sharp.kernel.nearest }).png().toFile(path.join(staticRoot, `${name}.png`));
    if (pilot.formId) {
      const svg = await pixelSvg(path.join(directory, "master.png"), size, "Robin Demonio Fleur");
      await writeFile(path.join(directory, `${name}.svg`), svg);
      await writeFile(path.join(ROOT, "public/assets/forms", pilot.formId, `${name}.svg`), svg);
    }
  }
  const old = await sharp(path.join(ROOT, "public/assets/animations", `${pilot.baseId}-v2`, `${pilot.baseId}-v2.png`)).extract({ left: 0, top: 0, width: 128, height: 128 }).png().toBuffer();
  const master = await readFile(path.join(directory, "master.png"));
  const cells = [];
  for (const [index, bytes] of [old, master].entries()) {
    cells.push({ input: bytes, left: index * 128, top: 0 });
    cells.push({ input: await sharp(bytes).resize(pilot.id === "kaido" ? 108 : 88, pilot.id === "kaido" ? 108 : 88, { kernel: sharp.kernel.nearest }).png().toBuffer(), left: index * 128 + 12, top: 148 });
  }
  await sharp({ create: { width: 256, height: 280, channels: 4, background: "#182838" } }).composite(cells).png().toFile(path.join(qa, "before-after.png"));
  comparisons.push({ input: await readFile(path.join(qa, "before-after.png")), left: comparisons.length * 256, top: 40 });
  await copyFile(path.join(directory, "body-poses.png"), path.join(qa, "poses.png"));
  const files = [path.join(output, `${entry.outputAssetKey}.png`), path.join(output, `${entry.outputAssetKey}.json`), path.join(directory, "body-poses.png"), path.join(directory, "frame-map.json"), path.join(directory, "draft.png"), path.join(directory, "prompt.txt"), path.join(directory, "master.png"), path.join(directory, "fx-poses.png"), path.join(directory, "body.aseprite"), path.join(staticRoot, "portrait.png"), path.join(staticRoot, "token.png"), gif,
    ...Object.keys(metadata.clips).map((state) => path.join(qa, `${state}.gif`)),
    ...(pilot.formId ? [path.join(directory, "portrait.svg"), path.join(directory, "token.svg"), path.join(ROOT, "public/assets/forms", pilot.formId, "portrait.svg"), path.join(ROOT, "public/assets/forms", pilot.formId, "token.svg")] : []),
  ];
  for (const file of files) {
    const bytes = await readFile(file); outputs.push({ path: relative(file), bytes: bytes.length, sha256: hash(bytes) });
  }
}
const labels = '<svg xmlns="http://www.w3.org/2000/svg" width="768" height="40"><rect width="768" height="40" fill="#101827"/><g fill="#f2e6c8" font-family="monospace" font-size="14"><text x="20" y="25">KOALA: OLD / PILOT</text><text x="276" y="25">KAIDO: OLD / PILOT</text><text x="522" y="25">ROBIN: BASE / DEMONIO</text></g></svg>';
await sharp({ create: { width: 768, height: 320, channels: 4, background: "#182838" } }).composite([...comparisons, { input: Buffer.from(labels), left: 0, top: 0 }]).png().toFile(path.join(QA, "style-card.png"));
const iconComposites = [];
for (const [index, id] of ["sea-prism-shard", "black-blade", "emperors-jolly-roger"].entries()) {
  const masterPath = path.join(SOURCE, "icons", `${id}.svg`);
  const svg = await readFile(masterPath, "utf8");
  const runtimePath = path.join(ROOT, "public/assets/items", `${id}.svg`);
  await writeFile(runtimePath, svg.replace('width="48" height="48"', 'width="96" height="96"'));
  for (const [row, size] of [24, 32, 48, 96].entries()) iconComposites.push({ input: await sharp(Buffer.from(svg)).resize(size, size, { kernel: sharp.kernel.nearest }).png().toBuffer(), left: index * 128 + (128 - size) / 2, top: row * 112 });
  for (const file of [masterPath, runtimePath]) {
    const bytes = await readFile(file); outputs.push({ path: relative(file), bytes: bytes.length, sha256: hash(bytes) });
  }
}
await sharp({ create: { width: 384, height: 448, channels: 4, background: "#101827" } }).composite(iconComposites).png().toFile(path.join(QA, "icon-sizes.png"));
await writeFile(path.join(SOURCE, "outputs.json"), JSON.stringify({ schemaVersion: 1, outputs }, null, 2) + "\n");
const referenceInputs = JSON.parse(await readFile(path.join(SOURCE, "references/inputs.json"), "utf8"));
const references = [];
for (const input of referenceInputs) {
  const original = matrix.entries.find((entry) => entry.id === input.id);
  references.push({ ...input, sha256: hash(await readFile(path.join(ROOT, input.path))), sourcePage: original.source.sheetUrl, contributor: original.source.contributor, permission: original.permission });
}
await writeFile(path.join(SOURCE, "provenance.json"), JSON.stringify({
  schemaVersion: 1, date: "2026-11-11", base: "74cea3577eba98a07911b2d488abd3ece20b373d",
  tool: "built-in image_gen", modelIdentifier: null, modelIdentifierNote: "Not exposed by the tool; no model/version or seed invented.", seed: null,
  pixelLabAvailability: "No active tool and no plugin search result; not used.",
  attemptsPerIdentity: 1, requestedCanvas: { width: 1536, height: 1536 }, actualCanvas: { width: 1254, height: 1254 }, transparentBackground: true,
  references, prompts: curation.pilots.map((pilot) => ({ id: pilot.id, path: `art/production/b10/${pilot.id}/prompt.txt`, mode: "referenced draft, then local curation", references: pilot.id === "kaido" ? ["art/licensed-reference/great-pirate-colosseum/Kaido.png", referenceInputs.find((input) => input.id === "zoro").path] : [referenceInputs.find((input) => input.id === pilot.baseId).path, referenceInputs.find((input) => input.id === "zoro").path] })),
  classification: "AI-assisted derived body poses; original sheets retained; icons project-authored vector/pixel masters.",
  localExport: "Frozen body-poses.png + explicit SHA-pinned frame-map; no generation/provider call in build, CI or game.",
  curation: "curation.json; hard alpha, connected-body cleanup, fixed per-identity scale, registered anchor, shared palette; manual clip selection, holds explicit.",
  reviewStatus: "owner-style-review-pending; not a claim of approved visual quality or passed browser/tests",
  outputs: "art/production/b10/outputs.json",
}, null, 2) + "\n");
const provenancePath = path.join(ROOT, "ASSET_PROVENANCE.md");
const oldNotes = await readFile(provenancePath, "utf8");
const marker = "<!-- B10 authored pilots -->";
const rows = curation.pilots.map((pilot) => {
  const entry = matrix.entries.find((candidate) => candidate.pilotFor === pilot.id);
  const atlasPath = `public/assets/animations/${entry.outputAssetKey}/${entry.outputAssetKey}.png`;
  return `| \`${entry.outputAssetKey}\` | \`${entry.source.localPath}\` | \`${entry.source.sha256}\` | \`${outputs.find((output) => output.path === atlasPath).sha256}\` | \`art/libresprite/${entry.outputAssetKey}.aseprite\` |`;
});
const notes = `${marker}\n## B10 frozen authored pilots — 2026-11-11\n\nExisting licensed-reference PNGs and prior runtime atlases remain unchanged. Koala / Kaido support sheets and Robin / Zoro full-sheet sprites are identity/style references; the new bodies are AI-assisted derivatives, not original rips. Kaido uses the owner-requested https://spritedatabase.net/file/21137, contributor Megadoomer; exact original/reference hashes, permission attestations, prompts, unexposed model/seed and pending owner review are recorded in \`art/production/b10/provenance.json\`. No PixelLab/provider runtime dependency. Pinned local export, not identical AI regeneration, is reproducible.\n\n| Pilot | Frozen source | Source SHA-256 | Runtime atlas SHA-256 | Editable working copy |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\nThree project-authored 48px icon masters (Sea-Prism Shard, Black Blade, Emperor's Jolly Roger) preserve item IDs, runtime SVG paths and glyph fallback. Demonio's static SVG identity derives from the same master; old badges and icons remain under \`art/production/b10/*/legacy\`. Full export hashes, maps and GIFs: \`art/production/b10/outputs.json\`. Contract/style/inventory: \`docs/B10_ASSET_PRODUKTION.md\`. No gameplay or new asset licence claim.\n`;
await writeFile(provenancePath, oldNotes.split(marker)[0].trimEnd() + "\n\n" + notes);
console.log("Exported only the three frozen B10 pilots, separate clip GIFs and static identities.");
