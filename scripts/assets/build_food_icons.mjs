import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPixelIcon } from "./pixel_icon_source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = "art/ui-icons/food-icons.json";
const generatorPath = "scripts/assets/build_food_icons.mjs";
const source = await readFile(path.join(root, sourcePath));
const spec = JSON.parse(source.toString("utf8"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
await mkdir(path.join(root, "public/assets/food"), { recursive: true });
const outputs = [];
for (const food of spec.foods) {
  const svg = await readPixelIcon(root, "food", food);
  const outputPath = `public/assets/food/${food.id}.svg`;
  await writeFile(path.join(root, outputPath), svg);
  outputs.push({ id: food.id, path: outputPath, sha256: digest(svg) });
}
await writeFile(path.join(root, "art/ui-icons/food-provenance.json"), JSON.stringify({
  author: spec.author, permission: spec.permission, sourcePath, sourceSha256: digest(source),
  generatorPath, generatorSha256: digest(await readFile(path.join(root, generatorPath))), outputs,
}, null, 2) + "\n");
process.stdout.write(`Generated ${outputs.length} original food icons and deterministic provenance.\n`);
