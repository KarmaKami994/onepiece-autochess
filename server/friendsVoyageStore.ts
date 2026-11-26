import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { CAROUSEL_TICK_MS, CONTENT, CURRENT_SAVE_SCHEMA_VERSION, hashGameContent, migrateMatchState, type MatchState } from "../game";
import type { FriendsCommandReceipt } from "../app/multiplayer/protocol";
import type { FriendsVoyage } from "./friendsVoyage";

export const DEFAULT_FRIENDS_VOYAGE_DB = ".codex-local/multiplayer-voyage.sqlite";
const checkpointVersion = 1;
const contentHash = hashGameContent(CONTENT);
const finishedVoyageRetentionMs = 10 * 60_000;

export type FriendsVoyageSeat = { accountId: string; name: string; seat: number };
export type VoyageCheckpoint = {
  code: string;
  host: string;
  seats: FriendsVoyageSeat[];
  revision: number;
  finishedAt: number | null;
  voyage: FriendsVoyage;
};
export type StoredCommand = { accountId: string; id: string; error?: string };

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a saved object.");
  return value as Record<string, unknown>;
}

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function finishedVoyageExpired(finishedAt: number | null, now: number): boolean {
  return finishedAt !== null && now - finishedAt >= finishedVoyageRetentionMs;
}

function encodeCheckpoint(checkpoint: VoyageCheckpoint, now: number): string {
  const { code, host, seats, voyage, finishedAt } = checkpoint;
  const { durationMs, startedAt, state } = voyage;
  const remainingMs = Math.max(0, durationMs - Math.max(0, now - startedAt));
  return JSON.stringify({
    version: checkpointVersion, contentHash, code, host, seats, durationMs, remainingMs, finishedAt, state,
  });
}

function decodeCheckpoint(row: Record<string, unknown>, now: number): VoyageCheckpoint {
  const { match_id: matchId, revision, payload, digest } = row;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1 ||
    typeof payload !== "string" || typeof digest !== "string" || checksum(payload) !== digest) {
    throw new Error("Invalid voyage checkpoint.");
  }
  const data = asObject(JSON.parse(payload) as unknown);
  const state = asObject(data.state);
  const { code, host, durationMs, remainingMs, finishedAt } = data;
  if (data.version !== checkpointVersion || data.contentHash !== contentHash ||
    state.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION || state.contentVersion !== CONTENT.version ||
    typeof matchId !== "string" || state.seed !== matchId ||
    typeof code !== "string" || !code || typeof host !== "string" || !host ||
    typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0 ||
    typeof remainingMs !== "number" || !Number.isFinite(remainingMs) || remainingMs < 0 || remainingMs > durationMs) {
    throw new Error("Invalid voyage checkpoint version or clock.");
  }
  if (state.phase === "game-over"
    ? typeof finishedAt !== "number" || !Number.isSafeInteger(finishedAt) || finishedAt < 0
    : finishedAt !== null) {
    throw new Error("Invalid completion timestamp.");
  }

  // Validate with the shared reader, then keep the exact stored state for this version.
  const validated = migrateMatchState(state, CONTENT);
  if (validated.phase !== state.phase || validated.round !== state.round || validated.rngState !== state.rngState ||
    !Number.isSafeInteger(validated.round) || validated.round < 1 ||
    !["starter-choice", "preparation", "battle", "item-choice", "carousel", "voyage-choice", "harbor-choice", "game-over"].includes(validated.phase) ||
    validated.players.length !== CONTENT.config.playerCount ||
    (validated.phase === "carousel" && !validated.carouselSession)) {
    throw new Error("Invalid authoritative match state.");
  }
  if (!Array.isArray(data.seats) || data.seats.length < 2 ||
    data.seats.length !== validated.players.filter((player) => !player.isBot).length) {
    throw new Error("Invalid voyage seats.");
  }
  const seats = data.seats.map((value: unknown, index): FriendsVoyageSeat => {
    const { accountId, name, seat } = asObject(value);
    const player = validated.players[index];
    if (typeof accountId !== "string" || !accountId || typeof name !== "string" || !name ||
      typeof seat !== "number" || seat !== index + 1 || player.id !== "player-" + seat || player.isBot || player.name !== name) {
      throw new Error("Invalid saved seat.");
    }
    return { accountId, name, seat };
  });
  if (new Set(seats.map(({ accountId }) => accountId)).size !== seats.length || !seats.some((seat) => seat.accountId === host)) {
    throw new Error("Invalid saved captain accounts.");
  }

  const elapsed = validated.phase === "carousel"
    ? (validated.carouselSession?.tick ?? 0) * CAROUSEL_TICK_MS
    : durationMs - remainingMs;
  return {
    code, host, seats, revision, finishedAt: typeof finishedAt === "number" ? finishedAt : null,
    voyage: { state: state as unknown as MatchState, startedAt: now - elapsed, durationMs },
  };
}

export function openFriendsVoyageStore(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    db.exec(
      "PRAGMA busy_timeout = 2000; PRAGMA foreign_keys = ON;" +
      "CREATE TABLE IF NOT EXISTS friends_voyage (" +
      "  slot INTEGER PRIMARY KEY CHECK(slot = 1), match_id TEXT UNIQUE NOT NULL," +
      "  revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL" +
      ");" +
      "CREATE TABLE IF NOT EXISTS friends_command_receipt (" +
      "  match_id TEXT NOT NULL REFERENCES friends_voyage(match_id) ON DELETE CASCADE," +
      "  account_id TEXT NOT NULL, command_id TEXT NOT NULL, revision INTEGER NOT NULL, error TEXT," +
      "  PRIMARY KEY (match_id, account_id, command_id)" +
      ");",
    );
    const select = db.prepare("SELECT match_id, revision, payload, digest FROM friends_voyage WHERE slot = 1");
    const insert = db.prepare("INSERT INTO friends_voyage (slot, match_id, revision, payload, digest) VALUES (1, ?, ?, ?, ?)");
    const update = db.prepare("UPDATE friends_voyage SET revision = ?, payload = ?, digest = ? WHERE slot = 1 AND match_id = ? AND revision = ?");
    const discard = db.prepare("DELETE FROM friends_voyage WHERE slot = 1 AND match_id = ? AND revision = ?");
    const insertReceipt = db.prepare("INSERT INTO friends_command_receipt (match_id, account_id, command_id, revision, error) VALUES (?, ?, ?, ?, ?)");
    const selectReceipt = db.prepare("SELECT revision, error FROM friends_command_receipt WHERE match_id = ? AND account_id = ? AND command_id = ?");
    return {
      read(now: number): VoyageCheckpoint | null {
        const row = select.get();
        if (!row) return null;
        try {
          return decodeCheckpoint(row, now);
        } catch {
          throw new Error("The saved friends voyage is invalid or incompatible. Its database was preserved. Use the matching game version or select a separate MULTIPLAYER_VOYAGE_DB.");
        }
      },
      write(checkpoint: VoyageCheckpoint, now: number, command?: StoredCommand): number {
        const matchId = checkpoint.voyage.state.seed;
        const revision = checkpoint.revision + 1;
        const payload = encodeCheckpoint(checkpoint, now);
        const digest = checksum(payload);
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = checkpoint.revision === 0
            ? insert.run(matchId, revision, payload, digest)
            : update.run(revision, payload, digest, matchId, checkpoint.revision);
          if (result.changes !== 1) throw new Error("The voyage checkpoint has already moved.");
          if (command) insertReceipt.run(matchId, command.accountId, command.id, revision, command.error ?? null);
          db.exec("COMMIT");
          return revision;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      receipt(matchId: string, accountId: string, id: string): FriendsCommandReceipt | null {
        const row = selectReceipt.get(matchId, accountId, id);
        return row && typeof row.revision === "number"
          ? { id, revision: row.revision, error: typeof row.error === "string" ? row.error : undefined }
          : null;
      },
      discard(matchId: string, revision: number): boolean {
        return discard.run(matchId, revision).changes === 1;
      },
      close() { db.close(); },
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

export type FriendsVoyageStore = ReturnType<typeof openFriendsVoyageStore>;

export async function backupFriendsDatabase(source: string, destination: string): Promise<void> {
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    mkdirSync(dirname(destination), { recursive: true });
    closeSync(openSync(destination, "wx", 0o600));
    try {
      await backup(db, destination);
    } catch (error) {
      unlinkSync(destination);
      throw error;
    }
  } finally {
    db.close();
  }
}
