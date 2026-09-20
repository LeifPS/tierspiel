// ============================================================
// Shop – rotiert alle 5 Minuten, exakt zeitgleich für ALLE Spieler,
// komplett ohne Netzwerk: Statt echtem Zufall wird ein deterministischer
// Zufallsgenerator verwendet, der mit dem aktuellen 5-Minuten-Zeitfenster
// geseedet ist. Dadurch würfeln alle Clients unabhängig voneinander exakt
// dasselbe Ergebnis, solange ihre Uhren einigermaßen synchron sind – ganz
// ohne Firestore-Abhängigkeit oder Race-Conditions am Rotationszeitpunkt.
// Bereits getätigte Käufe werden weiterhin nur lokal je Spieler verfolgt.
import { EGGS } from "./data.js";

const SHOP_KEY = "tierspiel_shop_v1";
const ROTATION_MS = 5 * 60 * 1000;

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

function rollShopStockForRotation(rotationIndex) {
  const rand = createSeededRandom(rotationIndex);
  const randInt = (min, max) => Math.floor(min + rand() * (max - min + 1));

  const stock = {};
  for (const egg of EGGS) {
    stock[egg.id] = rand() <= egg.appearChance ? randInt(egg.stock[0], egg.stock[1]) : 0;
  }
  // Sicherstellen, dass es nie komplett leer ist: Standard-Ei immer verfügbar
  if (!stock.standard) stock.standard = randInt(EGGS[0].stock[0], EGGS[0].stock[1]);
  return stock;
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

function getOrRotateShop() {
  const rotationIndex = currentRotationIndex();
  const existing = readShop();
  if (existing && existing.rotationIndex === rotationIndex) {
    return existing; // gleiches Zeitfenster – lokal ggf. schon gekaufte Bestände behalten
  }
  const stock = rollShopStockForRotation(rotationIndex);
  return writeShop({
    stock,
    // Unveränderter Bestand zum Rotationsstart – damit ein leergekauftes Ei
    // im UI weiterhin (ausgegraut) als "war diese Rotation im Angebot"
    // erkennbar bleibt, auch nach einem Neuladen der Seite.
    rolledStock: { ...stock },
    rotatedAtMs: rotationIndex * ROTATION_MS,
    rotationIndex,
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

function msUntilNextRotation(rotatedAtMs) {
  const elapsed = Date.now() - rotatedAtMs;
  return Math.max(0, ROTATION_MS - elapsed);
}

export { getOrRotateShop, buyEgg, msUntilNextRotation, ROTATION_MS };
