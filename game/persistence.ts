import { DEFAULT_CONTENT, getStageDefinition } from "./content";
import { CURRENT_SAVE_SCHEMA_VERSION } from "./engine";
import type {
  GameContent,
  MatchState,
  SaveEnvelope,
  StorageAdapter,
} from "./types";

export const DEFAULT_SAVE_KEY = "grand-line-auto-chess.match";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function migrateMatchState(
  rawMatch: unknown,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  if (!isRecord(rawMatch)) {
    throw new Error("Save does not contain a match object.");
  }
  const mutable = cloneJson(rawMatch);
  const version =
    typeof mutable.schemaVersion === "number" ? mutable.schemaVersion : 1;
  if (version > CURRENT_SAVE_SCHEMA_VERSION) {
    throw new Error(
      `Save schema ${version} is newer than supported schema ${CURRENT_SAVE_SCHEMA_VERSION}.`,
    );
  }

  if (version <= 1) {
    const round =
      typeof mutable.round === "number" && Number.isFinite(mutable.round)
        ? Math.max(1, Math.floor(mutable.round))
        : 1;
    mutable.schemaVersion = 2;
    mutable.stageId =
      typeof mutable.stageId === "string"
        ? mutable.stageId
        : getStageDefinition(round, content).id;
    mutable.pendingItemChoices = isRecord(mutable.pendingItemChoices)
      ? mutable.pendingItemChoices
      : {};
    mutable.carouselChoices = Array.isArray(mutable.carouselChoices)
      ? mutable.carouselChoices
      : [];
    mutable.nextChoiceSerial =
      typeof mutable.nextChoiceSerial === "number"
        ? mutable.nextChoiceSerial
        : 1;
  }

  if (version <= 2 && Array.isArray(mutable.players)) {
    for (const rawPlayer of mutable.players) {
      if (isRecord(rawPlayer) && !Array.isArray(rawPlayer.finalCrew)) {
        rawPlayer.finalCrew = [];
      }
    }
  }

  const requiredArrays = ["players", "pairings", "lastResults"] as const;
  for (const field of requiredArrays) {
    if (!Array.isArray(mutable[field])) {
      throw new Error(`Save is missing required array: ${field}.`);
    }
  }
  if (!isRecord(mutable.pool)) {
    throw new Error("Save is missing the shared unit pool.");
  }
  if (
    typeof mutable.seed !== "string" ||
    typeof mutable.round !== "number" ||
    typeof mutable.rngState !== "number" ||
    typeof mutable.phase !== "string"
  ) {
    throw new Error("Save has invalid core match fields.");
  }

  mutable.schemaVersion = CURRENT_SAVE_SCHEMA_VERSION;
  mutable.contentVersion = content.version;
  return mutable as unknown as MatchState;
}

export function serializeMatch(
  state: MatchState,
  savedAt = "local",
): string {
  const envelope: SaveEnvelope = {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    contentVersion: state.contentVersion,
    savedAt,
    match: cloneJson(state),
  };
  return JSON.stringify(envelope);
}

export function deserializeMatch(
  serialized: string,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error("Save is not valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new Error("Save envelope must be an object.");
  }
  const rawMatch = "match" in parsed ? parsed.match : parsed;
  return migrateMatchState(rawMatch, content);
}

export function saveMatch(
  storage: StorageAdapter,
  state: MatchState,
  key = DEFAULT_SAVE_KEY,
  savedAt = "local",
): void {
  storage.setItem(key, serializeMatch(state, savedAt));
}

export function loadMatch(
  storage: StorageAdapter,
  key = DEFAULT_SAVE_KEY,
  content: GameContent = DEFAULT_CONTENT,
): MatchState | null {
  const serialized = storage.getItem(key);
  return serialized === null ? null : deserializeMatch(serialized, content);
}

export function removeSavedMatch(
  storage: StorageAdapter,
  key = DEFAULT_SAVE_KEY,
): void {
  storage.removeItem(key);
}

export function createMemoryStorage(
  initial: Record<string, string> = {},
): StorageAdapter {
  const values: Record<string, string> = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : null;
    },
    setItem(key, value) {
      values[key] = value;
    },
    removeItem(key) {
      delete values[key];
    },
  };
}
