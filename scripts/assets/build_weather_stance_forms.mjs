import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceDirectory = path.join(root, "art/licensed-reference/gigant-battle");
const exports = [
  {
    id: "kuzan-ice-form", base: "kuzan", title: "Kuzan, Ice Form", source: "Aokiji.png",
    effects: [
      { rect: { left: 680, top: 467, width: 75, height: 69 }, x: 4, y: 62, width: 44, height: 47 },
      { rect: { left: 680, top: 467, width: 75, height: 69 }, x: 81, y: 76, width: 40, height: 39, mirror: true },
    ],
  },
  {
    id: "blackbeard-darkness", base: "blackbeard", title: "Blackbeard, Darkness", source: "Blackbeard.png",
    effects: [
      { rect: { left: 14, top: 4858, width: 179, height: 40 }, x: 3, y: 92, width: 122, height: 23 },
    ],
  },
  {
    id: "blackbeard-quake", base: "blackbeard", title: "Blackbeard, Quake", source: "Blackbeard.png",
    effects: [
      { rect: { left: 32, top: 4986, width: 48, height: 145 }, x: 89, y: 15, width: 34, height: 83 },
      { rect: { left: 396, top: 5017, width: 19, height: 52 }, x: 74, y: 66, width: 28, height: 28, stretch: true },
    ],
  },
];

function pixelPaths(data, width, height, left, top) {
  const colours = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width;) {
      const start = x;
      const pixel = data.subarray((y * width + x) * 4, (y * width + x + 1) * 4);
      x++;
      while (x < width && data.subarray((y * width + x) * 4, (y * width + x + 1) * 4).equals(pixel)) x++;
      if (!pixel[3]) continue;
      const colour = pixel.subarray(0, 3).toString("hex");
      const runs = colours.get(colour) ?? [];
      runs.push(`M${left + start} ${top + y}h${x - start}v1h-${x - start}z`);
      colours.set(colour, runs);
    }
  }
  return [...colours].map(([colour, runs]) => `<path fill="#${colour}" d="${runs.join("")}"/>`).join("");
}

async function extractEffect(source, effect) {
  const { data, info } = await sharp(source).extract(effect.rect).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const background = data.subarray(0, 3).toString("hex");
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data.subarray(offset, offset + 3).toString("hex") === background) data[offset + 3] = 0;
  }
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ background: "#00000000", threshold: 0 }).png().toBuffer();
  const cutout = sharp(trimmed);
  if (effect.mirror) cutout.flop();
  const result = await cutout.resize(Math.round(effect.width / 2), Math.round(effect.height / 2), {
    fit: effect.stretch ? "fill" : "inside", kernel: "nearest",
  }).raw().toBuffer({ resolveWithObject: true });
  return pixelPaths(result.data, result.info.width, result.info.height, Math.floor(effect.x / 2), Math.floor(effect.y / 2));
}

function svg(size, title, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" shape-rendering="crispEdges"><title>${title}</title>${content}</svg>\n`;
}

for (const form of exports) {
  const directory = path.join(root, "public/assets/forms", form.id);
  const overlay = (await Promise.all(form.effects.map((effect) => extractEffect(path.join(sourceDirectory, form.source), effect)))).join("");
  const master = await sharp(path.join(root, "art/production/b11", form.base, "master.png"))
    .ensureAlpha().trim({ background: "#00000000" }).png().toBuffer();
  const { data, info } = await sharp(master).resize(26, 35, { fit: "inside", kernel: "nearest" }).raw().toBuffer({ resolveWithObject: true });
  const body = pixelPaths(data, info.width, info.height, Math.floor((64 - info.width) / 2), 54 - info.height);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "overlay.svg"), svg(128, `${form.title} effect`, overlay)),
    writeFile(path.join(directory, "portrait.svg"), svg(128, form.title, overlay + body)),
    writeFile(path.join(directory, "token.svg"), svg(64, form.title, overlay + body)),
  ]);
}
