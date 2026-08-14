import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

function pixelMatchesBackground(data, offset, backgroundRgb) {
  return (
    data[offset + 3] === 0 ||
    (data[offset] === backgroundRgb[0] &&
      data[offset + 1] === backgroundRgb[1] &&
      data[offset + 2] === backgroundRgb[2])
  );
}

export async function scanSpriteSheet(sourcePath, options = {}) {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const backgroundRgb = options.backgroundRgb ?? [data[0], data[1], data[2]];
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const components = [];

  for (let index = 0; index < pixelCount; index += 1) {
    if (visited[index]) continue;
    const offset = index * 4;
    if (pixelMatchesBackground(data, offset, backgroundRgb)) {
      visited[index] = 1;
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail] = index;
    tail += 1;
    visited[index] = 1;
    let area = 0;
    let minX = info.width;
    let minY = info.height;
    let maxX = 0;
    let maxY = 0;
    const palette = new Map();
    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % info.width;
      const y = Math.floor(current / info.width);
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      const colorOffset = current * 4;
      const color =
        (data[colorOffset] << 16) |
        (data[colorOffset + 1] << 8) |
        data[colorOffset + 2];
      palette.set(color, (palette.get(color) ?? 0) + 1);
      const neighbours = [
        x > 0 ? current - 1 : -1,
        x + 1 < info.width ? current + 1 : -1,
        y > 0 ? current - info.width : -1,
        y + 1 < info.height ? current + info.width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || visited[neighbour]) continue;
        const neighbourOffset = neighbour * 4;
        if (pixelMatchesBackground(data, neighbourOffset, backgroundRgb)) {
          visited[neighbour] = 1;
          continue;
        }
        visited[neighbour] = 1;
        queue[tail] = neighbour;
        tail += 1;
      }
    }
    components.push({
      area,
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      palette: [...palette.entries()]
        .sort((left, right) => right[1] - left[1] || left[0] - right[0])
        .slice(0, 24)
        .map(([color, count]) => ({ color, count })),
    });
  }

  const candidates = components
    .filter((component) => {
      const density = component.area / (component.width * component.height);
      return (
        component.area >= (options.minArea ?? 100) &&
        component.width >= (options.minWidth ?? 8) &&
        component.height >= (options.minHeight ?? 20) &&
        component.width <= (options.maxWidth ?? 180) &&
        component.height <= (options.maxHeight ?? 180) &&
        density >= (options.minDensity ?? 0.06)
      );
    })
    .map((component) => {
      const padding = options.padding ?? 3;
      const left = Math.max(0, component.x - padding);
      const top = Math.max(0, component.y - padding);
      const right = Math.min(info.width, component.x + component.width + padding);
      const bottom = Math.min(info.height, component.y + component.height + padding);
      return {
        ...component,
        sourceRect: {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        },
      };
    })
    .sort((left, right) => {
      const rowDifference = left.y - right.y;
      if (Math.abs(rowDifference) > 24) return rowDifference;
      return left.x - right.x || rowDifference;
    });

  return {
    width: info.width,
    height: info.height,
    backgroundRgb,
    componentCount: components.length,
    candidates,
  };
}

async function cli() {
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error("Usage: node sprite_sheet_scanner.mjs <source.png>");
  const result = await scanSpriteSheet(path.resolve(sourcePath));
  console.log(
    JSON.stringify(
      {
        source: sourcePath,
        dimensions: { width: result.width, height: result.height },
        backgroundRgb: result.backgroundRgb,
        componentCount: result.componentCount,
        candidateCount: result.candidates.length,
        firstCandidates: result.candidates.slice(0, 12),
        lastCandidates: result.candidates.slice(-8),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await cli();
}
