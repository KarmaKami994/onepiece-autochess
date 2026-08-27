import { randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveExecutable, run } from "./asset_executables.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const ROSTER = [
  "luffy", "zoro", "nami", "usopp", "chopper", "tashigi",
  "sanji", "robin", "smoker", "sabo", "kid", "crocodile",
  "law", "ace", "hancock", "doflamingo", "garp", "mihawk",
];

function parseArguments(argv) {
  const roster = argv.includes("--roster");
  const characterToken = argv.find((token) => token.startsWith("--character="));
  const characterIndex = argv.indexOf("--character");
  const character = characterToken?.slice("--character=".length) ??
    (characterIndex >= 0 ? argv[characterIndex + 1] : null);
  if (!roster && !character) {
    throw new Error("Pass --character <id> or --roster.");
  }
  if (character && !/^[a-z0-9-]+$/.test(character)) {
    throw new Error(`Invalid character id: ${character}`);
  }
  return roster ? ROSTER : [character];
}

async function exists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildCharacter(character, python, libreSprite) {
  const specificGenerator = path.join(
    PROJECT_ROOT,
    "scripts",
    "libresprite",
    `create_${character}_pilot.py`,
  );
  const rosterGenerator = path.join(
    PROJECT_ROOT,
    "scripts",
    "libresprite",
    "create_roster_pilot.py",
  );
  const generator = (await exists(specificGenerator))
    ? specificGenerator
    : rosterGenerator;
  if (!(await exists(generator))) {
    throw new Error(`No frame generator was found for ${character}.`);
  }

  const staging = path.join(
    os.tmpdir(),
    `grand-line-auto-chess-${character}-${randomUUID()}`,
  );
  const frames = path.join(staging, "frames");
  const gif = path.join(staging, `${character}-pilot.gif`);
  const editable = path.join(staging, `${character}-pilot.aseprite`);
  const sheet = path.join(staging, `${character}.png`);
  const metadata = path.join(staging, `${character}.json`);
  const output = path.join(PROJECT_ROOT, "public", "assets", "animations", character);
  const sourceOutput = path.join(PROJECT_ROOT, "art", "libresprite");
  await mkdir(frames, { recursive: true });
  await mkdir(output, { recursive: true });
  await mkdir(sourceOutput, { recursive: true });
  try {
    const generatorArgs = [generator];
    if (generator === rosterGenerator) generatorArgs.push("--character", character);
    generatorArgs.push("--output-dir", frames);
    await run(python, generatorArgs, { cwd: PROJECT_ROOT });
    await run(process.execPath, [
      path.join(PROJECT_ROOT, "scripts", "libresprite", "pack_animation_frames.mjs"),
      frames,
      gif,
    ], { cwd: PROJECT_ROOT });
    await run(libreSprite, ["-b", gif, "--save-as", editable], { cwd: PROJECT_ROOT });
    await run(libreSprite, [
      "-b", editable,
      "--sheet", sheet,
      "--data", metadata,
      "--format", "json-array",
      "--sheet-type", "horizontal",
      "--list-layers",
    ], { cwd: PROJECT_ROOT });
    const metadataDocument = JSON.parse(await readFile(metadata, "utf8"));
    metadataDocument.meta.image = `${character}.png`;
    await writeFile(metadata, `${JSON.stringify(metadataDocument, null, 2)}\n`, "utf8");
    await cp(editable, path.join(sourceOutput, `${character}-pilot.aseprite`));
    await cp(sheet, path.join(output, `${character}.png`));
    await cp(metadata, path.join(output, `${character}.json`));
    process.stdout.write(`Built ${character} animation set.\n`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

const characters = parseArguments(process.argv.slice(2));
const python = await resolveExecutable({
  label: "Python",
  environmentVariable: "PYTHON_PATH",
  projectRoot: PROJECT_ROOT,
  localCandidates: [
    ".venv/Scripts/python.exe",
    ".venv/bin/python",
  ],
  pathCandidates: process.platform === "win32" ? ["python", "py"] : ["python3", "python"],
});
const libreSprite = await resolveExecutable({
  label: "LibreSprite",
  environmentVariable: "LIBRESPRITE_PATH",
  projectRoot: PROJECT_ROOT,
  localCandidates: [
    ".codex-local/tools/LibreSprite-v1.1/libresprite.exe",
    ".codex-local/tools/LibreSprite-v1.1/libresprite",
  ],
  pathCandidates: ["libresprite", "LibreSprite"],
});
for (const character of characters) {
  await buildCharacter(character, python, libreSprite);
}
