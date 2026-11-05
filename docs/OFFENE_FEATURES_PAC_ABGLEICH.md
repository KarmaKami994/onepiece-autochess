# Offene Features und Anforderungen — One Piece Auto Chess

Stand: **04.11.2026**. Auftrag: den vorhandenen Projektstand mit Pokémon Auto Chess (PAC) vergleichen und offene beziehungsweise noch unvollständige Funktionen dokumentieren. Dieses Dokument ist eine Anforderungsliste; es setzt keine Funktion um und erteilt keinen Implementierungsauftrag.

**Fortschreibung:** B01 (F01/F06) ist in [PR #59](https://github.com/KarmaKami994/onepiece-autochess/pull/59) implementiert und lokal verifiziert. Ergebnisansicht und aktuelle Produktdokumentation sind damit erledigt; Details stehen im [B01-Abschluss](B01_RESULTS_COMPLETION.md). Die Befunde unten beschreiben den genannten Analysestand vor B01. Die weitere Aufgabenfolge steht in [den Task-Batches](TASK_BATCHES_PAC_AUSBAU.md).

B02 ergänzt F07/F10 mit dem [lokalen Kodex und Teamplaner](B02_CODEX_TEAM_PLANNER.md). Der ursprüngliche Befund bleibt als datierter Vergleich bestehen; aktueller Verifikations-/Review-Stand steht in `PROJECT_STATE.md`.

## 1. Grundlage und Vorgaben

- Analysiertes Projekt: `KarmaKami994/onepiece-autochess`, lokales `main` und GitHub-`main` auf **`918d16b88e182ac9c81d05c73deb651824d51df8`**. PR #58 mit der Bot-Diagnose ist darin enthalten.
- Aktuell: **GameContent `1.31.0`**, **Save Schema `6`**.
- PAC-Vergleich: `keldaanCommunity/pokemonAutoChess`, `master` zum Abruf auf **`13822d390ca0f2010881e910a6c3f73cf4df5653`**. Die Quellen unten sind auf diesen Commit fixiert.
- Die bisherigen PAC-Portierungsentscheidungen des Projekts beziehen sich auf **`a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`**. Der aktuelle Vergleich ersetzt diesen historischen Pin oder bereits beschlossene lokale Regeln nicht automatisch.
- **Vorgabe des Auftraggebers:** Die Erlaubnis zur Verwendung des benötigten PAC-Codes wurde eingeholt; der Auftraggeber ist Discord-Admin. Diese Angabe wird als Projektvorgabe dokumentiert. Bei einer späteren Übernahme sollen Quellpfad, Commit, Anpassungen und Erlaubnisbezug nachvollziehbar aufgezeichnet werden. PAC weist öffentlich GPL-3.0 aus; das lokale Repository derzeit MIT. Eine spätere Übernahme soll ihre zutreffenden Lizenzhinweise mitführen. In dieser Analyse wird kein PAC-Code übernommen.
- Aktueller Prototyp bleibt vollständig lokal/offline. Späteres Ziel bleibt ein kleiner privater serverautoritärer Multiplayer für Freunde.
- Determinismus, getrennte Command-Autorität, portable `game/`-Logik und Save-Kompatibilität bleiben verbindlich. React/Phaser stellen Ergebnisse dar; sie bestimmen keine Spielregeln.
- Keine automatische Bot-, Unit-, Item-, Economy- oder Captain-Damage-Anpassung. Smoker bleibt **frozen/watch**.

### Einordnung der Liste

**Belegte Lücke** bedeutet: Ein konkreter vorhandener Ablauf ist unvollständig oder eine ausdrücklich geplante Funktion fehlt. **Offene Untersuchung** bedeutet: Es gibt ein belegtes Problem beziehungsweise Signal, aber noch keine freigegebene Lösung. **PAC-Erweiterung** bedeutet: PAC hat eine Funktion, die lokal fehlt, aber bisher nicht zum verbindlichen Produktumfang gehört. Eine fehlende PAC-Funktion ist nicht automatisch ein Fehler.

Prioritäten sind Vorschläge für die Planung: **P1** = bestehendes Produkt vervollständigen oder eine Entscheidung absichern; **P2** = sinnvoller lokaler Ausbau; **P3** = separat zu entscheidende Erweiterung. Sie sind keine neuen Projektphasen und ersetzen keine Architekturfreigabe.

## 2. Bereits vorhanden — nicht erneut als offen einplanen

| Bereich | Aktueller Befund | Lokaler Beleg |
| --- | --- | --- |
| Spielkern | Lokales Match mit acht Teilnehmern, realem Shop, Gold/XP, gemeinsamem Pool, Stern-Merges, Aufstellung und deterministischem Kampf | [Engine](../game/engine.ts), [Economy](../game/economy.ts), [Roster](../game/roster.ts), [Combat](../game/combat.ts) |
| PvP | Globale Paarung, Ghosts, Ergebnisse und Captain Damage vorhanden | [Pairing](../game/pairing.ts), [Match Flow](../game/matchFlow.ts) |
| P4 Items | Zehn Komponenten, 55 Rezepte/Completed Items einschließlich zehn Trait-Grants, Crafting, Equip, UI und strukturelles Bot-Scoring vorhanden | [Items](../game/items.ts), [P4-Status ab P4C](P4_ITEM_SYSTEM_AUDIT.md#p4c-implementation-status) |
| P5/P10/P11 | PvE genau `1,2,3,9,14,19,24,28,32,36,40`; Carousel `4,12,17,22,27,34`; Supply Picks `5,8,11`; Voyage Recruitment `10/20` | [Stage-Content](../game/content.ts), [Recruitment](../game/voyageRecruitment.ts) |
| P12 Boss-Identität | Arlong, Enel, Lucci, Magellan, Hody, Caesar, Pica und Kaido samt Fraktionen; bestehende Kampfprofile bewusst beibehalten | [Content](../game/content.ts), [Profil-Regressionsfälle](../tests/game/p12-pve-boss-identity.test.ts) |
| Crew/Traits/Formen | 34 Crew-Definitionen, 13 Traits, Robin Demonio Fleur, zwei Gear-4-Formen und Chopper Monster Point vorhanden | [Content](../game/content.ts), [Formen](../game/forms.ts), [Form-System](CHARACTER_FORM_SYSTEM.md) |
| Präsentation | Crew-/PvE-Assets, Item-/Trait-/Status-Icons, eigene Form-Portraits/-Tokens/-Overlays vorhanden | [P7](P7_MAJOR_ASSET_PRODUCTION.md), [Visual Manifest](../components/gameVisualManifest.ts) |
| Bedienung | Tutorial, Hotkeys, Scouting/Spectating, Inspector, Craft-Vorschau, Kampfgeschwindigkeit, Reduced Motion, High Contrast und lokale Sounds vorhanden | [Screens](../app/screens/GameScreens.tsx), [GameClient](../app/GameClient.tsx) |
| Speichern | Aktiver IndexedDB-Spielstand, Battle-/Carousel-/Recruitment-Resume, Schema-6-Kompatibilität und Schutz gegen ältere Save-Schreibvorgänge vorhanden | [Voyage Persistence](../app/voyagePersistence.ts), [Save-Format](../game/persistenceFormat.ts) |
| Diagnose/Qualität | Automatisierte Tests/CI, Asset-Validierung, Produktions-Harness und optionale Bot-Progressionsdiagnose vorhanden | [CI](../.github/workflows/ci.yml), [Diagnose](P1B_BOT_PROGRESSION_DIAGNOSTIC.md) |

Insbesondere sind **P4C, Crafting, P11 Recruitment und P12 Boss-Präsentation nicht mehr ausstehend**. P1B-Diagnostik ist fertig; eine akzeptierte neue P1B-Progressionspolicy dagegen fehlt weiterhin.

## 3. Belegte Lücken und offene Entscheidungen

### F01 — Ergebnisansicht vollständig machen

**Status:** belegte UI-Lücke. **Priorität:** P1. **PAC-Einordnung:** lokale Korrektur; keine Portierung nötig.

`ResultsScreen` begrenzt die sichtbare Liste mit `view.resultCrew.slice(0, 8)`, während `maxLevel` 9 ist. Zudem speichert `returnEliminatedPlayerPieces` alle besessenen Units, also auch die Bench, in `finalCrew`; eine eindeutige Kennzeichnung der letzten eingesetzten Kampfaufstellung fehlt in diesem Snapshot. Die angezeigte Crew-Zahl und die sichtbaren Karten können dadurch auseinanderlaufen.

- **Anforderung:** Die vereinbarte Ergebnisliste vollständig anzeigen. Festlegen, ob sie die letzte Kampfaufstellung, sämtliche besessenen Units oder getrennte Board-/Bench-Listen repräsentiert. Diese Bedeutung in Snapshot und UI konsistent abbilden.
- **Abnahme:** Eine Neuner-Aufstellung verliert keine Karte; zusätzliche Bench-Units werden entweder ausdrücklich getrennt gezeigt oder begründet ausgeschlossen. Namen, Sterne, Formen und Items bleiben für Sieger und ausgeschiedene Spieler korrekt. Ältere Saves ohne zusätzliche Aufstellungsinformation erhalten einen ehrlichen Fallback.
- **Belege:** [ResultsScreen](../app/screens/GameScreens.tsx), [finalCrewUnits](../app/selectors.ts), [Eliminierungs-Snapshot](../game/engine.ts), [maxLevel](../game/content.ts).

### F02 — Bot-Diagnose um Gründe für Nichtkäufe ergänzen

**Status:** belegte Diagnoselücke. **Priorität:** P1. **PAC-Einordnung:** ADAPTED nur als Analyseprinzip; PACs Szenario-Bots ersetzen den lokalen Shop-Bot nicht.

Die vorhandene Diagnose zeichnet Angebote, erfolgreiche Käufe und XP-/Reroll-Stopps auf. Warum ein sichtbares Angebot nicht gekauft wurde, lässt sich daraus nicht eindeutig erklären. Der Bericht nennt diese Grenze selbst.

- **Anforderung:** An der realen Kaufentscheidung optional die relevanten Entscheidungsgründe erfassen: Bezahlbarkeit, Empfangs-/Merge-Kapazität, Replacement-Schwelle, Scoring/Rangfolge und zuvor ausgeführte Käufe. Reserve nur dort als Grund ausweisen, wo die tatsächliche Policy sie prüft. Pro Auswertung zwischen mehreren gleichzeitig zutreffenden Gründen und dem entscheidenden Abbruch unterscheiden.
- **Abnahme:** Auf identischem Input bleiben Commands, Endzustand und RNG mit/ohne Diagnose identisch. Ein übersprungenes Cost-4/5-Angebot lässt sich anhand des damaligen Zustands nachvollziehen; keine zusätzliche Produktionsentscheidung wird eingeführt.
- **Belege:** [botBuyPass/runBotTurn](../game/engine.ts), [Scoring](../game/scoring.ts), [Diagnosegrenzen](P1B_BOT_PROGRESSION_DIAGNOSTIC.md#unknowns-and-candidate-directions-not-policy), PAC [S1].

### F03 — Ersatzentscheidung für P1B Bot-Fortschritt

**Status:** offene Architektur-/Produktentscheidung, keine abgebrochene Implementierung. **Priorität:** P1; nach Auswertung von F02.

Der erste Target-Level-/XP-Budget-Kandidat wurde verworfen. Die aktuelle Produktionspolicy verwendet weiterhin die vorherigen XP- und Reroll-Schleifen. In der vorhandenen Diagnose stoppt XP zu 58,9 % an der Reserve und zu 36,5 % am Budget; der Roster Guard stoppt kein einziges der 12.241 beobachteten Preparations. Alle 400 Spieler erreichten L7, 342 L8, 91 L9. Das rechtfertigt Untersuchung, aber noch keine bestimmte neue Formel.

- **Anforderung:** Vor einem Ersatzkandidaten das eigentliche Ziel, die relevante Engstelle und die Erfolgsgrößen festlegen: Shop-Zugang, Käufe und tatsächlich eingesetzte hochwertige Crew getrennt bewerten. Reserve, XP und den Reroll-Kanal gemeinsam betrachten. Persönlichkeiten erhalten bleiben lassen.
- **Abnahme:** Ein späterer Kandidat muss seinen freigegebenen Zielnachweis erbringen; höhere Level oder grüne Stabilitätschecks allein reichen nicht. Determinismus und reale Command-Legalität bleiben erhalten. Der verworfene Kandidat wird nicht stillschweigend erneut eingeführt.
- **Belege:** [Verworfener Kandidat](P1B_ADAPTIVE_BOT_TUNING.md), [abgeschlossene Diagnose](P1B_BOT_PROGRESSION_DIAGNOSTIC.md), PAC [S1].

### F04 — Item-/Form-Nutzung der Bots gezielt untersuchen

**Status:** bekannte Grenze des vorhandenen Scorings plus offenes Messsignal. **Priorität:** P2, separat von F03.

`scoreItemForUnit` bewertet `item.effects`; bedingte Item-Verhaltensweisen erhalten dort keine eigene situationsabhängige Bewertung. Crafting und legale Item-Auswahl funktionieren bereits. P13 beobachtete keine Gear-4-Transformation, allerdings nur vier finale 3★-Luffys. Das beweist keine Unmöglichkeit oder falsche Balance.

- **Anforderung:** Für definierte Fälle erklären, ob Bots passende Träger, Craft-Pfade und Form-Katalysatoren erkennen beziehungsweise warum nicht. Bei Luffy Besitz, Merge-Übernahme, Overflow, Equip und Form-Lock unterscheiden. Erst danach über eine begrenzte Policy-Erweiterung entscheiden.
- **Abnahme:** Reproduzierbare Szenarien erklären die Entscheidung; bereits fertige Form- und Craft-Regeln bleiben unverändert. Ein späterer Scoring-Vorschlag muss einen nachgewiesenen Fall verbessern und darf nicht nur ein bestimmtes Item oder einen Charakter pauschal bevorzugen.
- **Belege:** [Scoring](../game/scoring.ts), [Item-/Form-Messung](P13_FINAL_PRODUCTION_BASELINE.md#items-economy-and-forms), [Form-Regeln](CHARACTER_FORM_SYSTEM.md).

### F05 — Tatsächliche Matchdauer und Wartezeiten klären

**Status:** offenes Produktziel, kein nachgewiesener Timer-Bug. **Priorität:** P1/P2 nach Produktentscheidung.

P13 nennt 34,941 Minuten Full Clock und 24,926 Minuten Paced Estimate. Letzteres kappt gewöhnliche Preparations für die Schätzung auf 15 Sekunden. Beides sind Modellwerte, keine gemessene menschliche Spieldauer. Der bestehende Full-Clock-Zielindikator 20–30 Minuten ist falsch.

- **Anforderung:** Bestimmen, welche reale Nutzererfahrung 20–30 Minuten erreichen soll. Preparation, bewusste Auswahlzeit, Kampfdarstellung, Tutorial und Pausen getrennt betrachten; vorhandenes Ready/Start und Battle-Speed berücksichtigen.
- **Abnahme:** Eine spätere Änderung besitzt ein nachvollziehbares Zeitbudget und lässt Belohnungs-/Rundenfolge, Paarung und Kampfresultate unverändert, sofern deren Änderung nicht gesondert beauftragt wird. Eine Änderung nur am Report-Indikator gilt nicht als Verbesserung.
- **Belege:** [P13 Dauer](P13_FINAL_PRODUCTION_BASELINE.md#match-length-damage-and-stage-reach), [Clock](../app/useMatchClock.ts), [Stage-Timing](../game/content.ts), PAC [S2].

### F06 — Produktdokumentation mit dem fertigen Stand abgleichen

**Status:** belegte Dokumentationslücke. **Priorität:** P1; keine Gameplay-Arbeit.

- `PRODUCT_REQUIREMENTS.md` führt Crafting noch unter Non-Goals, obwohl P4C es fertig integriert hat.
- `README.md` und `ARCHITECTURE.md` beschreiben Battle-Resume noch primär als Wiederherstellung des Pre-Battle-Zustands; `createVoyageSaveEnvelope` speichert aktuell den kanonischen Zustand mit `replayBattle: false`, während Replay ein Legacy-Pfad ist.
- Die Schlussabschnitte des Bot-Audits nennen noch Normalisierung/P2/P4 als nächste Schritte. Diese sind abgeschlossen. `PROJECT_STATE.md` benennt die Diagnose noch auf ihrem Task-Branch, obwohl PR #58 gemerged ist.
- Ältere Asset-/Form-Dokumente enthalten historische Aussagen über fehlende Form-Art; P7 liefert inzwischen Form-Visuals. Historische Aussagen dürfen als solche bestehen bleiben, aber nicht als aktueller Backlog gelesen werden.

**Anforderung/Abnahme:** Ein späterer Docs-Pass trennt historischen Stand und aktuellen Status, entfernt widersprüchliche aktuelle Roadmap-Aussagen und verlinkt abgeschlossene Arbeit. Keine historischen Messdateien oder Schlussfolgerungen umschreiben. Diese Analyse ändert die genannten Dateien nicht.

## 4. Lokal fehlende PAC-Funktionen mit konkretem Nutzwert

Diese Funktionen fehlen als Produktoberfläche. Ihre Aufnahme ist ein Planungsvorschlag, keine Behauptung, dass sie bereits zugesagt waren.

### F07 — Durchsuchbarer Crew-/Item-/Trait-Kodex

**Status:** PAC-Erweiterung; Inspector und Tooltips sind vorhanden. **Priorität:** P2. **Portierung:** ADAPTED.

- **Anforderung:** Ein offline verfügbarer Kodex aus dem aktuellen `GameContent` mit Suche/Filtern, Crew-Kosten, Traits, Fähigkeiten, Stern-/Form-Bedingungen, Item-Rezepten, Status-Erklärungen und Rundenübersicht. PvE-Definitionen getrennt von kaufbarer Crew anzeigen.
- **Abnahme:** Angaben stimmen mit Shop/Inspector und tatsächlichem Content überein; keine zweite manuell gepflegte Regeldatenbank. Alle 55 Rezepte und vier Formen sind erreichbar. Tastaturbedienung und bestehende Desktop-Auflösungen funktionieren.
- **Belege:** lokale [Screens](../app/screens/GameScreens.tsx), [Selector-Daten](../app/selectors.ts); PAC [S3].

### F08 — Kampfauswertung pro Einheit

**Status:** PAC-Erweiterung; Events und Outcome-Hinweise vorhanden, vollständiger Meter fehlt. **Priorität:** P2. **Portierung:** ADAPTED.

- **Anforderung:** Für den betrachteten Kampf Schaden, Heilung und Schild-Beiträge je Einheit darstellen; Schaden am Schild, echter HP-Schaden und gegebenenfalls Verhinderung sauber definieren. Zahlen aus autoritativen Events beziehungsweise gezielt ergänzten Reporting-Daten ableiten.
- **Abnahme:** Summen sind nachvollziehbar; Overkill, Overheal, Interception und Wiederbelebung werden nach dokumentierter Definition behandelt. Perspektivwechsel zeigt den richtigen Kampf. Keine unsichtbaren zukünftigen Ereignisse vor ihrem Wiedergabezeitpunkt offenlegen. Darstellung verändert keine Simulation.
- **Belege:** [BattleEvent](../game/types.ts), [Battle-Selector](../app/selectors.ts), [ResultsScreen](../app/screens/GameScreens.tsx); PAC [S4].

### F09 — Lokale Match-Historie und vollständiger Replay-Viewer

**Status:** PAC-Erweiterung. **Priorität:** P2. **Portierung:** ADAPTED; kein Colyseus-Stream als neue lokale Pflicht.

Ein aktiver Save, die letzten fünf Kurzresultate pro Spieler und laufendes Spectating existieren. Das ist noch kein Archiv vergangener Reisen mit frei navigierbaren Replays. Der Diagnose-JSON-Export ist ebenfalls kein vollständiger Replay-Export.

- **Anforderung:** Zuerst festlegen, ob nur Ergebnis-Historie oder vollständige Wiedergabe benötigt wird. Für Replays Seed, Content-/Config-Version und benötigte Commands/Snapshots/Events festhalten; lokale Bibliothek, Export/Import, Pause, Geschwindigkeit, Rundenwechsel und Spielerperspektive anbieten.
- **Abnahme:** Wiedergabe ist read-only, verändert keinen aktiven Save und funktioniert offline. Bei inkompatiblem Content wird ein klarer Fehler angezeigt, nicht stillschweigend mit neuen Regeln simuliert. Speichergrenzen und Löschen einzelner Aufzeichnungen sind definiert.
- **Belege:** [Save-Verwaltung](../app/voyagePersistence.ts), [recentBattles](../game/types.ts), [Diagnostics](../app/diagnostics.ts); PAC [S5].

### F10 — Team-Planer und reproduzierbare Übungskämpfe

**Status:** im Bot-Audit als spätere Benchmark-Rolle beschrieben; Produktoberfläche fehlt. **Priorität:** P2. **Portierung:** ADAPTED.

- **Anforderung:** Einen begrenzten lokalen Editor für zwei Aufstellungen, Sterne, Items, vorhandene Formen und Seed anbieten. Ein Planer zeigt Trait-Schwellen; ein Übungsmodus nutzt dieselbe Kampfsimulation. Konfigurationen lassen sich lokal teilen/importieren.
- **Abnahme:** Gleicher Input liefert dasselbe Ergebnis. Ungültige Plätze/IDs/Items/Formkombinationen werden erklärt. Ein Editor überschreibt weder einen echten Match-Pool noch Produktions-Bot-Boards. Das vorhandene Animation Lab bleibt als anderes Werkzeug erhalten.
- **Belege:** [Bot-Rollen](BOT_ARCHITECTURE_AND_BIAS_AUDIT.md#10-adaptive-vs-scripted-bot-roles), [Animation Lab](../components/AnimationLab.tsx); PAC [S1], [S6].

### F11 — Deutsche und weitere UI-Sprachen

**Status:** PAC-Erweiterung; sichtbare lokale UI-Texte sind überwiegend fest auf Englisch gesetzt. **Priorität:** P2, wenn Deutsch als Produktsprache gewünscht ist. **Portierung:** ADAPTED.

- **Anforderung:** UI, Tutorial, Fehler, Tooltip- und Accessibility-Texte übersetzbar machen; Deutsch/Englisch als mögliche erste Auswahl. Stabile IDs bleiben unabhängig von Anzeigenamen; Sprachwahl lokal speichern.
- **Abnahme:** Offline-Umschalten mit vollständigem Fallback, korrekten zugänglichen Namen und passenden Zahlenformaten. Spielstand, RNG und Content-Identitäten ändern sich durch Sprachwechsel nicht.
- **Belege:** [Screens](../app/screens/GameScreens.tsx), [Selectors](../app/selectors.ts); PAC [S7].

### F12 — Kampfeffekte verständlicher zuordnen

**Status:** teilweise vorhandene Präsentation, konkreter Ausbaupunkt. **Priorität:** P2. **Portierung:** REFERENCE ONLY.

Status-Icons, Schadenszahlen und Geschwindigkeitsoptionen sind fertig. Beim Energy-Event setzt der Selector Quelle und Ziel auf die betroffene Unit; Phaser aktualisiert die Energieleiste. Der tatsächliche Verursacher eines Drains wird damit nicht sichtbar. Viele Fähigkeiten teilen wenige allgemeine Darstellungsstile. Die P13-Ereignisdichte ist ein Hinweis auf Darstellungsdruck, kein Usability-Nachweis.

- **Anforderung:** Für ausgewählte schwer lesbare Vorgänge Ursache, Ziel und Effekt erkennbar machen, zuerst Energy Drain und erzwungene Bewegung. Zusätzliche Event-Attribution nur dort ergänzen, wo bestehende Daten nicht genügen. Separate hochwertige Form-Animationen wären ein optionaler weiterer Art-Pass; Formen haben bereits Visuals.
- **Abnahme:** Darstellung bei Normaltempo, beschleunigter Wiedergabe und Reduced Motion verständlich; keine doppelte Anwendung, kein Einfluss auf Event-Reihenfolge oder Schaden. Ein späterer Browser-/Nutzertest beurteilt die Lesbarkeit statt nur Eventzahlen.
- **Belege:** [Energy-Projektion](../app/selectors.ts), [Phaser-Ereignisse](../components/PhaserBoard.tsx), [Darstellungsstile](../components/boardCombatPresentation.ts), [P7-Form-Visuals](P7_MAJOR_ASSET_PRODUCTION.md).

## 5. Geplantes privates Multiplayer — vollständig offen

Das ist ein ausdrücklich beschriebenes Zukunftsziel. Die vorhandene Command-Grenze ist eine Vorbereitung, keine fertige Netzwerkimplementierung. PAC liefert Referenz für Räume, Identität und Wiederverbindung; seine gesamte Server-/Datenbankstruktur ist keine lokale Vorgabe. [Lokale Zielarchitektur](MULTIPLAYER_ARCHITECTURE.md), PAC [S8].

| ID | Fehlende Funktion | Anforderung und Abnahme | Abhängigkeit |
| --- | --- | --- | --- |
| M01 | Autoritärer Match-Server | Derselbe portable Domain-Kern verarbeitet alle Commands. Server besitzt RNG, Ticks, Timer, Paarung, Wirtschaft und Ergebnisse. Gefälschte Actor-IDs und doppelte/veraltete Commands beeinflussen fremde Spieler nicht. | Separater Multiplayer-Auftrag und Protokollentscheidung |
| M02 | Private Einladungen und Lobby | Freunde können einem privaten Match beitreten; Slots, Bots, Bereitschaft, Host-Rechte, Start/Abbruch und Join-Grenzen sind eindeutig. Zwei Browser können unterschiedliche Spieler steuern. | M01, minimale Session-/Identitätslösung |
| M03 | Reconnect und Match-Persistenz | Verbindungsabbruch, erneuter Beitritt und Serverneustart stellen autoritativen Zustand, Player-Zuordnung und Phase korrekt wieder her; keine doppelten Käufe/Rewards. Disconnect-/Timeout-Policy vorher festlegen. | M01/M02, gewöhnliche Persistenz |
| M04 | Remote Session und Informationssicht | Lokaler und privater Remote-Modus nutzen konsistente Views. Client-Zeit und Animationstempo ändern keine Server-Deadline; Datenfilter verhindern ungewollte Einsicht in private Shop-/Bench-Daten. Offline-Modus bleibt separat nutzbar. | M01–M03, Entscheidung über öffentliche/private Informationen |

Alle vier Punkte benötigen später eigene Akzeptanzfälle. Öffentliche Matchmaking-Dienste, Ranked/Elo, globale Accounts, Chat und große Community-Infrastruktur sind dafür nicht Voraussetzung.

## 6. Weitere PAC-Systeme — optionale Ausbauentscheidungen

Für diese Punkte besteht **kein Beleg für eine unvollständige lokale Implementierung**. Sie sind derzeit nicht umgesetzt beziehungsweise bewusst anders gelöst. Priorität P3, sofern nicht separat beschlossen.

| ID | PAC-Funktion / lokale Differenz | Anforderung bei späterer Freigabe | Abnahme / Grenze | Quelle |
| --- | --- | --- | --- | --- |
| O01 | Stage-0-Startwahl / Starter | Optional einen definierten Start-Rekrutierungsablauf vor R1 entwerfen. | Start-Gold, Pool, Tutorial, Bots und Resume explizit regeln; R1–3 bleiben bis zu neuer Freigabe unverändert. | [S2], [S9] |
| O02 | Town-/NPC-Begegnungen und Gifts | One-Piece-Hafenbegegnungen mit klar begrenzten Angeboten, Kosten und Ausgängen definieren. | Seed-/Save-stabile Auswahl, legale Commands und exakt einmalige Effekte. Keine stillen Ersatz-Rewards in der aktuellen P10/P11-Kadenz. | [S2], [S9] |
| O03 | Umfangreichere Portal-/regionale Auswahl | Nur bei Produktentscheidung P11 um weitere Auswahlarten erweitern. | Bestehendes R10/R20-Recruitment samt Reservierungen gilt als fertig; keine Wiederherstellung der alten PvP-/PvE-Fallbacks. Weitere Pool-Regeln getrennt festlegen. | [S2], [S10] |
| O04 | Wetter und Board-/Terrain-Effekte | Ein kleines One-Piece-Set mit Wirkung, Priorität, Dauer und Quellen entwerfen. | Neutraler Fall erhält heutige Ergebnisse; Seed, Ziel-/Zellenbezug, Stacking, UI und Save-/Battle-Snapshot sind eindeutig. Keine PAC-Werte ungeprüft übernehmen. | [S11], [S12] |
| O05 | Zusätzliche Statusarten | Bei konkretem Character-/Item-Bedarf etwa Poison, Freeze, Sleep oder Locked ergänzen. | Je Status Ablauf, Immunität, Unterbrechung, Interaktion und Visual definieren; bestehende Stun/Burn/Wound/Blind/Paralysis/Protect-Regeln nicht neu erfinden. | [S12], lokales [P4-Gap-Audit](P4_ITEM_SYSTEM_AUDIT.md#remaining-missing-or-insufficient-after-p4c) |
| O06 | Dishes / Food / weitere Item-Familien | Einen eigenständigen One-Piece-Mechanismus für Essen oder Verbrauchsitems entwerfen, falls gewünscht. | Erzeugung, Verbrauch, Dauer und Inventar-/Craft-Abgrenzung festlegen. Die 55 fertigen Rezepte sind kein offener Restpunkt. | [S13] |
| O07 | Sonderregeln / Challenge-Modi / Double Up | Einen separat wählbaren Modus mit klaren Regeln und passender Teilnehmerstruktur planen. | Standardmodus bleibt unverändert; Siegbedingungen, Rewards, Daten und Reports sind nach Modus getrennt. | [S14] |
| O08 | Sammlung, Profile, Erfolge, Ranglisten, Turniere und Trading | Erst ein passendes Ziel für langfristige Progression oder Community festlegen. | Keine daraus abgeleitete Pflicht zu Firebase/MongoDB, Ranked oder öffentlichen Diensten im lokalen Prototyp. | [S14], [S15] |
| O09 | Musik/Jukebox und reichere Soundkulisse | Optional lokale Musik und getrennte Sound-/Musiksteuerung ergänzen. | Bestehende Lautstärke/Mute-Regeln erhalten, Audio lokal gebündelt, reproduzierbare Quellen-/Asset-Dokumentation. | [S15], lokales [Audio](../app/useGameAudio.ts) |

Mobile/Touch ist ebenfalls ein möglicher späterer Produktumfang, aktuell jedoch ein dokumentiertes lokales Non-Goal. Diese Analyse bewertet PACs mobile Vollständigkeit nicht und leitet daraus keine Mobile-Paritätspflicht ab.

## 7. Empfohlene Entscheidungskette

1. **F01/F06:** Die konkrete Ergebnisdarstellung und widersprüchliche aktuelle Dokumentation bereinigen; separat beauftragen.
2. **F02 → F03:** Fehlende Kaufentscheidungsgründe verstehen und erst danach einen neuen P1B-Kandidaten beschließen. F04 bleibt ein eigener Untersuchungsauftrag.
3. **F05:** Das reale Pacing-Ziel klären, bevor Timer oder wirtschaftliche Werte geändert werden.
4. **Lokalen Nutzwert auswählen:** F07/F08 zuerst erwägen; F09/F10 ergänzen Lernen und gezielte Reproduktion. F11/F12 nach gewünschter Sprache und Präsentationsqualität priorisieren.
5. **Multiplayer separat starten:** M01–M04 bilden den vorgesehenen privaten Online-Pfad. Optionale PAC-Systeme O01–O09 nur nach eigener Umfangsentscheidung aufnehmen.

Kein neuer Roster-Ausbau, neuer Boss-Kampfmechanismus, weiterer Balance-Pass oder automatischer P1B-Ersatz folgt aus dieser Liste. Die aktuellen Bosse besitzen absichtlich kopierte Kampfprofile; einzigartiges Boss-Gameplay wäre eine neue Content-Entscheidung.

## 8. Prüfung und Grenzen dieser Analyse

- Read-only-Abgleich von lokalem Quellcode, Typen, Produkt-/Architekturdokumenten, bestehenden Tests als Spezifikation und vorhandenen Diagnoseberichten.
- Lokales und entferntes `main` auf denselben SHA geprüft; PAC-Quellen online am angegebenen Commit gelesen. Das ist eine gezielte Funktionsanalyse, kein lückenloses Audit jeder PAC-Fähigkeit, jedes Assets oder jeder Codezeile.
- Keine Tests, kein Build, kein Browser-Spieltest und kein Produktionslauf ausgeführt. Historische PASS-Angaben werden nicht als neue Verifikation ausgegeben. Die Ergebnislisten-Lücke ist aus dem Code belegt, nicht in einem neuen Browserlauf reproduziert.
- Bei der Erstanalyse wurde nur diese Markdown-Datei erstellt; Gameplay, Tests, Assets, Reports, `PROJECT_STATE.md`, Version und Schema wurden dabei nicht geändert. Die sachfremde Japan-Reise-HTML gehörte nicht zum Audit. Die spätere B01-Implementierung und Veröffentlichung sind eigenständige Folgeaufträge.

## 9. PAC-Quellen am geprüften Commit

Alle folgenden Links beziehen sich auf `13822d390ca0f2010881e910a6c3f73cf4df5653`; sie belegen PAC-Funktionen und sind keine Aufforderung zur unveränderten Komplettübernahme.

- **[S1]** [Szenario-Bots: Laden der Steps, Fortschritt und Board-Ersetzung](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/core/bot.ts).
- **[S2]** [Stage-Timing sowie Carousel-, Portal-, Additional-Pick- und Gift-Slots](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/config/game/stages.ts).
- **[S3]** [Wiki-Oberfläche für Units, Fähigkeiten, Items, Traits, Status und Runden](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/component/wiki/wiki.tsx).
- **[S4]** [DPS-, Heilungs- und Schild-Daten](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/core/dps.ts), [zugehörige Spieloberflächen](https://github.com/keldaanCommunity/pokemonAutoChess/tree/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/component/game).
- **[S5]** [Replay-Viewer mit Bibliothek, Import, Playback und Navigation](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/replay.tsx).
- **[S6]** [Team Builder](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/component/bot-builder/team-builder.tsx).
- **[S7]** [Sprachinitialisierung und lokale Übersetzungsressourcen](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/i18n.ts).
- **[S8]** [Match-Raum und angebundene Serverdienste](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/rooms/game-room.ts), [Room-Struktur](https://github.com/keldaanCommunity/pokemonAutoChess/tree/13822d390ca0f2010881e910a6c3f73cf4df5653/app/rooms).
- **[S9]** [Town-Begegnungen und Reward-Konfiguration](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/config/game/town-encounters.ts), [Initialzustand und Stage 0](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/rooms/states/game-state.ts).
- **[S10]** [Portal-, Symbol- und zusätzliche Pokémon-Felder im GameState](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/rooms/states/game-state.ts).
- **[S11]** [Wetterzuordnung](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/types/enum/Weather.ts), [Wetterwirkungen](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/config/game/weathers.ts).
- **[S12]** [Status- und Field-Typen](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/types/enum/Status.ts).
- **[S13]** [Dish-Zuordnungen](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/config/game/dishes.ts).
- **[S14]** [Spielmodi](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/types/enum/Game.ts), [Sonderregeln](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/app/types/enum/SpecialGameRule.ts).
- **[S15]** [PAC-Oberflächen: Sammlung, Profile, Leaderboard, Jukebox und weitere Module](https://github.com/keldaanCommunity/pokemonAutoChess/tree/13822d390ca0f2010881e910a6c3f73cf4df5653/app/public/src/pages/component), [Projekt-README und Lizenzhinweis](https://github.com/keldaanCommunity/pokemonAutoChess/blob/13822d390ca0f2010881e910a6c3f73cf4df5653/README.md).
