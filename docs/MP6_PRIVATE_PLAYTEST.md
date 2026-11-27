# MP6 – Geschlossener Spielabend und Betriebsübergabe

Die [Architektur](ARCHITECTURE.md) erklärt die Spiel- und Servergrenzen. Das
[MP5-Runbook](MP5_HOME_HOSTING.md) beschreibt die Einrichtung. Dieses Handbuch
deckt Abnahme und laufenden Betrieb für die bereits eingerichtete Friends-Instanz
ab. Ziel sind **acht Menschen pro Lobby**. Ab **zwei verbundenen Menschen**
kann der Host starten. Bots füllen die übrigen Plätze auf acht. Bei zwei
Menschen sind es sechs Bots, bei acht Menschen startet die Partie ohne Bots.
Eine Instanz führt jeweils eine Lobby. Ein kleiner Turnierabend kann Partien
nacheinander spielen. Die Kapazität für acht Menschen muss noch im echten
Betrieb bestätigt werden.

## 1. Abnahme mit echten Spielern

| Schritt | Durchführung | Bestanden, wenn |
| --- | --- | --- |
| Externer Einstieg | Zwei Spieler mit unterschiedlichen freigeschalteten Google-Konten auf Privatgeräten und in zwei Netzen. Der Host erstellt eine Lobby und teilt deren Link. Der zweite Spieler öffnet den Link. | Mit einem Kapitän bleibt Start gesperrt. Sobald beide verbunden sind, kann der Host starten. Die Partie hat zwei Menschen und sechs Bots. |
| Komplette Voyage | Von der ersten Rekrutierung bis zum Ergebnis spielen. Eigene Shops, Kaufquittungen, Timer und eine erreichbare Regatta beobachten. | Beide können rechtzeitig handeln, Angebote bleiben sitzbezogen, beide sehen dasselbe Rundenergebnis und die Reise endet regulär. |
| Reload | Während der Vorbereitung eine bestätigte Aktion ausführen, Gold/Einheit und Sitz notieren, einen Browser neu laden. | Der eigene Sitz, der bestätigte Kauf und der fortgeschrittene Timer erscheinen nach dem Wiedereintritt. |
| Verbindungsverlust | Einen Browser kurz vom Netz trennen und über die gleiche Einladung mit demselben Konto wieder öffnen. Den anderen Spieler verbunden lassen. | Die Reise läuft für den verbundenen Spieler weiter. Der andere kehrt auf denselben Sitz zurück. Bereits bestätigte Aktionen erscheinen einmal. |
| Ergebnis und Aufräumen | Beide Spieler verlassen die Ergebnisansicht über das Menü. Danach eine neue Lobby anlegen. | Der abgeschlossene Stand blockiert die nächste Reise nicht. Liegt noch eine getrennte Sitzung ohne bestätigten Ausstieg vor, gilt die dokumentierte Zehn-Minuten-Aufbewahrung. |

Die Schritte gehören in **eine vollständige Partie mit zwei Spielern**.
Danach die besetzten Plätze auf vier, sechs und acht steigern. Die Zielgröße
ist bestätigt, wenn eine vollständige Partie mit acht Menschen ohne Bots
unter den beobachteten Bedingungen funktioniert. Für jeden Sitz ein eigenes Google-Konto
verwenden. Zwei Tabs desselben Kontos belegen denselben Sitz und messen keine
zusätzliche Kapazität. Die Ergebnisse aus MP5 belegen Login und grundsätzlichen
Zugang. Ein vollständiger externer Durchlauf wurde bisher nicht protokolliert.

## 2. Kapazität während der Partie erfassen

Eine Leerlaufmessung und Messpunkte bei Vorbereitung, Kampf und einer
erreichbaren Regatta erfassen. Für einen vergleichbaren Bericht Release,
Spielerzahl, Zeitfenster und Netztyp grob notieren. Eigene Geräte und
freigegebene Zugänge verwenden.

Aus dem privaten Deployment-Verzeichnis in einer Linux-Shell lassen sich die
Werte mit lesendem Docker-Zugriff anzeigen. Als Root entfallen die `sudo`-Aufrufe.

```bash
playtest() { sudo docker compose --env-file playtest.env -f compose.playtest.yaml --profile cloudflare "$@"; }
playtest ps game proxy tunnel
container_ids=$(playtest ps -q game proxy tunnel)
if [ -n "$container_ids" ]; then
  printf '%s\n' "$container_ids" | xargs sudo docker stats --no-stream
fi
free -h
```

| Signal | Erfassen |
| --- | --- |
| CPU und RAM | Wiederholte Stichproben pro Spielphase. `docker stats` pro Container und `MemAvailable` auf dem Host festhalten. Auf Neustarts, Speicherdruck und anhaltende CPU-Sättigung achten. |
| Upload | Gesendete Bytes des Uplinks über ein festes Zeitfenster vergleichen. Der `NET I/O`-Anstieg des Tunnelcontainers hilft bei der Zuordnung zum Spiel. Die Zähler von Spiel und Caddy wegen des gemeinsamen Netzwerk-Namespace nicht addieren. Host-Gesamttraffic enthält auch andere Projekte. |
| Kauf und Regatta | Bei mehreren normalen Käufen die Zeit zwischen Eingabe und sichtbarer Bestätigung notieren. In der Regatta auf spürbar verzögertes Steuern, fehlende Bestätigungen und Wiederverbindungen achten. Client, Netztyp und Phase zur Beobachtung notieren. |

| Release | Menschen | Netze | Phase / Zeitpunkt | CPU / RAM / Upload | Kauf / Regatta | Ergebnis |
| --- | ---: | --- | --- | --- | --- | --- |
| zu erfassen | 2 | zwei externe Netze | komplette Voyage | offen | offen | ausstehend |
| zu erfassen | 4 / 6 | mehrere Netze | Zwischenstufen | offen | offen | ausstehend |
| zu erfassen | 8 | mehrere Netze | komplette Voyage | offen | offen | ausstehend |

Die bestätigte Gruppengröße ist die höchste getestete Stufe mit stabiler
Bedienung, funktionierendem Wiederbeitritt und beobachteter Reserve auf dem
Host. Abbruch, dauerhafte Verzögerung oder Wechselwirkungen mit anderen
Diensten begrenzen diese Freigabe. Einladungs-URLs, E-Mails, Cookies und
Rohlogs gehören in private Aufzeichnungen.

## 3. Freunde freigeben und entfernen

1. **Hinzufügen.** In der gemeinsamen Cloudflare-Access-Regel des Playtests
   unter `Include > Emails` die vollständige Adresse ergänzen. Dieselbe Adresse
   in die private `friends.json` des Spiels eintragen. Die Datei lässt sich mit
   Nano öffnen und speichern. Vorhandene Adressen stehen lassen und die Einträge
   mit Kommas trennen. Der Spielserver liest die Liste beim Autorisieren erneut.
   Für eine Freigabe genügt Speichern ohne Git-Commit oder Neustart.
2. **Beitreten.** Jeder bestätigt bei Cloudflare den E-Mail-Code und meldet sich
   im Spiel mit seinem freigeschalteten Google-Konto an. Der Host teilt den
   Lobby-Link erst danach. Beim Zwei-Geräte-Test bleiben zwei unterschiedliche
   Konten angemeldet.
3. **Entfernen.** Zuerst aus der Spielfreigabeliste entfernen. So verliert die
   Sitzung bei der erneuten Autorisierungsprüfung den Spielzugang. Danach die
   Access-Regel für diese Adresse entfernen. Andere Einträge, Domains und
   Tunnel beibehalten. Die Spiel- und Auth-Datenbank für diese Änderung erhalten.

## 4. Neustart, Backup, Update und Rollback

Wartung planbar zwischen Partien durchführen und den Status der Lobby mit dem
Host abstimmen. Alle `playtest`-Befehle beziehen sich auf das oben definierte
Compose-Projekt. Aktuellen Release, `playtest.env`, Compose-Datei und Caddyfile
als zusammengehörigen Betriebsstand sichern. Live- und Testdaten liegen in
getrennten Verzeichnissen.

1. **Privat starten oder wieder starten.** `playtest up -d game proxy` startet
   die Kerncontainer. `playtest ps game proxy` zeigt deren Zustand. Im
   Spielcontainer ist `http://127.0.0.1:3101/healthz` für die Raum-Readiness
   erreichbar. Alle Startkommandos nutzen dieselbe öffentliche Origin wie der
   Google-Callback. Nach der privaten Kontrolle startet `playtest up -d tunnel`
   den Connector zum eingerichteten Access-geschützten Hostnamen.
2. **Konsistente Sicherung.** `playtest stop tunnel proxy game` hält dieses
   Projekt an. Als Dateieigentümer mit Node und den Abhängigkeiten des
   Releases aus dessen Arbeitsverzeichnis `npm run multiplayer:backup --`
   einmal mit einem neuen Ziel und dem expliziten Quellpfad für `auth.sqlite`
   und einmal für `voyage.sqlite` ausführen. Vor dem Start die beiden Ausgaben
   auf Erfolg prüfen. Ein privates Backup-Manifest vermerkt Release-SHA und
   Datum. Die Auth-DB gehört zur Reise-DB, weil sie die Sitzzuordnung hält.
   Die Betriebsdateien und Secrets separat privat halten.
   [Backup-Befehle](MULTIPLAYER_ARCHITECTURE.md#back-up-and-restore)
3. **Update.** Den vorgesehenen Merge-Commit in einem neuen Release-Verzeichnis
   auschecken, Abhängigkeiten aus dem Lockfile installieren und den Build
   erstellen. Das Ergebnis vor Wartungsbeginn fertigstellen. Die privaten
   Laufzeitwerte für das neue Release übernehmen. Nach der Sicherung
   `GRAND_LINE_RELEASE_DIR` und bei Bedarf die zugehörige Caddy-/Compose-Version
   umstellen. `playtest up -d --force-recreate game proxy` baut die gemeinsame
   Netz- und Mount-Zuordnung neu auf. Nach dem privaten Starttest den Tunnel
   wieder anschließen. Zustandsdateien behalten ihren eigenen Pfad.
4. **Rollback.** Den Tunnel zuerst stoppen. Bei einem Releasefehler die
   vorherige Konfiguration und den vorherigen Release-Pfad wiederherstellen.
   Einen vom neuen Release beschriebenen Datenbestand nur mit kompatiblem
   Code öffnen. Wenn die Kompatibilität unklar ist, den früheren Stand mit dem
   passenden Backup-Paar aus Schritt 2 starten und den neueren Datenbestand
   erhalten. App und Proxy nach dem Rückwechsel neu erstellen und privat prüfen,
   dann den Tunnel anschließen.
5. **Restore-Probe.** Beide Backups in ein frisches, nur dem Betreiber
   zugängliches Verzeichnis kopieren. In einer separaten `restore.env`
   `GRAND_LINE_STATE_DIR` auf die Kopien setzen und das passende Release wählen.
   Das Prüfprojekt separat über `--project-name grand-line-restore` und
   `--env-file restore.env` starten, mit `game proxy` ohne Tunnel. Für eine
   Anmeldeprobe mit echten Konten die dafür vorgesehene private Origin samt
   passendem Google-Callback verwenden. Die
   aktuelle Freigabeliste übernehmen, damit ein früher entfernter Spieler
   durch ein älteres Backup keinen Zugriff erhält. Sitz, Phase und eine
   gespeicherte Aktion vergleichen. Die laufende Instanz bleibt unabhängig.

Für die Abnahme getrennt festhalten, ob Update, Rückkehr und Restore auf Kopien
praktisch durchgeführt wurden. Eine erfolgreiche Erstellung des Backups allein
bestätigt die Wiederherstellung noch nicht.

## 5. Kosten und Freigabe

| Bestand | Kostenentscheidung |
| --- | --- |
| Heimserver und Daten | Bestehende Hardware und Verbindung. Better Auth, Colyseus und SQLite laufen darauf. Strom, vorhandener Internetanschluss und eventuelle Domain-Verlängerung gehören zum regulären Betrieb. |
| Google-Anmeldung | Vorhandener OAuth-Webclient für grundlegende Identität, lokale Sitzungen. Für diese Einrichtung ist kein separates Auth-Abo vorgesehen. |
| Cloudflare | MP5 bestätigte Domain-Free und Zero Trust Free. Verwendet werden Standard-DNS, HTTPS, ein Tunnel und Access innerhalb des Free-Sitzkontingents. Vor einer Erweiterung das tatsächliche Kontingent im bestehenden Konto kontrollieren. Tarifwechsel oder Zusatzdienste erfordern eine eigene Entscheidung. [Access-Tarife](https://www.cloudflare.com/products/access/) · [Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/) · [DNS-Abrechnung](https://developers.cloudflare.com/dns/faq/) |

Das Ziel für den Dauerbetrieb beträgt **0 CHF zusätzliche Authentifizierungs-
und Cloudflare-Gebühren**. Der Abschluss braucht die bestätigte Gruppengröße,
einen protokollierten vollständigen externen Durchlauf einschließlich
Wiederbeitritt und eine dokumentierte Update-/Restore-Probe. Die Abnahme
dieser manuellen Schritte steht aus.
