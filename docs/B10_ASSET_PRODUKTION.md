# B10 — Produktionsstandard und sechs Piloten

Stand: **11.11.2026**. Basis: `74cea3577eba98a07911b2d488abd3ece20b373d`.
Branch: `codex/b10-asset-pilots`. **Lokale technische Prüfung abgeschlossen; Owner-Stilabnahme offen.** B11/B12 beginnen erst nach dieser Abnahme.
GameContent `1.34.0`, Save Schema `6`; keine Domain-, Timing-, RNG- oder Balanceänderung.

## Ergebnis und Herkunft

- Koala, Kaido und Robin Demonio Fleur: je ein fester Master, 36 getrennte
  Körperzeichnungen, explizite Auswahl/Holds für 46 Slots, sechs Clip-GIFs,
  128px-Pixelquelle, bearbeitbare `.aseprite`-Arbeitskopie, Atlas und statische Identität.
- Sea-Prism Shard, Black Blade und Emperor's Jolly Roger: handgezeichnete
  48px-SVG-Pixelmaster, 96px-Runtime unter den bisherigen Pfaden, Größenbogen.
- [Inventar](B10_ASSET_INVENTAR.md): 34 Crew, 4 Formen, 24 PvE-Identitäten,
  alle sechs Clip-Arbeitszustände. Eine Quellrechteckzahl ist kein Qualitätsurteil.

Vorhandene Quellen werden bevorzugt. Die vom Owner genannte
[Kaido-Datei 21137](https://spritedatabase.net/file/21137) ist bereits lokal vorhanden:
`art/licensed-reference/great-pirate-colosseum/Kaido.png`, Contributor **Megadoomer**,
SHA-256 `6d79b1b23f29ae8114551b7626b2dead05f186cd060795c258cef9fd30197458`.
Sie enthält zwei Oberkörperposen und einen Effekt, keinen vollständigen Gehzyklus.
Koalas vorhandene drei Körperposen sowie Robins/Zoros Gigant-Battle-Sprites dienen
ebenfalls als Identitäts-/Stilreferenz. Die Originale bleiben bytegleich erhalten.

PixelLab war weder im aktiven Toolkatalog noch in der Plugin-Suche verfügbar.
Deshalb wurden pro Figur genau **ein** Entwurfsbogen mit dem eingebauten
`image_gen` erstellt und anschließend lokal kuratiert: feste Posenwahl,
Nachbarfragmententfernung, harte Alpha-Maske, gemeinsames Farbschema und registrierte
Bodenanker. Keine Bildgenerierung während Build, CI oder Spiel.
Die neuen Posen sind **KI-assistierte Ableitungen**, keine weiteren Original-Rips
von Megadoomer oder vollständige bisher übersehene Spiel-Sheets.

Parameter/Prompts, Originalreferenzen, SHA-256, Werkzeuggrenzen und tatsächliche
Ausgabemaße stehen in `art/production/b10/provenance.json`, `curation.json`,
den drei `prompt.txt` und `outputs.json`. Modellkennung und Seed sind vom Tool
nicht offengelegt; identische Neugenerierung wird nicht behauptet. Der lokale
Export arbeitet ausschließlich mit eingefrorenen, SHA-gepinnten PNGs/Frame-Maps.

## Stilkarte

| Merkmal | Festlegung für neue Arbeit |
| --- | --- |
| Kleine Körper | 40–56px sichtbare Standhöhe; vorhandener Chopper als Größenanker. |
| Normale Körper | 70–88px; Koala-Master 82px. Gute vorhandene Crew wird nicht umskaliert. |
| Große Körper/Formen | 90–104px; Kaido 100px, Demonio 94px. Attacken dürfen breiter werden, bleiben im Frame. |
| Anzeige | Bestehende Display-Größen bleiben: Crew 88px, Kaido 108px; Bankfaktor unverändert. |
| Frame/Pivot | 128×128; Bodenanker (64,116), 8 Spalten / 46 Slots / 1024×768. Luffy bleibt (40,116). |
| Perspektive | Leichte 3/4-Rechtsausrichtung, vorhandenes horizontales Spiegeln. Keine zusätzlichen Richtungen. |
| Kanten/Licht | Harte Alpha-Kante, Nearest Neighbor, keine Glättung/Dither; warm-dunkle Outline, Licht links oben. |
| Palette | Je Pilot ein gemeinsamer 32-Farben-Satz über alle Posen. Koala: Rot/Rosa/Braun; Kaido: Schwarz/Tan/Violett; Demonio: Schwarz/Violett mit hellem Gesicht. Vorhandene gute Sprites nicht umfärben. |
| Körper vs. FX | Körper enthält keine Aura/Partikel; `fx-poses.png` ist eine separate leere editierbare Ebene. Bestehende Runtime-FX bleiben zuständig. |
| Icons | 48px-Master mit ganzzahligen Pixelkonturen; 96px-Export, lesbare Silhouette bei 24/32/48px. Dunkle Klinge mit heller Schneide; Trait-Badge mit Krone und violettem Schild. |

`art/qa/b10/style-card.png`: links jeweils alter Sprite, rechts Pilot; obere
Reihe 128px, untere Reihe bisherige Board-Anzeigegröße. Robin vergleicht den
bisherigen Basiskörper mit Demonio. Das ist ein lokaler Größenbogen, **kein
behaupteter Browser-/Kampf-Screenshot**. `icon-sizes.png`: 24, 32, 48, 96px.

Alle sechs Clip-Raten/Repeats bleiben unverändert (8/16/14/12/12/10 FPS).
Holds stehen ausdrücklich in `frame-map.json`. Gang, Palm-/Keulenaktion,
Mehrarm-Clutch, Trefferreaktion und Fall haben eigene Körperzeichnungen;
Ganzkörperverschiebung, Skalierung und FX zählen nicht als zusätzliche Pose.
Kaido verwendet schweres bodengebundenes Gehen statt künstlichem Schweben;
Demonios Flügel begleiten Schritte, erzeugen keine Flugmechanik. Abnahmekriterien
bleiben die Minima aus dem B10–B12-Plan; Metadaten ersetzen diese Sichtung nicht.

## Lokaler Quell- und Exportweg

1. Autoritative Pixelquelle: `art/production/b10/<id>/body-poses.png`, sechs
   Zeilen × sechs Posen. Master/Frame-Map daneben; FX getrennt. `.aseprite`
   ist eine bearbeitbare 46-Frame-Arbeitskopie für Clip-Sichtung/Korrektur.
2. Bei manueller Korrektur die geänderten Posen in das eingefrorene Quellboard
   zurückführen, Master/Map passend halten und **bewusst** Source-/Map-Hashes in
   der bestehenden `art/animation-v2/source-matrix.json` aktualisieren.
3. `npm run assets:b10` exportiert nur diese drei Piloten und drei Icons:
   Runtime-Atlanten, statische Identität, GIFs, Kontaktbögen und Output-Hashes.
   `node scripts/assets/build_b10_assets.mjs --editable` erzeugt die
   Arbeitskopien; kein solcher Editorlauf im normalen Build.
4. `assets:v2` respektiert `authored-frame-map` und `authored-pose-board`:
   explizite Map statt Scanner; normale Rebuilds überschreiben die
   Editorquellen nicht. Source- **und Map-Hash** sind Exportvoraussetzung.
   `assets:ui` übernimmt die drei Iconmaster sowie Demonios abgeleitete SVGs.
5. `curate_b10_drafts.mjs` ist ausschließlich der ausdrücklich aufgerufene
   Entwurfs-/Autorenweg. Es ist nicht Teil von `assets:all`, Build oder CI.
   Bestehende eingefrorene Quellen werden ohne `--replace-authoring-source`
   absichtlich nicht erneut aus dem Entwurf erzeugt.
   Rohentwürfe und alte Icons/Form-Badges bleiben als Vergleich erhalten.

Neue Atlasnamen sind `koala-b10-v2`, `kaido-b10-v2` und
`robin-demonio-fleur-b10-v2`; bisherige v2/v1-Dateien bleiben unverändert.
Der kleine Präsentations-Lookup ergänzt nur diese Kandidaten. Demonio gehört
ausschließlich zu Robin; unbekannte/fremde Formen behalten die Basis-Fallbacks.
Die permanente Form ist schon im eingefrorenen Kampfaufbau bekannt; Kampf-Events
und temporäre Gear-4/Monster-Point-Regeln ändern sich nicht. Kein neues Roster-Preload.
Animation Lab stellt die Form neben den bevorzugten Basiskörper. Die frühere
v1/v2-Basis bleibt über die gewöhnliche Robin-Auswahl erreichbar; so wird keine
dritte Vergleichskarte am unteren Viewportrand abgeschnitten. Der Lab-Einstieg
wartet wie Crew Tools auf abgeschlossene Start-/Save-Initialisierung.

## Verifikation und offene Stilabnahme

Owner-Freigabe für diesen Prüfumfang: **11.11.2026**.

| Prüfung | Ergebnis |
| --- | --- |
| Typecheck / Lint | PASS; abschließend geänderte Dateien erneut geprüft. |
| Fokussierte Unit-/Asset-Tests | PASS, 6 Dateien / 33 Tests einschließlich Content-/Schema-Regression; korrigierter Zwei-Dateien-Lauf 13/13. |
| Asset-/Provenienz-Validierung | PASS, einschließlich aller 79 Atlanten. |
| Produktionsbuild | PASS, bestehende nichtfatale Vinext-Hinweise unverändert. |
| Browser 1280×720 / 1920×1080 | PASS, final 4/4; gezielte tatsächliche Board-Aufnahme zusätzlich 2/2. |
| Geschützte Pfade / Format | PASS: Domain, Harness, historische Analyse, Original-Sheets und alte Luffy/Koala/Kaido-Atlanten unverändert. |
| Normale GitHub-CI | Separates Exact-Head-Mergegate; aktueller Status über den Task-PR / [Workflow](https://github.com/KarmaKami994/onepiece-autochess/actions?query=branch%3Acodex%2Fb10-asset-pilots). |
| Lokale volle Suite / Produktionslauf / Baseline / 1.000-Seed-Soak | NOT RUN; normale CI behält ihre gewöhnlichen Checks und ihren Smoke. |

Gefunden und korrigiert: Sharp führt Trim vor Extract aus, daher materialisiert
der Test die Zelle zuerst; früher Lab-Klick vor Initialisierung; ein unpassender
neuer Auswahlfeld-Selektor; abgeschnittene dritte Formkarte. Kein Testtimeout
oder bestehender Anspruch wurde gelockert. Windows benötigte einen lokalen
Temp-Cache und Host-Zugriff für den Testserver. Ein unveränderter Asset-I/O-
Timeout bestand den gezielten Wiederholungslauf.

Echte Browserbilder liegen je unter `art/qa/b10/browser/desktop-1280/` und
`desktop-1920/`: `koala-lab.png`, `kaido-lab.png`,
`robin-demonio-fleur-lab.png`, `b10-combat.png`. Die letzte Datei zeigt das
tatsächlich sichtbare Phaser-Board, nicht den oberen Planner-Bereich.
Card-Bounds, beide Facings, alle sechs Clips, alte Robin-Varianten und die
ausschließlich sichtbaren Kampf-Atlanten sind abgesichert. Alle drei Atlanten
liegen innerhalb des 512KiB-Ziels; Quellposen/Map-Pins/harte Alpha-Kanten sind geprüft.

**Offen bleibt die Owner-Abnahme von Identität, Choreografie und Stil** an den
Piloten/GIFs; technische Tests ersetzen sie nicht. Noch kein Clip wird deshalb
im Inventar als owner-abgenommen markiert. Keine automatische Freigabe von
B11/B12 oder Merge, kein lokaler Produktionslauf und kein neuer Balancebericht.
