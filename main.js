import {
  auth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "./firebase.js";
import { EGGS, PETS, getRarity, formatNumber, formatDuration } from "./data.js";
import { getOrRotateShop, buyEgg, msUntilNextRotation, ROTATION_MS } from "./shop.js";
import {
  EGG_BY_ID, PET_BY_ID, loadPlayer, savePlayer, startHatching,
  isHatchingFinished, hatchEgg, accrueMoney, totalMoneyPerSecond, equipPet, unequipPet,
  timeRemainingMs,
} from "./game.js";

// ---------------------------------------------------------------------------
// Kleine DOM-Helfer
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ASSET_OVERRIDES = {
  eggs: {
    standard: "https://static.wikia.nocookie.net/pet-simulator/images/5/58/PS99_Cracked_Egg.png",
    holz: "https://static.wikia.nocookie.net/pet-simulator/images/0/04/PS99_Wood_Egg.png",
    getupft: "https://static.wikia.nocookie.net/pet-simulator/images/2/24/PS99_Spotted_Egg.png",
    stein: "https://static.wikia.nocookie.net/pet-simulator/images/0/0c/PS99_Rock_Egg.png",
    keimling: "https://static.wikia.nocookie.net/pet-simulator/images/d/d2/PS99_Sprout_Egg.png",
    sonnen: "https://static.wikia.nocookie.net/pet-simulator/images/d/d8/PS99_Sunny_Egg.png",
    piraten: "https://static.wikia.nocookie.net/pet-simulator/images/0/05/PS99_Pirate_Egg.png",
    dschungel: "https://static.wikia.nocookie.net/pet-simulator/images/a/ab/PS99_Jungle_Egg.png",
    aegyptisch: "https://static.wikia.nocookie.net/pet-simulator/images/a/a7/PS99_Egyptian_Egg.png",
    fossil: "https://static.wikia.nocookie.net/pet-simulator/images/1/17/PS99_Fossil_Egg.png",
  },
  pets: {
    fuchs: "https://static.wikia.nocookie.net/pets-go/images/7/73/Fox.png",
    kuh: "https://static.wikia.nocookie.net/pets-go/images/8/84/Cow.png",
    baer: "https://static.wikia.nocookie.net/pets-go/images/a/a4/Bear.png",
    elefant: "https://static.wikia.nocookie.net/pets-go/images/6/60/Elephant.png",
    hase: "https://static.wikia.nocookie.net/pets-go/images/8/82/Bunny.png",
  },
};

function assetSrc(kind, id) {
  const override = ASSET_OVERRIDES[kind]?.[id];
  if (override) return override;
  // Später: echte Bilder einfach unter /assets/{kind}/{id}.png ablegen –
  // wird automatisch verwendet, sobald die Datei existiert.
  return `assets/${kind}/${id}.png`;
}

function renderPlaceholderIcon(container, label, rarityColor, locked = false) {
  container.innerHTML = "";
  const el = document.createElement("div");
  el.className = "placeholder-icon" + (locked ? " locked" : "");
  el.style.background = locked ? "#000" : rarityColor;
  el.textContent = locked ? "" : label.slice(0, 2).toUpperCase();
  container.appendChild(el);
}

function createArtEl(kind, id, label, rarityColor, locked = false) {
  const wrap = document.createElement("div");
  wrap.className = "art" + (locked ? " locked" : "");
  const img = document.createElement("img");
  img.alt = locked ? "???" : label;
  img.src = assetSrc(kind, id);
  img.onerror = () => renderPlaceholderIcon(wrap, label, rarityColor, locked);
  wrap.appendChild(img);
  return wrap;
}

// ---------------------------------------------------------------------------
// Auth-UI
// ---------------------------------------------------------------------------
const authScreen = $("#auth-screen");
const gameScreen = $("#game-screen");
const authForm = $("#auth-form");
const authError = $("#auth-error");
const authTitle = $("#auth-title");
const authSubmitBtn = $("#auth-submit");
const authToggleBtn = $("#auth-toggle");
let authMode = "login"; // oder "register"

authToggleBtn.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  authTitle.textContent = authMode === "login" ? "Anmelden" : "Konto erstellen";
  authSubmitBtn.textContent = authMode === "login" ? "Anmelden" : "Konto erstellen";
  authToggleBtn.textContent = authMode === "login"
    ? "Noch kein Konto? Registrieren"
    : "Schon ein Konto? Anmelden";
  authError.textContent = "";
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;
  authSubmitBtn.disabled = true;
  try {
    if (authMode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      if (password.length < 6) throw { code: "custom/short-password" };
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = translateAuthError(err.code);
  } finally {
    authSubmitBtn.disabled = false;
  }
});

function translateAuthError(code) {
  const map = {
    "auth/invalid-email": "Ungültige E-Mail-Adresse.",
    "auth/user-not-found": "Kein Konto mit dieser E-Mail gefunden.",
    "auth/wrong-password": "Falsches Passwort.",
    "auth/invalid-credential": "E-Mail oder Passwort ist falsch.",
    "auth/email-already-in-use": "Diese E-Mail wird schon verwendet.",
    "auth/weak-password": "Das Passwort muss mindestens 6 Zeichen haben.",
    "custom/short-password": "Das Passwort muss mindestens 6 Zeichen haben.",
  };
  return map[code] || "Etwas ist schiefgelaufen. Versuch es nochmal.";
}

$("#logout-btn").addEventListener("click", () => signOut(auth));

// ---------------------------------------------------------------------------
// Spielzustand & Haupt-Loop
// ---------------------------------------------------------------------------
let uid = null;
let state = null;
let shop = null;
let saveTimer = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    uid = user.uid;
    authScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    await bootGame();
  } else {
    uid = null;
    state = null;
    if (saveTimer) clearInterval(saveTimer);
    gameScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});

async function bootGame() {
  state = await loadPlayer(uid);
  const earned = accrueMoney(state); // rechnet Offline-Geld ab
  await savePlayer(uid, state);

  if (earned > 1) {
    toast(`Willkommen zurück! +${formatNumber(earned)} Münzen verdient, während du weg warst.`);
  }

  await refreshShop();
  renderAll();

  // Live-Ticker: einmal pro Sekunde Geld gutschreiben & Anzeige aktualisieren
  setInterval(() => {
    if (!state) return;
    accrueMoney(state);
    renderAll();
  }, 1000);

  // Alle 5s speichern, damit bei Tab schließen nicht zu viel Fortschritt fehlt
  saveTimer = setInterval(() => { if (state) savePlayer(uid, state); }, 5000);
  window.addEventListener("beforeunload", () => { if (state) savePlayer(uid, state); });

  // Shop alle 15s auf Rotation prüfen (leichtgewichtig)
  setInterval(refreshShop, 15000);
}

async function refreshShop() {
  shop = await getOrRotateShop();
  renderShop();
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 4000);
}

function showHatchSummary(hatched) {
  toast(`Geschlüpft: ${hatched.pet.name} (${getRarity(hatched.pet.rarity).name}, ${hatched.instance.ratio.toFixed(2)}x)`);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderAll() {
  renderTopBar();
  renderHatchery();
  renderInventory();
  renderIndex();
}

function renderTopBar() {
  $("#coins-display").textContent = formatNumber(state.coins) + " Münzen";
  $("#income-display").textContent = formatNumber(totalMoneyPerSecond(state)) + "/s";
  $("#slots-display").textContent = `${state.equipped.length}/${state.equipSlots} Plätze belegt`;
}

function renderShop() {
  const grid = $("#shop-grid");
  grid.innerHTML = "";
  for (const egg of EGGS) {
    const stock = shop.stock?.[egg.id] || 0;
    const rarity = getRarity(egg.rarity);
    const card = document.createElement("div");
    card.className = "card egg-card" + (stock <= 0 ? " sold-out" : "");
    card.style.setProperty("--rarity-color", rarity.color.startsWith("linear") ? "#888" : rarity.color);
    if (rarity.color.startsWith("linear")) card.style.borderImage = "";

    const art = createArtEl("eggs", egg.id, egg.name, rarity.color);
    card.appendChild(art);

    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${egg.name}</div>
      <div class="card-rarity" style="background:${rarity.color}">${rarity.name}</div>
      <div class="card-stat">🍀 ${formatNumber(egg.luckPercent)}% Glück</div>
      <div class="card-stat">⏱ ${formatDuration(egg.hatchSeconds)}</div>
      <div class="card-stat">⚖️ ~${egg.weightMultiplier}x Gewicht</div>
      <div class="card-stat">📦 Lager: ${stock}</div>
    `;
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.textContent = `Kaufen · ${formatNumber(egg.basePrice)}`;
    btn.disabled = stock <= 0 || state.coins < egg.basePrice;
    btn.addEventListener("click", () => handleBuy(egg));
    card.appendChild(btn);

    grid.appendChild(card);
  }

  const rotationEl = $("#shop-rotation");
  const remaining = msUntilNextRotation(shop.rotatedAtMs);
  rotationEl.textContent = `Nächste Rotation in ${formatDuration(remaining / 1000)}`;
}

async function handleBuy(egg) {
  if (state.coins < egg.basePrice) { toast("Nicht genug Münzen."); return; }
  try {
    await buyEgg(egg.id);
  } catch (err) {
    toast(err.message || "Kauf fehlgeschlagen.");
    await refreshShop();
    return;
  }
  state.coins -= egg.basePrice;
  startHatching(state, egg.id);
  await savePlayer(uid, state);
  renderAll();
  await refreshShop();
  toast(`${egg.name} gekauft – es brütet jetzt!`);
}

function renderHatchery() {
  const grid = $("#hatchery-grid");
  grid.innerHTML = "";
  if (state.hatching.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Keine Eier am Brüten. Kauf welche im Shop!</div>`;
    return;
  }
  for (const h of state.hatching) {
    const egg = EGG_BY_ID[h.eggId];
    const rarity = getRarity(egg.rarity);
    const card = document.createElement("div");
    card.className = "card hatch-card";
    const art = createArtEl("eggs", egg.id, egg.name, rarity.color);
    card.appendChild(art);
    const remaining = timeRemainingMs(h);
    const finished = isHatchingFinished(h);
    const pct = Math.min(100, 100 * (1 - remaining / h.durationMs));
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${egg.name}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="card-stat">${finished ? "Fertig!" : formatDuration(remaining / 1000) + " übrig"}</div>
    `;
    card.appendChild(info);

    if (finished) {
      const btn = document.createElement("button");
      btn.className = "buy-btn";
      btn.textContent = "Ausbrüten";
      btn.addEventListener("click", async () => {
        let result;
        try {
          result = hatchEgg(state, h.instanceId);
        } catch (err) {
          toast(err.message);
          return;
        }
        await savePlayer(uid, state);
        showHatchSummary(result);
        renderAll();
      });
      card.appendChild(btn);
    }

    grid.appendChild(card);
  }
}

function renderInventory() {
  const grid = $("#inventory-grid");
  grid.innerHTML = "";
  if (state.pets.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Noch keine Tiere. Brüte dein erstes Ei aus!</div>`;
    return;
  }
  const sorted = [...state.pets].sort((a, b) => b.moneyPerSec - a.moneyPerSec);
  for (const inst of sorted) {
    const pet = PET_BY_ID[inst.petId];
    const rarity = getRarity(pet.rarity);
    const equipped = state.equipped.includes(inst.instanceId);
    const card = document.createElement("div");
    card.className = "card pet-card" + (equipped ? " equipped" : "");
    const art = createArtEl("pets", pet.id, pet.name, rarity.color);
    card.appendChild(art);
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${pet.name}</div>
      <div class="card-rarity" style="background:${rarity.color}">${rarity.name}</div>
      <div class="card-stat">⚖️ ${inst.weightKg < 1 ? (inst.weightKg * 1000).toFixed(1) + "g" : formatNumber(inst.weightKg) + "kg"} (${inst.ratio.toFixed(2)}x)</div>
      <div class="card-stat">💰 ${formatNumber(inst.moneyPerSec)}/s</div>
    `;
    card.appendChild(info);
    const btn = document.createElement("button");
    btn.className = "buy-btn" + (equipped ? " unequip" : "");
    btn.textContent = equipped ? "Ablegen" : "Ausrüsten";
    btn.addEventListener("click", async () => {
      try {
        if (equipped) unequipPet(state, inst.instanceId);
        else equipPet(state, inst.instanceId);
        await savePlayer(uid, state);
        renderAll();
      } catch (err) {
        toast(err.message);
      }
    });
    card.appendChild(btn);
    grid.appendChild(card);
  }
}

function renderIndex() {
  const knownPetIds = new Set(state.pets.map((p) => p.petId));
  const knownEggIds = new Set(state.seenEggs || []);

  const eggGrid = $("#index-eggs-grid");
  eggGrid.innerHTML = "";
  for (const egg of EGGS) {
    const discovered = knownEggIds.has(egg.id);
    const rarity = getRarity(egg.rarity);
    const card = document.createElement("div");
    card.className = "card" + (discovered ? "" : " locked");
    if (discovered) {
      card.style.setProperty("--rarity-color", rarity.color.startsWith("linear") ? "#888" : rarity.color);
    }
    card.appendChild(createArtEl("eggs", egg.id, egg.name, rarity.color, !discovered));

    const info = document.createElement("div");
    info.className = "card-info";
    if (discovered) {
      info.innerHTML = `
        <div class="card-name">${egg.name}</div>
        <div class="card-rarity" style="background:${rarity.color}">${rarity.name}</div>
        <div class="card-stat">🍀 ${formatNumber(egg.luckPercent)}% Glück</div>
        <div class="card-stat">⏱ ${formatDuration(egg.hatchSeconds)}</div>
        <div class="card-stat">⚖️ ~${egg.weightMultiplier}x Gewicht</div>
      `;
    } else {
      info.innerHTML = `<div class="card-name">???</div>`;
    }
    card.appendChild(info);
    eggGrid.appendChild(card);
  }

  const petGrid = $("#index-pets-grid");
  petGrid.innerHTML = "";
  for (const pet of PETS) {
    const discovered = knownPetIds.has(pet.id);
    const rarity = getRarity(pet.rarity);
    const card = document.createElement("div");
    card.className = "card" + (discovered ? "" : " locked");
    if (discovered) {
      card.style.setProperty("--rarity-color", rarity.color.startsWith("linear") ? "#888" : rarity.color);
    }
    card.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color, !discovered));

    const info = document.createElement("div");
    info.className = "card-info";
    if (discovered) {
      info.innerHTML = `
        <div class="card-name">${pet.name}</div>
        <div class="card-rarity" style="background:${rarity.color}">${rarity.name}</div>
        <div class="card-stat">⚖️ Basis: ${pet.baseWeightKg < 1 ? (pet.baseWeightKg * 1000).toFixed(1) + "g" : formatNumber(pet.baseWeightKg) + "kg"}</div>
        <div class="card-stat">💰 Basis: ${formatNumber(pet.baseMoney)}/s</div>
      `;
    } else {
      info.innerHTML = `<div class="card-name">???</div>`;
    }
    card.appendChild(info);
    petGrid.appendChild(card);
  }
}

// Nav zwischen Tabs (Shop / Brüten / Tiere)
$$(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab-btn").forEach((b) => b.classList.remove("active"));
    $$(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`#panel-${btn.dataset.tab}`).classList.add("active");
  });
});
