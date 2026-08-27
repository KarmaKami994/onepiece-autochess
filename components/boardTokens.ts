import type { BoardDestination } from "./boardGeometry";

export type TokenUnitPosition = {
  zone: "board" | "bench";
  x: number;
  y: number;
  slot: number;
};

export function clampResourceValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function destinationKey(destination: BoardDestination) {
  return destination.zone === "bench"
    ? `bench:${destination.slot}`
    : `board:${destination.x}:${destination.y}`;
}

export function unitDestination(unit: TokenUnitPosition): BoardDestination {
  return unit.zone === "bench"
    ? { zone: "bench", slot: unit.slot }
    : { zone: "board", x: unit.x, y: unit.y };
}

export function isSameDestination(
  unit: TokenUnitPosition,
  destination: BoardDestination,
) {
  if (unit.zone !== destination.zone) return false;
  return destination.zone === "bench"
    ? unit.slot === destination.slot
    : unit.x === destination.x && unit.y === destination.y;
}

export function hashItemColor(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return [0x77b9d1, 0xd77a62, 0xe6c35b, 0x8bc477, 0xa986c8][hash % 5];
}
