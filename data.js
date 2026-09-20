// ============================================================
// TIERSPIEL – Spieldaten & Balancing-Formeln
// ============================================================
// Alles hier ist bewusst zentral gehalten, damit du Werte später
// leicht anpassen kannst, ohne die Spiellogik in game.js anfassen
// zu müssen.

// ---- Seltenheitsstufen -------------------------------------------------
// index = Rang (0 = am häufigsten). "color" ist die CSS-Farbe/Gradient.
// "petChance": Basis-Wahrscheinlichkeit (1 in N) für EIN einzelnes Pet
// dieser Stufe, bevor der Glücks-Faktor des Eis angewendet wird.
const RARITIES = [
  { id: "common",      name: "Gewöhnlich",   color: "#8e8e9e", petChance: 8 },
  { id: "uncommon",    name: "Ungewöhnlich", color: "#4caf50", petChance: 25 },
  { id: "rare",        name: "Selten",       color: "#2196f3", petChance: 80 },
  { id: "epic",        name: "Episch",       color: "#9c27b0", petChance: 300 },
  { id: "legendary",   name: "Legendär",     color: "#ffc107", petChance: 1200 },
  { id: "mythic",      name: "Mythisch",     color: "#e91e8c", petChance: 6000 },
  { id: "divine",      name: "Göttlich",     color: "#00bcd4", petChance: 30000 },
  { id: "prismatic",   name: "Prismatisch",  color: "linear-gradient(135deg,#ff6d00,#ffd54f,#ff6d00)", petChance: 150000 },
  { id: "transcendent",name: "Transzendent", color: "linear-gradient(135deg,#5c6bc0,#b39ddb,#5c6bc0)", petChance: 750000 },
  { id: "ethereal",    name: "Ätherisch",    color: "linear-gradient(135deg,#80cbc4,#e0f7fa,#80cbc4)", petChance: 3000000 },
  { id: "secret",      name: "Geheim",       color: "linear-gradient(135deg,#424242,#9e9e9e,#424242)", petChance: 15000000 },
  { id: "celestial",   name: "Himmlisch",    color: "linear-gradient(135deg,#4fc3f7,#ffffff,#4fc3f7)", petChance: 75000000 },
  { id: "astral",      name: "Astral",       color: "linear-gradient(135deg,#f48fb1,#ce93d8,#f48fb1)", petChance: 400000000 },
  // Diese fünf sind aktuell keinem Pet zugewiesen (Reserve für spätere
  // Content-Updates / ultra-seltene Jackpot-Ziehungen aus jedem Ei):
  { id: "nova",         name: "Nova",       color: "linear-gradient(135deg,#bf360c,#ff8a65,#bf360c)", petChance: 2000000000 },
  { id: "solar",        name: "Solar",      color: "linear-gradient(135deg,#ff8f00,#fff176,#ff8f00)", petChance: 10000000000 },
  { id: "lunar",        name: "Lunar",      color: "linear-gradient(135deg,#b39ddb,#ede7f6,#b39ddb)", petChance: 50000000000 },
  { id: "galactic",     name: "Galaktisch", color: "linear-gradient(135deg,#1565c0,#64b5f6,#1565c0)", petChance: 250000000000 },
  { id: "stellar",      name: "Stellar",    color: "linear-gradient(135deg,#2e7d32,#a5d6a7,#2e7d32)", petChance: 1000000000000 },
  { id: "nebula",       name: "Nebula",     color: "linear-gradient(135deg,#b71c1c,#ff8a80,#b71c1c)", petChance: 5000000000000 },
];
const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));

// ---- Pets ---------------------------------------------------------------
// baseWeightKg: Grundgewicht der Tierart (Referenz für "1x Gewicht")
// baseMoney: Geld/Sekunde bei genau 1x Basisgewicht
// image: Platzhalter-Schlüssel – wird später durch echte Bilder ersetzt
const PETS = [
  // Gewöhnlich
  { id: "hase",        name: "Hase",        rarity: "common", baseWeightKg: 2,    baseMoney: 1 },
  { id: "katze",       name: "Katze",       rarity: "common", baseWeightKg: 4,    baseMoney: 1.1 },
  { id: "hund",        name: "Hund",        rarity: "common", baseWeightKg: 18,   baseMoney: 1.2 },
  { id: "baer",        name: "Bär",         rarity: "common", baseWeightKg: 130,  baseMoney: 1.4 },
  { id: "elefant",     name: "Elefant",     rarity: "common", baseWeightKg: 4000, baseMoney: 1.6 },
  { id: "kuh",         name: "Kuh",         rarity: "common", baseWeightKg: 600,  baseMoney: 1.5 },
  { id: "pferd",       name: "Pferd",       rarity: "common", baseWeightKg: 500,  baseMoney: 1.3 },
  // Ungewöhnlich
  { id: "fuchs",       name: "Fuchs",       rarity: "uncommon", baseWeightKg: 6,    baseMoney: 4 },
  { id: "biene",       name: "Biene",       rarity: "uncommon", baseWeightKg: 0.0002, baseMoney: 5 },
  { id: "loewe",       name: "Löwe",        rarity: "uncommon", baseWeightKg: 190,  baseMoney: 6 },
  { id: "delfin",      name: "Delfin",      rarity: "uncommon", baseWeightKg: 200,  baseMoney: 6.5 },
  { id: "giraffe",     name: "Giraffe",     rarity: "uncommon", baseWeightKg: 800,  baseMoney: 5.5 },
  // Selten
  { id: "tiger",       name: "Tiger",       rarity: "rare", baseWeightKg: 220,  baseMoney: 20 },
  { id: "hai",         name: "Hai",         rarity: "rare", baseWeightKg: 900,  baseMoney: 24 },
  { id: "greif",       name: "Greif",       rarity: "rare", baseWeightKg: 260,  baseMoney: 28 },
  { id: "gepard",      name: "Gepard",      rarity: "rare", baseWeightKg: 50,   baseMoney: 26 },
  // Episch
  { id: "drache",      name: "Drache",      rarity: "epic", baseWeightKg: 1200, baseMoney: 90 },
  { id: "einhorn",     name: "Einhorn",     rarity: "epic", baseWeightKg: 450,  baseMoney: 100 },
  { id: "kraken",      name: "Kraken",      rarity: "epic", baseWeightKg: 2000, baseMoney: 110 },
  { id: "fee",         name: "Fee",         rarity: "epic", baseWeightKg: 0.01, baseMoney: 105 },
  // Legendär
  { id: "engelhund",   name: "Engel-Hund",  rarity: "legendary", baseWeightKg: 20,   baseMoney: 400 },
  { id: "hydra",       name: "Hydra",       rarity: "legendary", baseWeightKg: 1800, baseMoney: 460 },
  { id: "diamanthase", name: "Diamant-Hase",rarity: "legendary", baseWeightKg: 5,    baseMoney: 500 },
  { id: "hoellenhund", name: "Höllenhund",  rarity: "legendary", baseWeightKg: 80,   baseMoney: 480 },
  // Mythisch
  { id: "kitsune",     name: "Kitsune-Fuchs", rarity: "mythic", baseWeightKg: 8,    baseMoney: 2000 },
  { id: "narwal",      name: "Narwal",        rarity: "mythic", baseWeightKg: 1600, baseMoney: 2300 },
  { id: "sphinx",      name: "Sphinx",        rarity: "mythic", baseWeightKg: 300,  baseMoney: 2500 },
  { id: "kristallhirsch", name: "Kristallhirsch", rarity: "mythic", baseWeightKg: 200, baseMoney: 2400 },
  // Göttlich
  { id: "phoenix",     name: "Phönix",      rarity: "divine", baseWeightKg: 15,   baseMoney: 10000 },
  { id: "pegasus",     name: "Pegasus",     rarity: "divine", baseWeightKg: 400,  baseMoney: 11000 },
  { id: "kometenpony", name: "Kometen-Pony",rarity: "divine", baseWeightKg: 350,  baseMoney: 10500 },
  // Prismatisch
  { id: "a36",         name: "A-36",        rarity: "prismatic", baseWeightKg: 900, baseMoney: 55000 },
  { id: "phantomwolf", name: "Phantomwolf", rarity: "prismatic", baseWeightKg: 45,  baseMoney: 58000 },
  // Transzendent
  { id: "tikidominus", name: "Tiki Dominus",rarity: "transcendent", baseWeightKg: 1400, baseMoney: 280000 },
  { id: "daemon",      name: "Dämon",       rarity: "transcendent", baseWeightKg: 150,  baseMoney: 300000 },
  // Ätherisch
  { id: "wyvern",      name: "Wyvern der Unterwelt", rarity: "ethereal", baseWeightKg: 2200, baseMoney: 1300000 },
  { id: "eisigerphoenix", name: "Eisiger Phönix",    rarity: "ethereal", baseWeightKg: 18,   baseMoney: 1400000 },
  // Geheim
  { id: "schattendominus", name: "Schatten-Dominus", rarity: "secret", baseWeightKg: 1500, baseMoney: 6500000 },
  { id: "glitchdrache",    name: "Glitch-Drache",    rarity: "secret", baseWeightKg: 1300, baseMoney: 7000000 },
  // Himmlisch
  { id: "empyreumloewe", name: "Empyreum-Löwe", rarity: "celestial", baseWeightKg: 350, baseMoney: 30000000 },
  { id: "schattenhai",   name: "Schattenhai",   rarity: "celestial", baseWeightKg: 700, baseMoney: 32000000 },
  // Astral
  { id: "kosmosdrache", name: "Kosmischer Drache", rarity: "astral", baseWeightKg: 3000, baseMoney: 150000000 },
  // Nova
  { id: "diamantkatze", name: "Diamantkatze",  rarity: "nova", baseWeightKg: 5,    baseMoney: 750000000 },
  // Solar
  { id: "minenroboter", name: "Minenroboter", rarity: "solar", baseWeightKg: 800,  baseMoney: 4000000000 },
  // Lunar
  { id: "tiefseedelfin",name: "Abgrunddelfin", rarity: "lunar", baseWeightKg: 250, baseMoney: 20000000000 },
  // Galaktisch
  { id: "reliktdrache", name: "Reliktdrache", rarity: "galactic", baseWeightKg: 2500, baseMoney: 100000000000 },
  // Stellar
  { id: "sturmdrache",  name: "Sturmdrache", rarity: "stellar", baseWeightKg: 1800, baseMoney: 500000000000 },
  // Nebula
  { id: "runenqual",    name: "Runen-Qual",  rarity: "nebula", baseWeightKg: 400,  baseMoney: 2500000000000 },
];

// ---- Eier -----------------------------------------------------------------
// rarity: bestimmt Hauptfarbe/Rahmen des Eis (rein kosmetisch/Einordnung)
// luckPercent: 100 = neutral (1x). 100000 = 1000x Glücksfaktor.
// Das Gewicht der geschlüpften Tiere ist unabhängig vom Ei komplett zufällig
// (siehe rollWeightFactor) – alle Eier sind "gleich schwer".
// hatchSeconds: Bebrütungsdauer
// basePrice: Münzpreis im Shop
// stock: { min, max } normale Stückzahl, wenn im Shop verfügbar
// appearChance: Wahrscheinlichkeit (0–1), dass das Ei bei einem Shop-Refresh
//               überhaupt angeboten wird
const EGGS = [
  { id: "standard",  name: "Standard-Ei",   rarity: "common",       luckPercent: 100,        hatchSeconds: 10,     basePrice: 25,           appearChance: 1.0,  stock: [6, 12] },
  { id: "holz",      name: "Holz-Ei",       rarity: "common",       luckPercent: 150,        hatchSeconds: 30,     basePrice: 75,           appearChance: 1.0,  stock: [6, 12] },
  { id: "getupft",   name: "Getupftes Ei",  rarity: "uncommon",     luckPercent: 250,        hatchSeconds: 120,    basePrice: 300,          appearChance: 1.0,  stock: [4, 8] },
  { id: "spike",     name: "Stachel-Ei",    rarity: "uncommon",     luckPercent: 325,        hatchSeconds: 200,    basePrice: 550,          appearChance: 1.0,  stock: [4, 8] },
  { id: "stein",     name: "Stein-Ei",      rarity: "uncommon",     luckPercent: 400,        hatchSeconds: 300,    basePrice: 900,          appearChance: 1.0,  stock: [4, 8] },
  { id: "keimling",  name: "Pilz-Ei",       rarity: "rare",         luckPercent: 700,        hatchSeconds: 600,    basePrice: 3000,         appearChance: 1.0,  stock: [2, 5] },
  { id: "bonsai",    name: "Bonsai-Ei",     rarity: "rare",         luckPercent: 950,        hatchSeconds: 750,    basePrice: 5000,         appearChance: 1.0,  stock: [2, 5] },
  { id: "dschungel", name: "Dschungel-Ei",  rarity: "rare",         luckPercent: 1200,       hatchSeconds: 900,    basePrice: 8000,         appearChance: 1.0,  stock: [2, 5] },
  { id: "sonnen",    name: "Sonnen-Ei",     rarity: "epic",         luckPercent: 2500,       hatchSeconds: 1800,   basePrice: 25000,        appearChance: 0.9,  stock: [1, 3] },
  { id: "schatz",    name: "Schatz-Ei",     rarity: "epic",         luckPercent: 3700,       hatchSeconds: 2700,   basePrice: 45000,        appearChance: 0.9,  stock: [1, 3] },
  { id: "piraten",   name: "Piraten-Ei",    rarity: "epic",         luckPercent: 5000,       hatchSeconds: 3600,   basePrice: 70000,        appearChance: 0.9,  stock: [1, 3] },
  { id: "fossil",    name: "Fossil-Ei",     rarity: "legendary",    luckPercent: 10000,      hatchSeconds: 5400,   basePrice: 250000,       appearChance: 0.6,  stock: [1, 2] },
  { id: "gekroent",  name: "Gekröntes Ei",  rarity: "legendary",    luckPercent: 15000,      hatchSeconds: 6300,   basePrice: 450000,       appearChance: 0.6,  stock: [1, 2] },
  { id: "aegyptisch",name: "Ägyptisches Ei",rarity: "legendary",    luckPercent: 20000,      hatchSeconds: 7200,   basePrice: 700000,       appearChance: 0.6,  stock: [1, 2] },
  { id: "schnee",    name: "Schnee-Ei",     rarity: "mythic",       luckPercent: 45000,      hatchSeconds: 10800,  basePrice: 2500000,      appearChance: 0.3,  stock: [1, 1] },
  { id: "koeniglich",name: "Königliches Ei",rarity: "mythic",       luckPercent: 70000,      hatchSeconds: 12500,  basePrice: 5000000,      appearChance: 0.3,  stock: [1, 1] },
  { id: "knochen",   name: "Knochen-Ei",    rarity: "mythic",       luckPercent: 100000,     hatchSeconds: 14400,  basePrice: 7000000,      appearChance: 0.3,  stock: [1, 1] },
  { id: "obsidian",  name: "Obsidian-Ei",   rarity: "divine",       luckPercent: 250000,     hatchSeconds: 18000,  basePrice: 25000000,     appearChance: 0.12, stock: [1, 1] },
  { id: "verlies",   name: "Verlies-Ei",    rarity: "divine",       luckPercent: 400000,     hatchSeconds: 19800,  basePrice: 45000000,     appearChance: 0.12, stock: [1, 1] },
  { id: "hoellen",   name: "Höllen-Ei",     rarity: "divine",       luckPercent: 600000,     hatchSeconds: 21600,  basePrice: 70000000,     appearChance: 0.12, stock: [1, 1] },
  { id: "metall",    name: "Metall-Ei",     rarity: "prismatic",    luckPercent: 1500000,    hatchSeconds: 25200,  basePrice: 250000000,    appearChance: 0.05, stock: [1, 1] },
  { id: "mosaik",    name: "Mosaik-Ei",     rarity: "transcendent", luckPercent: 4000000,    hatchSeconds: 28800,  basePrice: 900000000,    appearChance: 0.02, stock: [1, 1] },
  { id: "runen",     name: "Runen-Ei",      rarity: "ethereal",     luckPercent: 12000000,   hatchSeconds: 32400,  basePrice: 3500000000,   appearChance: 0.008,stock: [1, 1] },
  { id: "regenbogen",name: "Regenbogen-Ei", rarity: "secret",       luckPercent: 40000000,   hatchSeconds: 36000,  basePrice: 15000000000,  appearChance: 0.003,stock: [1, 1] },
  { id: "schatten",  name: "Schatten-Ei",   rarity: "celestial",    luckPercent: 150000000,  hatchSeconds: 39600,  basePrice: 70000000000,  appearChance: 0.001,stock: [1, 1] },
  { id: "empyreum",  name: "Empyreum-Ei",   rarity: "astral",       luckPercent: 600000000,  hatchSeconds: 43200,  basePrice: 350000000000, appearChance: 0.0003,stock: [1, 1] },
  { id: "nebel",     name: "Nebel-Ei",      rarity: "nebula",       luckPercent: 60000000000,hatchSeconds: 86400,  basePrice: 5000000000000,appearChance: 0.0001,stock: [1, 1] },
];

// ---- Gewichts-Ausreißer-Tabelle -------------------------------------------
// Kumulative Wahrscheinlichkeitsverteilung für den "Rand-Roll" beim Schlüpfen.
// Der finale Gewichtsfaktor eines Pets ist rein zufällig = rollFactor.
// P(rollFactor >= 2.0) ≈ 1%, wie gewünscht.
const WEIGHT_ROLL_TABLE = [
  { chance: 0.74,   min: 0.85, max: 1.15 },
  { chance: 0.20,   min: 1.15, max: 1.4 },
  { chance: 0.05,   min: 1.4,  max: 2.0 },
  { chance: 0.009,  min: 2.0,  max: 3.0 },
  { chance: 0.00095,min: 3.0,  max: 5.0 },
  { chance: 0.00005,min: 5.0,  max: 10.0 },
];

function rollWeightFactor() {
  let r = Math.random();
  let acc = 0;
  for (const bucket of WEIGHT_ROLL_TABLE) {
    acc += bucket.chance;
    if (r <= acc) {
      return bucket.min + Math.random() * (bucket.max - bucket.min);
    }
  }
  return 1.0;
}

// ---- Geld-Formel -----------------------------------------------------------
// moneyMultiplier(m) = m^3  →  2x Basisgewicht = 8x Geld (wie gefordert)
function moneyMultiplierFromWeightRatio(ratio) {
  return Math.pow(ratio, 3);
}

// ---- Ziehungs-Formel (Ei-Glück → Pet aus dem Pool) -------------------------
// Stufen, deren Basis-Chance im Vergleich zum Glück des Eis "trivial" wird,
// fallen komplett aus dem Pool – seltenere Eier können so ab einem gewissen
// Glückswert gar keine häufigen Tiere mehr geben, statt sie nur seltener zu
// machen. Innerhalb des verbliebenen Pools potenziert das Glück weiterhin
// das Grundgewicht seltener Tiere stärker als das häufiger Tiere.
// Bei Glück=100% (Faktor 1) ändert sich nichts an der Basisverteilung.
const MAX_TIER_INDEX = RARITY_INDEX["nebula"]; // 18 – höchste im Pool vertretene Stufe

function minEligibleRarityIndex(luckPercent) {
  let floorIdx = -1;
  for (let i = 0; i < RARITIES.length; i++) {
    if (RARITIES[i].petChance === undefined) break;
    // Sobald das Glück die Basis-Chance dieser Stufe "trivial" macht
    // (rechnerisch quasi garantiert), fällt sie aus dem Pool.
    if (luckPercent >= RARITIES[i].petChance * 100) {
      floorIdx = i;
    } else {
      break; // petChance steigt monoton, alles Weitere bleibt also im Pool
    }
  }
  return floorIdx + 1;
}

// Verstärkt den Luck-Exponenten zusätzlich, klingt aber mit wachsendem
// Glück ab (~1 bei sehr hohem Glück). Ohne das wäre der Unterschied
// zwischen z.B. 100% und 800% Glück kaum spürbar, weil der Exponent für
// niedrige/mittlere Stufen sonst sehr klein ist – bei den astronomisch
// hohen Glückswerten der Top-Eier würde eine dauerhaft starke
// Verstärkung dagegen die Verteilung invertieren (seltenstes Tier würde
// am häufigsten gezogen). Der Abkling-Faktor verhindert das.
const LUCK_BOOST_STRENGTH = 10;
function drawPetFromPool(luckPercent) {
  const luckFactor = Math.max(luckPercent, 100) / 100; // 100% => 1.0
  const minTierIdx = minEligibleRarityIndex(luckPercent);
  const eligiblePets = PETS.filter((pet) => RARITY_INDEX[pet.rarity] >= minTierIdx);
  const pool = eligiblePets.length > 0 ? eligiblePets : PETS; // Sicherheitsnetz

  const boost = 1 + LUCK_BOOST_STRENGTH / Math.sqrt(luckFactor);
  const weights = pool.map((pet) => {
    const tierIdx = RARITY_INDEX[pet.rarity];
    const raw = 1 / pet.baseChanceCache; // baseChanceCache wird unten gesetzt
    const exponent = boost * tierIdx / MAX_TIER_INDEX; // 0 (common) .. ~boost (nebula)
    return raw * Math.pow(luckFactor, exponent);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
// Basis-Chance pro Pet aus der Rarity-Tabelle cachen
PETS.forEach((p) => { p.baseChanceCache = RARITIES[RARITY_INDEX[p.rarity]].petChance; });

// ---- Hilfsfunktionen für Anzeige -------------------------------------------
function formatNumber(n) {
  if (n < 1000) return Math.round(n * 100) / 100 + "";
  const units = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
  let unitIndex = 0;
  while (n >= 1000 && unitIndex < units.length - 1) {
    n /= 1000;
    unitIndex++;
  }
  return n.toFixed(2).replace(/\.00$/, "") + units[unitIndex];
}

function formatDuration(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m > 0 ? m + "min" : ""}`.trim();
  if (m > 0) return `${m}min ${s > 0 ? s + "s" : ""}`.trim();
  return `${s}s`;
}

function getRarity(id) {
  return RARITIES[RARITY_INDEX[id]];
}

export {
  RARITIES, RARITY_INDEX, PETS, EGGS, WEIGHT_ROLL_TABLE,
  rollWeightFactor, moneyMultiplierFromWeightRatio, drawPetFromPool,
  formatNumber, formatDuration, getRarity,
};
