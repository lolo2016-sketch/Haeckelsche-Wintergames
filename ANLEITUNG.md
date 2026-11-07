# Einrichtung

## 1. Firebase-Projekt anlegen (kostenlos)
1. Gehe zu https://console.firebase.google.com und erstelle ein neues Projekt.
2. Im Projekt: **Build → Firestore Database → Datenbank erstellen** (Modus "Testmodus" reicht fürs Erste).
3. **Projekteinstellungen (Zahnrad) → Deine Apps → Web-App (</>) hinzufügen.**
   Du bekommst ein Konfigurationsobjekt (`apiKey`, `authDomain`, …) — das trägst du in `firebase-config.js` ein.

## 2. Firestore-Regeln setzen
Unter **Firestore → Regeln** folgendes einfügen und veröffentlichen:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Wichtig:** Das ist bewusst offen (kein Passwort-Login vorhanden), passt aber zum Charakter
"Einladung an bekannte Leute". Jeder, der die Firestore-Projekt-ID kennt, könnte theoretisch
Daten ändern. Für ein privates Event ist das Risiko gering — für etwas Öffentlicheres müsste
man das später mit echten Firebase-Auth-Regeln absichern.

## 3. Auf GitHub Pages veröffentlichen
1. Neues GitHub-Repository erstellen, z. B. `team-draft`.
2. Alle Dateien (`index.html`, `admin.html`, `style.css`, `firebase-config.js` mit deinen echten
   Werten) hochladen/pushen.
3. **Repository → Settings → Pages → Branch: main, Ordner: / (root) → Save.**
4. Nach kurzer Zeit ist die Seite erreichbar unter:
   `https://DEIN-GITHUB-NAME.github.io/team-draft/`

## 4. Event vorbereiten
1. Öffne `https://.../team-draft/admin.html` (nur für dich — Link nicht weitergeben).
2. Lege dort alle Kapitäne (mit Teamnamen) und alle Spieler an.
3. Für jede Person erscheint automatisch ein persönlicher Link + QR-Code — den kannst du
   ausdrucken, per WhatsApp schicken oder aufhängen.

## 5. Ablauf am Eventtag
1. Auf der Admin-Seite: **"Minispiel-Phase starten"** — Kapitäne sehen jetzt ihr Spiel
   (aktuell Platzhalter mit manueller Score-Eingabe).
2. Sobald alle Kapitäne einen Score haben: **"Draft starten"** — die Reihenfolge wird automatisch
   nach Score sortiert (höchster Score wählt zuerst).
3. Kapitäne wählen reihum Spieler von der Bank, auf ihrem eigenen Gerät.
4. Wenn die Bank leer ist, wechselt die Seite automatisch in die "fertig"-Ansicht mit allen Teams.

## Später: echtes Minispiel einbauen
Der Platzhalter in `index.html` (Abschnitt `state.phase === 'minigame'`) lässt sich durch dein
eigenes Spiel ersetzen. Wichtig ist nur: Am Ende muss der Score per
`updateDoc(doc(db, 'participants', token), { minigameScore: dein_score })` gespeichert werden —
den Rest (Ranking, Draft-Reihenfolge) übernimmt die App automatisch.

## Minispiel 1: Snake – Update für dein bestehendes Repo
(abgeglichen mit `lolo2016-sketch/Haeckelsche-Wintergames`, Stand 16.10.2026)

Dein Repo hat bereits: `index.html`, `admin.html`, `intro.html`, `style.css`,
`firebase-config.js` und `videos/admin2-intro.mp4`. Daran anknüpfend:

### 1. Zwei neue Dateien hochladen (ins Hauptverzeichnis, nicht in `videos/`)
- `snake.js`
- `minigame.js`

### 2. Zwei Dateien ersetzen
- `index.html`
- `admin.html`

Einfach über "Add file → Upload files" hochladen. GitHub überschreibt Dateien mit gleichem Namen
automatisch. Dabei fällt nur der alte Platzhalter (Score von Hand eintippen) weg. Admin-mit-Video,
Intro-Video und Firebase-Verbindung bleiben unverändert.

**Nicht anfassen:** `intro.html`, `style.css`, `firebase-config.js`, Ordner `videos/`.
(`videos/Platzhalter.txt` kannst du löschen, die wird nicht mehr gebraucht.)

### 3. Fotos für die Äpfel
Ordner `faces/` anlegen (beim Hochladen `faces/` vor den Dateinamen schreiben, wie bei `videos/`):
- `faces/face1.png`
- `faces/face2.png`

Jeder neue Apfel zeigt zufällig eines der beiden Gesichter (statt des Apfels).

Quadratische Porträts, Gesicht mittig. Solange sie fehlen, erscheinen normale rote Äpfel.

### 4. Firebase
Nichts neu anzulegen. Score, "hat gespielt" und die Aufzeichnung werden beim ersten Spiel
automatisch beim jeweiligen Kapitän gespeichert. Prüfe nur, dass unter
**Firestore → Regeln** noch `allow read, write: if true;` steht (ohne Datum).

### 5. Testen (geht schon jetzt, ohne Spieler und Kapitäne)
`admin.html` öffnen → Karte **"🎮 Minispiele testen"** → **"Snake ausprobieren"**.
Du spielst Tutorial, Übung und echten Versuch genau wie ein Kapitän, aber es wird **nichts
gespeichert** und die Phase bleibt auf "setup". Danach kannst du mit "Letzten Test als Wiedergabe
ansehen" prüfen, wie das Leaderboard-Video aussieht.

**Wichtig:** Zum Testen NICHT auf "Minispiel-Phase starten" drücken. Die Phase lässt sich nur mit
"Alles zurücksetzen" zurückdrehen, und das löscht alle angelegten Personen.

### Ablauf beim Event
Kapitän klickt "Spielen" → Tutorial (4 Hinweise) → beliebig viele Übungsrunden → **ein**
echter Versuch. Im Leaderboard sieht jeder die Versuche, sortiert nach Score (1×/2×/4× Tempo).
Geht ein Versuch technisch schief: in `admin.html` beim Kapitän "Versuch zurücksetzen".
"Draft starten" sortiert die Wahlreihenfolge automatisch nach dem Snake-Score.

## Passwortschutz der Admin-Seite
- Über den normalen Link `…/admin.html` erscheint eine Passwortabfrage (Passwort: das vereinbarte, Groß-/Kleinschreibung egal).
- Über den QR-Code eines Admins (`intro.html?t=…`) geht es nach dem Video ohne Passwort hinein.
- Jedes Gerät merkt sich den Zugang, man muss das Passwort dort also nur einmal eingeben.
- Passwort ändern: Claude bitten, die Prüfsumme `PW_HASH` in `admin.html` neu zu berechnen.

## Die Turnhalle (Halle, Tabs, Fotos pro Person)
**Neue Datei:** `hall.js` (Hauptverzeichnis). **Ersetzen:** `index.html`, `admin.html`.

- Jeder sieht unten Tabs: Kapitäne 🏟️ Halle, 🎮 Minispiel, 🏆 Leaderboard. Spieler 🏟️ Halle, 🏆 Leaderboard.
- Beim ersten Öffnen laufen alle in die Halle ein (Spieler auf die Bank, Kapitäne davor). Danach steht die
  Halle fertig da. Mit "▶ Einlauf" kann man die Animation erneut abspielen.
- Beim Draft tippt der Kapitän, der dran ist, auf einen Spieler. Dieser läuft dann zu seinem Team.
  Die Seite holt sich während Minispiel und Draft alle 8 Sekunden den neuen Stand.
- **Ausprobieren ohne angelegte Personen:** `index.html?demo=1` (oder Knopf in `admin.html`).

**Alle QR-Codes führen jetzt über `intro.html`:** Wer ein Video hat, sieht erst sein Video, alle anderen
kommen direkt in die Halle. Bereits ausgedruckte QR-Codes für Spieler/Kapitäne funktionieren weiter.

**Fotos und Videos pro Person** (in `admin.html` bei jeder Person eintragen, dann "Speichern"):
- Foto: z. B. `photos/max.png`, freigestelltes Gesicht wie bei Snake. Ohne Foto erscheinen Initialen.
- Video: z. B. `videos/max.mp4`
Die Dateien vorher in die Ordner `photos/` bzw. `videos/` im Repo hochladen.

**Hintergrundbild (optional):** Bild als `img/halle.png` hochladen, dann ersetzt es die gezeichnete Halle.
Hochformat 4:5, leere Turnhalle ohne Personen und ohne Bänke (die Bänke zeichnet die Seite selbst).

## 3D-Halle (ersetzt die 2D-Halle, die bleibt als Rückfall für sehr alte Handys)
**Neue Datei:** `hall3d.js`. **Ersetzen:** `index.html`, `admin.html`. `hall.js` bleibt im Repo (Rückfall).

- Wer seinen Link zum ersten Mal öffnet, läuft in der Third-Person-Ansicht durch die Tür zu seinem Platz.
  Danach sieht man die Halle aus den eigenen Augen und kann durch Wischen nach links/rechts schauen.
- Sitzplatz = Ankunftsreihenfolge: Der Erste sitzt ganz links (am weitesten von der Tür), bis 18 pro Bank,
  danach die nächste, höhere Bankreihe. Kapitäne stehen vor der Bank und schauen die Spieler an.
- Wer neu ankommt, läuft für alle sichtbar live herein (Live-Updates statt ständigem Nachladen;
  schont das kostenlose Firebase-Kontingent).
- "👁 Übersicht" zeigt die Halle von vorne oben, "▶ Einlauf" spielt den eigenen Einlauf erneut.
- Draft: Der Kapitän, der dran ist, tippt einen leuchtenden Spieler an; dieser steht auf und läuft zu seinem Team.
- In `admin.html` pro Person: Foto, Video, **Haare kurz/lang** (für die Rückansicht der Figur) und
  ob die Person schon da ist (✅ in der Halle).
- Demo ohne angelegte Personen: `index.html?demo` (als Spieler einlaufen) und `index.html?demo=kapitaen`
  (als Kapitän wählen), auch als Knöpfe in `admin.html`.

## Winterwelt (statt Hallenwände)
**Neue Datei:** `winter.js`. **Ersetzen:** `hall3d.js`, `index.html`.
- Der Hallenboden steht jetzt als Holzplattform im Schnee, ohne Wände und Decke. Bank, Sitzplätze,
  Kapitäne und Draft funktionieren wie vorher.
- Drumherum: verschneite Tannen, Berge, Schneefall, Eingangstor mit Banner, Schneemann.
- Vorne (Blick der Spieler): Skisprungschanze mit Turm, Flutlicht und einem Springer, der immer wieder springt.
- Rund um die Plattform: Biathlon-Loipe mit drei Langläufern. Hinter der Bank (Blick der Kapitäne):
  Schießstand, an dem die Scheiben umklappen.
- Sitznachbarn in der Nähe drehen den Kopf zu einem, wenn man zu ihnen schaut.

## Chat und Halbkreis-Bank
**Ersetzen:** `hall3d.js`, `index.html`, `admin.html`. In Firebase ist nichts anzulegen (Sammlung `chat` entsteht von selbst).
- Die Bank steht im Halbkreis um die Kapitäne, damit sich alle sehen. Plätze: Standard 15, in `admin.html`
  unter "Plätze auf der Bank" einstellbar (am besten = Anzahl Spieler). Kommen mehr, gibt es eine zweite Reihe.
- Chat unter der Halle: Über dem Kopf steht immer die neueste Nachricht einer Person, bis sie etwas Neues schreibt.
  Figur antippen = ihre letzten 5 Nachrichten. "💬 Chat" klappt den ganzen Verlauf auf.
- Max. 120 Zeichen pro Nachricht, höchstens eine Nachricht alle 3 Sekunden.
- `admin.html`: "Chat leeren". "Alles zurücksetzen" leert den Chat ebenfalls.

## Update: gerade Bank, Rundumblick, Chat für alle, Anlegen mit Bild/Video
**Ersetzen:** `hall3d.js`, `index.html`, `admin.html`.
- Bank wieder gerade (Standard 15 Plätze, gleichmäßig verteilt). Neu: **🎥 Rundumblick**. Die Kamera fährt
  aus dem eigenen Körper hinter die Figur. Wischen dreht einmal ganz um das Spielfeld, hoch/runter wischen
  ändert die Höhe, zwei Finger (oder Mausrad) zoomen. **🧍 Ich-Sicht** fährt zurück in den Kopf.
- Einlauf genau **einmal**: beim allerersten Öffnen des eigenen Links. Danach sitzt man immer auf seinem Platz,
  auch auf einem anderen Handy. Die Halle zeigt nur Leute, die ihren Link schon geöffnet haben.
- **Vor dem Event:** In `admin.html` auf **„Halle leeren"** drücken (setzt alle auf „noch nicht da"),
  damit eure Tests nicht mitzählen und alle beim echten Login neu einlaufen.
- Chat: Spieler und Kapitäne schreiben unten unter der Halle. Die eigene letzte Nachricht steht oben in der Szene,
  die Sprechblase über der eigenen Figur sieht man im Rundumblick.
- `admin.html`: Beim Anlegen von Kapitän/Spieler gleich **Bild für die Figur**, **Intro-Video** und Frisur wählen.
  Die Auswahl listet die Dateien aus den Repo-Ordnern `photos/`, `faces/` und `videos/` (vorher hochladen).
  Danach erscheint oben sofort **QR-Code und Link** der neuen Person (Link kopieren, QR groß öffnen).
  Wer ein Intro-Video hat, sieht es beim Scannen zuerst und läuft dann in die Halle ein.
- Demo (`index.html?demo` / `?demo=kapitaen`) zeigt jetzt eure angelegten Leute mit ihren Bildern und Frisuren
  (ändert nichts in der Datenbank). Sind noch keine angelegt, kommen Beispiel-Leute.

## Minispiel 2: Biathlon-Sprint
**Neu:** `biathlon-core.js`, `biathlon.js`. **Ersetzen:** `index.html`, `admin.html`.

- Steuerung: ◀ ▶ beschleunigen (auf Schnee gleitet man weiter, Gegenrichtung bremst), SPRUNG springt.
  Am PC: Pfeiltasten / A D, Sprung mit Leertaste oder ↑.
- Ablauf: Tutorial (4 Seiten) → Training (nur nach rechts, Schneehaufen und Hürden, beliebig oft) →
  "Ready Player: One, Two, Three" → bei "Three" geht der echte Lauf los. Gewertet wird die Zeit.
- Strecke vom Start aus in beide Richtungen: rechts 25 Hindernisse bis zum Ziel. Wer am Start nach links fährt,
  findet die geheime Rückwärtsstrecke mit nur 12 Hindernissen (lila Zähler "↩").
- Hindernisse: Schneehaufen, Hürde, Eisblock-Treppe (Stufe für Stufe hochspringen), Gletscherspalte (Anlauf!),
  Schneeball (rollt entgegen), tiefes Banner (NICHT springen) und Schießstand (1 Sekunde anhalten, sonst +5 s Strafe).
- Berührt man ein Hindernis: Sturz, 2 Sekunden Pause. Nach 3 Minuten ist Schluss ("nicht im Ziel").
- Eigene Bilder für die Hindernisse: Ordner `biathlon/` anlegen und Dateien so benennen:
  `schneehaufen.png`, `huerde.png`, `treppe.png` (ein Block), `spalte.png`, `schneeball.png`, `banner.png`,
  `schiessstand.png`. Fehlt ein Bild, bleibt der gezeichnete Platzhalter.
- Der Kopf des Skifahrers ist das Figurenbild des Kapitäns (aus admin.html).

**admin.html:** Oben auswählen, welches Minispiel über die Wahlreihenfolge entscheidet (Snake oder Biathlon),
dann "Minispiel-Phase starten". "Draft starten" sortiert nach dem gewählten Spiel (Biathlon: schnellste Zeit zuerst).
Testen ohne Speichern: "Biathlon-Sprint ausprobieren". Pro Kapitän lässt sich jedes Spiel einzeln zurücksetzen.
Das Leaderboard zeigt das aktive Spiel oben (mit "▶ Ansehen"), das andere darunter.

### Update Biathlon-Sprint
- Vier Tasten: links ◀ ▶ (fahren), rechts ▲ (springen) und ▼ (hinlegen, dabei weiterfahren möglich).
  Am PC zusätzlich ↓ bzw. S zum Hinlegen.
- "Ready Player:" bleibt oben stehen; darunter "One" (4 Sekunden), dann "Two", "Three" – bei Three startet der Lauf.
- Tutorial ohne Richtungshinweis. Links neben dem Start steht ein Zaun: Im Training hält er,
  im echten Lauf bricht er mit Schwung (dahinter die geheime Rückwärtsstrecke mit 12 Hindernissen).
- Gletscherspalte 4,3 m breit (genaues Timing nötig), Hineinfallen kostet 3 Sekunden.
- Schießstand-Bereich 6,5 m breit mit Vorlauf davor, damit man erkennen und abbremsen kann.
- Limbo-Banner: hängt so tief, dass man sich mit ▼ hinlegen muss.
- Schießstand mit 5 Bahnen, ohne Text-Tipp (1 Sekunde anhalten, sonst +5 s Strafrunde).

## Vollbild: Intro-Video und Halle
**Ersetzen:** `intro.html`, `index.html`.
- Intro-Video startet beim Öffnen des QR-Links sofort im Vollbild. Handys erlauben automatisches Abspielen
  nur ohne Ton: Darum startet es stumm mit einem Knopf "🔊 Ton an" (oder einfach aufs Video tippen).
  Querformat-Videos werden ganz gezeigt, der Rand ist eine unscharfe Kopie des Videos (keine schwarzen Balken).
- Die Halle füllt den ganzen Bildschirm. Name, Hinweis, eigene Nachricht (oben), Ansicht-Knopf (rechts),
  Chat und die Tabs (unten) schweben halbdurchsichtig darüber. Minispiel und Leaderboard öffnen sich als
  Fenster über der Halle (✕ oder Tab nochmal tippen = zurück).
- Android: Beim ersten Antippen wird echter Vollbildmodus angefordert (ohne Browserleiste).
  iPhone erlaubt das für Webseiten nicht. Dort am besten über "Teilen → Zum Home-Bildschirm" öffnen.

## Winter-Snake
**Ersetzen:** `snake.js`, `minigame.js`, `index.html`, `admin.html`.
- Schneefeld mit Schneefall, Eisblöcke statt grauer Mauern, Spielfeld mit rot-weißem Rahmen.
- Kopf der Schlange = Figurenbild des Kapitäns (aus admin.html) mit Weihnachtsmütze; schaut beim
  Nach-links-Fahren gespiegelt, nie auf dem Kopf. Ohne Figurenbild: gezeichnetes Gesicht mit Mütze.
- Jedes gefressene Gesicht hängt sich hinten an die Schlange (ältestes ganz am Schwanz),
  dazwischen ein rot-weiß geringelter Schal.
- Auch die Leaderboard-Wiedergabe zeigt den Kopf des jeweiligen Kapitäns. Alte Wiedergaben bleiben gültig.
- "Snake ausprobieren" in admin.html nutzt faces/face1.png als Test-Kopf.

## Namen und Teamnamen ändern
In `admin.html` stehen bei jeder Person jetzt auch der **Name** und bei Kapitänen der **Teamname** als Feld.
Ändern → "Speichern". QR-Code und Link bleiben gleich, die Halle zeigt den neuen Namen sofort.

## Vor dem Event: zurücksetzen
- **Halle leeren:** Alle wieder "noch nicht da" und Video-Zähler auf 0. Jeder QR-Code verhält sich wie beim
  allerersten Scannen (Intro-Video nicht überspringbar, dann Einlauf). Ergebnisse, Teams und Chat bleiben.
- **🔄 Für das Event frisch machen:** Wie "Halle leeren", zusätzlich werden Snake-/Biathlon-Ergebnisse,
  Teamzuordnungen und Chat gelöscht und die Phase steht wieder auf "setup".
  Personen, Namen, Bilder, Videos, Frisuren und QR-Codes bleiben erhalten.
- **Alles zurücksetzen:** löscht zusätzlich alle Personen und Teams (neue QR-Codes nötig).

## Update: Demo nur mit echten Spielern
**Ersetzen:** `index.html`.
- Spieler-Demo (`index.html?demo`): Auf der Bank sitzen schon alle in `admin.html` angelegten Spieler, die ein Gesicht (Foto) haben.
  Spieler ohne Foto und Beispiel-Leute erscheinen nicht mehr. Du selbst läufst als „Du“ mit `faces/face1.png` ein.
- Kapitäne erscheinen in beiden Demos ebenfalls nur, wenn sie ein Gesicht haben.
- Kapitäns-Demo: ebenfalls nur Spieler mit Gesicht auf der Bank.

## Update: runde Bank, alle spielen, die Besten wählen (ohne Kapitäne)
**Neue Datei:** `draft.js` (Hauptverzeichnis). **Ersetzen:** `index.html`, `admin.html`, `hall3d.js`, `winter.js`.
Alle QR-Codes, Links, Namen, Gesichter und Videos bleiben erhalten.

**Halle**
- In der Mitte der Plattform steht eine runde Bank. Sie ist zum Eingangstor hin offen, und das Tor steht genau auf Höhe der Mitte.
- Wer zum ersten Mal kommt, läuft durchs Tor und durch die Öffnung in den Kreis. Die erste Person sitzt mittig gegenüber
  dem Tor, danach immer abwechselnd eine links und eine rechts daneben, bis der Kreis voll ist.
- Plätze auf der runden Bank: in `admin.html` einstellbar (Standard 20). Kommen mehr, wird die Bank automatisch größer.
- Der Schriftzug am Tor ist jetzt auch von innen lesbar.

**Keine Kapitäne mehr**
- Alle sind gleich und dürfen das Minispiel spielen (je ein echter Versuch). Bestehende Kapitäne zählen einfach als normale Teilnehmer.
- In `admin.html` gibt es nur noch „Person hinzufügen“ und eine gemeinsame Liste „Teilnehmer“.

**Ablauf**
1. `admin.html`: „Minispiel-Phase starten (alle spielen)“.
2. Wenn alle gespielt haben: „Teamwahl starten“. Die Besten im Leaderboard (Standard 7, einstellbar unter „Wie viele dürfen wählen“)
   gründen je ein Team. Sie wählen nacheinander, Platz 1 zuerst, je eine Person aus (leuchtende Figuren antippen).
3. Nach der letzten Wahl werden alle übrigen automatisch zufällig zu Zweierteams gepaart. Bei ungerader Zahl entsteht ein Dreierteam.
4. Jedes Team hat eine eigene Farbe, und die Mitglieder setzen sich nebeneinander auf die Bank.
   Teamgründer haben einen goldenen Namen mit ★.
- Gleicher Score: Wer früher gespielt hat, steht weiter vorne.
- Hängt die Wahl (z. B. Handy eines Gründers aus): „Teamwahl beenden: Rest jetzt zufällig paaren“.
  Gründer ohne Wahl bekommen dann einen zufälligen Partner.
- „Für das Event frisch machen“ löscht jetzt auch die Teams.

**Demo:** `index.html?demo` (einlaufen) und `index.html?demo=wahl` (Teamwahl, du wählst für alle Gründer).

## Update: Handy zeigt alte Version (Zwischenspeicher)
**Ersetzen:** `index.html`, `admin.html`, `intro.html`, `draft.js`, `hall3d.js`, `minigame.js`, `biathlon.js`.
- Handy-Browser behalten alte Dateien im Zwischenspeicher. Nach einem Update hatten sie teils die neue `index.html`
  mit der alten `hall3d.js` gemischt. Folge: keine Bank, keine Leute, kein Einlauf.
- Jetzt hängt an allen eigenen Dateien eine Versionsnummer (`?v=20261018`). `intro.html` und die Demo-Knöpfe laden die Seite
  außerdem immer frisch. Bei künftigen Updates zählt Claude die Nummer hoch.
- Nach dem Hochladen 10 Minuten warten (so lange speichert GitHub Pages zwischen). Am Handy die Seite einmal neu laden.

## Update: Agentenmodus (erster Schritt)
**Neu hochladen:** Ordner `agents/` mit `agents/agent1.png` (beim Hochladen `agents/agent1.png` als Pfad eintippen).
**Ersetzen:** `index.html`, `admin.html`, `hall3d.js`, `winter.js`, `draft.js`, `minigame.js`, `biathlon.js` (Versionsnummer `?v=20261018b`).
- Neuer runder Knopf 🕶️ über dem Rundumblick-Knopf. Er schaltet den Agentenmodus an und wieder aus, vorerst ohne Zeitlimit.
- Im Agentenmodus liegt vor der eigenen Figur das Agentenbild (Kopf + Oberkörper). Alle anderen sehen das live, man selbst
  im Rundumblick. Von hinten sieht man weiter die normale Figur.
- Für einen selbst wird die Welt düster: roter Himmel, rotes Licht, rötlicher Nebel. Die anderen sehen ihre Welt normal.
- Agentenbild pro Person: in `admin.html` im Feld „Agentenbild“ eintragen (z. B. `agents/max.png`, die Auswahlliste zeigt den Ordner `agents/`).
  Ohne Eintrag wird `agents/agent1.png` verwendet.
- Bilder für `agents/`: freigestellt, Kopf + Oberkörper, unten gerade abgeschnitten. Claude kann sie wie die Gesichter vorbereiten.
- „Für das Event frisch machen“ schaltet bei allen den Agentenmodus aus.

## Update: Agentenwelt mit Schriftzug, Besen und Schädel-Pokal
**Neu hochladen:** Ordner `agents/welt/` mit 9 Bildern: `logo.png`, `besen_vorne.png`, `besen_links.png`, `besen_rechts.png`, `besen_hinten.png`,
`schaedel_vorne.png`, `schaedel_links.png`, `schaedel_rechts.png`, `schaedel_hinten.png` (Pfad beim Hochladen: `agents/welt/…`).
**Ersetzen:** `winter.js`, `hall3d.js`, `index.html`, `admin.html`, `draft.js`, `minigame.js`, `biathlon.js` (Version `?v=20261018c`).
- Nur im Agentenmodus sichtbar:
  - Über und hinter dem Eingangstor leuchtet groß „Hackel Games“. Der Schriftzug ist aus mehreren Schichten aufgebaut,
    dadurch wirkt er dreidimensional, und er pulsiert leicht.
  - Links (von der Mitte Richtung Tor gesehen) schwebt der brennende Besen, rechts der Schädel-Pokal. Hinten bleibt frei.
  - Beide wippen langsam auf und ab, flackern und sprühen Funken. Läuft man drumherum (Rundumblick), wechselt
    die Ansicht weich zwischen vorne/rechts/links/hinten, so wirken sie dreidimensional.
- Die Bilder (zusammen ca. 3,5 MB) werden erst beim ersten Einschalten des Agentenmodus geladen.
  Das kann am Handy 1–2 Sekunden dauern, danach geht das Umschalten sofort.

## Update: Agentenwelt mit Zauberern und Balkon-Szene
**Neu hochladen nach `agents/welt/`:** `zauberer_vorne.png`, `zauberer_rechts.png`, `zauberer_links.png`, `zauberer_hinten.png`,
`balkon_vorne.png`, `balkon_rechts.png`, `balkon_links.png`, `balkon_hinten.png`.
**Ersetzen:** `winter.js`, `hall3d.js`, `index.html`, `admin.html`, `draft.js`, `minigame.js`, `biathlon.js` (Version `?v=20261018d`).
- Besen und Schädel-Pokal sind größer (12 m) und weiter nach außen gerückt (links bzw. rechts, etwas nach hinten).
- Dazwischen, näher am Tor, schweben die Zauberer (halb links) und die grüne Balkon-Szene (halb rechts), noch größer.
  Beide wechseln wie Besen und Pokal je nach Blickwinkel zwischen vorne/rechts/links/hinten.
- Die Zauberer sind freigestellt. Die Balkon-Szene ist ein ganzes Foto mit Hintergrund, deshalb schwebt sie als ovales,
  weich ausgeblendetes „magisches Fenster“ (sauberes Freistellen klappte bei dem vollen Bild nicht schön).
- Abstände (Version `?v=20261018f`): Von der Mitte aus gesehen überall 9° Lücke zwischen Schriftzug, Zauberern/Balkon und Besen/Pokal.

## Update: neuer Ablauf mit Nationalflaggen (ersetzt die Teamwahl durch die Besten)
**Ersetzen:** `index.html`, `admin.html`, `draft.js`, `hall3d.js`, `minigame.js`, `biathlon.js` (Version `?v=20261019`).

**Vorbereitung (`admin.html`, Karte „🏳️ Nationalitäten“)**
- Jeder Person eine Flagge geben, je 2 Personen pro Flagge (bei 16 Leuten 8 Flaggen). „Zufällig zuteilen“ hilft, danach „Flaggen speichern“.
  Rot markiert = nicht genau 2 Personen.
- Jede Person sieht ihre eigene Flagge oben über „🤫 Meine Flagge zeigen“ (nach 5 s wieder verdeckt, damit niemand mitliest).

**Ablauf (Knöpfe 1–5, immer der nächste ist aktiv)**
1. **Runde 1: Snake.** Alle spielen, beliebig viele Versuche, der beste zählt. Im Leaderboard haben nur die besten 3 eine Aufzeichnung,
   der Rest nur die Punktzahl. Platz 1–3 bekommen Bonussekunden fürs Finale (Standard 6 / 4 / 2 s).
2. **Raten.** Snake ist zu. Jede Person tippt in der Halle die Person an, die ihrer Meinung nach dieselbe Flagge hat.
   Der Tipp kann bis zur Auflösung geändert werden. Der eigene Tipp leuchtet (nur auf dem eigenen Handy).
   In `admin.html` siehst du live, wer wen getippt hat und ob es stimmt.
3. **Auflösen.** Personen mit gleicher Flagge werden ein Team, setzen sich nebeneinander und tragen die Flagge über dem Kopf.
   Jede richtig ratende Person bringt ihrem Team Bonussekunden (Standard 4 s, beide richtig = 8 s).
4. **Runde 2: Biathlon.** Jede Person hat 3 echte Versuche (Training beliebig), die Bestzeit zählt. Im Team werden die beiden
   Bestzeiten addiert. Das Leaderboard zeigt die Teamzeiten.
5. **Biathlon beenden.**
- Leaderboard und `admin.html` zeigen den Vorsprung fürs Finale pro Team (Raten + Snake).
- Bonuswerte und Anzahl Biathlon-Versuche sind in `admin.html` einstellbar. Mit „Phase direkt setzen“ lässt sich ein Fehler korrigieren.
- Hinweis: Wer sich mit Webseiten auskennt, könnte die Flaggen technisch auslesen (die Datenbank ist offen). Für die Party sollte das reichen.
- Demo: `index.html?demo=raten` (Flagge raten, nach deinem Tipp wird nach 3 s aufgelöst).

## Update: Finale, Rätsel 1 (Napoleons Feldlager)
**Neue Datei:** `camp.js`. **Ersetzen:** `index.html`, `admin.html`, `draft.js`, `hall3d.js`, `minigame.js`, `biathlon.js` (Version `?v=20261019b`).
**Später (optional):** eure 3D-Figur als `riddle/papa.glb` hochladen. Sie ersetzt automatisch den Platzhalter-Soldaten.

**Halle**
- Gegenüber vom Tor (hinten) steht der verhüllte Pokal auf einem Sockel, links und rechts die beiden Organisatoren (Gesichter `faces/face1.png` und `face2.png`).
- Links neben dem Pokal (von der Mitte aus gesehen) ist die Tür zum Finale. Erst nach „Finale freigeben“ leuchtet sie, vorher steht „🔒 Finale“ dran.

**Vorbereitung in `admin.html`, Karte „🏆 Finale“**
- Jede Person einem Viererteam A–D zuordnen und pro Team genau einen Kapitän (★) ankreuzen, dann „Finale-Teams speichern“.
- Die richtige Waffe für Rätsel 1 auswählen und speichern (ohne sie lässt sich das Finale nicht freigeben).
- Danach Schritt 6 „Finale freigeben“. Jedes Team spielt zu seinem eigenen Termin, auch mehrere gleichzeitig.

**Ablauf für ein Team**
- Nur der Kapitän kann die Tür öffnen. Dann startet die Uhr des Teams, und alle Mitglieder, die die Seite offen haben, gehen automatisch hinein.
  Wer später kommt oder zur Halle zurückgeht, tippt einfach wieder die Tür an.
- Im Lager steuert jeder selbst: Pfeile am Boden antippen = einen Schritt gehen, wischen = umschauen. Von der Mitte gehen 5 Wege ab, je 4 Schritte.
- Am Ende eines Weges steht „Hilf unserem Papa“ mit der Waffenkammer links daneben. Waffenkammer antippen = hingehen.
  16 Waffen: Muskete, Bajonett, Säbel, Degen, Steinschlosspistole, Kanonenkugel, Lanze, Axt, Dolch, Armbrust, Pfeil und Bogen, Hellebarde,
  Revolver, Sturmgewehr, Handgranate, Baseballschläger.
- Nur der Kapitän kann eine Waffe wählen. Jede falsche Waffe gibt +2 Strafsekunden und wird für das ganze Team durchgestrichen.
- Uhr oben: verstrichene Zeit − Vorsprung (Raten + Snake aller vier) + Strafsekunden. Solange der Vorsprung läuft, steht „Uhr startet in … s“.
- Leaderboard und `admin.html` zeigen den Stand aller Teams. „Zurücksetzen“ pro Team löscht dessen Spielstand (z. B. nach einem Probelauf).
- Demo: `index.html?demo=finale` (du bist Kapitän von Team A; richtige Demo-Waffe ist der Baseballschläger).
- Hinweis: Das Lager braucht 3D. Sehr alte Handys ohne 3D sehen die Tür nicht.
- Update (Version `?v=20261019c`): Die 5 Wege schlängeln sich jetzt durch enge Zeltgassen (links, rechts, links …), man sieht nie weit.
  Vier Wege enden am Waldrand. Der Rätselweg biegt am letzten Schritt links um die Ecke in eine von Rundzelten umschlossene Lichtung,
  erst dort sieht man „Hilf unserem Papa“ und die Waffenkammer. Unterwegs dreht sich der Blick automatisch in die nächste Gasse.
- Update (Version `?v=20261019d`): Am Ende des Rätselwegs sitzt jetzt Napoleon verwundet am Boden. Er stammt aus euren 4 Ansichten,
  freigestellt und je nach Blickwinkel überblendet. Über ihm steht ein britischer Rotrock (3D-Figur) mit gezogenem Säbel.
  Neue Bilder im Ordner `riddle/`: `napoleon_vorne.png`, `napoleon_rechts.png`, `napoleon_links.png`, `napoleon_hinten.png`.
  Der Soldat aus euren Bildern war überall am Bildrand abgeschnitten, deshalb ist er nachgebaut. Eine `riddle/papa.glb`
  würde Napoleon weiterhin ersetzen.
- Update (Version `?v=20261019e`): Die Schritte im Lager sind länger (6,5 m statt 4,5 m), das Lager ist entsprechend größer.
  Die Lichtung ist geräumiger, und die Waffenkammer steht frei links neben Napoleon, ohne das große Schild darüber.
  Jetzt 24 Waffen, neu: Duellpistole, Pistole (9 mm), Taschenpistole, Karabiner, Jagdgewehr, Schrotflinte, Scharfschützengewehr, Donnerbüchse.
  Die Zelte werden intern zu wenigen großen Teilen zusammengefasst, das hält das Handy flüssig.
  Wichtig: Die schon gewählte richtige Waffe in `admin.html` bleibt gültig.

## Update: Finale Raum 2 und 3 (Version `?v=20261019f`)
**Neue Dateien:** `room2.js`, `room3.js`. **Ersetzen:** `index.html`, `admin.html`, `draft.js`, `hall3d.js`, `minigame.js`, `biathlon.js`, `camp.js`.

**Ablauf**
- Raum 1 gelöst (richtige Waffe): Die Uhr bleibt stehen, rechts neben Napoleon erscheint eine leuchtende Tür „Weiter“.
  Der Kapitän öffnet sie, die Uhr läuft weiter, und alle aus dem Team wechseln automatisch in Raum 2.
- **Raum 2: Die Rätselkammer.** Steinraum im Kerzenlicht mit 6 Rätseltafeln (wischen = umschauen, Tafel antippen = Rätsel).
  Jeder im Team kann Antworten eingeben. Jedes gelöste Rätsel deckt einen Buchstaben von HORCRUX auf
  (Reihenfolge H, O, R, C, U, X; das R steht an beiden Stellen). Unten steht das Wort mit den aufgedeckten Buchstaben.
  „Raten“: Das Team hat insgesamt 3 Versuche für das ganze Wort. Danach müssen alle Rätsel gelöst werden.
  Alle 6 gelöst oder Wort richtig = Raum geschafft. Die Uhr steht wieder, und die Tür gegenüber leuchtet (Kapitän öffnet).
- **Raum 3: Schneeballschlacht.** Weite Winterlandschaft, die Mitspieler stehen links und rechts. Antippen = Schneeball werfen,
  wischen = zielen. 10 Dosen, 7 davon verbergen die Buchstaben von VEREIST (gemischt), die übrigen nur ❄.
  Treffer aller Teammitglieder zählen gemeinsam. Unten erscheinen die getroffenen Buchstaben. Wer sie in der richtigen
  Reihenfolge antippt (V-E-R-E-I-S-T), beendet das Finale.
- Am Ende: „🏆 Geschafft!“ mit der Wertung = gespielte Zeit (ohne Pausen zwischen den Räumen) − Vorsprung + Strafsekunden.
- Leaderboard und `admin.html` zeigen pro Team, in welchem Raum es ist (gelöste Rätsel, Rateversuche, getroffene Dosen) und die Wertung.

**Rätsel (in `draft.js`, Abschnitt RIDDLES, änderbar; Claude kann sie gerne austauschen)**
1. Ich habe Städte, aber keine Häuser. Wälder, aber keine Bäume. Wasser, aber keine Fische. → Karte (U)
2. Je mehr man davon wegnimmt, desto größer wird es. → Loch (X)
3. Es läuft und läuft, hat aber keine Beine. Es hat ein Bett, schläft aber nie. → Fluss (H)
4. Ich habe vier Beine, kann aber nicht gehen. Ich habe einen Rücken, aber keinen Bauch. → Stuhl (R, zählt doppelt)
5. Es gehört dir, aber andere benutzen es viel öfter als du selbst. → Name (C)
6. Wer es macht, der braucht es nicht. Wer es kauft, der will es nicht. Wer es braucht, der weiß es nicht. → Sarg (O)
Groß-/Kleinschreibung und Artikel („der Stuhl“) sind egal.

## Update 20261019g – Eis-Pokal im Agentenmodus
- Hinter dem Kreis (gegenüber dem Tor) steht jetzt im Agentenmodus der riesige Eis-Pokal mit den beiden Skifahrern (22 m hoch, 4 Ansichten:
  vorne/links/hinten/rechts wechseln je nach Blickwinkel). Bilder: `agents/welt/eispokal_*.png`.
- Die Finaltür sitzt im Agentenmodus groß unten in der Mitte des Pokals. Der verhüllte Pokal und die zwei Organisatoren-Figuren
  werden dafür im Agentenmodus ausgeblendet. Im normalen Modus bleibt alles wie vorher.
- Besen, Schädel, Zauberer und Balkon sind jetzt alle gleich hoch (13,5 m, etwas größer als vorher), der Schriftzug etwas breiter;
  die Abstände sind neu berechnet.
- Größe/Abstand des Eis-Pokals: `EIS_X` und `EIS_H` oben in `winter.js`.

## Update 20261019h
- **Tür zu Raum 2:** Sie stand vorher zu weit seitlich (3,4 m neben Napoleon) und war im Hochformat nicht im Bild, vom Schrank aus sogar im Rücken.
  Jetzt steht sie direkt rechts neben Napoleon und dem Rotrock. Sobald die richtige Waffe gewählt ist, dreht sich der Blick automatisch zu Napoleon und der Tür.
- **Agentenmodus:** Zwischen Schriftzug, Zauberer/Balkon und Besen/Schädel ist jetzt überall 18° Abstand (von der Mitte aus gesehen).
  Schriftzug und Eis-Pokal stehen unverändert.

## Update 20261019i – Finale Raum 2 und 3
- **Raum 2:** Die Buchstaben kommen gemischt (die Tafel-Reihenfolge verrät nichts mehr). Unten liegen sie als Kärtchen,
  man tippt sie in die richtige Reihenfolge; benutzte Kärtchen werden durchgestrichen, ↺ setzt zurück.
  „Raten“ übernimmt die gelegten Buchstaben, fehlende kann man eintippen. **5 Rateversuche** pro Team.
  Das R kommt in HORCRUX zweimal vor, deshalb gibt das Stuhl-Rätsel zwei R-Kärtchen.
  Alle Rätsel gelöst heißt nicht mehr automatisch fertig – das Wort muss geraten werden. Nur wenn alle 5 Versuche weg sind,
  öffnet sich die Tür, sobald alle Rätsel gelöst sind (damit niemand feststeckt).
- **Raum 3:** Das Dosen-Brett steht dreimal so weit weg (24 m statt 8 m); Dosen und Buchstaben sind dafür etwas größer.
  **Reihum werfen:** jeder einmal, dann der Nächste (oben steht, wer dran ist). Wer 15 Sekunden nicht wirft, wird übersprungen.
  Benutzte Buchstaben unten werden durchgestrichen. Links und rechts an der Bahn feuern die beiden Organisatoren (face1/face2) an,
  nach einem Treffer besonders wild.

## Update 20261021a – Raum 3 gleichzeitig
- Im Schneeball-Raum werfen jetzt **alle gleichzeitig**, jeder kann **alle 2 Sekunden** einen Schneeball werfen
  (der Balken über den Buchstaben zeigt das Nachladen, grün = bereit). Das Reihum-Werfen aus 20261019i ist wieder raus.
- Die Figuren der Mitspieler machen zwischendurch Wurfbewegungen, die Fans feuern weiter an. Treffer aller zählen gemeinsam.

## Update 20261022a – Dialoge, Tür, Snake
- **Tür zum Finale** gibt es nur noch im Agentenmodus 🕶️ (unten im Eis-Pokal). Im normalen Modus ist sie weg.
- **Snake:** keine Übungsrunden mehr. Nach dem Tutorial („Verstanden!“) geht es direkt zum Menü mit „Echter Versuch“.
- **Dialoge wie im Rollenspiel** (Datei `dialog.js`): links die beiden Gastgeber, rechts das Agentenbild der Person,
  unten der Text (antippen = weiter, bei Antworten 1./2. wählen, oben rechts „Überspringen“).
  Jede Sequenz läuft pro Person **einmal**:
  `intro` nach dem ersten Video vor dem Einlauf · `snake` vor dem 1. Spiel · `guess` vor dem Wählen (Flagge raten) ·
  `pairs` nach dem Wählen (Auflösung) · `biathlon` vor dem 2. Spiel · `done` danach · `final` vor dem Finale.
  Sie startet automatisch beim ersten Öffnen in der jeweiligen Phase – nicht mitten in einem Spiel.
  Mit 💬 rechts in der Halle kann man die aktuelle Erklärung jederzeit nochmal ansehen.
- **Texte ändern:** oben in `dialog.js` (Abschnitt „HIER ANPASSEN“). Namen der Gastgeber dort bei `SPRECHER`.
- **Bilder:** in den Ordner `dialog/` legen: `sprecher1.png`, `sprecher2.png` (freigestellt, am besten Hüfte aufwärts)
  und `hintergrund.jpg`. Solange sie fehlen, werden face1/face2 und der Eis-Pokal vor Nachthimmel gezeigt.
- **Vorschau:** `index.html?demo&dialog=alle` zeigt alle Sequenzen nacheinander, `&dialog=snake` nur eine.
- „Neu starten“ im Admin setzt auch die gesehenen Dialoge zurück.

## Update 20261023a – Dialog-Szenen im Admin
- In `admin.html` gibt es die Karte **💬 Dialog-Szenen**: Namen von euch beiden, Hintergrund, und pro Szene
  Zeitpunkt („Wann“), Bilder (zwei Einzelbilder ODER ein gemeinsames, größeres Bild), eigener Hintergrund,
  und die Zeilen: Text von Name 1 / Name 2 / beiden zusammen, oder Antwortmöglichkeiten des Spielers (eine pro Zeile).
  ↑ ↓ ✕ zum Sortieren/Löschen, „▶ Vorschau“ zeigt die Szene sofort, „💾 Alle Szenen speichern“ speichert in Firebase (`state/dialoge`).
- Szenen und Standard-Zeitpunkte:
  1 Intro (vor dem Einlauf) · 2 Vor Snake (erklärt das Spiel) · 3 Nach Snake / vor dem Wählen (Phase Raten) ·
  4 Vor Biathlon mit Regeln und Termin (Phase Auflösung) · 5 Teams fürs Finale (Phase Biathlon beendet) ·
  6 Finale eröffnet · 7 Abschluss / Ehrung (wenn das eigene Team das Finale geschafft hat).
- Platzhalter: {name} {snakeBonus} {guessBonus} {biathlonVersuche} {partner} {finaleTeam} {mitspieler} {kapitaen} {finaleZeit}.
  Eine Szene mit {finaleTeam}/{mitspieler}/{kapitaen} wartet, bis die Person einem Finale-Team zugeteilt ist; mit {partner}, bis die Paare feststehen.
- Bilder in den Ordner `dialog/` im Repo legen, dann tauchen sie in den Auswahllisten auf.
- **Snake** startet jetzt direkt im Menü: „▶ Direkt spielen“ oder „📖 Tutorial ansehen“. Erklärt wird in Szene 2.
- Biathlon bleibt wie es war (startet mit Tutorial).

## Update 20261023b – Agenten, Flaggen, Bonus-Zähler
- **Alle sind Agenten:** Jeder erscheint mit seinem Agentenbild, die Agenten-Welt (roter Himmel, Eis-Pokal, Finaltür) ist immer an.
- **Flaggen-Knopf 🏳️** (rechts, ersetzt die Sonnenbrille):
  - zeigt die eigene Flagge (geheim),
  - **Enttarnen:** 5 Minuten sehen alle dein Gesicht und deine Flagge über dem Kopf (beliebig oft, „Wieder tarnen“ beendet es früher),
  - **Ausspionieren:** einmal insgesamt siehst nur du 1 Minute lang Gesicht und Flagge einer anderen Person.
  Im Admin steht bei jeder Person, wen sie ausspioniert hat.
- **Bonus-Zähler oben rechts** (⏱ +X s): eigener Vorsprung fürs Finale aus Snake, Raten und Dialogen.
- **Richtige Antworten in Dialogen:** Im Admin bei „Spieler: Antworten“ die richtige markieren. Wer sie beim ersten Ansehen wählt,
  bekommt +1 s (zählt in den Vorsprung des Finale-Teams). Beim Wiederholen über 💬 gibt es keine Punkte.
- **Hinweis-Banner oben links entfernt** – erklärt wird in den Dialog-Szenen.
- „Neu starten“ im Admin setzt auch Enttarnen, Spionage und Dialog-Punkte zurück.

## Update 20261023c
- **Dialog-Hintergrund:** `dialog/hintergrund.jpg` (Eis-Pokal im Sturm). Der Pokal steht mittig zwischen euch (links) und dem Spieler (rechts),
  links und rechts daneben läuft dasselbe Bild verschwommen als Eissturm weiter.
- **Flagge über dem Namen:** Wer sich enttarnt (oder ausspioniert wird / nach der Auflösung), hat die Flagge groß über dem Namensschild.
- **Person antippen:** zeigt nur noch Agentenbild und Namen (keine Nachrichten, kein Foto). Beim Raten genauso, mit „Ja, mein Tipp!“.

## Update 20261023d – Bilder der Veranstalter
- `dialog/beide1.png` … `beide4.png`: eure gemeinsamen Bilder (freigestellt, Unterkante weich ausgeblendet).
- Standard: alle Szenen mit „ein gemeinsames Bild“ – Intro beide1, Snake beide2, Wählen beide3, Biathlon beide4,
  Teams beide1, Finale beide2, Abschluss beide3. Wurde im Admin schon gespeichert, dort pro Szene das Bild auswählen.

## Update 20261025a – Einzelbilder der Veranstalter
- Jedes gemeinsame Bild gibt es zusätzlich pro Person: `dialog/beide1_links.png`, `dialog/beide1_rechts.png` … bis `beide4_…`.
- Im Admin bei einer Szene „zwei Einzelbilder“ wählen und bei Name 1 / Name 2 ein `_links`- bzw. `_rechts`-Bild eintragen
  (man kann auch Bilder aus verschiedenen Fotos mischen). Standard je Szene: die beiden Hälften des gemeinsamen Bildes der Szene.

## Update 20261025b
- Zwei Einzelbilder im Dialog stehen jetzt in **gleicher Höhe nebeneinander** (gleicher Maßstab, leicht überlappend),
  statt in gleich breite Kästen gepresst zu werden. Die Hälften `beideN_links/rechts.png` haben dafür die volle Höhe des Fotos.

## Update 20261025c
- Die Hälften `beideN_links/rechts.png` haben jetzt die volle Fläche des Fotos (Rest durchsichtig). Sind beide Bilder gleich groß,
  legt der Dialog sie deckungsgleich übereinander: die zwei stehen nahtlos wie auf dem Foto, trotzdem leuchtet nur, wer spricht.
  Verschieden große Bilder (z. B. aus verschiedenen Fotos) stehen weiter in gleicher Höhe nebeneinander.

## Update 20261106a – Ablauf nach Zeitplan, Teamwahl, Kapitänswahl, Siegerehrung
**Admin → ⏰ Zeitplan:** Datum/Uhrzeit für jeden Schritt eintragen, „Automatisch nach Zeitplan“ anhaken, speichern.
Dann wechselt die Phase auf allen Handys von selbst (Prüfung alle 15 s):
1. Vor dem Snake-Start: Video → Intro-Dialog → Einlauf → Platz. Umschauen, Flaggen-Knopf (Enttarnen/Ausspionieren) geht schon.
   Unter dem Schriftzug steht „Erstes Event startet · <Datum>“.
2. **Snake startet:** Dialog „Vor Snake“, Snake ist im Minispiel-Tab offen (z. B. 24 h).
3. **Snake endet:** Snake ist zu. Dialog „Auswertung Snake + Wählen“ ({snakePlatz}, {snakePunkte}); in der Halle Partner antippen (gelb).
4. **Biathlon startet:** Die Paare (gleiche Flagge) werden automatisch gebildet. Dialog „Paare · Biathlon“. Biathlon offen,
   **5 echte Versuche** (im Admin bei „Biathlon-Versuche“ prüfen – war ein alter Wert gespeichert, dort auf 5 setzen).
5. **Biathlon endet → Teams fürs Finale wählen:** Die 4 schnellsten Paare (Summe der Bestzeiten) sind die Teams A–D.
   Reihum (A zuerst) wählt aus jedem Paar **der/die Schnellere** in der Halle die fehlenden Leute (bei 16 Personen je 2):
   antippen (gelb) → „Bestätigen“ → „Willst du wirklich bestätigen …?“. Danach wählt jedes Team seinen **Kapitän**:
   wer zuerst 2 Stimmen hat. Admin-Karte „🧩 Teamwahl“ zeigt den Stand; korrigieren in der Finale-Karte (Team/Kapitän setzen).
6. **Finale startet:** Dialog „Finale eröffnet“, Tür unten im Eis-Pokal; nur der Kapitän öffnet sie.
7. **Siegerehrung:** Finale ist zu, Dialog „Siegerehrung“ ({siegerTeam}, {siegerNamen}, {siegerZeit}, {finalePlatz}).

- **Schild unter dem Schriftzug:** automatisch „Nächstes Event · Datum Uhrzeit“. Eigenes Bild stattdessen: Datei hochladen
  (z. B. `agents/welt/event1.png`) und im Zeitplan bei „Eigenes Bild unter dem Schriftzug“ eintragen.
- **Von Hand eingreifen:** Ein Klick auf einen Phasen-Knopf schaltet die Automatik aus.
- **Dialoge:** Neue Standardtexte für diesen Ablauf. Wurden im Admin schon Szenen gespeichert, gelten die gespeicherten –
  deine gespeicherten Texte bleiben erhalten (siehe 20261106b).
- „Neu starten“ setzt auch Finale-Teams, Kapitäne und Stimmen zurück.

## Update 20261106b (finale Version)
- **Teamwahl mit ganzen Paaren:** Die Zweierteams aus der Auflösung bleiben immer zusammen. Reihum (A, B, C, D, dann wieder A …)
  holt sich jedes Team ein ganzes weiteres Paar: eine Person antippen, das Paar leuchtet gelb, „Bestätigen“. Bei 8 Paaren wählt jedes Team genau eins.
- **Deine gespeicherten Dialog-Texte bleiben unverändert.** Nur zwei alte Zeitpunkte werden automatisch angepasst:
  Biathlon-Szene „Auflösung“ → „Biathlon“ (die Paare entstehen jetzt beim Biathlon-Start), Abschluss „nach dem eigenen Finale“ → „Siegerehrung“.
  Den Knopf „Alle Szenen auf Standard“ NICHT drücken – er würde deine Texte ersetzen.

## Update 20261108a
- **Admin-Link bei Spielern behoben:** Öffnete man die Admin-Seite als `…/admin` (ohne .html), wurden alle Spieler-Links
  als `…/admin?t=…` gebaut. Jetzt zeigen alle Links immer auf `intro.html?t=…`. Wer noch einen alten falschen Link hat,
  wird automatisch zu seinem eigenen Einstieg weitergeleitet (QR-Codes müssen nicht neu gedruckt werden).
- **Waffen ändern (Raum 1):** Admin → „🗡️ Waffenschrank (Raum 1)“: 24 Fächer (von links oben nach rechts unten),
  je Name und optional ein eigenes Bild. Bilder in den Ordner `riddle/waffen/` im Repo laden (PNG mit durchsichtigem
  Hintergrund ist am schönsten), dann im Feld auswählen und „Waffen speichern“. Ohne Bild bleibt das eingebaute 3D-Modell.
  Die richtige Waffe wählst du wie bisher in der Finale-Karte (dort stehen jetzt die neuen Namen).
- **Raum 3:** Lösungswort **DER WINTER NAHT** (16 Dosen: 13 Buchstaben + 3 leere). Die Wortfelder stehen Wort für Wort.
  Der Schneeball fällt auf die Entfernung etwas ab (ca. 65 cm auf 24 m) – man muss etwas über die Dose zielen.
  Stärke ändern: `DROP_PER_M` in `room3.js` (0.027 = 65 cm; größer = fällt stärker).
