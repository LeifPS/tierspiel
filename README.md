# Tierspiel – MVP

Ein Idle-Gacha-Spiel: Eier im gemeinsamen Shop kaufen → ausbrüten (auch offline)
→ Tiere sammeln → ausrüsten → Münzen/Sekunde verdienen → bessere Eier kaufen.

## 1. Hosting

Das ist eine reine Client-App (HTML/CSS/JS, ES-Module, kein Build-Schritt nötig).
Am einfachsten: **Firebase Hosting**, weil du eh schon Firebase nutzt.

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # Public directory: dieser Ordner, Single-Page: Nein
firebase deploy
```

Alternativ geht auch Netlify, Vercel oder GitHub Pages – einfach alle Dateien
hochladen, es gibt keine serverseitige Logik außer Firebase selbst.

## 2. Firestore einrichten

1. In der Firebase-Konsole **Firestore Database** aktivieren (falls noch nicht
   geschehen), Modus "Production".
2. Die Datei `firestore.rules` unter Firestore → Regeln einfügen und
   veröffentlichen. Ohne diese Regeln kann niemand lesen/schreiben (Standard:
   alles gesperrt) oder – im Test-Modus – kann JEDER alles schreiben, was für
   den geteilten Shop zwar nötig, für Spielstände aber unsicher wäre.
3. In **Authentication → Sign-in method** die Methode **E-Mail/Passwort**
   aktivieren.

## 3. Wie die Systeme funktionieren

### Ziehung (Ei-Glück → Tier)
Jedes Ei kann grundsätzlich alle 30 Tiere ziehen. Jedes Tier hat eine
Basis-Chance nach Seltenheit (`data.js` → `RARITIES.petChance`). Das
Glück des Eis potenziert das Gewicht seltener Tiere stärker als das
gewöhnlicher Tiere, wodurch sich die Ziehung bei hohem Glück spürbar nach
oben verschiebt, ohne dass 100% Glück (Standard-Ei) irgendetwas verändert.

### Gewicht
`Gewicht = Basisgewicht(Tier) × Gewichtsfaktor(Ei) × Zufalls-Rollfaktor`

Der Rollfaktor liegt meistens nahe 1x, kann aber (sehr selten) auf bis zu
10x hochschießen – die Tabelle dafür liegt in `data.js` →
`WEIGHT_ROLL_TABLE`. Ca. 1% aller Tiere aus einem 1x-Ei erreichen 2x
Basisgewicht oder mehr, wie gewünscht.

### Geld/Sekunde
`Geld/s = Basis-Geld(Tier) × (Gewichts-Vielfaches)³`

Ein Tier mit 2x seines Basisgewichts gibt also 2³ = 8x so viel Geld wie
eines mit exakt 1x Basisgewicht.

### Brutzeiten
Runde Werte von 10 Sekunden (Standard-Ei) bis 12 Stunden (Astral-Ei-Stufe),
siehe `EGGS[].hatchSeconds`. Läuft vollständig weiter, auch wenn der Tab
oder Browser komplett geschlossen ist – beim nächsten Login wird die
verstrichene Zeit serverseitig (Firestore-Zeitstempel) nachgerechnet.

### Shop-Rotation (alle 5 Minuten, für alle Spieler gleich)
Da hier keine Cloud Function läuft, übernimmt das der Client: Lädt jemand
die Seite und die letzte Rotation ist ≥ 5 Minuten her, schreibt sein Browser
per Firestore-**Transaktion** einen neuen Shop-Zustand. Die Transaktion
verhindert Race Conditions, falls zwei Spieler gleichzeitig laden – es
gewinnt genau einer, alle anderen sehen danach denselben neuen Stand.
*(Sauberer wäre langfristig eine Cloud Function mit Cron-Trigger, aber das
erfordert ein kostenpflichtiges "Blaze"-Abo bei Firebase. Sag Bescheid, falls
du das später willst.)*

## 4. Bilder einbinden (sobald du sie hast)

Einfach Dateien hier ablegen, exakte Dateinamen wichtig:

```
assets/pets/hase.png
assets/pets/katze.png
...
assets/eggs/standard.png
assets/eggs/holz.png
...
```

Die IDs stehen in `data.js` bei jedem Pet/Ei (`id: "hase"` usw.). Ist ein
Bild noch nicht vorhanden, zeigt die App automatisch einen farbigen
Platzhalter mit den ersten zwei Buchstaben in der Rarity-Farbe – du musst
also nichts am Code ändern, nur die Bilder reinlegen.

## 5. Was absichtlich noch NICHT drin ist (laut Absprache "kommt später")

- Meta-Progression (Prestige, Zonen, Quests, mehr Ausrüstungs-Plätze kaufen)
- Trading zwischen Spielern
- Cloud-Function-basierte Shop-Rotation (aktuell Client-getrieben, s.o.)

## 6. Bekannte Stellschrauben zum Balancing

Alle Zahlen (Preise, Glück, Chancen, Basisgeld, Lagerbestände) liegen
zentral in `data.js` bzw. `shop.js` – nichts davon ist in der Logik
verstreut, du kannst also frei testen und anpassen.
