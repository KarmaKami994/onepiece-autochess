import { applyCommand, CONTENT, advanceMatchPhase, createMatch } from "../game";
import type { MatchState } from "../game";
import { phaseClockBudget } from "../app/phaseClock";
import { LOCAL_SEATS, type LocalMatchCommand } from "../app/multiplayer/protocol";

export type LocalMatch = {
  state: MatchState;
  durationMs: number;
  endsAt: number;
  completed: boolean;
};

function timePhase(state: MatchState, now: number): LocalMatch {
  const battleSeconds = Math.max(1, ...state.lastResults.map((result) =>
    Math.ceil(result.durationTicks * CONTENT.config.combatTickMs / 1_000)));
  const { durationMs } = phaseClockBudget(state.phase, state.round, battleSeconds, 1, CONTENT);
  return { state, durationMs, endsAt: now + durationMs, completed: false };
}

export function createLocalMatch(seed: string, now: number): LocalMatch {
  return timePhase(createMatch(seed, CONTENT, LOCAL_SEATS), now);
}

export function expireLocalMatch(match: LocalMatch, now: number): LocalMatch {
  if (match.completed || now < match.endsAt) return match;
  const state = advanceMatchPhase(match.state);
  return match.state.phase === "battle"
    ? { ...match, state, completed: true }
    : timePhase(state, now);
}

export function applyLocalMatchCommand(
  match: LocalMatch, actorPlayerId: string, command: LocalMatchCommand, now: number,
): { match: LocalMatch; error?: string } {
  const current = expireLocalMatch(match, now);
  if (current.completed || current.state.phase !== "preparation") {
    return { match: current, error: "The preparation phase has ended." };
  }
  const result = applyCommand(current.state, command, { actorPlayerId, waitForAllHumanPlayers: true });
  if (!result.ok) return { match: current, error: result.error.message };
  return { match: result.state.phase === current.state.phase
    ? { ...current, state: result.state }
    : timePhase(result.state, now) };
}

export function readLocalMatchCommand(value: unknown): LocalMatchCommand | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const command = value as Record<string, unknown>;
  const type = command.type;
  switch (type) {
    case "BUY_UNIT":
      return typeof command.shopIndex === "number" && Number.isInteger(command.shopIndex)
        ? { type, shopIndex: command.shopIndex } : null;
    case "MOVE_UNIT": {
      if (typeof command.unitId !== "string" || !command.to ||
        typeof command.to !== "object") return null;
      const target = command.to as Record<string, unknown>;
      if (target.zone === "bench" && typeof target.slot === "number" && Number.isInteger(target.slot)) {
        return { type, unitId: command.unitId, to: { zone: "bench", slot: target.slot } };
      }
      return target.zone === "board" && typeof target.x === "number" && Number.isInteger(target.x) &&
        typeof target.y === "number" && Number.isInteger(target.y)
        ? { type, unitId: command.unitId, to: { zone: "board", x: target.x, y: target.y } }
        : null;
    }
    case "SELL_UNIT":
      return typeof command.unitId === "string" ? { type, unitId: command.unitId } : null;
    case "EQUIP_ITEM":
      return typeof command.unitId === "string" && typeof command.itemId === "string"
        ? { type, unitId: command.unitId, itemId: command.itemId } : null;
    case "USE_FOOD":
      return typeof command.unitId === "string" && typeof command.foodId === "string"
        ? { type, unitId: command.unitId, foodId: command.foodId } : null;
    case "REROLL_SHOP":
    case "TOGGLE_SHOP_LOCK":
    case "BUY_XP":
    case "END_PREPARATION":
      return { type };
    default:
      return null;
  }
}
