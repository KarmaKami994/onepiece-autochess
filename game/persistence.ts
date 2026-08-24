import { DEFAULT_CONTENT, getStageDefinition } from "./content";
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  regenerateBattleResults,
  resolveLegacyCarousel,
} from "./engine";
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPosition(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function sanitizeResolvableCarouselChoices(
  match: MatchState,
  content: GameContent,
): void {
  const itemIds = new Set(content.items.map((item) => item.id));
  match.carouselChoices = match.carouselChoices.flatMap((rawChoice, index) => {
    const choice = rawChoice as unknown;
    if (!isRecord(choice)) {
      return [];
    }
    const id = typeof choice.id === "string" ? choice.id : null;
    const itemId = typeof choice.itemId === "string" ? choice.itemId : null;
    const takenByPlayerId =
      choice.takenByPlayerId === null ||
      typeof choice.takenByPlayerId === "string"
        ? choice.takenByPlayerId
        : null;
    if (!id || !itemId || !itemIds.has(itemId)) {
      return [];
    }
    return [
      {
        id,
        itemId,
        takenByPlayerId,
        orbitIndex: Number.isInteger(choice.orbitIndex)
          ? Number(choice.orbitIndex)
          : index,
        claimedAtTick:
          choice.claimedAtTick === null ||
          Number.isInteger(choice.claimedAtTick)
            ? (choice.claimedAtTick as number | null)
            : takenByPlayerId
              ? 0
              : null,
      },
    ];
  });
}

function hasValidCarouselCheckpoint(
  match: MatchState,
  content: GameContent,
): boolean {
  const session = match.carouselSession;
  if (!session) {
    return false;
  }
  if (
    !Number.isInteger(session.tick) ||
    session.tick < 0 ||
    !Number.isInteger(session.durationTicks) ||
    session.durationTicks <= 0 ||
    !Number.isInteger(session.arenaSeed) ||
    (session.finishAtTick !== null &&
      (!Number.isInteger(session.finishAtTick) || session.finishAtTick < 0)) ||
    !Array.isArray(session.participants) ||
    !Array.isArray(session.events)
  ) {
    return false;
  }
  const livingPlayerIds = new Set(
    match.players.filter((player) => player.alive).map((player) => player.id),
  );
  const participantIds = new Set<string>();
  for (const participant of session.participants) {
    if (
      typeof participant.playerId !== "string" ||
      !livingPlayerIds.has(participant.playerId) ||
      participantIds.has(participant.playerId) ||
      !Number.isInteger(participant.rank) ||
      participant.rank < 1 ||
      !isPosition(participant.spawnPosition) ||
      !isPosition(participant.position) ||
      !isPosition(participant.targetPosition) ||
      !Number.isInteger(participant.releaseTick) ||
      participant.releaseTick < 0 ||
      !Number.isInteger(participant.reactionDelayTicks) ||
      participant.reactionDelayTicks < 0 ||
      typeof participant.moving !== "boolean" ||
      !(
        participant.claimedChoiceId === null ||
        typeof participant.claimedChoiceId === "string"
      )
    ) {
      return false;
    }
    participantIds.add(participant.playerId);
  }
  if (participantIds.size !== livingPlayerIds.size) {
    return false;
  }
  const itemIds = new Set(content.items.map((item) => item.id));
  const choiceIds = new Set<string>();
  for (const choice of match.carouselChoices) {
    if (
      typeof choice.id !== "string" ||
      choiceIds.has(choice.id) ||
      typeof choice.itemId !== "string" ||
      !itemIds.has(choice.itemId) ||
      !(
        choice.takenByPlayerId === null ||
        participantIds.has(choice.takenByPlayerId)
      ) ||
      !Number.isInteger(choice.orbitIndex) ||
      choice.orbitIndex < 0 ||
      !(
        choice.claimedAtTick === null ||
        (Number.isInteger(choice.claimedAtTick) && choice.claimedAtTick >= 0)
      )
    ) {
      return false;
    }
    choiceIds.add(choice.id);
  }
  if (match.carouselChoices.length < session.participants.length) {
    return false;
  }
  for (const participant of session.participants) {
    const claimedChoice = participant.claimedChoiceId
      ? match.carouselChoices.find(
          (choice) => choice.id === participant.claimedChoiceId,
        )
      : null;
    if (
      (participant.claimedChoiceId !== null &&
        claimedChoice?.takenByPlayerId !== participant.playerId) ||
      match.carouselChoices.some(
        (choice) =>
          choice.takenByPlayerId === participant.playerId &&
          choice.id !== participant.claimedChoiceId,
      )
    ) {
      return false;
    }
  }
  return session.events.every(
    (event) =>
      isRecord(event) &&
      typeof event.id === "string" &&
      typeof event.type === "string" &&
      Number.isInteger(event.tick) &&
      Number(event.tick) >= 0,
  );
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

  if (version <= 4 && Array.isArray(mutable.players)) {
    for (const rawPlayer of mutable.players) {
      if (isRecord(rawPlayer)) {
        rawPlayer.recentBattles = [];
      }
    }
  }

  if (Array.isArray(mutable.players)) {
    for (const rawPlayer of mutable.players) {
      if (!isRecord(rawPlayer)) {
        continue;
      }
      rawPlayer.recentBattles = Array.isArray(rawPlayer.recentBattles)
        ? rawPlayer.recentBattles.slice(-5)
        : [];
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
  mutable.carouselChoices = Array.isArray(mutable.carouselChoices)
    ? mutable.carouselChoices
    : [];
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
  mutable.carouselSession = isRecord(mutable.carouselSession)
    ? mutable.carouselSession
    : null;
  let migrated = mutable as unknown as MatchState;

  if (version <= 3) {
    // Version 4 adds initial snapshots and state-specific combat events. Old
    // result logs cannot be upgraded field-by-field without inventing data.
    // During combat we deterministically replay the already-created pairings;
    // in every planning/choice phase the log is disposable and is cleared.
    migrated =
      migrated.phase === "battle"
        ? regenerateBattleResults(migrated, content)
        : { ...migrated, lastResults: [] };
  }

  if (version <= 5) {
    // Version 6 replaces the turn-based choice ring with a deterministic
    // real-time regatta. Legacy carousel saves have no boat positions or
    // release clocks, so complete the old draft exactly once using the same
    // best-fit fallback that its timeout used.
    if (migrated.phase === "carousel") {
      sanitizeResolvableCarouselChoices(migrated, content);
      migrated = resolveLegacyCarousel(migrated, content);
    } else {
      migrated = { ...migrated, carouselSession: null };
    }
  } else if (migrated.phase === "carousel") {
    if (!hasValidCarouselCheckpoint(migrated, content)) {
      sanitizeResolvableCarouselChoices(migrated, content);
      migrated.carouselSession = null;
      migrated = resolveLegacyCarousel(migrated, content);
    }
  } else {
    migrated = { ...migrated, carouselSession: null };
  }

  return migrated;
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
