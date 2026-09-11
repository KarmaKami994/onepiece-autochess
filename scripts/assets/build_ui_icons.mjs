import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..", "..");
const PUBLIC = path.join(ROOT, "public", "assets");
const UI_SOURCE = path.join(ROOT, "art", "ui-icons");
const QA = path.join(ROOT, "art", "qa");
const SOURCES_ONLY = process.argv.includes("--sources-only");

const NEW_CREW = [
  "koby", "koala", "franky", "brook", "ivankov", "jinbe",
  "kuma", "kizaru", "kuzan", "akainu", "shanks", "blackbeard",
];
const ALL_CREW = [
  "nami", "usopp", "chopper", "tashigi", "koby", "koala", "sanji", "robin",
  "smoker", "sabo", "franky", "brook", "ivankov", "luffy", "zoro", "kid",
  "crocodile", "jinbe", "kuma", "law", "ace", "hancock", "doflamingo",
  "kizaru", "kuzan", "akainu", "garp", "mihawk", "shanks", "blackbeard",
];
const ALL_PVE = [
  "marine-recruit", "rifle-marine", "pirate-raider", "sea-king", "pacifista",
  "vice-admiral", "cipher-pol-agent", "seraphim",
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function motif(name, color) {
  const stroke = `stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const fill = `fill="${color}"`;
  const shared = {
    blade: `<path ${stroke} d="M27 73 66 24l7 7-39 49z"/><path ${stroke} d="m23 69 14 14M28 80l-8 8"/>`,
    "crossed-blades": `<path ${stroke} d="m22 75 45-52 7 7-45 52zM74 75 29 23l-7 7 45 52z"/>`,
    meat: `<path ${fill} d="M28 42c13-17 39-12 46 5 7 18-10 36-30 31-18-4-27-22-16-36Z"/><circle cx="27" cy="69" r="8" fill="#f7e2bd"/><circle cx="19" cy="76" r="6" fill="#f7e2bd"/>`,
    storm: `<path ${stroke} d="M23 50c4-18 31-21 39-7 17-3 22 23 5 28H31c-17 0-20-18-8-21Z"/><path ${fill} d="m52 54-16 23h12l-5 16 20-28H51z"/>`,
    goggles: `<circle ${stroke} cx="34" cy="55" r="16"/><circle ${stroke} cx="67" cy="55" r="16"/><path ${stroke} d="M50 55h2M18 51l-7-7M83 51l7-7"/>`,
    crystal: `<path ${fill} d="m48 13 28 22-11 45-17 10-24-27 7-43z"/><path d="m31 20 34 60M24 63l52-28M48 13l0 77" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`,
    fist: `<path ${fill} d="M24 47c0-7 10-8 12-2v-9c0-7 10-7 11-1 1-9 12-8 12 0 3-6 12-3 11 4l-2 24c-2 18-14 26-28 22-11-3-20-14-22-25-2-9 9-13 14-6V47Z"/>`,
    "spiked-fist": `<path ${fill} d="M27 47c0-8 9-8 12-2 0-12 12-15 16-5 5-10 16-3 13 7 8-3 12 7 7 13-7 9-12 24-29 24-16 0-25-12-28-25-2-9 8-13 14-7Z"/><path ${fill} d="m28 29 5-15 7 16 7-18 7 18 11-15 1 19z"/>`,
    snail: `<path ${stroke} d="M22 66c0-24 35-31 48-13 12 16-4 32-20 25-13-6-8-23 4-22 8 0 10 11 4 15"/><path ${stroke} d="M69 52c14-11 23 2 16 13M77 51l4-12M84 51l8-9"/>`,
    engine: `<circle ${stroke} cx="48" cy="51" r="21"/><path ${stroke} d="M48 18v12M48 72v12M15 51h12M69 51h13M25 28l9 9M63 66l9 9M71 28l-9 9M34 66l-9 9"/><circle cx="48" cy="51" r="8" ${fill}/>`,
    skull: `<path ${fill} d="M23 42c0-18 12-30 27-30s27 12 27 30c0 15-9 20-16 24v17H39V66c-8-4-16-9-16-24Z"/><circle cx="39" cy="43" r="7" fill="#172033"/><circle cx="61" cy="43" r="7" fill="#172033"/><path d="m45 59 5-7 5 7" stroke="#172033" stroke-width="5" fill="none"/>`,
    spiral: `<path ${stroke} d="M49 14c28 0 39 35 21 54-15 17-48 10-48-14 0-19 24-29 38-16 10 10 3 28-10 28-10 0-16-11-9-18"/>`,
    canister: `<rect x="28" y="16" width="40" height="68" rx="9" ${fill}/><path d="M31 30h34M31 69h34M43 10h10" stroke="#fff" stroke-opacity=".65" stroke-width="5"/>`,
    dial: `<path ${fill} d="M48 11c26 0 39 24 31 46-8 24-31 31-50 18C7 59 17 25 37 18c4-2 5-7 11-7Z"/><path stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M31 61c8-18 19-29 37-35M34 38c11 8 20 17 27 31"/>`,
    lens: `<circle ${stroke} cx="43" cy="45" r="25"/><circle ${stroke} cx="43" cy="45" r="10"/><path ${stroke} d="m61 64 22 22M43 14v12M14 45h12M43 64v12M61 45h12"/>`,
    plate: `<path ${fill} d="m48 12 31 14-5 40-26 21-26-21-5-40z"/><path d="M48 21v56M26 31h44" stroke="#fff" stroke-opacity=".55" stroke-width="4"/>`,
    sash: `<path ${stroke} d="M18 31c20 12 40 11 62-2M31 37l-8 44 22-17 13 21 8-50"/><path ${fill} d="m46 34 12 2-5 27-12-2z"/>`,
    compass: `<circle ${stroke} cx="48" cy="49" r="34"/><path ${fill} d="m59 26-7 27-16 18 7-27z"/><circle cx="48" cy="49" r="5" fill="#fff"/>`,
    coat: `<path ${fill} d="M31 19 17 39l11 9 6-7-6 44h40l-6-44 6 7 11-9-14-20-12 7H43z"/><path d="M48 28v51" stroke="#7aa6c8" stroke-width="4"/>`,
    book: `<path ${fill} d="M16 24c14-5 24-1 32 7 8-8 18-12 32-7v58c-13-4-23 0-32 7-9-7-19-11-32-7z"/><path d="M48 31v58" stroke="#fff" stroke-opacity=".65" stroke-width="4"/>`,
    shield: `<path ${fill} d="m48 10 31 13-4 34C73 72 62 84 48 91 34 84 23 72 21 57l-4-34z"/><path d="M48 21v57" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>`,
    flame: `<path ${fill} d="M49 8c9 19-1 23 10 33 7-8 8-14 7-19 22 18 20 47 5 61-12 11-34 10-45-2-14-15-12-38 4-52-1 14 5 19 11 21-3-17 4-29 8-42Z"/>`,
    "flame-book": `<path ${fill} d="M19 39c11-4 20-1 29 6 9-7 18-10 29-6v43c-11-3-20 0-29 7-9-7-18-10-29-7z"/><path d="M48 45v44" stroke="#fff" stroke-width="4"/><path ${fill} d="M48 8c12 14 3 19 12 28-1 9-7 13-12 13s-12-4-12-13c7-8 5-18 12-28Z"/>`,
    bubble: `<circle ${stroke} cx="49" cy="50" r="34"/><circle cx="35" cy="34" r="8" fill="#fff" fill-opacity=".55"/>`,
    eye: `<path ${stroke} d="M12 50c18-27 54-27 72 0-18 27-54 27-72 0Z"/><circle cx="48" cy="50" r="13" ${fill}/><circle cx="48" cy="50" r="5" fill="#fff"/>`,
    boots: `<path ${fill} d="M23 16h23v43l15 7v19H16V67l12-8zM52 18h20v42l13 6v19H53V65l7-6z"/>`,
    ribbon: `<path ${stroke} d="M24 24c15 0 24 10 24 23 0-13 9-23 24-23 3 15-5 27-24 25-19 2-27-10-24-25Z"/><path ${fill} d="m42 48-18 40 24-14 24 14-18-40z"/>`,
    scope: `<path ${stroke} d="M14 49h68M24 36v26M70 34v30M42 49h12"/><circle ${stroke} cx="48" cy="49" r="21"/>`,
    "healing-bubble": `<circle ${stroke} cx="48" cy="50" r="34"/><path ${fill} d="M41 28h14v15h15v14H55v15H41V57H26V43h15z"/>`,
    "star-shield": `<path ${fill} d="m48 10 31 13-4 34C73 72 62 84 48 91 34 84 23 72 21 57l-4-34z"/><path d="m48 27 6 13 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2z" fill="#fff"/>`,
    tooth: `<path ${fill} d="M22 21c13-9 39-9 52 0 3 20-4 48-26 69-22-21-29-49-26-69Zm15 13 11 35 11-35z" fill-rule="evenodd"/>`,
    talisman: `<path ${fill} d="M29 12h38v74H29z"/><path d="M36 25h24M40 36l16 35M57 36 39 70" stroke="#fff" stroke-width="5"/>`,
    bandanna: `<path ${fill} d="M18 29c20-12 40-12 60 0l-8 31H26zM31 58l-13 29 28-18 12 17 13-29z"/>`,
    flag: `<path ${stroke} d="M25 12v78"/><path ${fill} d="M29 16h48L65 37l12 20H29z"/>`,
    ricochet: `<path ${stroke} d="m17 72 25-25-14-14h43l-5 43-14-14-25 25"/>`,
    impact: `<path ${fill} d="m48 7 8 24 22-12-11 23 25 7-25 8 11 22-22-11-8 24-8-24-22 11 11-22-25-8 25-7-11-23 22 12z"/>`,
    chest: `<path ${fill} d="M15 39c0-16 13-27 33-27s33 11 33 27v46H15z"/><path d="M15 47h66M42 43h12v23H42z" stroke="#fff" stroke-width="5" fill="none"/>`,
    "smoke-star": `<path ${fill} d="m50 12 9 21 23 2-18 15 6 23-20-12-20 12 6-23-18-15 23-2z"/><path ${stroke} d="M16 79c12-9 22 4 32-5 12-11 23 5 34-4"/>`,
    mask: `<path ${fill} d="M19 22c18-12 40-12 58 0l-5 46-16 18H40L24 68z"/><circle cx="36" cy="44" r="9" fill="#182236"/><circle cx="60" cy="44" r="9" fill="#182236"/><path d="M39 68h18" stroke="#182236" stroke-width="7"/>`,
    gauntlet: `<path ${fill} d="M23 15h13v29h5V10h13v34h5V16h12v31h5V28h11v31c0 19-14 30-31 30-20 0-34-14-38-34-2-11 11-15 17-6l4 6V15z"/>`,
    feather: `<path ${fill} d="M81 11C47 13 23 39 20 85l21-21 12 2-6-10 10-8 11 1-6-8c9-8 15-18 19-30Z"/><path ${stroke} d="M18 89 69 27"/>`,
    belt: `<path ${fill} d="M9 38h78v24H9z"/><rect x="37" y="31" width="23" height="38" rx="4" fill="#f1c263"/><rect x="43" y="38" width="11" height="24" fill="#172033"/>`,
    "healing-dial": `<circle ${stroke} cx="48" cy="50" r="35"/><path ${fill} d="M41 26h14v17h17v14H55v17H41V57H24V43h17z"/>`,
    dummy: `<circle cx="48" cy="25" r="14" ${fill}/><path ${stroke} d="M48 39v44M24 51h48M33 83l15-20 15 20"/>`,
    reversal: `<path ${stroke} d="M17 38h54l-14-14M71 38 57 52M79 62H25l14 14M25 62l14-14"/>`,
    orb: `<circle cx="48" cy="50" r="36" ${fill}/><path d="M28 57c12-28 31-33 45-21M23 46c20 8 33 22 39 39" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none"/>`,
    bomb: `<circle cx="45" cy="57" r="29" ${fill}/><path ${stroke} d="M59 32c0-15 11-20 21-20M76 12l7 8"/><path fill="#f3cb53" d="m79 6 5 6 8-1-4 7 4 7-8-1-5 6-2-8-8-4 8-4z"/>`,
    helm: `<path ${fill} d="M18 51c0-25 13-39 30-39s30 14 30 39v32H61V59H35v24H18z"/><path d="M48 12v47M25 42h46" stroke="#fff" stroke-opacity=".45" stroke-width="5"/>`,
    null: `<circle ${stroke} cx="48" cy="49" r="34"/><path ${stroke} d="m24 25 48 48"/>`,
    hat: `<path ${fill} d="M24 42c2-21 12-31 24-31s22 10 24 31l18 12c-20 19-64 19-84 0z"/><path d="M20 49h56" stroke="#d14b3f" stroke-width="7"/>`,
  };
  return shared[name] ?? `<path ${fill} d="m48 12 35 38-35 38-35-38z"/><circle cx="48" cy="50" r="12" fill="#fff" fill-opacity=".55"/>`;
}

function frameSvg(spec, category) {
  const completed = spec.kind === "completed";
  const border = completed ? "#f3c75d" : "#93a7bc";
  const badge = spec.traitBadge
    ? `<g transform="translate(66 66)"><path d="m14 0 12 7v14l-12 8L2 21V7z" fill="#172033" stroke="#fff" stroke-width="2"/><path d="M8 15h12M14 9v12" stroke="${spec.accent}" stroke-width="3"/></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img"><path d="M8 3h80l5 8v74l-8 8H11l-8-8V11z" fill="#111a2b" stroke="${border}" stroke-width="${completed ? 4 : 3}"/>${completed ? '<path d="M13 12h70v72H13z" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="2"/>' : ''}${motif(spec.motif, spec.accent)}${badge}<title>${escapeXml(spec.id)} ${category}</title></svg>\n`;
}

function traitSvg(spec) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img"><circle cx="48" cy="48" r="43" fill="#111a2b" stroke="${spec.color}" stroke-width="5"/>${motif(spec.motif, spec.color)}<title>${escapeXml(spec.name)}</title></svg>\n`;
}

function statusSvg(spec) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img"><path d="M12 8h72l4 8v64l-8 8H16l-8-8V16z" fill="#101827" stroke="${spec.color}" stroke-width="5"/>${motif(spec.motif, spec.color)}<title>${escapeXml(spec.name)}</title></svg>\n`;
}

function formSvg(id, size, overlay = false) {
  const definitions = {
    "robin-demonio-fleur": { color: "#8e45c7", motif: "flame", secondary: "#e679d6" },
    "luffy-gear-4-boundman": { color: "#a82e38", motif: "fist", secondary: "#23202a" },
    "luffy-gear-4-snakeman": { color: "#d94b3f", motif: "reversal", secondary: "#211b26" },
    "chopper-monster-point": { color: "#8a674e", motif: "spiked-fist", secondary: "#d1b58a" },
  };
  const spec = definitions[id];
  const badge = motif(spec.motif, spec.color);
  if (overlay) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M8 112Q64 86 120 112" fill="none" stroke="${spec.secondary}" stroke-width="8" stroke-dasharray="8 5"/><circle cx="100" cy="25" r="17" fill="#101827" stroke="${spec.color}" stroke-width="4"/><g transform="translate(84 9) scale(.34)">${badge}</g></svg>\n`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96" role="img"><defs><radialGradient id="g"><stop stop-color="${spec.secondary}" stop-opacity=".35"/><stop offset="1" stop-color="#101827"/></radialGradient></defs><circle cx="48" cy="48" r="44" fill="url(#g)" stroke="${spec.color}" stroke-width="5"/><path d="M19 80c8-19 18-28 29-28s21 9 29 28" fill="${spec.secondary}" opacity=".7"/>${badge}<title>${escapeXml(id)}</title></svg>\n`;
}

function pveSvg(id) {
  const specs = {
    "vice-admiral": { coat: "#e8edf2", body: "#173557", accent: "#66a9d8", extra: '<path d="M20 76h88v18H20z" fill="#e8edf2"/><path d="M31 89h66l12 86H19z" fill="#e8edf2"/><path d="M42 94h44v81H42z" fill="#173557"/><path d="m18 76 22-31 15 30M110 76 88 45 74 75" fill="#e8edf2"/>' },
    "cipher-pol-agent": { coat: "#222737", body: "#111522", accent: "#d9d8d2", extra: '<path d="M34 65h60l8 104H26z" fill="#222737"/><path d="M48 68h32l-6 101H54z" fill="#111522"/><path d="M42 35h44v35H42z" fill="#e7e5dc"/><path d="m48 43 12 8-12 8M80 43 68 51l12 8" stroke="#222737" stroke-width="6" fill="none"/>' },
    seraphim: { coat: "#31384b", body: "#d9dde2", accent: "#b884e2", extra: '<path d="M39 64h50l14 108H25z" fill="#d9dde2"/><path d="M10 69 42 42 35 120 8 101zM118 69 86 42l7 78 27-19z" fill="#171b29"/><path d="M49 77h30v95H49z" fill="#31384b"/><circle cx="64" cy="94" r="12" fill="#b884e2"/>' },
  };
  const spec = specs[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="192" viewBox="0 0 128 192" shape-rendering="crispEdges"><g>${spec.extra}<circle cx="64" cy="40" r="24" fill="${spec.body}"/><path d="M43 32h42v11H43z" fill="${spec.coat}"/><circle cx="56" cy="40" r="3" fill="#111522"/><circle cx="72" cy="40" r="3" fill="#111522"/><path d="M54 55h20" stroke="${spec.accent}" stroke-width="5"/></g></svg>`;
}

async function writePveSources() {
  await mkdir(path.join(PUBLIC, "enemies"), { recursive: true });
  for (const id of ["vice-admiral", "cipher-pol-agent", "seraphim"]) {
    const source = await sharp(Buffer.from(pveSvg(id)))
      .png({ palette: true, colours: 64, dither: 0 })
      .resize(512, 768, { kernel: sharp.kernel.nearest })
      .png({ palette: true, colours: 64, dither: 0 })
      .toBuffer();
    await writeFile(path.join(PUBLIC, "enemies", `${id}.png`), source);
  }
}

async function fitAsset(input, width, height, maxWidth, maxHeight) {
  const trimmed = await sharp(input).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const resized = await sharp(trimmed).resize({ width: maxWidth, height: maxHeight, fit: "inside", kernel: sharp.kernel.nearest }).png().toBuffer({ resolveWithObject: true });
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized.data, left: Math.floor((width - resized.info.width) / 2), top: height - resized.info.height }])
    .png({ palette: true, colours: 256, dither: 0 }).toBuffer();
}

async function writeDerivedPortraits() {
  for (const directory of ["characters", "portraits", "tokens"]) await mkdir(path.join(PUBLIC, directory), { recursive: true });
  for (const id of NEW_CREW) {
    const atlas = path.join(PUBLIC, "animations", `${id}-v2`, `${id}-v2.png`);
    const idle = await sharp(atlas).extract({ left: 0, top: 0, width: 128, height: 128 }).png().toBuffer();
    await writeFile(path.join(PUBLIC, "characters", `${id}.png`), await fitAsset(idle, 512, 768, 448, 704));
    await writeFile(path.join(PUBLIC, "portraits", `${id}.png`), await fitAsset(idle, 320, 320, 270, 300));
    await writeFile(path.join(PUBLIC, "tokens", `${id}.png`), await fitAsset(idle, 160, 160, 128, 146));
  }
  for (const id of ["vice-admiral", "cipher-pol-agent", "seraphim"]) {
    const source = path.join(PUBLIC, "enemies", `${id}.png`);
    await writeFile(path.join(PUBLIC, "portraits", `${id}.png`), await fitAsset(source, 320, 320, 270, 300));
    await writeFile(path.join(PUBLIC, "tokens", `${id}.png`), await fitAsset(source, 160, 160, 128, 146));
  }
}

async function writeIconFamilies() {
  const [items, traits, statuses] = await Promise.all([
    readFile(path.join(UI_SOURCE, "item-icons.json"), "utf8").then(JSON.parse),
    readFile(path.join(UI_SOURCE, "trait-icons.json"), "utf8").then(JSON.parse),
    readFile(path.join(UI_SOURCE, "status-icons.json"), "utf8").then(JSON.parse),
  ]);
  for (const directory of ["items", "traits", "status", "forms"]) await mkdir(path.join(PUBLIC, directory), { recursive: true });
  for (const spec of items.items) await writeFile(path.join(PUBLIC, "items", `${spec.id}.svg`), frameSvg(spec, "item"));
  for (const spec of traits.traits) await writeFile(path.join(PUBLIC, "traits", `${spec.id}.svg`), traitSvg(spec));
  for (const spec of statuses.statuses) await writeFile(path.join(PUBLIC, "status", `${spec.id}.svg`), statusSvg(spec));
  for (const id of ["robin-demonio-fleur", "luffy-gear-4-boundman", "luffy-gear-4-snakeman", "chopper-monster-point"]) {
    const directory = path.join(PUBLIC, "forms", id);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "portrait.svg"), formSvg(id, 320));
    await writeFile(path.join(directory, "token.svg"), formSvg(id, 160));
    await writeFile(path.join(directory, "overlay.svg"), formSvg(id, 128, true));
  }
  return { items: items.items, traits: traits.traits, statuses: statuses.statuses };
}

async function contactSheet(entries, options) {
  const { columns, cellWidth, cellHeight, output } = options;
  const rows = Math.ceil(entries.length / columns);
  const composites = [];
  for (const [index, entry] of entries.entries()) {
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    const image = await sharp(entry.path).resize({ width: cellWidth - 24, height: cellHeight - 46, fit: "inside", kernel: sharp.kernel.nearest }).png().toBuffer({ resolveWithObject: true });
    composites.push({ input: image.data, left: x + Math.floor((cellWidth - image.info.width) / 2), top: y + 8 });
    const labelFontSize = Math.max(
      7,
      Math.min(13, Math.floor((cellWidth - 8) / (entry.label.length * 0.58))),
    );
    const label = `<svg width="${cellWidth}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101827"/><text x="${cellWidth / 2}" y="22" text-anchor="middle" fill="#f4f0df" font-family="Arial,sans-serif" font-size="${labelFontSize}">${escapeXml(entry.label)}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: x, top: y + cellHeight - 34 });
  }
  await mkdir(QA, { recursive: true });
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: "#07101f" } })
    .composite(composites).png({ palette: true, colours: 256, dither: 0 }).toFile(path.join(QA, output));
}

async function writeQaSheets(specs) {
  await contactSheet(ALL_CREW.map((id) => ({ id, label: id, path: path.join(PUBLIC, "portraits", `${id}.png`) })), { columns: 10, cellWidth: 140, cellHeight: 180, output: "p7-crew-contact-sheet.png" });
  await contactSheet(ALL_PVE.map((id) => ({ id, label: id, path: path.join(PUBLIC, "portraits", `${id}.png`) })), { columns: 8, cellWidth: 160, cellHeight: 190, output: "p7-pve-contact-sheet.png" });
  await contactSheet(specs.items.map((entry) => ({ id: entry.id, label: entry.id, path: path.join(PUBLIC, "items", `${entry.id}.svg`) })), { columns: 10, cellWidth: 140, cellHeight: 130, output: "p7-item-contact-sheet.png" });
  const traitStatus = [
    ...specs.traits.map((entry) => ({ id: entry.id, label: entry.name, path: path.join(PUBLIC, "traits", `${entry.id}.svg`) })),
    ...specs.statuses.map((entry) => ({ id: entry.id, label: entry.name, path: path.join(PUBLIC, "status", `${entry.id}.svg`) })),
  ];
  await contactSheet(traitStatus, { columns: 7, cellWidth: 150, cellHeight: 135, output: "p7-trait-status-contact-sheet.png" });
}

await writePveSources();
if (SOURCES_ONLY) {
  process.stdout.write("Built three deterministic P7 PvE source cutouts.\n");
} else {
  const specs = await writeIconFamilies();
  await writeDerivedPortraits();
  await writeQaSheets(specs);
  process.stdout.write(`Built ${specs.items.length} item, ${specs.traits.length} trait, ${specs.statuses.length} status icons, four form identities, derived portraits/tokens, and four QA sheets.\n`);
}
