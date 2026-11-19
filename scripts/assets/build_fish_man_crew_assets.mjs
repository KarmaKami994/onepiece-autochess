import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ids = ["hatchan", "kuroobi", "fisher-tiger"];
const outputPaths = ["public/assets/traits/fish-man.svg"];
const presentationOnly = process.argv.includes("--presentation-only");

async function writeStaticSprite(id, directory, idle, width, height, maxWidth, maxHeight) {
  const { data, info } = await sharp(idle)
    .trim({ background: "#00000000" })
    .resize(maxWidth, maxHeight, { fit: "inside", kernel: "nearest" })
    .png().toBuffer({ resolveWithObject: true });
  const filename = `public/assets/${directory}/${id}.png`;
  await sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([{ input: data, left: Math.floor((width - info.width) / 2), top: height - info.height }])
    .png({ palette: true, colours: 256, dither: 0 }).toFile(path.join(root, filename));
  outputPaths.push(filename);
}

for (const id of ids) {
  if (!presentationOnly) {
    execFileSync(process.execPath, ["scripts/build_v2_assets.mjs", "--asset", id, "--skip-editable"], { cwd: root, stdio: "inherit" });
  }
  const atlas = `public/assets/animations/${id}-v2/${id}-v2`;
  outputPaths.push(`${atlas}.png`, `${atlas}.json`);
  const idle = await sharp(path.join(root, `${atlas}.png`))
    .extract({ left: 0, top: 0, width: 128, height: 128 }).png().toBuffer();
  await writeStaticSprite(id, "characters", idle, 512, 768, 448, 704);
  await writeStaticSprite(id, "portraits", idle, 320, 320, 270, 300);
  await writeStaticSprite(id, "tokens", idle, 160, 160, 128, 146);
}

const outputs = await Promise.all(outputPaths.sort().map(async filename => ({
  path: filename,
  sha256: createHash("sha256").update(await readFile(path.join(root, filename))).digest("hex"),
})));
await writeFile(path.join(root, "art/production/fish-man-crew/outputs.json"), `${JSON.stringify(outputs, null, 2)}\n`);
