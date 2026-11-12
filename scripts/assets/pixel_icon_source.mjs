import { readFile } from "node:fs/promises";
import path from "node:path";

export const ICON_PILOTS = new Set(["sea-prism-shard", "black-blade", "emperors-jolly-roger"]);
export const PIXEL_SYMBOLS = ".0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const ICON_FAMILIES = { items: "items", food: "foods", traits: "traits", status: "statuses" };
export const iconCataloguePath = family => `art/ui-icons/${family === "status" ? "status" : family === "items" ? "item" : family === "traits" ? "trait" : "food"}-icons.json`;
export const iconSourcePath = (family, id) => `art/production/b12/${family}/${id}.json`;

// Merge equal horizontal runs vertically. Every path subshape is an integer
// rectangle; the runtime uses an exact 2x export, not embedded raster data.
export function pixelIconSvg(source, title, size = 96) {
  const scale = size / 48;
  const groups = new Map();
  let previous = new Map();
  for (const [y, row] of source.rows.entries()) {
    const next = new Map();
    for (let x = 0; x < 48;) {
      const symbol = row[x]; let end = x + 1;
      while (row[end] === symbol) end += 1;
      if (symbol !== ".") {
        const color = source.palette[PIXEL_SYMBOLS.indexOf(symbol)];
        const key = `${x},${end},${color}`;
        const old = previous.get(key);
        if (old) old.height += 1;
        else {
          const rect = { x, y, width: end - x, height: 1 };
          if (!groups.has(color)) groups.set(color, []);
          groups.get(color).push(rect); next.set(key, rect);
        }
        if (old) next.set(key, old);
      }
      x = end;
    }
    previous = next;
  }
  const shapes = [...groups].map(([color, rects]) => `<path fill="${color}" d="${rects.map(r => `M${r.x * scale} ${r.y * scale}h${r.width * scale}v${r.height * scale}H${r.x * scale}z`).join("")}"/>`).join("");
  const escaped = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><title>${escaped}</title>${shapes}</svg>\n`;
}

export async function readPixelIcon(root, family, spec) {
  if (family === "items" && ICON_PILOTS.has(spec.id)) {
    return (await readFile(path.join(root, "art/production/b10/icons", `${spec.id}.svg`), "utf8"))
      .replace('width="48" height="48"', 'width="96" height="96"');
  }
  const source = JSON.parse(await readFile(path.join(root, iconSourcePath(family, spec.id)), "utf8"));
  return pixelIconSvg(source, spec.name ?? spec.id);
}
