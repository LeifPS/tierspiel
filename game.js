// ============================================================
// Spiellogik – Spielerstand, Brüten (auch offline), Ausrüsten, Geld
// Läuft komplett lokal: der Spielstand liegt im localStorage des Browsers.
// ============================================================
import {
  EGGS, PETS, REBIRTHS, rollWeightFactor, moneyMultiplierFromWeightRatio, drawPetFromPool,
} from "./data.js";

const EGG_BY_ID = Object.fromEntries(EGGS.map((e) => [e.id, e]));
const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));

const START_COINS = 500;
const START_EQUIP_SLOTS = 3;
const SAVE_KEY = "tierspiel_save_v1";

function newInstanceId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) ;
}

function defaultPlayerState() {
  return {
    coins: START_COINS,
    equipSlots: START_EQUIP_SLOTS,
    equipped: [],       // Array von pet-instanceIds
    pets: [],           // { instanceId, petId, weightKg, ratio, moneyPerSec, obtainedAtMs }
    hatching: [],        // { instanceId, eggId, durationMs, remainingMs }
    seenEggs: [],        // eggIds, die der Spieler schonmal gekauft hat (für den Index)
    rebirth: 0,          // erreichte Rebirth-Stufe (0 = noch keine)
    lastActiveMs: Date.now(),
  };
}

function loadPlayer() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return defaultPlayerState();
  let state;
  try {
    state = { ...defaultPlayerState(), ...JSON.parse(raw) };
  } catch {
    return defaultPlayerState();
  }
  // Alte Spielstände hatten "startMs" statt "remainingMs" – umrechnen.
  state.hatching = state.hatching.map((h) => (
    h.remainingMs !== undefined
      ? h
      : { instanceId: h.instanceId, eggId: h.eggId, durationMs: h.durationMs, remainingMs: h.durationMs - (Date.now() - h.startMs) }
  ));
  return state;
}

function savePlayer(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function resetPlayer() {
  localStorage.removeItem(SAVE_KEY);
}

// ---- Eier kaufen & starten -------------------------------------------------
function startHatching(state, eggId) {
  const egg = EGG_BY_ID[eggId];
  if (!egg) throw new Error("Unbekanntes Ei.");
  const durationMs = egg.hatchSeconds * 1000;
  state.hatching.push({
    instanceId: newInstanceId(),
    eggId,
    durationMs,
    remainingMs: durationMs,
  });
  if (!state.seenEggs) state.seenEggs = [];
  if (!state.seenEggs.includes(eggId)) state.seenEggs.push(eggId);
}

// ---- Brütezeit voranschreiten lassen ---------------------------------------
// speedMultiplier: 1x während der Spieler weg war (Offline-Zeit),
// 2x während das Spiel aktiv im Browser-Tab läuft.
function tickHatching(state, elapsedMs, speedMultiplier = 1) {
  for (const h of state.hatching) {
    h.remainingMs -= elapsedMs * speedMultiplier;
  }
}

// ---- Fertige Eier erkennen (löst sie NICHT aus – das macht hatchEgg) -------
function isHatchingFinished(hatchEntry) {
  return hatchEntry.remainingMs <= 0;
}

function getFinishedHatching(state) {
  return state.hatching.filter(isHatchingFinished);
}

// ---- Ein fertiges Ei manuell ausbrüten -------------------------------------
function hatchEgg(state, instanceId) {
  const entry = state.hatching.find((h) => h.instanceId === instanceId);
  if (!entry) throw new Error("Dieses Ei brütet nicht (mehr).");
  if (!isHatchingFinished(entry)) throw new Error("Das Ei ist noch nicht fertig.");

  const now = Date.now();
  const egg = EGG_BY_ID[entry.eggId];
  const pet = drawPetFromPool(egg.luckPercent);
  const rollFactor = rollWeightFactor();
  const weightKg = pet.baseWeightKg * rollFactor;
  const ratio = weightKg / pet.baseWeightKg; // Vielfaches des Basisgewichts
  const moneyPerSec = pet.baseMoney * moneyMultiplierFromWeightRatio(ratio);
  const petInstance = {
    instanceId: newInstanceId(),
    petId: pet.id,
    weightKg,
    ratio,
    moneyPerSec,
    obtainedAtMs: now,
  };
  state.pets.push(petInstance);
  state.hatching = state.hatching.filter((h) => h.instanceId !== instanceId);
  return { pet, instance: petInstance, egg };
}

// ---- Geld aus equippten Pets (auch für die Offline-Zeit) ------------------
function accrueMoney(state) {
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - state.lastActiveMs) / 1000);
  const perSec = totalMoneyPerSecond(state);
  const earned = perSec * elapsedSec;
  state.coins += earned;
  state.lastActiveMs = now;
  return earned;
}

function getMoneyMultiplier(state) {
  return state.rebirth > 0 ? REBIRTHS[state.rebirth - 1].moneyMultiplier : 1;
}

function totalMoneyPerSecond(state) {
  const equippedSet = new Set(state.equipped);
  const base = state.pets
    .filter((p) => equippedSet.has(p.instanceId))
    .reduce((sum, p) => sum + p.moneyPerSec, 0);
  return base * getMoneyMultiplier(state);
}

// ---- Rebirth: Geld + ein bestimmtes Pet gegen dauerhafte Boni tauschen -----
function performRebirth(state) {
  const next = REBIRTHS[state.rebirth];
  if (!next) throw new Error("Du hast bereits die maximale Rebirth-Stufe erreicht.");
  if (state.coins < next.price) throw new Error("Nicht genug Münzen für diese Rebirth-Stufe.");
  const petInstance = state.pets.find((p) => p.petId === next.petId);
  if (!petInstance) throw new Error(`Du brauchst ein ${PET_BY_ID[next.petId].name} für diese Rebirth-Stufe.`);

  state.coins -= next.price;
  state.pets = state.pets.filter((p) => p.instanceId !== petInstance.instanceId);
  state.equipped = state.equipped.filter((id) => id !== petInstance.instanceId);
  state.rebirth = next.level;
  state.equipSlots = next.equipSlots;
  return next;
}

function equipPet(state, instanceId) {
  if (state.equipped.includes(instanceId)) return;
  if (state.equipped.length >= state.equipSlots) {
    throw new Error(`Du hast nur ${state.equipSlots} Ausrüstungs-Plätze frei.`);
  }
  if (!state.pets.some((p) => p.instanceId === instanceId)) {
    throw new Error("Dieses Tier besitzt du nicht.");
  }
  state.equipped.push(instanceId);
}

function unequipPet(state, instanceId) {
  state.equipped = state.equipped.filter((id) => id !== instanceId);
}

// ---- Automatisch die Tiere mit dem höchsten Geld/Sekunde ausrüsten --------
function autoEquipBest(state) {
  const best = [...state.pets]
    .sort((a, b) => b.moneyPerSec - a.moneyPerSec)
    .slice(0, state.equipSlots);
  state.equipped = best.map((p) => p.instanceId);
}

function timeRemainingMs(hatchEntry) {
  return Math.max(0, hatchEntry.remainingMs);
}

export {
  EGG_BY_ID, PET_BY_ID, START_COINS, START_EQUIP_SLOTS,
  defaultPlayerState, loadPlayer, savePlayer, resetPlayer,
  startHatching, tickHatching, isHatchingFinished, getFinishedHatching, hatchEgg,
  accrueMoney, totalMoneyPerSecond, getMoneyMultiplier, performRebirth,
  equipPet, unequipPet, autoEquipBest, timeRemainingMs,
};
