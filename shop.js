// ============================================================
// Globaler Shop – ein einziges Firestore-Dokument (shop/current),
// das alle Spieler teilen. Da wir keine Cloud Function deployen,
// übernimmt der Client die Rotation: Sobald jemand die Seite lädt
// und die letzte Rotation älter als 5 Minuten ist, wird per
// Transaktion ein neuer Shop-Zustand geschrieben. Die Transaktion
// verhindert, dass zwei Spieler gleichzeitig unterschiedliche
// Shops erzeugen.
// ============================================================
import { db, doc, getDoc, runTransaction, serverTimestamp } from "./firebase.js";
import { EGGS } from "./data.js";

const SHOP_REF_PATH = ["shop", "current"];
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

async function getOrRotateShop() {
  const ref = doc(db, ...SHOP_REF_PATH);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    if (!snap.exists()) {
      const stock = rollNewShopStock();
      const data = { stock, rotatedAtMs: now, rotatedAt: serverTimestamp() };
      tx.set(ref, data);
      return data;
    }
    const data = snap.data();
    const age = now - (data.rotatedAtMs || 0);
    if (age >= ROTATION_MS) {
      const stock = rollNewShopStock();
      const newData = { stock, rotatedAtMs: now, rotatedAt: serverTimestamp() };
      tx.set(ref, newData);
      return newData;
    }
    return data;
  });
  return result; // { stock, rotatedAtMs }
}

async function buyEgg(eggId) {
  const ref = doc(db, ...SHOP_REF_PATH);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Shop noch nicht initialisiert.");
    const data = snap.data();
    const current = data.stock?.[eggId] || 0;
    if (current <= 0) throw new Error("Dieses Ei ist gerade nicht auf Lager.");
    const newStock = { ...data.stock, [eggId]: current - 1 };
    tx.update(ref, { stock: newStock });
    return true;
  });
}

function msUntilNextRotation(rotatedAtMs) {
  const elapsed = Date.now() - rotatedAtMs;
  return Math.max(0, ROTATION_MS - elapsed);
}

export { getOrRotateShop, buyEgg, msUntilNextRotation, ROTATION_MS };
