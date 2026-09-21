import { EGGS, PETS, REBIRTHS, RARITY_INDEX, MUTATIONS, MUTATION_BY_ID, ENV_MUTATIONS, ENV_MUTATION_BY_ID, getRarity, formatNumber, formatDuration } from "./data.js";
import { getOrRotateShop, buyEgg, msUntilNextRotation, currentRotationIndex, ROTATION_MS } from "./shop.js";
import {
  EGG_BY_ID, PET_BY_ID, loadPlayer, savePlayer, resetPlayer, startHatching,
  tickHatching, isHatchingFinished, hatchEgg, accrueMoney, totalMoneyPerSecond, getMoneyMultiplier,
  performRebirth, equipPet, unequipPet, autoEquipBest, timeRemainingMs, tickEnvironmentalMutations,
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

// Zusatz-Optik je Mutation (Badge-Farbe, Emoji-Präfix, Fallback-Verlauf,
// Glow-Farbe im Ei-Öffnen-Effekt) - an einer Stelle gesammelt, damit eine
// neue Mutation nur hier + in data.js (MUTATIONS) ergänzt werden muss.
const MUTATION_VISUALS = {
  gold: { emoji: "✨", badgeClass: "gold-badge", glowColor: "#ffd54f", placeholderGradient: "linear-gradient(135deg, #ffd54f, #ffb703)" },
  rainbow: { emoji: "🌈", badgeClass: "rainbow-badge", glowColor: "#ff6ec7", placeholderGradient: "linear-gradient(90deg, #ff3b3b, #ff9f1c, #ffe135, #4ade80, #38bdf8, #a78bfa)" },
};

// Zusatz-Optik je Umgebungsmutation - anders als Ursprungsmutationen (oben)
// keine Umfärbung, sondern ein Partikel-Effekt (siehe glitchParticleSpecs).
const ENV_MUTATION_VISUALS = {
  glitched: { emoji: "🟪", badgeClass: "glitch-badge", glowColor: "#b026ff", placeholderGradient: "linear-gradient(135deg, #1a1a2e, #b026ff, #1a1a2e)" },
};
const GLITCH_PARTICLE_COLORS = ["#39ff14", "#ff2079", "#00e5ff", "#b026ff"];

// Deterministisch (nicht neu gewürfelt bei jedem Rendern) verteilte
// Partikel-Positionen für den Glitch-Effekt, abgeleitet aus einem Hash der
// Instanz-ID - dieselbe Idee wie swayDelayFor() für die Schwenk-Animation.
function glitchParticleSpecs(id, count = 24) {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const specs = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const x = seed % 100;
    seed = (seed * 1103515245 + 12345) >>> 0;
    const y = seed % 100;
    seed = (seed * 1103515245 + 12345) >>> 0;
    const delay = (seed % 180) / 100;
    seed = (seed * 1103515245 + 12345) >>> 0;
    const color = GLITCH_PARTICLE_COLORS[seed % GLITCH_PARTICLE_COLORS.length];
    specs.push({ x, y, delay, color });
  }
  return specs;
}

// RGB-Split-Effekt: drei übereinandergelegte Kopien des Bildes, je auf einen
// Farbkanal reduziert (siehe #glitchR/#glitchG/#glitchB in index.html) und
// per mix-blend-mode:screen kombiniert. Die CSS-Animation lässt sie
// versetzt kurz "auseinanderspringen" (RGB-Split-Geister) statt dauerhaft
// sichtbar zu sein - siehe glitch-rgb-pop in style.css.
// locked=true (z.B. noch unentdeckte Umgebungsmutation im Index): der Effekt
// läuft schon sichtbar mit, aber komplett schwarz - als Silhouette wie das
// gesperrte Pet-Bild selbst, statt die echten Farben zu verraten.
function createGlitchRGBLayer(src, locked = false) {
  const layer = document.createElement("div");
  layer.className = "glitch-rgb-layer" + (locked ? " locked-glitch" : "");
  for (const channel of ["r", "g", "b"]) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.className = `glitch-layer glitch-layer-${channel}`;
    layer.appendChild(img);
  }
  return layer;
}

function createGlitchParticleLayer(id, locked = false) {
  const layer = document.createElement("div");
  layer.className = "glitch-particle-layer";
  for (const spec of glitchParticleSpecs(id)) {
    const particle = document.createElement("div");
    particle.className = "glitch-particle";
    particle.style.setProperty("--gx", spec.x + "%");
    particle.style.setProperty("--gy", spec.y + "%");
    particle.style.setProperty("--gdelay", `-${spec.delay}s`);
    particle.style.setProperty("--gcolor", locked ? "#000" : spec.color);
    layer.appendChild(particle);
  }
  return layer;
}

function renderPlaceholderIcon(container, label, rarityColor, locked = false, mutation = null) {
  container.innerHTML = "";
  const el = document.createElement("div");
  el.className = "placeholder-icon" + (locked ? " locked" : "");
  const visuals = mutation && MUTATION_VISUALS[mutation];
  el.style.background = locked ? "#000" : visuals ? visuals.placeholderGradient : rarityColor;
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

function createArtEl(kind, id, label, rarityColor, locked = false, dimmed = false, mutation = null, envMutation = null) {
  const wrap = document.createElement("div");
  wrap.className = "art" + (locked ? " locked" : "") + (dimmed ? " dimmed" : "");
  wrap.style.setProperty("--sway-delay", swayDelayFor(id));
  const src = assetSrc(kind, id);
  const img = document.createElement("img");
  img.alt = locked ? "???" : label;
  img.src = src;
  img.onerror = () => renderPlaceholderIcon(wrap, label, rarityColor, locked, mutation);
  if (mutation && !locked) img.classList.add(`pet-${mutation}-img`);
  wrap.appendChild(img);
  if (mutation && !locked) {
    const shine = document.createElement("div");
    shine.className = "pet-mutation-shine";
    shine.style.setProperty("mask-image", `url('${src}')`);
    shine.style.setProperty("-webkit-mask-image", `url('${src}')`);
    wrap.appendChild(shine);
  }
  if (envMutation) {
    wrap.appendChild(createGlitchRGBLayer(src, locked));
    wrap.appendChild(createGlitchParticleLayer(id, locked));
  }
  return wrap;
}

// Seltenheits-Badge (Name-Pille). Ab Prismatisch sind die Farben ein
// linear-gradient statt einer einzelnen Farbe - der bekommt zusätzlich
// eine Klasse, die den Verlauf sanft hin und her animiert.
function rarityBadgeHTML(rarity) {
  const animated = rarity.color.startsWith("linear") ? " rarity-gradient-anim" : "";
  return `<div class="card-rarity${animated}" style="background:${rarity.color}">${rarity.name}</div>`;
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
// Katalog aller Mutationen (aktuell nur Gold). Zeigt je Mutation eine
// Demo-Karte, die zwischen zwei Beispiel-Pets (Hund/Katze) durchwechselt,
// damit man den Effekt unabhängig vom eigenen Bestand sehen kann.
const MUTATION_DEMO_PET_IDS = ["hund", "katze"];
const PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MS_PER_CYCLE_SLOT = 3000; // jedes Pet ist ca. 3s "dran", Gesamtdauer wächst mit der Anzahl

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
    // Umgebungsmutationen (z.B. Glitched) rollen NUR während aktiv gespielt
    // wird, nie für Offline-Zeit - siehe tickEnvironmentalMutations.
    const envGains = tickEnvironmentalMutations(state, 333);
    // Nur die zeitabhängigen Anzeigen aktualisieren (Münzen, Brüt-Fortschritt).
    // Tiere/Index nicht neu rendern, sonst rucken CSS-Animationen dort bei
    // jedem Tick, weil ihre DOM-Elemente ständig neu erzeugt würden.
    renderTopBar();
    renderHatchery();
    updateShopRotationText();
    updateShopAffordability();
    if (envGains.length > 0) {
      for (const { pet, envMutation } of envGains) {
        const visuals = ENV_MUTATION_VISUALS[envMutation.id];
        const petDef = PET_BY_ID[pet.petId];
        toast(`${visuals.emoji} ${petDef.name} hat die Umgebungsmutation "${envMutation.name}" bekommen!`);
      }
      savePlayer(state);
      renderInventory();
      renderEnvMutationsIndex();
    }
  }, 333);

  // Alle 5s speichern, damit bei Tab schließen nicht zu viel Fortschritt fehlt
  setInterval(() => savePlayer(state), 5000);
  window.addEventListener("beforeunload", () => savePlayer(state));

  // Shop-Rotation wird bereits im schnellen 333ms-Tick über
  // updateShopRotationText() geprüft, ein separates Intervall ist nicht mehr nötig.

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

const MAX_REVEAL_SLOTS = 12; // Raster: waagerecht 4x3, senkrecht 3x4 – so viele Eier können gleichzeitig geöffnet werden

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Öffnet bis zu 10 Eier gleichzeitig in einem Raster: jedes Ei schüttelt sich
// kurz, öffnet sich dann und das Pet erscheint mit einem Glow in seiner
// Seltenheits-Farbe, bevor alles wieder ausblendet. Ein Klick auf "Überspringen"
// beendet die Animation sofort.
function playHatchRevealBatch(results) {
  const overlay = $("#reveal-overlay");
  const grid = $("#reveal-grid");
  grid.innerHTML = "";
  overlay.classList.remove("hidden");

  // Weniger Eier auf einmal -> weniger Spalten -> größere Slots (siehe
  // minmax-Obergrenze in .reveal-grid). Spaltenzahl nie größer als das
  // Maximum für die aktuelle Bildschirm-Orientierung.
  const maxCols = window.matchMedia("(orientation: portrait)").matches ? 3 : 4;
  grid.style.setProperty("--reveal-cols", Math.min(results.length, maxCols));

  const slots = results.map((result) => {
    const { pet, egg, instance } = result;
    const rarity = getRarity(pet.rarity);
    const mutationVisuals = instance.mutation && MUTATION_VISUALS[instance.mutation];
    const glowColor = mutationVisuals ? mutationVisuals.glowColor
      : rarity.color.startsWith("linear") ? "#ffffff" : rarity.color;

    const slot = document.createElement("div");
    slot.className = "reveal-slot";
    slot.style.setProperty("--glow-color", glowColor);

    const glow = document.createElement("div");
    glow.className = "slot-glow";
    slot.appendChild(glow);

    const eggArt = createArtEl("eggs", egg.id, egg.name, rarity.color);
    eggArt.classList.add("slot-egg-art");
    slot.appendChild(eggArt);

    const petArt = createArtEl("pets", pet.id, pet.name, rarity.color, false, false, instance.mutation);
    petArt.classList.add("slot-pet-art");
    slot.appendChild(petArt);

    const label = document.createElement("div");
    label.className = "slot-label";
    label.textContent = (mutationVisuals ? mutationVisuals.emoji + " " : "") + pet.name;
    slot.appendChild(label);

    grid.appendChild(slot);
    return { slot, eggArt };
  });

  return new Promise((resolve) => {
    let done = false;
    const skipBtn = $("#reveal-skip");
    const finish = () => {
      if (done) return;
      done = true;
      overlay.classList.add("hidden");
      skipBtn.removeEventListener("click", onSkip);
      resolve();
    };
    const onSkip = () => finish();
    skipBtn.addEventListener("click", onSkip);

    (async () => {
      const stagger = 60;

      // Phase 1: Eier schütteln, leicht zeitversetzt für einen "Popcorn"-Effekt.
      slots.forEach((s, i) => setTimeout(() => {
        if (!done) s.eggArt.classList.add("shaking");
      }, i * stagger));
      await sleep(stagger * slots.length + 550);
      if (done) return;

      // Phase 2: Ei öffnet sich, Pet erscheint mit Glow.
      slots.forEach((s, i) => setTimeout(() => {
        if (!done) s.slot.classList.add("opened");
      }, i * stagger));
      await sleep(stagger * slots.length + 1400);
      if (done) return;

      // Phase 3: alles ausblenden.
      slots.forEach((s) => s.slot.classList.add("fading"));
      await sleep(350);
      finish();
    })();
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
  renderOriginMutationsIndex();
  renderEnvMutationsIndex();
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
      ${rarityBadgeHTML(rarity)}
      <div class="card-stat">🍀 ${formatNumber(egg.luckPercent)}% Glück</div>
      <div class="card-stat">⏱ ${formatDuration(egg.hatchSeconds)}</div>
      <div class="card-stat">📦 Lager: ${soldOut ? "Ausverkauft" : stock}</div>
    `;
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.innerHTML = soldOut ? "Ausverkauft" : `Kaufen · ${coinIcon()} ${formatNumber(egg.basePrice)}`;
    btn.disabled = soldOut || state.coins < egg.basePrice;
    if (!soldOut) btn.dataset.price = egg.basePrice;
    btn.addEventListener("click", () => handleBuy(egg));
    card.appendChild(btn);

    grid.appendChild(card);
  }

  updateShopRotationText();
}

// Aktualisiert nur, ob die Kaufen-Buttons aktiv/deaktiviert sind (abhängig vom
// aktuellen Münzstand), ohne die Shop-Karten neu zu erzeugen. Wird bei jedem
// schnellen Tick aufgerufen, damit ein Ei nicht erst nach der nächsten
// 15s-Rotationsprüfung kaufbar wird, sobald genug Geld da ist.
function updateShopAffordability() {
  for (const btn of $$("#shop-grid .buy-btn[data-price]")) {
    btn.disabled = state.coins < Number(btn.dataset.price);
  }
}

function updateShopRotationText() {
  if (!shop) return;
  // Lief bisher nur alle 15s (siehe refreshShop-Intervall) – die Anzeige
  // konnte dadurch schon "0s" zeigen, obwohl die eigentliche Rotation erst
  // bis zu 15s später tatsächlich ausgeführt wurde. Da diese Funktion jeden
  // schnellen Tick (333ms) läuft, prüfen wir die Rotation gleich hier mit.
  if (currentRotationIndex() !== shop.rotationIndex) {
    refreshShop();
    return;
  }
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

// Bütet bis zu MAX_REVEAL_SLOTS Eier auf einmal aus und zeigt sie zusammen
// in einem Raster an, statt einzeln nacheinander (siehe playHatchRevealBatch).
async function hatchAndRevealBatch(instanceIds) {
  const results = [];
  for (const instanceId of instanceIds.slice(0, MAX_REVEAL_SLOTS)) {
    try {
      results.push(hatchEgg(state, instanceId));
    } catch (err) {
      toast(err.message, "error");
    }
  }
  if (results.length === 0) return;
  savePlayer(state);
  renderAll();
  await playHatchRevealBatch(results);
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
      btn.addEventListener("click", () => hatchAndRevealBatch([h.instanceId]));
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
    const mutation = inst.mutation ? MUTATION_BY_ID[inst.mutation] : null;
    const mutationVisuals = inst.mutation ? MUTATION_VISUALS[inst.mutation] : null;
    const envMutation = inst.envMutation ? ENV_MUTATION_BY_ID[inst.envMutation] : null;
    const envMutationVisuals = inst.envMutation ? ENV_MUTATION_VISUALS[inst.envMutation] : null;
    const equipped = state.equipped.includes(inst.instanceId);
    const card = document.createElement("div");
    card.className = "card pet-card" + (equipped ? " equipped" : "");
    const art = createArtEl("pets", pet.id, pet.name, rarity.color, false, false, inst.mutation, inst.envMutation);
    art.style.setProperty("--sway-delay", swayDelayFor(inst.instanceId));
    card.appendChild(art);
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${mutationVisuals ? mutationVisuals.emoji + " " : ""}${envMutationVisuals ? envMutationVisuals.emoji + " " : ""}${pet.name}</div>
      ${rarityBadgeHTML(rarity)}
      ${mutation ? `<div class="${mutationVisuals.badgeClass}">${mutation.name} ×${mutation.moneyMultiplier}</div>` : ""}
      ${envMutation ? `<div class="${envMutationVisuals.badgeClass}">${envMutation.name} ×${envMutation.moneyMultiplier}</div>` : ""}
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

// Auf #panel-index beschränkt, da der Sortier-Umschalter im Tiere-Tab
// dieselbe Button-Klasse verwendet und sonst ungewollt mitgetroffen würde.
$$("#panel-index .index-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    indexView = btn.dataset.indexView;
    $$("#panel-index .index-switch-btn").forEach((b) => b.classList.toggle("active", b === btn));
    $("#index-eggs-grid").classList.toggle("hidden", indexView !== "eggs");
    $("#index-pets-grid").classList.toggle("hidden", indexView !== "pets");
    $("#index-mutations-view").classList.toggle("hidden", indexView !== "mutations");
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
        ${rarityBadgeHTML(rarity)}
        <div class="card-stat">🍀 ${formatNumber(egg.luckPercent)}% Glück</div>
        <div class="card-stat">⏱ ${formatDuration(egg.hatchSeconds)}</div>
      `;
    } else {
      info.innerHTML = `
        <div class="card-name">???</div>
        ${rarityBadgeHTML(rarity)}
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
        ${rarityBadgeHTML(rarity)}
        <div class="card-stat">🍀 Chance: 1 in ${formatNumber(pet.baseChanceCache)}</div>
        <div class="card-stat">⚖️ Basis: ${pet.baseWeightKg < 1 ? (pet.baseWeightKg * 1000).toFixed(1) + "g" : formatNumber(pet.baseWeightKg) + "kg"}</div>
        <div class="card-stat">${coinIcon()} Basis: ${formatNumber(pet.baseMoney)}/s</div>
      `;
    } else {
      info.innerHTML = `
        <div class="card-name">???</div>
        ${rarityBadgeHTML(rarity)}
      `;
    }
    card.appendChild(info);
    petGrid.appendChild(card);
  }
}

// Erzeugt für ein Bild in einer N-teiligen Überblend-Rotation die passenden
// Web-Animations-API-Keyframes: sichtbar für seinen eigenen "Slot"
// (100/N Prozent des Zyklus), mit weichem Ein-/Ausblenden an dessen Rändern.
// Das Ausblend-Fenster eines Bildes und das Einblend-Fenster des nächsten
// liegen dabei exakt eine Slot-Breite auseinander - bei linearem Timing
// bleibt die Summe aller Opazitäten dadurch konstant bei ~1 (kein Moment,
// in dem alle Bilder gleichzeitig unsichtbar oder verdunkelt sind).
function buildCrossfadeKeyframes(n) {
  const slot = 100 / n;
  const fade = slot * 0.2;
  return [
    { offset: 0, opacity: 1 },
    { offset: (slot - fade) / 100, opacity: 1 },
    { offset: slot / 100, opacity: 0 },
    { offset: (100 - fade) / 100, opacity: 0 },
    { offset: 1, opacity: 1 },
  ];
}

// Erzeugt die durchcycelnde Karten-Grafik für eine Mutations-Katalogkarte:
// ein Bild pro Pet-Art, die der Spieler mit dieser Mutation tatsächlich
// besitzt, überblendet per Web-Animations-API (siehe buildCrossfadeKeyframes).
// decorateFn(petId, src, artWrap) hängt die mutations-spezifische Optik an
// (Umfärbung+Glanz bei Ursprungsmutationen, Partikel bei Umgebungsmutationen)
// und muss die zusätzlich zu animierenden Elemente zurückgeben.
function createMutationCycleArt(ownedPetIds, decorateFn) {
  const artWrap = document.createElement("div");
  artWrap.className = "art";
  const n = ownedPetIds.length;
  const keyframes = n > 1 ? buildCrossfadeKeyframes(n) : null;
  const totalMs = n * MS_PER_CYCLE_SLOT;

  ownedPetIds.forEach((petId, i) => {
    const pet = PET_BY_ID[petId];
    const src = assetSrc("pets", pet.id);

    const img = document.createElement("img");
    img.src = src;
    img.alt = pet.name;
    img.className = "mutation-cycle-img";
    img.onerror = () => { img.style.visibility = "hidden"; };
    artWrap.appendChild(img);

    const extraEls = decorateFn(img, petId, src, artWrap) || [];
    const animTargets = [img, ...extraEls];

    if (n === 1 || PREFERS_REDUCED_MOTION) {
      // Nur ein Pet (oder reduzierte Bewegung gewünscht) -> einfach das
      // erste/einzige dauerhaft zeigen, kein Über-/Ausblenden nötig.
      if (i === 0) animTargets.forEach((el) => { el.style.opacity = "1"; });
      return;
    }
    // Negativer Delay: die Animation läuft für jedes Bild von Anfang an
    // "schon mittendrin" statt erst später zu starten - kein Sprung.
    const timing = { duration: totalMs, iterations: Infinity, easing: "linear", delay: -(i * MS_PER_CYCLE_SLOT) };
    animTargets.forEach((el) => el.animate(keyframes, timing));
  });
  return artWrap;
}

// Ursprungsmutationen: einmalig beim Ausbrüten gewürfelt, verändern Farbe/
// Pattern des Pets (Umfärbungs-Filter + Glanz-Overlay).
function renderOriginMutationsIndex() {
  const grid = $("#index-origin-mutations-grid");
  // Für jede Mutation: welche Pet-Arten hat der Spieler damit tatsächlich
  // schon bekommen? Nur die werden durchgecycelt (keine Demo-Pets mehr).
  const ownedByMutation = {};
  for (const p of state.pets) {
    if (!p.mutation) continue;
    (ownedByMutation[p.mutation] ??= new Set()).add(p.petId);
  }
  // Nur neu aufbauen, wenn sich die besessenen Arten je Mutation wirklich
  // geändert haben - sonst würden die Cycle-/Glanz-Animationen bei jedem
  // renderAll() (z.B. nach jedem Kauf) neu starten und sichtbar ruckeln.
  const signature = MUTATIONS
    .map((m) => m.id + ":" + [...(ownedByMutation[m.id] || [])].sort().join(","))
    .join("|");
  if (grid.dataset.signature === signature) return;
  grid.dataset.signature = signature;

  grid.innerHTML = "";
  for (const mutation of MUTATIONS) {
    const ownedPetIds = [...(ownedByMutation[mutation.id] || [])];
    const card = document.createElement("div");
    const isDiscovered = ownedPetIds.length > 0;
    card.className = "card mutation-card" + (isDiscovered ? "" : " locked");

    if (!isDiscovered) {
      card.appendChild(createArtEl("pets", MUTATION_DEMO_PET_IDS[0], "???", "#000", true));
      const lockedInfo = document.createElement("div");
      lockedInfo.className = "card-info";
      lockedInfo.innerHTML = `<div class="card-name">???</div>`;
      card.appendChild(lockedInfo);
      grid.appendChild(card);
      continue;
    }

    const artWrap = createMutationCycleArt(ownedPetIds, (img, petId, src, wrap) => {
      img.classList.add(`pet-${mutation.id}-img`);
      const shine = document.createElement("div");
      shine.className = "mutation-cycle-img pet-mutation-shine";
      shine.style.setProperty("mask-image", `url('${src}')`);
      shine.style.setProperty("-webkit-mask-image", `url('${src}')`);
      wrap.appendChild(shine);
      return [shine];
    });
    card.appendChild(artWrap);

    const visuals = MUTATION_VISUALS[mutation.id];
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${visuals.emoji} ${mutation.name}</div>
      <div class="${visuals.badgeClass}">×${mutation.moneyMultiplier} Geld/Sekunde</div>
      <div class="card-stat">🍀 ${formatNumber(mutation.chance * 100)}% Chance bei jedem Ausbrüten</div>
    `;
    card.appendChild(info);
    grid.appendChild(card);
  }
}

// Umgebungsmutationen: werden nachträglich während aktiv equippt gewürfelt,
// erzeugen statt Umfärbung einen Partikel-Effekt (z.B. Glitch-Pixel).
function renderEnvMutationsIndex() {
  const grid = $("#index-env-mutations-grid");
  const ownedByEnvMutation = {};
  for (const p of state.pets) {
    if (!p.envMutation) continue;
    (ownedByEnvMutation[p.envMutation] ??= new Set()).add(p.petId);
  }
  const signature = ENV_MUTATIONS
    .map((m) => m.id + ":" + [...(ownedByEnvMutation[m.id] || [])].sort().join(","))
    .join("|");
  if (grid.dataset.signature === signature) return;
  grid.dataset.signature = signature;

  grid.innerHTML = "";
  for (const envMutation of ENV_MUTATIONS) {
    const ownedPetIds = [...(ownedByEnvMutation[envMutation.id] || [])];
    const card = document.createElement("div");
    const isDiscovered = ownedPetIds.length > 0;
    card.className = "card mutation-card" + (isDiscovered ? "" : " locked");

    if (!isDiscovered) {
      // Effekt läuft schon (schwarz) mit, nur die Mutation selbst bleibt "???".
      card.appendChild(createArtEl("pets", MUTATION_DEMO_PET_IDS[0], "???", "#000", true, false, null, envMutation.id));
      const lockedInfo = document.createElement("div");
      lockedInfo.className = "card-info";
      lockedInfo.innerHTML = `<div class="card-name">???</div>`;
      card.appendChild(lockedInfo);
      grid.appendChild(card);
      continue;
    }

    const artWrap = createMutationCycleArt(ownedPetIds, (img, petId, src, wrap) => {
      const rgbLayer = createGlitchRGBLayer(src);
      rgbLayer.classList.add("mutation-cycle-img");
      wrap.appendChild(rgbLayer);
      const particleLayer = createGlitchParticleLayer(petId);
      particleLayer.classList.add("mutation-cycle-img");
      wrap.appendChild(particleLayer);
      return [rgbLayer, particleLayer];
    });
    card.appendChild(artWrap);

    const visuals = ENV_MUTATION_VISUALS[envMutation.id];
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${visuals.emoji} ${envMutation.name}</div>
      <div class="${visuals.badgeClass}">×${envMutation.moneyMultiplier} Geld/Sekunde</div>
      <div class="card-stat">🍀 ${formatNumber(envMutation.chancePerSecond * 100)}% Chance pro aktiv equippter Sekunde</div>
    `;
    card.appendChild(info);
    grid.appendChild(card);
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
  // Rein kosmetisch: falls eine der besessenen Instanzen eine Mutation hat,
  // zeigen wir sie hier auch so - ändert nichts an der Anforderung selbst.
  // Bei mehreren Mutationen wird die seltenste (niedrigste Chance) bevorzugt.
  const ownedMutations = state.pets
    .filter((p) => p.petId === next.petId && p.mutation)
    .map((p) => p.mutation);
  const bestOwnedMutation = [...MUTATIONS]
    .sort((a, b) => a.chance - b.chance)
    .find((m) => ownedMutations.includes(m.id))?.id ?? null;
  const canAfford = state.coins >= next.price;

  const card = document.createElement("div");
  card.className = "rebirth-card";

  card.innerHTML = `<div class="rebirth-title">Rebirth ${next.level}</div>`;

  const reqRow = document.createElement("div");
  reqRow.className = "rebirth-requirements";

  const petReq = document.createElement("div");
  petReq.className = "rebirth-req";
  petReq.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color, false, !ownsPet, bestOwnedMutation));
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
  // Schlechteste Eier zuerst öffnen (niedrigste Seltenheit, bei Gleichstand
  // niedrigstes Glück) – so werden bei vielen fertigen Eiern zuerst die
  // uninteressantesten "weggeklickt" und die besten kommen zuletzt dran.
  const finished = [...state.hatching].filter(isHatchingFinished).sort((a, b) => {
    const eggA = EGG_BY_ID[a.eggId];
    const eggB = EGG_BY_ID[b.eggId];
    return RARITY_INDEX[eggA.rarity] - RARITY_INDEX[eggB.rarity] || eggA.luckPercent - eggB.luckPercent;
  });
  const instanceIds = finished.map((h) => h.instanceId);
  for (let i = 0; i < instanceIds.length; i += MAX_REVEAL_SLOTS) {
    await hatchAndRevealBatch(instanceIds.slice(i, i + MAX_REVEAL_SLOTS));
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
