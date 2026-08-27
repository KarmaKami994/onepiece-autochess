import {
  MAP_BACKDROP_ANCHOR,
  gameplayCameraFrame,
  proportionalCoverSize,
  symmetricBackdropTarget,
  type BoardBounds,
} from "./boardGeometry";

export function resolveBoardCameraFrame(
  width: number,
  height: number,
  safeBounds?: BoardBounds,
) {
  return gameplayCameraFrame(width, height, safeBounds);
}

export function resolveBoardBackdrop(
  frame: ReturnType<typeof gameplayCameraFrame>,
  source: { width: number; height: number },
) {
  const target = symmetricBackdropTarget(frame);
  const cover = proportionalCoverSize(
    source.width,
    source.height,
    target.width,
    target.height,
  );
  return { x: MAP_BACKDROP_ANCHOR.x, y: MAP_BACKDROP_ANCHOR.y, ...cover };
}
