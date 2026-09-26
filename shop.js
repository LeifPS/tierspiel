// ============================================================
// Shop – rotiert alle 5 Minuten, exakt zeitgleich für ALLE Spieler,
// komplett ohne Netzwerk: Statt echtem Zufall wird ein deterministischer
// Zufallsgenerator verwendet, der mit dem aktuellen 5-Minuten-Zeitfenster
// geseedet ist. Dadurch würfeln alle Clients unabhängig voneinander exakt
// dasselbe Ergebnis, solange ihre Uhren einigermaßen synchron sind – ganz
// ohne Firestore-Abhängigkeit oder Race-Conditions am Rotationszeitpunkt.
// Bereits getätigte Käufe werden weiterhin nur lokal je Spieler verfolgt.
import { EGGS, HOURLY_EGG_IDS } from "./data.js";

const SHOP_KEY = "tierspiel_shop_v1";
const ROTATION_MS = 5 * 60 * 1000;
// Zusätzlich zur normalen 5-Minuten-Rotation: zu jeder vollen Stunde ist
// GARANTIERT eins der 6 "Exklusiv"-Eier im Shop (siehe HOURLY_EGG_IDS in
// data.js) - welches, wird genau wie die normale Rotation deterministisch
// aus dem Zeitfenster gewürfelt, also für alle Spieler gleich.
const HOURLY_ROTATION_MS = 60 * 60 * 1000;

// mulberry32: kleiner, schneller seedbarer PRNG (öffentliches Verfahren).
function createSeededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function currentRotationIndex() {
  return Math.floor(Date.now() / ROTATION_MS);
}

function currentHourlyIndex() {
  return Math.floor(Date.now() / HOURLY_ROTATION_MS);
}

// stockMultiplier: >1, wenn der Spieler ein Huge Pet mit "boost_shop_stock"-
// Fähigkeit ausgerüstet hat (siehe getShopStockMultiplier in game.js) - wirkt
// rein auf die Stückzahl, nie darauf, WELCHE Eier erscheinen (das bleibt für
// alle Spieler identisch).
function rollShopStockForRotation(rotationIndex, stockMultiplier = 1) {
  const rand = createSeededRandom(rotationIndex);
  const randInt = (min, max) => Math.floor(min + rand() * (max - min + 1));

  const stock = {};
  for (const egg of EGGS) {
    stock[egg.id] = rand() <= egg.appearChance ? Math.round(randInt(egg.stock[0], egg.stock[1]) * stockMultiplier) : 0;
  }
  // Sicherstellen, dass es nie komplett leer ist: Standard-Ei immer verfügbar
  if (!stock.standard) stock.standard = Math.round(randInt(EGGS[0].stock[0], EGGS[0].stock[1]) * stockMultiplier);
  return stock;
}

// Welches der 6 Stunden-Exklusiv-Eier gerade dran ist - deterministisch aus
// dem Stunden-Zeitfenster gewürfelt (eigener Seed-Stream, unabhängig von der
// normalen 5-Minuten-Rotation).
function pickHourlyEggId(hourlyIndex) {
  const rand = createSeededRandom(hourlyIndex);
  return HOURLY_EGG_IDS[Math.floor(rand() * HOURLY_EGG_IDS.length)];
}

// ---- "Zuletzt im Shop erschienen" je Ei -----------------------------------
// Rein clientseitig berechnet (kein Firebase nötig): da die Rotation
// deterministisch aus dem Zeitfenster gewürfelt wird, kann man exakt
// dieselbe Formel einfach rückwärts durchrechnen, um herauszufinden, wann
// ein Ei zuletzt im Shop war - ganz ohne irgendwo eine Historie zu speichern.
const LAST_APPEARANCE_SCAN_LIMIT = 300000; // ~2,85 Jahre zurück - reicht für jedes Ei

// Würfelt exakt wie rollShopStockForRotation, bricht aber ab, sobald das
// gesuchte Ei dran war - wichtig: der Zufalls-Stream muss trotzdem für jedes
// vorherige Ei GENAUSO viele rand()-Aufrufe verbrauchen (Erschein-Chance +
// ggf. Stückzahl), sonst würde ab hier alles verschieden ausgewürfelt.
function didEggAppearInRotation(eggId, rotationIndex) {
  const rand = createSeededRandom(rotationIndex);
  for (const egg of EGGS) {
    const appeared = rand() <= egg.appearChance;
    if (appeared) rand(); // Stückzahl-Wurf konsumieren, auch wenn uninteressant
    if (egg.id === eggId) return appeared;
  }
  return false;
}

function findLastAppearanceRotation(eggId) {
  const from = currentRotationIndex();
  for (let i = from; i > from - LAST_APPEARANCE_SCAN_LIMIT; i--) {
    if (didEggAppearInRotation(eggId, i)) return i;
  }
  return null; // seit LAST_APPEARANCE_SCAN_LIMIT Rotationen nicht erschienen
}

// Pro Ei nur einmal je Rotationsfenster neu berechnen (die Rückwärtssuche ist
// nicht gratis) - wird ungültig, sobald der Shop das nächste Mal rotiert.
let lastAppearanceCache = { rotationIndex: null, results: {} };

function getLastAppearanceMs(eggId) {
  const nowRot = currentRotationIndex();
  if (lastAppearanceCache.rotationIndex !== nowRot) {
    lastAppearanceCache = { rotationIndex: nowRot, results: {} };
  }
  if (!(eggId in lastAppearanceCache.results)) {
    lastAppearanceCache.results[eggId] = findLastAppearanceRotation(eggId);
  }
  const foundRotation = lastAppearanceCache.results[eggId];
  return foundRotation === null ? null : foundRotation * ROTATION_MS;
}

function readShop() {
  const raw = localStorage.getItem(SHOP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeShop(data) {
  localStorage.setItem(SHOP_KEY, JSON.stringify(data));
  return data;
}

function getOrRotateShop(stockMultiplier = 1) {
  const rotationIndex = currentRotationIndex();
  const hourlyIndex = currentHourlyIndex();
  const existing = readShop();
  const sameRotation = existing && existing.rotationIndex === rotationIndex;

  // Gleiches 5-Min-Fenster: Bestand bleibt wie er ist (lokal ggf. schon
  // gekaufte Mengen bleiben verringert). Neues Fenster: frisch auswürfeln.
  const stock = sameRotation ? existing.stock : rollShopStockForRotation(rotationIndex, stockMultiplier);
  const rolledStock = sameRotation ? existing.rolledStock : { ...stock };

  // Stunden-Exklusiv-Ei: eigener Bestand, unabhängig von der 5-Min-Rotation.
  // Läuft die Stunde noch, bleibt der ggf. schon angekaufte Rest-Bestand
  // erhalten (auch über einen 5-Min-Reroll hinweg, der stock[...] oben sonst
  // wieder auf 0 gesetzt hätte, da diese Eier appearChance:0 haben) - erst
  // bei einer neuen Stunde wird neu gewürfelt und der Bestand aufgefüllt.
  let hourlyEggId = existing?.hourlyEggId;
  let hourlyRemaining = hourlyEggId !== undefined ? existing.stock[hourlyEggId] : undefined;
  if (existing?.hourlyIndex !== hourlyIndex) {
    hourlyEggId = pickHourlyEggId(hourlyIndex);
    hourlyRemaining = Math.max(1, Math.round(1 * stockMultiplier));
  }
  if (hourlyEggId !== undefined) {
    stock[hourlyEggId] = hourlyRemaining;
    if (rolledStock[hourlyEggId] === undefined) rolledStock[hourlyEggId] = hourlyRemaining;
  }

  return writeShop({
    stock,
    // Unveränderter Bestand zum Rotationsstart – damit ein leergekauftes Ei
    // im UI weiterhin (ausgegraut) als "war diese Rotation im Angebot"
    // erkennbar bleibt, auch nach einem Neuladen der Seite.
    rolledStock,
    rotatedAtMs: rotationIndex * ROTATION_MS,
    rotationIndex,
    hourlyIndex,
    hourlyEggId,
    hourlyRotatedAtMs: hourlyIndex * HOURLY_ROTATION_MS,
  });
}

function buyEgg(eggId) {
  const data = readShop();
  if (!data) throw new Error("Shop noch nicht initialisiert.");
  const current = data.stock?.[eggId] || 0;
  if (current <= 0) throw new Error("Dieses Ei ist gerade nicht auf Lager.");
  data.stock[eggId] = current - 1;
  writeShop(data);
  return true;
}

// ---- Admin-/Testfunktion ---------------------------------------------------
// Erzwingt sofort (unabhängig von der echten Uhrzeit) ein bestimmtes
// Stunden-Exklusiv-Ei als aktuell garantiertes Angebot, mit frischem Bestand -
// rein lokal (localStorage), betrifft also nie andere Spieler. Nur dafür da,
// den echten Kauf-/Shop-Ablauf zu testen, ohne bis zur nächsten vollen
// Stunde warten zu müssen.
function forceHourlyEgg(eggId, stockMultiplier = 1) {
  const data = readShop() || getOrRotateShop();
  data.hourlyEggId = eggId;
  data.hourlyIndex = currentHourlyIndex();
  data.hourlyRotatedAtMs = Date.now();
  data.stock[eggId] = Math.max(1, Math.round(1 * stockMultiplier));
  data.rolledStock[eggId] = data.stock[eggId];
  return writeShop(data);
}

function msUntilNextRotation(rotatedAtMs) {
  const elapsed = Date.now() - rotatedAtMs;
  return Math.max(0, ROTATION_MS - elapsed);
}

function msUntilNextHourly(hourlyRotatedAtMs) {
  const elapsed = Date.now() - hourlyRotatedAtMs;
  return Math.max(0, HOURLY_ROTATION_MS - elapsed);
}

export {
  getOrRotateShop, buyEgg, msUntilNextRotation, currentRotationIndex, ROTATION_MS, getLastAppearanceMs,
  msUntilNextHourly, HOURLY_ROTATION_MS, forceHourlyEgg,
};
