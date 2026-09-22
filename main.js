import { EGGS, PETS, REBIRTHS, RARITY_INDEX, MUTATIONS, MUTATION_BY_ID, ENV_MUTATIONS, ENV_MUTATION_BY_ID, getRarity, formatNumber, formatDuration } from "./data.js";
import { getOrRotateShop, buyEgg, msUntilNextRotation, currentRotationIndex, ROTATION_MS } from "./shop.js";
import {
  EGG_BY_ID, PET_BY_ID, loadPlayer, savePlayer, resetPlayer, startHatching,
  tickHatching, isHatchingFinished, hatchEgg, accrueMoney, totalMoneyPerSecond, getMoneyMultiplier,
  performRebirth, equipPet, unequipPet, autoEquipBest, timeRemainingMs, tickEnvironmentalMutations,
  tickHugeAbilities, effectiveMoneyPerSec, tickWeatherMutations,
  enableAdminMode, adminInstantHatch, adminGrantRandomHugePet, adminAddCoins,
  serializePetForTrade, serializeEggForTrade, removeOwnOfferFromState, addIncomingOfferToState,
} from "./game.js";
import { getOrCreatePlayerId, getPlayerName, setPlayerName, submitScore, fetchLeaderboard, deleteScore } from "./leaderboard.js";
import { createTrade, joinTrade, subscribeTrade, updateOwnOffer, setReady, cancelTrade, tryCompleteTrade } from "./trading.js";
import { ensureWeatherFresh, WEATHER_REFRESH_MS } from "./weather.js";

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
    schatten: "https://static.wikia.nocookie.net/pet-simulator/images/5/5d/PS99_Abyssal_Egg.png",
    empyreum: "https://static.wikia.nocookie.net/pet-simulator/images/e/e6/PS99_Empyrean_Egg.png",
    mosaik: "https://static.wikia.nocookie.net/pet-simulator/images/2/2c/PS99_Colorful_Mosaic_Egg.png",
    spike: "https://static.wikia.nocookie.net/pet-simulator/images/5/54/PS99_Spike_Egg.png",
    bonsai: "https://static.wikia.nocookie.net/pet-simulator/images/5/5f/PS99_Bonsai_Egg.png",
    gekroent: "https://static.wikia.nocookie.net/pet-simulator/images/2/2a/PS99_Crowned_Egg.png",
    schatz: "https://static.wikia.nocookie.net/pet-simulator/images/b/b4/PS99_Treasure_Egg.png",
    verlies: "https://static.wikia.nocookie.net/pet-simulator/images/e/e9/PS99_Dungeon_Egg.png",
    koeniglich: "https://static.wikia.nocookie.net/pet-simulator/images/2/2c/PS99_Royal_Egg.png",
    nebel: "https://static.wikia.nocookie.net/pet-simulator/images/8/83/PS99_Angel_Egg.png",
    himmel: "https://static.wikia.nocookie.net/pet-simulator/images/d/dc/PS99_Heaven_Egg.png",
    kolosseum: "https://static.wikia.nocookie.net/pet-simulator/images/8/86/PS99_Colosseum_Egg.png",
    iris: "https://static.wikia.nocookie.net/pet-simulator/images/c/cc/PS99_Rainbow_Egg.png",
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
    zuckerstange: "https://static.wikia.nocookie.net/pets-go/images/d/d3/Candycane.png",
    minenroboter: "https://static.wikia.nocookie.net/pets-go/images/4/4f/Mining_Robot.png",
    tiefseedelfin: "https://static.wikia.nocookie.net/pets-go/images/9/99/Abyssal_Dolphin.png",
    reliktdrache: "https://static.wikia.nocookie.net/pets-go/images/b/b0/Relic_Dragon.png",
    sturmdrache: "https://static.wikia.nocookie.net/pets-go/images/a/a7/Storm_Dragon.png",
    runenqual: "https://static.wikia.nocookie.net/pets-go/images/e/e8/Runic_Agony.png",
    ente: "https://static.wikia.nocookie.net/pets-go/images/9/98/Ducky.png",
    eichhoernchen: "https://static.wikia.nocookie.net/pets-go/images/4/41/Squirrel.png",
    galaxiefuchs: "https://static.wikia.nocookie.net/pets-go/images/3/3c/Galaxy_Fox.png",
    quantenqual: "https://static.wikia.nocookie.net/pets-go/images/e/e1/Quantum_Agony.png",
    angelus: "https://static.wikia.nocookie.net/pets-go/images/c/c4/Angelus.png",
    eule: "https://static.wikia.nocookie.net/pets-go/images/5/5c/Owl.png",
    husky: "https://static.wikia.nocookie.net/pets-go/images/5/50/Husky.png",
    skorpion: "https://static.wikia.nocookie.net/pets-go/images/a/ab/Scorpion.png",
    schwarzewitwe: "https://static.wikia.nocookie.net/pets-go/images/2/28/Black_Widow.png",
    sensenmann: "https://static.wikia.nocookie.net/pets-go/images/7/74/Grim_Reaper.png",
    qual: "https://static.wikia.nocookie.net/pets-go/images/b/be/Agony.png",
    kometenqual: "https://static.wikia.nocookie.net/pets-go/images/a/a2/Comet_Agony.png",
    pixeldrache: "https://static.wikia.nocookie.net/pets-go/images/c/c8/Pixel_Dragon.png",
    nuklearqual: "https://static.wikia.nocookie.net/pets-go/images/4/4d/Nuclear_Agony.png",
    boesercomputer: "https://static.wikia.nocookie.net/pets-go/images/4/4b/Evil_Computer.png",
    kosmischequal: "https://static.wikia.nocookie.net/pets-go/images/a/a1/Cosmic_Agony.png",
    empyreumdominus: "https://static.wikia.nocookie.net/pets-go/images/7/7a/Empyrean_Dominus.png",
    nuklearwolf: "https://static.wikia.nocookie.net/pets-go/images/2/22/Nuclear_Wolf.png",
    krampushund: "https://static.wikia.nocookie.net/pets-go/images/e/e5/Krampus_Hound.png",
    hugeglitchedphoenix: "https://static.wikia.nocookie.net/pets-go/images/0/0c/Huge_Glitched_Phoenix.png",
    hugeluckiagony: "https://static.wikia.nocookie.net/pets-go/images/c/c8/Huge_Lucki_Agony.png",
    hugemysticcorgi: "https://static.wikia.nocookie.net/pets-go/images/b/bf/Huge_Mystic_Corgi.png",
    hugealienoctopus: "https://static.wikia.nocookie.net/pets-go/images/5/52/Huge_Alien_Octopus.png",
    hugesketchcorgi: "https://static.wikia.nocookie.net/pets-go/images/1/11/Huge_Sketch_Corgi.png",
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
  lucky: { emoji: "🍀", badgeClass: "lucky-badge", glowColor: "#4ade80", placeholderGradient: "linear-gradient(135deg, #123a1c, #4ade80, #123a1c)" },
  nass: { emoji: "💧", badgeClass: "nass-badge", glowColor: "#38bdf8", placeholderGradient: "linear-gradient(135deg, #0c2b3a, #38bdf8, #0c2b3a)" },
  gefroren: { emoji: "❄️", badgeClass: "gefroren-badge", glowColor: "#a5f3fc", placeholderGradient: "linear-gradient(135deg, #0e2a33, #a5f3fc, #0e2a33)" },
  lunar: { emoji: "🌙", badgeClass: "lunar-badge", glowColor: "#c7b6f0", placeholderGradient: "linear-gradient(135deg, #1c1a3a, #c7b6f0, #1c1a3a)" },
};
const GLITCH_PARTICLE_COLORS = ["#39ff14", "#ff2079", "#00e5ff", "#b026ff"];

// Anzeige-Texte/Icons fürs echte Wetter (siehe weather.js) - "nacht" ist
// hier kein eigener weather.condition-Wert, sondern die separate isDay-Ebene,
// aber als eigener Eintrag hier drin, damit renderEnvMutationsIndex einen
// gemeinsamen Text für alle weatherCondition-Werte bauen kann.
const WEATHER_LABELS = { sonne: "Sonne", regen: "Regen", schnee: "Schnee", windig: "Windig", nacht: "Nacht" };

function weatherWidgetIcon(weather) {
  if (!weather) return "❔";
  const conditionIcon = { sonne: "☀️", regen: "🌧️", schnee: "❄️", windig: "💨" }[weather.condition] || "❔";
  if (!weather.isDay) return weather.condition === "sonne" ? "🌙" : `${conditionIcon}🌙`;
  return conditionIcon;
}

function renderWeatherWidget() {
  const el = $("#weather-widget");
  if (!el) return;
  el.textContent = weatherWidgetIcon(currentWeather);
  if (!currentWeather) {
    el.title = "Wetter wird geladen…";
    return;
  }
  const parts = [WEATHER_LABELS[currentWeather.condition], currentWeather.isDay ? "Tag" : "Nacht"];
  el.title = `Bergisch Gladbach: ${parts.join(", ")}`;
}

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

// Sanft aufsteigende/verblassende Emoji-Partikel, generisch für alle
// "positiven" Umgebungsmutationen (Lucky 🍀, Nass 💧, Gefroren ❄️, Lunar 🌙) -
// im Gegensatz zum hart aufblitzenden Glitch-Pixel-Effekt oben.
function floatingParticleSpecs(id, count = 10) {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  const specs = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const x = seed % 100;
    seed = (seed * 1103515245 + 12345) >>> 0;
    const y = 40 + (seed % 60); // startet in der unteren Hälfte, steigt dann auf
    seed = (seed * 1103515245 + 12345) >>> 0;
    const delay = (seed % 300) / 100;
    specs.push({ x, y, delay });
  }
  return specs;
}

function createFloatingParticleLayer(emoji, id, locked = false) {
  const layer = document.createElement("div");
  layer.className = "clover-particle-layer";
  for (const spec of floatingParticleSpecs(id)) {
    const particle = document.createElement("div");
    particle.className = "clover-particle" + (locked ? " locked" : "");
    particle.textContent = emoji;
    particle.style.setProperty("--cx", spec.x + "%");
    particle.style.setProperty("--cy", spec.y + "%");
    particle.style.setProperty("--cdelay", `-${spec.delay}s`);
    layer.appendChild(particle);
  }
  return layer;
}

// Ordnet jeder Umgebungsmutation ihren eigenen Optik-Effekt zu (Overlay-
// Elemente, die createArtEl/createMutationCycleArt anhängen) - neue
// Umgebungsmutationen müssen hier nur einen Eintrag ergänzen.
const ENV_MUTATION_ART_EFFECTS = {
  glitched: (src, id, locked) => [createGlitchRGBLayer(src, locked), createGlitchParticleLayer(id, locked)],
  lucky: (src, id, locked) => [createFloatingParticleLayer("🍀", id, locked)],
  nass: (src, id, locked) => [createFloatingParticleLayer("💧", id, locked)],
  gefroren: (src, id, locked) => [createFloatingParticleLayer("❄️", id, locked)],
  lunar: (src, id, locked) => [createFloatingParticleLayer("🌙", id, locked)],
};

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
  // Huge Pets (Seltenheit "exklusiv") werden überall etwas größer dargestellt
  // als normale Pets - automatisch erkannt, kein extra Parameter an jedem
  // Aufrufort nötig.
  const isHuge = kind === "pets" && !locked && PET_BY_ID[id]?.rarity === "exklusiv";
  const wrap = document.createElement("div");
  wrap.className = "art" + (locked ? " locked" : "") + (dimmed ? " dimmed" : "") + (isHuge ? " huge-pet-art" : "");
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
    const effect = ENV_MUTATION_ART_EFFECTS[envMutation];
    if (effect) for (const layer of effect(src, id, locked)) wrap.appendChild(layer);
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

// Ein CSS-Rahmen (border-color) kann keinen Farbverlauf direkt darstellen -
// ab Prismatisch ist rarity.color aber ein linear-gradient. Statt dafür
// überall pauschal Grau zu nehmen (dann sähen alle High-Tier-Karten gleich
// aus), wird die erste Farbe aus dem jeweiligen Verlauf als Rahmenfarbe
// verwendet - bleibt pro Seltenheit unterscheidbar.
function rarityBorderColor(rarity) {
  if (!rarity.color.startsWith("linear")) return rarity.color;
  const match = rarity.color.match(/#[0-9a-fA-F]{3,8}/);
  return match ? match[0] : "#888";
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
  money: (a, b) => effectiveMoneyPerSec(state, b) - effectiveMoneyPerSec(state, a),
  rarity: (a, b) => RARITY_INDEX[PET_BY_ID[b.petId].rarity] - RARITY_INDEX[PET_BY_ID[a.petId].rarity],
  weight: (a, b) => b.weightKg - a.weightKg,
};
// Katalog aller Mutationen (aktuell nur Gold). Zeigt je Mutation eine
// Demo-Karte, die zwischen zwei Beispiel-Pets (Hund/Katze) durchwechselt,
// damit man den Effekt unabhängig vom eigenen Bestand sehen kann.
const MUTATION_DEMO_PET_IDS = ["hund", "katze"];
const PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MS_PER_CYCLE_SLOT = 3000; // jedes Pet ist ca. 3s "dran", Gesamtdauer wächst mit der Anzahl
// Geheimer URL-Parameter für den Admin-/Testmodus (siehe setupAdminMode weiter unten).
const ADMIN_SECRET = "leif-7f3a9c21";

// ---------------------------------------------------------------------------
// Trading (siehe trading.js) - Zustand der aktiven Trade-Session, falls
// gerade eine läuft, plus das eigene noch nicht abgeschickte Angebot.
// ---------------------------------------------------------------------------
const TRADE_SESSION_KEY = "tierspiel_active_trade";
let tradeSession = null; // { code, side: "host"|"guest", data, unsubscribe }
let tradeDraftOffer = null; // { petIds: Set, eggIds: Set, coins }
let tradeCompletionHandled = false;

// ---------------------------------------------------------------------------
// Echtes Wetter (siehe weather.js) - zuletzt bekannter Stand, wird per Poll
// aktuell gehalten (holt bei Bedarf selbst einen Refresh, siehe dort).
// ---------------------------------------------------------------------------
let currentWeather = null; // { condition, isDay, fetchedAtMs, validUntilMs } oder null

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

  setupAdminMode();
  setupTradeFromUrlOrStorage();
  refreshShop();
  renderAll();

  // Live-Ticker: alle 0.33s Brütefortschritt & Geld gutschreiben, Anzeige aktualisieren.
  // Solange aktiv gespielt wird, brüten Eier mit 3-facher Geschwindigkeit.
  setInterval(() => {
    tickHatching(state, 333, 3);
    accrueMoney(state);
    // Umgebungsmutationen (z.B. Glitched) rollen NUR während aktiv gespielt
    // wird, nie für Offline-Zeit - siehe tickEnvironmentalMutations.
    // Wetterbasierte (Nass/Gefroren/Lunar) laufen separat alle 15s, siehe
    // tickWeatherMutations - gleiches Rückgabeformat, einfach zusammengefügt.
    const envGains = [...tickEnvironmentalMutations(state, 333), ...tickWeatherMutations(state, 333, currentWeather)];
    // Nur die zeitabhängigen Anzeigen aktualisieren (Münzen, Brüt-Fortschritt).
    // Tiere/Index nicht neu rendern, sonst rucken CSS-Animationen dort bei
    // jedem Tick, weil ihre DOM-Elemente ständig neu erzeugt würden.
    renderTopBar();
    renderHatchery();
    updateShopRotationText();
    updateShopAffordability();
    // Huge-Pet-Fähigkeiten laufen genauso nur online (siehe tickHugeAbilities).
    const abilityTriggers = tickHugeAbilities(state, 333);
    updateAbilityCountdowns();
    updateTradeEggProgress();
    if (envGains.length > 0 || abilityTriggers.length > 0) {
      for (const { pet, envMutation } of envGains) {
        const visuals = ENV_MUTATION_VISUALS[envMutation.id];
        const petDef = PET_BY_ID[pet.petId];
        toast(`${visuals.emoji} ${petDef.name} hat die Umgebungsmutation "${envMutation.name}" bekommen!`);
      }
      for (const { source, ability, targets, coinsGranted } of abilityTriggers) {
        const sourceDef = PET_BY_ID[source.petId];
        if (ability.type === "upgrade_origin_mutation") {
          for (const target of targets) {
            const targetDef = PET_BY_ID[target.petId];
            toast(`💎 ${sourceDef.name}s Fähigkeit hat ${targetDef.name} zu ${MUTATION_BY_ID[ability.toMutationId].name} aufgewertet!`);
          }
        } else if (targets && targets.length > 0) {
          for (const target of targets) {
            const targetDef = PET_BY_ID[target.petId];
            toast(`✨ ${sourceDef.name}s Fähigkeit hat ${targetDef.name} mutiert!`);
          }
        }
        if (coinsGranted > 0) {
          toast(`💰 ${sourceDef.name} hat dir ${formatNumber(coinsGranted)} Münzen geschenkt!`);
        }
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

  // Echtes Wetter (siehe weather.js): einmal beim Start, danach regelmäßig
  // prüfen, ob das geteilte Wetter-Dokument abgelaufen ist (alle 15 Min) -
  // das eigentliche "nur alle 15 Min wirklich abrufen" passiert in
  // ensureWeatherFresh() selbst, hier wird nur oft genug nachgeschaut.
  refreshWeather();
  setInterval(refreshWeather, 60 * 1000);
}

async function refreshWeather() {
  try {
    const weather = await ensureWeatherFresh();
    if (weather) currentWeather = weather;
    renderWeatherWidget();
  } catch {
    // Wetter-Poll fehlgeschlagen (z.B. offline) - altes Wetter einfach
    // weiter anzeigen, nicht weiter stören.
  }
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

// ---------------------------------------------------------------------------
// Einstellungen - reine Geräte-/Anzeige-Präferenzen, bewusst NICHT Teil des
// Spielstands (überleben also auch ein "Zurücksetzen" des Spielstands).
// ---------------------------------------------------------------------------
const MAX_REVEAL_SLOTS_KEY = "tierspiel_max_reveal_slots";
const MAX_REVEAL_SLOTS_DEFAULT = 12;
const MAX_REVEAL_SLOTS_LIMIT = 48; // Raster-Obergrenze: waagerecht 8x6

function getMaxRevealSlots() {
  const v = parseInt(localStorage.getItem(MAX_REVEAL_SLOTS_KEY), 10);
  if (!Number.isFinite(v)) return MAX_REVEAL_SLOTS_DEFAULT;
  return Math.min(MAX_REVEAL_SLOTS_LIMIT, Math.max(1, v));
}

function setMaxRevealSlots(v) {
  const rounded = Number.isFinite(v) ? Math.round(v) : MAX_REVEAL_SLOTS_DEFAULT;
  const clamped = Math.min(MAX_REVEAL_SLOTS_LIMIT, Math.max(1, rounded));
  localStorage.setItem(MAX_REVEAL_SLOTS_KEY, String(clamped));
  return clamped;
}

$("#settings-btn").addEventListener("click", () => {
  $("#settings-max-reveal").value = getMaxRevealSlots();
  $("#settings-overlay").classList.remove("hidden");
});
$("#settings-close").addEventListener("click", () => {
  $("#settings-overlay").classList.add("hidden");
});
$("#settings-max-reveal").addEventListener("change", () => {
  const input = $("#settings-max-reveal");
  input.value = setMaxRevealSlots(Number(input.value));
});

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
  // Maximum für die aktuelle Bildschirm-Orientierung, skaliert mit der
  // Anzahl (bei den vollen 48 aus den Einstellungen: 8x6 waagerecht).
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const maxCols = results.length <= 12 ? (isPortrait ? 3 : 4)
    : results.length <= 24 ? (isPortrait ? 4 : 6)
    : (isPortrait ? 6 : 8);
  grid.style.setProperty("--reveal-cols", Math.min(results.length, maxCols));

  const slots = results.map((result) => {
    const { pet, egg, instance } = result;
    const rarity = getRarity(pet.rarity);
    const isHuge = pet.rarity === "exklusiv";
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
    label.textContent = (isHuge ? "🎉 RIESIG! " : mutationVisuals ? mutationVisuals.emoji + " " : "") + pet.name;
    slot.appendChild(label);

    grid.appendChild(slot);
    return { slot, eggArt, isHuge };
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
      const HUGE_GROW_MS = 1800; // so lange wächst das Ei, bevor es sich öffnet

      // Phase 1: Eier schütteln, leicht zeitversetzt für einen "Popcorn"-Effekt.
      slots.forEach((s, i) => setTimeout(() => {
        if (!done) s.eggArt.classList.add("shaking");
      }, i * stagger));
      await sleep(stagger * slots.length + 550);
      if (done) return;

      // Phase 2: normale Eier öffnen sich direkt. Ein Huge Pet öffnet sich
      // NICHT sofort - das Ei wächst erst immer weiter, bevor es sich mit
      // extra Tusch öffnet ("huge-reveal").
      slots.forEach((s, i) => setTimeout(() => {
        if (done) return;
        if (s.isHuge) {
          s.eggArt.classList.add("growing");
          setTimeout(() => {
            if (done) return;
            s.eggArt.classList.remove("growing");
            s.slot.classList.add("opened", "huge-reveal");
          }, HUGE_GROW_MS);
        } else {
          s.slot.classList.add("opened");
        }
      }, i * stagger));
      const extraGrowWait = slots.some((s) => s.isHuge) ? HUGE_GROW_MS : 0;
      await sleep(stagger * slots.length + 1400 + extraGrowWait);
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
    card.style.setProperty("--rarity-color", rarityBorderColor(rarity));
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

// Bütet bis zu getMaxRevealSlots() Eier auf einmal aus und zeigt sie
// zusammen in einem Raster an, statt einzeln nacheinander (siehe
// playHatchRevealBatch).
async function hatchAndRevealBatch(instanceIds) {
  const results = [];
  for (const instanceId of instanceIds.slice(0, getMaxRevealSlots())) {
    try {
      results.push(hatchEgg(state, instanceId));
    } catch (err) {
      toast(err.message, "error");
    }
  }
  if (results.length === 0) return;
  savePlayer(state);
  renderAll();
  for (const result of results) {
    if (result.eggRefunded) {
      toast(`🥚 Riesiger Sketch-Corgi hat dir ein ${result.egg.name} zurückgegeben - schon fertig zum Ausbrüten!`);
    }
  }
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

// Countdown-Text bis zum nächsten Auslösen einer Huge-Pet-Fähigkeit.
function abilityCountdownText(pet, inst) {
  const intervalMs = pet.ability.intervalSec * 1000;
  const remainingMs = Math.max(0, intervalMs - (inst.abilityProgressMs || 0));
  return `– nächste in ${formatDuration(remainingMs / 1000)}`;
}

// Aktualisiert nur die Countdown-Texte (jeden schnellen Tick), ohne die
// Inventar-Karten komplett neu zu rendern - sonst würden Animationen dort
// bei jedem Tick neu starten und ruckeln (siehe renderHatchery-Pattern).
function updateAbilityCountdowns() {
  const els = $$(".ability-countdown");
  for (const el of els) {
    const inst = state.pets.find((p) => p.instanceId === el.dataset.instanceId);
    const pet = inst && PET_BY_ID[inst.petId];
    if (!pet || !pet.ability) continue;
    el.textContent = abilityCountdownText(pet, inst);
  }
}

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
      <div class="card-stat">${coinIcon()} ${formatNumber(effectiveMoneyPerSec(state, inst))}/s</div>
      ${pet.ability ? `<div class="card-stat ability-stat">🌀 ${pet.ability.description}${equipped
        ? ` <span class="ability-countdown" data-instance-id="${inst.instanceId}">${abilityCountdownText(pet, inst)}</span>`
        : " (nur aktiv wenn ausgerüstet)"}</div>` : ""}
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
      card.style.setProperty("--rarity-color", rarityBorderColor(rarity));
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
  // Nach Seltenheit sortiert (am häufigsten zuerst), innerhalb derselben
  // Seltenheit nach Geld/Sekunde aufsteigend (Huge Pets über ihren
  // Prozentsatz, da sie kein festes Basis-Geld haben).
  const sortedPets = [...PETS].sort((a, b) => {
    const rarityDiff = RARITY_INDEX[a.rarity] - RARITY_INDEX[b.rarity];
    if (rarityDiff !== 0) return rarityDiff;
    const moneyA = a.baseMoney ?? a.moneyPercentOfBest ?? 0;
    const moneyB = b.baseMoney ?? b.moneyPercentOfBest ?? 0;
    return moneyA - moneyB;
  });
  for (const pet of sortedPets) {
    const discovered = knownPetIds.has(pet.id);
    const rarity = getRarity(pet.rarity);
    const card = document.createElement("div");
    card.className = "card" + (discovered ? "" : " locked");
    if (discovered) {
      card.style.setProperty("--rarity-color", rarityBorderColor(rarity));
    }
    card.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color, !discovered));

    const info = document.createElement("div");
    info.className = "card-info";
    if (discovered) {
      // Huge Pets (Seltenheit "exklusiv") kommen nie über die normale
      // Glücks-Leiter - die "1 in X"-Chance wäre hier irreführend, da sie
      // stattdessen aus jedem Ei mit eigener Chance kommen können.
      const chanceOrSourceLine = pet.rarity === "exklusiv"
        ? `<div class="card-stat">🥚 Aus jedem Ei möglich (sehr selten)</div>`
        : `<div class="card-stat">🍀 Chance: 1 in ${formatNumber(Math.round(pet.baseChanceCache))}</div>`;
      // Huge Pets haben kein festes Basis-Geld - sie verdienen einen
      // Prozentsatz vom besten equippten Pet (siehe effectiveMoneyPerSec).
      const moneyLine = pet.moneyPercentOfBest !== undefined
        ? `<div class="card-stat">${coinIcon()} ${pet.moneyPercentOfBest}% deines besten ausgerüsteten Pets</div>`
        : `<div class="card-stat">${coinIcon()} Basis: ${formatNumber(pet.baseMoney)}/s</div>`;
      info.innerHTML = `
        <div class="card-name">${pet.name}</div>
        ${rarityBadgeHTML(rarity)}
        ${chanceOrSourceLine}
        <div class="card-stat">⚖️ Basis: ${pet.baseWeightKg < 1 ? (pet.baseWeightKg * 1000).toFixed(1) + "g" : formatNumber(pet.baseWeightKg) + "kg"}</div>
        ${moneyLine}
        ${pet.ability ? `<div class="card-stat ability-stat">🌀 ${pet.ability.description}</div>` : ""}
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
      const layers = (ENV_MUTATION_ART_EFFECTS[envMutation.id] || (() => []))(src, petId, false);
      for (const layer of layers) {
        layer.classList.add("mutation-cycle-img");
        wrap.appendChild(layer);
      }
      return layers;
    });
    card.appendChild(artWrap);

    const visuals = ENV_MUTATION_VISUALS[envMutation.id];
    // Disabled = kein passiver Sekunden-Roll - entweder wetterbasiert (siehe
    // weatherCondition/chancePer15s) oder nur über eine Huge-Pet-Fähigkeit
    // erhältlich. Die "Chance pro Sekunde" wäre für beide irreführend.
    const chanceLine = envMutation.weatherCondition
      ? `<div class="card-stat">🌦️ ${formatNumber(envMutation.chancePer15s * 100)}% Chance alle 15s, solange gerade "${WEATHER_LABELS[envMutation.weatherCondition]}" ist</div>`
      : envMutation.disabled
      ? `<div class="card-stat">🌀 Nur über bestimmte Huge-Pet-Fähigkeiten erhältlich</div>`
      : `<div class="card-stat">🍀 ${formatNumber(envMutation.chancePerSecond * 100)}% Chance pro aktiv equippter Sekunde</div>`;
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${visuals.emoji} ${envMutation.name}</div>
      <div class="${visuals.badgeClass}">×${envMutation.moneyMultiplier} Geld/Sekunde</div>
      ${chanceLine}
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
    // Admin-/Testmodus zählt nie für die Rangliste - eigener Score wird
    // weder aktualisiert noch (neu) angelegt, siehe enableAdminMode.
    if (!state.adminMode) await submitScore(totalMoneyPerSecond(state));
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
  const batchSize = getMaxRevealSlots();
  for (let i = 0; i < instanceIds.length; i += batchSize) {
    await hatchAndRevealBatch(instanceIds.slice(i, i + batchSize));
  }
});

// ---------------------------------------------------------------------------
// Admin-/Testmodus - nur erreichbar über einen geheimen URL-Parameter
// (?admin=...), niemals über die normale UI. Einmal aktiviert, bleibt es im
// Spielstand (state.adminMode) gespeichert und der Admin-Tab sichtbar.
// WICHTIG: Das ist reine Obscurity, kein echter Schutz - der Code liegt
// öffentlich im Repo, wer die Secret-Zeichenkette dort findet, kommt auch
// so rein. Für ein rein lokales Test-Feature reicht das aber aus.
// ---------------------------------------------------------------------------
function setupAdminMode() {
  const params = new URLSearchParams(location.search);
  if (params.get("admin") === ADMIN_SECRET && !state.adminMode) {
    enableAdminMode(state);
    savePlayer(state);
    deleteScore().catch(() => {}); // vorherigen echten Rangliste-Eintrag entfernen, falls vorhanden
    toast("🛠️ Admin-Modus aktiviert – zählt ab jetzt nicht mehr für die Rangliste.");
  }
  // Secret aus der URL entfernen, sobald es einmal gelesen wurde - soll nicht
  // in der Adressleiste/im Verlauf hängen bleiben.
  if (params.has("admin")) {
    params.delete("admin");
    const rest = params.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
  }
  $("#admin-tab-btn").classList.toggle("hidden", !state.adminMode);
  if (state.adminMode) renderAdminPanel();
}

function renderAdminPanel() {
  const grid = $("#admin-eggs-grid");
  grid.innerHTML = "";
  for (const egg of EGGS) {
    const rarity = getRarity(egg.rarity);
    const card = document.createElement("div");
    card.className = "card egg-card";
    card.style.setProperty("--rarity-color", rarityBorderColor(rarity));
    card.appendChild(createArtEl("eggs", egg.id, egg.name, rarity.color));

    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `<div class="card-name">${egg.name}</div>${rarityBadgeHTML(rarity)}`;
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "buy-btn admin-egg-btn";
    btn.textContent = "🧪 Sofort ausbrüten";
    btn.addEventListener("click", async () => {
      const result = adminInstantHatch(state, egg.id);
      savePlayer(state);
      renderAll();
      await playHatchRevealBatch([result]);
    });
    card.appendChild(btn);

    grid.appendChild(card);
  }
}

$("#admin-add-coins-btn").addEventListener("click", () => {
  adminAddCoins(state, 1000000000000);
  savePlayer(state);
  renderAll();
  toast("💰 +1 Billion Münzen (Admin)");
});

$("#admin-huge-btn").addEventListener("click", () => {
  try {
    const { pet } = adminGrantRandomHugePet(state);
    savePlayer(state);
    renderAll();
    toast(`🎉 ${pet.name} erhalten (Admin)`);
  } catch (err) {
    toast(err.message, "error");
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

// ---------------------------------------------------------------------------
// Trading - siehe trading.js für die Firestore-Seite und den Kommentar dort
// zum Ehrensystem-Charakter ohne Login. Ablauf: Trade erstellen/beitreten per
// Code oder Link -> beide Seiten stellen ihr Angebot zusammen (Live-Sync über
// onSnapshot) -> beide drücken "Bereit" -> eine Firestore-Transaktion schließt
// den Trade genau einmal ab -> jede Seite übernimmt lokal das eingefrorene
// Angebot der Gegenseite in ihr Inventar.
// ---------------------------------------------------------------------------
function activeTradeCode() {
  return tradeSession ? tradeSession.code : null;
}

function startTradeSession(code, side) {
  tradeSession = { code, side, data: null, unsubscribe: null };
  tradeDraftOffer = { petIds: new Set(), eggIds: new Set(), coins: 0 };
  tradeCompletionHandled = false;
  localStorage.setItem(TRADE_SESSION_KEY, JSON.stringify({ code, side }));
  tradeSession.unsubscribe = subscribeTrade(code, onTradeUpdate);
  $("#trade-lobby").classList.add("hidden");
  $("#trade-active").classList.remove("hidden");
  $("#trade-code-display").textContent = code;
  $("#trade-coins-input").value = 0;
}

function exitTradeSession(message) {
  if (tradeSession && tradeSession.unsubscribe) tradeSession.unsubscribe();
  tradeSession = null;
  tradeDraftOffer = null;
  localStorage.removeItem(TRADE_SESSION_KEY);
  $("#trade-active").classList.add("hidden");
  $("#trade-lobby").classList.remove("hidden");
  $("#trade-join-input").value = "";
  if (message) toast(message);
}

function setupTradeFromUrlOrStorage() {
  const params = new URLSearchParams(location.search);
  const urlCode = params.get("trade");
  if (urlCode) {
    params.delete("trade");
    const rest = params.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    const code = urlCode.trim().toUpperCase();
    joinTrade(code, getOrCreatePlayerId(), getPlayerName())
      .then((side) => {
        startTradeSession(code, side);
        $$(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "trade"));
        $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-trade"));
        toast("Trade beigetreten!");
      })
      .catch((err) => toast(err.message || "Trade nicht gefunden.", "error"));
    return;
  }
  const saved = localStorage.getItem(TRADE_SESSION_KEY);
  if (!saved) return;
  try {
    const { code, side } = JSON.parse(saved);
    if (code && side) startTradeSession(code, side);
  } catch {
    localStorage.removeItem(TRADE_SESSION_KEY);
  }
}

function onTradeUpdate(data) {
  if (!tradeSession) return;
  if (!data) {
    exitTradeSession("Dieser Trade existiert nicht mehr.");
    return;
  }
  tradeSession.data = data;
  if (data.status === "cancelled") {
    exitTradeSession("Der Trade wurde abgebrochen.");
    return;
  }
  if (data.status === "open" && Date.now() > data.expiresAtMs) {
    cancelTrade(tradeSession.code).catch(() => {});
    exitTradeSession("Der Trade ist abgelaufen.");
    return;
  }
  if (data.status === "completed") {
    if (!tradeCompletionHandled) {
      tradeCompletionHandled = true;
      applyCompletedTrade(data);
    }
    return;
  }
  renderTradeActive();
  if (data.host.ready && data.guest.ready) {
    // Egal ob beide Clients das gleichzeitig versuchen - tryCompleteTrade
    // ist eine Transaktion und feuert dadurch trotzdem nur einmal wirklich.
    tryCompleteTrade(tradeSession.code).catch(() => {});
  }
}

function applyCompletedTrade(data) {
  const side = tradeSession.side;
  const otherSide = side === "host" ? "guest" : "host";
  removeOwnOfferFromState(state, data[side].offer);
  addIncomingOfferToState(state, data[otherSide].offer);
  savePlayer(state);
  renderAll();
  toast("🤝 Trade abgeschlossen!");
  exitTradeSession(null);
}

function buildOwnOfferPayload() {
  return {
    pets: [...tradeDraftOffer.petIds]
      .map((id) => state.pets.find((p) => p.instanceId === id))
      .filter(Boolean)
      .map(serializePetForTrade),
    eggs: [...tradeDraftOffer.eggIds]
      .map((id) => state.hatching.find((h) => h.instanceId === id))
      .filter(Boolean)
      .map(serializeEggForTrade),
    coins: tradeDraftOffer.coins,
  };
}

function pushOwnOffer() {
  if (!tradeSession) return;
  renderTradeOwnGrid(); // sofortiges Feedback, nicht auf den Firestore-Roundtrip warten
  updateOwnOffer(tradeSession.code, tradeSession.side, buildOwnOfferPayload())
    .catch((err) => toast("Angebot konnte nicht aktualisiert werden: " + err.message, "error"));
}

function renderTradeActive() {
  if (!tradeSession || !tradeSession.data) return;
  const data = tradeSession.data;
  const side = tradeSession.side;
  const otherSide = side === "host" ? "guest" : "host";
  const own = data[side];
  const other = data[otherSide];

  $("#trade-other-title").textContent = other.playerId
    ? `Angebot von ${other.name || "Mitspieler"}`
    : "Warte auf einen zweiten Spieler…";
  $("#trade-ready-btn").textContent = own.ready ? "❌ Bereit zurücknehmen" : "✅ Bereit";
  $("#trade-ready-btn").disabled = !other.playerId;
  $("#trade-other-ready-status").textContent = !other.playerId
    ? "⏳ Wartet auf einen zweiten Spieler…"
    : other.ready ? "✅ Bereit" : "⏳ Noch nicht bereit";

  const coinsInput = $("#trade-coins-input");
  if (document.activeElement !== coinsInput) coinsInput.value = tradeDraftOffer.coins;
  coinsInput.max = Math.floor(state.coins);

  renderTradeOwnGrid();
  renderTradeOtherGrid(other.offer);
}

function renderTradeOwnGrid() {
  const grid = $("#trade-own-offer-grid");
  grid.innerHTML = "";
  for (const inst of state.pets) {
    const pet = PET_BY_ID[inst.petId];
    const rarity = getRarity(pet.rarity);
    const selected = tradeDraftOffer.petIds.has(inst.instanceId);
    const card = document.createElement("div");
    card.className = "card pet-card trade-pick-card" + (selected ? " selected" : "");
    card.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color, false, false, inst.mutation, inst.envMutation));
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `<div class="card-name">${pet.name}</div>${rarityBadgeHTML(rarity)}`;
    card.appendChild(info);
    card.addEventListener("click", () => {
      if (selected) tradeDraftOffer.petIds.delete(inst.instanceId);
      else tradeDraftOffer.petIds.add(inst.instanceId);
      pushOwnOffer();
    });
    grid.appendChild(card);
  }
  for (const h of state.hatching) {
    const egg = EGG_BY_ID[h.eggId];
    const rarity = getRarity(egg.rarity);
    const selected = tradeDraftOffer.eggIds.has(h.instanceId);
    const finished = isHatchingFinished(h);
    const pct = Math.min(100, 100 * (1 - timeRemainingMs(h) / h.durationMs));
    const card = document.createElement("div");
    card.className = "card egg-card trade-pick-card" + (selected ? " selected" : "");
    card.dataset.instanceId = h.instanceId;
    const art = createArtEl("eggs", egg.id, egg.name, rarity.color);
    // Wächst optisch mit dem Brütefortschritt, genau wie im Brüten-Tab.
    const hatchScale = 0.35 + 0.65 * (pct / 100);
    art.style.setProperty("--hatch-scale", hatchScale.toFixed(3));
    card.appendChild(art);
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${egg.name}</div>
      ${rarityBadgeHTML(rarity)}
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="card-stat trade-egg-progress-text">${finished ? "Fertig!" : formatDuration(timeRemainingMs(h) / 1000) + " übrig"}</div>
    `;
    card.appendChild(info);
    card.addEventListener("click", () => {
      if (selected) tradeDraftOffer.eggIds.delete(h.instanceId);
      else tradeDraftOffer.eggIds.add(h.instanceId);
      pushOwnOffer();
    });
    grid.appendChild(card);
  }
  if (state.pets.length === 0 && state.hatching.length === 0) {
    grid.innerHTML = `<div class="empty-hint">Du hast noch nichts zum Anbieten.</div>`;
  }
}

// Aktualisiert nur Fortschrittsbalken/-text der Ei-Karten im eigenen
// Trade-Angebot (jeden schnellen Tick, siehe updateAbilityCountdowns-Muster),
// ohne die Karten komplett neu zu rendern - sonst würde z.B. die Ei-Schwenk-
// Animation bei jedem Tick neu starten.
function updateTradeEggProgress() {
  if (!tradeSession) return;
  for (const card of $$("#trade-own-offer-grid .egg-card[data-instance-id]")) {
    const h = state.hatching.find((entry) => entry.instanceId === card.dataset.instanceId);
    if (!h) continue;
    const finished = isHatchingFinished(h);
    const pct = Math.min(100, 100 * (1 - timeRemainingMs(h) / h.durationMs));
    const fill = card.querySelector(".progress-fill");
    if (fill) fill.style.width = `${pct}%`;
    const art = card.querySelector(".art");
    if (art) art.style.setProperty("--hatch-scale", (0.35 + 0.65 * (pct / 100)).toFixed(3));
    const text = card.querySelector(".trade-egg-progress-text");
    if (text) text.textContent = finished ? "Fertig!" : formatDuration(timeRemainingMs(h) / 1000) + " übrig";
  }
}

function renderTradeOtherGrid(offer) {
  const grid = $("#trade-other-offer-grid");
  grid.innerHTML = "";
  $("#trade-other-coins").innerHTML = `💰 ${coinIcon()} ${formatNumber(offer.coins || 0)}`;
  for (const p of (offer.pets || [])) {
    const pet = PET_BY_ID[p.petId];
    if (!pet) continue;
    const rarity = getRarity(pet.rarity);
    const card = document.createElement("div");
    card.className = "card pet-card";
    card.appendChild(createArtEl("pets", pet.id, pet.name, rarity.color, false, false, p.mutation, p.envMutation));
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `<div class="card-name">${pet.name}</div>${rarityBadgeHTML(rarity)}`;
    card.appendChild(info);
    grid.appendChild(card);
  }
  for (const e of (offer.eggs || [])) {
    const egg = EGG_BY_ID[e.eggId];
    if (!egg) continue;
    const rarity = getRarity(egg.rarity);
    const durationMs = egg.hatchSeconds * 1000;
    const remainingMs = Math.min(durationMs, Math.max(0, e.remainingMs));
    const pct = Math.min(100, 100 * (1 - remainingMs / durationMs));
    const finished = remainingMs <= 0;
    const card = document.createElement("div");
    card.className = "card egg-card";
    const art = createArtEl("eggs", egg.id, egg.name, rarity.color);
    art.style.setProperty("--hatch-scale", (0.35 + 0.65 * (pct / 100)).toFixed(3));
    card.appendChild(art);
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-name">${egg.name}</div>
      ${rarityBadgeHTML(rarity)}
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="card-stat">${finished ? "Fertig!" : formatDuration(remainingMs / 1000) + " übrig (Stand beim Angebot)"}</div>
    `;
    card.appendChild(info);
    grid.appendChild(card);
  }
  if ((offer.pets || []).length === 0 && (offer.eggs || []).length === 0 && !offer.coins) {
    grid.innerHTML = `<div class="empty-hint">Noch nichts angeboten.</div>`;
  }
}

$("#trade-create-btn").addEventListener("click", async () => {
  try {
    const code = await createTrade(getOrCreatePlayerId(), getPlayerName());
    startTradeSession(code, "host");
    toast(`Trade erstellt – Code: ${code}`);
  } catch (err) {
    toast("Trade konnte nicht erstellt werden: " + err.message, "error");
  }
});

$("#trade-join-btn").addEventListener("click", async () => {
  const code = $("#trade-join-input").value.trim().toUpperCase();
  if (!code) return;
  try {
    const side = await joinTrade(code, getOrCreatePlayerId(), getPlayerName());
    startTradeSession(code, side);
    toast("Trade beigetreten!");
  } catch (err) {
    toast(err.message || "Trade nicht gefunden.", "error");
  }
});

$("#trade-coins-input").addEventListener("change", () => {
  if (!tradeSession) return;
  const input = $("#trade-coins-input");
  let val = Math.floor(Number(input.value) || 0);
  val = Math.max(0, Math.min(val, Math.floor(state.coins)));
  tradeDraftOffer.coins = val;
  input.value = val;
  pushOwnOffer();
});

$("#trade-ready-btn").addEventListener("click", () => {
  if (!tradeSession || !tradeSession.data) return;
  const own = tradeSession.data[tradeSession.side];
  setReady(tradeSession.code, tradeSession.side, !own.ready).catch((err) => toast(err.message, "error"));
});

$("#trade-leave-btn").addEventListener("click", async () => {
  if (!tradeSession) return;
  const code = tradeSession.code;
  exitTradeSession("Trade verlassen.");
  cancelTrade(code).catch(() => {});
});

$("#trade-copy-link-btn").addEventListener("click", async () => {
  if (!tradeSession) return;
  const url = `${location.origin}${location.pathname}?trade=${tradeSession.code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast("Link kopiert!");
  } catch {
    toast(`Link: ${url}`);
  }
});
