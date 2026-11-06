import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = "art/ui-icons/food-icons.json";
const generatorPath = "scripts/assets/build_food_icons.mjs";
const source = await readFile(path.join(root, sourcePath));
const spec = JSON.parse(source.toString("utf8"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const motifs = {
  bento: '<rect x="16" y="27" width="64" height="52" rx="9" fill="#a95739"/><path d="M48 31v44M20 52h56" stroke="#e4c99b" stroke-width="4"/><path d="M24 37h16v9H24zM24 59h16v10H24z" fill="#faf1d7"/><path d="M55 37c9-7 18 4 12 10-7 6-17-3-12-10Z" fill="#e98567"/><path d="m55 63 4-6 4 6 6-3-1 10H54z" fill="#77b566"/>',
  bottle: '<path d="M38 16h20v14l10 11v36c0 9-40 9-40 0V41l10-11z" fill="#b43441" stroke="#f1cda2" stroke-width="3"/><path d="M38 16h20v8H38z" fill="#e8d8ba"/><path d="M30 48h36v22H30z" fill="#f7d692"/><path d="m48 49 4 7 8 2-6 5 1 8-7-4-7 4 1-8-6-5 8-2z" fill="#b43441"/><path d="M35 36v9" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>',
  curry: '<ellipse cx="48" cy="65" rx="35" ry="18" fill="#c7ded6"/><ellipse cx="48" cy="60" rx="31" ry="14" fill="#8a4827"/><path d="M23 59c2-15 20-20 30-6l-5 16c-12 2-20-1-25-10Z" fill="#fbebc6"/><path d="m54 54 9 1 4 8-10 3zM66 58l8 2-2 7-7-2z" fill="#eab254"/><path d="M35 37c-9-8 6-10 0-18M49 38c-8-7 7-12 1-20M62 41c-8-7 5-11 0-18" fill="none" stroke="#f8dda5" stroke-width="3" stroke-linecap="round"/>',
};
await mkdir(path.join(root, "public/assets/food"), { recursive: true });
const outputs = [];
for (const food of spec.foods) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>${food.name}</title><rect x="2" y="2" width="92" height="92" rx="18" fill="#172b35" stroke="${food.accent}" stroke-width="3"/>${motifs[food.motif]}</svg>\n`;
  const outputPath = `public/assets/food/${food.id}.svg`;
  await writeFile(path.join(root, outputPath), svg);
  outputs.push({ id: food.id, path: outputPath, sha256: digest(svg) });
}
await writeFile(path.join(root, "art/ui-icons/food-provenance.json"), JSON.stringify({
  author: spec.author, permission: spec.permission, sourcePath, sourceSha256: digest(source),
  generatorPath, generatorSha256: digest(await readFile(path.join(root, generatorPath))), outputs,
}, null, 2) + "\n");
process.stdout.write(`Generated ${outputs.length} original food icons and deterministic provenance.\n`);
