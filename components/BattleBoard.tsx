"use client";

import { useCallback, useRef, useState } from "react";
import PhaserBoard, { type PhaserBoardProps, type CombatFxEvent } from "./PhaserBoard";
import { createCombatReport, recordCombatEvent } from "./combatReport";
import { useGameAudio } from "../app/useGameAudio";
import { combatSound, DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "../app/audioSettings";
import { BattleEnvironmentLegend } from "./BattleEnvironmentLegend";
import { DEFAULT_CONTENT, getFoodDefinition } from "../game";

/** A playback observer only: neither meters nor audio feed the simulation. */
export default function BattleBoard({ audio = DEFAULT_AUDIO_SETTINGS, ...props }: PhaserBoardProps & { audio?: AudioSettings }) {
  const [report, setReport] = useState(() => createCombatReport(props.units));
  const [team, setTeam] = useState<"player" | "enemy">("player");
  const play = useGameAudio(audio, false);
  const seen = useRef(new Set<string>());
  const reset = useCallback(() => {
    seen.current.clear();
    setReport(createCombatReport(props.units));
  }, [props.units]);
  const event = useCallback((value: CombatFxEvent) => {
    if (seen.current.has(value.id)) return;
    seen.current.add(value.id);
    setReport((current) => recordCombatEvent(current, value));
    const sound = combatSound(value);
    if (sound) play(sound);
  }, [play]);
  const complete = useCallback(() => setReport((current) => ({ ...current, complete: true })), []);
  const unavailable = useCallback(() => setReport((current) => ({ ...current, cue: "Visual playback unavailable; totals are not revealed." })), []);
  const ordered = report.units.filter((unit) => unit.team === team).sort((a, b) => (b.hpDamage + b.shieldDamage) - (a.hpDamage + a.shieldDamage) || a.id.localeCompare(b.id));
  return <PhaserBoard {...props} onPlaybackReset={reset} onPlaybackEvent={event} onPlaybackComplete={complete} onPlaybackUnavailable={unavailable}>
    <BattleEnvironmentLegend environment={props.environment} />
    {props.units.some(unit => unit.zone === "board" && unit.foodId) && <div className="battle-meals" aria-label="Battle meals">
      {props.units.filter(unit => unit.zone === "board" && unit.foodId).map(unit => <span key={unit.id}>
        {unit.name}: {getFoodDefinition(unit.foodId ?? "", DEFAULT_CONTENT)?.name ?? unit.foodId} · next-battle meal
      </span>)}
    </div>}
    {(props.phase === "battle" || report.elapsedMs > 0) && <details className="combat-report" aria-label="Combat contributions" data-complete={report.complete} data-elapsed-ms={report.elapsedMs}>
      <summary>COMBAT CONTRIBUTIONS · {report.complete ? "FINAL" : "PLAYBACK"} · {(report.elapsedMs / 1000).toFixed(1)}s</summary>
      <div className="combat-report-content">
        <p className="combat-event-cue" role="status">{report.cue}</p>
        <div className="combat-report-teams" aria-label="Contribution team"><button type="button" aria-pressed={team === "player"} onClick={() => setTeam("player")}>Viewed crew</button><button type="button" aria-pressed={team === "enemy"} onClick={() => setTeam("enemy")}>Opponent</button></div>
        <div className="combat-report-table"><table><caption>Effective contributions during visible playback</caption><thead><tr><th scope="col">Fighter</th><th scope="col">HP dmg</th><th scope="col">Shield dmg</th><th scope="col">Healing</th><th scope="col">Shield given</th></tr></thead><tbody>{ordered.map((unit) => <tr key={unit.id} data-fighter-id={unit.id}><th scope="row">{unit.name} {unit.star}★<small>Taken: {unit.hpTaken} HP + {unit.shieldTaken} shield · Drained: {unit.energyDrained} · Revives: {unit.revives}</small></th><td>{unit.hpDamage}</td><td>{unit.shieldDamage}</td><td>{unit.healing}</td><td>{unit.shields}</td></tr>)}</tbody></table></div>
        <p className="combat-report-help">Damage is actual HP/shield loss; overkill and overheal are excluded. Shields count when granted, including unused shields. Interception belongs to the recipient. Resurrection and form HP changes are not healing. Initial passive shields have no inferred source.</p>
      </div>
    </details>}
  </PhaserBoard>;
}
