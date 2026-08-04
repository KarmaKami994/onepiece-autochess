import { describe, expect, it } from "vitest";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  createMatch,
  createMemoryStorage,
  deserializeMatch,
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
