import { shuffleDeterministic } from "./rng";
import type { MatchPairing, MatchState, PlayerState } from "./types";

function recentOpponentPenalty(
  player: PlayerState,
  candidateId: string,
): number {
  const reversed = [...player.lastOpponents].reverse();
  const index = reversed.indexOf(candidateId);
  return index < 0 ? -1 : reversed.length - index;
}

export function createPairings(
  state: MatchState,
): { pairings: MatchPairing[]; rngState: number } {
  const alivePlayers = state.players
    .filter((player) => player.alive)
    .sort((left, right) => left.id.localeCompare(right.id));
  const shuffled = shuffleDeterministic(alivePlayers, state.rngState);
  const remaining = [...shuffled.values];
  const pairings: MatchPairing[] = [];
  while (remaining.length >= 2) {
    const playerA = remaining.shift();
    if (!playerA) break;
    const selected = remaining
      .map((player, index) => ({
        player,
        index,
        penalty: recentOpponentPenalty(playerA, player.id),
      }))
      .sort(
        (left, right) =>
          left.penalty - right.penalty ||
          left.index - right.index ||
          left.player.id.localeCompare(right.player.id),
      )[0];
    if (!selected) break;
    remaining.splice(selected.index, 1);
    pairings.push({
      playerAId: playerA.id,
      playerBId: selected.player.id,
      ghostOfPlayerId: null,
    });
  }
  if (remaining.length === 1) {
    const playerA = remaining[0];
    const ghost = alivePlayers
      .filter((player) => player.id !== playerA.id)
      .sort(
        (left, right) =>
          recentOpponentPenalty(playerA, left.id) -
            recentOpponentPenalty(playerA, right.id) ||
          left.id.localeCompare(right.id),
      )[0] ?? null;
    pairings.push({
      playerAId: playerA.id,
      playerBId: null,
      ghostOfPlayerId: ghost?.id ?? null,
    });
  }
  return { pairings, rngState: shuffled.state };
}
