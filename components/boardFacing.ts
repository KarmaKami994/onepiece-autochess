export type BoardFacing = "left" | "right";

export function initialBoardFacing(team: "player" | "enemy"): BoardFacing {
  return team === "enemy" ? "left" : "right";
}

export function facingFromHorizontalDelta(
  deltaX: number,
  current: BoardFacing,
  deadZone = 2,
): BoardFacing {
  if (deltaX > deadZone) return "right";
  if (deltaX < -deadZone) return "left";
  return current;
}

export function mirroredOriginX(
  originX: number,
  facing: BoardFacing,
): number {
  return facing === "left" ? 1 - originX : originX;
}
