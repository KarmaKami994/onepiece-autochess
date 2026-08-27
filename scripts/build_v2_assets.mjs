import { randomUUID } from "node:crypto";
import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveExecutable, run } from "./asset_executables.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const MATRIX_PATH = path.join(PROJECT_ROOT, "art", "animation-v2", "source-matrix.json");

function parseArguments(argv) {
  const inline = argv.find((token) => token.startsWith("--asset="));
  const index = argv.indexOf("--asset");
  const asset = inline?.slice("--asset=".length) ?? (index >= 0 ? argv[index + 1] : "all");
  if (!/^(all|[a-z0-9-]+)$/.test(asset)) throw new Error(`Invalid asset id: ${asset}`);
  return { asset, skipEditable: argv.includes("--skip-editable") };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function makeEditable(libreSprite, gif, editable) {
  await run(libreSprite, ["-b", gif, "--save-as", editable], { cwd: PROJECT_ROOT });
  if (!(await exists(editable))) throw new Error(`LibreSprite did not create ${editable}.`);
}

async function buildMatrixEntry(entry, libreSprite, skipEditable) {
  const staging = path.join(os.tmpdir(), `grand-line-v2-${entry.id}-${randomUUID()}`);
  const frames = path.join(staging, "frames");
  const sheet = path.join(staging, `${entry.outputAssetKey}.png`);
  const metadata = path.join(staging, `${entry.outputAssetKey}.json`);
  const gif = path.join(staging, `${entry.outputAssetKey}.gif`);
  const editable = path.join(staging, `${entry.outputAssetKey}.aseprite`);
  await mkdir(frames, { recursive: true });
  try {
    await run(process.execPath, [
      path.join(PROJECT_ROOT, "scripts", "assets", "build_v2_animation.mjs"),
      "--matrix", MATRIX_PATH,
      "--asset", entry.id,
      "--sheet", sheet,
      "--metadata", metadata,
      "--frames-dir", frames,
      "--gif", gif,
    ], { cwd: PROJECT_ROOT });
    if (!(await exists(sheet))) return;
    if (!skipEditable) await makeEditable(libreSprite, gif, editable);
    const output = path.join(PROJECT_ROOT, "public", "assets", "animations", entry.outputAssetKey);
    await mkdir(output, { recursive: true });
    await cp(sheet, path.join(output, `${entry.outputAssetKey}.png`));
    await cp(metadata, path.join(output, `${entry.outputAssetKey}.json`));
    if (!skipEditable) {
      const editableRoot = path.join(PROJECT_ROOT, "art", "libresprite");
      await mkdir(editableRoot, { recursive: true });
      await cp(editable, path.join(editableRoot, `${entry.outputAssetKey}.aseprite`));
    }
    process.stdout.write(`Built ${entry.outputAssetKey}.\n`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function buildLuffy(libreSprite, skipEditable) {
  const staging = path.join(os.tmpdir(), `grand-line-luffy-v2-${randomUUID()}`);
  const frames = path.join(staging, "frames");
  const sheet = path.join(staging, "luffy-v2.png");
  const metadata = path.join(staging, "luffy-v2.json");
  const gif = path.join(staging, "luffy-v2.gif");
  const editable = path.join(staging, "luffy-v2.aseprite");
  await mkdir(frames, { recursive: true });
  try {
    await run(process.execPath, [
      path.join(PROJECT_ROOT, "scripts", "licensed", "build_luffy_v2.mjs"),
      "--source", path.join(PROJECT_ROOT, "art", "licensed-reference", "gigant-battle", "MonkeyDLuffy.png"),
      "--map", path.join(PROJECT_ROOT, "scripts", "licensed", "luffy-v2-map.json"),
      "--sheet", sheet,
      "--metadata", metadata,
      "--frames-dir", frames,
      "--gif", gif,
    ], { cwd: PROJECT_ROOT });
    if (!skipEditable) await makeEditable(libreSprite, gif, editable);
    const output = path.join(PROJECT_ROOT, "public", "assets", "animations", "luffy-v2");
    await mkdir(output, { recursive: true });
    await cp(sheet, path.join(output, "luffy-v2.png"));
    await cp(metadata, path.join(output, "luffy-v2.json"));
    if (!skipEditable) {
      const editableRoot = path.join(PROJECT_ROOT, "art", "libresprite");
      await mkdir(editableRoot, { recursive: true });
      await cp(editable, path.join(editableRoot, "luffy-v2.aseprite"));
    }
    process.stdout.write("Built luffy-v2.\n");
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

const options = parseArguments(process.argv.slice(2));
const libreSprite = options.skipEditable
  ? null
  : await resolveExecutable({
      label: "LibreSprite",
      environmentVariable: "LIBRESPRITE_PATH",
      projectRoot: PROJECT_ROOT,
      localCandidates: [
        ".codex-local/tools/LibreSprite-v1.1/libresprite.exe",
        ".codex-local/tools/LibreSprite-v1.1/libresprite",
      ],
      pathCandidates: ["libresprite", "LibreSprite"],
    });
if (options.asset === "luffy") {
  await buildLuffy(libreSprite, options.skipEditable);
} else {
  const matrix = JSON.parse(await readFile(MATRIX_PATH, "utf8"));
  const entries = options.asset === "all"
    ? matrix.entries
    : matrix.entries.filter((entry) => entry.id === options.asset);
  if (entries.length === 0) throw new Error(`Unknown v2 asset: ${options.asset}`);
  for (const entry of entries) {
    await buildMatrixEntry(entry, libreSprite, options.skipEditable);
  }
}

process.stdout.write("V2 asset pipeline complete. Unapproved sources stayed on their v1 fallbacks.\n");
