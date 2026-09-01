import { describe, expect, it } from "vitest";
import {
  advanceMatchPhase,
  createMatch,
  createPairings,
  shuffleDeterministic,
  type MatchPairing,
  type MatchState,
  type PlayerState,
} from "../../game";

function keepAlive(state: MatchState, count: number): PlayerState[] {
  state.players.forEach((player, index) => {
    player.alive = index < count;
    if (!player.alive) {
      player.hp = 0;
    }
  });
  return state.players.slice(0, count);
}

function shuffledAlive(state: MatchState): PlayerState[] {
  const alive = state.players
    .filter((player) => player.alive)
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  return shuffleDeterministic(alive, state.rngState).values;
}

function canonicalPairings(pairings: MatchPairing[]): string {
  return pairings
    .map((pairing) =>
      pairing.playerBId
        ? [pairing.playerAId, pairing.playerBId].sort().join("~")
        : `${pairing.playerAId}->ghost:${pairing.ghostOfPlayerId}`,
    )
    .sort()
    .join("|");
}

function hasRealPair(
  pairings: MatchPairing[],
  leftId: string,
  rightId: string,
): boolean {
  return pairings.some(
    (pairing) =>
      pairing.playerBId !== null &&
      ((pairing.playerAId === leftId && pairing.playerBId === rightId) ||
        (pairing.playerAId === rightId && pairing.playerBId === leftId)),
  );
}

function resolveHistoryResult(
  state: MatchState,
  pairing: MatchPairing,
): MatchState {
  state.round = 5;
  state.phase = "battle";
  state.lastResults = [
    {
      ...pairing,
      winnerId: null,
      timedOut: false,
      playerADamage: 0,
      playerBDamage: 0,
      durationTicks: 1,
      events: [],
      initialUnits: [],
      finalUnits: [],
    },
  ];
  return advanceMatchPhase(state);
}

describe("deterministic global PvP pairing", () => {
  it("returns identical pairings and RNG state for identical input", () => {
    const state = createMatch("pairing-identical");
    state.players[0].lastOpponents = ["bot-1", "bot-2", "bot-1"];

    expect(createPairings(state)).toEqual(createPairings(state));
  });

  it("uses every alive player exactly once as a real participant", () => {
    const state = createMatch("pairing-participants");
    const alive = keepAlive(state, 7);
    const result = createPairings(state);
    const directParticipants = result.pairings.flatMap((pairing) => [
      pairing.playerAId,
      ...(pairing.playerBId ? [pairing.playerBId] : []),
    ]);

    expect(directParticipants.sort()).toEqual(alive.map(({ id }) => id).sort());
    expect(new Set(directParticipants).size).toBe(alive.length);
  });

  it("creates only real pairings for an even population", () => {
    const state = createMatch("pairing-even");
    const result = createPairings(state);

    expect(result.pairings).toHaveLength(4);
    expect(result.pairings.every((pairing) => pairing.playerBId !== null)).toBe(
      true,
    );
    expect(
      result.pairings.every((pairing) => pairing.ghostOfPlayerId === null),
    ).toBe(true);
  });

  it("creates exactly one directed ghost pairing for an odd population", () => {
    const state = createMatch("pairing-odd");
    keepAlive(state, 7);
    const result = createPairings(state);
    const ghosts = result.pairings.filter(
      (pairing) => pairing.ghostOfPlayerId !== null,
    );

    expect(result.pairings).toHaveLength(4);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].playerBId).toBeNull();
    expect(ghosts[0].ghostOfPlayerId).not.toBe(ghosts[0].playerAId);
  });

  it("avoids a greedy local minimum when a lower-count global combination exists", () => {
    const state = createMatch("pairing-global-count");
    keepAlive(state, 4);
    const [a, b, c, d] = shuffledAlive(state);
    a.lastOpponents = [c.id, d.id];
    b.lastOpponents = [c.id, d.id];
    c.lastOpponents = Array.from({ length: 10 }, () => d.id);

    const result = createPairings(state);

    expect(hasRealPair(result.pairings, a.id, b.id)).toBe(false);
    expect(hasRealPair(result.pairings, c.id, d.id)).toBe(false);
  });

  it("prioritizes encounter count over recency distance", () => {
    const state = createMatch("pairing-count-priority");
    keepAlive(state, 4);
    const [a, b, c, d] = shuffledAlive(state);
    a.lastOpponents = [c.id, d.id];
    b.lastOpponents = [c.id, d.id];

    const result = createPairings(state);

    expect(hasRealPair(result.pairings, a.id, b.id)).toBe(true);
    expect(hasRealPair(result.pairings, c.id, d.id)).toBe(true);
  });

  it("maximizes total recency distance when encounter counts tie", () => {
    const state = createMatch("pairing-recency");
    const [a, b, c, d] = keepAlive(state, 4);
    a.lastOpponents = [b.id, c.id, d.id];
    b.lastOpponents = [a.id, c.id, d.id];
    c.lastOpponents = [d.id, a.id, b.id];
    d.lastOpponents = [c.id, a.id, b.id];

    const result = createPairings(state);

    expect(hasRealPair(result.pairings, a.id, b.id)).toBe(true);
    expect(hasRealPair(result.pairings, c.id, d.id)).toBe(true);
  });

  it("uses seeded deterministic selection across exact optimal ties", () => {
    const selected = new Set<string>();
    for (let rngState = 1; rngState <= 24; rngState += 1) {
      const state = createMatch(`pairing-tie-${rngState}`);
      keepAlive(state, 4);
      state.rngState = rngState;
      const first = createPairings(state);
      const second = createPairings(state);
      expect(first).toEqual(second);
      selected.add(canonicalPairings(first.pairings));
    }

    expect(selected.size).toBeGreaterThan(1);
  });

  it("counts real encounter history from both players", () => {
    for (let rngState = 1; rngState <= 24; rngState += 1) {
      const state = createMatch(`pairing-bidirectional-${rngState}`);
      const [a, b] = keepAlive(state, 4);
      state.rngState = rngState;
      b.lastOpponents = [a.id];

      expect(hasRealPair(createPairings(state).pairings, a.id, b.id)).toBe(
        false,
      );
    }
  });

  it("scores a ghost only from the real fighter's directed history", () => {
    const makeState = (swapOwnerCounts: boolean): MatchState => {
      const state = createMatch(`pairing-ghost-directed-${swapOwnerCounts}`);
      const [fighter, ownerB, ownerC] = keepAlive(state, 3);
      fighter.lastOpponents = [ownerB.id, ownerC.id];
      ownerB.lastOpponents = Array.from(
        { length: swapOwnerCounts ? 20 : 10 },
        () => fighter.id,
      );
      ownerC.lastOpponents = Array.from(
        { length: swapOwnerCounts ? 10 : 20 },
        () => fighter.id,
      );
      state.rngState = 12345;
      return state;
    };

    for (const state of [makeState(false), makeState(true)]) {
      const [fighter, ownerB] = state.players;
      const ghost = createPairings(state).pairings.find(
        (pairing) => pairing.ghostOfPlayerId !== null,
      );
      expect(ghost).toMatchObject({
        playerAId: fighter.id,
        playerBId: null,
        ghostOfPlayerId: ownerB.id,
      });
    }
  });

  it("retains normal opponent history beyond three entries", () => {
    const state = createMatch("pairing-history-real");
    const [playerA, playerB] = state.players;
    playerA.lastOpponents = ["old-a", "old-b", "old-c", "old-d"];
    playerB.lastOpponents = ["old-e", "old-f", "old-g", "old-h"];

    const next = resolveHistoryResult(state, {
      playerAId: playerA.id,
      playerBId: playerB.id,
      ghostOfPlayerId: null,
    });

    expect(next.players[0].lastOpponents).toEqual([
      "old-a",
      "old-b",
      "old-c",
      "old-d",
      playerB.id,
    ]);
    expect(next.players[1].lastOpponents).toEqual([
      "old-e",
      "old-f",
      "old-g",
      "old-h",
      playerA.id,
    ]);
  });

  it("grows ghost history without mutating the ghost owner", () => {
    const state = createMatch("pairing-history-ghost");
    const [fighter, ghostOwner] = state.players;
    fighter.lastOpponents = ["old-a", "old-b", "old-c", "old-d"];
    ghostOwner.lastOpponents = ["owner-a", "owner-b", "owner-c", "owner-d"];
    const ownerHistory = [...ghostOwner.lastOpponents];

    const next = resolveHistoryResult(state, {
      playerAId: fighter.id,
      playerBId: null,
      ghostOfPlayerId: ghostOwner.id,
    });

    expect(next.players[0].lastOpponents).toEqual([
      "old-a",
      "old-b",
      "old-c",
      "old-d",
      ghostOwner.id,
    ]);
    expect(next.players[1].lastOpponents).toEqual(ownerHistory);
  });

  it("never selects dead players", () => {
    const state = createMatch("pairing-dead");
    const alive = keepAlive(state, 5);
    const deadIds = new Set(state.players.slice(5).map(({ id }) => id));
    const result = createPairings(state);
    const selectedIds = result.pairings.flatMap((pairing) => [
      pairing.playerAId,
      ...(pairing.playerBId ? [pairing.playerBId] : []),
      ...(pairing.ghostOfPlayerId ? [pairing.ghostOfPlayerId] : []),
    ]);

    expect(alive).toHaveLength(5);
    expect(selectedIds.every((id) => !deadIds.has(id))).toBe(true);
  });
});
