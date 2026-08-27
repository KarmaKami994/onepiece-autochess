import { useEffect, useMemo, useState } from "react";
import { getStageDefinition } from "@/game";
import type { GameContent, MatchPhase } from "@/game";

type MatchClockOptions = {
  screen: string;
  phase: MatchPhase | undefined;
  round: number | undefined;
  battleDurationSeconds: number;
  animationSpeed: number;
  tutorialActive: boolean;
  content: GameContent;
  onExpire: () => void;
};

export function useMatchClock(options: MatchClockOptions) {
  const duration = useMemo(() => {
    if (!options.phase || !options.round) return 30;
    const stage = getStageDefinition(options.round, options.content);
    return options.phase === "battle"
      ? Math.min(
          stage.battleSeconds,
          Math.max(
            1,
            Math.ceil(
              options.battleDurationSeconds / Math.max(0.5, options.animationSpeed),
            ),
          ),
        )
      : stage.preparationSeconds;
  }, [
    options.animationSpeed,
    options.battleDurationSeconds,
    options.content,
    options.phase,
    options.round,
  ]);
  const [timer, setTimer] = useState(duration);
  const [phaseDuration, setPhaseDuration] = useState(duration);

  useEffect(() => {
    const reset = window.setTimeout(() => {
      setTimer(duration);
      setPhaseDuration(duration);
    }, 0);
    return () => window.clearTimeout(reset);
  }, [duration, options.screen]);

  useEffect(() => {
    if (
      options.screen !== "match" ||
      !options.phase ||
      (options.phase === "preparation" && options.tutorialActive) ||
      (options.phase !== "preparation" && options.phase !== "battle")
    ) {
      return;
    }
    const interval = window.setInterval(() => {
      setTimer((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(interval);
          window.setTimeout(options.onExpire, 0);
          return 0;
        }
        return remaining - 1;
      });
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [
    options.onExpire,
    options.phase,
    options.screen,
    options.tutorialActive,
  ]);

  return { timer, phaseDuration } as const;
}
