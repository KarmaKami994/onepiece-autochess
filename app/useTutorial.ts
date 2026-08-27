import { useCallback, useState } from "react";
import type { MatchState } from "@/game";

export type TutorialStep =
  | "welcome"
  | "recruit"
  | "deploy"
  | "second"
  | "sail"
  | "await-reward"
  | "treasure"
  | "equip";

const TUTORIAL_KEY = "grand-line-auto-chess.first-voyage.v1";

export function deriveTutorialStep(state: MatchState): TutorialStep | null {
  const player =
    state.players.find((candidate) => !candidate.isBot) ?? state.players[0];
  if (!player) return null;
  if (Object.values(player.units).some((unit) => unit.items.length > 0)) {
    return null;
  }
  if (state.phase === "game-over") return null;
  if (state.phase === "item-choice" || state.phase === "carousel") {
    return "treasure";
  }
  if (state.phase === "battle") return "await-reward";
  if (player.inventory.length > 0) return "equip";
  const deployed = Object.keys(player.board).length;
  const owned = Object.keys(player.units).length;
  if (deployed >= 2) return "sail";
  if (owned >= 2 || deployed >= 1) return "second";
  if (owned >= 1) return "deploy";
  return "recruit";
}

export function useTutorial() {
  const [step, setStep] = useState<TutorialStep | null>(null);
  const hasCompleted = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(TUTORIAL_KEY) === "complete";
    } catch {
      return false;
    }
  }, []);
  const markComplete = useCallback(() => {
    try {
      window.localStorage.setItem(TUTORIAL_KEY, "complete");
    } catch {
      // Tutorial completion is optional local preference data.
    }
  }, []);
  return { step, setStep, hasCompleted, markComplete } as const;
}
