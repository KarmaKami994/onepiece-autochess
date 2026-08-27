import type { MatchState, PlayerState, Position, StarLevel } from "./types";

export function cloneMatch(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCell(key: string): Position {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function findPlayer(
  state: MatchState,
  playerId: string,
): PlayerState | null {
  return state.players.find((player) => player.id === playerId) ?? null;
}

export function copiesForStar(star: StarLevel): number {
  return star === 1 ? 1 : star === 2 ? 3 : 9;
}
