# B12 — Items, Food und UI-Icons

Stand: 12.11.2026. Basis: B11-Squash `b40b68fbca7a47b9b2d9f11380c40a4f21d39656`
(PR #73, auf ausdrücklichen Besitzerauftrag gemergt). Dessen letzte CI #187
scheiterte beim Playwright-Systempaketdownload an Ubuntu-Mirror-DNS; das ist
keine Behauptung einer vollständig grünen B11-CI. Branch: `codex/b12-item-food-ui-icons`.
Quell-/Test-/Asset-Commit: `3f62843c9f6721b11d79dd7443b4c0a23860a42b`.

## Umfang und Legende

| Familie | Bestand | Darstellung / Bedeutung |
| --- | ---: | --- |
| Komponenten | 10 | Silberner Rahmen; unveränderte Rezeptzutat |
| Fertige Items | 55 | Goldener Rahmen / Ecknieten; unveränderter Effekt |
| Trait-Items | 10 der 55 | Eigenes Trait-Symbol unten rechts; Name/Beschreibung erklären den Grant |
| Food | 3 | Grüner Speiserahmen; Galley-Verbrauch, keine Ausrüstung/Rezeptzutat |
| Traits | 13 | Runder Rahmen und eigener Hut/Anker/Krone/Rad/Faust/usw. |
| Status | 12 | Eckiger Rahmen und eigene Geometrie, nicht nur Farbcodierung |

93 lokale Identitäten, davon drei unverändert übernommene B10-Piloten:
Sea-Prism Shard, Black Blade und Emperor's Jolly Roger. Alle 65 Item-IDs,
55 Rezepte, Glyph-Fallbacks, Asset-Pfade und Content-Daten bleiben erhalten.
Shard/Stone, Klingenfragment/Klinge, Cola-Canister/Reservoir/Engine,
Logbook/Codex/Grimoire, Schärpen sowie Goggles/Scopes haben unterschiedliche
Körperformen bzw. Ausstattung. Die dunkle Black Blade behält ihre helle Schneide.

Inventar, Inspector, Shop-Bonds, Crafting-Hinweise, Carousel, Hafen, Galley und
Kodex verwenden die bisherigen Pfade. Planner, Ergebnis-Crew und Chronicle-
Inventar zeigen zusätzlich dieselben Itembilder neben den vorhandenen Namen.
Der bisherige `VisualIcon`-Fallback ist dafür unverändert in einer kleinen
gemeinsamen Präsentationskomponente untergebracht. Text, native Selects,
Screenreader-Namen und aufgezeichnete IDs bleiben die semantische Quelle;
keine zusätzlichen Icons werden in die Spielzustände geschrieben.

## Fester lokaler Produktionsweg

- Einziger Katalog bleibt `art/ui-icons/*-icons.json`. Keine zweite gepflegte
  Itemliste; `provenance.json` ist ein erzeugter Nachweis dieses Katalogs.
- `art/production/b12/<family>/<id>.json`: editierbare 48×48-Palette/Pixelzeilen;
  daneben abgeleiteter PNG-Master und editierbares Rechteck-SVG.
- Harte transparente Außenkante, warm-dunkle Outline, Licht links oben,
  höchstens vier Töne pro Material (Food drei). Keine Filter, Raster-Data-URIs,
  Downloads oder neuen Abhängigkeiten.
- `npm run assets:b12` liest nur eingefrorene Quellen und exportiert ganzzahlige
  2×-Rechtecke als 96×96-SVGs. Gleiche Quellen ergeben gleiche Outputs.
  Der bestehende `assets:ui`-/`assets:food`-Weg liest dieselben Quellen.
  B10-Piloten werden direkt aus den akzeptierten Originalmastern übernommen.
- `author_b12_icons.mjs` ist ausschließlich ein expliziter lokaler Autorenweg;
  vorhandene Quellen schützt er ohne `--replace-authoring-source` vor Ersatz.
  Normale Exporte, Build, CI und Spiel rufen ihn nicht auf.
- Projekt-authored Pixelzeichnungen; keine neue Fremdquelle, kein Provider und
  keine neue Lizenzbehauptung. Quell-/Master-/Export-/Generator-SHA-256 stehen
  in `art/production/b12/provenance.json`; Food behält seine bestehende
  Validierungsschnittstelle in `art/ui-icons/food-provenance.json`.

Kontaktbögen: `art/qa/b12/{items,food,traits,status,identity-comparisons}.png`.
Jede Identität steht bei 24/32/48 px auf dunklem und hellem Grund; die Bögen
wurden gesichtet. Browseraufnahmen der echten Einsatzorte folgen unter
`art/qa/b12/browser/`, keine montierten UI-Mockups.

## Prüfung und Grenzen

Besitzerfreigabe für fokussierte Tests, Typecheck/Lint, Assets, Build, beide
Desktop-Browsergrößen und normale PR-CI liegt vor. Fokussierte Assets/Fallback/
Provenienz: **109/109 PASS**; Planner/Kodex/Chronicle: **43/43 PASS**.
Typecheck, Lint, Asset-Validierung (137 Atlanten) und Build: **PASS**.
Browser: **14/14 vorgesehene Fälle PASS** bei 1280×720 und 1920×1080
(fünf neue B12-Fälle sowie Galley und Chronicle je Größe). Die Sichtung fand
eine fehlende Trait-Kodex-Bildzuordnung, die ergänzt und gesondert abgesichert
wurde. Neue Crafting-/Fallback-Fixtures wurden auf das bestehende Rezept und
den tatsächlichen Content-Namen korrigiert; keine Regeln oder bestehenden
Assertions geändert. B12-CI wird im PR/Handoff separat berichtet.
Pixelgleichheit, Grenzen und Hashes ergänzen die Sichtung; sie ersetzen keine
Geschmacksentscheidung über Artwork.

GameContent **1.34.0**, Save Schema **6**; kein Gameplay-/Content-Hash-Wechsel,
Effekt, Rezept, Food-Wert, Asset der Crew, Bot-/Balance-/RNG-Eingriff. Kein
separater lokaler Produktionslauf, keine Baseline und kein 1.000-Seed-Soak.
