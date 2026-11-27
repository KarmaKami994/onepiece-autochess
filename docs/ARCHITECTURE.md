# Grand Line Auto Chess – System- und Spielarchitektur

Stand 26. November 2026 · GameContent **1.42.0** · Spielstandschema **6** ·
55 spielbare Rekruten, 18 Synergien und 10 Formen. Dieses Dokument erklärt die
gesamte Anwendung vom ersten Spielzug bis zum privaten Heimserver. Der
[Projektstand](../PROJECT_STATE.md) enthält Änderungen, Prüfungen und offene
Entscheidungen. Verlinkte Fachnotizen halten Detailwerte, Messungen und historische
Entscheidungen fest.

## 1. Systembild und Verantwortlichkeiten

Grand Line Auto Chess ist ein Auto-Battler für acht Plätze. Kapitäne rekrutieren
Einheiten aus einem gemeinsamen Vorrat, kaufen Erfahrung, bilden Synergien,
verteilen Ausrüstung und positionieren ihre Crew. Die Kampfsimulation löst die
Begegnungen der Runde auf. Solo besetzen Bots die übrigen Plätze. Im privaten
Multiplayer spielen zwei bis acht Menschen, die verbleibenden Plätze übernehmen
Bots.

~~~mermaid
flowchart LR
    subgraph Browser
        UI["React · Menüs, HUD, Shop, Eingaben"]
        Canvas["Phaser · Brett, Regatta, Kampf-Replay"]
        Solo["Solo-Sitzung · Uhr und lokale Spielleitung"]
        DB["IndexedDB · Spielstand und Chronik"]
        Client["Friends-Client · HTTP und WebSocket"]
        UI --> Solo
        UI --> Client
        UI -->|Ansichten und Ereignisse| Canvas
        Solo --> DB
    end
    subgraph Node["Friends-Server"]
        Room["Colyseus-Raum · Spieler, Uhr, Befehle"]
        Store["SQLite · Anmeldung und laufende Reise"]
        Room --> Store
    end
    Client <-->|Befehle, Spieleransichten, Quittungen| Room
    Solo --> Core["game/ · gemeinsame TypeScript-Spielregeln"]
    Room --> Core
~~~

| Bereich | Einstieg | Verantwortung und Grund |
| --- | --- | --- |
| Spielregeln | [game/](../game/) | Plattformneutrales TypeScript für Zustand, Regeln und Simulation. Solo, Friends, Planer und Messläufe verwenden dieselbe Regelbasis. |
| Solo-Anwendung | [GameClient.tsx](../app/GameClient.tsx), [useLocalGameSession.ts](../app/useLocalGameSession.ts), [useMatchClock.ts](../app/useMatchClock.ts) | Browserseitige Spielleitung, Spielzeit und Speicherung. Die Solo-Reise funktioniert ohne Konto oder Spielserver. |
| Darstellung | [selectors.ts](../app/selectors.ts), [GameScreens.tsx](../app/screens/GameScreens.tsx), [BoardScene.ts](../components/BoardScene.ts) | React besitzt Menüs, HUD und Bedienung. Phaser rendert die räumliche Szene und gibt Zeigerinteraktionen an die Anwendung weiter. Beide lesen Spielansichten. |
| Friends-Anwendung | [FriendsEntry.tsx](../app/multiplayer/FriendsEntry.tsx), [LocalMatchClient.tsx](../app/multiplayer/LocalMatchClient.tsx), [FriendsRoom.ts](../server/FriendsRoom.ts) | Der Server entscheidet über Sitz, Befehle, Uhr und Resultate. |
| Betrieb | [Launcher](../scripts/run_local_multiplayer.ts), [Compose](../deploy/compose.playtest.yaml), [Caddy](../deploy/Caddyfile) | Node betreibt das gebaute Frontend und den Raum. Caddy bündelt beide hinter einer Browser-Origin. Der separate Tunnel stellt den geschützten HTTPS-Zugang her. |

## 2. Spielzustand, Inhalte und Autorität

- [types.ts](../game/types.ts) definiert `MatchState`, `PlayerState`,
  `GameCommand` und Kampfergebnisse. Der maßgebliche Spielzustand besteht aus
  JSON-serialisierbaren Daten. `GameCommand` beschreibt die Absicht, etwa einen
  Shopplatz zu kaufen. `CommandContext.actorPlayerId` liefert die
  vertrauenswürdige Identität separat.
- [engine.ts](../game/engine.ts) verbindet die Regeln. `createMatch()` erstellt
  den vorbereiteten Ausgangszustand für Engine-Aufrufer und ältere Fixtures.
  `createVoyage()` öffnet die Startrekrutierung für den normalen Reisebeginn.
  `applyCommand()` wendet eine erlaubte Aktion an. `advanceMatchPhase()` führt
  den geordneten Phasenwechsel aus. Solo-Client und Friends-Server verwenden
  dafür die gleichen Regeln.
- [content.ts](../game/content.ts) bündelt `DEFAULT_CONTENT` und `GAME_CONFIG`.
  Dort stehen Einheiten, Fähigkeiten, Formen, Synergiegrenzen, Ausrüstung,
  Rezepte, Gegner, Runden, Bot-Persönlichkeiten und Werte. So bleibt ein
  Inhaltswechsel unabhängig vom Algorithmus prüfbar. Das Feld misst 8 × 6 mit
  drei eigenen Aufstellungsreihen. Bank und Shop haben acht bzw. sechs Plätze.
  Pro Einheit sind höchstens drei Gegenstände möglich. Kapitäne beginnen bei
  100 Leben, 5 Gold und Stufe 2.
- [rng.ts](../game/rng.ts) führt den Zufallszustand explizit. Kampf und Regatta
  verarbeiten feste Zeitschritte. [hash.ts](../game/hash.ts) kanonisiert
  Objektschlüssel für `hashMatchState()` und `hashGameContent()`. Diese Hashes
  dienen der Reproduzierbarkeit. Assets und Rohberichte haben eigene
  SHA-256-Prüfsummen, die Anmeldung verwendet ihren eigenen Sicherheitsmechanismus.

**Warum diese Trennung?** Ein Fehler lässt sich mit Seed, Inhalt, Spielstand
und Befehlen reproduzieren. Bildrate und Layout bestimmen weder Schaden noch
Shopangebote. Neue Darstellungen können dieselben Regeln verwenden.

## 3. Ablauf einer Reise

~~~mermaid
flowchart TD
    Starter["First Crew vor Runde 1"] --> Round{"Rundentyp und Phase"}
    Round -->|PvP oder PvE| Prep["Vorbereitung · Shop, Crew, Ausrüstung"]
    Prep --> Battle["Aufstellung einfrieren und Kampf simulieren"]
    Battle --> Result["Ergebnis, Kapitänsschaden und ggf. Belohnung"]
    Result --> Next{"Reise beendet?"}
    Next -->|Ja| End["Ergebnisse · Platzierung und letzte Crew"]
    Next -->|Nein| Round
    Round -->|Regatta| Race["Steuerung, Kollision und Beute"]
    Race --> Round
    Round -->|Rekrutierungsrunde| Recruit["Route und Rekruten wählen"]
    Recruit --> Round
    Round -->|Hafenhalt im normalen Ablauf| Harbor["Angebot annehmen oder weiterfahren"]
    Harbor --> Prep
~~~

| Abschnitt | Regeln und Implementierung | Warum |
| --- | --- | --- |
| Erste Crew | Vor R1 stehen drei verschiedene Rekruten für je ein Gold zur Wahl. Die erste Vorbereitung erhält Einkommen und Erfahrung nach den normalen Regeln. | Der erste Zug bekommt eine Richtung innerhalb derselben Wirtschaft. |
| Vorbereitung | [economy.ts](../game/economy.ts) und [engine.ts](../game/engine.ts) verwalten Shop, Gold, Zinsen, Serien, Erfahrung, Levelgrenzen und Käufe. Beim Kampfbeginn können freie Aufstellungsplätze aus der Bank gefüllt werden. S-Shortcut und Verkaufsfeld senden denselben Verkaufsbefehl. | Kauf-, Verkaufs- und Platzregeln gelten für alle Eingabewege und für Bots. |
| PvE | Runden 1, 2, 3, 9, 14, 19, 24, 28, 32, 36 und 40. Gegnerprofile und Belohnungen stehen im Inhalt. R1–3 führen ein, spätere Wellen stellen One-Piece-Bosse dar. Die neuen Identitäten übernehmen die Mechanik ihrer früheren generischen Profile. | Thematische Aufwertung ohne Änderung der Kampfschwierigkeit oder des Gegenstandsflusses. |
| PvP | `createPairings()` in [pairing.ts](../game/pairing.ts) bewertet für maximal acht Plätze die vollständigen Paarungskombinationen. Es minimiert Wiederholungen, berücksichtigt jüngste Duelle und löst Gleichstand deterministisch mit dem Zufallszustand auf. Bei ungerader Zahl gibt es eine Geisteraufstellung. [matchFlow.ts](../game/matchFlow.ts) regelt Kapitänsschaden, Serien und gleichzeitige Eliminierungen. | Eine globale Auswahl verhindert, dass eine lokal gute erste Paarung den Rest der Runde verschlechtert. |
| Belohnungen | [itemRewards.ts](../game/itemRewards.ts) unterscheidet automatische, ausgewählte und mehrteilige Belohnungen. R5/8/11 bieten zusätzlich eine Komponentenauswahl. Frühe PvE-Siege liefern Komponenten, spätere Runden fertige Gegenstände. | Quellen und verfügbare Gegenstände lassen sich je Rundentyp prüfen. |
| Regatta | R4/12/17/22/27/34. [carousel.ts](../game/carousel.ts) und `advanceCarousel()` berechnen Boote, Kollision, Ansprüche und Tickfortschritt in 50 ms. [PhaserCarousel.tsx](../components/PhaserCarousel.tsx) zeigt diese Zustände in der Draufsicht. | Eindeutige Kollisions- und Belohnungsregeln unabhängig von der Darstellung. |
| Rekrutierung | R10 und R20 sind kampffrei, danach folgt R11 bzw. R21. [voyageRecruitment.ts](../game/voyageRecruitment.ts) verwendet Routenpräferenzen und passende Kostenbänder. Angebote reservieren Kopien im gemeinsamen Pool. Ungewählte Kopien werden freigegeben. Kann der gewählte Rekrut bei voller Bank auch nicht verschmelzen, kehrt die Kopie in den Pool zurück und der normale Goldwert wird gutgeschrieben. | Spieler erhalten eine Richtung, die Poolbilanz bleibt gültig, eine volle Bank blockiert die Reise nicht. |
| Hafen | [voyageEncounters.ts](../game/voyageEncounters.ts) verarbeitet Usopps Geschenke an R16/21 und Frankys 2-Gold-Angebote an R18/23. Der Hafen läuft vor der Vorbereitung derselben Runde und kann übersprungen werden. Nahrung ist eine eigene Angebotsart. | Zusätzliche Entscheidungen ohne doppelte Rundeneinnahmen oder Änderung des vorgesehenen Kampfes. |
| Ergebnis | `captureFinalLineup()` konserviert die eingesetzte Crew vom Kampfbeginn und die spätere Bank. `finalCrew` bleibt für historische Auswertungen erhalten. | Einkäufe und Fusionen während eines Kampfes erklären die aktuelle Bank, ohne die tatsächlich kämpfende Crew rückwirkend zu verändern. |

Die gewöhnliche Vorbereitung dauert 30 Sekunden, ausgewählte Runden 40.
Rekrutierungsfenster verwenden 23 Sekunden. Ein Kampf hat ein Limit von
45 Simulationssekunden. Der lokale Ablauf hat bei vollständig aufgelösten
Kämpfen ein kurzes Ergebnisfenster. `useMatchClock()` verwaltet die lokale
Uhr, während Friends bei getrennten Clients weiter Serverfristen verarbeitet.
Die genauen Zeiten und übernommenen PAC-Werte stehen in [B06 Pacing](B06_PAC_PACING.md).
Weitere Details enthalten [P10 PvE und Gegenstände](P10_FIXED_PVE_ITEM_ECONOMY.md),
[P11 Rekrutierung](P11_VOYAGE_RECRUITMENT_CHOICE.md) und [B07 Reiseentscheidungen](B07_VOYAGE_CHOICES.md).

## 4. Einheiten, Kampfsimulation, Gegenstände und Bots

| Mechanik | Funktion und Entscheidung |
| --- | --- |
| Pool, Shop und Fusion | [engine.ts](../game/engine.ts), [economy.ts](../game/economy.ts) und [roster.ts](../game/roster.ts) führen definitionsbezogene Poolkopien und konkrete `UnitInstance`-Objekte. Das Level steuert die Chancen pro Kostenband. Dreierfusionen, Verkäufe und Reservierungen beachten dieselbe Poolbilanz. Die Sternstufe einer Instanz skaliert Werte und Fähigkeiten nach getrennten Kurven. |
| Kampfstart | Die Engine friert die Aufstellung, Formen, Mahlzeiten, Ausrüstung und den Kampfkontext für die Begegnung ein. `simulateBattle()` in [combat.ts](../game/combat.ts) verarbeitet in 100-ms-Ticks Bewegung, Angriffe, Energie, Techniken, Zustände und Treffer. Selektoren lesen dieses Ergebnis auch während Käufen, Verkäufen und Fusionen im fortlaufenden Reisezustand. |
| Schaden und Zielwahl | Physical, Special und True Damage verwenden die dokumentierten Abwehr- und Mitigationsregeln. Ein Ability-Crit-Wurf pro Cast hält mehrteilige Techniken konsistent. `applySequentialStrikes()` kann verbleibende Hiebe nach einem Kill umleiten und die Krit-Abwehr des aktuellen Ziels pro Hieb beachten. Ungültige Teilwerte fallen auf normales Ability-Verhalten zurück. Phoenix-Wiederbelebung reserviert das Feld weiter, während die Einheit nicht anvisiert werden kann. |
| Synergien und Formen | [traits.ts](../game/traits.ts) berechnet effektive Traits, Tiers und ihre Effekte bzw. Reaktionsregeln. [forms.ts](../game/forms.ts) löst Formdefinitionen und persistente Fortschrittsbedingungen auf. Temporäre Formen erscheinen im Kampf und in seinen Ereignissen. Gemeinsame Form-IDs verbinden Engine, Asset-Auswahl und Wiedergabe. |
| Ausrüstung und Nahrung | `resolveItemRecipe()` in [items.ts](../game/items.ts) kombiniert Komponenten über einen kanonischen Schlüssel. [food.ts](../game/food.ts) verwaltet die Galley separat. `freezeBattleMeals()` überträgt eine vorbereitete Mahlzeit in die nächste eingefrorene Begegnung. Wiederholung oder Laden verbrauchen sie kein zweites Mal. |
| Bots | `runBotTurn()` und `planBotFormation()` in [engine.ts](../game/engine.ts) steuern Käufe, erlaubte Ausgaben und Stellung. [scoring.ts](../game/scoring.ts) liefert `scoreBotUnit()` und `scoreBotInstance()` für Nutzen, Sternstufe, Ausrüstung und Synergien. Bots kaufen und bewegen über dieselben Spielregeln, damit Reserven, Shopchancen und Pool auch für sie gelten. Produktionsanalysen rotieren die sieben Persönlichkeiten deterministisch über acht Bot-Plätze. |

Mechanikdetails stehen in [P4 Gegenstandssystem](P4_ITEM_SYSTEM_AUDIT.md),
[Formensystem](CHARACTER_FORM_SYSTEM.md), [B08 Status und Wetter](B08_STATUS_WEATHER_CONTRACT.md),
[B09 Nahrung](B09_FOOD_CONSUMABLES.md) sowie [Bot-Audit](BOT_ARCHITECTURE_AND_BIAS_AUDIT.md).

### Zwei Abläufe im Code

- **Rekrut kaufen.** Das HUD sendet `BUY_UNIT` mit dem Shopindex.
  `applyCommand()` kontrolliert Phase und Akteur, `buyFromShop()` prüft Preis
  und Aufnahme. Der Roster-Code verschmilzt passende Instanzen oder weist einen
  Bankplatz zu. Der anschließende View zeigt Gold, Shop und Bank aus demselben
  aktualisierten Zustand. Die UI muss weder den tatsächlichen Kauf vorhersagen
  noch den gemeinsamen Vorrat selbst verwalten.
- **Kampf ansehen und gleichzeitig einkaufen.** Beim Kampfbeginn wird eine
  Aufstellung für `simulateBattle()` eingefroren. `selectBattlePresentation()`
  liefert diese unveränderliche Begegnung für Phaser. Zulässige Shop- und
  Bankaktionen gehen weiterhin an `applyCommand()` und ändern den persistenten
  Reisestand. Dadurch greift eine während der Animation gekaufte oder
  verschmolzene Einheit in diesem Kampf nicht nachträglich ein.

## 5. Oberfläche, Eingaben, Assets und Audio

- `selectMatchView()` und `selectBattlePresentation()` in [selectors.ts](../app/selectors.ts)
  liefern Shop-, Board-, Synergie- und Kampfdaten. `selectCarouselView()`
  bedient hochfrequente Regatta-Updates ohne die vollständige Ansicht neu
  aufzubauen. [PacHud.tsx](../app/hud/PacHud.tsx) gruppiert häufige Aktionen
  und zeigt Detailinformationen bei Hover oder Tastaturfokus. Die One-Piece-
  Gestaltung und Herkunft des HUD stehen in [PAC HUD](PAC_HUD_PORT.md)
  und [HUD-Finish](ONE_PIECE_HUD_FINISH.md).
- [PhaserBoard.tsx](../components/PhaserBoard.tsx), [boardGeometry.ts](../components/boardGeometry.ts)
  und [boardSelection.ts](../components/boardSelection.ts) verbinden
  Zeigereingaben, Brettpositionen und sichtbare Trefferflächen. Phaser animiert
  Schnappschüsse und Kampfereignisse über [boardCombatPresentation.ts](../components/boardCombatPresentation.ts)
  und [battleVfx.ts](../components/battleVfx.ts). Treffer, Zielwahl und Schaden
  stehen bereits durch die Simulation fest. Dadurch kann die Darstellung
  beschleunigt, pausiert oder erneut abgespielt werden.
- Assets werden lokal aus [public/assets](../public/assets/) geladen. Manifeste
  wählen Karte, Figur, Form und Zustandsanimation. Bevorzugte Sheets werden
  für sichtbare Einheiten geladen, ältere Sheets dienen als Fallback.
  [source-matrix.json](../art/animation-v2/source-matrix.json) und
  [art/production/](../art/production/) halten Quellen, Frame-Maps und Nachweise
  fest. [scripts/assets/](../scripts/assets/) enthält die Generierung und
  [validate_assets.mjs](../scripts/validate_assets.mjs) die Prüfung der Outputs.
  So lassen sich Quellen und freigegebene Produktionsatlanten einzeln verfolgen.
- [useGameAudio.ts](../app/useGameAudio.ts) und [audioSettings.ts](../app/audioSettings.ts)
  behandeln Musik, Effekte und Stummschaltung im Browser. Audio folgt Ereignissen
  und verändert keinen Tick. Einstellungen für Kontrast, reduzierte Bewegung,
  Audio und Anzeige können lokal erhalten bleiben.

## 6. Speicherformate, Vorschau und Wiedergabe

| Speicher | Inhalt und Zweck |
| --- | --- |
| Aktiver Solo-Spielstand | [voyagePersistence.ts](../app/voyagePersistence.ts) speichert den aktiven Stand in IndexedDB. `writeVoyage()` prüft den Zeitstempel und schreibt in derselben Transaktion, damit ein verspäteter älterer Stand keinen neueren Checkpoint überschreibt. |
| Kompatibilität | [persistenceFormat.ts](../game/persistenceFormat.ts) migriert Schema 1–6. Neue Kampfsaves speichern das eingefrorene Ergebnis. `replayBattle` ist der Kompatibilitätspfad älterer Spielstände. Rekrutierung behält Angebote und Poolreservierungen, die Regatta Positionen, Steuervorgaben und Ticks. Abgeschlossene Übergänge und Auszahlungen werden beim Laden nicht erneut angewendet. |
| Chronik und Profil | [chronicle.ts](../app/chronicle.ts), [chronicleStorage.ts](../app/chronicleStorage.ts) und [replayValidation.ts](../app/replayValidation.ts) speichern und prüfen lokale Replay-Frames, Sammlung und Profilfortschritt. Importgrenzen und Formatprüfungen halten die Chronik von der laufenden Reise getrennt. |
| Teamplaner und Codex | [teamPlanner.ts](../game/teamPlanner.ts) validiert ein eigenes Version-1-Dokument. `simulateTeamPlan()` verwendet die normale Simulation in einem separaten Szenario. [plannerStorage.ts](../app/plannerStorage.ts) hält die lokale Planbibliothek. Codex und Tooltips greifen auf dieselben Inhaltsdefinitionen zu. Experimente verändern weder den laufenden Spielstand noch die Bot-Regeln. |
| Friends | [friendsVoyageStore.ts](../server/friendsVoyageStore.ts) speichert die laufende Reise in SQLite. Die separate Auth-DB hält Benutzer und Sitzungsdaten. Der Server prüft Inhaltsversion und -hash beim Laden einer Online-Reise. |

## 7. Privater Multiplayer und Identität

1. **Eintritt.** [friendAccess.ts](../server/friendAccess.ts) verwendet Better Auth,
   Googles Standard-Anmeldung und eine lokale Liste zugelassener
   Gmail-/Workspace-Konten. Bei der ersten erfolgreichen Anmeldung wird eine
   verifizierte Adresse an die stabile Google-ID gebunden. Die Freigabeliste
   wird beim Autorisieren erneut gelesen. Änderungen werden ohne Neustart wirksam.
2. **Einladung und Verbindung.** Der Server betreibt eine aktive Friends-Lobby.
   Der Host teilt ihren Link mit freigeschalteten Konten.
   [startLocalMultiplayer.ts](../server/startLocalMultiplayer.ts) prüft
   Browser-Origin und Sitzung beim HTTP-Reservieren. Der WebSocket-Upgrade und
   `FriendsRoom.onAuth()` prüfen erneut, ob die autorisierte Sitzung zur
   Reservierung gehört. Der Einladungslink allein erteilt keine Benutzerberechtigung.
3. **Autoritative Aktionen.** [friendsVoyage.ts](../server/friendsVoyage.ts)
   verwaltet Serverzeit und übergibt Befehle an den Domänenkern.
   `applyFriendsCommand()` prüft die beobachtete Runde und Phase nach
   Verarbeitung abgelaufener Fristen. `FriendsRoom` ordnet den Absender seinem
   Sitz zu. Jeder Client erhält die eigene Projektion. Beim Scouting bleiben
   fremde Shops, Reserven und loses Inventar verborgen. Die Regatta verwendet
   kompakte Positions- und Anspruchs-Updates zwischen vollständigen Ansichten.
4. **Quittung und Wiederaufnahme.** Der Server schreibt Zustandswechsel,
   Belohnungen und Quittungen vor der Veröffentlichung. Eine bekannte
   Befehls-ID liefert die vorhandene Quittung zurück, sodass ein Kauf nicht
   doppelt abgebucht wird. Uhr und Bewegung erhalten periodische Checkpoints.
   Ausfallzeit wird beim Neustart nicht als Spielzeit gerechnet. Autorisierte
   Spieler kehren auf bestehende Sitze zurück. Die Kampfanzeige kann nach
   einer Wiederverbindung die bestehende Animation vom Anfang zeigen.
   Die Serverzeit bleibt maßgeblich.
5. **Aufräumen und Sicherung.** Eine abgeschlossene Reise und ihre Quittungen
   werden entfernt, wenn alle Kapitäne das Ergebnis verlassen haben, oder nach
   einem Zehn-Minuten-Fenster, sobald alle getrennt sind. Manuelle Backups
   bleiben separat. Für einen Umzug gehören Auth- und Reise-DB zusammen, weil
   die Spieler-IDs für die Wiederaufnahme der Sitze benötigt werden.

**Warum diese Technik?** Colyseus stellt Räume, Reservierung und Transport
bereit. Die eigene Serverlogik konzentriert sich auf Identität, Befehle und
Wiederaufnahme. Google plus Better Auth erspart eigene Passwörter. SQLite
passt zu einem einzelnen dauerhaft beschreibbaren Host mit einem Raumprozess.
Startbefehle, Auth-Einstellungen und Backup-Beispiele stehen in der
[Multiplayer-Fachdokumentation](MULTIPLAYER_ARCHITECTURE.md).

## 8. Heimserver, Isolation und Betriebskosten

~~~mermaid
flowchart LR
    Browser["Browser · HTTPS und WSS"] --> Edge["Cloudflare Access · E-Mail-Freigabe"]
    Edge --> Tunnel["Dedizierter cloudflared-Connector · Access-JWT"]
    Tunnel --> Gateway["Caddy · Port 3000 im Projekt-Netz"]
    Gateway -->|"Loopback 3100"| Web["Vinext · gebaute Web-App"]
    Gateway -->|"Loopback 3101"| Node["Node · Better Auth und Colyseus"]
    Node --> State["Privater Zustand · SQLite und Freigabeliste"]
~~~

- **Ein Ursprung für den Browser.** Caddy leitet Login und Callback zu Better
  Auth, den Pfad `/mp1-socket/` zum Raumserver und reguläre Seiten nach einer
  Spielsessionprüfung zu Vinext. `/healthz` bleibt auf Loopback. Der gemeinsame
  HTTPS-Ursprung hält Cookie-, Callback- und WebSocket-Einstellungen zusammen.
- **Eigener Docker-Stack.** [compose.playtest.yaml](../deploy/compose.playtest.yaml)
  startet `game`, `proxy` und optional das Profil `cloudflare`. Caddy teilt den
  Netzwerk-Namespace des Spielcontainers und erreicht dessen Loopback-Listener.
  `cloudflared` erreicht den vorgesehenen Proxy über das eigene Docker-Netz.
  Der Stack veröffentlicht keine Host-Ports und bindet weder den Docker-Socket
  noch fremde Projektnetze ein. Release und Proxykonfiguration sind
  schreibgeschützt eingehängt. Der Spielzustand hat sein eigenes persistentes
  Verzeichnis.
- **Zwei Freigabeebenen.** Cloudflare Access prüft den Eintritt zur Domain
  per E-Mail-Code. `Protect with Access` lässt zusätzlich den Connector das
  Access-JWT prüfen. Better Auth prüft anschließend Googles Identität und die
  Freigabe fürs Spiel. Neue Konten brauchen beide Einträge. So sind auch die
  Spiel-Assets zugangsbeschränkt und die Anwendung sichert ihre Sitze separat ab.
- **Kostenrahmen.** Der eingerichtete Playtest verwendet den Free-Domain-Tarif,
  Zero Trust Free, einen normalen Tunnel-CNAME und das Standard-HTTPS-Zertifikat.
  In der Einrichtung wurden keine kostenpflichtigen Zusatzdienste aktiviert.
  Bei Erweiterungen bleiben Sitzkontingent und Tarif des Kontos maßgeblich.
  [Tunnel](https://developers.cloudflare.com/tunnel/concepts/routing/) ·
  [Access-Tarife](https://www.cloudflare.com/sase/products/access/) ·
  [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/)
- **Betriebsdaten.** OAuth-Client-Secret, Better-Auth-Secret, Tunnel-Token,
  tatsächliche Freigabeliste, Datenbanken und Backups bleiben in privaten Dateien
  außerhalb von Git. Die OAuth-Weiterleitung verwendet die exakte HTTPS-Origin
  mit `/api/auth/callback/google`. Release-Verzeichnis und persistente Daten
  bleiben für Auslieferung und Rückkehr zu älteren Versionen getrennt.
  GitHub-Merge und Serverdeployment sind zwei eigene Schritte.

Die Startbefehle und Pfade stehen im [Hosting-Runbook](MP5_HOME_HOSTING.md).
Das [MP6-Betriebshandbuch](MP6_PRIVATE_PLAYTEST.md) führt durch Spielabend,
Kapazitätsmessung, Zugangsverwaltung, Updates und Wiederherstellung.
Login über beide Stufen und der gehostete Playtest wurden bestätigt.
Ein vollständiger gehosteter Durchlauf wurde bisher nicht als abgeschlossen
gemeldet. Live-Inventar und Freigabelisten werden separat geführt.

## 9. Build, Messungen und PAC als Referenz

| Modus | Einstieg | Verwendung |
| --- | --- | --- |
| Solo und Werkzeuge | `npm run dev` | Browserentwicklung mit lokaler Spielleitung, Codex, Chronik und Planer. |
| Lokale Transportprobe | `npm run dev:multiplayer` | MP1-Versuch mit zwei lokalen Clients für eine Runde, ohne Google-Sitzung. |
| Lokale Friends-Reise | `npm run dev:friends` | Voller autoritativer Modus mit lokaler Google-Konfiguration und Friends-Lobby. |
| Gehostete Friends-Reise | `npm run build`, dann `npm run start:friends` oder der Compose-Stack | Gebaute App, separater Room-Listener und Reverse Proxy am selben Browser-Ursprung. |

- **TypeScript, React, Vinext und Vite.** Das Frontend verwendet
  Next-kompatible App-Router-Einstiege für Seiten, Layout und Metadaten.
  Vinext führt Entwicklung und Produktionsbuild auf Vite aus und benötigt
  die passenden React/RSC-Peers. Der Build wird als Node-Anwendung serviert.
  Cloudflare ist der Zugangsweg zum Heimserver.
- **Prüfungen.** [ci.yml](../.github/workflows/ci.yml) wählt die Prüfungen
  anhand der geänderten Dateien. Reine Dokumentation braucht keine Spieltests.
  Die breite CI prüft Kernänderungen und wird auch manuell angeboten.
  [release-soak.yml](../.github/workflows/release-soak.yml) hält die
  1.000-Seed-Messung separat für bewusst freigegebene Läufe.
  [Release-Verifikation](RELEASE.md)
- **Messungen.** [run_production_soak.ts](../scripts/run_production_soak.ts)
  treibt die echte Engine mit reproduzierbaren Seeds und berichtet Stabilität,
  Phasenlängen, Captain Damage, Shop- und Poolzugang, Crew, Traits, Formen
  und Ausrüstung. Baselines gehören zu ihrem Commit, Inhalt, ihrer
  Konfiguration, ihren Seeds und dem Rohbericht. 50 Matches zeigen Richtung
  und Stabilität. Aussagen über Balance brauchen zusätzlich die passende
  Stichprobe, Bot-Policy und den Kontext der Baseline.
- **PAC.** Arbeitsreferenz ist [Pokémon Auto Chess am festgehaltenen Commit](https://github.com/keldaanCommunity/pokemonAutoChess/tree/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee).
  Anwendbare Zeitbudgets und Teile des Rundentakts wurden direkt übernommen.
  Rekrutierung, Regatta, HUD und Raumautorität wurden an den lokalen
  Spielkern angepasst. PACs Konto-, Community-, Datenbank- und öffentliche
  Matchmaking-Infrastruktur bleiben Referenzen für diese Betriebsgröße.
  Für neue Spielsysteme dokumentiert der Fachplan, was direkt übernommen
  werden kann, was angepasst wird und welche Teile außerhalb des Projekts bleiben.
