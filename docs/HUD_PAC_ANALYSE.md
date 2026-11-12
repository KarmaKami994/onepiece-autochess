# HUD vor 1.0 — Bestand, PAC-Vergleich und Designempfehlung

Stand: 12.11.2026. **Analyse und gewählte Zielrichtung: PAC-HUD-Parität.**
Die anschließende Umsetzung und ihre Prüfung sind in
[`PAC_HUD_PORT.md`](PAC_HUD_PORT.md) dokumentiert; die Diagnose unten beschreibt
den Stand vor dieser Umsetzung.
Lokale Basis: `041741933e9459e669998c002dc5eff43356472f` (B12 / PR #74).
GameContent `1.34.0`, Save Schema `6`; „vor 1.0“ bezeichnet den Produktstand,
keinen Auftrag zur Änderung dieser technischen Versionsnummern.

PAC-Projektreferenz bleibt `a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`.
Für den aktuellen HUD-Vergleich wurde außerdem der am 12.11. abgefragte
`master`-Stand **`9ab1e9a89048bec9fcac591359fad9f59c4399a3`** fixiert.
Das aktualisiert unsere Gameplay-Referenz nicht. Die Shop-Gruppierung ist
auch am bisherigen Pin belegt; neuere CSS-Details werden nicht als historischer
Stand ausgegeben.

## 1. Diagnose

**Besitzerkorrektur nach der ersten Analyse:** Das HUD soll wie PAC aussehen und
sich entsprechend bedienen lassen. Ein eigener nautischer Layoutentwurf ist
damit überholt. Farben und One-Piece-Assets können angepasst werden; Anordnung,
kompakte Synergiedarstellung, Item-Hover und Detailkarten folgen PAC. Der Besitzer
erlaubt ausdrücklich auch die direkte Übernahme passenden PAC-Codes. Die
folgenden Bestandsbefunde bleiben gültig; Zielvorgabe ist Abschnitt 4.

Unser HUD enthält bereits die meisten benötigten Funktionen. Das größte
Designproblem ist ihre Gewichtung und Verteilung: viele ähnlich kräftige Rahmen,
lange Erklärungen in schmalen Spalten, kleine Texte und getrennte Wirtschafts-
aktionen. Die neuen B12-Icons lösen diese Layoutprobleme allein nicht.

PAC ist ebenfalls dicht und nutzt viele Overlays. Sein übertragbarer Vorteil
ist die Gruppierung zusammengehöriger Entscheidungen und die Trennung zwischen
kompakter Dauerinformation und ausführlichen Details auf Abruf. Die Bewertung
der Lesbarkeit hier ist eine Designbeurteilung, keine Nutzerstudie.

## 2. Unser aktueller Bestand

| Zone | Aktuelle Inhalte | Stärke / Problem |
| --- | --- | --- |
| Oben | Stage, Gegner/Scouting, Phasenuhr, Pause, Save, Einstellungen | Uhr und Gegner vorhanden; Rahmen, Trennlinien und Hilfsinformationen konkurrieren visuell |
| Links | Bonds, Galley, Inventar samt Empfängerauswahl | Vollständige Bedienung, aber lange Bond-/Food-Erklärungen und Leerzustände belegen dauernd Platz |
| Mitte | Phaser-Deck, Bank, Formation-Hilfe, Wetter/Felder, Kampfbericht, Wiedergabe, Mahlzeit | Spielfeld vorhanden; mehrere unabhängige Informationslagen am oberen Rand |
| Rechts | Captain-Standings **oder** ausgewählter Crew-Inspector | Auswahl verdrängt die globale Gegnerübersicht; Details benötigen eine schmale, scrollende Spalte |
| Unten links | Captain-HP, Level, XP-Kauf, Crew-Kapazität | Wichtige eigene Werte sind vorhanden |
| Unten Mitte | Sechs Shopangebote, Hover-/Fokus-Vorschau und Kaufhinweise | Gute Merge-/Bond-Prognosen; kurze Namen/Traits werden auf engen Karten abgeschnitten |
| Unten rechts | Gold/Einkommen, Reroll, Lock, Ready/Skip | Gold und Reroll liegen weit vom XP-Kauf entfernt; verschiedene Entscheidungen teilen dieselbe Fläche |

Belegte Dimensionen aus `app/game.css`, keine neue Browsermessung:

- Topbar **56px**, Footer **164px**: zusammen 220px, also rund **30,6%**
  einer 720px hohen Viewportfläche bzw. **20,4%** bei 1080px, bevor weitere
  Binnenabstände berücksichtigt sind.
- Standard-Seitenspalten **190px + 220px**: zusammen 410px Rasterbreite,
  rund **32,0%** bei 1280px bzw. **21,4%** bei 1920px. Der Phaser-Canvas liegt
  hinter dem HUD; diese Rechnung beschreibt Spaltenbudgets, keine gemessene
  Canvas-Verkleinerung oder vollständig verdeckte Pixelmenge.
- Viele Hilfen/Beschriftungen liegen bei **8–12px**, häufig Courier New,
  Versalien und zusätzlichem Zeichenabstand. Das wird besonders bei 1280×720
  in den gespeicherten Aufnahmen sichtbar.
- Der Inspector hat 220px Spaltenbudget und zeigt HP, ATK, DEF, RANGE, SPEED,
  POWER. **Special Defense fehlt als eigener Stat** in diesem Raster; lange
  Namen, Traits, Fähigkeit und Ausrüstung konkurrieren um denselben Platz.
- Shop und Inspector haben bereits kontextuelle Informationen. Es geht um
  deren bessere Darstellung, nicht um die Einführung eines neuen Info-Systems.

Quellen lokal: `app/screens/GameScreens.tsx` (MatchScreen, TraitsPanel,
ShopDecisionPreview, InventoryTray, UnitInspector), `app/game.css`,
`app/GalleyTray.tsx`, `app/PhaseClockDisplay.tsx`, `components/boardGeometry.ts`.
Gesichtet wurden vorhandene echte B12-Aufnahmen bei beiden Desktopgrößen,
u.a. `art/qa/b12/browser/desktop-1280/inspector.png` und
`art/qa/b12/browser/desktop-1920/battle-meals.png`. Das sind Fixtures, keine
repräsentative Messung einer späten, voll besetzten Produktionsrunde.

## 3. Wie PAC die vergleichbaren Aufgaben löst

| Thema | PAC-Implementierung | Sinnvolle lokale Übernahme |
| --- | --- | --- |
| Typografie | Lokal gebündelte Jost; 16px HTML-Grundschrift, Detailkarte ebenfalls 16px | PAC-Typografie und Größenhierarchie als Vorlage übernehmen; Farben/One-Piece-Assets anpassen |
| Wirtschaftsentscheidungen | GameShop gruppiert Life/Money/Streak/Team, Lock/Refresh, Angebote und Experience | Gold, Level/XP, Shop und Kaufaktionen zu einer zusammengehörigen unteren Entscheidungszone ordnen |
| Einkommen | Kurze Geldanzeige; ausführliche Aufschlüsselung als GameMoneyDetail | Kompakte Zahl und nächstes Einkommen; Rechenbestandteile auf Abruf, unveränderte lokale Werte |
| Gegner | Rund 70px breite Player-Leiste; Avatar, Lebensring/-zahl, ausgewählter Spieler markiert; Details im Tooltip | PAC-Leiste mit unseren Captain-Identitäten und HP; Namen/weitere Daten im Hover-Detail |
| Synergien | Eigenes verschiebbares Synergiefenster; Details über die Synergie-Komponenten/Tooltips | PAC-Zeile mit Icon, großer Anzahl, Schwellen und Name; Hover-Detail und Hervorhebung der zugehörigen Crew |
| Crew-Details | Gemeinsame Detaildarstellung u.a. für Porträt-Tooltips; CSS mit max. 320px, Icon-/Stat-Raster und Fähigkeit | Größere kontextuelle Crew-Karte statt permanentem 220px-Inspector; Bedienbarkeit per Fokus/Klick erhalten |
| Rundenkontext | StageInfo zentriert; StagePath zeigt einen Ausschnitt aus Vergangenheit und kommenden Stationen mit Icons/Ergebnissen | Kompakte Route aus unseren vorhandenen PvE-/PvP-/Carousel-/Recruitment-/Hafen-Daten statt zusätzlicher Dauertexte |
| Items | Phaser-ItemsContainer unterscheidet Inventar-/Trägeransicht und ordnet Icons; Details werden separat geöffnet | Iconorientierte Bedienung übernehmen, aber lokale React-Inventar-/Command-Autorität erhalten |
| Responsivität | Viewport-/Seitenverhältnis-Regeln; Shop bei schmalen Formaten umgeordnet, bei ≤1280px teils 75% Schriftgröße | Mehrere bewusste Layoutbudgets statt nur Schrumpfen; PACs kleinen Schrift-Fallback nicht ungeprüft übernehmen |

Wichtig: `max-height: 20vh` am PAC-Shop ist **kein Beleg**, dass sein gesamtes
HUD höchstens 20% Höhe beansprucht. Informationszeilen und andere Overlays liegen
teilweise außerhalb dieses Containers. Ebenso sind 70px, 200px oder `8vw` keine
für unser Spiel automatisch passenden Designkonstanten.

## 4. Zielvorgabe: PAC-HUD und PAC-Interaktionsmuster

**PAC ist die direkte Vorlage.** Bestehende passende JSX-/CSS-Teile dürfen
übernommen werden. Der erste Vorschlag mit eigener Panel-/Schriftaufteilung
wird nicht weiterverfolgt. Lokale Unterschiede sind Daten-/Asset-Anbindung,
vorhandene One-Piece-Funktionen und die weiterhin geltenden Bedien-/Domainregeln.

### 4.1 Synergien wie PAC

- Dauerhaft nur kompakte Zeilen für vertretene Synergien: Icon, große aktuelle
  Anzahl, Reihe der Aktivierungsschwellen und Name. Aktive Stufe und noch nicht
  erreichte Schwellen sind visuell unterschiedlich gewichtet.
- Hover öffnet die eigentliche Informationskarte rechts neben der Liste:
  Name/Icon, Beschreibung, alle lokalen Tier-Effekte mit hervorgehobener
  aktueller Stufe und passende Charakterporträts. Vorhandene und fehlende Crew
  werden unterscheidbar dargestellt, ohne PAC-Pokémon-Kategorien zu importieren.
- Hover hebt passende sichtbare Crew hervor; Zähler und Aktivierung stammen
  weiterhin aus unseren bestehenden Trait-Selectors, nicht aus dem Hover-Code.
- PAC nutzt hier einen gemeinsamen Tooltip, 100ms Öffnungsverzögerung,
  `right-start` und bei Verlassen sofortiges Schließen. Das ist die konkrete
  Maus-Referenz. Fokus/Klick und Escape erhalten einen gleichwertigen Zugang.
- Keine ständig ausgeschriebenen Mechanikabsätze in der schmalen Synergieliste.

### 4.2 Item-Informationen wie PAC

- Im normalen Zustand nur Item-Icons. Hover zeigt eine richtige Detailkarte:
  Icon, Name, Kategorie, Stats, Beschreibung und gegebenenfalls das Rezept.
- Komponenten zeigen Kombinationen als **anderes Komponenten-Icon + Ergebnis**
  in einem visuellen Raster. Die Icons darin besitzen eigene Detail-Hover;
  PAC verhindert dabei rekursiv immer neue Rezeptlisten.
- Referenzbreite aus PAC: 200–440px, Icon/Name/Stats oben, Beschreibung und
  Kombinationen darunter. Damit ersetzt eine lesbare Karte die heutige lange
  Textzeichenfolge in einem schmalen CSS-Tooltip.
- PAC öffnet Itemdetails nach 100ms. Beim Inventar darf der Zeiger in die
  Detailkarte wechseln; das Überfahren der Karte verhindert das Schließen.
  Ein anderer Item-Hover schließt die bisherige Itemkarte. Diese Übergänge
  müssen als zusammenhängende Interaktion übernommen werden.
- Equip/Crafting bleibt eine bewusste Aktion. Hover zeigt Informationen und
  Vorschauen und löst keinen Kauf, Verbrauch oder Command aus.
- Darstellung für Inventar, getragenes Item, Shop-/Reward-Kontext und Food
  konsistent halten; Food bleibt fachlich von Ausrüstung und Rezepten getrennt.

### 4.3 Das übrige HUD folgt ebenfalls PAC

- Schmale Captain-/HP-Leiste rechts mit kontextuellen Details; keine große
  Standings-/Inspector-Wechselspalte.
- Zentrierte Stage-/Routenanzeige mit Phasen-/Gegnerkontext.
- PAC-Shop-Komposition: HP/Gold/Streak/Team-Kurzwerte oberhalb der unteren
  Leiste, Lock/Refresh bei den Angeboten, sechs lokale Shopkarten und XP/Level
  in derselben Komposition. Die lokale Ready-/Skip-Funktion bleibt erreichbar.
- PAC-Detailkarten für Crew statt permanentem Inspector; vorhandene lokale
  Werte einschließlich Special Defense und One-Piece-Fähigkeiten einbinden.
- PAC-Typografie, Panelhierarchie, Rundungen, Abstände und kompakte Fenster
  bilden den Ausgangspunkt. Farben sind anpassbar; unsere vorhandenen
  Porträts, B12-Icons und Decks bleiben die Spielidentitäten.
- Positionen/Größen anhand der PAC-Referenz bei 1280×720 und 1920×1080
  übertragen. Die bisherige breite nautische Panelgestaltung ist kein Ziel.

### 4.4 Konkrete Übernahmekandidaten

| PAC-Quelle | Lokale Anbindung |
| --- | --- |
| `synergies.tsx`, `synergy-component.tsx` | Bestehende TraitView-/Selector-Daten; kompakte Zeile, Hover-Auswahl und passende Crew-Hervorhebung |
| `synergy-detail-component.tsx` | Unsere 13 Traits, Tiertexte und vorhandenen Crewporträts; keine Pokémon-Familien-/Regional-/Sonderregeln |
| `item-detail.tsx`, `item-detail.css` | Unsere Item-Views, 65 Item-IDs, 55 Rezepte und B12-Icons; insbesondere React-Detailinhalt und Karten-CSS |
| `item-container.ts` | Hover-/Schließ-/Zeigerübergänge als Referenz; React-DOM-Trigger und bestehende Equip-Commands statt neuem Phaser-UI-Eigentümer |
| `game-shop.*`, `game-stage-info.*`, `game-player.*`, Crew-Detail-CSS | PAC-Aufbau mit unseren bestehenden MatchView-Daten und Callbacks |

Übernommene Teile mit exaktem Quellpfad/SHA und geltenden Lizenz-/Attributions-
hinweisen dokumentieren. Nur nötige Daten-/Import-/Asset-Anpassungen; kein
paralleler, eigenständig neu entworfener HUD-Baukasten.

## 5. Übernahmegrenzen

| Einstufung | Empfehlung |
| --- | --- |
| DIRECT, soweit lokal passend | PAC-JSX/CSS für HUD-Komposition, Synergiezeilen und Detailkarten, visuelle Rezeptinformationen, Typografie/Panelstil und Maus-Hover-Verhalten |
| ADAPTED | PAC-State/Enums/Imports an lokale Props/Selectors/Commands anbinden; One-Piece-Texte/Assets; gleichwertiger Fokus-/Klick-Zugang; passende viewportgebundene Positionen |
| REFERENCE ONLY | Pokémon-spezifische Inhalte und zusätzliche PAC-Systeme, die lokal nicht existieren |
| REJECT für diesen HUD-Auftrag | Redux/Store-Port, Firebase/Colyseus/Netzwerk, Wechsel des UI-Eigentümers zu Phaser, neue Gameplayregeln oder Inhalte |

Insbesondere keine shop- oder gameplaywirksame „Vereinfachung“: Battle-Economy,
Bankkäufe, bestehende XP-/Reroll-/Equip-Legalität, Scouting-Rechte, Ready/Skip,
Phasenzeiten und Pause/Resume bleiben bestehen. Kampfansicht ist kein Grund,
heute erlaubte Wirtschaftsaktionen zu verstecken oder zu deaktivieren.
React bleibt Eigentümer der Anwendungs-UI, Phaser der Spielpräsentation;
State, Commands, Saves und Replay bestimmen weiterhin die Wahrheit.

## 6. Empfohlene Reihenfolge vor 1.0

1. **PAC-Parität ist als Richtung gewählt:** Keine erneute Grundsatzentscheidung
   über einen eigenen HUD-Stil verlangen. Für die Umsetzung PAC-Zustände mit
   Synergie-Hover, Item-Hover/Rezept-Hover, Crew-Detail und Shop direkt zuordnen.
2. **Ein zusammenhängender PAC-HUD-Port:** Zugehörige Darstellung gemeinsam
   übertragen und an vorhandene Komponenten/Selectors/Commands anbinden.
   Vorbereitung mit vollem Shop/Inventar und Kampf mit acht Captains, aktiven
   Bonds und Meal berücksichtigen. Keine neue UI-State-/Theme-Infrastruktur.
3. **Erst danach gezielte Abnahme:** Lesbarkeit, Fokus/Tastatur, Equip/Crafting,
   Scouting, Battle-Economy, Pause/Resume/Replay und Overlay-Flächen. Vor späteren
   Prüfungen gilt weiterhin die Besitzerfreigabe. Keine Baseline-/Balance-Arbeit.

## 7. Quellen und Grenzen der Aussage

PAC am fixierten aktuellen Stand `9ab1e9a89048bec9fcac591359fad9f59c4399a3`:

- [Schriftbasis](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/style/fonts.css)
- [Shop-Komposition](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-shop.tsx), [Shop-/Viewport-CSS](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-shop.css)
- [Einkommensdetails](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-money-info.tsx)
- [Spielerleiste](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-players.css), [Spieler/Tooltip](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-player.tsx)
- [Synergiefenster](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-synergies.tsx)
- [Gemeinsamer Synergie-Hover](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/synergy/synergies.tsx), [kompakte Zeile und Crew-Hervorhebung](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/synergy/synergy-component.tsx), [Tier-/Porträt-Details](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/synergy/synergy-detail-component.tsx)
- [Itemkarte/Rezept-Hover](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/game/components/item-detail.tsx), [Karten-CSS](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/game/components/item-detail.css), [Item-Zeiger-/Hover-Verhalten](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/game/components/item-container.ts)
- [Detailkarten-Stil](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-pokemon-detail.css), [Porträt/Detail-Verknüpfung](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-pokemon-portrait.tsx)
- [StagePath](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-stage-info.tsx), [Stage-CSS](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/pages/component/game/game-stage-info.css)
- [Phaser-Inventar](https://github.com/keldaanCommunity/pokemonAutoChess/blob/9ab1e9a89048bec9fcac591359fad9f59c4399a3/app/public/src/game/components/items-container.ts)
- [Shop am bisherigen Projekt-Pin](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/public/src/pages/component/game/game-shop.tsx)

Quellcode und vorhandene lokale Screenshots wurden gelesen/gesichtet. Keine
PAC-Live-Partie, neuen lokalen Browserfälle, Tests, Typechecks, Builds,
Asset-Validierung, CI-Läufe, Soaks oder Nutzerstudien für diese Analyse.
Keine Implementierung, kein Commit/Push/PR und keine Versionsänderung.
