import { EGGS, PETS, RARITY_INDEX, getRarity, formatNumber, formatDuration } from "./data.js";
import { getOrRotateShop, buyEgg, msUntilNextRotation, ROTATION_MS } from "./shop.js";
import {
  EGG_BY_ID, PET_BY_ID, loadPlayer, savePlayer, resetPlayer, startHatching,
  tickHatching, isHatchingFinished, hatchEgg, accrueMoney, totalMoneyPerSecond, equipPet, unequipPet,
  autoEquipBest, timeRemainingMs,
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
    schnee: "https://static.wikia.nocookie.net/pet-simulator/images/d/df/PS99_Snow_Egg.png",
    obsidian: "https://static.wikia.nocookie.net/pet-simulator/images/c/cf/PS99_Obsidian_Egg.png",
    knochen: "https://static.wikia.nocookie.net/pet-simulator/images/5/58/PS99_Bone_Egg.png",
    hoellen: "https://static.wikia.nocookie.net/pet-simulator/images/b/bc/PS99_Hell_Egg.png",
    metall: "https://static.wikia.nocookie.net/pet-simulator/images/4/4d/PS99_Metal_Egg.png",
    regenbogen: "https://static.wikia.nocookie.net/pet-simulator/images/9/9f/PS99_Colorful_Egg.png",
    runen: "https://static.wikia.nocookie.net/pet-simulator/images/3/3c/PS99_Runic_Egg.png",
    schatten: "https://static.wikia.nocookie.net/pet-simulator/images/5/59/PS99_Eerie_Egg.png",
    empyreum: "https://static.wikia.nocookie.net/pet-simulator/images/e/e6/PS99_Empyrean_Egg.png",
    mosaik: "https://static.wikia.nocookie.net/pet-simulator/images/2/2c/PS99_Colorful_Mosaic_Egg.png",
  },
  pets: {
    fuchs: "https://static.wikia.nocookie.net/pets-go/images/7/73/Fox.png",
    kuh: "https://static.wikia.nocookie.net/pets-go/images/8/84/Cow.png",
    baer: "https://static.wikia.nocookie.net/pets-go/images/a/a4/Bear.png",
    elefant: "https://static.wikia.nocookie.net/pets-go/images/6/60/Elephant.png",
    hase: "https://static.wikia.nocookie.net/pets-go/images/8/82/Bunny.png",
    hund: "https://static.wikia.nocookie.net/pets-go/images/3/35/Dog.png",
    biene: "https://static.wikia.nocookie.net/pets-go/images/5/56/Bee.png",
    katze: "https://static.wikia.nocookie.net/pets-go/images/0/05/Cat.png",
    kosmosdrache: "https://static.wikia.nocookie.net/pets-go/images/3/3e/Cosmic_Dragon.png",
    loewe: "https://static.wikia.nocookie.net/pets-go/images/4/47/Lion.png",
    delfin: "https://static.wikia.nocookie.net/pets-go/images/0/0b/Dolphin.png",
    tiger: "https://static.wikia.nocookie.net/pets-go/images/a/ae/Tiger.png",
    hai: "https://static.wikia.nocookie.net/pets-go/images/1/14/Shark.png",
    greif: "https://static.wikia.nocookie.net/pets-go/images/f/f8/Griffin.png",
    drache: "https://static.wikia.nocookie.net/pets-go/images/c/c7/Dragon.png",
    einhorn: "https://static.wikia.nocookie.net/pets-go/images/7/7e/Unicorn.png",
  },
};

const COIN_ICON_URL = "https://static.wikia.nocookie.net/pet-simulator/images/b/b2/PS99_-_Coin.png";
const coinIcon = () => `<img src="${COIN_ICON_URL}" alt="Münzen" class="coin-icon">`;

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

$("#reset-btn").addEventListener("click", () => {
  if (!confirm("Spielstand wirklich löschen und neu anfangen?")) return;
  resetPlayer();
  location.reload();
});

// ---------------------------------------------------------------------------
// Spielzustand & Haupt-Loop
// ---------------------------------------------------------------------------
let state = null;
let shop = null;

bootGame();

function bootGame() {
  state = loadPlayer();
  const offlineElapsedMs = Math.max(0, Date.now() - state.lastActiveMs);
  tickHatching(state, offlineElapsedMs, 1); // Offline brüten Eier mit normaler Geschwindigkeit
  const earned = accrueMoney(state); // rechnet Offline-Geld ab
  savePlayer(state);

  if (earned > 1) {
    toast(`Willkommen zurück! +${formatNumber(earned)} Münzen verdient, während du weg warst.`);
  }

  refreshShop();
  renderAll();

  // Live-Ticker: alle 0.33s Brütefortschritt & Geld gutschreiben, Anzeige aktualisieren.
  // Solange aktiv gespielt wird, brüten Eier mit 3-facher Geschwindigkeit.
  setInterval(() => {
    tickHatching(state, 333, 3);
    accrueMoney(state);
    renderAll();
  }, 333);

  // Alle 5s speichern, damit bei Tab schließen nicht zu viel Fortschritt fehlt
  setInterval(() => savePlayer(state), 5000);
  window.addEventListener("beforeunload", () => savePlayer(state));

  // Shop alle 15s auf Rotation prüfen (leichtgewichtig)
  setInterval(refreshShop, 15000);
}

function refreshShop() {
  shop = getOrRotateShop();
  renderShop();
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 4000);
}

function revealTierClass(rarityId) {
  const idx = RARITY_INDEX[rarityId] ?? 0;
  if (idx <= 1) return "tier-common";
  if (idx <= 3) return "tier-rare";
  if (idx <= 5) return "tier-epic";
  return "tier-legendary";
}

function playHatchReveal(result) {
  const { pet, instance } = result;
  const rarity = getRarity(pet.rarity);
  const overlay = $("#reveal-overlay");

  overlay.className = `reveal-overlay ${revealTierClass(pet.rarity)}`;

  const artHost = $("#reveal-art");
  artHost.innerHTML = "";
  artHost.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color));

  const rarityEl = $("#reveal-rarity");
  rarityEl.textContent = rarity.name;
  rarityEl.style.background = rarity.color;
  $("#reveal-name").textContent = pet.name;
  $("#reveal-stats").innerHTML = `
    ⚖️ ${instance.weightKg < 1 ? (instance.weightKg * 1000).toFixed(1) + "g" : formatNumber(instance.weightKg) + "kg"}
    (${instance.ratio.toFixed(2)}x) · ${coinIcon()} ${formatNumber(instance.moneyPerSec)}/s
  `;

  return new Promise((resolve) => {
    const closeBtn = $("#reveal-close");
    const onClose = () => {
      overlay.classList.add("hidden");
      closeBtn.removeEventListener("click", onClose);
      resolve();
    };
    closeBtn.addEventListener("click", onClose);
  });
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
  $("#coins-display").innerHTML = `${coinIcon()} ${formatNumber(state.coins)}`;
  $("#income-display").innerHTML = `${coinIcon()} ${formatNumber(totalMoneyPerSecond(state))}/s`;
  $("#slots-display").textContent = `${state.equipped.length}/${state.equipSlots} Plätze belegt`;
}

function renderShop() {
  const grid = $("#shop-grid");
  grid.innerHTML = "";
  const eggsInStock = EGGS.filter((egg) => (shop.stock?.[egg.id] || 0) > 0);
  if (eggsInStock.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Gerade keine Eier im Angebot. Warte auf die nächste Rotation!</div>`;
  }
  for (const egg of eggsInStock) {
    const stock = shop.stock[egg.id];
    const rarity = getRarity(egg.rarity);
    const card = document.createElement("div");
    card.className = "card egg-card";
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
      <div class="card-stat">📦 Lager: ${stock}</div>
    `;
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.innerHTML = `Kaufen · ${coinIcon()} ${formatNumber(egg.basePrice)}`;
    btn.disabled = state.coins < egg.basePrice;
    btn.addEventListener("click", () => handleBuy(egg));
    card.appendChild(btn);

    grid.appendChild(card);
  }

  const rotationEl = $("#shop-rotation");
  const remaining = msUntilNextRotation(shop.rotatedAtMs);
  rotationEl.textContent = `Nächste Rotation in ${formatDuration(remaining / 1000)}`;
}

function handleBuy(egg) {
  if (state.coins < egg.basePrice) { toast("Nicht genug Münzen."); return; }
  try {
    buyEgg(egg.id);
  } catch (err) {
    toast(err.message || "Kauf fehlgeschlagen.");
    refreshShop();
    return;
  }
  state.coins -= egg.basePrice;
  startHatching(state, egg.id);
  savePlayer(state);
  renderAll();
  refreshShop();
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
        savePlayer(state);
        renderAll();
        await playHatchReveal(result);
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
      <div class="card-stat">${coinIcon()} ${formatNumber(inst.moneyPerSec)}/s</div>
    `;
    card.appendChild(info);
    const btn = document.createElement("button");
    btn.className = "buy-btn" + (equipped ? " unequip" : "");
    btn.textContent = equipped ? "Ablegen" : "Ausrüsten";
    btn.addEventListener("click", () => {
      try {
        if (equipped) unequipPet(state, inst.instanceId);
        else equipPet(state, inst.instanceId);
        savePlayer(state);
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
        <div class="card-stat">${coinIcon()} Basis: ${formatNumber(pet.baseMoney)}/s</div>
      `;
    } else {
      info.innerHTML = `<div class="card-name">???</div>`;
    }
    card.appendChild(info);
    petGrid.appendChild(card);
  }
}

$("#auto-equip-btn").addEventListener("click", () => {
  autoEquipBest(state);
  savePlayer(state);
  renderAll();
  toast("Die stärksten Tiere sind jetzt ausgerüstet!");
});

// Nav zwischen Tabs (Shop / Brüten / Tiere)
$$(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab-btn").forEach((b) => b.classList.remove("active"));
    $$(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`#panel-${btn.dataset.tab}`).classList.add("active");
  });
});
