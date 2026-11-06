import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameContent, MatchPhase } from "../game/types";
import { clockScreen, elapseClock, initialClockRemaining, isTimedPhase, phaseClockBudget, type PhaseClockCheckpoint } from "./phaseClock";

type MatchClockOptions = {
  screen: string;
  seed: string;
  phase: MatchPhase | undefined;
  round: number | undefined;
  battleDurationSeconds: number;
  animationSpeed: number;
  replayKey: string;
  tutorialActive: boolean;
  manualPaused: boolean;
  autoContinueBattle: boolean;
  checkpoint: PhaseClockCheckpoint | null;
  alivePlayers: number;
  content: GameContent;
  onExpire: () => void;
};

export function useMatchClock(options: MatchClockOptions) {
  const budget = phaseClockBudget(options.phase, options.round, options.battleDurationSeconds, options.animationSpeed, options.content, options.alivePlayers);
  const identity = `${options.seed}:${options.round}:${options.phase}`;
  const replay = options.phase === "battle" ? options.replayKey : "";
  const key = `${identity}:${replay}:${budget.durationMs}`;
  const currentKey = useRef(key);
  const latest = useRef(options);
  useLayoutEffect(() => {
    currentKey.current = key;
    latest.current = options;
  }, [key, options]);
  const live = useRef({ key: "", durationMs: 0, remainingMs: 0, expired: false });
  const [display, setDisplay] = useState({ key: "", remainingMs: 0, hidden: false });

  useEffect(() => {
    const phase = options.phase;
    const durationMs = budget.durationMs;
    live.current = {
      key, durationMs, expired: false,
      remainingMs: isTimedPhase(phase)
        ? initialClockRemaining(durationMs, { seed: options.seed, round: options.round ?? 1, phase }, options.checkpoint)
        : 0,
    };
    let previous = performance.now();
    let expiry = 0;
    const paused = () => {
      const current = latest.current;
      const expectedScreen = clockScreen(current.phase);
      return document.hidden || current.screen !== expectedScreen || current.manualPaused ||
        ((current.phase === "preparation" || current.phase === "starter-choice") && current.tutorialActive);
    };
    const publish = () => setDisplay(current => {
      const remainingMs = live.current.remainingMs;
      return current.key === key && current.hidden === document.hidden && Math.ceil(current.remainingMs / 1_000) === Math.ceil(remainingMs / 1_000)
        ? current : { key, remainingMs, hidden: document.hidden };
    });
    const update = () => {
      const now = performance.now();
      live.current.remainingMs = elapseClock(live.current.remainingMs, now - previous, paused());
      previous = now;
      publish();
      const current = latest.current;
      if (!paused() && !live.current.expired && !expiry && durationMs > 0 && live.current.remainingMs === 0 &&
        (current.phase !== "battle" || current.autoContinueBattle)) {
        expiry = window.setTimeout(() => {
          expiry = 0;
          if (currentKey.current !== key || live.current.key !== key || paused() || live.current.expired ||
            (latest.current.phase === "battle" && !latest.current.autoContinueBattle)) return;
          live.current.expired = true;
          latest.current.onExpire();
        }, 0);
      }
    };
    const visibility = () => { previous = performance.now(); publish(); };
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 100);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(initial); window.clearTimeout(expiry); window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [key, budget.durationMs, options.checkpoint, options.phase, options.round, options.seed]);

  const checkpoint = useCallback((): PhaseClockCheckpoint | null => {
    const current = latest.current;
    if (!isTimedPhase(current.phase) || live.current.key !== currentKey.current || live.current.durationMs <= 0) return null;
    return { seed: current.seed, round: current.round ?? 1, phase: current.phase,
      durationMs: live.current.durationMs, remainingMs: live.current.remainingMs, paused: current.manualPaused };
  }, []);
  const expectedScreen = clockScreen(options.phase);
  const paused = display.hidden || options.screen !== expectedScreen || options.manualPaused ||
    ((options.phase === "preparation" || options.phase === "starter-choice") && options.tutorialActive);
  const remainingMs = display.key === key ? display.remainingMs : budget.durationMs;
  const timer = Math.ceil(remainingMs / 1_000);
  const label = (options.phase === "preparation" || options.phase === "starter-choice") && options.tutorialActive ? "LESSON PAUSED" : paused ? "PAUSED" :
    options.phase === "battle" && timer === 0 && !options.autoContinueBattle ? "CONTINUE" :
      options.phase === "battle" && budget.victoryMs > 0 && remainingMs <= budget.victoryMs ? "ROUND COMPLETE" :
        options.phase === "starter-choice" ? "FIRST CREW" : options.phase === "harbor-choice" ? "HARBOR" : options.phase === "voyage-choice" ? "RECRUITMENT" : options.phase === "battle" ? "BATTLE" : "PREPARE";
  return { timer, phaseDuration: Math.ceil(budget.durationMs / 1_000), paused, label, checkpoint } as const;
}
