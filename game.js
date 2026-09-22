// ============================================================
// Spiellogik – Spielerstand, Brüten (auch offline), Ausrüsten, Geld
// Läuft komplett lokal: der Spielstand liegt im localStorage des Browsers.
// ============================================================
import {
  EGGS, PETS, REBIRTHS, MUTATION_BY_ID, ENV_MUTATIONS, ENV_MUTATION_BY_ID,
  rollWeightFactor, moneyMultiplierFromWeightRatio, hugeWeightMultiplier, drawPetFromPool, rollMutation,
  rollHugePetOverride,
} from "./data.js";

const EGG_BY_ID = Object.fromEntries(EGGS.map((e) => [e.id, e]));
const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));

const START_COINS = 500;
const START_EQUIP_SLOTS = 3;
const SAVE_KEY = "tierspiel_save_v1";

// Wenn ein Pet umbenannt/ausgetauscht wird (alte id -> neue id), landet die
// Zuordnung hier, damit schon gespeicherte Pet-Instanzen beim Laden auf die
// neue id migriert werden, statt auf ein nicht mehr existierendes Pet zu
// zeigen (PET_BY_ID[alte id] wäre sonst undefined).
const PET_ID_MIGRATIONS = {
  diamantkatze: "zuckerstange", // Diamond Cat -> Candycane (Astral)
};

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
    adminMode: false,    // Testmodus (siehe enableAdminMode) - zählt nie für die Rangliste
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
  // Umbenannte/ausgetauschte Pets (siehe PET_ID_MIGRATIONS) auf die neue id ummappen.
  state.pets = state.pets.map((p) => (
    PET_ID_MIGRATIONS[p.petId] ? { ...p, petId: PET_ID_MIGRATIONS[p.petId] } : p
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

// Erzeugt eine fertige Pet-Instanz aus einem gezogenen Pet (Gewichts-Rollfaktor
// + Ursprungsmutation werden hier gewürfelt) - gemeinsam genutzt von hatchEgg
// und dem Admin-Testmodus (adminInstantHatch), damit beide exakt dieselbe
// Geld-Formel verwenden.
function createPetInstance(pet) {
  const rollFactor = rollWeightFactor();
  const weightKg = pet.baseWeightKg * rollFactor;
  const ratio = weightKg / pet.baseWeightKg; // Vielfaches des Basisgewichts
  const mutation = rollMutation(); // z.B. "gold" mit 5% Chance, unabhängig vom Ei
  const mutationMoneyMultiplier = mutation ? MUTATION_BY_ID[mutation].moneyMultiplier : 1;
  // Pets mit moneyPercentOfBest (Huge Pets) haben kein festes baseMoney -
  // ihr Geld/Sekunde wird live in effectiveMoneyPerSec() berechnet, hier
  // bleibt der gespeicherte Wert ungenutzt bei 0.
  const moneyPerSec = pet.moneyPercentOfBest !== undefined
    ? 0
    : pet.baseMoney * moneyMultiplierFromWeightRatio(ratio) * mutationMoneyMultiplier;
  return {
    instanceId: newInstanceId(),
    petId: pet.id,
    weightKg,
    ratio,
    moneyPerSec,
    mutation,
    envMutation: null,
    abilityProgressMs: 0,
    obtainedAtMs: Date.now(),
  };
}

// ---- Ein fertiges Ei manuell ausbrüten -------------------------------------
function hatchEgg(state, instanceId) {
  const entry = state.hatching.find((h) => h.instanceId === instanceId);
  if (!entry) throw new Error("Dieses Ei brütet nicht (mehr).");
  if (!isHatchingFinished(entry)) throw new Error("Das Ei ist noch nicht fertig.");

  const egg = EGG_BY_ID[entry.eggId];
  // Jedes Ei hat eine eigene, unabhängige Chance auf ein Huge Pet (5x
  // seltener als astral-oder-besser aus demselben Ei) - kein eigenes Ei nötig.
  const hugeJackpot = rollHugePetOverride(egg.luckPercent, egg.rarity, egg.id);
  const pet = hugeJackpot || drawPetFromPool(egg.luckPercent, egg.rarity);
  const petInstance = createPetInstance(pet);
  state.pets.push(petInstance);
  state.hatching = state.hatching.filter((h) => h.instanceId !== instanceId);
  const eggRefunded = maybeRefundEgg(state, entry.eggId);
  return { pet, instance: petInstance, egg, eggRefunded };
}

// Fähigkeit "Riesiger Sketch-Corgi": anders als die zeitintervall-basierten
// Huge-Fähigkeiten (siehe tickHugeAbilities) ein Ereignis-Trigger direkt
// beim Ausbrüten - für jedes equippte Pet mit dieser Fähigkeit eine
// unabhängige Chance, das gerade verbrauchte Ei erneut (mit vollem Timer)
// in die Brüt-Liste zu legen. Bricht nach dem ersten Treffer ab, auch wenn
// mehrere solcher Pets gleichzeitig ausgerüstet sind.
function maybeRefundEgg(state, eggId) {
  const equippedSet = new Set(state.equipped);
  for (const p of state.pets) {
    if (!equippedSet.has(p.instanceId)) continue;
    const def = PET_BY_ID[p.petId];
    const ability = def && def.ability;
    if (!ability || ability.type !== "refund_egg_chance") continue;
    if (Math.random() < ability.chance) {
      startHatching(state, eggId);
      // Kommt direkt "fertig" zurück statt erneut die volle Brütezeit
      // warten zu müssen - nur noch manuell ausbrüten nötig.
      state.hatching[state.hatching.length - 1].remainingMs = 0;
      return true;
    }
  }
  return false;
}

// ---- Admin-/Testmodus -------------------------------------------------------
// Nur erreichbar über einen geheimen URL-Parameter (siehe main.js) - einmal
// aktiviert, bleibt es im Spielstand gespeichert. Erlaubt, jedes Ei sofort
// und kostenlos "echt" zu ziehen (dieselbe Verteilung wie im echten Spiel,
// nur ohne Preis/Wartezeit) sowie ein garantiertes Huge Pet, um neue Inhalte
// schnell zu testen. Zählt absichtlich nie für die Online-Rangliste.
function enableAdminMode(state) {
  state.adminMode = true;
}

function adminInstantHatch(state, eggId) {
  const egg = EGG_BY_ID[eggId];
  if (!egg) throw new Error("Unbekanntes Ei.");
  const hugeJackpot = rollHugePetOverride(egg.luckPercent, egg.rarity, egg.id);
  const pet = hugeJackpot || drawPetFromPool(egg.luckPercent, egg.rarity);
  const petInstance = createPetInstance(pet);
  state.pets.push(petInstance);
  if (!state.seenEggs) state.seenEggs = [];
  if (!state.seenEggs.includes(eggId)) state.seenEggs.push(eggId);
  return { pet, instance: petInstance, egg };
}

function adminGrantRandomHugePet(state) {
  const hugePets = PETS.filter((p) => p.rarity === "exklusiv");
  if (hugePets.length === 0) throw new Error("Es gibt noch kein Riesen-Pet.");
  const pet = hugePets[Math.floor(Math.random() * hugePets.length)];
  const petInstance = createPetInstance(pet);
  state.pets.push(petInstance);
  return { pet, instance: petInstance };
}

function adminAddCoins(state, amount) {
  state.coins += amount;
}

// ---- Geld aus equippten Pets (auch für die Offline-Zeit) ------------------
const MAX_OFFLINE_EARN_SECONDS = 2 * 60 * 60; // Offline-Geld wird auf 2h gedeckelt

function accrueMoney(state) {
  const now = Date.now();
  const elapsedSec = Math.min(
    Math.max(0, (now - state.lastActiveMs) / 1000),
    MAX_OFFLINE_EARN_SECONDS
  );
  const perSec = totalMoneyPerSecond(state);
  const earned = perSec * elapsedSec;
  state.coins += earned;
  state.lastActiveMs = now;
  return earned;
}

function getMoneyMultiplier(state) {
  return state.rebirth > 0 ? REBIRTHS[state.rebirth - 1].moneyMultiplier : 1;
}

// Für die meisten Pets einfach das gespeicherte moneyPerSec. Huge Pets
// (PET_BY_ID[petId].moneyPercentOfBest gesetzt) verdienen stattdessen live
// einen Prozentsatz vom besten anderen AUSGERÜSTETEN "normalen" Pet - dabei
// zählen andere Huge Pets nie als Basis, sonst könnten sich zwei equippte
// Huge Pets gegenseitig referenzieren (Kettenreaktion/Zirkelbezug).
function effectiveMoneyPerSec(state, petInstance) {
  const def = PET_BY_ID[petInstance.petId];
  if (!def || def.moneyPercentOfBest === undefined) return petInstance.moneyPerSec;
  const equippedSet = new Set(state.equipped);
  const bestOther = state.pets.reduce((best, p) => {
    if (!equippedSet.has(p.instanceId) || p.instanceId === petInstance.instanceId) return best;
    const otherDef = PET_BY_ID[p.petId];
    if (otherDef && otherDef.moneyPercentOfBest !== undefined) return best;
    return Math.max(best, p.moneyPerSec);
  }, 0);
  // Eigene Ursprungs-/Umgebungsmutation des Huge Pets muss weiterhin
  // draufmultipliziert werden - vorher wurden die hier komplett ignoriert.
  const originMult = petInstance.mutation ? MUTATION_BY_ID[petInstance.mutation].moneyMultiplier : 1;
  const envMult = petInstance.envMutation ? ENV_MUTATION_BY_ID[petInstance.envMutation].moneyMultiplier : 1;
  // Eigenes Gewicht wirkt sich leicht auf den Bonus aus (siehe hugeWeightMultiplier).
  const weightMult = hugeWeightMultiplier(petInstance.ratio);
  return (def.moneyPercentOfBest / 100) * bestOther * originMult * envMult * weightMult;
}

function totalMoneyPerSecond(state) {
  const equippedSet = new Set(state.equipped);
  const base = state.pets
    .filter((p) => equippedSet.has(p.instanceId))
    .reduce((sum, p) => sum + effectiveMoneyPerSec(state, p), 0);
  return base * getMoneyMultiplier(state);
}

// ---- Rebirth: Geld + ein bestimmtes Pet gegen dauerhafte Boni tauschen -----
function performRebirth(state) {
  const next = REBIRTHS[state.rebirth];
  if (!next) throw new Error("Du hast bereits die maximale Rebirth-Stufe erreicht.");
  if (state.coins < next.price) throw new Error("Nicht genug Münzen für diese Rebirth-Stufe.");
  const petInstance = state.pets.find((p) => p.petId === next.petId);
  if (!petInstance) throw new Error(`Du brauchst ein ${PET_BY_ID[next.petId].name} für diese Rebirth-Stufe.`);

  // Rebirth ist ein "Alles-Einsatz": next.price ist nur die Mindestanforderung,
  // um es überhaupt auszulösen - abgezogen wird der gesamte Münzstand, nicht
  // nur der Preis.
  state.coins = 0;
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

// ---- Umgebungsmutationen: laufende Chance während aktiv equippt -----------
// Wird NUR während aktivem Spielen (Tab offen) aufgerufen, nie für Offline-
// Zeit. Pro equipptem Pet und Umgebungsmutations-Typ wird pro vergangener
// Sekunde gewürfelt; gibt es diesen Typ schon bei einem anderen equippten
// Pet, ist die Chance für diesen Typ 0% (nur eine Kopie pro Typ im aktiven
// Loadout). Würfelt ein Pet, das schon eine (schlechtere) Umgebungsmutation
// hat, eine bessere, wird diese ersetzt ("die bessere wird genommen").
function tickEnvironmentalMutations(state, elapsedMs) {
  const elapsedSec = elapsedMs / 1000;
  if (elapsedSec <= 0) return [];
  const equippedSet = new Set(state.equipped);
  const equippedPets = state.pets.filter((p) => equippedSet.has(p.instanceId));
  const gained = [];

  for (const envMutation of ENV_MUTATIONS) {
    if (envMutation.disabled) continue;
    const alreadyPresent = equippedPets.some((p) => p.envMutation === envMutation.id);
    if (alreadyPresent) continue;

    for (const pet of equippedPets) {
      const current = pet.envMutation ? ENV_MUTATION_BY_ID[pet.envMutation] : null;
      if (current && current.moneyMultiplier >= envMutation.moneyMultiplier) continue;
      if (Math.random() >= envMutation.chancePerSecond * elapsedSec) continue;

      // Alten Umgebungsmultiplikator herausrechnen, bevor der neue angewendet wird.
      if (current) pet.moneyPerSec /= current.moneyMultiplier;
      pet.moneyPerSec *= envMutation.moneyMultiplier;
      pet.envMutation = envMutation.id;
      gained.push({ pet, envMutation });
      break; // dieser Typ ist jetzt im Loadout vergeben, nächster Typ
    }
  }
  return gained;
}

// ---- Wetterbasierte Umgebungsmutationen (Nass/Gefroren/Lunar) --------------
// Anders als die alte Sekunden-Chance oben: hier wird alle 15s EINMAL pro
// aktivem Wettertyp gewürfelt (siehe chancePer15s in data.js), und nur wenn
// das zugehörige Wetter (siehe weather.js) gerade tatsächlich zutrifft.
// "weather" ist { condition: "sonne"|"regen"|"schnee"|"windig", isDay }
// oder null (noch kein Wetter geladen) - dann passiert nichts.
const WEATHER_MUTATION_TICK_MS = 15000;
let weatherMutationProgressMs = 0;

function isWeatherMutationActive(envMutation, weather) {
  if (!weather || !envMutation.weatherCondition) return false;
  if (envMutation.weatherCondition === "nacht") return weather.isDay === false;
  return weather.condition === envMutation.weatherCondition;
}

function rollWeatherMutationsOnce(state, weather) {
  if (!weather) return [];
  const equippedSet = new Set(state.equipped);
  const equippedPets = state.pets.filter((p) => equippedSet.has(p.instanceId));
  const gained = [];
  for (const envMutation of ENV_MUTATIONS) {
    if (!isWeatherMutationActive(envMutation, weather)) continue;
    const alreadyPresent = equippedPets.some((p) => p.envMutation === envMutation.id);
    if (alreadyPresent) continue;
    for (const pet of equippedPets) {
      if (Math.random() >= envMutation.chancePer15s) continue;
      if (!applyEnvMutationIfBetter(pet, envMutation.id)) continue;
      gained.push({ pet, envMutation });
      break; // dieser Typ ist jetzt im Loadout vergeben, nächster Typ
    }
  }
  return gained;
}

// NUR während aktivem Spielen aufgerufen (wie tickEnvironmentalMutations),
// nie für Offline-Zeit - der 15s-Fortschritt lebt bewusst außerhalb von
// state (nicht gespeichert), ein Reload verliert also höchstens den
// angefangenen Countdown bis zum nächsten Tick.
function tickWeatherMutations(state, elapsedMs, weather) {
  weatherMutationProgressMs += elapsedMs;
  const gained = [];
  while (weatherMutationProgressMs >= WEATHER_MUTATION_TICK_MS) {
    weatherMutationProgressMs -= WEATHER_MUTATION_TICK_MS;
    gained.push(...rollWeatherMutationsOnce(state, weather));
  }
  return gained;
}

// ---- Huge-Pet-Fähigkeiten: eigener Effekt pro equipptem Huge Pet ----------
// Wie bei Umgebungsmutationen NUR während aktivem Spielen aufgerufen, nie
// für Offline-Zeit. Jedes Pet mit PET_BY_ID[petId].ability sammelt pro Tick
// Fortschritt; sobald das konfigurierte Intervall erreicht ist, löst die
// Fähigkeit aus (mehrfach hintereinander, falls elapsedMs > Intervall).
function tickHugeAbilities(state, elapsedMs) {
  const triggered = [];
  const equippedSet = new Set(state.equipped);
  for (const pet of state.pets) {
    if (!equippedSet.has(pet.instanceId)) continue;
    const def = PET_BY_ID[pet.petId];
    const ability = def && def.ability;
    if (!ability) continue;

    pet.abilityProgressMs = (pet.abilityProgressMs || 0) + elapsedMs;
    const intervalMs = ability.intervalSec * 1000;
    while (pet.abilityProgressMs >= intervalMs) {
      pet.abilityProgressMs -= intervalMs;
      const { targets, coinsGranted } = executeAbility(state, pet, ability);
      triggered.push({ source: pet, ability, targets, coinsGranted });
    }
  }
  return triggered;
}

// Liefert immer { targets, coinsGranted } - targets ein Array betroffener
// Pet-Instanzen (leer, wenn keins betroffen wurde; ob die Fähigkeit nur ein
// einzelnes Ziel hat oder mehrere gleichzeitig treffen kann, hängt vom Typ
// ab), coinsGranted die Anzahl direkt gutgeschriebener Münzen (0, wenn die
// Fähigkeit keine Münzen schenkt).
function executeAbility(state, sourcePet, ability) {
  if (ability.type === "mutate_random_equipped") {
    const target = mutateRandomEquipped(state, sourcePet.instanceId, ability.envMutationId);
    return { targets: target ? [target] : [], coinsGranted: 0 };
  }
  if (ability.type === "roll_mutation_all_equipped") {
    const targets = rollMutationForAllEquipped(state, sourcePet.instanceId, ability.envMutationId, ability.chancePerTarget);
    return { targets, coinsGranted: 0 };
  }
  if (ability.type === "upgrade_origin_mutation") {
    const target = upgradeOriginMutation(state, sourcePet.instanceId, ability.fromMutationId, ability.toMutationId);
    return { targets: target ? [target] : [], coinsGranted: 0 };
  }
  if (ability.type === "grant_income_bonus") {
    const coinsGranted = totalMoneyPerSecond(state) * ability.equivalentSeconds;
    state.coins += coinsGranted;
    return { targets: [], coinsGranted };
  }
  return { targets: [], coinsGranted: 0 };
}

// Wählt zufällig ein anderes ausgerüstetes Pet mit der Ursprungsmutation
// "fromMutationId" (z.B. Gold) und wandelt sie in "toMutationId" (z.B.
// Diamant) um - anders als Umgebungsmutationen ist eine Ursprungsmutation
// direkt ins gespeicherte moneyPerSec eingerechnet, daher wird hier der
// alte Multiplikator herausgerechnet und der neue reinmultipliziert.
function upgradeOriginMutation(state, sourceInstanceId, fromMutationId, toMutationId) {
  const equippedSet = new Set(state.equipped);
  const candidates = state.pets.filter((p) => (
    equippedSet.has(p.instanceId) && p.instanceId !== sourceInstanceId && p.mutation === fromMutationId
  ));
  if (candidates.length === 0) return null;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const fromMult = MUTATION_BY_ID[fromMutationId].moneyMultiplier;
  const toMult = MUTATION_BY_ID[toMutationId].moneyMultiplier;
  target.moneyPerSec = (target.moneyPerSec / fromMult) * toMult;
  target.mutation = toMutationId;
  return target;
}

// Setzt die genannte Umgebungsmutation auf ein Pet, respektiert dabei "die
// bessere wird genommen" (siehe ENV_MUTATIONS-Stacking-Regel): wird nur
// angewendet, wenn sie einen höheren Multiplikator hat als eine eventuell
// schon vorhandene. Gibt zurück, ob tatsächlich etwas geändert wurde.
function applyEnvMutationIfBetter(pet, envMutationId) {
  const envMutation = ENV_MUTATION_BY_ID[envMutationId];
  if (pet.envMutation === envMutationId) return false;
  const current = pet.envMutation ? ENV_MUTATION_BY_ID[pet.envMutation] : null;
  if (current && current.moneyMultiplier >= envMutation.moneyMultiplier) return false;
  if (current) pet.moneyPerSec /= current.moneyMultiplier;
  pet.moneyPerSec *= envMutation.moneyMultiplier;
  pet.envMutation = envMutationId;
  return true;
}

// Wählt zufällig ein anderes ausgerüstetes Pet (nie das Huge Pet selbst) und
// gibt ihm die genannte Umgebungsmutation - unabhängig von deren "disabled"-
// Flag (das blockiert nur den passiven Zufalls-Roll, nicht diese gezielte
// Fähigkeit). Trägt eine eventuell schon vorhandene Kopie DESSELBEN Typs bei
// einem anderen equippten Pet ab, damit davon immer nur eine im Loadout ist -
// hat das zufällig gewählte Ziel aber schon eine BESSERE andere Mutation,
// bleibt die einfach bestehen (die Fähigkeit "verpufft" dann für dieses Mal).
function mutateRandomEquipped(state, sourceInstanceId, envMutationId) {
  const equippedSet = new Set(state.equipped);
  const candidates = state.pets.filter((p) => equippedSet.has(p.instanceId) && p.instanceId !== sourceInstanceId);
  if (candidates.length === 0) return null;
  const target = candidates[Math.floor(Math.random() * candidates.length)];

  for (const p of candidates) {
    if (p.instanceId !== target.instanceId && p.envMutation === envMutationId) {
      const envMutation = ENV_MUTATION_BY_ID[envMutationId];
      p.moneyPerSec /= envMutation.moneyMultiplier;
      p.envMutation = null;
    }
  }
  applyEnvMutationIfBetter(target, envMutationId);
  return target;
}

// Würfelt für JEDES andere ausgerüstete Pet EINZELN, ob es die genannte
// Umgebungsmutation bekommt - anders als mutateRandomEquipped kann das also
// mehrere Pets gleichzeitig treffen (kein "nur eine Kopie pro Typ im
// Loadout"-Limit, das gilt nur für den passiven Zufalls-Roll). Gibt alle
// tatsächlich veränderten Pets zurück.
function rollMutationForAllEquipped(state, sourceInstanceId, envMutationId, chancePerTarget) {
  const equippedSet = new Set(state.equipped);
  const affected = [];
  for (const p of state.pets) {
    if (!equippedSet.has(p.instanceId) || p.instanceId === sourceInstanceId) continue;
    if (Math.random() >= chancePerTarget) continue;
    if (applyEnvMutationIfBetter(p, envMutationId)) affected.push(p);
  }
  return affected;
}

// ---- Automatisch die Tiere mit dem höchsten Geld/Sekunde ausrüsten --------
// Huge Pets haben kein festes moneyPerSec (immer 0 gespeichert) - ein
// einfaches Sortieren nach dem gespeicherten Wert würde sie nie auswählen,
// obwohl sie equippt oft die stärksten Verdiener sind. Stattdessen: das
// stärkste normale Pet lohnt sich immer auszurüsten (zählt selbst voll UND
// ist die Basis, von der jedes equippte Huge Pet seinen Prozentsatz
// verdient), danach werden alle übrigen Slots mit den wertvollsten
// restlichen Pets (normal oder Huge, mit ihrem tatsächlichen Ertrag
// inkl. eigener Mutationen) aufgefüllt.
function autoEquipBest(state) {
  const isHugePet = (p) => PET_BY_ID[p.petId]?.moneyPercentOfBest !== undefined;
  const normalPets = state.pets.filter((p) => !isHugePet(p));
  const hugePets = state.pets.filter(isHugePet);

  if (normalPets.length === 0) {
    // Keine normalen Pets vorhanden - Huge Pets hätten keine Basis und
    // würden nichts verdienen, also einfach nach moneyPerSec sortieren.
    const best = [...state.pets].sort((a, b) => b.moneyPerSec - a.moneyPerSec).slice(0, state.equipSlots);
    state.equipped = best.map((p) => p.instanceId);
    return;
  }

  const sortedNormal = [...normalPets].sort((a, b) => b.moneyPerSec - a.moneyPerSec);
  const bestNormal = sortedNormal[0];
  const candidates = [
    ...sortedNormal.slice(1).map((p) => ({ pet: p, value: p.moneyPerSec })),
    ...hugePets.map((p) => ({
      pet: p,
      value: effectiveMoneyPerSec({ ...state, equipped: [p.instanceId, bestNormal.instanceId] }, p),
    })),
  ];
  candidates.sort((a, b) => b.value - a.value);

  const chosen = [bestNormal, ...candidates.slice(0, Math.max(0, state.equipSlots - 1)).map((c) => c.pet)];
  state.equipped = chosen.slice(0, state.equipSlots).map((p) => p.instanceId);
}

function timeRemainingMs(hatchEntry) {
  return Math.max(0, hatchEntry.remainingMs);
}

// ---- Trading: Ein Angebot ist { pets: [...], eggs: [...], coins } -----------
// Läuft komplett ohne Login/Server-Autorität (siehe trading.js) - wer seinen
// Client manipuliert, kann theoretisch ein falsches Angebot verschicken. Die
// Empfängerseite übernimmt deshalb nie übertragene Zahlen wie moneyPerSec
// oder durationMs direkt, sondern rechnet sie aus den echten Spieldaten neu
// aus (siehe addIncomingOfferToState) - ein gefälschter Wert hätte so keine
// Wirkung, nur eine gefälschte petId/Mutation könnte (bewusst) durchgehen.
function serializePetForTrade(petInstance) {
  return {
    instanceId: petInstance.instanceId,
    petId: petInstance.petId,
    ratio: petInstance.ratio,
    mutation: petInstance.mutation || null,
    envMutation: petInstance.envMutation || null,
  };
}

function serializeEggForTrade(hatchEntry) {
  return {
    instanceId: hatchEntry.instanceId,
    eggId: hatchEntry.eggId,
    remainingMs: Math.max(0, hatchEntry.remainingMs),
  };
}

// Der Gewichtsfaktor liegt laut WEIGHT_ROLL_TABLE (data.js) immer zwischen
// 0.85x und 10x - etwas großzügiger geprüft, um keine legitimen Werte durch
// Rundung abzulehnen.
function isValidTradedPet(p) {
  if (!p || typeof p !== "object") return false;
  if (!PET_BY_ID[p.petId]) return false;
  if (typeof p.ratio !== "number" || !(p.ratio >= 0.8 && p.ratio <= 10.5)) return false;
  if (p.mutation !== null && p.mutation !== undefined && !MUTATION_BY_ID[p.mutation]) return false;
  if (p.envMutation !== null && p.envMutation !== undefined && !ENV_MUTATION_BY_ID[p.envMutation]) return false;
  return true;
}

function isValidTradedEgg(e) {
  if (!e || typeof e !== "object") return false;
  if (!EGG_BY_ID[e.eggId]) return false;
  if (typeof e.remainingMs !== "number" || e.remainingMs < 0) return false;
  return true;
}

// Entfernt das eigene Angebot (Pets/Eier per instanceId + Münzen) aus dem
// lokalen Spielstand - wird beim Abschluss des eigenen Trades aufgerufen.
function removeOwnOfferFromState(state, offer) {
  const petIds = new Set((offer.pets || []).map((p) => p.instanceId));
  const eggIds = new Set((offer.eggs || []).map((e) => e.instanceId));
  state.pets = state.pets.filter((p) => !petIds.has(p.instanceId));
  state.equipped = state.equipped.filter((id) => !petIds.has(id));
  state.hatching = state.hatching.filter((h) => !eggIds.has(h.instanceId));
  state.coins = Math.max(0, state.coins - (Number(offer.coins) || 0));
}

// Übernimmt das (eingefrorene) Angebot der Gegenseite - erzeugt dabei neue
// instanceIds und rechnet moneyPerSec/durationMs frisch aus petId/ratio/
// Mutation aus (siehe Kommentar oben), statt übertragenen Zahlen zu trauen.
function addIncomingOfferToState(state, offer) {
  for (const p of (offer.pets || [])) {
    if (!isValidTradedPet(p)) continue;
    const def = PET_BY_ID[p.petId];
    const mutationMult = p.mutation ? MUTATION_BY_ID[p.mutation].moneyMultiplier : 1;
    const envMult = p.envMutation ? ENV_MUTATION_BY_ID[p.envMutation].moneyMultiplier : 1;
    const moneyPerSec = def.moneyPercentOfBest !== undefined
      ? 0
      : def.baseMoney * moneyMultiplierFromWeightRatio(p.ratio) * mutationMult * envMult;
    state.pets.push({
      instanceId: newInstanceId(),
      petId: p.petId,
      weightKg: def.baseWeightKg * p.ratio,
      ratio: p.ratio,
      moneyPerSec,
      mutation: p.mutation || null,
      envMutation: p.envMutation || null,
      abilityProgressMs: 0,
      obtainedAtMs: Date.now(),
    });
  }
  for (const e of (offer.eggs || [])) {
    if (!isValidTradedEgg(e)) continue;
    const egg = EGG_BY_ID[e.eggId];
    const durationMs = egg.hatchSeconds * 1000;
    state.hatching.push({
      instanceId: newInstanceId(),
      eggId: e.eggId,
      durationMs,
      remainingMs: Math.min(durationMs, Math.max(0, e.remainingMs)),
    });
    if (!state.seenEggs) state.seenEggs = [];
    if (!state.seenEggs.includes(e.eggId)) state.seenEggs.push(e.eggId);
  }
  state.coins += Math.max(0, Number(offer.coins) || 0);
}

export {
  EGG_BY_ID, PET_BY_ID, START_COINS, START_EQUIP_SLOTS,
  defaultPlayerState, loadPlayer, savePlayer, resetPlayer,
  startHatching, tickHatching, isHatchingFinished, getFinishedHatching, hatchEgg,
  accrueMoney, totalMoneyPerSecond, getMoneyMultiplier, performRebirth,
  equipPet, unequipPet, autoEquipBest, timeRemainingMs, tickEnvironmentalMutations, tickWeatherMutations,
  tickHugeAbilities, effectiveMoneyPerSec,
  enableAdminMode, adminInstantHatch, adminGrantRandomHugePet, adminAddCoins,
  serializePetForTrade, serializeEggForTrade, removeOwnOfferFromState, addIncomingOfferToState,
};
