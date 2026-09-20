import { EGGS, PETS, REBIRTHS, RARITY_INDEX, getRarity, formatNumber, formatDuration } from "./data.js";
import { getOrRotateShop, buyEgg, msUntilNextRotation, ROTATION_MS } from "./shop.js";
import {
  EGG_BY_ID, PET_BY_ID, loadPlayer, savePlayer, resetPlayer, startHatching,
  tickHatching, isHatchingFinished, hatchEgg, accrueMoney, totalMoneyPerSecond, getMoneyMultiplier,
  performRebirth, equipPet, unequipPet, autoEquipBest, timeRemainingMs,
} from "./game.js";
import { getOrCreatePlayerId, getPlayerName, setPlayerName, submitScore, fetchLeaderboard } from "./leaderboard.js";

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
    spike: "https://static.wikia.nocookie.net/pet-simulator/images/5/54/PS99_Spike_Egg.png",
    bonsai: "https://static.wikia.nocookie.net/pet-simulator/images/5/5f/PS99_Bonsai_Egg.png",
    gekroent: "https://static.wikia.nocookie.net/pet-simulator/images/2/2a/PS99_Crowned_Egg.png",
    schatz: "https://static.wikia.nocookie.net/pet-simulator/images/b/b4/PS99_Treasure_Egg.png",
    verlies: "https://static.wikia.nocookie.net/pet-simulator/images/e/e9/PS99_Dungeon_Egg.png",
    koeniglich: "https://static.wikia.nocookie.net/pet-simulator/images/2/2c/PS99_Royal_Egg.png",
    nebel: "https://static.wikia.nocookie.net/pet-simulator/images/8/83/PS99_Angel_Egg.png",
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
    empyreumloewe: "https://static.wikia.nocookie.net/pets-go/images/6/69/Empyrean_Lion.png",
    schattendominus: "https://static.wikia.nocookie.net/pets-go/images/1/1c/Shadow_Dominus.png",
    wyvern: "https://static.wikia.nocookie.net/pets-go/images/e/e3/Wyvern_of_Hades.png",
    tikidominus: "https://static.wikia.nocookie.net/pets-go/images/6/6d/Tiki_Dominus.png",
    a36: "https://static.wikia.nocookie.net/pets-go/images/5/5b/A-36.png",
    pegasus: "https://static.wikia.nocookie.net/pets-go/images/4/4a/Pegasus.png",
    phoenix: "https://static.wikia.nocookie.net/pets-go/images/c/c1/Phoenix.png",
    sphinx: "https://static.wikia.nocookie.net/pets-go/images/0/0e/Sphinx.png",
    narwal: "https://static.wikia.nocookie.net/pets-go/images/e/ed/Narwhal.png",
    kitsune: "https://static.wikia.nocookie.net/pets-go/images/4/41/Kitsune_Fox.png",
    diamanthase: "https://static.wikia.nocookie.net/pets-go/images/e/e2/Diamond_Bunny.png",
    hydra: "https://static.wikia.nocookie.net/pets-go/images/9/9d/Hydra.png",
    engelhund: "https://static.wikia.nocookie.net/pets-go/images/c/ce/Angel_Dog.png",
    kraken: "https://static.wikia.nocookie.net/pets-go/images/d/d3/Kraken.png",
    pferd: "https://static.wikia.nocookie.net/pets-go/images/c/c3/Horse.png",
    giraffe: "https://static.wikia.nocookie.net/pets-go/images/6/60/Giraffe.png",
    fee: "https://static.wikia.nocookie.net/pets-go/images/4/43/Fairy.png",
    hoellenhund: "https://static.wikia.nocookie.net/pets-go/images/3/3e/Hellhound.png",
    kristallhirsch: "https://static.wikia.nocookie.net/pets-go/images/a/ab/Crystal_Deer.png",
    kometenpony: "https://static.wikia.nocookie.net/pets-go/images/b/b0/Comet_Pony.png",
    phantomwolf: "https://static.wikia.nocookie.net/pets-go/images/f/f0/Phantom_Wolf.png",
    daemon: "https://static.wikia.nocookie.net/pets-go/images/c/c4/Demon.png",
    eisigerphoenix: "https://static.wikia.nocookie.net/pets-go/images/7/7c/Icy_Phoenix.png",
    glitchdrache: "https://static.wikia.nocookie.net/pets-go/images/f/f6/Glitched_Dragon.png",
    schattenhai: "https://static.wikia.nocookie.net/pets-go/images/7/77/Shadow_Shark.png",
    gepard: "https://static.wikia.nocookie.net/pets-go/images/9/9e/Cheetah.png",
    diamantkatze: "https://static.wikia.nocookie.net/pets-go/images/a/a5/Diamond_Cat.png",
    minenroboter: "https://static.wikia.nocookie.net/pets-go/images/4/4f/Mining_Robot.png",
    tiefseedelfin: "https://static.wikia.nocookie.net/pets-go/images/9/99/Abyssal_Dolphin.png",
    reliktdrache: "https://static.wikia.nocookie.net/pets-go/images/b/b0/Relic_Dragon.png",
    sturmdrache: "https://static.wikia.nocookie.net/pets-go/images/a/a7/Storm_Dragon.png",
    runenqual: "https://static.wikia.nocookie.net/pets-go/images/e/e8/Runic_Agony.png",
  },
};

const COIN_ICON_URL = "https://static.wikia.nocookie.net/pet-simulator/images/b/b2/PS99_-_Coin.png";
const coinIcon = () => `<img src="${COIN_ICON_URL}" alt="Münzen" class="coin-icon">`;
const GOLD_BAR_ICON_URL = "https://static.wikia.nocookie.net/pet-simulator/images/e/e8/PS99_-_Gold_Bar.png";

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

// Stabiler Zeitversatz für die Schwenk-Animation, damit Karten beim
// wiederholten Rendern (z.B. Brüt-Fortschritt) nicht neu ausgerichtet
// werden und die Animation dadurch ruckelt.
function swayDelayFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `-${((hash % 320) / 100).toFixed(2)}s`;
}

function createArtEl(kind, id, label, rarityColor, locked = false, dimmed = false) {
  const wrap = document.createElement("div");
  wrap.className = "art" + (locked ? " locked" : "") + (dimmed ? " dimmed" : "");
  wrap.style.setProperty("--sway-delay", swayDelayFor(id));
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
// Merkt sich die zuletzt gerenderten Brüt-Karten pro Ei-Instanz, damit der
// schnelle Live-Ticker nur noch Zahlen/Balken aktualisiert statt die
// komplette Karte (inkl. Bild) neu zu erzeugen – sonst würde die
// Schwenk-Animation bei jedem Tick neu starten und ruckeln.
let hatcheryCardRefs = new Map();
let cachedLeaderboard = [];
// Tiere/Eier werden bei vielen Einträgen seitenweise gerendert, damit die
// Seite bei einer großen Sammlung nicht komplett zäh wird.
const PAGE_SIZE = 50;
let inventoryPage = 0;
let hatcheryPage = 0;
let inventorySort = "money";
const INVENTORY_SORTERS = {
  money: (a, b) => b.moneyPerSec - a.moneyPerSec,
  rarity: (a, b) => RARITY_INDEX[PET_BY_ID[b.petId].rarity] - RARITY_INDEX[PET_BY_ID[a.petId].rarity],
  weight: (a, b) => b.weightKg - a.weightKg,
};

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
    // Nur die zeitabhängigen Anzeigen aktualisieren (Münzen, Brüt-Fortschritt).
    // Tiere/Index nicht neu rendern, sonst rucken CSS-Animationen dort bei
    // jedem Tick, weil ihre DOM-Elemente ständig neu erzeugt würden.
    renderTopBar();
    renderHatchery();
    updateShopRotationText();
  }, 333);

  // Alle 5s speichern, damit bei Tab schließen nicht zu viel Fortschritt fehlt
  setInterval(() => savePlayer(state), 5000);
  window.addEventListener("beforeunload", () => savePlayer(state));

  // Shop alle 15s auf Rotation prüfen (leichtgewichtig)
  setInterval(refreshShop, 15000);

  // Online-Rangliste: beim Login und danach alle 2 Minuten für alle aktualisieren.
  refreshLeaderboard();
  setInterval(refreshLeaderboard, 2 * 60 * 1000);
}

function refreshShop() {
  shop = getOrRotateShop();
  renderShop();
}

function toast(msg, type = "success") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast-" + type;
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

// Anzahl + Farben der Partikel für den Reveal-Effekt je Seltenheits-Stufe.
const PARTICLE_CONFIG = {
  "tier-common": { count: 0, colors: [] },
  "tier-rare": { count: 0, colors: [] },
  "tier-epic": { count: 16, colors: ["#e1bee7", "#ce93d8", "#ffffff"] },
  "tier-legendary": { count: 26, colors: ["#ffe082", "#ffb703", "#ffffff"] },
};

function spawnRevealParticles(tierClass) {
  const host = $("#reveal-particles");
  host.innerHTML = "";
  const config = PARTICLE_CONFIG[tierClass] || PARTICLE_CONFIG["tier-common"];
  for (let i = 0; i < config.count; i++) {
    const particle = document.createElement("div");
    particle.className = "reveal-particle";
    const angle = (360 / config.count) * i + (Math.random() * 12 - 6);
    const distance = 90 + Math.random() * 70;
    particle.style.setProperty("--angle", `${angle}deg`);
    particle.style.setProperty("--distance", `${distance}px`);
    particle.style.setProperty("--particle-delay", `${Math.random() * 0.15}s`);
    particle.style.setProperty("--particle-color", config.colors[i % config.colors.length]);
    host.appendChild(particle);
  }
}

function playHatchReveal(result) {
  const { pet, instance } = result;
  const rarity = getRarity(pet.rarity);
  const overlay = $("#reveal-overlay");
  const tierClass = revealTierClass(pet.rarity);

  overlay.className = `reveal-overlay ${tierClass}`;
  spawnRevealParticles(tierClass);

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
  renderRebirth();
  renderLeaderboard();
}

function renderTopBar() {
  $("#coins-display").innerHTML = `${coinIcon()} ${formatNumber(state.coins)}`;
  $("#income-display").innerHTML = `${coinIcon()} ${formatNumber(totalMoneyPerSecond(state))}/s`;
  $("#slots-display").textContent = `${state.equipped.length}/${state.equipSlots} Plätze belegt`;
  $("#rebirth-display").textContent = `R${state.rebirth} · ×${getMoneyMultiplier(state)}`;
}

function renderShop() {
  const grid = $("#shop-grid");
  grid.innerHTML = "";
  const rolledStock = shop.rolledStock || shop.stock; // Fallback für alte Shop-Daten ohne rolledStock
  const eggsInRotation = EGGS.filter((egg) => (rolledStock?.[egg.id] || 0) > 0);
  if (eggsInRotation.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Gerade keine Eier im Angebot. Warte auf die nächste Rotation!</div>`;
  }
  for (const egg of eggsInRotation) {
    const stock = shop.stock?.[egg.id] || 0;
    const soldOut = stock <= 0;
    const rarity = getRarity(egg.rarity);
    const card = document.createElement("div");
    card.className = "card egg-card" + (soldOut ? " sold-out" : "");
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
      <div class="card-stat">📦 Lager: ${soldOut ? "Ausverkauft" : stock}</div>
    `;
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.innerHTML = soldOut ? "Ausverkauft" : `Kaufen · ${coinIcon()} ${formatNumber(egg.basePrice)}`;
    btn.disabled = soldOut || state.coins < egg.basePrice;
    btn.addEventListener("click", () => handleBuy(egg));
    card.appendChild(btn);

    grid.appendChild(card);
  }

  updateShopRotationText();
}

function updateShopRotationText() {
  if (!shop) return;
  const remaining = msUntilNextRotation(shop.rotatedAtMs);
  $("#shop-rotation").textContent = `Nächste Rotation in ${formatDuration(remaining / 1000)}`;
}

function handleBuy(egg) {
  if (state.coins < egg.basePrice) { toast("Nicht genug Münzen.", "error"); return; }
  try {
    buyEgg(egg.id);
  } catch (err) {
    toast(err.message || "Kauf fehlgeschlagen.", "error");
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

async function hatchAndReveal(instanceId) {
  let result;
  try {
    result = hatchEgg(state, instanceId);
  } catch (err) {
    toast(err.message, "error");
    return;
  }
  savePlayer(state);
  renderAll();
  await playHatchReveal(result);
}

// Rendert Zurück/Weiter-Buttons + Seitenanzeige; onChange(neueSeite) wird
// beim Klick aufgerufen. Bei nur einer Seite wird nichts angezeigt.
function renderPaginationControls(containerId, page, totalPages, onChange) {
  const el = $("#" + containerId);
  el.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.className = "action-btn";
  prev.textContent = "← Zurück";
  prev.disabled = page <= 0;
  prev.addEventListener("click", () => onChange(page - 1));
  el.appendChild(prev);

  const info = document.createElement("span");
  info.className = "pagination-info";
  info.textContent = `Seite ${page + 1} / ${totalPages}`;
  el.appendChild(info);

  const next = document.createElement("button");
  next.className = "action-btn";
  next.textContent = "Weiter →";
  next.disabled = page >= totalPages - 1;
  next.addEventListener("click", () => onChange(page + 1));
  el.appendChild(next);
}

function renderHatchery() {
  const grid = $("#hatchery-grid");
  const finishedCount = state.hatching.filter(isHatchingFinished).length;
  $("#hatch-all-btn").disabled = finishedCount === 0;

  if (state.hatching.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Keine Eier am Brüten. Kauf welche im Shop!</div>`;
    hatcheryCardRefs = new Map();
    renderPaginationControls("hatchery-pagination", 0, 0, () => {});
    return;
  }

  const sortedAll = [...state.hatching].sort((a, b) => a.remainingMs - b.remainingMs);
  const totalPages = Math.max(1, Math.ceil(sortedAll.length / PAGE_SIZE));
  hatcheryPage = Math.min(hatcheryPage, totalPages - 1);
  const sorted = sortedAll.slice(hatcheryPage * PAGE_SIZE, (hatcheryPage + 1) * PAGE_SIZE);

  const sameOrder = sorted.length === hatcheryCardRefs.size
    && sorted.every((h) => hatcheryCardRefs.has(h.instanceId))
    && [...hatcheryCardRefs.keys()].every((id, i) => sorted[i].instanceId === id);

  if (!sameOrder) {
    grid.innerHTML = "";
    hatcheryCardRefs = new Map();
    for (const h of sorted) {
      const egg = EGG_BY_ID[h.eggId];
      const rarity = getRarity(egg.rarity);
      const card = document.createElement("div");
      card.className = "card hatch-card";
      const art = createArtEl("eggs", egg.id, egg.name, rarity.color);
      art.style.setProperty("--sway-delay", swayDelayFor(h.instanceId));
      card.appendChild(art);

      const info = document.createElement("div");
      info.className = "card-info";
      info.innerHTML = `
        <div class="card-name">${egg.name}</div>
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="card-stat"></div>
      `;
      card.appendChild(info);

      grid.appendChild(card);
      hatcheryCardRefs.set(h.instanceId, {
        card,
        art,
        progressFill: info.querySelector(".progress-fill"),
        statText: info.querySelector(".card-stat"),
        btn: null,
      });
    }
  }

  for (const h of sorted) {
    const refs = hatcheryCardRefs.get(h.instanceId);
    const remaining = timeRemainingMs(h);
    const finished = isHatchingFinished(h);
    const pct = Math.min(100, 100 * (1 - remaining / h.durationMs));
    // Ei wächst optisch mit dem Brütefortschritt: klein am Anfang, volle Größe wenn fertig.
    const hatchScale = 0.35 + 0.65 * (pct / 100);
    refs.art.style.setProperty("--hatch-scale", hatchScale.toFixed(3));
    refs.progressFill.style.width = `${pct}%`;
    refs.statText.textContent = finished ? "Fertig!" : formatDuration(remaining / 1000) + " übrig";

    if (finished && !refs.btn) {
      const btn = document.createElement("button");
      btn.className = "buy-btn";
      btn.textContent = "Ausbrüten";
      btn.addEventListener("click", () => hatchAndReveal(h.instanceId));
      refs.card.appendChild(btn);
      refs.btn = btn;
    }
  }

  renderPaginationControls("hatchery-pagination", hatcheryPage, totalPages, (p) => {
    hatcheryPage = p;
    hatcheryCardRefs = new Map();
    renderHatchery();
  });
}

$$("#inventory-sort-switch .index-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    inventorySort = btn.dataset.sort;
    inventoryPage = 0;
    $$("#inventory-sort-switch .index-switch-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderInventory();
  });
});

function renderInventory() {
  const grid = $("#inventory-grid");
  grid.innerHTML = "";
  if (state.pets.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Noch keine Tiere. Brüte dein erstes Ei aus!</div>`;
    renderPaginationControls("inventory-pagination", 0, 0, () => {});
    return;
  }
  const sortedAll = [...state.pets].sort(INVENTORY_SORTERS[inventorySort]);
  const totalPages = Math.max(1, Math.ceil(sortedAll.length / PAGE_SIZE));
  inventoryPage = Math.min(inventoryPage, totalPages - 1);
  const sorted = sortedAll.slice(inventoryPage * PAGE_SIZE, (inventoryPage + 1) * PAGE_SIZE);
  for (const inst of sorted) {
    const pet = PET_BY_ID[inst.petId];
    const rarity = getRarity(pet.rarity);
    const equipped = state.equipped.includes(inst.instanceId);
    const card = document.createElement("div");
    card.className = "card pet-card" + (equipped ? " equipped" : "");
    const art = createArtEl("pets", pet.id, pet.name, rarity.color);
    art.style.setProperty("--sway-delay", swayDelayFor(inst.instanceId));
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
        toast(err.message, "error");
      }
    });
    card.appendChild(btn);
    grid.appendChild(card);
  }

  renderPaginationControls("inventory-pagination", inventoryPage, totalPages, (p) => {
    inventoryPage = p;
    renderInventory();
  });
}

let indexView = "eggs";

$$(".index-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    indexView = btn.dataset.indexView;
    $$(".index-switch-btn").forEach((b) => b.classList.toggle("active", b === btn));
    $("#index-eggs-grid").classList.toggle("hidden", indexView !== "eggs");
    $("#index-pets-grid").classList.toggle("hidden", indexView !== "pets");
  });
});

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
      info.innerHTML = `
        <div class="card-name">???</div>
        <div class="card-rarity" style="background:${rarity.color}">${rarity.name}</div>
      `;
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
        <div class="card-stat">🍀 Chance: 1 in ${formatNumber(pet.baseChanceCache)}</div>
        <div class="card-stat">⚖️ Basis: ${pet.baseWeightKg < 1 ? (pet.baseWeightKg * 1000).toFixed(1) + "g" : formatNumber(pet.baseWeightKg) + "kg"}</div>
        <div class="card-stat">${coinIcon()} Basis: ${formatNumber(pet.baseMoney)}/s</div>
      `;
    } else {
      info.innerHTML = `
        <div class="card-name">???</div>
        <div class="card-rarity" style="background:${rarity.color}">${rarity.name}</div>
      `;
    }
    card.appendChild(info);
    petGrid.appendChild(card);
  }
}

function renderRebirth() {
  const content = $("#rebirth-content");
  content.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "rebirth-summary";
  summary.innerHTML = state.rebirth > 0
    ? `Aktuelle Stufe: <strong>R${state.rebirth}</strong> · Geld-Multiplikator <strong>×${getMoneyMultiplier(state)}</strong> · ${state.equipSlots} Ausrüstungsplätze`
    : `Noch keine Rebirth durchgeführt · Geld-Multiplikator <strong>×1</strong>`;
  content.appendChild(summary);

  const next = REBIRTHS[state.rebirth];

  if (!next) {
    const maxed = document.createElement("div");
    maxed.className = "rebirth-card rebirth-maxed";
    maxed.textContent = "Du hast den maximalen Rebirth erreicht.";
    content.appendChild(maxed);
    return;
  }

  const pet = PET_BY_ID[next.petId];
  const rarity = getRarity(pet.rarity);
  const ownsPet = state.pets.some((p) => p.petId === next.petId);
  const canAfford = state.coins >= next.price;

  const card = document.createElement("div");
  card.className = "rebirth-card";

  card.innerHTML = `<div class="rebirth-title">Rebirth ${next.level}</div>`;

  const reqRow = document.createElement("div");
  reqRow.className = "rebirth-requirements";

  const petReq = document.createElement("div");
  petReq.className = "rebirth-req";
  petReq.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color, false, !ownsPet));
  petReq.insertAdjacentHTML("beforeend", `<div class="rebirth-req-label">${pet.name}</div>`);
  reqRow.appendChild(petReq);

  const plus = document.createElement("div");
  plus.className = "rebirth-req-plus";
  plus.textContent = "+";
  reqRow.appendChild(plus);

  const coinReq = document.createElement("div");
  coinReq.className = "rebirth-req";
  coinReq.innerHTML = `
    <div class="art${canAfford ? "" : " dimmed"}"><img src="${GOLD_BAR_ICON_URL}" alt="Münzen"></div>
    <div class="rebirth-req-label">${formatNumber(next.price)}</div>
  `;
  reqRow.appendChild(coinReq);

  card.appendChild(reqRow);

  const rewards = document.createElement("div");
  rewards.className = "rebirth-rewards";
  rewards.innerHTML = `
    <div class="card-stat">🎒 ${next.equipSlots} Ausrüstungsplätze</div>
    <div class="card-stat">💹 Geld-Multiplikator: ×${next.moneyMultiplier}</div>
  `;
  card.appendChild(rewards);

  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.textContent = "Rebirth durchführen";
  btn.disabled = !ownsPet || !canAfford;
  btn.addEventListener("click", () => {
    let result;
    try {
      result = performRebirth(state);
    } catch (err) {
      toast(err.message, "error");
      return;
    }
    savePlayer(state);
    renderAll();
    toast(`Rebirth ${result.level} erreicht! ×${result.moneyMultiplier} Geld, ${result.equipSlots} Plätze.`);
  });
  card.appendChild(btn);

  if (!ownsPet || !canAfford) {
    const missing = [];
    if (!ownsPet) missing.push(`ein ${pet.name}`);
    if (!canAfford) missing.push(`${formatNumber(next.price)} Münzen`);
    const hint = document.createElement("div");
    hint.className = "rebirth-missing";
    hint.textContent = `Fehlt noch: ${missing.join(" und ")}`;
    card.appendChild(hint);
  }

  content.appendChild(card);
}

function renderLeaderboard() {
  const list = $("#leaderboard-list");
  list.innerHTML = "";

  if (cachedLeaderboard.length === 0) {
    list.innerHTML = `<div class="empty-hint">Noch keine Einträge – lade kurz…</div>`;
    return;
  }

  const myId = getOrCreatePlayerId();
  cachedLeaderboard.forEach((entry, i) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row" + (entry.id === myId ? " me" : "");
    row.innerHTML = `
      <div class="leaderboard-rank">#${i + 1}</div>
      <div class="leaderboard-name">${entry.name || "Anonym"}</div>
      <div class="leaderboard-score">${coinIcon()} ${formatNumber(entry.moneyPerSec || 0)}/s</div>
    `;
    list.appendChild(row);
  });
}

async function refreshLeaderboard() {
  try {
    await submitScore(totalMoneyPerSecond(state));
    cachedLeaderboard = await fetchLeaderboard();
    $("#leaderboard-updated").textContent = `Aktualisiert: ${new Date().toLocaleTimeString()}`;
    renderLeaderboard();
  } catch (err) {
    $("#leaderboard-updated").textContent = "Rangliste gerade nicht erreichbar";
  }
}

$("#leaderboard-name-input").value = getPlayerName();
$("#leaderboard-name-save").addEventListener("click", () => {
  const saved = setPlayerName($("#leaderboard-name-input").value);
  $("#leaderboard-name-input").value = saved;
  toast(`Name gespeichert: ${saved}`);
  refreshLeaderboard();
});

$("#auto-equip-btn").addEventListener("click", () => {
  autoEquipBest(state);
  savePlayer(state);
  renderAll();
  toast("Die stärksten Tiere sind jetzt ausgerüstet!");
});

$("#hatch-all-btn").addEventListener("click", async () => {
  const instanceIds = state.hatching.filter(isHatchingFinished).map((h) => h.instanceId);
  for (const instanceId of instanceIds) {
    await hatchAndReveal(instanceId);
  }
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
