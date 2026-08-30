import { describe, expect, it } from "vitest";
import {
  advanceMatchPhase,
  applyCommand,
  createMatch,
  getStageDefinition,
  migrateMatchState,
  type MatchState,
  type PlayerState,
} from "../game";
import {
  createVoyageSaveEnvelope,
  restoreVoyageState,
  shouldPersistVoyageEnvelope,
  type VoyageSaveEnvelope,
} from "../app/voyagePersistence";

const context = { actorPlayerId: "player-1" } as const;

function player(state: MatchState): PlayerState {
  const found = state.players.find((candidate) => candidate.id === "player-1");
  if (!found) throw new Error("Missing test player");
  return found;
}

function forceOffer(state: MatchState, definitionId: string): void {
  const current = player(state).shop[0];
  if (current) state.pool[current] += 1;
  player(state).shop[0] = definitionId;
  state.pool[definitionId] -= 1;
}

function command(state: MatchState, value: Parameters<typeof applyCommand>[1]): MatchState {
  const result = applyCommand(state, value, context);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function preparedState(seed: string): MatchState {
  let state = createMatch(seed);
  state.round = 5;
  state.stageId = getStageDefinition(state.round).id;
  player(state).gold = 99;
  forceOffer(state, "luffy");
  state = command(state, { type: "BUY_UNIT", shopIndex: 0 });
  const unitId = player(state).bench.find(
    (candidate): candidate is string => Boolean(candidate),
  );
  if (!unitId) throw new Error("Missing persistence test unit");
  state = command(state, {
    type: "MOVE_UNIT",
    unitId,
    to: { zone: "board", x: 0, y: 5 },
  });
  forceOffer(state, "nami");
  return state;
}

describe("voyage battle save compatibility", () => {
  it("rejects an older queued save after a newer checkpoint", () => {
    const older = { updatedAt: 1_000 };
    const newer = { updatedAt: 2_000 };

    expect(shouldPersistVoyageEnvelope(null, older)).toBe(true);
    expect(shouldPersistVoyageEnvelope(older, newer)).toBe(true);
    expect(shouldPersistVoyageEnvelope(newer, older)).toBe(false);
    expect(shouldPersistVoyageEnvelope(newer, { updatedAt: 2_000 })).toBe(true);
  });

  it("restores a direct battle save without rolling back or resimulating", () => {
    let state = command(preparedState("direct-battle-save"), {
      type: "END_PREPARATION",
    });
    const frozenPairings = structuredClone(state.pairings);
    const frozenResults = structuredClone(state.lastResults);
    expect(frozenPairings.length).toBeGreaterThan(0);
    const rngBeforeReroll = state.rngState;
    state = command(state, { type: "BUY_UNIT", shopIndex: 0 });
    state = command(state, { type: "REROLL_SHOP" });
    state = command(state, { type: "TOGGLE_SHOP_LOCK" });
    state = command(state, { type: "BUY_XP" });
    const benchId = player(state).bench.find(
      (candidate): candidate is string => Boolean(candidate),
    );
    if (!benchId) throw new Error("Missing saved bench unit");
    state = command(state, { type: "SELL_UNIT", unitId: benchId });

    const envelope = createVoyageSaveEnvelope(state, state.seed, 1234);
    expect(envelope).toMatchObject({
      state,
      seed: state.seed,
      replayBattle: false,
      schemaVersion: 6,
      contentVersion: "1.13.0",
    });

    const restored = restoreVoyageState(envelope);
    expect(restored).toEqual(state);
    expect(restored.phase).toBe("battle");
    expect(restored.rngState).not.toBe(rngBeforeReroll);
    expect(restored.pairings).toEqual(frozenPairings);
    expect(restored.lastResults).toEqual(frozenResults);
  });

  it("continues to reconstruct legacy replayBattle saves once", () => {
    const legacyState = preparedState("legacy-battle-save");
    const saved: VoyageSaveEnvelope = {
      state: legacyState,
      seed: legacyState.seed,
      updatedAt: 1234,
      schemaVersion: 6,
      contentVersion: "1.11.0",
      replayBattle: true,
    };
    const expected = advanceMatchPhase(migrateMatchState(legacyState));
    const restored = restoreVoyageState(saved);

    expect(restored).toEqual(expected);
    expect(restored.phase).toBe("battle");
    expect(restored.lastResults.length).toBeGreaterThan(0);
    expect(createVoyageSaveEnvelope(restored, saved.seed, 5678).replayBattle).toBe(false);
  });
});
