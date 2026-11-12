// Explicit, offline authoring step. Build/CI/export read frozen pixel sources;
// they never invoke this drawing program or any image service.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ICON_FAMILIES, ICON_PILOTS, PIXEL_SYMBOLS, iconCataloguePath, iconSourcePath, pixelIconSvg } from "./pixel_icon_source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outline = "#211b29", ivory = "#f8e7bc", gold = "#dab357", steel = "#8da6b8";
const mix = (a, b, t) => "#" + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

function painter(tones = 4) {
  const pixels = Array.from({ length: 48 }, () => Array(48).fill(null));
  const dot = (x, y, color) => { if (x >= 0 && x < 48 && y >= 0 && y < 48) pixels[y][x] = color; };
  function mask(points) {
    const result = [];
    for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j];
        if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) result.push([x, y]);
    }
    return result;
  }
  function fill(points, color, shaded = true, border = true) {
    if (!points.length) return;
    if (border) for (const [x, y] of points) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) dot(x + dx, y + dy, outline);
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const left = Math.min(...xs), top = Math.min(...ys), range = Math.max(...xs) - left + Math.max(...ys) - top || 1;
    const ramp = tones === 3 ? [mix(color, ivory, .52), color, mix(color, outline, .4)] : [mix(color, ivory, .52), color, mix(color, outline, .26), mix(color, outline, .5)];
    for (const [x, y] of points) dot(x, y, shaded ? ramp[Math.min(tones - 1, Math.floor((x - left + y - top) / range * tones))] : color);
  }
  const poly = (points, color, shaded = true, border = true) => fill(mask(points), color, shaded, border);
  const rect = (x, y, w, h, color, shaded = true, border = true) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, shaded, border);
  const oval = (cx, cy, rx, ry, color, shaded = true, border = true) => {
    const points = [];
    for (let y = 0; y < 48; y += 1) for (let x = 0; x < 48; x += 1) if (((x - cx + .5) / rx) ** 2 + ((y - cy + .5) / ry) ** 2 <= 1) points.push([x, y]);
    fill(points, color, shaded, border);
  };
  function line(x, y, tx, ty, color, width = 1) {
    const steps = Math.max(Math.abs(tx - x), Math.abs(ty - y));
    for (let i = 0; i <= steps; i += 1) rect(Math.round(x + (tx - x) * i / (steps || 1)), Math.round(y + (ty - y) * i / (steps || 1)), width, width, color, false, false);
  }
  const star = (x, y, r, color) => poly(Array.from({ length: 10 }, (_, i) => {
    const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? r * .44 : r;
    return [Math.round(x + Math.cos(a) * radius), Math.round(y + Math.sin(a) * radius)];
  }), color);
  return { pixels, dot, poly, rect, oval, line, star };
}

function frame(p, family, spec) {
  const { rect, poly, oval } = p;
  if (family === "traits") {
    oval(24, 24, 22, 22, outline, false, false); oval(24, 24, 20, 20, spec.color);
    oval(24, 24, 18, 18, "#151d2e", false, false);
  } else {
    poly([[7, 3], [41, 3], [45, 7], [45, 41], [41, 45], [7, 45], [3, 41], [3, 7]], outline, false, false);
    const rim = family === "items" ? spec.kind === "completed" ? gold : steel : family === "food" ? "#73b8a0" : spec.color;
    poly([[8, 5], [40, 5], [43, 8], [43, 40], [40, 43], [8, 43], [5, 40], [5, 8]], rim);
    rect(8, 8, 32, 32, "#151d2e", false, false);
    if (spec.kind === "completed") {
      for (const [x, y] of [[6, 6], [40, 6], [6, 40], [40, 40]]) rect(x, y, 2, 2, ivory, false, false);
    }
  }
}

// Each shape is authored on the same 48px grid. Repeated motifs use explicit
// physical differences (broken blade, vessel/engine, closed/open/flaming book).
function draw(p, spec, family) {
  const { rect, poly, oval, line, star } = p;
  const c = spec.accent ?? spec.color, id = spec.id;
  const blade = (broken = false, reverse = false) => {
    poly(reverse ? [[14, 10], [18, 10], [34, 32], [31, 35], [12, 15]] : broken ? [[16, 32], [22, 23], [23, 17], [29, 18], [33, 12], [35, 16], [24, 35]] : [[15, 32], [33, 11], [37, 10], [36, 16], [20, 36]], steel);
    line(reverse ? 15 : 34, 12, reverse ? 31 : 18, 33, ivory);
    poly([[12, 29], [15, 28], [25, 37], [23, 40]], gold);
    line(16, 35, 11, 40, "#bd7964", 3);
  };
  const flame = (x = 24, y = 23, r = 15, color = c) => {
    poly([[x, y - r], [x + 4, y - 6], [x + 3, y], [x + 9, y - 5], [x + 12, y + 6], [x + 7, y + 13], [x - 6, y + 13], [x - 12, y + 6], [x - 10, y - 5], [x - 5, y + 1], [x - 4, y - 9]], color);
    poly([[x, y - 1], [x + 5, y + 8], [x + 2, y + 12], [x - 4, y + 11]], gold);
  };
  const cross = (x, y, color, w = 4, r = 9) => { rect(x - w / 2, y - r, w, r * 2, color); rect(x - r, y - w / 2, r * 2, w, color); };
  const shield = (color = c) => poly([[12, 11], [24, 8], [37, 12], [35, 29], [30, 36], [24, 40], [17, 35], [13, 28]], color);
  const shell = () => {
    poly([[12, 30], [10, 22], [14, 14], [23, 9], [32, 11], [38, 20], [36, 30], [29, 37], [19, 39]], c);
    for (const x of [15, 20, 25, 30]) line(19, 35, x + 5, 13, mix(c, ivory, .5));
    oval(22, 29, 5, 5, gold); oval(22, 29, 2, 2, outline, false, false);
  };
  const fist = (spikes = false) => {
    poly([[13, 23], [13, 15], [18, 13], [22, 15], [23, 12], [28, 12], [30, 16], [35, 16], [37, 21], [34, 32], [29, 36], [20, 36], [14, 30], [10, 26], [10, 21]], c);
    rect(18, 33, 14, 6, steel); for (const x of [19, 25, 31]) line(x, 17, x - 1, 23, mix(c, outline, .5));
    if (spikes) for (const x of [16, 24, 32]) poly([[x - 2, 16], [x, 8], [x + 3, 16]], steel);
    else { line(15, 26, 33, 29, ivory, 2); line(18, 31, 31, 33, ivory); }
  };
  const spiral = (color = ivory) => { line(16, 19, 29, 19, color, 2); line(29, 19, 29, 28, color, 2); line(29, 28, 20, 28, color, 2); line(20, 28, 20, 23, color, 2); line(20, 23, 25, 23, color, 2); };
  switch (spec.motif) {
    case "blade":
      poly([[14, 34], [18, 25], [25, 16], [29, 18], [35, 11], [36, 19], [32, 25], [29, 24], [26, 31], [21, 30], [20, 36]], steel);
      line(18, 30, 31, 16, ivory, 2); break;
    case "crossed-blades": blade(); blade(false, true); break;
    case "meat":
      if (id === "meat-platter") {
        oval(24, 32, 17, 8, steel); oval(24, 30, 14, 5, ivory);
        for (const [x, y] of [[17, 23], [29, 22]]) { oval(x, y, 8, 7, c); line(x - 3, y - 4, x + 2, y + 3, mix(c, outline, .5), 2); }
        poly([[12, 17], [14, 11], [18, 17], [23, 11], [24, 18]], "#74a56c");
      } else {
        line(10, 35, 34, 16, ivory, 4); oval(11, 37, 4, 3, ivory); oval(36, 15, 4, 3, ivory);
        oval(24, 25, 11, 9, c); oval(26, 23, 4, 5, "#f3b48b"); oval(26, 23, 2, 2, "#9c4941");
        line(17, 23, 20, 29, "#9c4941", 2);
      } break;
    case "crystal":
      poly([[12, 17], [18, 11], [34, 13], [38, 20], [34, 34], [23, 38], [12, 32]], c);
      poly([[18, 12], [26, 15], [23, 31], [13, 31]], mix(c, ivory, .5));
      poly([[26, 16], [35, 17], [33, 31], [24, 36]], mix(c, outline, .27));
      line(13, 24, 23, 27, ivory); break;
    case "storm":
      if (id === "clima-tact") {
        line(13, 37, 34, 13, steel, 3); for (const [x, y] of [[16, 31], [24, 22], [32, 13]]) oval(x, y, 5, 5, "#64c5e1");
        poly([[13, 10], [21, 10], [18, 17], [24, 17], [14, 26], [16, 18], [11, 18]], gold);
      } else { shell(); poly([[25, 13], [32, 13], [27, 22], [33, 22], [20, 34], [24, 25], [19, 25]], gold); }
      break;
    case "goggles": {
      rect(10, 20, 28, 9, "#775a45");
      const observation = id === "observation-goggles";
      for (const x of [17, 31]) { oval(x, 24, observation && x === 31 ? 9 : 7, observation && x === 31 ? 10 : 8, c); oval(x, 24, 4, 5, "#a9dce0"); line(x - 2, 21, x + 1, 23, ivory, 2); }
      rect(23, 22, 2, 4, gold); if (observation) line(31, 17, 31, 31, outline); break;
    }
    case "fist": fist(); break;
    case "spiked-fist": fist(true); break;
    case "snail":
      poly([[12, 31], [35, 30], [39, 34], [35, 37], [11, 37]], "#a9b584"); oval(23, 25, 11, 10, c); spiral(outline);
      oval(36, 28, 5, 5, "#e1cd95"); line(35, 25, 34, 20, gold, 2); line(39, 25, 40, 20, gold, 2);
      rect(33, 18, 3, 3, ivory); rect(39, 18, 3, 3, ivory); rect(34, 19, 1, 1, outline, false, false); rect(40, 19, 1, 1, outline, false, false);
      poly([[13, 17], [12, 12], [17, 9], [31, 9], [35, 13], [33, 17], [29, 16], [28, 13], [18, 13], [17, 17]], "#755557"); break;
    case "engine":
      rect(11, 15, 26, 23, steel); rect(16, 17, 16, 19, c); oval(24, 26, 7, 7, steel); oval(24, 26, 4, 4, gold);
      rect(9, 18, 3, 15, steel); rect(36, 18, 4, 7, steel); rect(13, 9, 8, 5, gold); rect(29, 8, 5, 7, steel);
      for (const x of [14, 34]) rect(x, 38, 3, 3, outline); break;
    case "skull":
      line(13, 34, 35, 13, ivory, 3); line(13, 13, 35, 34, ivory, 3); oval(24, 22, 11, 10, c); rect(18, 27, 12, 8, c);
      oval(19, 22, 3, 4, outline, false, false); oval(29, 22, 3, 4, outline, false, false); poly([[24, 26], [21, 29], [27, 29]], outline, false, false);
      for (const x of [21, 26]) line(x, 31, x, 34, outline); break;
    case "spiral":
      oval(23, 26, 13, 13, c); oval(33, 21, 5, 6, c); spiral();
      line(23, 13, 23, 9, "#759757", 3); poly([[24, 10], [28, 7], [33, 9], [28, 12]], "#759757"); break;
    case "canister":
      if (id === "cola-reservoir") { rect(11, 16, 25, 21, c); oval(23, 16, 12, 4, steel); rect(10, 33, 29, 4, steel); line(36, 17, 39, 13, steel, 3); rect(14, 22, 18, 7, ivory); star(23, 25, 4, "#a73b44"); rect(14, 34, 3, 5, steel); rect(32, 34, 3, 5, steel); }
      else { rect(17, 13, 14, 25, c); oval(24, 13, 7, 3, steel); rect(19, 9, 10, 3, steel); rect(17, 20, 14, 10, ivory); star(24, 25, 4, "#a73b44"); line(19, 15, 19, 18, ivory); }
      break;
    case "dial": shell(); if (id === "reflect-dial") { oval(27, 23, 6, 8, "#b8e3eb"); line(25, 18, 29, 21, ivory, 2); } break;
    case "lens":
      line(30, 31, 36, 38, "#805f44", 5); oval(23, 22, 13, 13, c); oval(23, 22, 9, 9, "#95cfdc"); line(17, 18, 22, 15, ivory, 2); line(23, 16, 23, 28, outline); line(17, 22, 29, 22, outline); break;
    case "plate": shield(); rect(19, 14, 10, 20, mix(c, ivory, .45)); for (const [x, y] of [[15, 15], [33, 15], [24, 35]]) rect(x, y, 2, 2, steel); break;
    case "sash":
      if (id === "jet-sash") { poly([[13, 13], [20, 13], [34, 32], [30, 37], [17, 23], [10, 35], [9, 27]], c); rect(28, 29, 9, 5, steel); for (const y of [18, 23, 28]) line(30, y, 39, y, ivory, 2); }
      else if (id === "armament-sash") { poly([[9, 14], [17, 10], [38, 32], [34, 38]], c); poly([[35, 11], [39, 18], [17, 38], [10, 34]], mix(c, outline, .3)); rect(20, 21, 9, 7, steel); }
      else { poly([[13, 12], [22, 11], [36, 31], [30, 38]], c); poly([[24, 24], [17, 38], [24, 34], [28, 39], [32, 30]], "#ad654d"); rect(20, 20, 11, 8, gold); star(25, 24, 3, ivory); } break;
    case "compass":
      rect(21, 8, 6, 4, gold); oval(24, 26, 14, 13, gold); oval(24, 26, 10, 10, "#9dc9c1"); poly([[30, 17], [26, 27], [18, 34], [22, 24]], "#d56355"); line(24, 16, 24, 19, ivory); line(14, 26, 17, 26, ivory); break;
    case "coat":
      poly([[16, 10], [10, 16], [8, 31], [15, 32], [17, 20], [14, 39], [34, 39], [31, 20], [34, 32], [40, 31], [37, 16], [31, 10], [25, 16], [23, 16]], c);
      poly([[20, 12], [24, 17], [28, 12], [28, 36], [20, 36]], "#2d5079"); for (const x of [14, 32]) rect(x, 12, 3, 3, gold); break;
    case "book": case "flame-book":
      if (id === "captains-logbook") { rect(12, 12, 25, 26, "#bb8452"); rect(16, 10, 19, 26, c); line(16, 12, 16, 34, gold, 2); oval(26, 22, 6, 6, gold); star(26, 22, 4, ivory); rect(33, 26, 6, 4, steel); line(17, 37, 34, 37, ivory); }
      else { poly([[10, 17], [15, 15], [24, 20], [33, 15], [38, 17], [38, 38], [32, 36], [24, 39], [16, 36], [10, 38]], c); poly([[13, 19], [20, 21], [23, 24], [23, 35], [14, 32]], "#e6c59b"); poly([[25, 24], [29, 21], [35, 19], [34, 32], [25, 35]], "#cda97e");
        if (spec.motif === "flame-book") flame(24, 14, 7, "#ef7247"); else { line(17, 24, 19, 30, "#a458ad", 2); line(30, 24, 28, 30, "#a458ad", 2); oval(24, 13, 4, 4, c); } }
      break;
    case "shield": case "star-shield": case "broken-shield":
      shield(); if (spec.motif === "star-shield") star(24, 23, 9, ivory);
      else if (spec.motif === "broken-shield") { poly([[25, 10], [20, 23], [27, 23], [21, 40], [27, 28], [24, 25], [30, 10]], outline, false, false); line(34, 32, 39, 39, "#e88859", 2); }
      else { rect(22, 14, 4, 17, steel); rect(16, 20, 16, 4, steel); } break;
    case "flame": flame(); if (id === "mera-mera-ember") { oval(24, 34, 10, 4, "#8c4d47"); flame(24, 24, 14, c); } break;
    case "eye": case "closed-eye":
      if (spec.motif === "eye") { poly([[9, 24], [16, 16], [24, 13], [32, 16], [39, 24], [31, 31], [24, 34], [16, 31]], ivory); oval(24, 24, 8, 10, c); oval(24, 24, 3, 6, outline, false, false); rect(21, 18, 3, 3, ivory); }
      else { line(10, 22, 20, 28, c, 3); line(20, 28, 29, 28, c, 3); line(29, 28, 38, 21, c, 3); for (const [x, y] of [[14, 26], [23, 29], [32, 26]]) line(x, y, x - 2, y + 6, ivory, 2); line(13, 12, 35, 36, "#d7836e", 3); } break;
    case "bubble": case "healing-bubble":
      oval(24, 24, 15, 15, c); oval(25, 25, 11, 11, "#254259", false, false); line(15, 18, 19, 13, ivory, 2);
      if (spec.motif === "healing-bubble") cross(25, 25, "#93e5b1", 4, 7); else line(31, 28, 30, 33, c, 2); break;
    case "boots":
      for (const [x, y] of [[12, 12], [25, 16]]) { rect(x, y, 9, 18, c); poly([[x, y + 14], [x + 8, y + 14], [x + 13, y + 20], [x + 12, y + 24], [x, y + 24]], c); rect(x, y + 23, 13, 3, steel); rect(x + 1, y + 3, 7, 3, gold); } break;
    case "ribbon":
      poly([[24, 21], [12, 11], [9, 22], [14, 28]], c); poly([[24, 21], [36, 11], [39, 22], [34, 28]], c);
      poly([[21, 24], [14, 39], [22, 34], [25, 39], [27, 25]], c); poly([[27, 24], [34, 39], [27, 35], [24, 38], [23, 26]], c); oval(24, 23, 5, 5, gold); break;
    case "scope":
      poly([[11, 21], [30, 14], [38, 18], [38, 27], [19, 34], [11, 30]], steel); oval(15, 26, 6, 7, c); oval(15, 26, 3, 4, "#b0dcde"); rect(26, 32, 8, 5, "#725d4e");
      if (id === "armor-piercing-scope") { line(23, 23, 36, 19, "#e5a266", 3); poly([[31, 14], [39, 18], [33, 25]], gold); } else { rect(24, 10, 6, 10, c); oval(27, 10, 3, 3, "#b8c9e3"); line(24, 25, 32, 23, c, 2); } break;
    case "tooth":
      line(13, 12, 24, 17, "#947354", 2); line(24, 17, 35, 12, "#947354", 2); poly([[16, 16], [31, 17], [28, 28], [21, 38], [16, 27]], c); rect(16, 17, 14, 4, gold); break;
    case "talisman":
      line(24, 10, 24, 6, "#bf6255", 2); poly([[16, 10], [31, 10], [34, 16], [31, 36], [24, 40], [16, 36]], c); rect(20, 16, 9, 15, "#bc6855"); line(22, 18, 27, 29, ivory, 2); line(27, 18, 22, 29, ivory, 2); break;
    case "bandanna": case "null":
      poly([[10, 14], [37, 14], [35, 28], [24, 33], [13, 28]], c); poly([[15, 27], [10, 39], [21, 31], [28, 38], [33, 28]], c);
      if (spec.motif === "null") { oval(24, 22, 7, 7, steel); oval(24, 22, 4, 4, outline, false, false); line(19, 17, 29, 27, "#e6aa8e", 2); }
      else { line(14, 18, 34, 18, ivory, 2); poly([[21, 23], [28, 21], [26, 28]], ivory); } break;
    case "flag":
      line(13, 9, 13, 40, "#be9c6d", 3); poly([[16, 11], [36, 12], [31, 20], [38, 28], [16, 27]], c); line(21, 17, 29, 20, ivory, 2); line(29, 20, 21, 23, ivory, 2); break;
    case "ricochet": case "reversal":
      if (spec.motif === "reversal") { oval(24, 25, 15, 11, c); oval(24, 25, 9, 6, outline, false, false); line(14, 18, 33, 18, ivory, 2); poly([[31, 12], [39, 18], [31, 24]], gold); line(14, 32, 32, 32, ivory, 2); poly([[17, 26], [9, 32], [17, 38]], gold); }
      else { shell(); line(15, 31, 25, 21, ivory, 3); line(25, 21, 31, 28, ivory, 3); poly([[25, 29], [35, 32], [35, 22]], gold); } break;
    case "impact": shell(); star(26, 23, 11, gold); oval(26, 23, 3, 3, ivory); break;
    case "chest":
      poly([[10, 22], [14, 14], [33, 14], [38, 21], [38, 38], [10, 38]], "#a66940"); rect(10, 23, 28, 3, gold); rect(14, 14, 4, 24, gold); rect(31, 14, 4, 24, gold); rect(21, 23, 7, 10, gold); rect(23, 26, 3, 4, outline); break;
    case "smoke-star":
      for (const [x, y, r] of [[15, 31, 6], [24, 35, 7], [33, 30, 6]]) oval(x, y, r, r - 1, steel);
      star(25, 21, 13, gold); oval(25, 21, 3, 3, c); break;
    case "mask":
      poly([[12, 14], [18, 9], [31, 10], [37, 17], [35, 30], [29, 37], [19, 37], [12, 29]], c);
      for (const x of [18, 30]) { oval(x, 20, 5, 6, steel); oval(x, 20, 3, 4, "#283c47"); }
      oval(24, 31, 6, 6, steel); for (const x of [21, 24, 27]) line(x, 28, x, 33, outline); break;
    case "gauntlet":
      poly([[13, 21], [13, 11], [17, 10], [20, 18], [20, 9], [25, 9], [25, 17], [28, 11], [33, 12], [33, 20], [36, 18], [39, 21], [35, 30], [31, 33], [30, 39], [17, 39], [17, 31], [10, 25]], c);
      rect(17, 31, 16, 6, gold); oval(25, 23, 6, 6, steel); oval(25, 23, 3, 3, gold); break;
    case "feather": case "phoenix":
      poly([[13, 37], [14, 25], [20, 17], [35, 9], [37, 16], [31, 25], [27, 25], [29, 30], [22, 30], [23, 34]], c); line(12, 40, 31, 17, gold, 2); line(19, 26, 19, 33, ivory); line(26, 19, 26, 26, ivory);
      if (spec.motif === "phoenix") { line(12, 14, 12, 8, ivory, 2); line(9, 11, 15, 11, ivory, 2); line(34, 36, 34, 30, gold, 2); line(31, 33, 37, 33, gold, 2); } break;
    case "belt":
      rect(9, 19, 30, 13, "#b07c4c"); rect(19, 15, 15, 20, gold); rect(23, 19, 7, 12, "#5a4b42"); line(22, 25, 30, 25, steel, 2); for (const x of [12, 16, 36]) rect(x, 25, 1, 2, outline); break;
    case "healing-dial": shell(); cross(26, 23, "#b5e5b0", 4, 8); break;
    case "dummy":
      line(24, 13, 24, 39, "#876148", 4); line(11, 24, 37, 24, "#876148", 4); oval(24, 14, 7, 7, "#cab184"); rect(17, 22, 14, 12, c); for (const y of [24, 28, 32]) line(17, y, 30, y, ivory); rect(14, 39, 20, 3, "#876148"); break;
    case "orb":
      oval(24, 24, 14, 14, c); line(14, 18, 25, 13, ivory, 2); line(16, 27, 29, 31, gold, 2); poly([[34, 9], [31, 18], [36, 18], [30, 29], [37, 23], [34, 21], [40, 10]], "#db7d74"); break;
    case "bomb":
      line(30, 15, 33, 9, "#b8a076", 2); star(35, 10, 6, gold); rect(26, 14, 7, 5, steel); oval(23, 28, 13, 12, "#596274"); oval(19, 23, 4, 3, steel); rect(19, 32, 10, 3, c); break;
    case "helm":
      poly([[11, 26], [12, 16], [19, 10], [28, 10], [36, 16], [37, 26], [34, 37], [29, 37], [29, 27], [19, 27], [19, 37], [13, 37]], c);
      rect(22, 9, 4, 18, steel); line(14, 22, 34, 22, ivory, 2); rect(20, 24, 3, 3, outline); rect(27, 24, 3, 3, outline); break;
    case "hat":
      poly([[14, 25], [16, 15], [20, 11], [29, 11], [33, 16], [35, 25]], gold); rect(15, 22, 20, 5, "#bf514d"); oval(24, 29, 17, 6, gold); line(11, 29, 32, 30, ivory); break;
    case "anchor":
      oval(24, 13, 5, 5, c); oval(24, 13, 2, 2, outline, false, false); rect(22, 17, 4, 20, c); rect(14, 20, 20, 3, steel);
      poly([[9, 28], [15, 30], [13, 32], [22, 37], [26, 37], [35, 32], [33, 30], [39, 28], [37, 35], [25, 41], [23, 41], [11, 35]], c); break;
    case "crown": case "wave-crown":
      poly([[11, 17], [19, 23], [24, 11], [29, 23], [37, 17], [34, 32], [14, 32]], c); rect(14, 30, 20, 5, gold); oval(24, 26, 3, 3, ivory);
      if (spec.motif === "wave-crown") { line(11, 38, 18, 36, steel, 2); line(18, 36, 26, 39, steel, 2); line(26, 39, 36, 36, steel, 2); } break;
    case "starburst": star(24, 24, 16, c); oval(24, 24, 6, 6, gold); oval(24, 24, 2, 2, ivory); break;
    case "linked-fists":
      poly([[10, 17], [16, 14], [24, 21], [20, 28], [14, 29], [8, 23]], c); poly([[38, 17], [32, 14], [24, 21], [28, 28], [34, 29], [40, 23]], "#dca97d");
      line(17, 33, 22, 37, gold, 3); line(22, 37, 29, 33, gold, 3); rect(21, 24, 6, 6, ivory); break;
    case "flame-gear":
      for (const [x, y, w, h] of [[21, 8, 6, 5], [21, 36, 6, 5], [8, 21, 5, 6], [36, 21, 5, 6], [12, 12, 5, 5], [31, 31, 5, 5], [31, 12, 5, 5], [12, 31, 5, 5]]) rect(x, y, w, h, steel);
      oval(24, 24, 15, 15, steel); oval(24, 24, 10, 10, outline, false, false); flame(24, 23, 11); break;
    case "wheel-star":
      for (const [x, y] of [[24, 8], [39, 24], [24, 39], [9, 24], [13, 13], [35, 35], [13, 35], [35, 13]]) line(24, 24, x, y, c, 3);
      oval(24, 24, 13, 13, c); oval(24, 24, 9, 9, outline, false, false); star(24, 24, 7, ivory); break;
    case "reticle":
      oval(24, 24, 13, 13, c); oval(24, 24, 9, 9, outline, false, false); for (const [x, y] of [[24, 8], [39, 24], [24, 39], [9, 24]]) line(24, 24, x, y, steel, 2); oval(24, 24, 3, 3, gold); break;
    case "poison":
      oval(24, 21, 11, 11, c); rect(17, 26, 14, 9, c); oval(19, 22, 3, 4, outline, false, false); oval(29, 22, 3, 4, outline, false, false);
      line(13, 38, 35, 32, ivory, 2); line(13, 32, 35, 38, ivory, 2); break;
    case "snowflake":
      for (const [x, y] of [[24, 9], [24, 39], [11, 16], [37, 32], [11, 32], [37, 16]]) { line(24, 24, x, y, c, 3); line(x, y, x + (x < 24 ? 5 : -5), y, ivory, 2); }
      oval(24, 24, 4, 4, ivory); break;
    case "sleep":
      for (const [x, y, size] of [[11, 12, 14], [28, 26, 10]]) { line(x, y, x + size, y, c, 3); line(x + size, y, x, y + size, c, 3); line(x, y + size, x + size, y + size, c, 3); } break;
    case "lock":
      oval(24, 20, 9, 11, steel); oval(24, 20, 5, 7, outline, false, false); rect(12, 23, 24, 15, c); oval(24, 29, 3, 3, outline, false, false); rect(23, 30, 2, 5, outline, false, false); break;
    case "stars": star(17, 18, 8, gold); star(32, 16, 5, ivory); star(30, 31, 8, c); line(10, 33, 16, 37, steel, 2); line(16, 37, 22, 36, steel, 2); break;
    case "slash":
      for (const x of [12, 21, 30]) poly([[x + 4, 10], [x + 7, 15], [x + 2, 35], [x - 2, 39]], c); line(13, 18, 30, 31, ivory, 2); break;
    case "bolt": poly([[24, 9], [34, 9], [27, 21], [35, 21], [17, 39], [22, 26], [13, 26]], c); line(31, 10, 25, 20, ivory, 2); break;
    case "bento":
      rect(9, 15, 30, 24, "#995a40"); rect(12, 18, 24, 18, "#d3b284"); line(24, 18, 24, 36, outline, 2); line(12, 27, 23, 27, outline, 2);
      rect(14, 20, 7, 5, ivory); rect(14, 29, 7, 5, ivory); oval(30, 23, 5, 4, "#e48d66"); poly([[27, 32], [29, 28], [31, 32], [34, 28], [34, 35], [27, 35]], "#83ae6a");
      line(12, 10, 36, 10, "#dab380", 2); line(13, 13, 37, 13, "#dab380", 2); break;
    case "bottle":
      rect(20, 9, 9, 6, steel); poly([[20, 15], [28, 15], [28, 20], [34, 25], [34, 38], [14, 38], [14, 25], [20, 20]], c); rect(15, 27, 18, 9, ivory); star(24, 31, 4, "#a9404f"); line(19, 23, 19, 26, ivory, 2); break;
    case "curry":
      oval(24, 33, 17, 8, steel, false); oval(24, 30, 15, 7, "#a7683e", false); oval(18, 27, 8, 7, ivory); for (const [x, y] of [[28, 27], [33, 30], [27, 33]]) rect(x, y, 4, 3, gold, false);
      for (const x of [17, 24, 31]) { line(x, 19, x - 2, 15, "#e5c99e", 2); line(x - 2, 15, x, 11, "#e5c99e", 2); } break;
    default: throw new Error(`No authored ${family} motif for ${id}: ${spec.motif}`);
  }
}

// Small trait badges use the actual trait silhouette, not a generic plus sign.
function badge(p, trait) {
  const small = painter(); draw(small, trait, "traits");
  p.rect(33, 33, 11, 11, gold); p.rect(34, 34, 9, 9, "#182136", false, false);
  for (let y = 0; y < 9; y += 1) for (let x = 0; x < 9; x += 1) {
    const color = small.pixels[8 + y * 3]?.[8 + x * 3];
    if (color) p.dot(34 + x, 34 + y, color);
  }
}

const traits = JSON.parse(await readFile(path.join(root, iconCataloguePath("traits")), "utf8")).traits;
for (const [family, key] of Object.entries(ICON_FAMILIES)) {
  const catalogue = JSON.parse(await readFile(path.join(root, iconCataloguePath(family)), "utf8"));
  for (const spec of catalogue[key]) {
    if (!process.argv.includes("--replace-authoring-source")) {
      let exists = false;
      try { await access(path.join(root, iconSourcePath(family, spec.id))); exists = true; } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (exists) throw new Error("Frozen sources exist. Edit their palette/rows directly; intentional re-authoring requires --replace-authoring-source.");
    }
    const directory = path.dirname(path.join(root, iconSourcePath(family, spec.id)));
    await mkdir(directory, { recursive: true });
    let pixels;
    if (family === "items" && ICON_PILOTS.has(spec.id)) {
      const svg = await readFile(path.join(root, "art/production/b10/icons", `${spec.id}.svg`));
      const raw = await sharp(svg).ensureAlpha().raw().toBuffer();
      pixels = Array.from({ length: 48 }, (_, y) => Array.from({ length: 48 }, (_, x) => {
        const offset = (y * 48 + x) * 4;
        return raw[offset + 3] ? "#" + [...raw.subarray(offset, offset + 3)].map(v => v.toString(16).padStart(2, "0")).join("") : null;
      }));
    } else {
      const p = painter(family === "food" ? 3 : 4); frame(p, family, spec); draw(p, spec, family);
      if (spec.traitBadge) badge(p, traits.find(t => t.id === spec.traitBadge));
      pixels = p.pixels;
    }
    const palette = [null, ...new Set(pixels.flat().filter(Boolean))];
    if (palette.length > PIXEL_SYMBOLS.length) throw new Error(`${spec.id} palette too large`);
    const source = { size: 48, palette, rows: pixels.map(row => row.map(color => PIXEL_SYMBOLS[palette.indexOf(color)]).join("")) };
    const sourcePath = iconSourcePath(family, spec.id);
    await writeFile(path.join(root, sourcePath), JSON.stringify(source, null, 2) + "\n");
    await writeFile(path.join(root, sourcePath.replace(/\.json$/, ".svg")), pixelIconSvg(source, spec.name ?? spec.id, 48));
    await sharp(Buffer.from(pixelIconSvg(source, spec.name ?? spec.id, 48))).png().toFile(path.join(root, sourcePath.replace(/\.json$/, ".png")));
  }
}
process.stdout.write("Authored 93 frozen 48px icon sources; B10 runtime pilots retained.\n");
