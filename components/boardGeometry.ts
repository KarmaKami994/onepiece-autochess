export type BoardDestination =
  | {
      zone: "board";
      x: number;
      y: number;
    }
  | {
      zone: "bench";
      slot: number;
    };

export type BoardPoint = Readonly<{ x: number; y: number }>;

export type BoardRectangle = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type BoardBounds = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export type CameraScreenGutters = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export const BOARD_GEOMETRY = Object.freeze({
  worldWidth: 1_000,
  worldHeight: 420,
  columns: 8,
  rows: 6,
  playerRowStart: 3,
  cellWidth: 78,
  cellHeight: 48,
  gridX: 188,
  gridY: 34,
  benchY: 365,
  benchCenterY: 370,
  boardTargetWidth: 78,
  boardTargetHeight: 48,
  benchTargetWidth: 78,
  benchTargetHeight: 48,
});

export const TACTICAL_WORLD_BOUNDS: BoardBounds = Object.freeze({
  left: 158,
  top: -22,
  right: 842,
  bottom: 402,
});

export const CAMERA_SCREEN_GUTTERS: CameraScreenGutters = Object.freeze({
  left: 8,
  top: 8,
  right: 8,
  bottom: 13,
});

export const MAP_BACKDROP_ANCHOR: BoardPoint = Object.freeze({
  x: BOARD_GEOMETRY.worldWidth / 2,
  y: BOARD_GEOMETRY.worldHeight / 2,
});

export const ANIMATED_BOARD_HIT_AREA: BoardRectangle = Object.freeze({
  x: -36,
  y: -70,
  width: 72,
  height: 96,
});

export const ANIMATED_BENCH_HIT_AREA: BoardRectangle = Object.freeze({
  x: -32,
  y: -52,
  width: 64,
  height: 70,
});

export const FALLBACK_TOKEN_HIT_AREA: BoardRectangle = Object.freeze({
  x: -28,
  y: -38,
  width: 56,
  height: 64,
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function boardCellCenter(x: number, y: number): BoardPoint {
  return {
    x:
      BOARD_GEOMETRY.gridX +
      clamp(x, 0, BOARD_GEOMETRY.columns - 1) * BOARD_GEOMETRY.cellWidth +
      BOARD_GEOMETRY.cellWidth / 2,
    y:
      BOARD_GEOMETRY.gridY +
      clamp(y, 0, BOARD_GEOMETRY.rows - 1) * BOARD_GEOMETRY.cellHeight +
      BOARD_GEOMETRY.cellHeight / 2,
  };
}

export function benchSlotCenter(slot: number): BoardPoint {
  return {
    x:
      BOARD_GEOMETRY.gridX +
      clamp(slot, 0, BOARD_GEOMETRY.columns - 1) * BOARD_GEOMETRY.cellWidth +
      BOARD_GEOMETRY.cellWidth / 2,
    y: BOARD_GEOMETRY.benchCenterY,
  };
}

export function boardDestinationCenter(
  destination: BoardDestination,
): BoardPoint {
  return destination.zone === "bench"
    ? benchSlotCenter(destination.slot)
    : boardCellCenter(destination.x, destination.y);
}

export function boardDestinationTarget(
  destination: BoardDestination,
): BoardRectangle & { center: BoardPoint } {
  const center = boardDestinationCenter(destination);
  const width =
    destination.zone === "bench"
      ? BOARD_GEOMETRY.benchTargetWidth
      : BOARD_GEOMETRY.boardTargetWidth;
  const height =
    destination.zone === "bench"
      ? BOARD_GEOMETRY.benchTargetHeight
      : BOARD_GEOMETRY.boardTargetHeight;
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    center,
  };
}

export const PLAYER_BOARD_DESTINATIONS: readonly BoardDestination[] =
  Object.freeze(
    Array.from(
      {
        length:
          BOARD_GEOMETRY.columns *
          (BOARD_GEOMETRY.rows - BOARD_GEOMETRY.playerRowStart),
      },
      (_, index) => ({
        zone: "board" as const,
        x: index % BOARD_GEOMETRY.columns,
        y:
          BOARD_GEOMETRY.playerRowStart +
          Math.floor(index / BOARD_GEOMETRY.columns),
      }),
    ),
  );

export const BENCH_DESTINATIONS: readonly BoardDestination[] = Object.freeze(
  Array.from({ length: BOARD_GEOMETRY.columns }, (_, slot) => ({
    zone: "bench" as const,
    slot,
  })),
);

export const PLANNING_DESTINATIONS: readonly BoardDestination[] =
  Object.freeze([...PLAYER_BOARD_DESTINATIONS, ...BENCH_DESTINATIONS]);

function containsPoint(rectangle: BoardRectangle, x: number, y: number) {
  return (
    x >= rectangle.x &&
    x < rectangle.x + rectangle.width &&
    y >= rectangle.y &&
    y < rectangle.y + rectangle.height
  );
}

export function boardDestinationAtPoint(
  x: number,
  y: number,
): BoardDestination | undefined {
  return PLANNING_DESTINATIONS.find((destination) =>
    containsPoint(boardDestinationTarget(destination), x, y),
  );
}

export function proportionalCoverSize(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number = BOARD_GEOMETRY.worldWidth,
  targetHeight: number = BOARD_GEOMETRY.worldHeight,
): Readonly<{ width: number; height: number; scale: number }> {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    return { width: targetWidth, height: targetHeight, scale: 1 };
  }
  const scale = Math.max(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight,
  );
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
    scale,
  };
}

export type GameplayCameraFrame = Readonly<{
  zoom: number;
  centerX: number;
  centerY: number;
  visibleWidth: number;
  visibleHeight: number;
  safeScreenBounds: BoardBounds;
  worldBounds: BoardBounds;
}>;

function validBounds(bounds: BoardBounds | undefined): bounds is BoardBounds {
  return Boolean(
    bounds &&
      Number.isFinite(bounds.left) &&
      Number.isFinite(bounds.top) &&
      Number.isFinite(bounds.right) &&
      Number.isFinite(bounds.bottom) &&
      bounds.right > bounds.left &&
      bounds.bottom > bounds.top,
  );
}

function insetViewportBounds(
  viewportWidth: number,
  viewportHeight: number,
  gutters: CameraScreenGutters = CAMERA_SCREEN_GUTTERS,
): BoardBounds {
  return {
    left: clamp(gutters.left, 0, viewportWidth),
    top: clamp(gutters.top, 0, viewportHeight),
    right: clamp(viewportWidth - gutters.right, 0, viewportWidth),
    bottom: clamp(viewportHeight - gutters.bottom, 0, viewportHeight),
  };
}

/**
 * Converts the DOM bounds of the visual board column to Phaser screen-space.
 * DOM pixels are scaled because Phaser's RESIZE canvas may use a different
 * backing size than the element reported by getBoundingClientRect().
 */
export function safeScreenBoundsWithinStage(
  stageBounds: BoardBounds,
  boardColumnBounds: BoardBounds,
  viewportWidth: number,
  viewportHeight: number,
  gutters: CameraScreenGutters = CAMERA_SCREEN_GUTTERS,
): BoardBounds | undefined {
  if (
    !validBounds(stageBounds) ||
    !validBounds(boardColumnBounds) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return undefined;
  }

  const scaleX = viewportWidth / (stageBounds.right - stageBounds.left);
  const scaleY = viewportHeight / (stageBounds.bottom - stageBounds.top);
  const left =
    (Math.max(stageBounds.left, boardColumnBounds.left) - stageBounds.left) *
      scaleX +
    gutters.left;
  const top =
    (Math.max(stageBounds.top, boardColumnBounds.top) - stageBounds.top) *
      scaleY +
    gutters.top;
  const right =
    (Math.min(stageBounds.right, boardColumnBounds.right) - stageBounds.left) *
      scaleX -
    gutters.right;
  const bottom =
    (Math.min(stageBounds.bottom, boardColumnBounds.bottom) - stageBounds.top) *
      scaleY -
    gutters.bottom;
  const safeBounds = {
    left: clamp(left, 0, viewportWidth),
    top: clamp(top, 0, viewportHeight),
    right: clamp(right, 0, viewportWidth),
    bottom: clamp(bottom, 0, viewportHeight),
  };
  return validBounds(safeBounds) ? safeBounds : undefined;
}

export function gameplayCameraFrame(
  viewportWidth: number,
  viewportHeight: number,
  safeScreenBounds?: BoardBounds,
  tacticalBounds: BoardBounds = TACTICAL_WORLD_BOUNDS,
): GameplayCameraFrame {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      zoom: 1,
      centerX: BOARD_GEOMETRY.worldWidth / 2,
      centerY: BOARD_GEOMETRY.worldHeight / 2,
      visibleWidth: BOARD_GEOMETRY.worldWidth,
      visibleHeight: BOARD_GEOMETRY.worldHeight,
      safeScreenBounds: {
        left: 0,
        top: 0,
        right: BOARD_GEOMETRY.worldWidth,
        bottom: BOARD_GEOMETRY.worldHeight,
      },
      worldBounds: {
        left: 0,
        top: 0,
        right: BOARD_GEOMETRY.worldWidth,
        bottom: BOARD_GEOMETRY.worldHeight,
      },
    };
  }

  const fallbackSafeBounds = insetViewportBounds(viewportWidth, viewportHeight);
  const safeBounds = validBounds(safeScreenBounds)
    ? safeScreenBounds
    : fallbackSafeBounds;
  const safeWidth = safeBounds.right - safeBounds.left;
  const safeHeight = safeBounds.bottom - safeBounds.top;
  const tacticalWidth = tacticalBounds.right - tacticalBounds.left;
  const tacticalHeight = tacticalBounds.bottom - tacticalBounds.top;
  const zoom = Math.min(safeWidth / tacticalWidth, safeHeight / tacticalHeight);
  const safeCenterX = (safeBounds.left + safeBounds.right) / 2;
  const safeCenterY = (safeBounds.top + safeBounds.bottom) / 2;
  const tacticalCenterX = (tacticalBounds.left + tacticalBounds.right) / 2;
  const tacticalCenterY = (tacticalBounds.top + tacticalBounds.bottom) / 2;
  const centerX = tacticalCenterX - (safeCenterX - viewportWidth / 2) / zoom;
  const centerY = tacticalCenterY - (safeCenterY - viewportHeight / 2) / zoom;
  const visibleWidth = viewportWidth / zoom;
  const visibleHeight = viewportHeight / zoom;
  return {
    zoom,
    centerX,
    centerY,
    visibleWidth,
    visibleHeight,
    safeScreenBounds: safeBounds,
    worldBounds: {
      left: centerX - visibleWidth / 2,
      top: centerY - visibleHeight / 2,
      right: centerX + visibleWidth / 2,
      bottom: centerY + visibleHeight / 2,
    },
  };
}

export function gameplayWorldPointToScreen(
  point: BoardPoint,
  frame: GameplayCameraFrame,
  viewportWidth: number,
  viewportHeight: number,
): BoardPoint {
  return {
    x: viewportWidth / 2 + (point.x - frame.centerX) * frame.zoom,
    y: viewportHeight / 2 + (point.y - frame.centerY) * frame.zoom,
  };
}

/**
 * Returns a symmetric target around the fixed map anchor that contains every
 * visible camera corner, even when gameplay framing offsets the camera.
 */
export function symmetricBackdropTarget(
  frame: GameplayCameraFrame,
  anchor: BoardPoint = MAP_BACKDROP_ANCHOR,
): Readonly<{ width: number; height: number }> {
  const halfWidth = Math.max(
    Math.abs(frame.worldBounds.left - anchor.x),
    Math.abs(frame.worldBounds.right - anchor.x),
  );
  const halfHeight = Math.max(
    Math.abs(frame.worldBounds.top - anchor.y),
    Math.abs(frame.worldBounds.bottom - anchor.y),
  );
  return { width: halfWidth * 2, height: halfHeight * 2 };
}
