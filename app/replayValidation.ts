import type { BattleEvent, BattleUnitSnapshot, GameContent, PlayerState, UnitInstance } from "../game";
import { ACHIEVEMENTS, MAX_REPLAY_BYTES, REPLAY_FORMAT, replayCompatible, type CaptainProfile, type CollectionFacts, type VoyageReplay } from "./chronicle";

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200;
const nullableText = (value: unknown) => value === null || text(value);
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const integer = (value: unknown): value is number => number(value) && Number.isInteger(value);
const array = (value: unknown, check: (entry: unknown) => boolean, max: number): value is unknown[] => Array.isArray(value) && value.length <= max && value.every(check);
const strings = (value: unknown) => array(value, text, 256);
const dictionary = (value: unknown, check: (entry: unknown) => boolean, max = 64): boolean => object(value) && Object.keys(value).length <= max && Object.entries(value).every(([key, entry]) => text(key) && key !== "__proto__" && key !== "constructor" && check(entry));
const position = (value: unknown) => object(value) && integer(value.x) && value.x < 8 && integer(value.y) && value.y < 6;
const unique = (values: readonly string[]) => new Set(values).size === values.length;
const unit = (value: unknown): value is UnitInstance => object(value) && text(value.id) && text(value.definitionId) && (value.formId === undefined || text(value.formId)) && typeof value.star === "number" && [1, 2, 3].includes(value.star) && array(value.items, text, 3) && integer(value.acquiredOrder);
const setupUnit = (value: unknown) => object(value) && unit({ ...value, acquiredOrder: 0 }) && position(value.position);
function player(value: unknown): value is PlayerState {
  if (!object(value) || !text(value.id) || !text(value.name) || !nullableText(value.personalityId)) return false;
  if (!["isBot", "alive", "shopLocked", "ready"].every((key) => typeof value[key] === "boolean")) return false;
  if (!["hp", "gold", "level", "xp", "winStreak", "lossStreak"].every((key) => integer(value[key])) || Number(value.level) > 20) return false;
  if (value.placement !== null && (!integer(value.placement) || value.placement < 1 || value.placement > 8)) return false;
  if (!dictionary(value.units, unit) || !dictionary(value.board, text, 48) || !array(value.bench, nullableText, 32) || !array(value.shop, nullableText, 16) || !strings(value.inventory) || !array(value.finalCrew, unit, 64) || !strings(value.lastOpponents)) return false;
  if (!array(value.recentBattles, (entry) => object(entry) && integer(entry.round) && text(entry.opponentId) && ["win", "loss", "draw"].includes(String(entry.outcome)) && typeof entry.isGhost === "boolean" && integer(entry.captainDamageDealt) && integer(entry.captainDamageTaken), 5)) return false;
  if (value.finalLineup !== undefined && (!object(value.finalLineup) || !array(value.finalLineup.deployed, setupUnit, 48) || !array(value.finalLineup.reserve, unit, 32))) return false;
  const roster = value.units as Record<string, UnitInstance>;
  const board = value.board as Record<string, string>;
  return Object.entries(roster).every(([id, entry]) => id === entry.id) && Object.entries(board).every(([cell, id]) => /^([0-7]),([0-5])$/.test(cell) && Object.hasOwn(roster, id)) && unique(Object.values(board)) && (value.bench as (string | null)[]).every((id) => id === null || Object.hasOwn(roster, id));
}
function snapshot(value: unknown): value is BattleUnitSnapshot {
  return object(value) && text(value.id) && text(value.definitionId) && text(value.teamId) && (value.formId === undefined || text(value.formId)) && typeof value.star === "number" && [1, 2, 3].includes(value.star) && (value.items === undefined || array(value.items, text, 3)) && position(value) && ["hp", "maxHp", "shield", "energy", "maxEnergy", "attack", "defense", "range"].every((key) => number(value[key])) && ["seek", "move", "attack-windup", "attack-recovery", "cast", "stunned", "resurrecting", "dead"].includes(String(value.state));
}
function event(value: unknown): value is BattleEvent {
  if (!object(value) || !integer(value.tick) || value.tick > 100_000) return false;
  const ids = (...keys: string[]) => keys.every((key) => text(value[key]));
  const nums = (...keys: string[]) => keys.every((key) => number(value[key]));
  switch (value.type) {
    case "battle-start": return ids("teamAId", "teamBId");
    case "battle-end": return nullableText(value.winnerId) && typeof value.timedOut === "boolean";
    case "unit-move": return ids("unitId") && position(value.from) && position(value.to);
    case "unit-displace": return ids("sourceId", "unitId", "abilityId") && ["lunge", "knockback", "pull", "escape"].includes(String(value.movementKind)) && position(value.from) && position(value.to);
    case "unit-transform": return ids("unitId", "toFormId") && nullableText(value.fromFormId) && nums("hp", "maxHp");
    case "unit-resurrect": return ids("unitId") && nums("hp", "maxHp") && (value.formId === undefined || text(value.formId));
    case "attack": return ids("sourceId", "targetId") && typeof value.critical === "boolean";
    case "cast": return ids("sourceId", "abilityId") && strings(value.targetIds);
    case "ability-hit": return ids("sourceId", "targetId", "abilityId") && integer(value.hitIndex) && integer(value.hitCount) && value.hitIndex >= 1 && value.hitIndex <= value.hitCount && typeof value.finisher === "boolean";
    case "damage": return ids("sourceId", "targetId") && nums("amount", "healthDamage", "shieldDamage") && ["attack", "ability", "burn", "item"].includes(String(value.damageKind));
    case "energy": return ids("unitId") && (value.sourceId === undefined || text(value.sourceId)) && typeof value.amount === "number" && Number.isFinite(value.amount) && nums("value") && ["attack", "damaged", "cast-reset", "ability-drain", "item", "trait"].includes(String(value.reason));
    case "dodge": return ids("sourceId", "targetId");
    case "buff": return ids("sourceId", "targetId") && nums("amount", "value") && value.stat === "attack" && value.reason === "stacking-attack";
    case "heal": case "shield": return ids("sourceId", "targetId") && nums("amount");
    case "status": return ids("sourceId", "targetId") && integer(value.durationTicks) && ["stun", "burn", "wound", "resistance-reduction", "protect", "rune-protect", "blind", "paralysis", "emergency-shield"].includes(String(value.status));
    case "death": return ids("unitId") && nullableText(value.sourceId);
    default: return false;
  }
}
const collectionKeys = ["crewDiscovered", "crewOwned", "crewDeployed", "itemsDiscovered", "itemsOwned", "itemsDeployed", "formsReached"] as const;
function collection(value: unknown): value is CollectionFacts { return object(value) && collectionKeys.every((key) => strings(value[key]) && unique(value[key] as string[])); }

export function validateReplay(raw: unknown, content: GameContent): VoyageReplay {
  if (!object(raw) || raw.format !== REPLAY_FORMAT || raw.formatVersion !== 1 || !text(raw.id) || !text(raw.seed) || !text(raw.playerId) || !text(raw.contentVersion) || !text(raw.contentHash) || !text(raw.configHash) || !integer(raw.schemaVersion) || !number(raw.startedAt) || !(raw.completedAt === null || number(raw.completedAt)) || typeof raw.fromStart !== "boolean" || !collection(raw.collection)) throw new Error("Unsupported or malformed voyage replay.");
  const battle = (value: unknown) => object(value) && text(value.playerAId) && nullableText(value.playerBId) && nullableText(value.ghostOfPlayerId) && nullableText(value.winnerId) && typeof value.timedOut === "boolean" && integer(value.playerADamage) && integer(value.playerBDamage) && integer(value.durationTicks) && value.durationTicks <= 100_000 && array(value.initialUnits, snapshot, 48) && array(value.finalUnits, snapshot, 48) && array(value.events, event, 100_000);
  const frame = (value: unknown) => object(value) && integer(value.round) && value.round >= 1 && value.round <= 200 && ["preparation", "battle", "item-choice", "voyage-choice", "carousel", "game-over"].includes(String(value.phase)) && text(value.stageId) && array(value.players, player, 8) && value.players.length > 0 && dictionary(value.itemOffers, strings, 8) && dictionary(value.recruitOffers, strings, 8) && array(value.battles, battle, 8);
  if (!array(raw.frames, frame, 1000) || !raw.frames.length) throw new Error("Invalid replay checkpoints or battle events.");
  // The complete structural checks above narrow every field consumed by the viewer.
  const replay = structuredClone(raw) as VoyageReplay;
  if (!object(raw.peaks) || !["round", "level", "gold", "deployed"].every((key) => integer(raw.peaks && (raw.peaks as Record<string, unknown>)[key]))) throw new Error("Invalid replay record peaks.");
  const frameIds = replay.frames.map((frame) => `${frame.round}:${frame.phase}`);
  if (!unique(frameIds) || replay.frames.some((frame, index) => index > 0 && frame.round < replay.frames[index - 1].round)) throw new Error("Replay checkpoints are duplicated or unordered.");
  for (const frame of replay.frames) {
    const playerIds = frame.players.map((entry) => entry.id);
    if (!unique(playerIds) || !playerIds.includes(replay.playerId)) throw new Error("Invalid replay captain references.");
    for (const battle of frame.battles) {
      const fighterIds = battle.initialUnits.map((entry) => entry.id);
      if (!unique(fighterIds) || !playerIds.includes(battle.playerAId) || (battle.playerBId !== null && !playerIds.includes(battle.playerBId)) || battle.finalUnits.some((entry) => !fighterIds.includes(entry.id))) throw new Error("Invalid replay fighter references.");
      for (const entry of battle.events) {
        for (const key of ["sourceId", "targetId", "unitId"] as const) if (key in entry && entry[key as keyof typeof entry] !== null && entry[key as keyof typeof entry] !== undefined && !fighterIds.includes(String(entry[key as keyof typeof entry]))) throw new Error("Battle event references an unknown fighter.");
        if (entry.type === "cast" && entry.targetIds.some((id) => !fighterIds.includes(id))) throw new Error("Unknown cast target.");
      }
    }
  }
  if (replayCompatible(replay, content)) {
    const crew = new Set(content.units.map((entry) => entry.id));
    const enemies = new Set(content.enemies.map((entry) => entry.id));
    const items = new Set(content.items.map((entry) => entry.id));
    const forms = new Set(content.forms.map((entry) => entry.id));
    for (const frame of replay.frames) {
      const owned = frame.players.flatMap((entry) => [...Object.values(entry.units), ...entry.finalCrew, ...(entry.finalLineup?.deployed ?? []), ...(entry.finalLineup?.reserve ?? [])]);
      if (owned.some((entry) => !crew.has(entry.definitionId) || entry.items.some((id) => !items.has(id)) || (entry.formId && !forms.has(entry.formId)))) throw new Error("Unknown crew, form or item in compatible replay.");
      if (frame.battles.flatMap((entry) => [...entry.initialUnits, ...entry.finalUnits]).some((entry) => (!crew.has(entry.definitionId) && !enemies.has(entry.definitionId)) || (entry.items ?? []).some((id) => !items.has(id)) || (entry.formId && !forms.has(entry.formId)))) throw new Error("Unknown battle content.");
    }
  }
  return replay;
}
export function parseReplay(text: string, content: GameContent): VoyageReplay {
  if (new TextEncoder().encode(text).length > MAX_REPLAY_BYTES) throw new Error("Replay exceeds the 32 MiB limit.");
  return validateReplay(JSON.parse(text) as unknown, content);
}
export function validateProfile(raw: unknown): CaptainProfile {
  if (!object(raw) || raw.formatVersion !== 1 || !text(raw.name) || raw.name.length > 40 || !array(raw.completedIds, text, 10_000) || !unique(raw.completedIds as string[]) || !array(raw.placements, integer, 8) || raw.placements.length !== 8 || !(raw.bestPlacement === null || (integer(raw.bestPlacement) && raw.bestPlacement >= 1 && raw.bestPlacement <= 8)) || !["highestRound", "highestLevel", "highestGold", "largestCrew"].every((key) => integer(raw[key])) || !collection(raw.collection) || !array(raw.achievements, (id) => ACHIEVEMENTS.some(([key]) => id === key), ACHIEVEMENTS.length)) throw new Error("Invalid captain profile backup.");
  if ((raw.placements as number[]).reduce((sum, count) => sum + count, 0) !== raw.completedIds.length) throw new Error("Profile placement totals do not match its credit ledger.");
  return structuredClone(raw) as CaptainProfile;
}
