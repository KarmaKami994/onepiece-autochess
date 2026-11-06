import { getStageDefinition } from "../game/content";
import type { GameContent, MatchPhase } from "../game/types";
import { harborDurationSeconds } from "../game/voyageEncounters";

export const PAC_VICTORY_DELAY_MS = 3_000;
export const PAC_RECRUITMENT_DURATION_MS = 23_000;
export type TimedPhase = "preparation" | "battle" | "voyage-choice" | "starter-choice" | "harbor-choice";
export type ClockIdentity = { seed: string; round: number; phase: MatchPhase };
export type PhaseClockCheckpoint = ClockIdentity & {
  phase: TimedPhase;
  durationMs: number;
  remainingMs: number;
  paused: boolean;
};

export function isTimedPhase(phase: MatchPhase | undefined): phase is TimedPhase {
  return phase === "preparation" || phase === "battle" || phase === "voyage-choice" || phase === "starter-choice" || phase === "harbor-choice";
}

export function clockScreen(phase: MatchPhase | undefined): string {
  return phase === "voyage-choice" ? "voyage-recruitment" : phase === "starter-choice" ? "starter-recruitment" : phase === "harbor-choice" ? "harbor" : "match";
}

export function phaseClockBudget(
  phase: MatchPhase | undefined, round: number | undefined,
  battleSeconds: number, speed: number, content: GameContent, alivePlayers = 8,
): { durationMs: number; victoryMs: number } {
  if (!isTimedPhase(phase) || !round) return { durationMs: 0, victoryMs: 0 };
  if (phase === "voyage-choice" || phase === "starter-choice") return { durationMs: content.voyageTiming.recruitmentSeconds * 1_000, victoryMs: 0 };
  if (phase === "harbor-choice") return { durationMs: harborDurationSeconds(alivePlayers, content) * 1_000, victoryMs: 0 };
  const stage = getStageDefinition(round, content);
  if (phase === "preparation") return { durationMs: stage.preparationSeconds * 1_000, victoryMs: 0 };
  const duration = Number.isFinite(battleSeconds) ? Math.max(0, Math.min(stage.battleSeconds, battleSeconds)) : stage.battleSeconds;
  const playbackSpeed = [0.5, 1, 2, 4].includes(speed) ? speed : 1;
  const victoryMs = duration < stage.battleSeconds ? PAC_VICTORY_DELAY_MS : 0;
  return { durationMs: duration * 1_000 / playbackSpeed + victoryMs, victoryMs };
}

export function readPhaseClockCheckpoint(value: unknown, identity: ClockIdentity): PhaseClockCheckpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.seed !== identity.seed || record.round !== identity.round || record.phase !== identity.phase ||
    !isTimedPhase(identity.phase) || typeof record.paused !== "boolean" ||
    typeof record.durationMs !== "number" || !Number.isFinite(record.durationMs) || record.durationMs <= 0 || record.durationMs > 600_000 ||
    typeof record.remainingMs !== "number" || !Number.isFinite(record.remainingMs) || record.remainingMs < 0 || record.remainingMs > record.durationMs) return null;
  return { ...identity, phase: identity.phase, durationMs: record.durationMs, remainingMs: record.remainingMs, paused: record.paused };
}

export function initialClockRemaining(durationMs: number, identity: ClockIdentity, saved: unknown): number {
  const checkpoint = readPhaseClockCheckpoint(saved, identity);
  // Battle checkpoints replay their frozen initial board, not an unseen suffix.
  return identity.phase !== "battle" && checkpoint?.durationMs === durationMs ? checkpoint.remainingMs : durationMs;
}

export function elapseClock(remainingMs: number, elapsedMs: number, paused: boolean): number {
  return Math.max(0, remainingMs - (paused || !Number.isFinite(elapsedMs) ? 0 : Math.max(0, elapsedMs)));
}
