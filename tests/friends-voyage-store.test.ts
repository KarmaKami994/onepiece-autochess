import { mkdtempSync, rmdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTENT } from "../game";
import { applyFriendsCommand, createFriendsVoyage, tickFriendsVoyage } from "../server/friendsVoyage";
import { backupFriendsDatabase, finishedVoyageExpired, openFriendsVoyageStore, type VoyageCheckpoint } from "../server/friendsVoyageStore";

function preparingVoyage(): VoyageCheckpoint {
  const opening = createFriendsVoyage("mp4-test-voyage", 0, ["Mara", "Taro"]);
  const voyage = tickFriendsVoyage(opening, opening.durationMs);
  return {
    code: "private-link",
    host: "approved-mara",
    seats: [
      { accountId: "approved-mara", name: "Mara", seat: 1 },
      { accountId: "approved-taro", name: "Taro", seat: 2 },
    ],
    voyage,
    revision: 0,
    finishedAt: null,
  };
}

describe("MP4 persistent friends voyage", () => {
  let directory: string;
  let path: string;
  let destination: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "grand-line-mp4-"));
    path = join(directory, "voyage.sqlite");
    destination = join(directory, "copy.sqlite");
  });

  afterEach(() => {
    for (const file of [path, destination]) {
      try { unlinkSync(file); } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") throw error;
      }
    }
    rmdirSync(directory);
  });

  it("reopens a preparation checkpoint with the same seats, shops, RNG and remaining deadline", () => {
    const initial = preparingVoyage();
    const now = initial.voyage.startedAt + 875;
    const first = openFriendsVoyageStore(path);
    try {
      expect(first.write(initial, now)).toBe(1);
    } finally {
      first.close();
    }

    const later = 120_000;
    const second = openFriendsVoyageStore(path);
    try {
      const restored = second.read(later);
      expect(restored).toEqual({
        ...initial,
        revision: 1,
        voyage: { ...initial.voyage, startedAt: later - 875 },
      });
      if (!restored) throw new Error("The voyage could not be restored.");
      const expiry = restored.voyage.startedAt + restored.voyage.durationMs;
      expect(tickFriendsVoyage(restored.voyage, expiry - 1)).toBe(restored.voyage);
      expect(tickFriendsVoyage(restored.voyage, expiry).state.phase).toBe("battle");
    } finally {
      second.close();
    }
  });

  it("persists a reward and its receipt together, including through backup and duplicate retries", async () => {
    const initial = preparingVoyage();
    const state = initial.voyage.state;
    state.phase = "item-choice";
    const item = CONTENT.items.find((candidate) => candidate.kind === "component");
    if (!item) throw new Error("Missing component fixture.");
    state.pendingItemChoices = { "player-2": [item.id] };
    const active = { ...initial.voyage, durationMs: 23_000 };
    const now = active.startedAt + 25;
    const result = applyFriendsCommand(active, "player-2", {
      round: state.round, phase: state.phase, command: { type: "CHOOSE_ITEM", choiceId: item.id },
    }, now);
    expect(result.error).toBeUndefined();
    const first = openFriendsVoyageStore(path);
    const command = { accountId: "approved-taro", id: "one-reward" };
    try {
      const revision = first.write({ ...initial, voyage: active }, now);
      expect(first.write({ ...initial, revision, voyage: result.voyage }, now, command)).toBe(revision + 1);
      expect(result.voyage.state.players[1].inventory).toEqual([item.id]);
      await backupFriendsDatabase(path, destination);
      await expect(backupFriendsDatabase(path, destination)).rejects.toMatchObject({ code: "EEXIST" });
    } finally {
      first.close();
    }

    const restored = openFriendsVoyageStore(destination);
    try {
      const checkpoint = restored.read(130_000);
      if (!checkpoint) throw new Error("The backup did not contain the voyage.");
      expect(checkpoint.voyage.state).toEqual(result.voyage.state);
      expect(restored.receipt(state.seed, command.accountId, command.id)).toEqual({
        id: command.id, revision: checkpoint.revision, error: undefined,
      });
      expect(restored.receipt(state.seed, "approved-mara", command.id)).toBeNull();
      const duplicated = structuredClone(checkpoint);
      duplicated.voyage.state.players[1].inventory.push(item.id);
      expect(() => restored.write(duplicated, 130_000, command)).toThrow();
      expect(restored.read(130_000)).toEqual(checkpoint);
    } finally {
      restored.close();
    }
  });

  it("leaves an incompatible content checkpoint in place", () => {
    const initial = preparingVoyage();
    initial.voyage.state.contentVersion = "incompatible";
    const store = openFriendsVoyageStore(path);
    try {
      expect(store.write(initial, initial.voyage.startedAt)).toBe(1);
      expect(() => store.read(0)).toThrow("database was preserved");
      expect(() => store.write(preparingVoyage(), 0)).toThrow();
    } finally {
      store.close();
    }
  });

  it("expires finished voyages only and removes their receipts in the same cleanup", () => {
    const finished = preparingVoyage();
    finished.finishedAt = 1_000;
    finished.voyage.state.phase = "game-over";
    finished.voyage.durationMs = 0;
    const store = openFriendsVoyageStore(path);
    try {
      expect(finishedVoyageExpired(null, 999_999)).toBe(false);
      expect(finishedVoyageExpired(finished.finishedAt, 600_999)).toBe(false);
      expect(finishedVoyageExpired(finished.finishedAt, 601_000)).toBe(true);
      const command = { accountId: finished.host, id: "last-action" };
      const revision = store.write(finished, finished.voyage.startedAt, command);
      expect(store.read(0)?.finishedAt).toBe(1_000);
      expect(store.discard(finished.voyage.state.seed, revision - 1)).toBe(false);
      expect(store.discard(finished.voyage.state.seed, revision)).toBe(true);
      expect(store.read(0)).toBeNull();
      expect(store.receipt(finished.voyage.state.seed, command.accountId, command.id)).toBeNull();
    } finally {
      store.close();
    }
  });
});
