import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "assets", "carousel");
const scale = 2;

const arena = { width: 1520, height: 840, logicalWidth: 760, logicalHeight: 420 };
const boatFrame = { width: 96, height: 96, logicalWidth: 48, logicalHeight: 48 };
const bountyFrame = { width: 64, height: 64, logicalWidth: 32, logicalHeight: 32 };

const directions = [
  { id: "n", angle: -Math.PI / 2 },
  { id: "ne", angle: -Math.PI / 4 },
  { id: "e", angle: 0 },
  { id: "se", angle: Math.PI / 4 },
  { id: "s", angle: Math.PI / 2 },
  { id: "sw", angle: (3 * Math.PI) / 4 },
  { id: "w", angle: Math.PI },
  { id: "nw", angle: (-3 * Math.PI) / 4 },
];

const palettes = [
  { id: "crimson", name: "Crimson Dawn", sail: "#d94a4a", shade: "#852f42", trim: "#ffd166" },
  { id: "azure", name: "Azure Current", sail: "#3da9d6", shade: "#23658a", trim: "#e7f7ff" },
  { id: "emerald", name: "Emerald Wake", sail: "#48b06b", shade: "#286347", trim: "#f0e6b2" },
  { id: "violet", name: "Violet Gale", sail: "#9b6ed6", shade: "#563c84", trim: "#ffd3f4" },
  { id: "amber", name: "Amber Tide", sail: "#e7a83f", shade: "#8f572b", trim: "#fff0ad" },
  { id: "coral", name: "Coral Crest", sail: "#f07f6a", shade: "#93444b", trim: "#fff0db" },
  { id: "ivory", name: "Ivory Foam", sail: "#e8e0c8", shade: "#8d8990", trim: "#d75050" },
  { id: "obsidian", name: "Obsidian Squall", sail: "#34475c", shade: "#182735", trim: "#f1b84a" },
];

const rigging = [
  { beam: 8, length: 16, sail: [[0, 10], [8, -3], [0, -9], [-2, 1]] },
  { beam: 7, length: 18, sail: [[0, 11], [6, 4], [5, -5], [-4, -9], [-3, 5]] },
  { beam: 10, length: 15, sail: [[0, 10], [9, 4], [7, -4], [-7, -4], [-8, 4]] },
  { beam: 9, length: 17, sail: [[-2, 10], [8, 5], [6, -5], [1, -10], [-5, -1]] },
  { beam: 10, length: 16, sail: [[-6, 8], [7, 8], [9, 0], [5, -6], [-5, -6], [-8, 0]] },
  { beam: 7, length: 17, sail: [[1, 11], [7, -6], [-5, -10], [-3, 3]] },
  { beam: 9, length: 18, sail: [[-4, 10], [5, 10], [8, 0], [4, -10], [-4, -7], [-7, 2]] },
  { beam: 10, length: 18, sail: [[0, 11], [9, 5], [4, 1], [8, -7], [-7, -9], [-5, 4]] },
];

const items = [
  { id: "black-blade", name: "Black Blade", color: "#34475c", accent: "#efc15c", motif: "blade" },
  { id: "meat-platter", name: "Meat Platter", color: "#d45d55", accent: "#f5dfb0", motif: "meat" },
  { id: "clima-tact", name: "Clima-Tact", color: "#4aaec7", accent: "#f4da55", motif: "clima" },
  { id: "sniper-goggles", name: "Sniper Goggles", color: "#9d6a3b", accent: "#9fe7df", motif: "goggles" },
  { id: "sea-prism-stone", name: "Sea Prism Stone", color: "#4f96a6", accent: "#b9fff4", motif: "stone" },
  { id: "armament-wraps", name: "Armament Wraps", color: "#6d536d", accent: "#ead9be", motif: "wraps" },
  { id: "den-den-mushi", name: "Den Den Mushi", color: "#7fa84e", accent: "#f2c45e", motif: "snail" },
  { id: "cola-engine", name: "Cola Engine", color: "#b5424d", accent: "#79d7e5", motif: "cola" },
];

const colors = {
  transparent: [0, 0, 0, 0],
  ink: "#07141d",
  hullDark: "#4a291d",
  hull: "#8b4c2b",
  deck: "#c27b3e",
  deckLight: "#e1a756",
  brass: "#d9a441",
  brassLight: "#ffe29a",
  foam: "#9ed9d5",
  foamLight: "#ddfff5",
};

function hex(value, alpha = 255) {
  const clean = value.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
    alpha,
  ];
}

function canvas(width, height, fill = colors.transparent) {
  const data = Buffer.alloc(width * height * 4);
  const rgba = Array.isArray(fill) ? fill : hex(fill);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgba[0];
    data[index * 4 + 1] = rgba[1];
    data[index * 4 + 2] = rgba[2];
    data[index * 4 + 3] = rgba[3];
  }
  return { width, height, data };
}

function pixel(target, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= target.width || py >= target.height) return;
  const rgba = Array.isArray(color) ? color : hex(color);
  const index = (py * target.width + px) * 4;
  if (rgba[3] === 255 || target.data[index + 3] === 0) {
    target.data[index] = rgba[0];
    target.data[index + 1] = rgba[1];
    target.data[index + 2] = rgba[2];
    target.data[index + 3] = rgba[3];
    return;
  }
  const alpha = rgba[3] / 255;
  target.data[index] = Math.round(rgba[0] * alpha + target.data[index] * (1 - alpha));
  target.data[index + 1] = Math.round(rgba[1] * alpha + target.data[index + 1] * (1 - alpha));
  target.data[index + 2] = Math.round(rgba[2] * alpha + target.data[index + 2] * (1 - alpha));
  target.data[index + 3] = 255;
}

function rect(target, x, y, width, height, color) {
  for (let py = Math.floor(y); py < Math.ceil(y + height); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(x + width); px += 1) pixel(target, px, py, color);
  }
}

function line(target, x0, y0, x1, y1, color, thickness = 1) {
  let ax = Math.round(x0);
  let ay = Math.round(y0);
  const bx = Math.round(x1);
  const by = Math.round(y1);
  const dx = Math.abs(bx - ax);
  const sx = ax < bx ? 1 : -1;
  const dy = -Math.abs(by - ay);
  const sy = ay < by ? 1 : -1;
  let error = dx + dy;
  while (true) {
    const radius = Math.floor(thickness / 2);
    rect(target, ax - radius, ay - radius, thickness, thickness, color);
    if (ax === bx && ay === by) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      ax += sx;
    }
    if (e2 <= dx) {
      error += dx;
      ay += sy;
    }
  }
}

function circle(target, cx, cy, radius, color) {
  const squared = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= squared) pixel(target, x, y, color);
    }
  }
}

function ellipseRing(target, cx, cy, rx, ry, thickness, color, dash = 0) {
  const steps = Math.ceil(Math.PI * Math.max(rx, ry) * 2);
  let previous;
  for (let step = 0; step <= steps; step += 1) {
    if (dash > 0 && Math.floor(step / dash) % 2 === 1) {
      previous = undefined;
      continue;
    }
    const angle = (step / steps) * Math.PI * 2;
    const point = [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
    if (previous) line(target, previous[0], previous[1], point[0], point[1], color, thickness);
    previous = point;
  }
}

function polygon(target, points, color) {
  const minX = Math.floor(Math.min(...points.map(([x]) => x)));
  const maxX = Math.ceil(Math.max(...points.map(([x]) => x)));
  const minY = Math.floor(Math.min(...points.map(([, y]) => y)));
  const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
      }
      if (inside) pixel(target, x, y, color);
    }
  }
}

function blit(source, destination, offsetX, offsetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4;
      if (source.data[sourceIndex + 3] === 0) continue;
      pixel(destination, x + offsetX, y + offsetY, [
        source.data[sourceIndex],
        source.data[sourceIndex + 1],
        source.data[sourceIndex + 2],
        source.data[sourceIndex + 3],
      ]);
    }
  }
}

function randomFactory(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function drawHarborPier(target, originX, originY, facing, random) {
  const x = (distance) => originX + facing * distance;
  const plank = (start, top, width, height, color) => {
    rect(target, Math.min(x(start), x(start + width - 1)), originY + top, width, height, color);
  };
  for (const distance of [13, 46, 83]) {
    rect(target, x(distance) - 5, originY + 22, 11, 10, "#04222b");
    ellipseRing(target, x(distance), originY + 34, 14, 5, 1, "#438e88");
  }
  plank(0, -10, 97, 37, "#081a20");
  plank(0, -14, 94, 36, "#482a21");
  for (let distance = 0; distance < 94; distance += 6) {
    const width = Math.min(5, 94 - distance);
    plank(distance, -12, width, 30, distance % 18 === 0 ? "#ad7849" : "#886042");
    plank(distance, -11, 1, 27, "#c68e55");
    plank(distance + 2, Math.floor(random() * 15) - 4, 2, 10, "#71513b");
  }
  plank(0, -13, 95, 2, "#d0965a");
  plank(0, 18, 95, 3, "#c48a55");
  for (const distance of [13, 46, 83]) {
    for (const y of [-11, 19]) {
      circle(target, x(distance), originY + y, 5, "#34231b");
      circle(target, x(distance) - 1, originY + y - 2, 3, "#c18b54");
    }
  }
  plank(32, -6, 13, 13, "#37261e");
  plank(32, -6, 11, 10, "#b3814e");
  plank(51, 3, 10, 11, "#37261e");
  plank(51, 3, 8, 8, "#95734e");
}

function drawHarborRock(target, x, y, size) {
  const facet = (points, color) => polygon(target, points.map(([dx, dy]) => [x + dx * size, y + dy * size]), color);
  ellipseRing(target, x, y + 5 * size, 32 * size, 21 * size, 1, "#40827e");
  ellipseRing(target, x, y + 4 * size, 28 * size, 18 * size, 2, "#85c5b5", 9);
  facet([[-28, 2], [-15, -18], [3, -22], [19, -13], [25, 7], [9, 17], [-15, 18]], "#142e33");
  facet([[-24, 0], [-13, -16], [3, -22], [15, -12], [6, 0], [-9, 8]], "#596759");
  facet([[3, -22], [19, -13], [25, 7], [9, 17], [6, 0], [15, -12]], "#31484a");
  facet([[-24, 0], [-9, 8], [6, 0], [9, 17], [-15, 18]], "#3e5350");
  facet([[-13, -16], [3, -22], [10, -17], [3, -16], [-6, -10], [-18, -8]], "#7e886f");
}

function createArena() {
  const target = canvas(arena.logicalWidth, arena.logicalHeight, "#061c29");
  for (let y = 0; y < target.height; y += 3) {
    for (let x = 0; x < target.width; x += 3) {
      const edge = Math.hypot((x - 380) / 425, (y - 210) / 252);
      const shoal = Math.min(1, Math.max(0, (edge - 0.56) / 0.59));
      const swell = Math.sin(y / 23 + x / 83) * 1.6;
      rect(target, x, y, 3, 3, [
        Math.round(9 + shoal * 6),
        Math.round(46 + shoal * 27 + swell),
        Math.round(57 + shoal * 22 + swell), 255,
      ]);
    }
  }

  const random = randomFactory(0x4752414e);
  for (let index = 0; index < 170; index += 1) {
    const x = Math.floor(random() * target.width);
    const y = Math.floor(random() * target.height);
    const length = 5 + Math.floor(random() * 22);
    const bend = Math.floor(random() * 5) - 2;
    const edge = Math.hypot((x - 380) / 390, (y - 210) / 214);
    const color = edge > 0.76 ? "#286971" : "#134550";
    line(target, x, y, Math.min(target.width - 1, x + length), y + bend, color);
    if (index % 4 === 0) {
      line(target, x + 3, y + 2, Math.min(target.width - 1, x + Math.floor(length * 0.7)), y + bend + 2, "#0a3441");
    }
  }

  // Deep current lanes make the arena read as water while preserving a calm playfield.
  for (let lane = 0; lane < 9; lane += 1) {
    const baseY = 24 + lane * 48;
    let previousY = baseY;
    for (let x = 0; x < target.width; x += 6) {
      const y = baseY + Math.round(Math.sin((x + lane * 31) / 37) * 4);
      line(target, Math.max(0, x - 6), previousY, x, y, "#154854");
      previousY = y;
    }
  }

  // Central regatta current and brass compass rose.
  ellipseRing(target, 380, 210, 40, 40, 1, "#30585b", 4);
  ellipseRing(target, 380, 210, 33, 33, 1, "#2a5259");
  polygon(target, [[380, 172], [387, 203], [380, 210], [373, 203]], "#5a6960");
  polygon(target, [[380, 248], [373, 217], [380, 210], [387, 217]], "#324f53");
  polygon(target, [[342, 210], [373, 203], [380, 210], [373, 217]], "#476267");
  polygon(target, [[418, 210], [387, 217], [380, 210], [387, 203]], "#3b5558");
  circle(target, 380, 210, 4, "#687366");

  // Outer rope-and-buoy course boundary.
  ellipseRing(target, 380, 210, 333, 181, 3, "#071822");
  ellipseRing(target, 380, 210, 330, 178, 1, "#b9803e", 7);
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const x = Math.round(380 + Math.cos(angle) * 330);
    const y = Math.round(210 + Math.sin(angle) * 178);
    circle(target, x, y, 7, "#07141d");
    circle(target, x, y, 5, index % 2 === 0 ? "#bd4c49" : "#e5b14a");
    rect(target, x - 2, y - 4, 4, 3, "#f3dda0");
  }

  for (const [x, y, size] of [
    [19, 11, 1.25], [53, 12, 0.68], [28, 34, 0.66], [710, 28, 0.96], [746, 14, 1.3],
    [63, 382, 0.6], [35, 404, 1.18], [6, 385, 1.05], [733, 397, 1.22], [695, 405, 0.58],
  ]) drawHarborRock(target, x, y, size);
  drawHarborPier(target, 0, 91, 1, random);
  drawHarborPier(target, 759, 322, -1, random);

  // Sparse foam flecks around the edge add motion without hiding boats.
  for (let index = 0; index < 34; index += 1) {
    const angle = random() * Math.PI * 2;
    const radiusX = 284 + random() * 70;
    const radiusY = 151 + random() * 44;
    const x = Math.round(380 + Math.cos(angle) * radiusX);
    const y = Math.round(210 + Math.sin(angle) * radiusY);
    line(target, x - 3, y, x + 3, y, index % 3 === 0 ? "#bce9df" : "#63aaa7");
    pixel(target, x + (index % 2 === 0 ? 5 : -5), y + 2, "#438e91");
  }

  return target;
}

function localPoint(cx, cy, forward, right, side, ahead) {
  return [cx + right[0] * side + forward[0] * ahead, cy + right[1] * side + forward[1] * ahead];
}

function transformedPolygon(cx, cy, forward, right, points) {
  return points.map(([side, ahead]) => localPoint(cx, cy, forward, right, side, ahead));
}

function createBoatFrame(palette, rig, direction, animationFrame) {
  const target = canvas(boatFrame.logicalWidth, boatFrame.logicalHeight);
  const forward = [Math.cos(direction.angle), Math.sin(direction.angle)];
  const right = [-forward[1], forward[0]];
  const cx = 24;
  const cy = 23;
  const wakeShift = animationFrame % 2;

  // Wake trails animate independently while the vessel pivot remains fixed.
  for (let trail = 0; trail < 2; trail += 1) {
    const behind = -12 - trail * 4 - wakeShift;
    const spread = 5 + trail * 2;
    const leftA = localPoint(cx, cy, forward, right, -3, behind + 3);
    const leftB = localPoint(cx, cy, forward, right, -spread, behind);
    const rightA = localPoint(cx, cy, forward, right, 3, behind + 3);
    const rightB = localPoint(cx, cy, forward, right, spread, behind);
    const wakeColor = trail === 0 ? colors.foam : "#438e91";
    line(target, leftA[0], leftA[1], leftB[0], leftB[1], wakeColor, trail === 0 ? 2 : 1);
    line(target, rightA[0], rightA[1], rightB[0], rightB[1], wakeColor, trail === 0 ? 2 : 1);
  }
  const fleck = localPoint(cx, cy, forward, right, animationFrame % 2 === 0 ? -10 : 10, -9 - animationFrame);
  pixel(target, fleck[0], fleck[1], colors.foamLight);

  const { beam, length, sail } = rig;
  const hull = [[0, length], [beam - 1, 8], [beam, -6], [beam - 3, -13], [0, -length], [3 - beam, -13], [-beam, -6], [1 - beam, 8]];
  const hullInner = hull.map(([side, ahead]) => [side * 0.79, ahead * 0.83]);
  polygon(target, transformedPolygon(cx, cy, forward, right, hull), colors.ink);
  polygon(target, transformedPolygon(cx, cy, forward, right, hullInner), colors.hullDark);
  polygon(target, transformedPolygon(cx, cy, forward, right, [[0, 11], [4, 5], [4, -7], [0, -11], [-4, -7], [-4, 5]]), colors.deck);
  line(target, ...localPoint(cx, cy, forward, right, -3, -4), ...localPoint(cx, cy, forward, right, 3, -4), colors.deckLight);
  line(target, ...localPoint(cx, cy, forward, right, -3, 5), ...localPoint(cx, cy, forward, right, 3, 5), colors.hullDark);

  // Each fleet entry has its own sail silhouette as well as its own color.
  const sailOutline = transformedPolygon(cx, cy, forward, right, sail);
  const sailMain = transformedPolygon(cx, cy, forward, right, sail.map(([side, ahead]) => [side * 0.8, ahead * 0.86]));
  const sailShade = transformedPolygon(cx, cy, forward, right, [[0, 8], [-2, 0], [0, -7], [1, 0]]);
  polygon(target, sailOutline, colors.ink);
  polygon(target, sailMain, palette.sail);
  polygon(target, sailShade, palette.shade);
  line(target, ...localPoint(cx, cy, forward, right, 0, -10), ...localPoint(cx, cy, forward, right, 0, 11), colors.hullDark, 2);
  line(target, ...localPoint(cx, cy, forward, right, 0, 4), ...localPoint(cx, cy, forward, right, 5, 1), palette.trim);
  circle(target, ...localPoint(cx, cy, forward, right, 0, 0), 2, colors.ink);
  circle(target, ...localPoint(cx, cy, forward, right, 0, 0), 1, colors.brassLight);

  const bow = localPoint(cx, cy, forward, right, 0, 14);
  pixel(target, bow[0], bow[1], colors.brassLight);
  return target;
}

function drawBountyMotif(target, item, ox, oy) {
  const dark = colors.ink;
  const accent = item.accent;
  switch (item.motif) {
    case "blade":
      line(target, ox - 5, oy + 6, ox + 6, oy - 6, dark, 3);
      line(target, ox - 3, oy + 5, ox + 7, oy - 5, "#d9e0df");
      line(target, ox - 7, oy + 3, ox - 2, oy + 8, accent, 2);
      break;
    case "meat":
      circle(target, ox - 1, oy, 6, "#8f353b");
      circle(target, ox + 2, oy - 1, 4, "#df675a");
      line(target, ox + 4, oy + 3, ox + 8, oy + 7, accent, 3);
      circle(target, ox + 8, oy + 7, 2, "#fff0cf");
      break;
    case "clima":
      line(target, ox - 5, oy + 7, ox + 5, oy - 6, "#e8f5ed", 3);
      line(target, ox - 1, oy - 6, ox + 4, oy - 1, accent, 2);
      line(target, ox + 4, oy - 1, ox, oy + 1, accent, 2);
      break;
    case "goggles":
      circle(target, ox - 5, oy, 5, dark);
      circle(target, ox + 5, oy, 5, dark);
      circle(target, ox - 5, oy, 3, accent);
      circle(target, ox + 5, oy, 3, accent);
      line(target, ox - 1, oy, ox + 1, oy, "#e0a55d", 2);
      break;
    case "stone":
      polygon(target, [[ox, oy - 8], [ox + 7, oy - 3], [ox + 5, oy + 7], [ox - 4, oy + 8], [ox - 8, oy]], dark);
      polygon(target, [[ox, oy - 6], [ox + 5, oy - 2], [ox + 3, oy + 5], [ox - 3, oy + 6], [ox - 6, oy]], item.color);
      line(target, ox - 2, oy - 4, ox + 3, oy + 1, accent, 2);
      break;
    case "wraps":
      polygon(target, [[ox - 6, oy - 5], [ox + 4, oy - 7], [ox + 7, oy - 1], [ox + 5, oy + 7], [ox - 5, oy + 6], [ox - 8, oy]], dark);
      line(target, ox - 5, oy - 3, ox + 5, oy - 5, accent, 3);
      line(target, ox - 6, oy + 1, ox + 6, oy - 1, "#b9a68c", 3);
      line(target, ox - 4, oy + 5, ox + 5, oy + 3, accent, 3);
      break;
    case "snail":
      circle(target, ox - 2, oy + 1, 7, dark);
      circle(target, ox - 2, oy + 1, 5, item.color);
      circle(target, ox - 2, oy + 1, 2, accent);
      line(target, ox + 4, oy + 2, ox + 8, oy - 4, accent, 3);
      pixel(target, ox + 8, oy - 5, dark);
      pixel(target, ox + 5, oy - 5, dark);
      break;
    case "cola":
      rect(target, ox - 5, oy - 7, 10, 15, dark);
      rect(target, ox - 3, oy - 5, 6, 11, item.color);
      rect(target, ox - 2, oy - 9, 4, 3, "#e8e1c8");
      rect(target, ox - 3, oy - 1, 6, 3, accent);
      break;
  }
}

function createBountyFrame(item, animationFrame) {
  const target = canvas(bountyFrame.logicalWidth, bountyFrame.logicalHeight);
  const bob = [0, -1, 0, 1][animationFrame];
  const cx = 16;
  const cy = 16 + bob;

  ellipseRing(target, cx, 26, 14, 4, 1, "#7fc9c0");
  circle(target, cx, cy + 6, 12, "#092631");
  circle(target, cx, cy + 4, 11, "#a44f38");
  circle(target, cx, cy + 3, 9, "#d77d4c");
  rect(target, cx - 11, cy - 8, 22, 16, "#38281e");
  rect(target, cx - 10, cy - 7, 20, 14, "#f0d093");
  rect(target, cx - 10, cy - 7, 2, 14, "#ac6d37");
  rect(target, cx + 8, cy - 7, 2, 14, "#ac6d37");
  drawBountyMotif(target, item, cx, cy - 1);

  const sparklePositions = [[5, 5], [26, 7], [25, 26], [6, 24]];
  const [sx, sy] = sparklePositions[animationFrame];
  pixel(target, sx, sy, colors.foamLight);
  pixel(target, sx - 1, sy, colors.brassLight);
  pixel(target, sx + 1, sy, colors.brassLight);
  pixel(target, sx, sy - 1, colors.brassLight);
  pixel(target, sx, sy + 1, colors.brassLight);
  return target;
}

async function encode(target, width = target.width * scale, height = target.height * scale) {
  return sharp(target.data, {
    raw: { width: target.width, height: target.height, channels: 4 },
  })
    .resize(width, height, { kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

await mkdir(outputDirectory, { recursive: true });

const arenaBuffer = await encode(createArena(), arena.width, arena.height);
const arenaPath = path.join(outputDirectory, "ocean-arena.png");
await writeFile(arenaPath, arenaBuffer);

const boatColumns = 16;
const boatRows = 16;
const boatLogicalAtlas = canvas(boatColumns * boatFrame.logicalWidth, boatRows * boatFrame.logicalHeight);
const boatFrames = [];
for (let paletteIndex = 0; paletteIndex < palettes.length; paletteIndex += 1) {
  for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
    for (let animationFrame = 0; animationFrame < 4; animationFrame += 1) {
      const index = paletteIndex * 32 + directionIndex * 4 + animationFrame;
      const column = index % boatColumns;
      const row = Math.floor(index / boatColumns);
      blit(
        createBoatFrame(palettes[paletteIndex], rigging[paletteIndex], directions[directionIndex], animationFrame),
        boatLogicalAtlas,
        column * boatFrame.logicalWidth,
        row * boatFrame.logicalHeight,
      );
      boatFrames.push({
        paletteId: palettes[paletteIndex].id,
        direction: directions[directionIndex].id,
        animationFrame,
        index,
        x: column * boatFrame.width,
        y: row * boatFrame.height,
        w: boatFrame.width,
        h: boatFrame.height,
      });
    }
  }
}
const boatsBuffer = await encode(
  boatLogicalAtlas,
  boatColumns * boatFrame.width,
  boatRows * boatFrame.height,
);
const boatsPath = path.join(outputDirectory, "boats.png");
await writeFile(boatsPath, boatsBuffer);

const bountyColumns = 8;
const bountyRows = 4;
const bountyLogicalAtlas = canvas(bountyColumns * bountyFrame.logicalWidth, bountyRows * bountyFrame.logicalHeight);
const bountyItems = [];
for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
  const frames = [];
  for (let animationFrame = 0; animationFrame < 4; animationFrame += 1) {
    const index = animationFrame * bountyColumns + itemIndex;
    blit(
      createBountyFrame(items[itemIndex], animationFrame),
      bountyLogicalAtlas,
      itemIndex * bountyFrame.logicalWidth,
      animationFrame * bountyFrame.logicalHeight,
    );
    frames.push({
      animationFrame,
      index,
      x: itemIndex * bountyFrame.width,
      y: animationFrame * bountyFrame.height,
      w: bountyFrame.width,
      h: bountyFrame.height,
    });
  }
  bountyItems.push({
    id: items[itemIndex].id,
    name: items[itemIndex].name,
    column: itemIndex,
    frames,
  });
}
const bountiesBuffer = await encode(
  bountyLogicalAtlas,
  bountyColumns * bountyFrame.width,
  bountyRows * bountyFrame.height,
);
const bountiesPath = path.join(outputDirectory, "bounties.png");
await writeFile(bountiesPath, bountiesBuffer);

const manifest = {
  schemaVersion: 1,
  generator: "scripts/build_carousel_assets.mjs",
  pixelArt: true,
  sampling: "nearest-neighbor",
  arena: {
    file: "/assets/carousel/ocean-arena.png",
    width: arena.width,
    height: arena.height,
    logicalWidth: arena.width,
    logicalHeight: arena.height,
    authoredPixelGrid: {
      width: arena.logicalWidth,
      height: arena.logicalHeight,
      scale,
    },
  },
  boats: {
    file: "/assets/carousel/boats.png",
    width: boatColumns * boatFrame.width,
    height: boatRows * boatFrame.height,
    frameWidth: boatFrame.width,
    frameHeight: boatFrame.height,
    columns: boatColumns,
    rows: boatRows,
    pivot: { x: 48, y: 46 },
    directionOrder: directions.map(({ id }) => id),
    frameOrder: "palette-major,direction-major,animation-frame-minor",
    frameIndexFormula: "paletteIndex * 32 + directionIndex * 4 + animationFrame",
    animationFrameCount: 4,
    frameDurationMs: 140,
    palettes,
    frames: boatFrames,
  },
  bounties: {
    file: "/assets/carousel/bounties.png",
    width: bountyColumns * bountyFrame.width,
    height: bountyRows * bountyFrame.height,
    frameWidth: bountyFrame.width,
    frameHeight: bountyFrame.height,
    columns: bountyColumns,
    rows: bountyRows,
    pivot: { x: 32, y: 32 },
    frameOrder: "animation-frame-major,item-column-minor",
    frameIndexFormula: "animationFrame * 8 + itemColumn",
    animationFrameCount: 4,
    frameDurationMs: 160,
    itemIndexById: Object.fromEntries(items.map((item, index) => [item.id, index])),
    items: bountyItems,
  },
};

const manifestPath = path.join(outputDirectory, "carousel-manifest.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

// Visual QA sheet: arena overview, every palette/direction, and all token frames.
const contactWidth = 1400;
const contactHeight = 800;
const contactBase = await sharp({
  create: { width: contactWidth, height: contactHeight, channels: 4, background: "#07141d" },
})
  .png()
  .toBuffer();
const arenaPreview = await sharp(arenaBuffer)
  .resize(760, 420, { kernel: sharp.kernel.nearest })
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toBuffer();
const boatComposites = [];
for (let paletteIndex = 0; paletteIndex < palettes.length; paletteIndex += 1) {
  for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
    const index = paletteIndex * 32 + directionIndex * 4;
    const frame = await sharp(boatsBuffer)
      .extract({
        left: (index % boatColumns) * boatFrame.width,
        top: Math.floor(index / boatColumns) * boatFrame.height,
        width: boatFrame.width,
        height: boatFrame.height,
      })
      .resize(64, 64, { kernel: sharp.kernel.nearest })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer();
    boatComposites.push({ input: frame, left: 824 + directionIndex * 66, top: 24 + paletteIndex * 66 });
  }
}
const bountyPreview = await sharp(bountiesBuffer)
  .resize(512, 256, { kernel: sharp.kernel.nearest })
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toBuffer();
const contactSheetPath = path.join(outputDirectory, "contact-sheet.png");
await sharp(contactBase)
  .composite([
    { input: arenaPreview, left: 24, top: 24 },
    ...boatComposites,
    { input: bountyPreview, left: 24, top: 472 },
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toFile(contactSheetPath);

const generatedFiles = [
  path.join(root, "scripts", "build_carousel_assets.mjs"),
  arenaPath,
  boatsPath,
  bountiesPath,
  manifestPath,
  contactSheetPath,
];
const checksums = {};
for (const file of generatedFiles) checksums[path.relative(root, file).replaceAll("\\", "/")] = await sha256(file);
const checksumPath = path.join(outputDirectory, "checksums.sha256.json");
await writeFile(checksumPath, `${JSON.stringify({ algorithm: "sha256", files: checksums }, null, 2)}\n`, "utf8");

for (const [file, digest] of Object.entries(checksums)) console.log(`${digest}  ${file}`);
console.log(`Built ${path.relative(root, checksumPath)} with ${boatFrames.length} boat frames and ${items.length * 4} bounty frames.`);
