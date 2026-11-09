"use client";

import { useEffect, useMemo, useState } from "react";
import { getActiveTraitsForUnits, resolveUnitDefinition, type GameContent, type StarLevel } from "../../game";
import { createTeamPlan, parseTeamPlan, resolvePlannedUnit, simulateTeamPlan, validateTeamPlan, type PlannedUnit, type TeamPlan } from "../../game/teamPlanner";
import { formRequirementText } from "../crewReference";
import { deleteTeamPlan, downloadTeamPlan, readTeamPlans, storeTeamPlan } from "../plannerStorage";
import { plannerPresentation } from "../plannerPresentation";
import BattleBoard from "../../components/BattleBoard";
import type { Settings } from "./GameScreens";
import { FIELD_HELP, WEATHER_HELP } from "../battleEnvironmentPresentation";
import type { BoardFieldKind, WeatherKind } from "../../game";

function TeamEditor({ side, plan, content, update }: { side: "a" | "b"; plan: TeamPlan; content: GameContent; update: (units: PlannedUnit[]) => void }) {
  const units = plan.teams[side];
  const label = `Team ${side.toUpperCase()}`;
  const [crewId, setCrewId] = useState(content.units[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = units.find((unit) => unit.id === selectedId);
  const resolved = units.map((unit) => resolvePlannedUnit(unit, content));
  const traits = getActiveTraitsForUnits(resolved, content);
  const edit = (change: Partial<PlannedUnit>) => update(units.map((unit) => unit.id === selectedId ? { ...unit, ...change } : unit));
  const add = () => {
    const cells = Array.from({ length: content.config.boardWidth * content.config.deployRows }, (_, i) => ({ x: i % content.config.boardWidth, y: content.config.boardHeight - content.config.deployRows + Math.floor(i / content.config.boardWidth) }));
    const cell = cells.find((position) => !units.some((unit) => unit.position.x === position.x && unit.position.y === position.y));
    if (!cell || units.length >= content.config.maxLevel) return;
    let serial = 1;
    while (units.some((unit) => unit.id === `crew-${serial}`)) serial += 1;
    const id = `crew-${serial}`;
    update([...units, { id, definitionId: crewId, star: 1, items: [], position: cell }]);
    setSelectedId(id);
  };
  return <section className="team-editor" aria-label={label}>
    <h3>{label} · {units.length}/{content.config.maxLevel}</h3>
    <div className="tools-controls"><label>{label} recruit<select value={crewId} onChange={(event) => setCrewId(event.target.value)}>{content.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unit.cost} gold</option>)}</select></label><button type="button" disabled={units.length >= content.config.maxLevel} onClick={add}>Add to {label}</button></div>
    <div className="planner-grid" role="group" aria-label={`${label} deployment cells`} style={{ gridTemplateColumns: `repeat(${content.config.boardWidth}, minmax(0, 1fr))` }}>
      {Array.from({ length: content.config.boardWidth * content.config.deployRows }, (_, i) => {
        const position = { x: i % content.config.boardWidth, y: content.config.boardHeight - content.config.deployRows + Math.floor(i / content.config.boardWidth) };
        const occupant = units.find((unit) => unit.position.x === position.x && unit.position.y === position.y);
        return <button key={i} type="button" aria-label={`${label} column ${position.x + 1} row ${position.y + 1}${occupant ? `, ${content.units.find((unit) => unit.id === occupant.definitionId)?.name}` : ", empty"}`} aria-pressed={Boolean(occupant && selectedId === occupant.id)} onClick={() => occupant ? setSelectedId(occupant.id) : edit({ position })}>{occupant ? content.units.find((unit) => unit.id === occupant.definitionId)?.name : "·"}</button>;
      })}
    </div>
    <p>Select a crew member, then an empty cell to move. Both teams use their own deployment half; Team B is mirrored for combat.</p>
    <ul className="planner-roster" aria-label={`${label} crew`}>{resolved.map((unit) => <li key={unit.id}><button type="button" aria-pressed={selectedId === unit.id} onClick={() => setSelectedId(unit.id)}>{resolveUnitDefinition(unit.definitionId, unit.formId, content)?.name} · {unit.star}★</button></li>)}</ul>
    {selected && <fieldset className="unit-editor"><legend>{label} selected crew</legend>
      <label>{label} stars<select value={selected.star} onChange={(event) => edit({ star: Number(event.target.value) as StarLevel, formId: undefined })}>{[1, 2, 3].map((star) => <option key={star} value={star}>{star}★</option>)}</select></label>
      <label>{label} form<select value={selected.formId ?? ""} onChange={(event) => edit({ formId: event.target.value || undefined })}><option value="">Automatic production progression</option>{content.forms.filter((form) => form.baseDefinitionId === selected.definitionId && form.lifecycle === "persistent").map((form) => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label>
      {content.forms.filter((form) => form.baseDefinitionId === selected.definitionId).map((form) => <p key={form.id}>{formRequirementText(form.id)}</p>)}
      {Array.from({ length: content.config.itemCap }, (_, slot) => <label key={slot}>{label} item {slot + 1}<select value={selected.items[slot] ?? ""} onChange={(event) => {
        const items = [...selected.items]; items[slot] = event.target.value; edit({ items: items.filter(Boolean) });
      }}><option value="">Empty</option>{content.items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.kind}</option>)}</select></label>)}
      <label>{label} meal<select value={selected.foodId ?? ""} onChange={event => {
        const foodId = event.target.value || undefined;
        update(units.map(unit => unit.id === selected.id ? { ...unit, foodId } : { ...unit, foodId: foodId ? undefined : unit.foodId }));
      }}><option value="">No food</option>{(content.foods ?? []).map(food => <option key={food.id} value={food.id}>{food.name} · {food.description}</option>)}</select></label>
      <p>One practice meal per team; this does not consume voyage stock.</p>
      <label>{label} column<select value={selected.position.x} onChange={(event) => edit({ position: { ...selected.position, x: Number(event.target.value) } })}>{Array.from({ length: content.config.boardWidth }, (_, x) => <option key={x} value={x}>{x + 1}</option>)}</select></label>
      <label>{label} row<select value={selected.position.y} onChange={(event) => edit({ position: { ...selected.position, y: Number(event.target.value) } })}>{Array.from({ length: content.config.deployRows }, (_, i) => content.config.boardHeight - content.config.deployRows + i).map((y) => <option key={y} value={y}>{y + 1}</option>)}</select></label>
      <button type="button" onClick={() => { update(units.filter((unit) => unit.id !== selected.id)); setSelectedId(null); }}>Remove selected crew from {label}</button>
    </fieldset>}
    <ul className="planner-bonds" aria-label={`${label} bond thresholds`}>{traits.filter((trait) => trait.count > 0).map((trait) => {
      const definition = content.traits.find((entry) => entry.id === trait.traitId);
      const next = definition?.tiers[trait.tierIndex + 1]?.required;
      return <li key={trait.traitId}><strong>{definition?.name}: {trait.count}</strong> · {trait.tier?.label ?? "No active tier"} · {next ? `next at ${next}` : "maximum tier"}</li>;
    })}</ul>
  </section>;
}

export function TeamPlannerScreen({ content, settings, visible }: { content: GameContent; settings: Settings; visible: boolean }) {
  const [plan, setPlan] = useState(() => createTeamPlan(content));
  const [saved, setSaved] = useState<TeamPlan[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [battle, setBattle] = useState<ReturnType<typeof plannerPresentation> | null>(null);
  const [playback, setPlayback] = useState(0);
  const validation = useMemo(() => validateTeamPlan(plan, content), [plan, content]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSaved(readTeamPlans(window.localStorage, content)); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Plan library unavailable."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [content]);
  const change = (next: TeamPlan) => { setPlan(next); setBattle(null); setError(""); setNotice("Draft changed — save locally to keep it."); };
  const run = () => {
    const result = simulateTeamPlan(plan, content);
    if (!result.ok) { setError(result.errors.join(" ")); return; }
    setBattle(plannerPresentation(result, content)); setPlayback((current) => current + 1); setError("");
    setNotice("Combat test complete. Same plan and seed reproduce the same result. No voyage rewards or damage are applied.");
  };
  return <section aria-labelledby="planner-heading">
    <h2 id="planner-heading">TEAM PLANNER</h2>
    <p>Build two isolated crews. No shop, pool, active voyage or production bot is changed. Temporary forms trigger through the normal combat rules.</p>
    <fieldset className="tools-controls"><legend>Battle environment</legend>
      <label>Weather<select value={plan.environment?.weather ?? "neutral"} onChange={event => change({ ...plan,
        environment: { fields: plan.environment?.fields ?? [], weather: event.target.value as WeatherKind } })}>
        {(["neutral", "rain", "snow"] as const).map(weather => <option key={weather} value={weather}>{weather.toUpperCase()}</option>)}
      </select></label>
      <p>{WEATHER_HELP[plan.environment?.weather ?? "neutral"]}</p>
      {(["charged-deck", "frost-patch"] as const).map((kind: BoardFieldKind) => <label key={kind}><input type="checkbox"
        checked={plan.environment?.fields.some(field => field.kind === kind) ?? false} onChange={event => {
          const fields = (plan.environment?.fields ?? []).filter(field => field.kind !== kind);
          const authored = content.stages.flatMap(stage => stage.battleEnvironment?.fields ?? []).find(field => field.kind === kind);
          if (event.target.checked && authored) fields.push(structuredClone(authored));
          change({ ...plan, environment: { weather: plan.environment?.weather ?? "neutral", fields } });
        }} />{FIELD_HELP[kind]}</label>)}
    </fieldset>
    <div className="tools-controls"><label>Plan name<input maxLength={80} value={plan.name} onChange={(event) => change({ ...plan, name: event.target.value })} /></label><label>Combat seed<input maxLength={128} value={plan.seed} onChange={(event) => change({ ...plan, seed: event.target.value })} /></label>
      <button type="button" disabled={!validation.ok} onClick={() => {
        try { setSaved(storeTeamPlan(window.localStorage, plan, content)); setError(""); setNotice("Plan saved locally. Saving the same name replaces its previous version."); }
        catch (caught) { setError(caught instanceof Error ? caught.message : "Plan could not be saved."); }
      }}>Save plan locally</button>
      <button type="button" disabled={!validation.ok} onClick={() => { if (validation.ok) downloadTeamPlan(validation.plan); }}>Export plan</button>
      <label>Import plan<input type="file" accept=".json,application/json" onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
        try {
          if (file.size > 100_000) throw new Error("Plan file is too large (100 KB maximum).");
          const imported = parseTeamPlan(await file.text(), content);
          if (!imported.ok) { setError(imported.errors.join(" ")); return; }
          change(imported.plan); setNotice("Imported into the draft. Save locally to add it to your library.");
        } catch (caught) { setError(caught instanceof Error ? caught.message : "Plan import failed."); }
      }} /></label>
    </div>
    <p role="status">{notice}</p>
    {error && <p role="alert" className="tools-error">{error}</p>}
    {!validation.ok && <ul role="alert" className="tools-error">{validation.errors.map((message, index) => <li key={index}>{message}</li>)}</ul>}
    <details className="saved-plans"><summary>Saved plans ({saved.length}/20)</summary><ul>{saved.map((entry) => <li key={entry.name}><span>{entry.name}</span><button type="button" onClick={() => { change(structuredClone(entry)); setNotice("Saved plan loaded into draft."); }}>Load {entry.name}</button><button type="button" onClick={() => {
      try { setSaved(deleteTeamPlan(window.localStorage, entry.name, content)); setNotice("Saved plan deleted; current draft is unchanged."); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Plan could not be deleted."); }
    }}>Delete {entry.name}</button></li>)}</ul></details>
    <div className="planner-teams">{(["a", "b"] as const).map((side) => <TeamEditor key={side} side={side} plan={plan} content={content} update={(units) => change({ ...plan, teams: { ...plan.teams, [side]: units } })} />)}</div>
    <button type="button" className="pixel-button compact" disabled={!validation.ok || !plan.teams.a.length || !plan.teams.b.length} onClick={run}>RUN COMBAT TEST</button>
    {battle && <section className="planner-battle" aria-label="Combat test result">
      <h3>{battle.result.winner === "draw" ? "DRAW" : `TEAM ${battle.result.winner.toUpperCase()} WINS`} · {(battle.result.durationTicks * content.config.combatTickMs / 1000).toFixed(1)}s {battle.result.timedOut ? "· timeout" : ""}</h3>
      <button type="button" onClick={() => setPlayback((current) => current + 1)}>Replay combat test</button>
      {visible && battle.presentation && <BattleBoard audio={settings} environment={battle.presentation.environment} key={playback} units={battle.presentation.boardUnits} selectedId={null} interactionMode="none" phase="battle" capacity={content.config.maxLevel} boardSkin={settings.boardSkin} combatEvents={battle.presentation.events} eventSequence={playback} speed={settings.animationSpeed} particles={settings.particles} combatNumbers={settings.combatNumbers} reducedMotion={settings.reducedMotion} onMoveUnit={() => false} onSelectUnit={() => undefined} />}
      <div className="planner-recaps">{[battle.recapA, battle.recapB].map((recap, index) => recap && <section key={index} aria-label={`Team ${index === 0 ? "A" : "B"} test recap`}><h4>TEAM {index === 0 ? "A" : "B"} · {recap.humanTeamHpPercent}% health remaining</h4><ul>{recap.finalCrew.map((unit) => <li key={unit.unitId}>{unit.label}</li>)}</ul></section>)}</div>
    </section>}
  </section>;
}
