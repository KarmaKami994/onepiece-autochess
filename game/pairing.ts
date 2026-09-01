import { randomInt, shuffleDeterministic } from "./rng";
import type { MatchPairing, MatchState, PlayerState } from "./types";

interface ScoredPairing {
  pairing: MatchPairing;
  encounterCount: number;
  recencyDistance: number;
}

function directedHistoryScore(
  player: PlayerState,
  opponentId: string,
): { count: number; distance: number } {
  const history = player.lastOpponents ?? [];
  let count = 0;
  for (const priorOpponentId of history) {
    if (priorOpponentId === opponentId) {
      count += 1;
    }
  }
  const lastIndex = history.lastIndexOf(opponentId);
  return {
    count,
    distance: lastIndex < 0 ? history.length + 1 : history.length - lastIndex,
  };
}

function realPairing(playerA: PlayerState, playerB: PlayerState): ScoredPairing {
  const fromA = directedHistoryScore(playerA, playerB.id);
  const fromB = directedHistoryScore(playerB, playerA.id);
  return {
    pairing: {
      playerAId: playerA.id,
      playerBId: playerB.id,
      ghostOfPlayerId: null,
    },
    encounterCount: fromA.count + fromB.count,
    recencyDistance: fromA.distance + fromB.distance,
  };
}

function ghostPairing(
  player: PlayerState,
  ghostOwner: PlayerState,
): ScoredPairing {
  const directed = directedHistoryScore(player, ghostOwner.id);
  return {
    pairing: {
      playerAId: player.id,
      playerBId: null,
      ghostOfPlayerId: ghostOwner.id,
    },
    encounterCount: directed.count,
    recencyDistance: directed.distance,
  };
}

function enumerateRealPairingCombinations(
  players: readonly PlayerState[],
): ScoredPairing[][] {
  if (players.length === 0) {
    return [[]];
  }
  const [playerA, ...candidates] = players;
  const combinations: ScoredPairing[][] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const playerB = candidates[index];
    const remaining = candidates.filter(
      (_candidate, candidateIndex) => candidateIndex !== index,
    );
    for (const rest of enumerateRealPairingCombinations(remaining)) {
      combinations.push([realPairing(playerA, playerB), ...rest]);
    }
  }
  return combinations;
}

function enumerateCompleteCombinations(
  players: readonly PlayerState[],
): ScoredPairing[][] {
  if (players.length % 2 === 0) {
    return enumerateRealPairingCombinations(players);
  }
  const combinations: ScoredPairing[][] = [];
  for (let singletonIndex = 0; singletonIndex < players.length; singletonIndex += 1) {
    const singleton = players[singletonIndex];
    const pairedPlayers = players.filter(
      (_player, playerIndex) => playerIndex !== singletonIndex,
    );
    for (const realPairings of enumerateRealPairingCombinations(pairedPlayers)) {
      for (const ghostOwner of pairedPlayers) {
        combinations.push([
          ...realPairings,
          ghostPairing(singleton, ghostOwner),
        ]);
      }
    }
  }
  return combinations;
}

export function createPairings(
  state: MatchState,
): { pairings: MatchPairing[]; rngState: number } {
  const alivePlayers = state.players
    .filter((player) => player.alive)
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  const shuffled = shuffleDeterministic(alivePlayers, state.rngState);
  if (shuffled.values.length <= 1) {
    return { pairings: [], rngState: shuffled.state };
  }

  const combinations = enumerateCompleteCombinations(shuffled.values);
  let bestEncounterCount = Number.POSITIVE_INFINITY;
  let bestRecencyDistance = Number.NEGATIVE_INFINITY;
  let optimal: ScoredPairing[][] = [];
  for (const combination of combinations) {
    const encounterCount = combination.reduce(
      (total, pairing) => total + pairing.encounterCount,
      0,
    );
    const recencyDistance = combination.reduce(
      (total, pairing) => total + pairing.recencyDistance,
      0,
    );
    if (
      encounterCount < bestEncounterCount ||
      (encounterCount === bestEncounterCount &&
        recencyDistance > bestRecencyDistance)
    ) {
      bestEncounterCount = encounterCount;
      bestRecencyDistance = recencyDistance;
      optimal = [combination];
    } else if (
      encounterCount === bestEncounterCount &&
      recencyDistance === bestRecencyDistance
    ) {
      optimal.push(combination);
    }
  }

  const selected = randomInt(shuffled.state, 0, optimal.length);
  return {
    pairings: optimal[selected.value].map(({ pairing }) => pairing),
    rngState: selected.state,
  };
}
