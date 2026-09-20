// ============================================================
// Shop – rein lokal. Rotiert alle paar Minuten und merkt sich den
// Zustand im localStorage, damit er auch nach einem Reload gleich
// bleibt, bis die Rotationszeit abgelaufen ist.
// ============================================================
import { EGGS } from "./data.js";

const SHOP_KEY = "tierspiel_shop_v1";
const ROTATION_MS = 5 * 60 * 1000;

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function rollNewShopStock() {
  const stock = {};
  for (const egg of EGGS) {
    if (Math.random() <= egg.appearChance) {
      stock[egg.id] = randInt(egg.stock[0], egg.stock[1]);
    } else {
      stock[egg.id] = 0;
    }
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
  const now = Date.now();
  const existing = readShop();
  if (!existing || now - (existing.rotatedAtMs || 0) >= ROTATION_MS) {
    return writeShop({ stock: rollNewShopStock(), rotatedAtMs: now });
  }
  return existing;
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
