import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  applyCommand,
  createMatch,
  createMemoryStorage,
  deserializeMatch,
  getStageDefinition,
  loadMatch,
  migrateMatchState,
  removeSavedMatch,
  saveMatch,
  serializeMatch,
} from "../../game";

describe("versioned local persistence", () => {
  it("round-trips a match through pure JSON", () => {
    const state = createMatch("save-round-trip");
    const serialized = serializeMatch(state, "2026-07-29T00:00:00.000Z");
    expect(deserializeMatch(serialized)).toEqual(state);
    expect(JSON.parse(serialized)).toMatchObject({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAt: "2026-07-29T00:00:00.000Z",
    });
  });

  it("uses the storage adapter without browser dependencies", () => {
    const storage = createMemoryStorage();
    const state = createMatch("memory-storage");
    saveMatch(storage, state);
    expect(loadMatch(storage)).toEqual(state);
    removeSavedMatch(storage);
    expect(loadMatch(storage)).toBeNull();
  });

  it("migrates a schema-one match", () => {
    const state = createMatch("migration");
    const legacy = {
      ...state,
      schemaVersion: 1,
      stageId: undefined,
      pendingItemChoices: undefined,
      carouselChoices: undefined,
      nextChoiceSerial: undefined,
    };
    const migrated = migrateMatchState(legacy);
    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(migrated.stageId).toBe("east-blue-patrol");
    expect(migrated.pendingItemChoices).toEqual({});
    expect(migrated.carouselChoices).toEqual([]);
    expect(migrated.nextChoiceSerial).toBe(1);
    expect(
      migrated.players.every((player) => Array.isArray(player.finalCrew)),
    ).toBe(true);
  });

  it("clears schema-three result logs without changing planning state", () => {
    const state = createMatch("v3-planning-migration");
    const human = state.players.find((player) => player.id === "player-1")!;
    human.gold = 37;
    human.shopLocked = true;
    const legacy = structuredClone(state) as unknown as Record<string, unknown>;
    legacy.schemaVersion = 3;
    legacy.lastResults = [{ events: [{ type: "legacy-combat-event" }] }];

    const migrated = migrateMatchState(legacy);

    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(migrated.phase).toBe("preparation");
    expect(migrated.lastResults).toEqual([]);
    expect(migrated.players).toEqual(state.players);
    expect(migrated.pool).toEqual(state.pool);
    expect(migrated.rngState).toBe(state.rngState);
  });

  it("deterministically regenerates schema-three battles and preserves planning state", () => {
    const state = createMatch("v3-battle-migration");
    state.round = 5;
    state.stageId = getStageDefinition(state.round).id;
    const started = applyCommand(state, {
      type: "END_PREPARATION",
      playerId: "player-1",
    });
    if (!started.ok) throw new Error(started.error.message);
    expect(started.state.phase).toBe("battle");

    const legacy = structuredClone(started.state) as unknown as Record<
      string,
      unknown
    >;
    legacy.schemaVersion = 3;
    legacy.lastResults = [{ events: [{ type: "legacy-combat-event" }] }];
    const playersBefore = structuredClone(started.state.players);
    const poolBefore = structuredClone(started.state.pool);
    const pairingsBefore = structuredClone(started.state.pairings);
    const rngBefore = started.state.rngState;

    const first = migrateMatchState(legacy);
    const second = migrateMatchState(legacy);

    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(first.phase).toBe("battle");
    expect(first.players).toEqual(playersBefore);
    expect(first.pool).toEqual(poolBefore);
    expect(first.pairings).toEqual(pairingsBefore);
    expect(first.rngState).toBe(rngBefore);
    expect(first.lastResults).toHaveLength(started.state.pairings.length);
    expect(
      first.lastResults.every(
        (result) =>
          Array.isArray(result.initialUnits) &&
          !JSON.stringify(result.events).includes("legacy-combat-event"),
      ),
    ).toBe(true);
  });

  it("migrates schema-four players with an empty recent battle history", () => {
    const state = createMatch("v4-history-migration");
    const legacy = structuredClone(state) as unknown as Record<string, unknown>;
    legacy.schemaVersion = 4;
    const players = legacy.players as Array<Record<string, unknown>>;
    for (const player of players) {
      delete player.recentBattles;
    }

    const migrated = migrateMatchState(legacy);

    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(
      migrated.players.every((player) =>
        Array.isArray(player.recentBattles),
      ),
    ).toBe(true);
    expect(
      migrated.players.every((player) => player.recentBattles.length === 0),
    ).toBe(true);
  });

  it("rejects malformed and future saves", () => {
    expect(() => deserializeMatch("{bad json")).toThrow(
      "Save is not valid JSON",
    );
    expect(() =>
      migrateMatchState({
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION + 1,
      }),
    ).toThrow("newer than supported");
  });
});
