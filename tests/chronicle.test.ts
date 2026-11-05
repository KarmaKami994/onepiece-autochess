import { describe, expect, it } from "vitest";
import { advanceMatchPhase, createMatch, simulateBattle, DEFAULT_CONTENT, hashMatchState, CURRENT_SAVE_SCHEMA_VERSION, type MatchState } from "../game";
import { creditVoyage, emptyProfile, newVoyageReplay, observeVoyage, replayCompatible, replayFrameState, MAX_REPLAY_BYTES, type VoyageReplay } from "../app/chronicle";
import { parseReplay, validateProfile, validateReplay } from "../app/replayValidation";
import { retainedHeaders, replayHeader, importReplayArchive } from "../app/chronicleStorage";
import { selectBattlePresentation } from "../app/selectors";

function states(): MatchState[] {
  const start = createMatch("b04-fixture"); start.round = 6; start.stageId = "pvp-6";
  const own = start.players[0]; const enemy = start.players[1];
  own.units = { robin: { id: "robin", definitionId: "robin", formId: "robin-demonio-fleur", star: 3, items: ["armament-wraps"], acquiredOrder: 1 } };
  own.board = { "1,4": "robin" }; own.shop = ["nami", null, null, null, null, null]; own.inventory = ["cola-canister"];
  enemy.units = { luffy: { id: "luffy", definitionId: "luffy", star: 1, items: [], acquiredOrder: 1 } }; enemy.board = { "1,4": "luffy" };
  const battle = structuredClone(start); battle.phase = "battle";
  const result = simulateBattle({ id: own.id, units: [{ ...own.units.robin, id: `${own.id}:robin`, position: { x: 1, y: 2 } }] }, { id: enemy.id, units: [{ ...enemy.units.luffy, id: `${enemy.id}:luffy`, position: { x: 2, y: 2 } }] }, { seed: "b04-fixture", maxTicks: 20 });
  battle.lastResults = [{ ...result, playerAId: own.id, playerBId: enemy.id, ghostOfPlayerId: null, playerADamage: 0, playerBDamage: 10 }];
  const end = structuredClone(battle); end.phase = "game-over"; end.winnerId = own.id;
  end.players.forEach((player, index) => { player.placement = index + 1; player.alive = index === 0; });
  end.players[0].finalCrew = Object.values(end.players[0].units);
  return [start, battle, end];
}
function completed(): VoyageReplay {
  const steps = states(); return steps.reduce((replay, state, index) => observeVoyage(replay, state, 100 + index), newVoyageReplay(steps[0], DEFAULT_CONTENT, "local-voyage-1", 100));
}

describe("B04 bounded non-authoritative recording", () => {
  it("round-trips a complete normally simulated voyage within the recording limit", () => {
    let state = createMatch("b04-full-recording-regression");
    state.players.forEach((player, index) => { player.isBot = true; player.personalityId = DEFAULT_CONTENT.botPersonalities[index % DEFAULT_CONTENT.botPersonalities.length].id; });
    let replay = newVoyageReplay(state, DEFAULT_CONTENT, "full-voyage", 1);
    for (let transition = 0; transition < 400 && replay.completedAt === null; transition += 1) {
      const before = hashMatchState(state);
      replay = observeVoyage(replay, state, transition + 2);
      expect(hashMatchState(state)).toBe(before);
      if (replay.completedAt === null) state = advanceMatchPhase(state);
    }
    expect(replay.completedAt).not.toBeNull(); expect(replay.fromStart).toBe(true);
    const raw = JSON.stringify(replay); expect(new TextEncoder().encode(raw).length).toBeLessThan(MAX_REPLAY_BYTES);
    expect(parseReplay(raw, DEFAULT_CONTENT)).toEqual(replay);
  }, 20_000);
  it("captures detached phase checkpoints and immutable events without changing state/RNG", () => {
    const steps = states(); const before = steps.map(hashMatchState);
    const replay = steps.reduce((record, state, index) => observeVoyage(record, state, 100 + index), newVoyageReplay(steps[0], DEFAULT_CONTENT, "id", 100));
    expect(steps.map(hashMatchState)).toEqual(before);
    expect(replay.frames.map((frame) => frame.phase)).toEqual(["preparation", "battle", "game-over"]);
    expect(replay.frames[1].battles).toEqual(steps[1].lastResults);
    expect(replay.fromStart).toBe(false);
    expect(replay.completedAt).toBe(102);
    expect(replay.collection).toMatchObject({ crewDiscovered: ["nami", "robin"], crewOwned: ["robin"], crewDeployed: ["robin"], itemsOwned: ["armament-wraps", "cola-canister"], itemsDeployed: ["armament-wraps"], formsReached: ["robin-demonio-fleur"] });
    steps[0].players[0].gold = 999;
    expect(replay.frames[0].players[0].gold).not.toBe(999);
    expect(observeVoyage(replay, steps[2], 999)).toBe(replay);
    expect(DEFAULT_CONTENT.version).toBe("1.32.0"); expect(CURRENT_SAVE_SCHEMA_VERSION).toBe(6);
  });

  it("replaces same-phase snapshots but preserves original battle fighters through live economy", () => {
    const [start, battle] = states(); let record = observeVoyage(newVoyageReplay(start, DEFAULT_CONTENT, "id", 10), start, 10);
    record = observeVoyage(record, battle, 11);
    const next = structuredClone(battle); next.players[0].gold += 5;
    next.lastResults[0].events = [];
    const updated = observeVoyage(record, next, 12);
    expect(updated.frames).toHaveLength(2);
    expect(updated.frames[1].players[0].gold).toBe(next.players[0].gold);
    expect(updated.frames[1].battles).toEqual(record.frames[1].battles);
    expect(updated.frames[1].battles[0].events.length).toBeGreaterThan(0);
  });

  it("plays the recorded result in either perspective without re-simulating or touching active state", () => {
    const replay = completed(); const active = createMatch("unrelated"); const before = hashMatchState(active);
    const state = replayFrameState(replay, replay.frames[1], DEFAULT_CONTENT);
    const own = selectBattlePresentation(state, replay.playerId)!;
    const opponent = selectBattlePresentation(state, state.players[1].id)!;
    expect(own.events).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "end" })]));
    expect(own.boardUnits.find((unit) => unit.id === "player-1:robin")?.team).toBe("player");
    expect(opponent.boardUnits.find((unit) => unit.id === "player-1:robin")?.team).toBe("enemy");
    expect(hashMatchState(active)).toBe(before);
    const changed = { ...replay, contentHash: "different" };
    expect(replayCompatible(changed, DEFAULT_CONTENT)).toBe(false);
    expect(() => replayFrameState(changed, changed.frames[1], DEFAULT_CONTENT)).toThrow("differs");
    expect(validateReplay(changed, DEFAULT_CONTENT).contentHash).toBe("different");
  });

  it("credits completed local facts once; records, collection and achievements have distinct meanings", () => {
    const replay = completed(); const profile = creditVoyage(emptyProfile(), replay, DEFAULT_CONTENT);
    expect(profile.placements).toEqual([1, 0, 0, 0, 0, 0, 0, 0]); expect(profile.bestPlacement).toBe(1);
    expect(profile.achievements).toEqual(["equipment", "first-voyage", "form", "three-star", "top-four", "victory"]);
    expect(profile.collection.crewOwned).not.toContain("nami"); expect(profile.collection.crewDiscovered).toContain("nami");
    expect(creditVoyage(profile, replay, DEFAULT_CONTENT)).toBe(profile);
    expect(creditVoyage(emptyProfile(), { ...replay, completedAt: null }, DEFAULT_CONTENT).completedIds).toEqual([]);
    expect(validateProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
    expect(() => validateProfile({ ...profile, placements: Array(8).fill(0) })).toThrow("totals");
  });
});

describe("B04 untrusted replay boundaries and retention", () => {
  it("round-trips full records and preserves incompatible metadata without enabling playback", () => {
    const replay = completed(); expect(parseReplay(JSON.stringify(replay), DEFAULT_CONTENT)).toEqual(replay);
    const changed = { ...replay, contentVersion: "old-content" };
    expect(parseReplay(JSON.stringify(changed), DEFAULT_CONTENT)).toEqual(changed);
    expect(replayCompatible(changed, DEFAULT_CONTENT)).toBe(false);
  });
  it.each([
    ["unit type", (record: VoyageReplay) => { (record.frames[0].players[0].units.robin as unknown as Record<string, unknown>).star = "3"; }],
    ["board reference", (record: VoyageReplay) => { record.frames[0].players[0].board["2,4"] = "missing"; }],
    ["unknown content", (record: VoyageReplay) => { record.frames[0].players[0].units.robin.definitionId = "missing"; }],
    ["unknown shop offer", (record: VoyageReplay) => { record.frames[0].players[0].shop[0] = "missing"; }],
    ["unknown inventory", (record: VoyageReplay) => { record.frames[0].players[0].inventory.push("missing"); }],
    ["unknown recruit offer", (record: VoyageReplay) => { record.frames[0].recruitOffers[record.playerId] = ["missing"]; }],
    ["duplicate roster location", (record: VoyageReplay) => { record.frames[0].players[0].bench[0] = "robin"; }],
    ["unknown event target", (record: VoyageReplay) => { record.frames[1].battles[0].events.push({ type: "heal", tick: 20, sourceId: "player-1:robin", targetId: "missing", amount: 4 }); }],
    ["duplicate checkpoint", (record: VoyageReplay) => { record.frames.push(record.frames[0]); }],
    ["unbounded event", (record: VoyageReplay) => { record.frames[1].battles[0].events.push({ type: "battle-end", tick: 100_001, winnerId: null, timedOut: false }); }],
  ])("rejects %s without modifying the original record", (_, corrupt) => {
    const record = completed(); corrupt(record); const before = JSON.stringify(record);
    expect(() => validateReplay(record, DEFAULT_CONTENT)).toThrow(); expect(JSON.stringify(record)).toBe(before);
  });
  it("rejects malformed documents and oversized files before persistence", async () => {
    for (const raw of ["null", "[]", "{}", "invalid json"]) expect(() => parseReplay(raw, DEFAULT_CONTENT)).toThrow();
    await expect(importReplayArchive({ format: "grand-line-chronicle-archive", formatVersion: 1, records: [completed(), {}] }, DEFAULT_CONTENT)).rejects.toThrow("malformed");
  });
  it("bounds count and bytes deterministically without changing profile credit", () => {
    const replay = completed(); const header = replayHeader({ id: "record-0", replay, origin: "local" });
    const headers = Array.from({ length: 10 }, (_, index) => ({ ...header, id: `record-${index}`, startedAt: index }));
    expect(retainedHeaders(headers, { ...header, id: "new", startedAt: 20 }).map((entry) => entry.id)).not.toContain("record-0");
    const large = headers.map((entry) => ({ ...entry, bytes: MAX_REPLAY_BYTES }));
    expect(retainedHeaders(large, { ...header, id: "new", startedAt: 20, bytes: MAX_REPLAY_BYTES })).toHaveLength(3);
    expect(() => retainedHeaders([], { ...header, bytes: MAX_REPLAY_BYTES + 1 })).toThrow("limit");
  });
});
