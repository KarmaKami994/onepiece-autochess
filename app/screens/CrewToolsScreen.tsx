"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { GameContent, StarLevel } from "../../game";
import { crewReference, filterReference, type ReferenceCategory } from "../crewReference";
import { TeamPlannerScreen } from "./TeamPlannerScreen";
import type { Settings } from "./GameScreens";
import "../crewTools.css";

const CATEGORIES: { id: ReferenceCategory; label: string }[] = [
  { id: "crew", label: "Crew" }, { id: "items", label: "Items & recipes" },
  { id: "traits", label: "Bonds" }, { id: "forms", label: "Forms" },
  { id: "status", label: "Status" }, { id: "pve", label: "PvE" }, { id: "rounds", label: "Rounds" },
  { id: "voyage", label: "Voyage choices" },
];

function Codex({ content, initialReference }: { content: GameContent; initialReference?: { category: ReferenceCategory; query: string } }) {
  const [category, setCategory] = useState<ReferenceCategory>(initialReference?.category ?? "crew");
  const [query, setQuery] = useState(initialReference?.query ?? "");
  const [cost, setCost] = useState("");
  const [trait, setTrait] = useState("");
  const [kind, setKind] = useState("");
  const [star, setStar] = useState<StarLevel>(1);
  const entries = useMemo(() => crewReference(content, star), [content, star]);
  const filtered = filterReference(entries, { category, query, cost: Number(cost), trait, kind });
  return <section aria-labelledby="codex-heading">
    <h2 id="codex-heading">CREW CODEX</h2>
    <p>Current content {content.version}. Read current rules, plan a crew and inspect all recipes. Star values are base values before equipment and bonds.</p>
    <nav className="tools-tabs" aria-label="Codex sections">
      {CATEGORIES.map((entry) => <button type="button" key={entry.id} aria-pressed={category === entry.id} onClick={() => {
        setCategory(entry.id); setQuery(""); setCost(""); setTrait(""); setKind("");
      }}>{entry.label}</button>)}
    </nav>
    <div className="tools-controls">
      <label>Search codex<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ability, recipe, rule…" /></label>
      {["crew", "forms", "pve"].includes(category) && <label>Preview stars<select value={star} onChange={(event) => setStar(Number(event.target.value) as StarLevel)}>{[1, 2, 3].map((value) => <option key={value} value={value}>{value}★</option>)}</select></label>}
      {["crew", "forms"].includes(category) && <label>Cost<select value={cost} onChange={(event) => setCost(event.target.value)}><option value="">All costs</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} gold</option>)}</select></label>}
      {["crew", "forms", "items", "traits"].includes(category) && <label>Bond<select value={trait} onChange={(event) => setTrait(event.target.value)}><option value="">All bonds</option>{content.traits.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}
      {category === "items" && <label>Item kind<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">All items</option><option value="component">Components</option><option value="completed">Completed</option></select></label>}
      {category === "forms" && <label>Form lifecycle<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">All forms</option><option value="persistent">Persistent</option><option value="battle-temporary">Battle-temporary</option></select></label>}
      {category === "rounds" && <label>Stage kind<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="">All stages</option>{["pve", "pvp", "carousel", "voyage-choice"].map((value) => <option key={value}>{value}</option>)}</select></label>}
    </div>
    <p role="status">{filtered.length} entries</p>
    <div className="reference-grid">
      {filtered.map((entry) => <article key={entry.id} className="reference-card" data-reference-id={entry.id}>
        <header>{entry.imagePath && <Image src={entry.imagePath} alt="" unoptimized loading="lazy" width={56} height={56} />}<h3>{entry.name}{entry.cost ? <small>{entry.cost} gold</small> : null}</h3></header>
        <p>{entry.description}</p>
        <details><summary>Rules and details</summary><ul>{entry.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul></details>
      </article>)}
    </div>
    {!filtered.length && <p>No entries match these filters.</p>}
  </section>;
}

export default function CrewToolsScreen({ content, settings, onBack, initialReference }: { content: GameContent; settings: Settings; onBack: () => void; initialReference?: { category: ReferenceCategory; query: string } }) {
  const [tab, setTab] = useState<"codex" | "planner">("codex");
  return <section className="crew-tools-screen" aria-labelledby="crew-tools-heading">
    <header className="tools-header"><div><span>OFFLINE CREW TOOLS</span><h1 id="crew-tools-heading">CREW TOOLS</h1></div><button type="button" className="pixel-button compact" onClick={onBack}>← TITLE SCREEN</button></header>
    <nav className="tools-tabs" aria-label="Crew tools"><button type="button" aria-pressed={tab === "codex"} onClick={() => setTab("codex")}>CODEX</button><button type="button" aria-pressed={tab === "planner"} onClick={() => setTab("planner")}>TEAM PLANNER</button></nav>
    <div hidden={tab !== "codex"}><Codex content={content} initialReference={initialReference} /></div>
    <div hidden={tab !== "planner"}><TeamPlannerScreen content={content} settings={settings} visible={tab === "planner"} /></div>
  </section>;
}
