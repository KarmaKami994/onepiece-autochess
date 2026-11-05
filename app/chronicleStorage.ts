import type { GameContent } from "../game";
import { MAX_ARCHIVE_BYTES, MAX_ARCHIVE_RECORDS, MAX_REPLAY_BYTES, creditVoyage, emptyProfile, type CaptainProfile, type StoredReplay, type VoyageReplay } from "./chronicle";
import { validateProfile, validateReplay } from "./replayValidation";

export type ReplayHeader = { id: string; seed: string; startedAt: number; completedAt: number | null; contentVersion: string; placement: number | null; fromStart: boolean; origin: StoredReplay["origin"]; bytes: number };
export const CHRONICLE_DB = "grand-line-chronicle";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CHRONICLE_DB, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("records", { keyPath: "id" }); request.result.createObjectStore("meta"); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close another Chronicle tab to open local storage."));
  });
}
function finish<T>(database: IDBDatabase, transaction: IDBTransaction, result: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { database.close(); resolve(result()); };
    transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Chronicle storage transaction failed.")); };
  });
}
async function readMeta(key: string): Promise<unknown> {
  const db = await openDb(); const tx = db.transaction("meta", "readonly");
  const request = tx.objectStore("meta").get(key);
  return finish(db, tx, () => request.result as unknown);
}
export async function readProfile(): Promise<CaptainProfile> { const raw = await readMeta("profile"); return raw === undefined ? emptyProfile() : validateProfile(raw); }
export async function readReplayHeaders(): Promise<ReplayHeader[]> { return (await readMeta("headers") as ReplayHeader[] | undefined) ?? []; }
export async function readReplay(id: string, content: GameContent): Promise<StoredReplay> {
  const db = await openDb(); const tx = db.transaction("records", "readonly"); const request = tx.objectStore("records").get(id);
  const raw = await finish(db, tx, () => request.result as StoredReplay | undefined);
  if (!raw) throw new Error("Recording no longer exists.");
  return { id: raw.id, origin: raw.origin, replay: validateReplay(raw.replay, content) };
}
export async function readReplayDraft(seed: string, content: GameContent): Promise<VoyageReplay | null> {
  const raw = await readMeta("draft");
  if (raw === undefined) return null;
  const checked = validateReplay(raw, content);
  return checked.seed === seed ? checked : null;
}
export function replayHeader(record: StoredReplay): ReplayHeader {
  const replay = record.replay;
  return { id: record.id, seed: replay.seed, startedAt: replay.startedAt, completedAt: replay.completedAt, contentVersion: replay.contentVersion, fromStart: replay.fromStart, origin: record.origin,
    placement: replay.frames.at(-1)?.players.find((player) => player.id === replay.playerId)?.placement ?? null, bytes: new TextEncoder().encode(JSON.stringify(replay)).length };
}
export function retainedHeaders(headers: ReplayHeader[], incoming: ReplayHeader): ReplayHeader[] {
  if (incoming.bytes > MAX_REPLAY_BYTES) throw new Error("Recording exceeds the 32 MiB limit; it was not archived.");
  const retained = [...headers.filter((entry) => entry.id !== incoming.id), incoming].sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id));
  while (retained.length > MAX_ARCHIVE_RECORDS || retained.reduce((sum, entry) => sum + entry.bytes, 0) > MAX_ARCHIVE_BYTES) retained.shift();
  return retained;
}
/** The read/compare/credit/write occurs within ONE transaction, including across tabs. */
async function storeRecording(record: StoredReplay, content: GameContent, local: boolean): Promise<void> {
  const header = replayHeader(record);
  if (header.bytes > MAX_REPLAY_BYTES) throw new Error("Recording exceeds 32 MiB. Active voyage remains playable; archive recording stopped.");
  const db = await openDb(); const tx = db.transaction(["records", "meta"], "readwrite"); const meta = tx.objectStore("meta");
  const headersRequest = meta.get("headers"); const profileRequest = meta.get("profile"); const creditedRequest = meta.get("credited");
  let failure: unknown;
  creditedRequest.onsuccess = () => {
    try {
      const headers = (headersRequest.result as ReplayHeader[] | undefined) ?? [];
      const profile = profileRequest.result === undefined ? emptyProfile() : validateProfile(profileRequest.result);
      const credited = (creditedRequest.result as string[] | undefined) ?? [];
      // Deleted/evicted completed voyages stay deleted when the same save resumes.
      if (local && credited.includes(record.replay.id)) { meta.put(record.replay, "draft"); return; }
      const retained = retainedHeaders(headers, header);
      const ids = new Set(retained.map((entry) => entry.id));
      for (const old of headers) if (!ids.has(old.id)) tx.objectStore("records").delete(old.id);
      if (ids.has(record.id)) tx.objectStore("records").put(record);
      meta.put(retained, "headers");
      if (local) {
        meta.put(record.replay, "draft");
        if (!credited.includes(record.replay.id)) {
          if (credited.length >= 10_000) throw new Error("Credit ledger limit reached. Export your Chronicle before further progression.");
          meta.put(creditVoyage(profile, record.replay, content), "profile");
          meta.put([...credited, record.replay.id], "credited");
        }
      }
    } catch (error) { failure = error; tx.abort(); }
  };
  try { await finish(db, tx, () => undefined); } catch (error) { throw failure ?? error; }
}
export async function checkpointReplay(replay: VoyageReplay, content: GameContent): Promise<void> {
  if (replay.completedAt !== null) return storeRecording({ id: `local:${replay.id}`, replay, origin: "local" }, content, true);
  if (new TextEncoder().encode(JSON.stringify(replay)).length > MAX_REPLAY_BYTES) throw new Error("Recording exceeds the 32 MiB draft limit. Active voyage is unaffected.");
  const db = await openDb(); const tx = db.transaction("meta", "readwrite"); tx.objectStore("meta").put(replay, "draft"); await finish(db, tx, () => undefined);
}
export async function importReplay(replay: VoyageReplay, content: GameContent): Promise<void> {
  await storeRecording({ id: `imported:${crypto.randomUUID()}`, replay: validateReplay(replay, content), origin: "imported" }, content, false);
}
export async function importReplayArchive(raw: unknown, content: GameContent): Promise<void> {
  if (!raw || typeof raw !== "object" || !("format" in raw) || raw.format !== "grand-line-chronicle-archive" || !("formatVersion" in raw) || raw.formatVersion !== 1 || !("records" in raw) || !Array.isArray(raw.records) || raw.records.length > MAX_ARCHIVE_RECORDS) throw new Error("Invalid Chronicle archive.");
  // Validate every recording before opening a write transaction; imports never credit profile.
  const records: StoredReplay[] = raw.records.map((replay: unknown) => ({ id: `imported:${crypto.randomUUID()}`, replay: validateReplay(replay, content), origin: "imported" }));
  const incoming = records.map(replayHeader);
  if (incoming.some((header) => header.bytes > MAX_REPLAY_BYTES) || incoming.reduce((sum, header) => sum + header.bytes, 0) > MAX_ARCHIVE_BYTES) throw new Error("Imported archive exceeds storage limits.");
  const db = await openDb(); const tx = db.transaction(["records", "meta"], "readwrite"); const request = tx.objectStore("meta").get("headers");
  request.onsuccess = () => {
    const previous = (request.result as ReplayHeader[] | undefined) ?? [];
    const retained = incoming.reduce(retainedHeaders, previous);
    const ids = new Set(retained.map((header) => header.id));
    for (const header of previous) if (!ids.has(header.id)) tx.objectStore("records").delete(header.id);
    for (const record of records) if (ids.has(record.id)) tx.objectStore("records").put(record);
    tx.objectStore("meta").put(retained, "headers");
  };
  await finish(db, tx, () => undefined);
}
export async function deleteReplay(id?: string): Promise<void> {
  const db = await openDb(); const tx = db.transaction(["records", "meta"], "readwrite"); const request = tx.objectStore("meta").get("headers");
  request.onsuccess = () => {
    const headers = (request.result as ReplayHeader[] | undefined) ?? [];
    if (id) tx.objectStore("records").delete(id); else tx.objectStore("records").clear();
    tx.objectStore("meta").put(id ? headers.filter((entry) => entry.id !== id) : [], "headers");
  };
  await finish(db, tx, () => undefined);
}
export async function updateProfile(change: { name: string } | { reset: true } | { restore: CaptainProfile }): Promise<void> {
  const db = await openDb(); const tx = db.transaction("meta", "readwrite"); const meta = tx.objectStore("meta");
  const profileRequest = meta.get("profile"); const ledgerRequest = meta.get("credited");
  let failure: unknown;
  ledgerRequest.onsuccess = () => {
    try {
      const previous = profileRequest.result === undefined ? emptyProfile() : validateProfile(profileRequest.result);
      const next = "reset" in change ? emptyProfile(previous.name) : "restore" in change ? validateProfile(change.restore) : { ...previous, name: change.name.trim().slice(0, 40) || "Captain" };
      const credited = [...new Set([...(ledgerRequest.result as string[] | undefined ?? []), ...next.completedIds])];
      if (credited.length > 10_000) throw new Error("Profile credit ledger exceeds 10,000 voyages.");
      meta.put(next, "profile"); meta.put(credited, "credited");
    } catch (error) { failure = error; tx.abort(); }
  };
  try { await finish(db, tx, () => undefined); } catch (error) { throw failure ?? error; }
}
export function downloadChronicle(value: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: "application/json" })); const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
