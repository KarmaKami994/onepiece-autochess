# Abarbeitbare Task-Batches — One Piece Auto Chess

Stand: **04.11.2026**. Grundlage: [Offene Features und PAC-Abgleich](OFFENE_FEATURES_PAC_ABGLEICH.md), Projektstand `918d16b88e182ac9c81d05c73deb651824d51df8`.

Dieses Dokument teilt die verbleibenden Anforderungen in **neun größere, zusammenhängende Arbeitspakete** auf. Es ist die Planung für spätere Aufträge; in diesem Schritt wird ausschließlich diese Liste erstellt.

**Fortschritt:** B01 ist gemerged ([PR #59](https://github.com/KarmaKami994/onepiece-autochess/pull/59), [Abschluss](B01_RESULTS_COMPLETION.md)). B02 ist implementiert ([Abschluss](B02_CODEX_TEAM_PLANNER.md)); Verifikation und Review-Stand stehen in `PROJECT_STATE.md`. B03–B09 sind offen; ihre Umsetzung beginnt nur mit einem eigenen Auftrag.

## Umfang

Enthalten sind die lokalen Funktionslücken und die zuvor als optional bezeichneten PAC-Erweiterungen, soweit sie in ein lokales Einzelspielerprodukt passen. Damit werden auch Starter-/Rekrutierungswahl, Hafenbegegnungen, Wetter, weitere Statusarten, Food und lokale Sammlung in die Planung aufgenommen.

Ausgenommen sind:

- zusätzliche Spielmodi, Challenge-/Sonderregel-Modi, Double Up, Ranked und Turniere;
- Übersetzungen und Sprachumschaltung;
- Multiplayer, Netzwerkserver, Accounts, Lobbys, Reconnect und Remote-Persistenz;
- öffentliche Ranglisten, zwischen Spielern geteilte Profile sowie Trading/Marktplatz.

Der Teamplaner enthält einen lokalen Kampftest als Analysewerkzeug. Er führt keinen weiteren Match-Modus mit eigenen Regeln ein. Profile, Sammlung, Rekorde und Erfolge bleiben offline und benötigen keine Anmeldung. Mobile/Touch gehört weiterhin nicht zum geplanten Desktop-Ausbau.

## Übersicht und Reihenfolge

| Batch | Zusammenhängender Auftrag | Enthält | Voraussetzung | Umfang |
| --- | --- | --- | --- | --- |
| **B01** | Ergebnisansicht vervollständigen und Produktstand bereinigen | F01, F06 | keine | groß |
| **B02** | Spiel-Kodex und Crew-/Teamplaner | F07, F10 | B01 empfohlen | groß |
| **B03** | Kampfauswertung, lesbare Effekte und Audio | F08, F12, O09 | B01; B02 für Verlinkungen empfohlen | groß |
| **B04** | Replay-Archiv und lokale Spielerprogression | F09, lokaler Teil von O08 | B01, B03 | sehr groß; zwei Lieferungen |
| **B05** | Bot-Entscheidungen erklären und gezielt verbessern | F02, F03, F04 | B02/B03 empfohlen; vor B07–B09 | sehr groß; drei getrennt bewertbare Lieferungen |
| **B06** | Matchdauer und Wartezeiten verbessern | F05 | B05 abschließen oder bewusst unverändert lassen | groß |
| **B07** | Starter, Recruitment und Hafenbegegnungen | O01, O02, O03 | B02, B05, B06 | sehr groß; zwei Lieferungen |
| **B08** | Wetter, Board-Effekte und zusätzliche Statusarten | O04, O05 | B02, B03, B05; B07 empfohlen | sehr groß; zwei Lieferungen |
| **B09** | Food und Verbrauchsitems vollständig integrieren | O06 | B02, B07; B08 für verwendete Effekte | groß |

Die Nummerierung ist die empfohlene Abarbeitungsreihenfolge. B02 und B03 sind weitgehend unabhängig. Ein Batch wird bis zu seinen Abnahmekriterien abgeschlossen, bevor der nächste beauftragt wird. Bei den ausdrücklich geteilten Batches bleibt jede Lieferung ein eigener begrenzter Branch/PR; große Pakete sollen nicht mehrere unabhängig wirksame Regeländerungen in einem unprüfbaren PR verstecken.

## B01 — Ergebnisansicht und aktueller Produktstand

**Ziel:** Ein vollständiger, verständlicher Matchabschluss und eine verlässliche Dokumentationsbasis.

**Aufgaben:**

- Die feste Begrenzung auf acht Ergebnis-Karten entfernen und Level-9-Aufstellungen vollständig unterstützen.
- Ergebnisdaten eindeutig aufteilen: empfohlene Darstellung ist **letzte eingesetzte Crew** plus separat gekennzeichnete **Reserve/Bench**. Diese Produktentscheidung vor der Snapshot-Anpassung festhalten.
- Für Sieger und ausgeschiedene Spieler Namen, Sterne, Formen und Items zuverlässig erhalten; nötige Zusatzdaten vor dem Leeren der Board-/Bench-Struktur erfassen.
- Für alte Saves ohne Aufstellungskennzeichnung einen beschrifteten Fallback anbieten; keine frühere Board-Zuordnung erfinden.
- README, Produktanforderungen, Architektur, aktuelle Roadmap-Verweise und `PROJECT_STATE.md` an den tatsächlich abgeschlossenen Stand anpassen: Crafting, kanonischer Battle-Save, P11/P12 und gemergte Bot-Diagnose.
- Historische Berichte und historische Aussagen als solche erhalten.

**Fertig, wenn:** Neun eingesetzte Units vollständig sichtbar sind, Bench und Board konsistent bezeichnet werden, Anzahl/Karten/Items übereinstimmen und aktuelle Dokumente keine bereits abgeschlossenen Features mehr als nächste Arbeit ausweisen.

**Abgrenzung:** Keine Kampf-, Bot-, Economy- oder Reward-Änderung. Bestehende Ergebnisdaten dürfen nicht stillschweigend als andere Messgröße interpretiert werden.

## B02 — Spiel-Kodex und Teamplaner

**Ziel:** Spieler können Crew, Items und Synergien verstehen und Aufstellungen vor einer Reise planen.

**Aufgaben:**

- Einen über das Menü erreichbaren Kodex mit Suche und Filtern für Crew, Kosten, Traits, Fähigkeiten, Sterne, Formen, Status und PvE erstellen.
- Alle vorhandenen Item-Rezepte, Craft-Ergebnisse und Form-Voraussetzungen samt aktuellen Werten anzeigen; die Rundenübersicht einschließlich Recruitment und Rewards integrieren.
- Einen lokalen Teamplaner für Positionen, Sterne, Items und bereits vorhandene Formen anbieten, inklusive Trait-Schwellen und Legalitätsmeldungen.
- Zwei geplante Teams mit explizitem Seed über die vorhandene Simulation gegeneinander prüfen; Resultate und vorhandene Auswertung verwenden.
- Pläne lokal speichern sowie als validierte Datei importieren/exportieren. Ein Kampftest arbeitet in einem getrennten Kontext zum aktiven Match.
- Kodex, Inspector und Planer aus denselben Content-Definitionen und kleinen gemeinsamen Darstellungsfunktionen versorgen. Keinen zweiten Regelsatz pflegen.

**Fertig, wenn:** Alle aktuellen Crew-Definitionen, 55 Rezepte und vier Formen auffindbar sind; gültige Pläne reproduzierbar funktionieren; ungültige IDs, Plätze und Kombinationen verständlich abgelehnt werden; aktive Saves und Pools unberührt bleiben. Bedienung bei 1280×720 und 1920×1080 sowie per Tastatur ist möglich.

**Abgrenzung:** Der Planer ist ein Werkzeug; Produktions-Bots werden nicht durch vorgefertigte Teams ersetzt. Neue Content-Einträge späterer Batches erscheinen über die vorhandenen Datenwege.

## B03 — Kampfauswertung, Effekte und Audio

Umgesetzt am 2026-11-05 auf `codex/b03-combat-analysis-audio`, aufbauend auf B02
(PR #60). Definitionen, PAC-Abgleich, Asset-Inventar und Prüfstand:
[`B03_COMBAT_READABILITY_AUDIO.md`](B03_COMBAT_READABILITY_AUDIO.md).

**Ziel:** Der Spieler versteht, welche Einheit was bewirkt, und kann Kämpfen akustisch und visuell folgen.

**Aufgaben:**

- Pro Einheit Schaden, Heilung und Schild-Beiträge für den betrachteten Kampf darstellen; HP-/Schildschaden, Overkill, Overheal, Interception und Wiederbelebung vorab eindeutig definieren.
- Auswertungen zeitlich an die Wiedergabe koppeln; Perspektivwechsel und Kampfende korrekt unterstützen.
- Energy Drain mit tatsächlichem Verursacher/Ziel sichtbar machen und Lunge, Pull und Knockback unterscheidbar darstellen. Fehlende Attribution gezielt in Reporting-/Eventdaten ergänzen.
- Für wichtige Fähigkeiten und bestehende Formen unterscheidbare Effekte/Übergänge ausarbeiten. Vorhandene Form-Portraits, Tokens und Overlays wiederverwenden; zusätzliche eigene Form-Clips nur nach einem zu Beginn festgelegten Asset-Inventar produzieren.
- Eine lokal gebündelte Musik-/Soundkulisse mit getrennter Steuerung für Musik und Effekte, Mute und einer einfachen Titelauswahl ergänzen. Quellen, Nutzungsbasis und erzeugte Dateien dokumentieren.
- Reduced Motion, High Contrast und Kampfgeschwindigkeit in allen neuen Darstellungen berücksichtigen.

**Fertig, wenn:** Auswertungssummen nach den vereinbarten Definitionen nachvollziehbar sind, zukünftige Kampfereignisse nicht vorzeitig erscheinen, Effekte ihre Quelle und ihr Ziel verständlich zeigen und Audio vollständig offline funktioniert. Darstellung und Audio verändern weder Resultate noch RNG.

**Abgrenzung:** Neue Effektarten aus B08/B09 werden erst in ihrem jeweiligen Batch ergänzt. Hier werden bestehende Mechaniken verständlich dargestellt; Item-/Unit-Werte bleiben unverändert.

## B04 — Replay-Archiv und lokale Spielerprogression

Umgesetzt am 2026-11-05 auf `codex/b04-replay-profile`, aufbauend auf B03.
Format, Profil-/Sammlungsregeln, Grenzen und Prüfstand:
[`B04_REPLAY_PROFILE.md`](B04_REPLAY_PROFILE.md). B02–B04 sollen nach Auftrag
des Projekteigners nach erfolgreicher CI zusammengeführt werden.

**Ziel:** Abgeschlossene Reisen sind wiederauffindbar, abspielbar und als persönliche Fortschritte sichtbar.

**Lieferung A: Historie und vollständige Replays.**

- Ein lokales Archiv für Ergebnis, Datum, Seed, Version, finale Crew und relevante Matchdaten anlegen.
- Das kleinste tragfähige Replay-Format bestimmen: benötigte Commands, Events und/oder Snapshots sowie Content-/Config-Identität dokumentieren. Export/Import, Pause, Geschwindigkeit, Rundenwechsel und Perspektivwahl anbieten.
- Vorhandene Kampfdarstellung und B03-Auswertung für read-only Wiedergabe verwenden; aktive Reise und Replay-Zustand getrennt halten.
- Speicherbegrenzung, Löschen einzelner Aufzeichnungen und Verhalten bei Versionsabweichungen implementieren. Importierte Daten prüfen; inkompatible Aufzeichnungen nicht mit unpassenden Regeln abspielen.

**Lieferung B: Lokales Profil, Sammlung, Erfolge und Rekorde.**

- Ein lokales Kapitänsprofil mit persönlicher Statistik, bisherigen Platzierungen und Rekorden aus abgeschlossenen Reisen erstellen.
- Eine entdeckte Crew-/Form-/Item-Sammlung mit dem Kodex verbinden. Entdecken, Besitzen, Einsetzen und Erreichen einer Form als unterschiedliche Ereignisse definieren, soweit sie für die gewählten Ziele gebraucht werden.
- Eine zu Beginn festgelegte Menge nachvollziehbarer Erfolge ergänzen. Erfolgsauslöser deterministisch beziehungsweise aus autoritativen Matchdaten ableiten und pro Match nur einmal zählen.
- Nachträglich importierte Replays nicht ungefragt für offizielle lokale Rekorde oder Erfolge zählen; Herkunft und Zählregel festhalten.
- Profil-/Archiv-Export und klar getrennte Lösch-/Zurücksetzfunktionen anbieten.

**Fertig, wenn:** Eine Reise nach Neustart des Browsers im Archiv liegt, ihr Replay navigierbar ist, ein beschädigter Import den aktiven Save nicht beschädigt und erneutes Laden keine Statistik/Erfolge verdoppelt. Profil und Sammlung funktionieren ohne Konto und ohne Spielvorteile.

**Abgrenzung:** Persönliche Bestwerte gehören dazu. Öffentliche Rankings, Account-Progression, Handel und Turniere sind ausgeschlossen.

## B05 — Bot-Diagnose und gezielte Entscheidungsverbesserung

**Ziel:** Die Bots verbessern sich anhand erklärter Entscheidungen; der Erfolg wird an tatsächlich eingesetzten Teams gemessen.

Dieses Paket hat **drei Lieferungen**, damit Ursachen und Folgen einzelner Policy-Änderungen auseinandergehalten werden können.

**Lieferung A: Entscheidungsdiagnose und Architekturentscheidung.**

- Die bestehenden optionalen Observer um Gründe für sichtbare Nichtkäufe ergänzen: Bezahlbarkeit, Empfangs-/Merge-Kapazität, Replacement, Rangfolge und bereits ausgeführte Käufe. Reserve nur erfassen, wo die reale Policy sie prüft.
- Item-/Craft-/Form-Pfade mit reproduzierbaren Fällen erklären: insbesondere Katalysatorbesitz, Merge-Retention, Overflow, Equip und Form-Lock.
- Endzustand, Commands und RNG mit/ohne Diagnose gleich halten; keine neue Policy in die Instrumentierung einbauen.
- Bestehende P13- und Diagnose-Berichte auswerten. Vor neuer aggregierter Messung Laufumfang, Vergleichsbasis und Ziel festlegen.
- Für Fortschritt und für Item-/Form-Entscheidungen getrennte Änderungsvorschläge mit messbaren Abnahmekriterien an die Architektur-/Review-Ebene übergeben.

**Lieferung B: Genau ein freigegebener Progressionskandidat.**

- Die freigegebene XP-/Reserve-/Reroll-Entscheidung im realen Command-Ablauf umsetzen; Persönlichkeiten und bounded actions erhalten.
- Shop-Zugang, Käufe und tatsächliche Board-Präsenz getrennt vergleichen. Reines Level-Wachstum ist kein ausreichender Erfolgsnachweis.
- Genau den vereinbarten Kandidaten bewerten; bei verfehltem Ziel zurücknehmen oder als abgelehnt dokumentieren, nicht innerhalb derselben Lieferung wiederholt retunen.

**Lieferung C: Freigegebene Item-/Form-Entscheidungen.**

- Nur nachgewiesene Lücken bei Item-Trägern, Craft-Pfaden und vorhandenen Form-Katalysatoren verbessern.
- Keine garantierte Transformation oder pauschale Bevorzugung einzelner Charaktere erzwingen. An generischen Kriterien und nachvollziehbaren Fällen prüfen.
- Fortschrittspolicy aus Lieferung B und Item-/Form-Regeln getrennt bewertbar halten.

**Fertig, wenn:** Nichtkäufe und die untersuchten Item-/Form-Pfade erklärbar sind und jede veröffentlichte Policy ihr zuvor freigegebenes Ziel erreicht. Determinismus, Command-Legalität und Stabilität bleiben belegt. Eine begründete Ablehnung zählt als abgeschlossene Bewertung, nicht als erfolgreiche Verbesserung.

**Abgrenzung:** Der frühere abgelehnte Target-Level-Kandidat wird nicht vorausgesetzt. Unit-/Item-/Trait-Werte, Shop-Odds, Pool, Economy-Grundwerte und Smoker werden für diesen Bot-Auftrag nicht getunt. Eine neue Vergleichsmessung darf nicht unbemerkt spätere Content-Erweiterungen enthalten.

## B06 — Reales Pacing und Wartezeiten

**Ziel:** Eine Reise hat ein bewusst definiertes Zeitbudget und vermeidet unnötige Wartezeit.

**Aufgaben:**

- Das Produktziel festlegen: Welche Nutzererfahrung soll 20–30 Minuten dauern? Preparation, Kampf-Wiedergabe, Auswahlzeit, Tutorial und Pausen getrennt behandeln.
- Reale UI-Abläufe und bestehende Timer mit den vorhandenen Full-Clock-/Paced-Schätzungen vergleichen; keine Schätzung als gemessene menschliche Spieldauer ausgeben.
- Ready/Start, automatische Fortsetzung und bestehende Kampfgeschwindigkeit als mögliche Hebel bewerten. Vor Umsetzung festhalten, ob nur Darstellung/Wartezeit oder tatsächlich Preparation-Regeln geändert werden.
- Eine zusammenhängende, freigegebene Pacing-Lösung inklusive klarer Timer-Anzeige und Verhalten bei Einstellungen, Tutorial, Resume und Browser-Hintergrund umsetzen.
- Das neue Zeitbudget nachvollziehbar dokumentieren; bestehende Berichtszielwerte nur bei einer explizit beschlossenen Neudefinition ändern.

**Fertig, wenn:** Die gewählte reale Zeitdefinition überprüfbar erreicht wird, Timer/Bedienung konsistent sind und die angezeigte Verbesserung nicht bloß aus einer veränderten Formel stammt.

**Abgrenzung:** Paarung, Rewards, Rundenfolge, Captain Damage und Kampfwerte sind keine automatischen Pacing-Hebel. B07–B09 erhalten anschließend ein ausgewiesenes zusätzliches Zeitbudget.

## B07 — Startwahl, Recruitment und Hafenbegegnungen

**Ziel:** Die Reise erhält zusätzliche One-Piece-Entscheidungen zwischen den Kämpfen, einschließlich einer klaren Startwahl und interessanter Hafenangebote.

**Lieferung A: Ablauf-/Content-Vertrag und Start-/Recruitment-Ausbau.**

- Die genaue Cadence festlegen: Start vor R1, bestehende R10/R20-Recruitments und geplante Hafen-/Gift-Angebote in einer gemeinsamen Tabelle beschreiben. PACs Slots sind Referenz; der lokale Ablauf wird ausdrücklich beschlossen.
- Starter-Auswahl mit bestehenden Units entwerfen und implementieren; Start-Gold, Pool, Tutorial und Bots konsistent behandeln.
- Für den vorgesehenen Ausbau der R10/R20-Auswahl zuerst definieren, was über die fertige Auswahl von drei Cost-4/5-Units hinausgeht: etwa ein begrenzter trait-/regionsbezogener Kandidatenkreis. One-Piece-Zuordnung und Pool-Bedeutung vor Code festlegen.
- Shared-Pool-Reservierungen, Rückgabe nicht gewählter Kopien, Full-Bench-Fallback und serialisierte RNG-/Save-Daten durchgängig unterstützen.

**Lieferung B: Hafen-/NPC-Begegnungen und Gifts.**

- Einen zu Beginn begrenzten One-Piece-Katalog von Begegnungen mit Angebot, Kosten, Auswahl, Fallback und Ergebnis umsetzen.
- Angebote deterministisch erzeugen, über Commands auflösen und in einer passenden Choice-Oberfläche darstellen.
- Bots wählen nach definierten vorhandenen beziehungsweise ausdrücklich freigegebenen Kriterien; alle Spieler erhalten legale, abschließbare Abläufe.
- Save/Resume, Verlassen der Seite und Legacy-Saves gegen doppelte Einkünfte, Rewards oder Reservierungen absichern.
- Kodex, Tutorial, Archiv/Replay und Reports um die neuen Phasen und Quellen ergänzen.

**Fertig, wenn:** Jede Auswahl pro Spieler genau einmal aufgelöst wird, Pool-/Goldbilanz stimmt und volle Bench, erschöpfte Kandidaten sowie Resume niemals die Reise blockieren. R1–3, feste PvE-/Carousel-/Supply-Cadence und fertiges Recruitment funktionieren weiter, soweit keine konkrete Änderung im Ablaufvertrag freigegeben wurde.

**Abgrenzung:** Keine zusätzlichen Spielmodi und keine zufällig eingeschobenen PvE-Ersatzrunden. Neue Entscheidungen wirken im regulären lokalen Match.

## B08 — Status, Wetter und Board-Effekte

**Ziel:** Die Kampfbasis unterstützt ein ausgewähltes, verständliches Set zusätzlicher Mechaniken mit passender One-Piece-Identität.

**Lieferung A: Zusätzliche Statusarten.**

- Aus den belegten Lücken ein begrenztes Set auswählen und festschreiben, beispielsweise Poison, Freeze, Sleep und Locked. Für jede gewählte Mechanik einen konkreten lokalen Anwendungsfall benennen.
- Tick-Zeit, Ablauf, Stacking, Immunität, Unterbrechung, Zielbarkeit und Wechselwirkungen mit Protect, Wiederbelebung und Bewegung definieren.
- Die freigegebenen Statusarten mit kleinen typisierten Funktionen in die vorhandene Simulation integrieren; Events, Icons, Tooltips und Kampfauswertung ergänzen.
- Für die gewählten Anwendungen explizit festlegen, welche bestehenden oder neuen Content-Einträge sie verwenden. Keine Mechanik als fertig erklären, wenn sie nur als ungenutzter Typ existiert.

**Lieferung B: Wetter und Board-/Terrain-Effekte.**

- Ein kleines One-Piece-Wetter-/Geländeset mit Quellen, Auswahlpriorität, Dauer und zellen- beziehungsweise teambezogener Wirkung festlegen.
- Effekte aus explizitem Zustand und serialisierter RNG ableiten; neutraler Fall und alle Prioritätskonflikte sind definiert.
- Darstellung, Reduced Motion, Aufstellungsinformationen, Kodex, Teamplaner und Replay ergänzen.
- Save-/Battle-Snapshots und relevante Reports so erweitern, dass die tatsächliche Effektkonfiguration rekonstruierbar bleibt.

**Fertig, wenn:** Jeder gewählte Effekt einen dokumentierten, sichtbaren Anwendungsfall hat; neutrale Szenarien die bisherigen Ergebnisse behalten; Stacking/Immunität/Bewegung/Resurrection reproduzierbar sind und Darstellung keine Regeln ausführt.

**Abgrenzung:** Kein generisches Event-/Status-Framework und keine Übernahme sämtlicher Pokémon-Passives. Die Liste der Mechaniken und ihre Werte werden vor ihrer Implementierung beschlossen; ein pauschaler globaler Balance-Pass gehört nicht dazu.

## B09 — Food und Verbrauchsitems

**Ziel:** Ein zusammenhängender One-Piece-Food-Mechanismus erweitert die Reise mit verständlicher Beschaffung, Verwendung und Wirkung.

**Aufgaben:**

- Einen begrenzten Food-Katalog und seinen Lifecycle festlegen: Erzeugung/Beschaffung, Besitz, Ziel, Verwendung, Verbrauch und Wirkungsdauer. Noch offene Fragen ausdrücklich entscheiden, etwa sofortige Nutzung versus Wirkung im nächsten Kampf.
- Inventar-/Slot-/Item-Cap-Regeln und die Grenze zu vorhandenen Komponenten, Completed Items und Crafting definieren.
- Die freigegebenen Bezugsquellen integrieren, vorzugsweise in den Hafenablauf aus B07; keine unbeabsichtigte Verdopplung von P10-Rewards.
- Verbrauch durch normale Commands abwickeln; ungültige Verwendung darf nichts verändern. Für Bots eine begrenzte, nachvollziehbare Auswahl-/Verwendungsentscheidung ergänzen.
- UI, Kodex, Icons/Assets, Save/Resume, Replay und getrennte Erwerbs-/Verbrauchszähler vollständig anbinden.
- Bei neuen Wirkungen vorhandene beziehungsweise in B08 freigegebene Primitive nutzen. Food benötigt eine tatsächliche erreichbare Beschaffungs- und Nutzungsstrecke.

**Fertig, wenn:** Food erreichbar, verwendbar und nach Verbrauch korrekt entfernt ist; Wirkung und Ablauf verständlich sind; Resume keine Doppelwirkung erzeugt und die 55 bestehenden Rezepte weiterhin korrekt funktionieren.

**Abgrenzung:** Kein vollständiger PAC-Dish-Katalog und keine zusätzliche Crafting-Wirtschaft ohne eigenen beschlossenen Umfang. Änderungen an bestehenden Item-Werten werden nicht als Nebenwirkung aufgenommen.

## Regeln für spätere Ausführung

- Jeder konkrete Auftrag startet mit dem dann aktuellen freigegebenen `main` und einer sauberen, begrenzten Task-Branch; die heutige SHA ist die Planungsgrundlage, nicht die starre Basis aller späteren Batches.
- PAC-Codebezüge verwenden die belegten Quellen aus der [Analyse](OFFENE_FEATURES_PAC_ABGLEICH.md#9-pac-quellen-am-geprüften-commit). Vor neuer System-/Gameplay-Arbeit wird der betroffene PAC-Ablauf gezielt geprüft und die Einordnung direct/adapted/reference/reject festgehalten. Die angegebene Nutzungserlaubnis bleibt dokumentiert; tatsächliche Übernahmen erhalten Quellen-/Lizenzhinweise.
- Diagnose-/Review-Schritte in B05 sowie die neuen Regelverträge in B06–B09 müssen vor den davon abhängigen Implementierungen konkret feststehen. Dieses Dokument enthält keine erfundenen fertigen Balancewerte oder freigegebenen Formeln.
- GameContent ist heute `1.31.0`; Schema ist heute `6`. UI-/Dokumentationsarbeit erhält keine unnötigen Versionserhöhungen. Künftige Gameplay-Batches bekommen einen bewusst beschlossenen Content-Versionsstand; vorhandene Match-Saves bleiben kompatibel, additive Backfills werden bevorzugt. Ein separates Replay-/Profilformat wird nicht mit dem Match-Schema verwechselt.
- Lokal/offline, deterministische Domain, bestehende Accessibility und kleine typisierte Funktionen gelten für alle Pakete. Vorhandene Tests bleiben wirksam; historische Raw-Reports und Hashes bleiben unverändert. Smoker bleibt frozen/watch.
- Verifikation wird pro Lieferung nach Wirkung begrenzt: Typecheck/Lint und betroffene Tests; volle Suite bei mehreren Domain-/Application-Modulen; Browser-E2E bei UI-/Phaser-Verhalten. Keine Wiederholung vollständiger Prüfungen nach jeder kleinen Dateiänderung.
- Aggregierte Vergleiche oder Produktionsläufe benötigen einen ausdrücklich festgelegten Umfang. Es gibt keinen automatischen 1.000-Seed-Soak und keine neue autoritative Baseline aus dieser Planung. Normaler CI-Smoke bleibt Crash-/Regressionsprüfung, keine alleinige Balancefreigabe.
- Vor Abschluss jeder späteren Lieferung werden nur die betroffenen Zustands-/Dokumentationsabschnitte aktualisiert. Nicht automatisch mit dem nächsten Batch beginnen.

## Vollständigkeitszuordnung

| Einträge aus der Analyse | Geplanter Batch / Entscheidung |
| --- | --- |
| F01, F06 | B01 |
| F07, F10 | B02 |
| F08, F12, O09 | B03 |
| F09 | B04 Lieferung A |
| O08: lokale Sammlung, Profil, Erfolge, persönliche Rekorde | B04 Lieferung B |
| F02 | B05 Lieferung A |
| F03 | B05 Lieferungen A/B |
| F04 | B05 Lieferungen A/C |
| F05 | B06 |
| O01, O03 | B07 Lieferung A |
| O02 | B07 Lieferung B |
| O05 | B08 Lieferung A |
| O04 | B08 Lieferung B |
| O06 | B09 |
| F11 | ausgeschlossen: Sprachen |
| M01–M04 | ausgeschlossen: Multiplayer |
| O07 | ausgeschlossen: zusätzliche Spielmodi |
| O08: öffentliche Rankings, Turniere, Trading, Online-Profile | ausgeschlossen: Multiplayer/Modi/Online-Infrastruktur |

**Lieferumfang der ursprünglichen Planung:** ausschließlich diese Markdown-Datei, ohne Implementierung oder Produktionsläufe. Die spätere B01-Umsetzung und Veröffentlichung erfolgen auf eigene Folgeaufträge. Die ursprüngliche Analyse bleibt als Quellen- und Befundliste erhalten.
