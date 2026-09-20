// ============================================================
// Spiellogik – Spielerstand, Brüten (auch offline), Ausrüsten, Geld
// ============================================================
import { db, doc, getDoc, setDoc, updateDoc } from "./firebase.js";
import {
  EGGS, PETS, rollWeightFactor, moneyMultiplierFromWeightRatio, drawPetFromPool,
} from "./data.js";

const EGG_BY_ID = Object.fromEntries(EGGS.map((e) => [e.id, e]));
const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));

const START_COINS = 500;
const START_EQUIP_SLOTS = 3;

function newInstanceId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) ;
}

function defaultPlayerState() {
  return {
    coins: START_COINS,
    equipSlots: START_EQUIP_SLOTS,
    equipped: [],       // Array von pet-instanceIds
    pets: [],           // { instanceId, petId, weightKg, ratio, moneyPerSec, obtainedAtMs }
    hatching: [],        // { instanceId, eggId, startMs, durationMs }
    lastActiveMs: Date.now(),
  };
}

async function loadPlayer(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const state = defaultPlayerState();
    await setDoc(ref, state);
    return state;
  }
  return snap.data();
}

async function savePlayer(uid, state) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, state, { merge: false });
}

// ---- Eier kaufen & starten -------------------------------------------------
function startHatching(state, eggId) {
  const egg = EGG_BY_ID[eggId];
  if (!egg) throw new Error("Unbekanntes Ei.");
  state.hatching.push({
    instanceId: newInstanceId(),
    eggId,
    startMs: Date.now(),
    durationMs: egg.hatchSeconds * 1000,
  });
}

// ---- Fertige Eier auswerten (funktioniert auch nach langer Abwesenheit) ---
function resolveFinishedEggs(state) {
  const now = Date.now();
  const stillHatching = [];
  const newlyHatched = [];
  for (const h of state.hatching) {
    if (now - h.startMs >= h.durationMs) {
      const egg = EGG_BY_ID[h.eggId];
      const pet = drawPetFromPool(egg.luckPercent);
      const rollFactor = rollWeightFactor();
      const weightKg = pet.baseWeightKg * egg.weightMultiplier * rollFactor;
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
      newlyHatched.push({ pet, instance: petInstance, egg });
    } else {
      stillHatching.push(h);
    }
  }
  state.hatching = stillHatching;
  return newlyHatched;
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

function totalMoneyPerSecond(state) {
  const equippedSet = new Set(state.equipped);
  return state.pets
    .filter((p) => equippedSet.has(p.instanceId))
    .reduce((sum, p) => sum + p.moneyPerSec, 0);
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

function timeRemainingMs(hatchEntry) {
  return Math.max(0, hatchEntry.startMs + hatchEntry.durationMs - Date.now());
}

export {
  EGG_BY_ID, PET_BY_ID, START_COINS, START_EQUIP_SLOTS,
  defaultPlayerState, loadPlayer, savePlayer,
  startHatching, resolveFinishedEggs, accrueMoney, totalMoneyPerSecond,
  equipPet, unequipPet, timeRemainingMs,
};
