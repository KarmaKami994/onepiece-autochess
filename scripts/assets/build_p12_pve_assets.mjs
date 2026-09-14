import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(ROOT, "public", "assets");
const QA = path.join(ROOT, "art", "qa");

const FACTIONS = {
  "fish-man-raider": { skin: "#5d9bab", coat: "#244c69", accent: "#eeb367", mark: "gills", weapon: "spear" },
  "skypiea-priest": { skin: "#c89872", coat: "#eee6cf", accent: "#f2c859", mark: "halo", weapon: "staff" },
  "cp9-elite": { skin: "#c9b69d", coat: "#202a38", accent: "#f2f0e7", mark: "mask", weapon: "blade" },
  "impel-down-guard": { skin: "#ac8e7b", coat: "#3b2c45", accent: "#bb718e", mark: "horns", weapon: "trident" },
  "new-fish-man-officer": { skin: "#527c98", coat: "#253c5a", accent: "#c96081", mark: "gills", weapon: "trident" },
  "punk-hazard-guard": { skin: "#b4c1c2", coat: "#7a4278", accent: "#b8ef91", mark: "visor", weapon: "canister" },
  "donquixote-officer": { skin: "#d0a686", coat: "#ad5279", accent: "#f5c3d3", mark: "feathers", weapon: "blade" },
  "beast-pirate": { skin: "#ba967c", coat: "#485671", accent: "#e6bb73", mark: "horns", weapon: "club" },
};

const BOSSES = [
  "arlong", "enel", "rob-lucci", "magellan", "hody-jones",
  "caesar-clown", "pica", "kaido",
];

const VARIANTS = {
  "cp9-elite": ["cp9-elite-laser", "cp9-elite-tidal"],
  "donquixote-officer": ["donquixote-officer-vanguard", "donquixote-officer-assault", "donquixote-officer-artillery"],
  "beast-pirate": ["beast-pirate-vanguard", "beast-pirate-assault", "beast-pirate-artillery"],
};

function factionSvg(spec) {
  const marks = {
    gills: '<path d="M40 47h-13m13 9H25m63-9h13m-13 9h15" stroke="#183045" stroke-width="4"/>',
    halo: '<ellipse cx="64" cy="12" rx="27" ry="7" fill="none" stroke="#f2c859" stroke-width="5"/><path d="M28 67 8 83l19 12M100 67l20 16-19 12" fill="#eee6cf"/>',
    mask: '<path d="M39 40h50v23H39z" fill="#f2f0e7"/><path d="M47 49h11m12 0h11" stroke="#202a38" stroke-width="5"/>',
    horns: '<path d="M42 32 25 6l7 35m54-9 17-26-7 35" fill="#e6bb73" stroke="#413247" stroke-width="3"/>',
    visor: '<path d="M34 39h60v19H34z" fill="#314d5a" stroke="#b8ef91" stroke-width="4"/><path d="M46 49h36" stroke="#b8ef91" stroke-width="4"/>',
    feathers: '<path d="M19 76 3 56l25 5-5-20 26 28m60 7 16-20-25 5 5-20-26 28" fill="#f5c3d3"/>',
  };
  const weapons = {
    spear: '<path d="m18 170 26-126" stroke="#eeb367" stroke-width="6"/><path d="m44 43-6-30-11 25z" fill="#dce6e9"/>',
    staff: '<path d="M19 174 24 26" stroke="#9c713f" stroke-width="7"/><circle cx="24" cy="25" r="10" fill="#f2c859"/>',
    blade: '<path d="m13 173 39-97" stroke="#d1dee4" stroke-width="8"/><path d="m22 147 28 11" stroke="#d7b763" stroke-width="5"/>',
    trident: '<path d="m20 173 9-131M18 18v31m11-41v43m11-33v31M18 48q11 12 22 0" stroke="#b8c2c7" stroke-width="5" fill="none"/>',
    canister: '<rect x="6" y="70" width="29" height="42" rx="6" fill="#b8ef91" stroke="#314d5a" stroke-width="5"/><path d="M20 70V52" stroke="#314d5a" stroke-width="5"/>',
    club: '<path d="m13 174 29-97" stroke="#6b4c42" stroke-width="10"/><path d="M33 84 48 34 61 47 47 93z" fill="#858d99"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="192" viewBox="0 0 128 192" shape-rendering="crispEdges"><path d="M29 85 14 166l23 15h54l23-15-15-81-17-20H46z" fill="${spec.coat}" stroke="#1b2535" stroke-width="5"/><path d="M49 78h30l8 91H41z" fill="${spec.accent}" opacity=".7"/><path d="M45 154 37 182h23l4-28m4 0 4 28h23l-12-28" fill="#222a38"/><path d="M39 27q25-20 50 0l5 27-12 19H46L34 54z" fill="${spec.skin}" stroke="#1b2535" stroke-width="4"/><path d="M42 28q22-22 44 0" fill="none" stroke="${spec.coat}" stroke-width="13"/><path d="M44 48h10m20 0h10" stroke="#16202e" stroke-width="4"/>${marks[spec.mark]}${weapons[spec.weapon]}<path d="M47 81h34" stroke="${spec.accent}" stroke-width="6"/></svg>`;
}

async function fitAsset(input, width, height, maxWidth, maxHeight) {
  const trimmed = await sharp(input).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const resized = await sharp(trimmed).resize({ width: maxWidth, height: maxHeight, fit: "inside", kernel: sharp.kernel.nearest }).png().toBuffer({ resolveWithObject: true });
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized.data, left: Math.floor((width - resized.info.width) / 2), top: height - resized.info.height }])
    .png({ palette: true, colours: 256, dither: 0 }).toBuffer();
}

async function buildFactionSources() {
  await mkdir(path.join(PUBLIC, "enemies"), { recursive: true });
  for (const [id, spec] of Object.entries(FACTIONS)) {
    const source = await sharp(Buffer.from(factionSvg(spec)))
      .resize(512, 768, { kernel: sharp.kernel.nearest })
      .png({ palette: true, colours: 64, dither: 0 }).toBuffer();
    await writeFile(path.join(PUBLIC, "enemies", `${id}.png`), source);
  }
}

async function buildRuntimePresentation() {
  for (const directory of ["enemies", "portraits", "tokens"]) {
    await mkdir(path.join(PUBLIC, directory), { recursive: true });
  }
  for (const id of [...BOSSES, ...Object.keys(FACTIONS)]) {
    const atlas = await readFile(path.join(PUBLIC, "animations", `${id}-v2`, `${id}-v2.png`));
    const idle = await sharp(atlas).extract({ left: 0, top: 0, width: 128, height: 128 }).png().toBuffer();
    const portrait = await fitAsset(idle, 320, 320, 270, 300);
    const token = await fitAsset(idle, 160, 160, 128, 146);
    await writeFile(path.join(PUBLIC, "portraits", `${id}.png`), portrait);
    await writeFile(path.join(PUBLIC, "tokens", `${id}.png`), token);
    if (BOSSES.includes(id)) {
      await writeFile(path.join(PUBLIC, "enemies", `${id}.png`), await fitAsset(idle, 512, 768, 448, 704));
    }
    for (const variant of VARIANTS[id] ?? []) {
      await writeFile(path.join(PUBLIC, "portraits", `${variant}.png`), portrait);
      await writeFile(path.join(PUBLIC, "tokens", `${variant}.png`), token);
    }
  }

  const ids = [...BOSSES, ...Object.keys(FACTIONS)];
  const cellWidth = 200;
  const cellHeight = 230;
  const columns = 4;
  const composites = [];
  for (const [index, id] of ids.entries()) {
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    const portrait = await sharp(path.join(PUBLIC, "portraits", `${id}.png`))
      .resize({ width: 170, height: 182, fit: "inside", kernel: sharp.kernel.nearest })
      .png().toBuffer({ resolveWithObject: true });
    composites.push({ input: portrait.data, left: x + Math.floor((cellWidth - portrait.info.width) / 2), top: y + 5 });
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth}" height="38"><rect width="100%" height="100%" fill="#101827"/><text x="${cellWidth / 2}" y="25" text-anchor="middle" fill="#f4f0df" font-family="Arial,sans-serif" font-size="14">${id}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: x, top: y + cellHeight - 38 });
  }
  await mkdir(QA, { recursive: true });
  await sharp({ create: { width: columns * cellWidth, height: Math.ceil(ids.length / columns) * cellHeight, channels: 4, background: "#07101f" } })
    .composite(composites).png({ palette: true, colours: 256, dither: 0 })
    .toFile(path.join(QA, "p12-pve-contact-sheet.png"));
}

const sourcesOnly = process.argv.includes("--sources-only");
const presentationOnly = process.argv.includes("--presentation-only");
if (sourcesOnly && presentationOnly) throw new Error("Choose one P12 asset-build mode.");
if (!presentationOnly) await buildFactionSources();
if (!sourcesOnly && !presentationOnly) {
  for (const id of [...BOSSES, ...Object.keys(FACTIONS)]) {
    execFileSync(process.execPath, [
      path.join(ROOT, "scripts", "build_v2_assets.mjs"),
      "--skip-editable", "--asset", id,
    ], { cwd: ROOT, stdio: "inherit" });
  }
}
if (!sourcesOnly) {
  await buildRuntimePresentation();
}
