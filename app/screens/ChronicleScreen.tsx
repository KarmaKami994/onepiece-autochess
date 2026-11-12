"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameContent } from "../../game";
import BattleBoard from "../../components/BattleBoard";
import { VisualIcon } from "../../components/VisualIcon";
import { itemVisual } from "../../components/gameVisualManifest";
import { selectBattlePresentation, selectMatchView } from "../selectors";
import { ACHIEVEMENTS, MAX_REPLAY_BYTES, MAX_ARCHIVE_BYTES, emptyProfile, replayCompatible, replayFrameState, replayStageName, type CaptainProfile, type StoredReplay } from "../chronicle";
import { deleteReplay, downloadChronicle, importReplay, importReplayArchive, readProfile, readReplay, readReplayHeaders, updateProfile, type ReplayHeader } from "../chronicleStorage";
import { parseReplay, validateProfile } from "../replayValidation";
import type { ReferenceCategory } from "../crewReference";
import type { Settings } from "./GameScreens";
import "../crewTools.css";
import "../chronicle.css";

function ReplayViewer({ record, content, settings }: { record: StoredReplay; content: GameContent; settings: Settings }) {
  const replay = record.replay;
  const [index, setIndex] = useState(0);
  const [perspective, setPerspective] = useState(replay.playerId);
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState(settings.animationSpeed);
  const [generation, setGeneration] = useState(1);
  const compatible = useMemo(() => replayCompatible(replay, content), [replay, content]);
  const frame = replay.frames[index];
  const state = useMemo(() => compatible ? replayFrameState(replay, frame, content) : null, [compatible, replay, frame, content]);
  const battle = useMemo(() => state ? selectBattlePresentation(state, perspective, content) : null, [state, perspective, content]);
  const view = useMemo(() => state ? selectMatchView({ ...state, players: state.players.map((player) => ({ ...player, isBot: player.id !== perspective })) }, content) : null, [state, perspective, content]);
  const captain = frame.players.find((player) => player.id === perspective);
  const navigate = (next: number) => { setIndex(next); setPaused(true); setGeneration((value) => value + 1); };
  if (!compatible) return <section role="status" className="chronicle-warning">Playback disabled: content/config/schema differs from this build. Recorded content {replay.contentVersion}, schema {replay.schemaVersion}. This record can still be exported or deleted.</section>;
  return <section className="replay-viewer" aria-label="Voyage replay">
    <h2>READ-ONLY VOYAGE REPLAY</h2><p>{replay.seed} · {record.origin === "local" ? "Local recording" : "Imported — excluded from profile"} · {replay.fromStart ? "Recorded from round 1" : `Partial recording from round ${replay.frames[0].round}`} · {replay.completedAt === null ? "Unfinished" : "Local captain's voyage complete"}</p>
    <div className="tools-controls">
      <button type="button" disabled={index === 0} onClick={() => navigate(index - 1)}>Previous phase</button>
      <label>Round / phase<select value={index} onChange={(event) => navigate(Number(event.target.value))}>{replay.frames.map((entry, i) => <option key={`${entry.round}:${entry.phase}`} value={i}>R{entry.round} · {entry.phase} · {replayStageName(entry, content)}</option>)}</select></label>
      <button type="button" disabled={index === replay.frames.length - 1} onClick={() => navigate(index + 1)}>Next phase</button>
      <label>Replay perspective<select value={perspective} onChange={(event) => { setPerspective(event.target.value); setGeneration((value) => value + 1); setPaused(true); }}>{frame.players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      <label>Replay speed<select value={speed} onChange={(event) => { setSpeed(Number(event.target.value)); }}>{[0.5, 1, 2, 4].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
      <button type="button" disabled={!battle} onClick={() => setPaused((value) => !value)}>{paused ? "Play replay" : "Pause replay"}</button>
      <button type="button" disabled={!battle} onClick={() => { setGeneration((value) => value + 1); setPaused(true); }}>Restart battle</button>
    </div>
    <h3>R{frame.round} · {replayStageName(frame, content)} · {frame.phase}</h3>
    {captain && <p>{captain.name}: {captain.hp} Captain HP · level {captain.level} · {captain.gold} gold · {captain.placement ? `placement ${captain.placement}` : "voyage in progress"}</p>}
    {!battle && <p>This phase has no recorded combat for this captain. The board shows the recorded crew. {frame.phase === "carousel" ? "Bounty Regatta / item selection." : frame.phase === "voyage-choice" ? "Voyage Recruitment choice." : frame.phase === "item-choice" ? "Item reward selection." : "Preparation or voyage result."}</p>}
    {captain && <div className="replay-snapshot-details"><p>Reserve: {captain.bench.flatMap((id) => id && captain.units[id] ? [content.units.find((unit) => unit.id === captain.units[id].definitionId)?.name ?? captain.units[id].definitionId] : []).join(", ") || "Empty"}</p><p>Inventory: {captain.inventory.map((id, index) => {
      const item = content.items.find(item => item.id === id);
      return <span key={`${id}-${index}`}><VisualIcon className="inline-game-icon" imagePath={itemVisual(id).imagePath} fallback={item?.icon ?? "◆"} />{item?.name ?? id}{index < captain.inventory.length - 1 ? ", " : ""}</span>;
    })}{!captain.inventory.length && "Empty"}</p>
      <p>Recruit offers: {(frame.recruitOffers[perspective] ?? []).map((id) => content.units.find((unit) => unit.id === id)?.name ?? id).join(", ") || "None"}</p><p>Item offers: {(frame.itemOffers[perspective] ?? []).map((id) => content.items.find((item) => item.id === id)?.name ?? id).join(", ") || "None"}</p>
      <p>Harbor offers: {(frame.harborOffers?.[perspective] ?? []).map(offer => `${offer.kind === "food" ? content.foods?.find(food => food.id === offer.foodId)?.name ?? offer.foodId : content.items.find(item => item.id === offer.itemId)?.name ?? offer.itemId} · ${offer.goldCost} gold`).join(", ") || "None"}</p>
      <p>Galley: {(captain.foodInventory ?? []).map(id => content.foods?.find(food => food.id === id)?.name ?? id).join(", ") || "Empty"}</p>
      <p>Served meal: {(() => { const meal = captain.pendingMeal ?? frame.battleMeals?.[perspective]; return meal ? `${content.foods?.find(food => food.id === meal.foodId)?.name ?? meal.foodId} → ${meal.unitId}` : "None"; })()}</p>
      <p>Recruitment route: {content.recruitmentRoutes.find(route => route.id === frame.recruitmentRoutes?.[perspective])?.name ?? "Open sea"}</p>
      <p>Past voyage decisions: {(replay.choiceHistory ?? []).filter(receipt => receipt.playerId === perspective && (receipt.round < frame.round ||
        (receipt.round === frame.round && !["starter-choice", "voyage-choice", "harbor-choice"].includes(frame.phase))))
        .map(receipt => `R${receipt.round} ${receipt.kind}: ${receipt.skipped ? "sailed on" : receipt.definitionId ?? receipt.itemId ?? receipt.foodId} (${receipt.paidGold} gold)`).join(" · ") || "None yet"}</p>
      <p>Food record: {(replay.foodHistory ?? []).filter(receipt => receipt.playerId === perspective &&
        (receipt.round < frame.round || (receipt.round === frame.round && frame.phase === "battle")))
        .map(receipt => `R${receipt.round} ${receipt.kind}: ${content.foods?.find(food => food.id === receipt.foodId)?.name ?? receipt.foodId}`).join(" · ") || "None yet"}</p></div>}
    {view && <div className="replay-board"><BattleBoard environment={battle?.environment ?? view.environment} key={`${index}:${perspective}:${generation}`} audio={settings} units={battle?.boardUnits ?? view.boardUnits} selectedId={null} interactionMode="none" phase={battle ? "battle" : "replay-snapshot"} capacity={content.config.maxLevel} boardSkin={settings.boardSkin} combatEvents={battle?.events ?? []} eventSequence={generation} speed={speed} paused={paused} particles={settings.particles} combatNumbers={settings.combatNumbers} reducedMotion={settings.reducedMotion} onMoveUnit={() => false} onSelectUnit={() => undefined} /></div>}
    <details><summary>Recorded captain standings / final crews</summary>{frame.players.map((player) => <article key={player.id}><h4>{player.name} · {player.placement ? `#${player.placement}` : `${player.hp} HP`}</h4><p>{(player.finalLineup?.deployed ?? player.finalCrew).map((unit) => `${content.units.find((entry) => entry.id === unit.definitionId)?.name ?? unit.definitionId} ${unit.star}★${unit.formId ? ` / ${unit.formId}` : ""}${unit.items.length ? ` [${unit.items.join(", ")}]` : ""}`).join("; ") || "Final crew not yet recorded"}</p>{player.finalLineup && <p>Final reserve: {player.finalLineup.reserve.map((unit) => `${content.units.find((entry) => entry.id === unit.definitionId)?.name ?? unit.definitionId} ${unit.star}★ [${unit.items.join(", ")}]`).join("; ") || "Empty"}</p>}</article>)}</details>
  </section>;
}

export default function ChronicleScreen({ content, settings, onBack, onCodex }: { content: GameContent; settings: Settings; onBack: () => void; onCodex: (category: ReferenceCategory, query: string) => void }) {
  const [headers, setHeaders] = useState<ReplayHeader[]>([]);
  const [profile, setProfile] = useState<CaptainProfile>(emptyProfile);
  const [record, setRecord] = useState<StoredReplay | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<"archive" | "profile" | null>(null);
  const refresh = async () => { const [nextHeaders, nextProfile] = await Promise.all([readReplayHeaders(), readProfile()]); setHeaders(nextHeaders); setProfile(nextProfile); };
  const action = async (work: () => Promise<void>) => { try { await work(); await refresh(); setError(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Chronicle action failed."); } };
  useEffect(() => { let active = true; void Promise.all([readReplayHeaders(), readProfile()]).then(([records, captain]) => { if (active) { setHeaders(records); setProfile(captain); } }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Chronicle storage unavailable."); }); return () => { active = false; }; }, []);
  const total = profile.placements.reduce((sum, count) => sum + count, 0);
  const average = total ? (profile.placements.reduce((sum, count, index) => sum + (index + 1) * count, 0) / total).toFixed(2) : "—";
  return <section className="crew-tools-screen chronicle-screen" aria-labelledby="chronicle-heading">
    <header className="tools-header"><div><span>OFFLINE CAPTAIN&apos;S LOG</span><h1 id="chronicle-heading">VOYAGE CHRONICLE</h1></div><button type="button" className="pixel-button compact" onClick={onBack}>← TITLE SCREEN</button></header>
    <p role="status">{notice}</p>{error && <p role="alert" className="tools-error">{error}</p>}
    <section aria-label="Captain profile"><h2>CAPTAIN PROFILE</h2><div className="tools-controls"><label>Captain name<input maxLength={40} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><button type="button" onClick={() => void action(async () => { await updateProfile({ name: profile.name }); setNotice("Captain name saved."); })}>Save captain name</button><button type="button" onClick={() => downloadChronicle(profile, "grand-line-captain-profile.json")}>Export profile</button>
      <label>Restore profile backup<input type="file" accept=".json,application/json" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; await action(async () => { if (file.size > 1_000_000) throw new Error("Profile backup exceeds 1 MB."); const checked = validateProfile(JSON.parse(await file.text()) as unknown); if (!window.confirm("Replace local profile statistics and collection with this backup? Replays and active voyage stay unchanged.")) return; await updateProfile({ restore: checked }); setNotice("Profile restored by explicit request. Existing credit ledger retained."); }); }} /></label></div>
      <dl className="profile-records"><div><dt>Completed voyages</dt><dd>{total}</dd></div><div><dt>Victories</dt><dd>{profile.placements[0]}</dd></div><div><dt>Average placement</dt><dd>{average}</dd></div><div><dt>Best placement</dt><dd>{profile.bestPlacement ?? "—"}</dd></div><div><dt>Highest round / level / gold</dt><dd>{profile.highestRound} / {profile.highestLevel} / {profile.highestGold}</dd></div><div><dt>Largest deployment</dt><dd>{profile.largestCrew}</dd></div></dl>
      <p>Placements: {profile.placements.map((count, index) => `#${index + 1}: ${count}`).join(" · ")}</p><p>Only completed, locally recorded captain voyages count once. Imports never count. Cosmetic profile data grants no gameplay advantage. A restored backup replaces these local user statistics.</p>
      <h3>Achievements</h3><ul className="achievement-list">{ACHIEVEMENTS.map(([id, title, description]) => <li key={id} data-unlocked={profile.achievements.includes(id)}><strong>{profile.achievements.includes(id) ? "✓ " : "Locked · "}{title}</strong><span>{description}</span></li>)}</ul>
    </section>
    <details className="chronicle-collection"><summary>Collection and codex · {profile.collection.crewOwned.length} crew owned · {profile.collection.formsReached.length} forms reached</summary>
      <p>Discovered: visible shop/offers or owned. Owned: persistent crew/inventory/gear observed. Deployed: frozen battle-start crew/gear. Forms reached: persistent progression or actual battle transformation. Only completed local voyages contribute.</p>
      {(["crew", "items", "forms"] as const).map((kind) => <section key={kind}><h3>{kind.toUpperCase()}</h3><div className="collection-grid">{(kind === "crew" ? content.units : kind === "items" ? content.items : content.forms).map((entry) => <article key={entry.id}><button type="button" onClick={() => onCodex(kind, entry.name)}>{entry.name} → Codex</button><p>{kind === "forms" ? profile.collection.formsReached.includes(entry.id) ? "Reached" : "Not reached" : <>{(kind === "crew" ? profile.collection.crewDiscovered : profile.collection.itemsDiscovered).includes(entry.id) ? "Discovered" : "Not discovered"} · {(kind === "crew" ? profile.collection.crewOwned : profile.collection.itemsOwned).includes(entry.id) ? "Owned" : "Not owned"} · {(kind === "crew" ? profile.collection.crewDeployed : profile.collection.itemsDeployed).includes(entry.id) ? "Deployed" : "Not deployed"}</>}</p></article>)}</div></section>)}
    </details>
    <section aria-label="Replay archive"><h2>REPLAY ARCHIVE</h2><p>Up to 10 recordings / 96 MiB, 32 MiB each, plus one active draft. Oldest recordings are removed when capacity is reached; lifetime profile credit remains. The active voyage is stored separately. Resumed pre-Chronicle voyages have explicit partial coverage.</p>
      <div className="tools-controls"><label>Import replay<input type="file" accept=".json,application/json" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; await action(async () => { if (file.size > MAX_REPLAY_BYTES) throw new Error("Replay exceeds 32 MiB."); const imported = parseReplay(await file.text(), content); await importReplay(imported, content); setNotice("Replay imported. Profile, achievements and active voyage unchanged."); }); }} /></label><button type="button" onClick={() => void action(async () => { const records = await Promise.all(headers.map((header) => readReplay(header.id, content))); downloadChronicle({ format: "grand-line-chronicle-archive", formatVersion: 1, records: records.map((entry) => entry.replay) }, "grand-line-replay-archive.json"); })}>Export archive</button></div>
      <label>Import archive backup<input type="file" accept=".json,application/json" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; await action(async () => { if (file.size > MAX_ARCHIVE_BYTES) throw new Error("Archive exceeds 96 MiB."); await importReplayArchive(JSON.parse(await file.text()) as unknown, content); setNotice("Archive imported without profile credit."); }); }} /></label>
      {!headers.length && <p>No completed voyages recorded yet. Finish a local voyage, or import a replay to view it without profile credit.</p>}
      <ul className="replay-library">{[...headers].reverse().map((header) => <li key={header.id}><div><strong>{header.seed}</strong><p>{new Date(header.startedAt).toLocaleString()} · {header.placement ? `#${header.placement}` : "Unfinished"} · {header.contentVersion} · {header.origin} · {header.fromStart ? "from start" : "partial"} · {(header.bytes / 1024 / 1024).toFixed(2)} MiB</p></div><button type="button" onClick={() => void action(async () => { setRecord(await readReplay(header.id, content)); })}>View {header.seed}</button><button type="button" onClick={() => void action(async () => { downloadChronicle((await readReplay(header.id, content)).replay, "grand-line-voyage-replay.json"); })}>Export {header.seed}</button><button type="button" onClick={() => void action(async () => { await deleteReplay(header.id); if (record?.id === header.id) setRecord(null); setNotice("Recording deleted; profile credit retained."); })}>Delete {header.seed}</button></li>)}</ul>
    </section>
    {record && <ReplayViewer key={record.id} record={record} content={content} settings={settings} />}
    <section className="chronicle-destructive"><h2>LOCAL DATA CONTROLS</h2><button type="button" onClick={() => setConfirm("archive")}>Clear replay archive…</button><button type="button" onClick={() => setConfirm("profile")}>Reset profile and collection…</button>
      {confirm && <div role="group" aria-label="Confirm Chronicle deletion"><p>{confirm === "archive" ? "Delete archived recordings? Profile, current draft and active voyage are preserved." : "Reset statistics, records, collection and achievements? Archive, credit ledger and active voyage are preserved. Old voyages will not be counted again."}</p><button type="button" onClick={() => void action(async () => { if (confirm === "archive") { await deleteReplay(); setRecord(null); } else await updateProfile({ reset: true }); setConfirm(null); setNotice("Selected local data cleared; active voyage unchanged."); })}>Confirm selected reset</button><button type="button" onClick={() => setConfirm(null)}>Cancel reset</button></div>}
    </section>
  </section>;
}
