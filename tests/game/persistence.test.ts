import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  advanceCarousel,
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

const PLAYER_CONTEXT = { actorPlayerId: "player-1" };

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

  it.each([1, 2, 3, 4, 5, 6])(
    "loads the committed schema-v%d migration fixture",
    (version) => {
      const serialized = readFileSync(
        path.join(process.cwd(), "tests", "fixtures", "saves", `v${version}.json`),
        "utf8",
      );
      const migrated = deserializeMatch(serialized);

      expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
      expect(migrated.contentVersion).toBe(DEFAULT_CONTENT.version);
      expect(migrated.seed).toBe(`fixture-v${version}`);
      expect(migrated.carouselSession).toBeNull();
      expect(migrated.players[0]?.finalCrew).toEqual([]);
      expect(migrated.players[0]?.recentBattles).toHaveLength(
        version === 5 ? 5 : 0,
      );
      if (version === 1) {
        expect(migrated.stageId).toBe("east-blue-patrol");
        expect(migrated.pendingItemChoices).toEqual({});
        expect(migrated.nextChoiceSerial).toBe(1);
      }
      if (version === 3) expect(migrated.lastResults).toEqual([]);
      if (version === 5) {
        expect(migrated.players[0]?.recentBattles[0]?.round).toBe(2);
      }
      const roundTripped = deserializeMatch(serializeMatch(migrated));
      expect(roundTripped).toEqual(migrated);
      expect(migrateMatchState(roundTripped)).toEqual(migrated);
    },
  );

  it("migrates a schema-one match", () => {
    const state = createMatch("migration");
    const legacy = {
      ...state,
      schemaVersion: 1,
      stageId: undefined,
      pendingItemChoices: undefined,
      carouselChoices: undefined,
      carouselSession: undefined,
      nextChoiceSerial: undefined,
    };
    const migrated = migrateMatchState(legacy);
    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(migrated.stageId).toBe("east-blue-patrol");
    expect(migrated.pendingItemChoices).toEqual({});
    expect(migrated.carouselChoices).toEqual([]);
    expect(migrated.carouselSession).toBeNull();
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
    }, PLAYER_CONTEXT);
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

  it("resolves a legacy schema-five carousel during the v6 migration", () => {
    const state = createMatch("v5-carousel-migration");
    state.round = 3;
    state.phase = "item-choice";
    state.pendingItemChoices = {};
    const carousel = applyCommand(state, { type: "TIMER_EXPIRED" }, PLAYER_CONTEXT);
    if (!carousel.ok) throw new Error(carousel.error.message);
    expect(carousel.state.phase).toBe("carousel");
    const legacy = structuredClone(carousel.state) as unknown as Record<
      string,
      unknown
    >;
    legacy.schemaVersion = 5;
    delete legacy.carouselSession;
    const bot = carousel.state.players.find((player) => player.id === "bot-1")!;
    const firstItem = DEFAULT_CONTENT.items[0].id;
    bot.inventory.push(firstItem);
    legacy.players = structuredClone(carousel.state.players);
    const inventoryBefore = carousel.state.players.reduce(
      (total, player) => total + player.inventory.length,
      0,
    );
    legacy.carouselChoices = DEFAULT_CONTENT.items.map((item, index) => ({
      id: `legacy-choice-${index + 1}`,
      itemId: item.id,
      takenByPlayerId: index === 0 ? bot.id : null,
    }));

    const migrated = migrateMatchState(legacy);

    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(migrated.phase).toBe("preparation");
    expect(migrated.carouselSession).toBeNull();
    expect(migrated.carouselChoices).toEqual([]);
    expect(
      migrated.players.reduce(
        (total, player) => total + player.inventory.length,
        0,
      ) - inventoryBefore,
    ).toBe(7);
  });

  it("round-trips an in-progress v6 carousel checkpoint", () => {
    const state = createMatch("v6-carousel-checkpoint");
    state.round = 3;
    state.phase = "item-choice";
    state.pendingItemChoices = {};
    const carousel = applyCommand(state, { type: "TIMER_EXPIRED" }, PLAYER_CONTEXT);
    if (!carousel.ok) throw new Error(carousel.error.message);
    const releaseTick = carousel.state.carouselSession!.participants.find(
      (participant) => participant.playerId === "player-1",
    )!.releaseTick;
    let checkpoint = advanceCarousel(carousel.state, releaseTick);
    const target = applyCommand(checkpoint, {
      type: "CAROUSEL_SET_TARGET",
      x: 760,
      y: 420,
    }, PLAYER_CONTEXT);
    if (!target.ok) throw new Error(target.error.message);
    checkpoint = advanceCarousel(target.state, 17);
    expect(checkpoint.carouselSession).not.toBeNull();

    const restored = deserializeMatch(serializeMatch(checkpoint));
    expect(restored).toEqual(checkpoint);
    const continuedOriginal = advanceCarousel(checkpoint, 41);
    const continuedRestored = advanceCarousel(restored, 41);
    expect(continuedRestored).toEqual(continuedOriginal);
    expect(applyCommand(continuedRestored, { type: "TIMER_EXPIRED" }, PLAYER_CONTEXT)).toEqual(
      applyCommand(continuedOriginal, { type: "TIMER_EXPIRED" }, PLAYER_CONTEXT),
    );
  });

  it("safely resolves a malformed v6 carousel checkpoint", () => {
    const state = createMatch("malformed-v6-carousel");
    state.round = 3;
    state.phase = "item-choice";
    state.pendingItemChoices = {};
    const carousel = applyCommand(state, { type: "TIMER_EXPIRED" }, PLAYER_CONTEXT);
    if (!carousel.ok) throw new Error(carousel.error.message);
    const malformed = structuredClone(carousel.state) as unknown as Record<
      string,
      unknown
    >;
    malformed.carouselSession = {};

    const migrated = migrateMatchState(malformed);

    expect(migrated.phase).toBe("preparation");
    expect(migrated.carouselSession).toBeNull();
    expect(migrated.carouselChoices).toEqual([]);
    expect(
      migrated.players.every((player) => player.inventory.length === 1),
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
