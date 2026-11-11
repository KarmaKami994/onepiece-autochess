# Feste Asset-Strategie — B10, B11 und B12

Stand: **09.11.2026**. Basis: B09-Squash `74cea3577eba98a07911b2d488abd3ece20b373d`.
Plan vom 09.11.; B10 wurde am 11.11.2026 beauftragt. Kandidat, Stilkarte und
Prüf-/Abnahmestand: [B10_ASSET_PRODUKTION.md](B10_ASSET_PRODUKTION.md).
B10 wurde am 11.11.2026 über PR #72 als `4555674` squash-gemergt.
B11 wurde im selben Auftrag freigegeben; Umsetzung und Prüfstand:
[B11_CHARACTER_ANIMATION_COMPLETION.md](B11_CHARACTER_ANIMATION_COMPLETION.md).
B12 bleibt ein späterer, gesonderter Auftrag.

## 1. Ziel und Grenze

Fehlende beziehungsweise unzureichend animierte One-Piece-Figuren werden mit
einem einheitlichen, wiederholbaren Verfahren vervollständigt. Items erhalten
eine dazu passende, gut erkennbare Bildsprache. Gute vorhandene Sprites bleiben
erhalten; ein kompletter Austausch des Rosters ist kein Ziel.

Alle drei Batches sind Präsentations-/Asset-Arbeit. Unverändert bleiben
Gameplay, Balance, Charakter-/Item-/Trait-IDs, Rezepte, Kampf-/Battle-RNG,
Bot-Policy, Timings, Form-Auslösung, Pool, Ökonomie und PvE-Topologie.
GameContent bleibt `1.34.0`, Save Schema `6`. Keine neuen spielbaren Figuren,
Formen oder Items; neue Figuren im Content benötigen einen eigenen Auftrag.
Keine Netzwerkabhängigkeit im Spiel und kein Produktions-Soak/Baseline-Lauf.

## 2. Belegter Bestand und tatsächliche Lücken

Aus `game/content.ts`, Animation-/Visual-Manifesten, Source-Matrix und lokalen
Atlas-Metadaten gelesen; Crew-/Item-Kontaktbögen visuell angesehen.
Keine neue Asset-Validierung oder Test-Suite für diesen Plan ausgeführt.

| Bereich | Vorhanden | Konsequenz für die Arbeit |
| --- | --- | --- |
| Crew | 34 Definitionen mit bevorzugten v2-Animationen; Luffy hat einen separaten Importpfad | Alle sechs Clips beurteilen; gute Zeichnungen behalten, falsche automatische Zuordnung kuratieren. |
| Source-Matrix | 57 Einträge: 33 Crew + 24 PvE; 41 `auto-frame-map`, 16 `procedural-cutout` | Luffy separat erfassen. Automatische Komponentenwahl ist noch kein Nachweis einer passenden Bewegung. |
| PvE | 29 Definitionen, teilweise bewusst gemeinsam genutzte Faktionsdarstellung | Pro visueller Identität arbeiten, nicht 29 unabhängige Grafiksätze erzwingen. |
| Formen | Demonio Fleur, Boundman, Snakeman, Monster Point: SVG-Portrait/Token/Overlay | Eigenständige animierte Formkörper fehlen im bisherigen Manifest; Badge/Overlay ist kein Form-Sprite. |
| Items | 65 SVG-Icons: 10 Komponenten + 55 fertige Items | Kein Datei-Notstand. Identität, Kontrast und Stil verbessern, nicht neue Items erfinden. |
| Weitere Icons | 3 Food-, 13 Trait- und 12 Status-Identitäten | Im gleichen Stil halten, Status weiterhin durch Form/Text unterscheidbar. |

Konkrete Priorität aus `detection.characterCandidateCount` und den tatsächlich
benutzten `frames[].sourceRect` der aktuellen Atlanten:

| Figur | Erkannte Figurenposen | Verschiedene verwendete Quellrechtecke | Aktuelle Ausgabe |
| --- | ---: | ---: | --- |
| Koala | 3 | 3 | 46 Slots |
| Killer | 2 | 2 | 46 Slots |
| Caesar Clown | 4 | 4 | 46 Slots |
| Pica | 3 | 3 | 46 Slots |
| Kaido | 2 | 2 | 46 Slots |

Diese Zahlen beweisen eine begrenzte Pose-Auswahl, nicht die visuelle Qualität
jedes Einzelbilds. Sabo und Blackbeard stammen ebenfalls aus Great Pirate
Colosseum, haben aber 219 beziehungsweise 109 erkannte Kandidaten: nicht alle
Quellen dieses Spiels pauschal als Support-Sheets behandeln.

`selectAutoFrames()` verteilt Kandidaten nach Index/Geometrie auf Clips;
`procedural-cutout` ergänzt Verschiebung, Skalierung und Effekte. Damit gibt es
technisch vollständige Atlanten, aber noch keinen garantierten Walkcycle oder
charaktertypischen Angriff. Genau diese Qualitätslücke bearbeiten B10/B11.

## 3. Verbindliche Produktionsstrategie

### 3.1 Ein Verfahren für jede Figur

1. **Inventarisieren:** ID, Körperklasse, vorhandene Quelle, sechs Clip-Defizite
   und vorhandene Form-Zuordnung in einer kleinen Asset-Arbeitsliste erfassen.
   Status je Clip: `behalten`, `kuratieren`, `neu zeichnen`, `abgenommen`.
2. **Beste geeignete Quelle verwenden:** vorhandenes freigegebenes vollständiges
   Sheet zuerst; passende Posen explizit markieren. Der Scanner bleibt Suchhilfe.
   Wenige Support-Posen dienen als Identitätsreferenz, nicht als fertiger Walkcycle.
3. **Eine Master-Figur festlegen:** genau eine akzeptierte Grundpose mit festem
   Outfit, Gesicht, Proportionen, Farben, Waffen und Blickrichtung speichern.
   Alle neuen Clips werden aus dieser Figur entwickelt, nicht separat aus Text.
4. **Fehlende Posen herstellen:** referenz-/posegeführte Generierung als Entwurf,
   danach Pixelkorrektur und Pose-/Frame-Arbeit in LibreSprite/Aseprite-kompatiblem
   Quellformat. Für nicht unterstützte Körperformen direkt manuell zeichnen.
5. **Clips ausdrücklich abnehmen:** Antizipation, Aktion und Rückkehr müssen zur
   Figur passen. FX bleiben von Körperposen getrennt; FX/Wackeln ersetzen keine
   Bein-, Arm- oder Körperbewegung.
6. **Lokal exportieren:** ausschließlich gespeicherte, akzeptierte Quellen
   durch die vorhandene Pipeline packen. Kein Cloud-Aufruf bei Build, CI oder Spiel.
7. **Im Spiel vergleichen:** Animation Lab, Kontaktbogen/GIF und ein eingefrorener
   Kampf bei 1280×720 und 1920×1080; erst danach die bevorzugte Darstellung wechseln.

### 3.2 Feste Werkzeugrollen

- **Source-Matrix + kuratierter Frame-Map:** Herkunft, Auswahl und Exporteingang.
- **LibreSprite / vorhandene Node-/Sharp-Pipeline:** verbindliche bearbeitbare
  Quelle, Pixelkorrektur, Frame-Reihenfolge, Pivot und lokaler Export. Keine neue
  Dependency oder neue Asset-Service-Architektur.
- **PixelLab:** vorgesehenes Hilfsmittel für fehlende referenz-/posegeführte
  Körperframes, kein Qualitätsbeweis und keine Runtime-Abhängigkeit. Seine
  offiziellen Unterlagen beschreiben Referenzbilder und wiederverwendbare
  Skelettposen; siehe Quellen unten.
- **Allgemeine Bildgenerierung:** allenfalls Master-/Konzeptentwurf, niemals
  ein ungeprüftes komplett generiertes Spritesheet direkt in die Produktion.

In dieser Sitzung sind keine PixelLab-Tools im aktiven Tool-Katalog verfügbar,
obwohl eine lokale Skill-Anleitung vorhanden ist. B10 klärt den Zugang vor einem
kostenpflichtigen Auftrag; keine Zugangsdaten ins Repository. Das ist heute
keine behauptete funktionierende Integration. Der feste lokale Quell-/Exportweg
funktioniert auch mit manuell gezeichneten Posen. Kein Provider-Wechsel mitten
in einer Figur, keine Serie von unabhängig neu generierten Figurenstilen.

KI-Ausgaben sind **nicht** als identisch regenerierbar anzunehmen. Reproduzierbar
ist der lokale Export der eingefrorenen, versionierten Eingabedateien. Prompt,
Modell/Tool-Version, Einstellungen, Seed falls angeboten, Referenz- und Output-
SHA-256 dokumentieren; akzeptierte Bilder speichern und beim Rebuild wiederverwenden.
Keine privaten Download-URLs oder Tokens speichern. Pro Clip höchstens drei
Entwurfsversuche; danach gezielte manuelle Korrektur oder als offen kennzeichnen.

### 3.3 Fester visueller und technischer Vertrag

| Aspekt | Vorgabe |
| --- | --- |
| Stil | Beste vorhandene Gigant-Battle-artige Pixel-Sprites als Referenz; leicht seitliche 3/4-Ansicht, keine Mischung mit Chibi-/Foto-/3D-Stilen. |
| Identität | Ein Master pro Figur/Form. Gesicht, Haar, Outfit und Waffen bleiben zwischen Frames gleich. |
| Ausrichtung | Eine kanonische Rechtsausrichtung; bestehendes horizontales Spiegeln beibehalten. Keine neue 4-/8-Richtungslogik im Renderer. |
| Pixel | Transparenter Hintergrund, harte Kanten, ganzzahlige Platzierung, Nearest Neighbor; kein weiches Skalieren/Blur. |
| Maßstab | Körperklassen klein/normal/groß festlegen und an vorhandenen akzeptierten Figuren messen. Kein neues Einheitsmaß, das Chopper und Kaido gleich groß macht. Die in B10 akzeptierten Höhenbereiche sind für B11 verbindlich. |
| Frame | Bestehend: `128×128`, 46 Slots, 8 Spalten, `1024×768` Atlas. |
| Pivot | Neue Assets standardmäßig `(64,116)`; Bodenanker über Clips stabil. Luffys bestehende Ausnahme `(40,116)` bleibt explizit, kein pauschales Umpivotieren. |
| Farben | Gemeinsame Outline-/Licht-/Schattenregel aus B10; neue Master mit begrenzten, benannten Farbrampen. Gute importierte Figuren nicht automatisch umfärben. |
| Effekte | Körper und FX getrennt editierbar. Keine übergroße Effektfläche, die andere Kämpfer/HP-Balken verdeckt. |
| Performance | Bevorzugter Atlas unverändert sichtbarkeitsabhängig laden; kein gesamtes Roster vorladen. Normale Atlasgröße als Ziel ≤512 KiB, begründete große Pilot-Ausnahme ≤1 MiB. |

Die sechs bestehenden Clip-Bereiche und Raten bleiben erhalten:

| Clip | Slots | FPS | Mindestinhalt für neu gezeichnete Clips |
| --- | --- | ---: | --- |
| Idle | 0–5 | 8 | 3 gezeichnete Körperposen, ruhiger geschlossener Loop |
| Move | 6–13 | 16 | 6 Posen mit belastbarem Schritt-/Gewichtswechsel |
| Attack | 14–21 | 14 | 5 Posen: Vorbereitung, Ausholen, Trefferpose, Rückführung |
| Cast | 22–33 | 12 | 6 Posen mit eigener Fähigkeitsidentität, FX getrennt |
| Hit | 34–37 | 12 | 2 erkennbare Reaktionsposen, stabile Identität |
| Defeat | 38–45 | 10 | 5 nachvollziehbare Posen bis zur Endlage |

Die Minima sind Qualitätsvorgaben dieses Plans, keine Zusicherung des Generators.
Holds für Rhythmus sind erlaubt. Verschobene, gespiegelte, skalierte oder nur
mit FX übermalte Kopien zählen nicht als zusätzliche Körperpose. Bei starren
Objekten/monströsen PvE-Gegnern wird in B10 ein begründeter Bewegungstyp definiert,
statt menschenartige Schritte zu erzwingen. Clip-Raten/Repeats und Kampfticks
werden wegen einer Zeichnung nicht verändert; Darstellung bleibt Beobachter.

### 3.4 Herkunft, Ablage und Freigabe

- Bestehende schriftlich festgehaltene Nutzungsbasis beibehalten. Die genannte
  PAC-Code-Erlaubnis nicht automatisch als Herkunftsnachweis für jedes neue Bild
  behandeln; vorhandene One-Piece-Asset-Attestationen und eigene Zeichnungen
  entsprechend ihren tatsächlichen Quellen protokollieren.
- Vorhandene `art/animation-v2/source-matrix.json`, lokale Referenzen,
  `art/libresprite` und Exportpfade weiterverwenden. Für eigene neue Master ist
  ein kohärenter Unterordner wie `art/production/<id>/` zulässig; keine zweite
  konkurrierende Runtime-Registry.
- Je Asset: Quelltyp `importiert`/`selbst gezeichnet`/`KI-assistiert`, Herkunft,
  Autoren-/Contributor-Angabe soweit einschlägig, Nutzungsbasis, Input-Hashes,
  explizite Clip-Map, Editorquelle, Export-Hashes, QA-Bogen und Abnahmestatus.
- Neue Formen erhalten eigene Körperatlanten; ein kleiner typisierter
  Präsentations-Lookup darf `formId → Atlas → bisheriger Basis-Fallback` auflösen.
  Wirtschaftliche `definitionId` und vorhandene Form-Events bleiben unverändert.
- Statische Crew-/Form-Portraits und Tokens aus derselben akzeptierten Master-
  Identität ableiten; kein anders gekleidetes oder anders proportioniertes UI-Bild.
- Funktionierende v1/v2-/Icon-Fallbacks und historische Referenzen behalten.
  Nicht mehr automatisch mit einer alten `auto-frame-map` einen abgenommenen
  handgezeichneten Clip überschreiben; der explizite Quellenweg hat Vorrang.
- Einmalige Stilabnahme an den fertigen B10-Piloten vor Serienproduktion.
  Danach keine neue Grundsatzfrage für jede Figur; gleicher Vertrag für B11/B12.

## 4. Die drei abarbeitbaren Batches

### B10 — Produktionsstandard, Quellenlücken und vollständige Piloten

**Ziel:** Den oben beschriebenen Weg mit echten Ergebnissen beweisen und den
Stil festschreiben, bevor dutzende Figuren entstehen.

**Auftrag bei späterer Freigabe von B10:**

1. Auf aktuellem main eine Task-Branch anlegen; bestehenden Runtime-Vertrag
   beibehalten. Inventar aller 34 Crew, 4 Formen und 24 PvE-Visual-Identitäten
   mit sechs Clip-Zuständen erstellen; Referenz-/Codebefund von visueller Abnahme trennen.
2. Stilkarte mit Körperklassen, Farben/Outline, Bodenanker, Facing, zulässigen
   FX und Beispielen bei tatsächlicher Board-Größe erstellen.
3. Vorhandene vollständige Sheets kuratieren; Zugang und genaue Parameter des
   gewählten Entwurfswerkzeugs einmal belegen. Keine Generierung im normalen Build.
4. **Drei komplette Charakterpiloten:** Koala (normale Crew/3 Posen), Kaido
   (großer Boss/2 Posen), Robin Demonio Fleur (fehlender eigener Formkörper).
   Jeweils alle sechs Clips; Master, editierbare Quelle, Frame-Map, Atlas,
   passende statische Identität und QA. Minimale Form-Atlas-Präsentation einbinden.
5. **Drei Icon-Piloten:** Sea-Prism Shard (Komponente), Black Blade (Kontrast eines
   dunklen fertigen Items), Emperor's Jolly Roger (Trait-Badge). Vorhandene IDs,
   Pfade und Fallbacks erhalten; noch kein Austausch aller 65 Icons.
6. Import-/Exportpfade nur so weit ergänzen, dass akzeptierte lokale Quellen
   deterministisch exportieren und nicht vom alten Heuristikpfad überschrieben werden.

**Lieferobjekte:** Stilkarte, vollständige Arbeitsliste, drei animierte Piloten,
drei Icon-Piloten, editierbare Quellen, Provenienz, Vergleichsbögen/GIFs und
Vorher-/Nachher-Screenshots. Ein begrenzter PR; keine B11/B12-Serienproduktion darin.

**Abnahme:** Alle sechs Clips sinnvoll, Körperidentität stabil, Fußanker ruhig,
Form sichtbar eigenständig, Icons bei 24/32/48 px erkennbar, kein Körper nur
verschoben/skaliert. Beide Board-Größen geprüft. Die akzeptierten Piloten und
die Stilkarte werden als Referenzen für beide Folgebatches eingefroren.

### B11 — Fehlende Charakter-/Formanimationen und PvE vervollständigen

**Voraussetzung:** Abgenommene B10-Piloten und Stilkarte. Kein neuer Stilversuch.

**Auftrag bei späterer Freigabe von B11:**

1. Zuerst **Killer, Caesar Clown und Pica** vervollständigen. Koala/Kaido aus
   B10 übernehmen und nicht erneut generieren.
2. **Gear 4 Boundman, Gear 4 Snakeman und Monster Point** mit eigenständigen
   Körperatlanten ergänzen; Demonio aus B10 übernehmen. Bestehende Unlocks,
   Catalyst-Regeln, temporäre Rückwandlung und Event-/Replay-Semantik erhalten.
3. Die übrigen Crew und benannten Bosse nach der B10-Liste abarbeiten:
   schlechte Clip-Zuordnung durch explizite Auswahl korrigieren; nur wirklich
   fehlende Körperposen herstellen. Vorhandene gute Zeichnungen nicht ersetzen.
4. Die **16 procedural-cutout PvE-Visuals** (acht generische Archetypen und acht
   Faktionsidentitäten) mit jeweils passender Bewegung versehen. Faktions-
   Varianten dürfen ihre bestehende gemeinsame Darstellung behalten; keine
   zusätzliche spielbare Figur oder Veränderung ihrer Kampfprofile.
5. Für jede aktive Identität sechs akzeptierte Clips oder eine in B10
   festgelegte, begründete Ausnahme liefern; statische Bilder mitziehen.
   Nur die Darstellung in Manifesten/Phaser/Animation Lab anpassen, wenn nötig.

**Lieferobjekte:** Abarbeitung aller B10-Defizite, neue/korrigierte Quellen und
Frame-Maps, Atlanten, Form-Portraits/Tokens, vollständige Kontaktbögen und
nachvollziehbare Liste der bewusst unverändert gelassenen guten Assets.

**Abnahme:** 34 Crew und alle vier Formen nachvollziehbar abgedeckt; 29 PvE-
Definitionen lösen ihre korrekten Visuals auf. Keine Figur fällt still auf
eine fremde Identität zurück. Aktive Formwechsel, Tod/Phoenix, Bewegung,
unterschiedliche Perspektiven und Save/Replay zeigen die richtige Figur.
Neue zukünftige Charaktere gehören ausdrücklich nicht in diesen Batch.

### B12 — Items, Food und UI-Icons konsistent fertigstellen

**Voraussetzung:** B10-Icon-Piloten; Integration nach B11 auf aktuellem main.

**Auftrag bei späterer Freigabe von B12:**

1. Die **10 Komponenten und 55 fertigen Items** im akzeptierten Stil fertigstellen;
   B10-Piloten wiederverwenden. Ähnliche Gegenstände müssen durch Silhouette,
   Material und Details unterscheidbar sein: beispielsweise Shard/Stone,
   Cola-Komponente/Reservoir/Engine und die unterschiedlichen Bücher/Schärpen.
2. Feste Icon-Produktion: 48×48 Pixel-Master, transparente Fläche, gleiche
   Licht-/Outline-Regel, maximal vier Material-Schattierungsstufen. Der bisherige
   96×96-SVG-Ausgabe-/Pfadvertrag bleibt bestehen: Pixelraster/zusammenhängende
   Pixelreihen ganzzahlig 2× als Rechtecke exportieren. Keine eingebetteten
   Raster-Data-URIs und kein neuer Runtime-Downloader. Bestehende Generatoren nur
   mit einer kleinen lokalen Exportfunktion ergänzen, keine Dependency hinzufügen.
3. Komponenten-/Completed-Rahmen und Trait-Badges erhalten. Icons zuerst bei
   24/32/48 px auf dunklem und hellem Grund beurteilen; insbesondere Black Blade
   braucht genügend Kontrast. Namen/Beschreibungen bleiben die semantische Quelle.
4. Die **3 Food-, 13 Trait- und 12 Status-Icons** auf denselben Stil-/Kontrast-
   Vertrag bringen, gute bestehende Icons behalten. Food bleibt außerhalb von
   Ausrüstung/Rezepte; Status nie allein über Farbe unterscheiden.
5. Shop, Inventar, Crafting-Vorschau, Inspector, Carousel, Hafen, Galley,
   Kodex, Planner, Ergebnisse und Chronicle mit denselben Identitäten versorgen.
   Aktuelle Asset-Pfade/Content-Daten behalten, damit bloße Art-Verbesserung
   keinen Gameplay-Content-Hash oder Save-/Replay-Vertrag verändert.

**Lieferobjekte:** Einheitlicher Icon-Katalog, editierbare Quellen, JSON-/Pixel-
Spezifikationen, deterministische SVGs/Hashes, Typ-/Badge-Legende, Kontaktbögen
und Screenshots der realen Einsatzorte. Kein neuer Item-Effekt und kein neues Rezept.

**Abnahme:** Exakt 65 Item-Identitäten und alle 55 Rezepte unverändert; Food,
Traits und Status vollständig zugeordnet. Alle Icons im Inventar/Board-UI
lesbar, keine getauschten IDs, keine fehlenden Badge-/Glyph-Fallbacks und keine
externen Asset-Requests. Kein zweiter parallel gepflegter Item-Katalog.

## 5. Prüfung, Veröffentlichung und Stop-Regeln

- In diesem Planungsauftrag: Quellen-/Metadaten-/Bildinspektion und Merge-Handoff,
  keine neuen Tests, Builds, Asset-Generierung oder CI-Starts für den Plan.
- Bei jedem späteren Batch vor Prüfungen den konkreten Umfang einmal genehmigen
  lassen, solange die bestehende Anweisung des Eigentümers gilt; keine erneute
  Nachfrage innerhalb eines bereits freigegebenen Umfangs.
- Vorgesehene Prüfungen: betroffene Asset-/Manifest-/Frame-Map-Tests,
  Asset-/Provenienz-Validierung, visueller Vergleich aller sechs Clips,
  Typecheck/Lint/Build bei Source-Änderungen und gezielte Browserfälle in beiden
  Desktop-Größen. Volle Unit-Suite nur bei entsprechend übergreifender Änderung
  oder normaler CI. Keine Serien-Wiederholung nach jeder Datei.
- Ein freigegebenes Asset muss aus lokal fixierten Quellen erneut dieselben
  Runtime-Outputs erzeugen. Tests nur auf 46 Slots/Dateiexistenz reichen nicht;
  die Clip- und Identitätsabnahme ist ein eigenes Lieferobjekt.
- Bestehende Tests/Timeouts nicht abschwächen, keinen sichtbaren Fehler mit
  Force-Clicks oder vertauschten Referenzbildern verdecken.
- Pro Batch ein kohärenter Branch/PR, mehrere thematisch passende Commits möglich.
  Keine Asset-Neuerzeugung im CI und keine Tokens/Cloud-Zugangsdaten im Repository.
- Kein automatischer nächster Batch und kein automatischer Merge. Bei
  unpassender Qualität die bisherige funktionierende Grafik behalten und die
  konkrete offene Pose dokumentieren; nicht als vollständig abgenommen markieren.

## 6. Quellen und Begründung

Lokal: `art/animation-v2/source-matrix.json`, `components/crewAnimationManifest.ts`,
`components/gameVisualManifest.ts`, `scripts/assets/build_v2_animation.mjs`
(`selectAutoFrames`, `renderProceduralCutout`), `scripts/build_v2_assets.mjs`,
`scripts/assets/build_ui_icons.mjs`, Atlas-Metadaten der fünf oben genannten
Figuren sowie `art/qa/p7-crew-contact-sheet.png` und `p7-item-contact-sheet.png`.

Offizielle externe Quellen, am 09.11.2026 gelesen:

- [PixelLab — Animate with skeleton](https://www.pixellab.ai/docs/tools/animate-with-skeleton): referenz-/posegeführte Animation und wiederverwendbare Skelettvorlagen als Grundlage für konsistente Körperbewegung.
- [PixelLab — Animation with text](https://www.pixellab.ai/docs/tools/animation): Referenzbilder, ausgewählte Frames, manuelle Korrekturen; Empfehlung des Skelettverfahrens für Charaktere.
- [PixelLab — MCP](https://www.pixellab.ai/mcp): dokumentierte Character-/Animationswerkzeuge; keine Aussage, dass sie in dieser konkreten Sitzung verbunden sind.
- Die in dieser Sitzung bereitgestellte lokale Skill-Anleitung `pixellab-mcp/SKILL.md` wurde für den Workflow gelesen; sie ist keine Repository-/Build-Abhängigkeit. Bei abweichender Tool-Verfügbarkeit gelten der aktive Katalog und die tatsächlichen Anbieterparameter, nicht eine pauschale Setup-Behauptung der Anleitung.

Keine PAC-Spielregel wird hier übernommen. Die bestehende PAC-Erlaubnis und der
gepinnten Gameplay-Referenzstand bleiben unverändert; dies ist ein lokaler
Art-Produktionsplan, keine neue System-/Balance-Recherche.
