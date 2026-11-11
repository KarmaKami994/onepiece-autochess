// Inventory authoring, not a test or a claim of visual approval.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { DEFAULT_CONTENT } = await tsImport(pathToFileURL(path.join(ROOT, "game/content.ts")).href, import.meta.url);
const { CREW_V2_ANIMATIONS, LUFFY_V2_ANIMATION, PVE_ANIMATION_MANIFEST } = await tsImport(pathToFileURL(path.join(ROOT, "components/crewAnimationManifest.ts")).href, import.meta.url);
const matrix = JSON.parse(await readFile(path.join(ROOT, "art/animation-v2/source-matrix.json"), "utf8"));
const states = ["idle", "move", "attack", "cast", "hit", "defeat"];
const missing = new Set(["koala", "killer", "kaido", "caesar-clown", "pica"]);
const large = new Set(["franky", "kuma", "jinbe", "ivankov", "whitebeard", "blackbeard", "sea-king", "pacifista", "seraphim", "arlong", "enel", "rob-lucci", "magellan", "hody-jones", "caesar-clown", "pica", "kaido"]);
const result = [];
const definitions = [
  ...DEFAULT_CONTENT.units.map((unit) => ({ id: unit.id, kind: "crew", definition: unit.id === "luffy" ? LUFFY_V2_ANIMATION : CREW_V2_ANIMATIONS[unit.id] })),
  ...[...new Map(Object.values(PVE_ANIMATION_MANIFEST).map((definition) => [definition.assetKey, definition])).values()].map((definition) => ({ id: definition.assetKey.replace(/-v2$/, ""), kind: "pve", definition })),
];
for (const { id, kind, definition } of definitions) {
  const metadata = JSON.parse(await readFile(path.join(ROOT, "public", definition.sheetPath.replace(/^\//, "").replace(/\.png$/, ".json")), "utf8"));
  const source = matrix.entries.find((entry) => entry.outputAssetKey === definition.assetKey);
  const clips = Object.fromEntries(states.map((state) => {
    const frames = metadata.frames.filter((frame) => frame.state === state);
    const rectangles = frames.filter((frame) => frame.sourceRect).map((frame) => JSON.stringify(frame.sourceRect));
    return [state, { status: missing.has(id) ? "neu zeichnen" : "kuratieren", sourceRectangles: rectangles.length ? new Set(rectangles).size : null, visuallyApproved: false }];
  }));
  result.push({ id, kind, bodyClass: id === "chopper" ? "small" : large.has(id) ? "large" : "normal", originalAsset: definition.assetKey, source: source?.source.localPath ?? metadata.source, strategy: source?.source.strategy ?? metadata.pipeline, detectedCandidates: metadata.detection?.characterCandidateCount ?? null, clips });
}
for (const form of DEFAULT_CONTENT.forms) result.push({ id: form.id, kind: "form", bodyClass: "large", originalAsset: "base body + SVG overlay", source: `public/assets/forms/${form.id}`, strategy: "no independent body atlas before B10", detectedCandidates: null, clips: Object.fromEntries(states.map((state) => [state, { status: "neu zeichnen", sourceRectangles: null, visuallyApproved: false }])) });
for (const id of ["koala", "kaido", "robin-demonio-fleur"]) {
  const entry = result.find((row) => row.id === id);
  entry.pilot = `${id}-b10-v2`;
  entry.pilotReview = "kuratieren — all six clips authored; owner / board review pending";
}
await writeFile(path.join(ROOT, "art/production/b10/inventory.json"), JSON.stringify({ schemaVersion: 1, base: "74cea3577eba98a07911b2d488abd3ece20b373d", entries: result }, null, 2) + "\n");
const header = `# B10 Asset-Arbeitsliste\n\nStand: 11.11.2026. **34 Crew / 24 PvE-Identitäten / 4 Formen.**\n\nBefund des alten main-Exports, keine pauschale visuelle Abnahme. Reihenfolge: Idle / Move / Attack / Cast / Hit / Defeat. Zahlen sind unterschiedliche Quellrechtecke, **keine bestätigten Körperposen**; — bedeutet nicht aus Metadaten ableitbar. Zustände: behalten / kuratieren / neu zeichnen / abgenommen. Noch kein Clip ist owner-abgenommen. Gute vorhandene Quellen bleiben erhalten; Scannerzuordnung wird erst nach Clip-Sichtung übernommen.\n\n| ID | Art / Klasse | Quelle / Strategie | I / M / A / C / H / D | Arbeitszustand |\n| --- | --- | --- | --- | --- |\n`;
const rows = result.map((entry) => `| ${entry.id} | ${entry.kind} / ${entry.bodyClass} | ${entry.strategy} | ${states.map((state) => entry.clips[state].sourceRectangles ?? "—").join(" / ")} | ${entry.pilot ? "B10-Pilot: 6 Clips kuratiert, Abnahme offen" : entry.clips.idle.status} |`).join("\n");
await writeFile(path.join(ROOT, "docs/B10_ASSET_INVENTAR.md"), header + rows + "\n\nExakte Quellpfade, Kandidatenzahlen und Einzelclipzustände: `art/production/b10/inventory.json`. Drei weitere Formkörper sowie Killer, Caesar und Pica gehören erst in B11. Keine Freigabe der Serienproduktion durch diesen Inventarexport.\n");
console.log(`Wrote ${result.length} visual identities / six clip states; visual approval remains pending.`);
