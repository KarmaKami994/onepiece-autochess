"use client";

import { useEffect } from "react";
import { getStageDefinition } from "../../game/content";
import PhaseClockDisplay from "../PhaseClockDisplay";
import { CarouselScreen, HarborScreen, ResultsScreen, RewardScreen, VoyageRecruitmentScreen, type Settings } from "../screens/GameScreens";
import type { MatchView } from "../selectors";
import { FRIENDS_ROOM_UPDATE_MS, type FriendsCommand } from "./protocol";

function choiceCommand(view: MatchView, index: number): FriendsCommand | null {
  switch (view.phase) {
    case "item-choice": {
      const choice = view.choices[index];
      return choice ? { type: "CHOOSE_ITEM", choiceId: choice.id } : null;
    }
    case "harbor-choice": {
      const offer = view.harbor?.offers[index];
      return offer && !offer.disabled ? { type: "CHOOSE_HARBOR_OFFER", choiceId: offer.id } : null;
    }
    case "starter-choice":
    case "voyage-choice": {
      const recruit = view.voyageRecruits[index];
      if (!recruit || (view.phase === "starter-choice" && recruit.cost > view.gold)) return null;
      return view.phase === "starter-choice"
        ? { type: "CHOOSE_STARTER_RECRUIT", definitionId: recruit.id }
        : { type: "CHOOSE_VOYAGE_RECRUIT", definitionId: recruit.id };
    }
    default:
      return null;
  }
}

export default function FriendsVoyageScreen({ view, timer, duration, settings, onCommand, onLeave }: {
  view: MatchView;
  timer: number;
  duration: number;
  settings: Settings;
  onCommand: (command: FriendsCommand) => boolean;
  onLeave: () => void;
}) {
  useEffect(() => {
    if (!view.alive || view.phase === "carousel") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, [contenteditable]")) ||
        !/^[1-9]$/.test(event.key)) return;
      const command = choiceCommand(view, Number(event.key) - 1);
      if (command && onCommand(command)) event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, onCommand]);

  if (view.phase === "game-over") return <ResultsScreen view={view} onMenu={onLeave} />;
  if (view.alive) {
    if (view.phase === "carousel") {
      return <CarouselScreen choices={view.choices} session={view.carouselSession} playerId={view.playerId} round={view.round}
        settings={settings} frameIntervalMs={FRIENDS_ROOM_UPDATE_MS}
        onSetTarget={(target) => onCommand({ type: "CAROUSEL_SET_TARGET", ...target })} />;
    }
    if (view.phase === "item-choice" && view.choices.length) {
      return <RewardScreen choices={view.choices} clock={{ timer, duration, label: view.phaseLabel }}
        source={getStageDefinition(view.round).kind === "pve" ? "pve" : "supply"}
        onChoose={(choiceId) => onCommand({ type: "CHOOSE_ITEM", choiceId })} />;
    }
    if (view.phase === "harbor-choice" && view.harbor?.offers.length) {
      return <HarborScreen harbor={view.harbor} round={view.round} gold={view.gold} timer={timer} phaseDuration={duration}
        clockLabel={view.phaseLabel} manualPaused={false}
        onChoose={(choiceId) => onCommand({ type: "CHOOSE_HARBOR_OFFER", choiceId })} />;
    }
    if ((view.phase === "starter-choice" || view.phase === "voyage-choice") && view.voyageRecruits.length) {
      const starter = view.phase === "starter-choice";
      return <VoyageRecruitmentScreen starter={starter} route={view.recruitmentRoute} gold={view.gold} round={view.round}
        recruits={view.voyageRecruits} timer={timer} phaseDuration={duration} clockLabel={view.phaseLabel} manualPaused={false}
        onSkip={() => onCommand({ type: "CHOOSE_STARTER_RECRUIT", definitionId: null })}
        onChoose={(definitionId) => onCommand({ type: starter ? "CHOOSE_STARTER_RECRUIT" : "CHOOSE_VOYAGE_RECRUIT", definitionId })} />;
    }
  }

  return (
    <section className="overlay-screen">
      <div className="modal-panel">
        <h1>{view.alive ? "Waiting for the crew" : `You placed #${view.placement}`}</h1>
        <p role="status">{view.alive ? "The voyage continues when the other captains finish choosing or time runs out." : "The remaining captains are still sailing."}</p>
        {duration > 0 && <PhaseClockDisplay timer={timer} duration={duration} label={view.phaseLabel} />}
        <button type="button" className="pixel-button compact" onClick={onLeave}>Back to menu</button>
      </div>
    </section>
  );
}
