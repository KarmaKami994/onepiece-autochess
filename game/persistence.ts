import { DEFAULT_CONTENT } from "./content";
import { deserializeMatch, serializeMatch } from "./persistenceFormat";
import type { GameContent, MatchState, StorageAdapter } from "./types";

export const DEFAULT_SAVE_KEY = "grand-line-auto-chess.match";

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
