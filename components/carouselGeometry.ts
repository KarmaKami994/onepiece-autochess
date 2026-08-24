export type CarouselPoint = Readonly<{ x: number; y: number }>;

export type CarouselBounds = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export type CarouselDirection =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export const CAROUSEL_GEOMETRY = Object.freeze({
  worldWidth: 1_520,
  worldHeight: 840,
  centerX: 760,
  centerY: 420,
  orbitRadiusX: 260,
  orbitRadiusY: 190,
  orbitRadiansPerTick: 0.02,
  boatRadius: 34,
  bountyRadius: 30,
  towDistance: 58,
  arenaPadding: 0,
});

export const CAROUSEL_ARENA_BOUNDS: CarouselBounds = Object.freeze({
  left: CAROUSEL_GEOMETRY.arenaPadding,
  top: CAROUSEL_GEOMETRY.arenaPadding,
  right: CAROUSEL_GEOMETRY.worldWidth - CAROUSEL_GEOMETRY.arenaPadding,
  bottom: CAROUSEL_GEOMETRY.worldHeight - CAROUSEL_GEOMETRY.arenaPadding,
});

export const CAROUSEL_DIRECTION_ORDER: readonly CarouselDirection[] =
  Object.freeze(["n", "ne", "e", "se", "s", "sw", "w", "nw"]);

export const DEFAULT_BOUNTY_ITEM_ORDER = Object.freeze([
  "black-blade",
  "meat-platter",
  "clima-tact",
  "sniper-goggles",
  "sea-prism-stone",
  "armament-wraps",
  "den-den-mushi",
  "cola-engine",
] as const);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function clampCarouselTarget(
  point: CarouselPoint,
  radius: number = CAROUSEL_GEOMETRY.boatRadius,
  bounds: CarouselBounds = CAROUSEL_ARENA_BOUNDS,
): CarouselPoint {
  return {
    x: clamp(point.x, bounds.left + radius, bounds.right - radius),
    y: clamp(point.y, bounds.top + radius, bounds.bottom - radius),
  };
}

export function carouselOrbitPoint(
  orbitIndex: number,
  choiceCount: number,
  tick: number,
  direction: 1 | -1 = 1,
): CarouselPoint {
  const safeCount = Math.max(1, Math.floor(choiceCount));
  const normalizedIndex =
    ((Math.floor(orbitIndex) % safeCount) + safeCount) % safeCount;
  const angle =
    (normalizedIndex / safeCount) * Math.PI * 2 +
    tick * CAROUSEL_GEOMETRY.orbitRadiansPerTick * direction;
  return {
    x:
      CAROUSEL_GEOMETRY.centerX +
      Math.cos(angle) * CAROUSEL_GEOMETRY.orbitRadiusX,
    y:
      CAROUSEL_GEOMETRY.centerY +
      Math.sin(angle) * CAROUSEL_GEOMETRY.orbitRadiusY,
  };
}

export function carouselDirection(
  from: CarouselPoint,
  to: CarouselPoint,
  fallback: CarouselDirection = "n",
): CarouselDirection {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  if (Math.abs(deltaX) + Math.abs(deltaY) < 0.5) return fallback;

  // Screen-space angles run clockwise because positive y points down.
  const angle = Math.atan2(deltaY, deltaX);
  const octant = Math.round(angle / (Math.PI / 4));
  const index = ((octant + 2) % 8 + 8) % 8;
  return CAROUSEL_DIRECTION_ORDER[index];
}

export function carouselDirectionVector(
  direction: CarouselDirection,
): CarouselPoint {
  const diagonal = Math.SQRT1_2;
  const vectors: Record<CarouselDirection, CarouselPoint> = {
    n: { x: 0, y: -1 },
    ne: { x: diagonal, y: -diagonal },
    e: { x: 1, y: 0 },
    se: { x: diagonal, y: diagonal },
    s: { x: 0, y: 1 },
    sw: { x: -diagonal, y: diagonal },
    w: { x: -1, y: 0 },
    nw: { x: -diagonal, y: -diagonal },
  };
  return vectors[direction];
}

export function towedBountyPoint(
  boatPosition: CarouselPoint,
  direction: CarouselDirection,
  distance: number = CAROUSEL_GEOMETRY.towDistance,
): CarouselPoint {
  const vector = carouselDirectionVector(direction);
  return {
    x: boatPosition.x - vector.x * distance,
    y: boatPosition.y - vector.y * distance,
  };
}

export function carouselWorldPointFromClient(
  clientPoint: CarouselPoint,
  canvasBounds: CarouselBounds,
): CarouselPoint | null {
  const canvasWidth = canvasBounds.right - canvasBounds.left;
  const canvasHeight = canvasBounds.bottom - canvasBounds.top;
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  const scale = Math.min(
    canvasWidth / CAROUSEL_GEOMETRY.worldWidth,
    canvasHeight / CAROUSEL_GEOMETRY.worldHeight,
  );
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const renderedWidth = CAROUSEL_GEOMETRY.worldWidth * scale;
  const renderedHeight = CAROUSEL_GEOMETRY.worldHeight * scale;
  const offsetX = canvasBounds.left + (canvasWidth - renderedWidth) / 2;
  const offsetY = canvasBounds.top + (canvasHeight - renderedHeight) / 2;
  const x = (clientPoint.x - offsetX) / scale;
  const y = (clientPoint.y - offsetY) / scale;

  if (
    x < 0 ||
    y < 0 ||
    x > CAROUSEL_GEOMETRY.worldWidth ||
    y > CAROUSEL_GEOMETRY.worldHeight
  ) {
    return null;
  }
  return { x, y };
}

export function carouselInterpolationDuration(
  tickMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  if (!Number.isFinite(tickMs)) return 50;
  return clamp(Math.round(tickMs * 0.9), 16, 80);
}
