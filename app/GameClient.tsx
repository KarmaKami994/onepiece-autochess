"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as GameEngine from "@/game";
import type {
  BoardMove,
} from "@/components/PhaserBoard";
import AnimationLab from "@/components/AnimationLab";
import MainMenu, { type MenuMultiplayer } from "./screens/MainMenu";
import CrewToolsScreen from "./screens/CrewToolsScreen";
import ChronicleScreen from "./screens/ChronicleScreen";
import { useChronicleRecorder } from "./useChronicleRecorder";
import type { ReferenceCategory } from "./crewReference";
import {
  resolvePurchaseSelection,
  retainValidBoardSelection,
} from "@/components/boardSelection";
import type {
  GameCommand,
  MatchState,
} from "@/game";
import {
  createVoyageSaveEnvelope,
  deleteVoyage,
  readVoyage,
  restoreVoyageState,
  writeVoyage,
} from "./voyagePersistence";
import { useGameAudio, type SoundName } from "./useGameAudio";
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadStoredSettings } from "./gameSettings";
import { useLocalGameSession } from "./useLocalGameSession";
import { useMatchClock } from "./useMatchClock";
import { isTimedPhase, readPhaseClockCheckpoint, type PhaseClockCheckpoint } from "./phaseClock";
import {
  deriveTutorialStep,
  useTutorial,
  type TutorialStep,
} from "./useTutorial";
import {
  selectBattlePresentation,
  selectCarouselView,
  selectMatchView,
  type MatchView,
} from "./selectors";
import {
  ActionToast,
  CarouselScreen,
  ConfirmNewVoyageScreen,
  MatchScreen,
  ResultsScreen,
  RewardScreen,
  VoyageRecruitmentScreen,
  HarborScreen,
  SettingsScreen,
  TutorialCoach,
  type Settings,
  type ToastView,
} from "./screens/GameScreens";
import {
  clearDiagnostics,
  exportDiagnostics,
  recordDiagnostic,
} from "./diagnostics";
import "./game.css";

type Screen =
  | "menu"
  | "animation-lab"
  | "crew-tools"
  | "chronicle"
  | "settings"
  | "match"
  | "carousel"
  | "reward"
  | "voyage-recruitment"
  | "starter-recruitment"
  | "harbor"
  | "results"
  | "confirm-new";

const engine = GameEngine;
const content = engine.CONTENT;

function persistentUnitId(view: MatchView, presentationId: string): string {
  const battlePrefix = `${view.playerId}:`;
  return view.phase === "battle" && presentationId.startsWith(battlePrefix)
    ? presentationId.slice(battlePrefix.length)
    : presentationId;
}

export default function GameClient({ multiplayer }: { multiplayer?: MenuMultiplayer }) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [codexReference, setCodexReference] = useState<{ category: ReferenceCategory; query: string }>();
  const { observe: recordChronicle, flush: flushChronicle, error: chronicleError } = useChronicleRecorder(content);
  const settingsReadyRef = useRef(false);
  const {
    state: engineState,
    stateRef: engineStateRef,
    setState: setLocalState,
    dispatch: dispatchLocalCommand,
    clear: clearLocalSession,
  } = useLocalGameSession(content);
  const [seed, setSeed] = useState("");
  const [hasSave, setHasSave] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [saveDate, setSaveDate] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [scoutedPlayerId, setScoutedPlayerId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastView | null>(null);
  const toastIdRef = useRef(0);
  const {
    step: tutorialStep,
    setStep: setTutorialStep,
    hasCompleted: hasCompletedFirstVoyage,
    markComplete: saveFirstVoyageCompletion,
  } = useTutorial();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const [pacingPaused, setPacingPaused] = useState(false);
  const [restoredClock, setRestoredClock] = useState<PhaseClockCheckpoint | null>(null);
  const clockCheckpointRef = useRef<() => PhaseClockCheckpoint | null>(() => null);
  const lastCarouselCheckpointRef = useRef(0);
  const playSound = useGameAudio(settings);
  const [stableMatchView, setStableMatchView] = useState<MatchView | null>(null);
  const view = useMemo(() => {
    if (!engineState) return null;
    const base = stableMatchView ?? selectMatchView(engineState);
    if (engineState.phase !== "carousel") return base;
    return {
      ...base,
      ...selectCarouselView(engineState, content),
    } satisfies MatchView;
  }, [engineState, stableMatchView]);
  const scoutedStanding = useMemo(
    () =>
      scoutedPlayerId && view
        ? view.standings.find(
            (standing) =>
              standing.id === scoutedPlayerId && !standing.isHuman,
          ) ?? null
        : null,
    [scoutedPlayerId, view],
  );
  const battlePresentation = useMemo(
    () =>
      engineState && view?.phase === "battle"
        ? selectBattlePresentation(
            engineState,
            scoutedPlayerId ?? view.playerId,
            content,
          )
        : null,
    [engineState, scoutedPlayerId, view],
  );
  const activePhase = view?.phase;
  const activeRound = view?.round;
  const activeBattleDuration = engineState?.phase === "battle"
    ? Math.max(0, ...engineState.lastResults.map(result => result.durationTicks * content.config.combatTickMs / 1_000))
    : 45;

  const returnFromScouting = useCallback(() => {
    setScoutedPlayerId(null);
    setSelectedUnitId(null);
  }, []);

  useEffect(() => {
    if (!scoutedPlayerId || !view) return;
    const captain = view.standings.find(
      (standing) => standing.id === scoutedPlayerId,
    );
    if (
      tutorialStep === null &&
      (view.phase === "preparation" || view.phase === "battle") &&
      captain?.alive
    ) return;
    const returnTimer = window.setTimeout(returnFromScouting, 0);
    return () => window.clearTimeout(returnTimer);
  }, [returnFromScouting, scoutedPlayerId, tutorialStep, view]);

  const showToast = useCallback(
    (
      kind: ToastView["kind"],
      title: string,
      message: string,
    ) => {
      toastIdRef.current += 1;
      setToast({ id: toastIdRef.current, kind, title, message });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const toastTimer = window.setTimeout(() => setToast(null), 3_600);
    return () => window.clearTimeout(toastTimer);
  }, [toast]);

  const setEngineState = useCallback((next: MatchState, fresh = false) => {
    recordChronicle(next, fresh);
    engineStateRef.current = next;
    const nextPhase = next.phase;
    const nextView = nextPhase === "carousel" ? null : selectMatchView(next);
    if (nextView) {
      setStableMatchView(nextView);
    } else {
      setStableMatchView((current) => current ?? selectMatchView(next));
    }
    if (nextPhase === "carousel") {
      setSelectedUnitId(null);
    } else {
      const nextUnits = nextView?.boardUnits ?? [];
      setSelectedUnitId((current) =>
        retainValidBoardSelection(current, nextUnits),
      );
    }
    setLocalState(next);
  }, [engineStateRef, setLocalState, recordChronicle]);

  useEffect(() => {
    const settingsTimer = window.setTimeout(() => {
      settingsReadyRef.current = true;
      setSettings(loadStoredSettings());
    }, 0);
    void readVoyage()
      .then((saved) => {
        setHasSave(Boolean(saved?.state));
        setSaveDate(saved?.updatedAt ?? null);
      })
      .catch(() => {
        setHasSave(false);
      })
      .finally(() => setSaveReady(true));
    return () => window.clearTimeout(settingsTimer);
  }, []);

  useEffect(() => {
    if (!settingsReadyRef.current) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // The game remains playable if preference storage is blocked.
    }
  }, [settings]);

  useEffect(() => {
    if (!engineState || !seed) return;
    const isCarousel = engineState.phase === "carousel";
    const delay = isCarousel
      ? Math.max(0, 250 - (Date.now() - lastCarouselCheckpointRef.current))
      : 250;
    const saveTimer = window.setTimeout(() => {
      if (isCarousel) lastCarouselCheckpointRef.current = Date.now();
      setSaveStatus("saving");
      const updatedAt = Date.now();
      const envelope = createVoyageSaveEnvelope(engineState, seed, updatedAt, clockCheckpointRef.current());
      saveWriteChainRef.current = saveWriteChainRef.current
        .catch(() => undefined)
        .then(() => writeVoyage(envelope));
      void saveWriteChainRef.current
        .then(() => {
          setHasSave(true);
          setSaveDate(updatedAt);
          setSaveStatus("saved");
          window.setTimeout(() => setSaveStatus("idle"), 1200);
        })
        .catch(() => {
          setSaveStatus("idle");
        });
    }, delay);
    return () => window.clearTimeout(saveTimer);
  }, [engineState, seed, screen, pacingPaused]);

  useEffect(() => {
    const checkpointActivePhase = () => {
      const current = engineStateRef.current;
      if (
        !current ||
        !seed ||
        (!isTimedPhase(current.phase) && current.phase !== "carousel")
      ) {
        return;
      }
      const updatedAt = Date.now();
      const envelope = createVoyageSaveEnvelope(current, seed, updatedAt, clockCheckpointRef.current());
      const checkpointWrite = writeVoyage(envelope);
      saveWriteChainRef.current = Promise.all([
        saveWriteChainRef.current.catch(() => undefined),
        checkpointWrite,
      ]).then(() => undefined);
    };
    const onVisibilityChange = () => {
      if (document.hidden) checkpointActivePhase();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", checkpointActivePhase);
    const checkpointTimer = window.setInterval(() => {
      if (!document.hidden && ["match", "carousel", "voyage-recruitment", "starter-recruitment", "harbor"].includes(screen)) checkpointActivePhase();
    }, 5_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", checkpointActivePhase);
      window.clearInterval(checkpointTimer);
    };
  }, [engineStateRef, seed, screen]);

  useEffect(() => {
    if (!view || screen === "settings" || screen === "animation-lab" || screen === "crew-tools" || screen === "chronicle") return;
    const syncScreen = window.setTimeout(() => {
      if (view.phase === "game-over" || !view.alive) {
        setScreen("results");
        return;
      }
      if (view.phase === "starter-choice") { setScreen("starter-recruitment"); return; }
      if (view.phase === "harbor-choice") { setScreen("harbor"); return; }
      if (view.phase === "item-choice") {
        if (screen !== "reward") {
          setScreen("reward");
          playSound("reward");
        }
        return;
      }
      if (view.phase === "voyage-choice") {
        if (screen !== "voyage-recruitment") setScreen("voyage-recruitment");
        return;
      }
      if (view.phase === "carousel") {
        if (screen !== "carousel") {
          setScreen("carousel");
        }
        return;
      }
      if (screen === "reward" || screen === "voyage-recruitment" || screen === "starter-recruitment" || screen === "harbor" || screen === "carousel" || screen === "results") {
        setScreen("match");
      }
    }, 0);
    return () => window.clearTimeout(syncScreen);
  }, [view?.phase, screen, view, playSound]);

  const issueCommand = useCallback(
    (
      command: GameCommand,
      successSound: SoundName | null = "click",
    ) => {
      const current = engineStateRef.current;
      if (!current) {
        showToast(
          "error",
          "ORDER NOT READY",
          "The rules engine is still preparing this order.",
        );
        playSound("error");
        return false;
      }
      try {
        const outcome = dispatchLocalCommand(command);
        if (!outcome) return false;
        if (!outcome.ok) {
          showToast(
            "error",
            "ORDER REJECTED",
            outcome.error.message,
          );
          playSound("error");
          return false;
        }
        setEngineState(outcome.state);
        if (successSound) playSound(successSound);
        return true;
      } catch (error) {
        recordDiagnostic(error, {
          screen,
          phase: engineStateRef.current?.phase,
          round: engineStateRef.current?.round,
          operation: `command:${command.type}`,
        });
        showToast(
          "error",
          "ORDER REJECTED",
          "That order was rejected by the crew.",
        );
        playSound("error");
        return false;
      }
    },
    [
      dispatchLocalCommand,
      engineStateRef,
      playSound,
      screen,
      setEngineState,
      showToast,
    ],
  );

  const scoutPlayer = useCallback(
    (playerId: string | null) => {
      if (
        !view ||
        (view.phase !== "preparation" && view.phase !== "battle") ||
        tutorialStep !== null
      ) {
        return;
      }
      if (!playerId || playerId === view.playerId) {
        returnFromScouting();
        return;
      }
      const captain = view.standings.find(
        (standing) => standing.id === playerId,
      );
      if (!captain?.alive || captain.isHuman) return;
      setSelectedUnitId(null);
      setScoutedPlayerId(captain.id);
      playSound("click");
    },
    [playSound, returnFromScouting, tutorialStep, view],
  );

  const advancePhase = useCallback(() => {
    if (isAdvancing || !engineStateRef.current) {
      return;
    }
    setIsAdvancing(true);
    let next = engineStateRef.current;
    const currentPhase = next.phase;
    const humanId =
      next.players.find((player) => !player.isBot)?.id ?? next.players[0]?.id;
    const resolvedOutcome =
      currentPhase === "battle" ? view?.battleOutcome ?? null : null;

    if (
      (currentPhase === "preparation" || currentPhase === "battle") &&
      scoutedPlayerId
    ) {
      returnFromScouting();
    }

    try {
      if (currentPhase === "preparation" && humanId) {
        const ready = engine.applyCommand(
          next,
          { type: "END_PREPARATION" },
          { actorPlayerId: humanId },
          content,
        );
        if (ready.ok) next = ready.state;
      }

      if (
        next.phase === currentPhase ||
        currentPhase === "battle"
      ) {
        next = engine.advanceMatchPhase(next, content);
      }

      setEngineState(next);
      if (next.phase !== currentPhase) setPacingPaused(false);
      if (resolvedOutcome) {
        const remaining = resolvedOutcome.survivorHpPercent ?? 0;
        showToast(
          resolvedOutcome.outcome === "win"
            ? "success"
            : resolvedOutcome.outcome === "loss"
              ? "error"
              : "info",
          resolvedOutcome.outcomeLabel,
          resolvedOutcome.outcome === "win"
            ? `${resolvedOutcome.opponentName} defeated · ${remaining}% crew health remained.`
            : resolvedOutcome.outcome === "loss"
              ? `${resolvedOutcome.opponentName} dealt ${resolvedOutcome.captainDamage} Captain damage · ${remaining}% enemy health remained.`
              : `${resolvedOutcome.opponentName} held the line · no Captain damage.`,
        );
      }
      playSound(currentPhase === "preparation" ? "battle" : "click");
    } catch (error) {
      recordDiagnostic(error, {
        screen,
        phase: currentPhase,
        round: next.round,
        operation: "advance-phase",
      });
      showToast(
        "error",
        "ROUGH SEAS",
        "Try ending the phase again.",
      );
      playSound("error");
    } finally {
      setIsAdvancing(false);
    }
  }, [
    isAdvancing,
    engineStateRef,
    playSound,
    returnFromScouting,
    scoutedPlayerId,
    screen,
    setEngineState,
    showToast,
    view,
  ]);

  const advanceRef = useRef(advancePhase);
  useEffect(() => {
    advanceRef.current = advancePhase;
  }, [advancePhase]);
  const expireCurrentPhase = useCallback(() => {
    const current = engineStateRef.current;
    if (current && current.phase === activePhase && current.round === activeRound) {
      advanceRef.current();
    }
  }, [activePhase, activeRound, engineStateRef]);
  const { timer, phaseDuration, paused: clockPaused, label: clockLabel, checkpoint: clockCheckpoint } = useMatchClock({
    screen,
    seed,
    phase: engineState?.phase,
    round: activeRound,
    battleDurationSeconds: activeBattleDuration,
    animationSpeed: settings.animationSpeed,
    replayKey: `${settings.animationSpeed}:${settings.particles}:${settings.combatNumbers}:${settings.reducedMotion}`,
    tutorialActive: tutorialStep !== null,
    manualPaused: pacingPaused,
    autoContinueBattle: settings.autoContinueBattle,
    checkpoint: restoredClock,
    alivePlayers: engineState?.players.filter(player => player.alive).length ?? 8,
    content,
    onExpire: expireCurrentPhase,
  });
  useEffect(() => { clockCheckpointRef.current = clockCheckpoint; }, [clockCheckpoint]);

  const startVoyage = useCallback(() => {
    const freshSeed = `grand-line-${Date.now().toString(36)}`;
    try {
      const next = engine.createVoyage(freshSeed, content);
      setRestoredClock(null);
      setPacingPaused(false);
      setSeed(freshSeed);
      setEngineState(next, true);
      setSelectedUnitId(null);
      setScoutedPlayerId(null);
      setScreen("starter-recruitment");
      setTutorialStep(
        hasCompletedFirstVoyage() ? null : "welcome",
      );
      playSound("reward");
    } catch (error) {
      recordDiagnostic(error, {
        screen,
        operation: "create-match",
      });
      showToast(
        "error",
        "LOG POSE FAILED",
        "A new voyage could not be charted.",
      );
      playSound("error");
    }
  }, [
    hasCompletedFirstVoyage,
    playSound,
    screen,
    setEngineState,
    setTutorialStep,
    showToast,
  ]);

  const requestNewVoyage = useCallback(() => {
    if (hasSave) {
      setScreen("confirm-new");
      playSound("click");
      return;
    }
    startVoyage();
  }, [hasSave, playSound, startVoyage]);

  const replaceVoyage = useCallback(() => {
    // Keep the old log recoverable until the new state has been created and
    // the normal autosave successfully overwrites the active voyage.
    startVoyage();
  }, [startVoyage]);

  const continueVoyage = useCallback(() => {
    void readVoyage()
      .then((saved) => {
        if (!saved?.state) {
          setHasSave(false);
          showToast(
            "error",
            "NO SHIP'S LOG",
            "No saved voyage was found.",
          );
          playSound("error");
          return;
        }
        const restored = restoreVoyageState(saved, content);
        const savedClock = readPhaseClockCheckpoint(saved.phaseClock, restored);
        setRestoredClock(savedClock);
        setPacingPaused(savedClock?.paused ?? false);
        setSeed(saved.seed);
        setEngineState(restored);
        setScoutedPlayerId(null);
        if (hasCompletedFirstVoyage()) {
          setTutorialStep(null);
        } else {
          const restoredStep = deriveTutorialStep(restored);
          if (restoredStep === null) {
            saveFirstVoyageCompletion();
          }
          setTutorialStep(restoredStep);
        }
        setScreen("match");
        playSound("click");
      })
      .catch(() => {
        showToast(
          "error",
          "LOG UNAVAILABLE",
          "The ship's log could not be opened.",
        );
        playSound("error");
      });
  }, [
    hasCompletedFirstVoyage,
    playSound,
    saveFirstVoyageCompletion,
    setEngineState,
    setTutorialStep,
    showToast,
  ]);

  const leaveVoyage = useCallback(() => {
    clearLocalSession();
    setStableMatchView(null);
    setSeed("");
    setScreen("menu");
    setSelectedUnitId(null);
    setScoutedPlayerId(null);
    setTutorialStep(null);
  }, [clearLocalSession, setTutorialStep]);

  const buyUnit = useCallback(
    (shopIndex: number) => {
      const economyPhase =
        view?.phase === "preparation" ||
        (view?.phase === "battle" && tutorialStep === null);
      if (!view || !economyPhase) return;
      if (
        tutorialStep &&
        tutorialStep !== "recruit" &&
        tutorialStep !== "second"
      ) {
        showToast(
          "info",
          "FOLLOW THE GUIDE",
          "Complete the highlighted lesson before recruiting again.",
        );
        return;
      }
      if (
        tutorialStep === "second" &&
        view.boardUnits.filter((unit) => unit.team === "player").length >= 2
      ) {
        showToast(
          "info",
          "DEPLOY YOUR RECRUIT",
          "Move the new crew member from the bench onto the deck.",
        );
        return;
      }
      const recruit = view.shop[shopIndex];
      if (!recruit || recruit.disabledReason) return;
      const beforeUnits = view.boardUnits;
      const accepted = issueCommand(
        { type: "BUY_UNIT", shopIndex },
        "coin",
      );
      if (!accepted || !engineStateRef.current) return;
      const nextView = selectMatchView(engineStateRef.current);
      setSelectedUnitId(
        resolvePurchaseSelection(
          beforeUnits,
          nextView.boardUnits,
          recruit.id,
        ),
      );
    },
    [engineStateRef, issueCommand, showToast, tutorialStep, view],
  );

  const moveUnit = useCallback(
    (move: BoardMove) => {
      if (scoutedPlayerId) return false;
      if (!view) return false;
      const unit = view.boardUnits.find(
        (candidate) => candidate.id === move.unitId,
      );
      const canMove =
        view.phase === "preparation" ||
        (view.phase === "battle" &&
          tutorialStep === null &&
          unit?.zone === "bench" &&
          move.zone === "bench");
      if (!canMove) return false;
      return issueCommand(
        {
          type: "MOVE_UNIT",
          unitId: persistentUnitId(view, move.unitId),
          to:
            move.zone === "bench"
              ? { kind: "bench", index: move.slot ?? 0 }
              : {
                  kind: "board",
                  x: move.x ?? 0,
                  y: move.y ?? 3,
                },
        },
      );
    },
    [issueCommand, scoutedPlayerId, tutorialStep, view],
  );

  const sellUnit = useCallback((unitId: string) => {
    if (!view || scoutedPlayerId || tutorialStep !== null) return false;
    const unit = view.boardUnits.find(candidate => candidate.id === unitId && candidate.team === "player");
    if (!unit || (view.phase !== "preparation" && !(view.phase === "battle" && unit.zone === "bench"))) return false;
    const sold = issueCommand(
      { type: "SELL_UNIT", unitId: persistentUnitId(view, unitId) },
      "coin",
    );
    if (sold) setSelectedUnitId(current => current === unitId ? null : current);
    return sold;
  }, [issueCommand, scoutedPlayerId, tutorialStep, view]);

  const chooseReward = useCallback(
    (choiceId: string) => {
      if (!view || view.phase !== "item-choice") return;
      if (
        issueCommand(
          { type: "CHOOSE_ITEM", choiceId },
          "reward",
        )
      ) {
        const current = engineStateRef.current;
        if (current?.phase === view.phase) {
          try {
            setEngineState(engine.advanceMatchPhase(current, content));
          } catch (error) {
            recordDiagnostic(error, {
              screen,
              phase: current.phase,
              round: current.round,
              operation: "resolve-item-choice",
            });
            // Some engines advance as part of the choice command.
          }
        }
      }
    },
    [engineStateRef, issueCommand, screen, setEngineState, view],
  );

  const chooseVoyageRecruit = useCallback((definitionId: string) => {
    if (!view || view.phase !== "voyage-choice") return;
    setPacingPaused(false);
    issueCommand(
      { type: "CHOOSE_VOYAGE_RECRUIT", definitionId },
      "reward",
    );
  }, [issueCommand, view]);

  const chooseStarter = useCallback((definitionId: string | null) => {
    if (tutorialStep !== null && tutorialStep !== "recruit") return;
    if (!issueCommand({ type: "CHOOSE_STARTER_RECRUIT", definitionId }, "reward")) return;
    setPacingPaused(false);
    const player = engineStateRef.current?.players.find(candidate => !candidate.isBot);
    const unit = Object.values(player?.units ?? {}).filter(candidate => candidate.definitionId === definitionId)
      .sort((left, right) => right.acquiredOrder - left.acquiredOrder)[0];
    setSelectedUnitId(unit?.id ?? null);
  }, [engineStateRef, issueCommand, tutorialStep]);

  const chooseHarbor = useCallback((choiceId: string) => {
    if (issueCommand({ type: "CHOOSE_HARBOR_OFFER", choiceId }, "reward")) setPacingPaused(false);
  }, [issueCommand]);

  const setCarouselTarget = useCallback(
    (target: { x: number; y: number }) => {
      if (!view || view.phase !== "carousel") return;
      const participant = view.carouselSession?.participants.find(
        (candidate) => candidate.playerId === view.playerId,
      );
      if (
        !participant ||
        (view.carouselSession?.tick ?? 0) < participant.releaseTick ||
        participant.claimedChoiceId
      ) {
        return;
      }
      issueCommand(
        {
          type: "CAROUSEL_SET_TARGET",
          x: target.x,
          y: target.y,
        },
        null,
      );
    },
    [issueCommand, view],
  );

  const autoResolveCarousel = useCallback(() => {
    const current = engineStateRef.current;
    if (!current || current.phase !== "carousel") return;
    issueCommand(
      { type: "TIMER_EXPIRED" },
      "reward",
    );
  }, [engineStateRef, issueCommand]);

  useEffect(() => {
    if (screen !== "carousel" || activePhase !== "carousel") {
      return;
    }
    let animationFrame = 0;
    let previousTime = performance.now();
    let accumulator = 0;
    const runFrame = (time: number) => {
      if (document.hidden) {
        previousTime = time;
        accumulator = 0;
        animationFrame = window.requestAnimationFrame(runFrame);
        return;
      }
      accumulator += Math.min(250, Math.max(0, time - previousTime));
      previousTime = time;
      const ticks = Math.min(5, Math.floor(accumulator / 50));
      if (ticks > 0) {
        accumulator -= ticks * 50;
        const current = engineStateRef.current;
        if (current?.phase === "carousel") {
          try {
            setEngineState(engine.advanceCarousel(current, ticks, content));
          } catch (error) {
            recordDiagnostic(error, {
              screen,
              phase: current.phase,
              round: current.round,
              operation: "advance-carousel",
            });
            autoResolveCarousel();
            return;
          }
        }
      }
      animationFrame = window.requestAnimationFrame(runFrame);
    };
    animationFrame = window.requestAnimationFrame(runFrame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activePhase,
    autoResolveCarousel,
    engineStateRef,
    screen,
    setEngineState,
  ]);

  const playedCarouselEventsRef = useRef(new Set<string>());
  useEffect(() => {
    const session = view?.carouselSession;
    if (!session || view.phase !== "carousel") {
      playedCarouselEventsRef.current.clear();
      return;
    }
    for (const event of session.events) {
      if (playedCarouselEventsRef.current.has(event.id)) continue;
      playedCarouselEventsRef.current.add(event.id);
      if (event.type === "release" && event.playerId === view.playerId) {
        playSound("unlock");
      } else if (event.type === "claim") {
        playSound(event.playerId === view.playerId ? "reward" : "splash");
      } else if (event.type === "collision") {
        playSound("splash");
      }
    }
  }, [playSound, view]);

  const openSettings = useCallback(
    (from: Screen) => {
      setReturnScreen(from);
      setScreen("settings");
      playSound("click");
    },
    [playSound],
  );

  const closeSettings = useCallback(() => {
    setScreen(returnScreen);
  }, [returnScreen]);

  const exportLocalDiagnostics = useCallback(() => {
    exportDiagnostics();
    showToast("info", "DIAGNOSTICS EXPORTED", "A local JSON report was downloaded.");
  }, [showToast]);

  const clearLocalDiagnostics = useCallback(() => {
    clearDiagnostics();
    showToast("info", "DIAGNOSTICS CLEARED", "The local error buffer is empty.");
  }, [showToast]);

  const restartTutorial = useCallback(() => {
    setTutorialStep("welcome");
    showToast(
      "info",
      "FIRST VOYAGE GUIDE",
      "The preparation clock pauses while each lesson is open.",
    );
    closeSettings();
  }, [closeSettings, setTutorialStep, showToast]);

  const skipTutorial = useCallback(() => {
    saveFirstVoyageCompletion();
    setTutorialStep(null);
    showToast(
      "info",
      "GUIDE SKIPPED",
      "You can reopen it from Settings at any time.",
    );
  }, [saveFirstVoyageCompletion, setTutorialStep, showToast]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (tutorialStep === "welcome") return;
        if (screen === "settings") closeSettings();
        else if (screen === "confirm-new") setScreen("menu");
        else if (screen === "animation-lab" || screen === "crew-tools" || screen === "chronicle") setScreen("menu");
        else if (screen === "match" && scoutedPlayerId) {
          returnFromScouting();
        }
        else if (screen === "match") openSettings("match");
        else if (screen === "carousel") openSettings("carousel");
        else if (screen === "voyage-recruitment") openSettings("voyage-recruitment");
        else if (screen === "starter-recruitment") openSettings("starter-recruitment");
        else if (screen === "harbor") openSettings("harbor");
        return;
      }
      const key = event.key.toLowerCase();
      if (screen === "carousel") return;
      if (screen === "reward" && view) {
        if (/^[1-8]$/.test(key)) {
          const choice = view.choices[Number(key) - 1];
          if (choice) {
            event.preventDefault();
            chooseReward(choice.id);
          }
        }
        return;
      }
      if ((screen === "voyage-recruitment" || screen === "starter-recruitment") && view) {
        if (/^[1-3]$/.test(key)) {
          const recruit = view.voyageRecruits[Number(key) - 1];
          if (recruit) {
            event.preventDefault();
            if (screen === "starter-recruitment") chooseStarter(recruit.id); else chooseVoyageRecruit(recruit.id);
          }
        }
        return;
      }
      if (screen === "harbor" && view) {
        if (/^[1-3]$/.test(key)) {
          const offer = view.harbor?.offers[Number(key) - 1];
          if (offer && !offer.disabled) { event.preventDefault(); chooseHarbor(offer.id); }
        }
        return;
      }
      if (screen !== "match" || !view) return;
      if (key === "enter") {
        const mayStartTutorialBattle =
          tutorialStep === "sail" && view.deployed >= 2;
        if (
          view.phase === "battle" ||
          (view.phase === "preparation" &&
            (tutorialStep === null || mayStartTutorialBattle))
        ) {
          event.preventDefault();
          advanceRef.current();
        }
        return;
      }
      if (view.phase !== "preparation" && view.phase !== "battle") return;
      if (key === "s") {
        if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && selectedUnitId && sellUnit(selectedUnitId)) {
          event.preventDefault();
        }
        return;
      }
      if (tutorialStep && ["r", "l", "x"].includes(key)) {
        event.preventDefault();
        showToast(
          "info",
          "FOLLOW THE GUIDE",
          "Economy controls unlock after the first-voyage lesson.",
        );
        return;
      }
      if (/^[1-6]$/.test(key)) {
        event.preventDefault();
        buyUnit(Number(key) - 1);
      } else if (key === "r") {
        event.preventDefault();
        issueCommand(
          {
            type: "REROLL_SHOP",
          },
          "coin",
        );
      } else if (key === "l") {
        event.preventDefault();
        issueCommand(
          {
            type: "TOGGLE_SHOP_LOCK",
          },
          "click",
        );
      } else if (key === "x") {
        event.preventDefault();
        issueCommand(
          { type: "BUY_XP" },
          "coin",
        );
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    buyUnit,
    chooseReward,
    chooseVoyageRecruit,
    chooseStarter,
    chooseHarbor,
    closeSettings,
    issueCommand,
    openSettings,
    returnFromScouting,
    scoutedPlayerId,
    screen,
    selectedUnitId,
    sellUnit,
    showToast,
    tutorialStep,
    view,
  ]);

  const displayedBoardUnits =
    view?.phase === "battle"
      ? battlePresentation?.boardUnits ?? view.boardUnits
      : scoutedStanding?.boardUnits ?? view?.boardUnits ?? [];
  const displayedDefinitions =
    view?.phase === "battle"
      ? battlePresentation?.selectedDefinitionByUnit ??
        view.selectedDefinitionByUnit
      : scoutedStanding?.selectedDefinitionByUnit ??
        view?.selectedDefinitionByUnit;
  const selectedUnit = displayedBoardUnits.find(
    (unit) => unit.id === selectedUnitId,
  );
  const selectedDefinition =
    selectedUnitId && displayedDefinitions
      ? displayedDefinitions.get(selectedUnitId)
      : undefined;
  const tutorialCrewCount =
    view?.boardUnits.filter((unit) => unit.team === "player").length ?? 0;
  const tutorialEquippedCount =
    view?.boardUnits
      .filter((unit) => unit.team === "player")
      .reduce((total, unit) => total + unit.items.length, 0) ?? 0;

  useEffect(() => {
    if (!tutorialStep || !view) return;
    let nextStep: TutorialStep | "complete" | null = null;
    if (tutorialStep === "recruit" && tutorialCrewCount >= 1) {
      nextStep = "deploy";
    } else if (tutorialStep === "deploy" && view.deployed >= 1) {
      nextStep = "second";
    } else if (
      tutorialStep === "second" &&
      tutorialCrewCount >= 2 &&
      view.deployed >= 2
    ) {
      nextStep = "sail";
    } else if (
      tutorialStep === "sail" &&
      view.phase === "preparation" &&
      view.deployed < 2
    ) {
      nextStep = "second";
    } else if (tutorialStep === "sail" && view.phase === "battle") {
      nextStep = "await-reward";
    } else if (
      tutorialStep === "await-reward" &&
      view.phase === "item-choice"
    ) {
      nextStep = "treasure";
    } else if (
      tutorialStep === "await-reward" &&
      view.phase === "carousel"
    ) {
      nextStep = "treasure";
    } else if (
      tutorialStep === "await-reward" &&
      view.phase === "preparation"
    ) {
      nextStep = view.inventory.length > 0 ? "equip" : "sail";
    } else if (
      tutorialStep === "treasure" &&
      view.phase === "preparation" &&
      view.inventory.length > 0
    ) {
      nextStep = "equip";
    } else if (tutorialStep === "equip" && tutorialEquippedCount > 0) {
      nextStep = "complete";
    }

    if (!nextStep) return;
    const transitionTimer = window.setTimeout(() => {
      if (nextStep === "complete") {
        saveFirstVoyageCompletion();
        setTutorialStep(null);
        showToast(
          "success",
          "GUIDE COMPLETE",
          "Your crew is ready to chart its own course.",
        );
        return;
      }
      if (nextStep === "second") {
        setSelectedUnitId(null);
      }
      setTutorialStep(nextStep);
    }, 0);
    return () => window.clearTimeout(transitionTimer);
  }, [
    saveFirstVoyageCompletion,
    setTutorialStep,
    showToast,
    tutorialCrewCount,
    tutorialEquippedCount,
    tutorialStep,
    view,
  ]);

  return (
    <main
      className={`game-shell ${settings.highContrast ? "high-contrast" : ""} ${
        settings.reducedMotion ? "reduced-motion" : ""
      }`}
      aria-label="Grand Line Auto Chess"
    >
      {screen !== "menu" && (
        <div className="ambient-sea" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      {screen === "menu" && (
        <MainMenu
          multiplayer={multiplayer}
          reducedMotion={settings.reducedMotion}
          hasSave={hasSave}
          saveReady={saveReady}
          saveDate={saveDate}
          onNew={requestNewVoyage}
          onContinue={continueVoyage}
          onSettings={() => openSettings("menu")}
          onAnimationLab={() => {
            setScreen("animation-lab");
            playSound("click");
          }}
          onCrewTools={() => { setCodexReference(undefined); setScreen("crew-tools"); playSound("click"); }}
          onChronicle={() => { void flushChronicle().then(() => setScreen("chronicle")); playSound("click"); }}
        />
      )}
      {screen === "crew-tools" && <CrewToolsScreen content={content} settings={settings} initialReference={codexReference} onBack={() => { setScreen("menu"); playSound("click"); }} />}
      {screen === "chronicle" && <ChronicleScreen content={content} settings={settings} onBack={() => setScreen("menu")} onCodex={(category, query) => { setCodexReference({ category, query }); setScreen("crew-tools"); }} />}
      {chronicleError && <p className="chronicle-recording-error" role="status">Chronicle: {chronicleError}</p>}
      {screen === "animation-lab" && (
        <AnimationLab
          onBack={() => {
            setScreen("menu");
            playSound("click");
          }}
        />
      )}
      {screen === "confirm-new" && (
        <ConfirmNewVoyageScreen
          onCancel={() => setScreen("menu")}
          onReplace={replaceVoyage}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          settings={settings}
          onChange={setSettings}
          onBack={closeSettings}
          hasActiveVoyage={Boolean(engineState)}
          onLeaveVoyage={leaveVoyage}
          onRestartTutorial={restartTutorial}
          onExportDiagnostics={exportLocalDiagnostics}
          onClearDiagnostics={clearLocalDiagnostics}
        />
      )}
      {(screen === "match" || (screen === "settings" && returnScreen === "match")) && view && (
        <MatchScreen
          hidden={screen !== "match"}
          view={view}
          timer={timer}
          phaseDuration={phaseDuration}
          clockLabel={clockLabel}
          clockPaused={clockPaused}
          manualPaused={pacingPaused}
          onTogglePause={() => setPacingPaused(current => !current)}
          settings={settings}
          selectedUnit={selectedUnit}
          selectedDefinition={selectedDefinition}
          scoutedStanding={scoutedStanding}
          battlePresentation={battlePresentation}
          tutorialStep={tutorialStep}
          saveStatus={saveStatus}
          isAdvancing={isAdvancing}
          onSelectUnit={setSelectedUnitId}
          onScoutPlayer={scoutPlayer}
          onReturnFromScout={returnFromScouting}
          onMoveUnit={moveUnit}
          onBuyUnit={buyUnit}
          onReroll={() =>
            issueCommand(
              {
                type: "REROLL_SHOP",
              },
              "coin",
            )
          }
          onToggleLock={() =>
            issueCommand(
              {
                type: "TOGGLE_SHOP_LOCK",
              },
              "click",
            )
          }
          onBuyXp={() =>
            issueCommand(
              { type: "BUY_XP" },
              "coin",
            )
          }
          onSellUnit={sellUnit}
          onServeFood={(foodId) => {
            if (scoutedPlayerId || !selectedUnitId) return;
            issueCommand({ type: "USE_FOOD", unitId: selectedUnitId, foodId }, "reward");
          }}
          onEquipItem={(itemId) => {
            if (scoutedPlayerId) return;
            if (!selectedUnitId) return;
            issueCommand(
              {
                type: "EQUIP_ITEM",
                unitId: selectedUnitId,
                itemId,
              },
              "reward",
            );
          }}
          onChangeSettings={setSettings}
          onAdvance={advancePhase}
          onSettings={() => openSettings("match")}
        />
      )}
      {screen === "carousel" && view && (
        <CarouselScreen
          choices={view.choices}
          session={view.carouselSession}
          playerId={view.playerId}
          round={view.round}
          settings={settings}
          onSetTarget={setCarouselTarget}
          onAutoPick={autoResolveCarousel}
          onSettings={() => openSettings("carousel")}
        />
      )}
      {screen === "reward" && view && (
        <RewardScreen
          choices={view.choices}
          source={GameEngine.getStageDefinition(view.round).kind === "pve" ? "pve" : "supply"}
          onChoose={chooseReward}
        />
      )}
      {(screen === "voyage-recruitment" || screen === "starter-recruitment") && view && (
        <VoyageRecruitmentScreen
          starter={screen === "starter-recruitment"}
          route={view.recruitmentRoute}
          gold={view.gold}
          onSkip={() => chooseStarter(null)}
          round={view.round}
          recruits={view.voyageRecruits}
          timer={timer}
          phaseDuration={phaseDuration}
          clockLabel={clockLabel}
          manualPaused={pacingPaused}
          onTogglePause={() => setPacingPaused(current => !current)}
          onSettings={() => openSettings(screen === "starter-recruitment" ? "starter-recruitment" : "voyage-recruitment")}
          onChoose={screen === "starter-recruitment" ? chooseStarter : chooseVoyageRecruit}
        />
      )}
      {screen === "harbor" && view?.harbor && <HarborScreen harbor={view.harbor} round={view.round} gold={view.gold}
        timer={timer} phaseDuration={phaseDuration} clockLabel={clockLabel} manualPaused={pacingPaused}
        onTogglePause={() => setPacingPaused(current => !current)} onSettings={() => openSettings("harbor")} onChoose={chooseHarbor} />}
      {screen === "results" && view && (
        <ResultsScreen
          view={view}
          onNew={startVoyage}
          onMenu={() => {
            void deleteVoyage().catch(() => undefined);
            setHasSave(false);
            leaveVoyage();
          }}
        />
      )}
      {toast && <ActionToast toast={toast} onClose={() => setToast(null)} />}
      {tutorialStep && view && screen !== "settings" && (
        <TutorialCoach
          step={tutorialStep}
          onBegin={() => setTutorialStep("recruit")}
          onSkip={skipTutorial}
        />
      )}
    </main>
  );
}
