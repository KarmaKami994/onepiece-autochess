import {
  CURRENT_SAVE_SCHEMA_VERSION,
  DEFAULT_CONTENT,
  advanceMatchPhase,
  migrateMatchState,
  type GameContent,
  type MatchState,
} from "../game";

export type VoyageSaveEnvelope = {
  state: unknown;
  seed: string;
  updatedAt: number;
  schemaVersion?: number;
  contentVersion?: string;
  replayBattle?: boolean;
};

export function createVoyageSaveEnvelope(
  state: MatchState,
  seed: string,
  updatedAt: number,
): VoyageSaveEnvelope {
  return {
    state,
    seed,
    updatedAt,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    contentVersion: state.contentVersion,
    replayBattle: false,
  };
}

export function restoreVoyageState(
  saved: VoyageSaveEnvelope,
  content: GameContent = DEFAULT_CONTENT,
): MatchState {
  const restored = migrateMatchState(saved.state, content);
  return saved.replayBattle === true
    ? advanceMatchPhase(restored, content)
    : restored;
}

const DB_NAME = "grand-line-auto-chess";
const DB_VERSION = 1;
const STORE_NAME = "voyages";
const ACTIVE_SAVE = "active-voyage";

function openVoyageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readVoyage(): Promise<VoyageSaveEnvelope | null> {
  const database = await openVoyageDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(ACTIVE_SAVE);
    request.onsuccess = () =>
      resolve((request.result as VoyageSaveEnvelope | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function writeVoyage(envelope: VoyageSaveEnvelope): Promise<void> {
  const database = await openVoyageDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(envelope, ACTIVE_SAVE);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteVoyage(): Promise<void> {
  const database = await openVoyageDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(ACTIVE_SAVE);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
