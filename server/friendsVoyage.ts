import { advanceCarousel, advanceMatchPhase, applyCommand, CAROUSEL_TICK_MS, CONTENT, createVoyage } from "../game";
import type { MatchState } from "../game";
import { phaseClockBudget } from "../app/phaseClock";
import { selectMatchView } from "../app/selectors";
import { writeMatchView, type FriendsCommand, type FriendsRegattaFrame, type LocalMatchSnapshot } from "../app/multiplayer/protocol";
import { readLocalMatchCommand } from "./localMatch";

export type FriendsVoyage = {
  state: MatchState;
  startedAt: number;
  durationMs: number;
};

function timedVoyage(state: MatchState, now: number): FriendsVoyage {
  const battleSeconds = Math.max(1, ...state.lastResults.map((result) =>
    Math.ceil(result.durationTicks * CONTENT.config.combatTickMs / 1_000)));
  const durationMs = state.phase === "item-choice"
    ? CONTENT.voyageTiming.recruitmentSeconds * 1_000
    : phaseClockBudget(state.phase, state.round, battleSeconds, 1, CONTENT,
      state.players.filter((player) => player.alive).length).durationMs;
  return { state, startedAt: now, durationMs };
}

export function createFriendsVoyage(seed: string, now: number, captains: readonly string[]): FriendsVoyage {
  const state = createVoyage(seed, CONTENT, captains.length);
  captains.forEach((name, index) => { state.players[index].name = name; });
  return timedVoyage(state, now);
}

export function friendsVoyageSnapshot(voyage: FriendsVoyage, seat: number, now: number): LocalMatchSnapshot {
  const playerId = `player-${seat}`;
  return {
    status: "playing",
    durationMs: voyage.durationMs,
    remainingMs: Math.max(0, voyage.durationMs - (now - voyage.startedAt)),
    ready: voyage.state.players.some((player) => player.id === playerId && player.ready),
    view: writeMatchView(selectMatchView(voyage.state, CONTENT, playerId)),
  };
}

export function tickFriendsVoyage(voyage: FriendsVoyage, now: number): FriendsVoyage {
  const { state, startedAt, durationMs } = voyage;
  if (state.phase === "game-over") return voyage;
  if (state.phase === "carousel" && state.carouselSession) {
    const ticks = Math.floor((now - startedAt) / CAROUSEL_TICK_MS) - state.carouselSession.tick;
    if (ticks <= 0) return voyage;
    const next = advanceCarousel(state, ticks);
    return next.phase === "carousel" ? { ...voyage, state: next } : timedVoyage(next, now);
  }
  if (now < startedAt + durationMs) return voyage;
  return timedVoyage(advanceMatchPhase(state), now);
}

export function applyFriendsCommand(
  voyage: FriendsVoyage,
  actorPlayerId: string,
  message: NonNullable<ReturnType<typeof readFriendsCommand>>,
  now: number,
): { voyage: FriendsVoyage; error?: string } {
  const current = tickFriendsVoyage(voyage, now);
  if (message.round !== current.state.round || message.phase !== current.state.phase || current.state.phase === "game-over") {
    return { voyage: current, error: "That round or phase has ended." };
  }
  const result = applyCommand(current.state, message.command, { actorPlayerId, waitForAllHumanPlayers: true });
  if (!result.ok) return { voyage: current, error: result.error.message };
  return { voyage: result.state.phase === current.state.phase && result.state.round === current.state.round
    ? { ...current, state: result.state } : timedVoyage(result.state, now) };
}

export function friendsRegattaFrame(previous: FriendsVoyage, voyage: FriendsVoyage): FriendsRegattaFrame | null {
  const before = previous.state.carouselSession;
  const after = voyage.state.carouselSession;
  if (voyage.state.phase !== "carousel" || !before || !after || previous.state.round !== voyage.state.round) return null;
  return {
    round: voyage.state.round,
    tick: after.tick,
    finishAtTick: after.finishAtTick,
    boats: after.participants.map(({ playerId, position, targetPosition, moving, claimedChoiceId }) =>
      ({ playerId, position, targetPosition, moving, claimedChoiceId })),
    claims: voyage.state.carouselChoices.filter((choice) => choice.takenByPlayerId).map(({ id, takenByPlayerId, claimedAtTick }) =>
      ({ id, takenByPlayerId, claimedAtTick })),
    events: after.events.filter((event) => event.tick > before.tick),
  };
}

function readVoyageAction(value: unknown): FriendsCommand | null {
  const local = readLocalMatchCommand(value);
  if (local) return local;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { type, choiceId, definitionId, x, y } = value as Record<string, unknown>;
  switch (type) {
    case "CHOOSE_ITEM":
    case "CHOOSE_HARBOR_OFFER":
      return typeof choiceId === "string" ? { type, choiceId } : null;
    case "CHOOSE_VOYAGE_RECRUIT":
      return typeof definitionId === "string" ? { type, definitionId } : null;
    case "CHOOSE_STARTER_RECRUIT":
      return typeof definitionId === "string" || definitionId === null ? { type, definitionId } : null;
    case "CAROUSEL_SET_TARGET":
      return typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y)
        ? { type, x, y } : null;
    default:
      return null;
  }
}

export function readFriendsCommand(value: unknown): { round: number; phase: string; command: FriendsCommand } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { round, phase, command } = value as Record<string, unknown>;
  const action = readVoyageAction(command);
  return typeof round === "number" && Number.isInteger(round) && typeof phase === "string" && action
    ? { round, phase, command: action } : null;
}
