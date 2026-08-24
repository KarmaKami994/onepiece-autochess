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

function createArena() {
  const target = canvas(arena.logicalWidth, arena.logicalHeight, "#061c29");
  const bands = ["#082735", "#09313e", "#0a3945", "#0b414b", "#0d4851"];
  for (let y = 0; y < target.height; y += 6) {
    const band = bands[Math.floor(y / 18) % bands.length];
    rect(target, 0, y, target.width, 6, band);
  }

  const random = randomFactory(0x4752414e);
  for (let index = 0; index < 170; index += 1) {
    const x = Math.floor(random() * target.width);
    const y = Math.floor(random() * target.height);
    const length = 5 + Math.floor(random() * 22);
    const bend = Math.floor(random() * 5) - 2;
    const color = index % 5 === 0 ? "#26717a" : index % 3 === 0 ? "#155663" : "#0e4a57";
    line(target, x, y, Math.min(target.width - 1, x + length), y + bend, color, index % 7 === 0 ? 2 : 1);
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
      line(target, Math.max(0, x - 6), previousY, x, y, lane % 2 === 0 ? "#155a66" : "#104b59");
      previousY = y;
    }
  }

  // Central regatta current and brass compass rose.
  ellipseRing(target, 380, 210, 184, 126, 5, "#06212d");
  ellipseRing(target, 380, 210, 181, 123, 2, "#2f7e81", 14);
  ellipseRing(target, 380, 210, 151, 99, 1, "#58a7a0", 10);
  ellipseRing(target, 380, 210, 105, 67, 2, "#0a303b");
  ellipseRing(target, 380, 210, 72, 45, 1, "#398188", 8);
  circle(target, 380, 210, 29, "#082a36");
  circle(target, 380, 210, 24, "#0e4650");
  polygon(target, [[380, 178], [387, 207], [380, 202], [373, 207]], "#e6b34b");
  polygon(target, [[380, 242], [373, 213], [380, 218], [387, 213]], "#7b4d2d");
  polygon(target, [[348, 210], [377, 203], [372, 210], [377, 217]], "#d8d0a4");
  polygon(target, [[412, 210], [383, 217], [388, 210], [383, 203]], "#b14a4d");
  circle(target, 380, 210, 5, "#f4d37a");
  circle(target, 380, 210, 2, "#382619");

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

  // Rocky shoals stay beyond the navigable oval and frame the scene.
  for (const [x, y, flip] of [[25, 25, 1], [735, 28, -1], [30, 390, -1], [731, 386, 1]]) {
    polygon(target, [[x - 25 * flip, y + 8], [x - 12 * flip, y - 13], [x + 8 * flip, y - 18], [x + 27 * flip, y + 2], [x + 13 * flip, y + 18], [x - 16 * flip, y + 19]], "#071720");
    polygon(target, [[x - 18 * flip, y + 5], [x - 8 * flip, y - 10], [x + 7 * flip, y - 13], [x + 20 * flip, y + 2], [x + 9 * flip, y + 12], [x - 11 * flip, y + 13]], "#36505a");
    line(target, x - 15 * flip, y - 2, x + 5 * flip, y - 9, "#758078", 2);
    line(target, x - 22 * flip, y + 24, x + 24 * flip, y + 23, "#8bd0cc", 2);
  }

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

function createBoatFrame(palette, direction, animationFrame) {
  const target = canvas(boatFrame.logicalWidth, boatFrame.logicalHeight);
  const forward = [Math.cos(direction.angle), Math.sin(direction.angle)];
  const right = [-forward[1], forward[0]];
  const cx = 24;
  const cy = 23;
  const wakeShift = animationFrame % 2;

  // Wake trails animate independently while the vessel pivot remains fixed.
  for (let trail = 0; trail < 3; trail += 1) {
    const behind = -12 - trail * 4 - wakeShift;
    const spread = 5 + trail * 2;
    const leftA = localPoint(cx, cy, forward, right, -3, behind + 3);
    const leftB = localPoint(cx, cy, forward, right, -spread, behind);
    const rightA = localPoint(cx, cy, forward, right, 3, behind + 3);
    const rightB = localPoint(cx, cy, forward, right, spread, behind);
    const wakeColor = trail === 0 ? colors.foamLight : trail === 1 ? colors.foam : "#438e91";
    line(target, leftA[0], leftA[1], leftB[0], leftB[1], wakeColor, trail === 0 ? 2 : 1);
    line(target, rightA[0], rightA[1], rightB[0], rightB[1], wakeColor, trail === 0 ? 2 : 1);
  }
  const fleck = localPoint(cx, cy, forward, right, animationFrame % 2 === 0 ? -10 : 10, -9 - animationFrame);
  pixel(target, fleck[0], fleck[1], colors.foamLight);

  const hull = [[0, 16], [7, 8], [8, -7], [5, -14], [0, -17], [-5, -14], [-8, -7], [-7, 8]];
  const hullInner = [[0, 13], [5, 6], [6, -7], [3, -12], [0, -14], [-3, -12], [-6, -7], [-5, 6]];
  polygon(target, transformedPolygon(cx, cy, forward, right, hull), colors.ink);
  polygon(target, transformedPolygon(cx, cy, forward, right, hullInner), colors.hullDark);
  polygon(target, transformedPolygon(cx, cy, forward, right, [[0, 11], [4, 5], [4, -7], [0, -11], [-4, -7], [-4, 5]]), colors.deck);
  line(target, ...localPoint(cx, cy, forward, right, -3, -4), ...localPoint(cx, cy, forward, right, 3, -4), colors.deckLight);
  line(target, ...localPoint(cx, cy, forward, right, -3, 5), ...localPoint(cx, cy, forward, right, 3, 5), colors.hullDark);

  // Top-down mast and split lateen sail, outlined for readability on any sea tile.
  const sailOutline = transformedPolygon(cx, cy, forward, right, [[-1, 10], [8, 1], [-1, -10], [-4, 0]]);
  const sailMain = transformedPolygon(cx, cy, forward, right, [[0, 8], [6, 1], [0, -8], [-2, 0]]);
  const sailShade = transformedPolygon(cx, cy, forward, right, [[0, 8], [-2, 0], [0, -8], [1, 0]]);
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

  circle(target, cx, cy + 2, 14, "#07141d");
  circle(target, cx, cy + 1, 12, "#9b6033");
  circle(target, cx, cy, 10, "#e0ad4e");
  circle(target, cx, cy, 8, "#f3dda0");
  rect(target, cx - 7, cy - 6, 14, 12, "#ead49b");
  pixel(target, cx - 7, cy - 6, "#b78042");
  pixel(target, cx + 7, cy + 6, "#b78042");
  drawBountyMotif(target, item, cx, cy);

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
        createBoatFrame(palettes[paletteIndex], directions[directionIndex], animationFrame),
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
