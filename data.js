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
  // Exklusiv: eigener Zweig für Huge Pets, nicht Teil der normalen
  // Seltenheits-Leiter - man bekommt sie NUR über das Huge-Ei (siehe unten),
  // nie über normales Glück bei anderen Eiern (siehe drawPetFromPool).
  { id: "exklusiv",     name: "Exklusiv",   color: "linear-gradient(90deg,#ff3b3b,#ff9f1c,#ffe135,#4ade80,#38bdf8,#a78bfa,#ff6ec7)", petChance: 1000000000000000 },
  // Noch exklusiver als "exklusiv": kommt NUR aus dem Premium-Glas-Ei (siehe
  // rollPremiumPet unten), nie aus irgendeinem anderen Ei oder über Glück -
  // deshalb wie "exklusiv" komplett aus computeWeightedPool ausgeschlossen.
  // Der animierte Gold-Verlauf sorgt automatisch für die goldene "Premium"-
  // Pille auf jeder Ei-/Tier-Karte (siehe rarityBadgeHTML in main.js).
  { id: "premium",      name: "Premium",    color: "linear-gradient(120deg,#8a6d00,#ffe066,#fff7cc,#ffe066,#8a6d00)", petChance: 5000000000000000 },
];
const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));

// ---- Pets ---------------------------------------------------------------
// baseWeightKg: Grundgewicht der Tierart (Referenz für "1x Gewicht")
// baseMoney: Geld/Sekunde bei genau 1x Basisgewicht
// image: Platzhalter-Schlüssel – wird später durch echte Bilder ersetzt

// Einheitlicher Prozentsatz für ALLE Huge-artigen Pets (Seltenheit "exklusiv"
// + die "Riesig"-Premium-Varianten weiter unten) - siehe Kommentar dort.
const HUGE_MONEY_PERCENT = 150;

const PETS = [
  // Gewöhnlich
  { id: "hase",        name: "Hase",        rarity: "common", baseWeightKg: 2,    baseMoney: 1 },
  { id: "katze",       name: "Katze",       rarity: "common", baseWeightKg: 4,    baseMoney: 1.1 },
  { id: "hund",        name: "Hund",        rarity: "common", baseWeightKg: 18,   baseMoney: 1.2 },
  { id: "baer",        name: "Bär",         rarity: "common", baseWeightKg: 130,  baseMoney: 1.4 },
  { id: "elefant",     name: "Elefant",     rarity: "common", baseWeightKg: 4000, baseMoney: 1.6 },
  { id: "kuh",         name: "Kuh",         rarity: "common", baseWeightKg: 600,  baseMoney: 1.5 },
  { id: "pferd",       name: "Pferd",       rarity: "common", baseWeightKg: 500,  baseMoney: 1.3 },
  { id: "ente",        name: "Ente",        rarity: "common", baseWeightKg: 1.5,  baseMoney: 1.1 },
  { id: "eichhoernchen", name: "Eichhörnchen", rarity: "common", baseWeightKg: 0.4, baseMoney: 1.05 },
  // Ungewöhnlich
  { id: "fuchs",       name: "Fuchs",       rarity: "uncommon", baseWeightKg: 6,    baseMoney: 4 },
  { id: "biene",       name: "Biene",       rarity: "uncommon", baseWeightKg: 0.0002, baseMoney: 5 },
  { id: "loewe",       name: "Löwe",        rarity: "uncommon", baseWeightKg: 190,  baseMoney: 6 },
  { id: "delfin",      name: "Delfin",      rarity: "uncommon", baseWeightKg: 200,  baseMoney: 6.5 },
  { id: "giraffe",     name: "Giraffe",     rarity: "uncommon", baseWeightKg: 800,  baseMoney: 5.5 },
  { id: "eule",        name: "Eule",        rarity: "uncommon", baseWeightKg: 1,    baseMoney: 5 },
  // Selten
  { id: "tiger",       name: "Tiger",       rarity: "rare", baseWeightKg: 220,  baseMoney: 20 },
  { id: "hai",         name: "Hai",         rarity: "rare", baseWeightKg: 900,  baseMoney: 24 },
  { id: "greif",       name: "Greif",       rarity: "rare", baseWeightKg: 260,  baseMoney: 28 },
  { id: "gepard",      name: "Gepard",      rarity: "rare", baseWeightKg: 50,   baseMoney: 26 },
  { id: "husky",       name: "Husky",       rarity: "rare", baseWeightKg: 25,   baseMoney: 22 },
  // Episch
  { id: "drache",      name: "Drache",      rarity: "epic", baseWeightKg: 1200, baseMoney: 90 },
  { id: "einhorn",     name: "Einhorn",     rarity: "epic", baseWeightKg: 450,  baseMoney: 100 },
  { id: "kraken",      name: "Kraken",      rarity: "epic", baseWeightKg: 2000, baseMoney: 110 },
  { id: "fee",         name: "Fee",         rarity: "epic", baseWeightKg: 0.01, baseMoney: 105 },
  { id: "skorpion",    name: "Skorpion",    rarity: "epic", baseWeightKg: 0.1,  baseMoney: 95 },
  // Legendär
  { id: "engelhund",   name: "Engel-Hund",  rarity: "legendary", baseWeightKg: 20,   baseMoney: 400 },
  { id: "hydra",       name: "Hydra",       rarity: "legendary", baseWeightKg: 1800, baseMoney: 460 },
  { id: "diamanthase", name: "Diamant-Hase",rarity: "legendary", baseWeightKg: 5,    baseMoney: 500 },
  { id: "hoellenhund", name: "Höllenhund",  rarity: "legendary", baseWeightKg: 80,   baseMoney: 480 },
  { id: "schwarzewitwe", name: "Schwarze Witwe", rarity: "legendary", baseWeightKg: 0.001, baseMoney: 420 },
  // Mythisch
  { id: "kitsune",     name: "Kitsune-Fuchs", rarity: "mythic", baseWeightKg: 8,    baseMoney: 2000 },
  { id: "narwal",      name: "Narwal",        rarity: "mythic", baseWeightKg: 1600, baseMoney: 2300 },
  { id: "sphinx",      name: "Sphinx",        rarity: "mythic", baseWeightKg: 300,  baseMoney: 2500 },
  { id: "kristallhirsch", name: "Kristallhirsch", rarity: "mythic", baseWeightKg: 200, baseMoney: 2400 },
  { id: "sensenmann",  name: "Sensenmann",    rarity: "mythic", baseWeightKg: 70,   baseMoney: 2200 },
  // Göttlich
  { id: "phoenix",     name: "Phönix",      rarity: "divine", baseWeightKg: 15,   baseMoney: 10000 },
  { id: "pegasus",     name: "Pegasus",     rarity: "divine", baseWeightKg: 400,  baseMoney: 11000 },
  { id: "kometenpony", name: "Kometen-Pony",rarity: "divine", baseWeightKg: 350,  baseMoney: 10500 },
  { id: "qual",        name: "Agony",        rarity: "divine", baseWeightKg: 200,  baseMoney: 10200 },
  // Prismatisch
  { id: "a36",         name: "A-36",        rarity: "prismatic", baseWeightKg: 900, baseMoney: 55000 },
  { id: "phantomwolf", name: "Phantomwolf", rarity: "prismatic", baseWeightKg: 45,  baseMoney: 58000 },
  { id: "kometenqual", name: "Kometen-Agony",rarity: "prismatic", baseWeightKg: 300, baseMoney: 56000 },
  // Transzendent
  { id: "tikidominus", name: "Tiki Dominus",rarity: "transcendent", baseWeightKg: 1400, baseMoney: 280000 },
  { id: "daemon",      name: "Dämon",       rarity: "transcendent", baseWeightKg: 150,  baseMoney: 300000 },
  { id: "pixeldrache", name: "Pixel-Drache",rarity: "transcendent", baseWeightKg: 600,  baseMoney: 290000 },
  // Ätherisch
  { id: "wyvern",      name: "Wyvern der Unterwelt", rarity: "ethereal", baseWeightKg: 2200, baseMoney: 1300000 },
  { id: "eisigerphoenix", name: "Eisiger Phönix",    rarity: "ethereal", baseWeightKg: 18,   baseMoney: 1400000 },
  { id: "nuklearqual", name: "Nuklear-Agony",         rarity: "ethereal", baseWeightKg: 500,  baseMoney: 1350000 },
  // Geheim
  { id: "schattendominus", name: "Schatten-Dominus", rarity: "secret", baseWeightKg: 1500, baseMoney: 6500000 },
  { id: "glitchdrache",    name: "Glitch-Drache",    rarity: "secret", baseWeightKg: 1300, baseMoney: 7000000 },
  { id: "boesercomputer",  name: "Böser Computer",   rarity: "secret", baseWeightKg: 50,   baseMoney: 6800000 },
  // Himmlisch
  { id: "empyreumloewe", name: "Empyreum-Löwe", rarity: "celestial", baseWeightKg: 350, baseMoney: 30000000 },
  { id: "schattenhai",   name: "Schattenhai",   rarity: "celestial", baseWeightKg: 700, baseMoney: 32000000 },
  { id: "krampushund",   name: "Krampushund",   rarity: "celestial", baseWeightKg: 500, baseMoney: 31000000 },
  // Astral
  { id: "kosmosdrache", name: "Kosmischer Drache", rarity: "astral", baseWeightKg: 3000, baseMoney: 150000000 },
  { id: "zuckerstange", name: "Zuckerstange",      rarity: "astral", baseWeightKg: 5,    baseMoney: 160000000 },
  { id: "minenroboter", name: "Minenroboter",      rarity: "astral", baseWeightKg: 800,  baseMoney: 170000000 },
  { id: "kosmischequal",name: "Kosmische Agony",    rarity: "astral", baseWeightKg: 2000, baseMoney: 165000000 },
  // Nova
  { id: "tiefseedelfin",name: "Abgrunddelfin", rarity: "nova", baseWeightKg: 250,  baseMoney: 750000000 },
  { id: "reliktdrache", name: "Reliktdrache",  rarity: "nova", baseWeightKg: 2500, baseMoney: 800000000 },
  { id: "sturmdrache",  name: "Sturmdrache",   rarity: "nova", baseWeightKg: 1800, baseMoney: 850000000 },
  { id: "empyreumdominus", name: "Empyreum-Dominus", rarity: "nova", baseWeightKg: 1600, baseMoney: 820000000 },
  // Solar
  { id: "runenqual",    name: "Runen-Agony",    rarity: "solar", baseWeightKg: 400, baseMoney: 4000000000 },
  { id: "nuklearwolf",  name: "Nuklear-Wolf",  rarity: "solar", baseWeightKg: 600, baseMoney: 4200000000 },
  // Lunar - neue beste Stufe, direkt über Solar (nächste bisher ungenutzte
  // Stufe aus RARITIES).
  { id: "galaxiefuchs", name: "Galaxie-Fuchs", rarity: "lunar", baseWeightKg: 100,  baseMoney: 20000000000 },
  { id: "quantenqual",  name: "Quanten-Agony", rarity: "lunar", baseWeightKg: 700,  baseMoney: 21000000000 },
  { id: "angelus",      name: "Angelus",       rarity: "lunar", baseWeightKg: 1000, baseMoney: 22000000000 },
  // Exklusiv (Huge Pets) - kommen aus jedem Ei (siehe rollHugePetOverride),
  // nie über normales Glück. Bei mehreren Huge Pets entscheidet ein
  // Gleichverteilungs-Los, welches konkret gezogen wird (siehe
  // rollHugePetOverride) - die GESAMT-Chance auf irgendein Huge Pet aus
  // einem Ei bleibt dabei unverändert, nur die individuelle Chance pro
  // Huge Pet sinkt (bei 2 Huge Pets z.B. jeweils halbiert).
  // Huge Pets haben kein festes Geld/Sekunde: sie verdienen stattdessen
  // einen Prozentsatz (moneyPercentOfBest) von deinem besten ausgerüsteten
  // "normalen" Pet - berechnet live in effectiveMoneyPerSec() (game.js),
  // nicht beim Ausbrüten festgelegt. Zusätzlich hat jedes Huge Pet eine
  // eigene Fähigkeit, die nur wirkt, solange es ausgerüstet ist (siehe
  // tickHugeAbilities in game.js).
  // Alle Huge Pets verdienen ABSICHTLICH exakt denselben Prozentsatz
  // (HUGE_MONEY_PERCENT) - sie sollen sich nur über ihre Fähigkeit
  // unterscheiden, nicht über die reine Stärke. Der Wert selbst wird den
  // Spielern nirgends angezeigt (siehe moneyLine in main.js) - dort steht nur
  // "immer stärker als dein bestes ausgerüstetes Pet".
  {
    id: "hugeglitchedphoenix", name: "Riesiger Glitched-Phönix", rarity: "exklusiv",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT,
    ability: {
      type: "mutate_random_equipped",
      intervalSec: 600,
      envMutationId: "glitched",
      description: "Alle 600s: mutiert ein zufälliges anderes ausgerüstetes Pet mit Glitched (×4,04)",
    },
  },
  {
    id: "hugeluckiagony", name: "Riesiger Lucki Agony", rarity: "exklusiv",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT,
    ability: {
      type: "roll_mutation_all_equipped",
      intervalSec: 1800,
      envMutationId: "lucky",
      chancePerTarget: 0.2,
      description: "Alle 1800s: 20% Chance für jedes andere ausgerüstete Pet einzeln, Lucky (×7) zu bekommen",
    },
  },
  {
    id: "hugemysticcorgi", name: "Riesiger Mystic Corgi", rarity: "exklusiv",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT,
    ability: {
      type: "upgrade_origin_mutation",
      intervalSec: 3600,
      fromMutationId: "gold",
      toMutationId: "rainbow",
      description: "Alle 3600s: upgradet ein zufälliges anderes ausgerüstetes Gold-Pet zu Regenbogen (×7)",
    },
  },
  {
    id: "hugealienoctopus", name: "Riesiger Alien-Octopus", rarity: "exklusiv",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT,
    ability: {
      type: "grant_income_bonus",
      intervalSec: 300,
      equivalentSeconds: 60,
      description: "Alle 300s: schenkt dir so viel Geld, wie du in 60s verdient hättest",
    },
  },
  {
    id: "hugesketchcorgi", name: "Riesiger Sketch-Corgi", rarity: "exklusiv",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT,
    // Anders als die anderen Huge-Fähigkeiten kein Zeit-Intervall, sondern
    // ein Ereignis-Trigger beim Ausbrüten (siehe maybeRefundEgg in game.js).
    ability: {
      type: "refund_egg_chance",
      chance: 0.1,
      description: "10% Chance, ein ausgebrütetes Ei zurückzubekommen (erneut ausbrüten, voller Timer)",
    },
  },
  // ---- Premium Pets (Seltenheit "premium") ---------------------------------
  // Kommen NUR aus dem Premium-Glas-Ei (siehe rollPremiumPet unten), nie aus
  // Glück/anderen Eiern. Die drei Grundtiere verdienen exakt so viel wie das
  // beste ausgerüstete Pet (moneyPercentOfBest: 100); die beiden "Riesig"-
  // Varianten sind seltene Upgrades davon (siehe PREMIUM_HUGE_UPGRADE) und
  // verdienen wie normale Huge Pets HUGE_MONEY_PERCENT - isHugeVariant sorgt
  // dafür, dass sie optisch (Größe, Ei-Öffnen-Effekt) wie Huge Pets behandelt
  // werden, obwohl ihre Seltenheit "premium" statt "exklusiv" ist.
  { id: "glaskrokodil", name: "Glas-Krokodil", rarity: "premium", baseWeightKg: 900, moneyPercentOfBest: 100 },
  { id: "glasdominus",  name: "Glas-Dominus",  rarity: "premium", baseWeightKg: 1400, moneyPercentOfBest: 100 },
  { id: "glaskraken",   name: "Glas-Kraken",   rarity: "premium", baseWeightKg: 2000, moneyPercentOfBest: 100 },
  {
    id: "glaskrokodilriesig", name: "Riesiges Glas-Krokodil", rarity: "premium",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT, isHugeVariant: true,
  },
  {
    id: "glasdominusriesig", name: "Riesiger Glas-Dominus", rarity: "premium",
    baseWeightKg: 5000, moneyPercentOfBest: HUGE_MONEY_PERCENT, isHugeVariant: true,
  },
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
  { id: "sonnen",    name: "Sonnen-Ei",     rarity: "epic",         luckPercent: 2500,       hatchSeconds: 1800,   basePrice: 25000,        appearChance: 1.0,  stock: [1, 3] },
  { id: "schatz",    name: "Schatz-Ei",     rarity: "epic",         luckPercent: 3700,       hatchSeconds: 2700,   basePrice: 45000,        appearChance: 1.0,  stock: [1, 3] },
  { id: "piraten",   name: "Piraten-Ei",    rarity: "epic",         luckPercent: 5000,       hatchSeconds: 3600,   basePrice: 70000,        appearChance: 1.0,  stock: [1, 3] },
  { id: "fossil",    name: "Fossil-Ei",     rarity: "legendary",    luckPercent: 10000,      hatchSeconds: 5400,   basePrice: 250000,       appearChance: 0.78,  stock: [1, 2] },
  { id: "gekroent",  name: "Gekröntes Ei",  rarity: "legendary",    luckPercent: 15000,      hatchSeconds: 6300,   basePrice: 450000,       appearChance: 0.85,  stock: [1, 2] },
  { id: "aegyptisch",name: "Ägyptisches Ei",rarity: "legendary",    luckPercent: 20000,      hatchSeconds: 7200,   basePrice: 700000,       appearChance: 0.92,  stock: [1, 2] },
  { id: "schnee",    name: "Schnee-Ei",     rarity: "mythic",       luckPercent: 45000,      hatchSeconds: 10800,  basePrice: 2500000,      appearChance: 0.39,  stock: [1, 1] },
  { id: "koeniglich",name: "Königliches Ei",rarity: "mythic",       luckPercent: 70000,      hatchSeconds: 12500,  basePrice: 5000000,      appearChance: 0.44,  stock: [1, 1] },
  { id: "knochen",   name: "Knochen-Ei",    rarity: "mythic",       luckPercent: 100000,     hatchSeconds: 14400,  basePrice: 7000000,      appearChance: 0.48,  stock: [1, 1] },
  { id: "obsidian",  name: "Obsidian-Ei",   rarity: "divine",       luckPercent: 250000,     hatchSeconds: 18000,  basePrice: 25000000,     appearChance: 0.156, stock: [1, 1] },
  { id: "verlies",   name: "Verlies-Ei",    rarity: "divine",       luckPercent: 400000,     hatchSeconds: 19800,  basePrice: 45000000,     appearChance: 0.175, stock: [1, 1] },
  { id: "hoellen",   name: "Höllen-Ei",     rarity: "divine",       luckPercent: 600000,     hatchSeconds: 21600,  basePrice: 70000000,     appearChance: 0.195, stock: [1, 1] },
  { id: "metall",    name: "Metall-Ei",     rarity: "prismatic",    luckPercent: 1500000,    hatchSeconds: 25200,  basePrice: 250000000,    appearChance: 0.065, stock: [1, 1] },
  { id: "mosaik",    name: "Mosaik-Ei",     rarity: "prismatic",    luckPercent: 4000000,    hatchSeconds: 28800,  basePrice: 900000000,    appearChance: 0.026, stock: [1, 1] },
  { id: "runen",     name: "Runen-Ei",      rarity: "transcendent", luckPercent: 12000000,   hatchSeconds: 32400,  basePrice: 3500000000,   appearChance: 0.01353,stock: [1, 1] },
  { id: "regenbogen",name: "Buntes Ei",     rarity: "transcendent", luckPercent: 40000000,   hatchSeconds: 36000,  basePrice: 15000000000,  appearChance: 0.007317,stock: [1, 1] },
  { id: "schatten",  name: "Schatten-Ei",   rarity: "ethereal",     luckPercent: 150000000,  hatchSeconds: 39600,  basePrice: 70000000000,  appearChance: 0.003957,stock: [1, 1] },
  { id: "empyreum",  name: "Empyreum-Ei",   rarity: "secret",       luckPercent: 600000000,  hatchSeconds: 43200,  basePrice: 350000000000, appearChance: 0.00214,stock: [1, 1] },
  { id: "nebel",     name: "Engel-Ei",      rarity: "celestial",    luckPercent: 20000000000,hatchSeconds: 86400,  basePrice: 5000000000000,appearChance: 0.001157,stock: [1, 1] },
  // Drei neue Top-Eier, seltener als das bisher beste (Engel-Ei) - nutzen die
  // schon vorhandenen, bisher nur für Pets/Rebirths verwendeten Seltenheits-
  // stufen astral/nova/solar (siehe RARITIES), in aufsteigender Reihenfolge.
  { id: "himmel",    name: "Himmels-Ei",    rarity: "astral",       luckPercent: 60000000000,   hatchSeconds: 172800, basePrice: 30000000000000,   appearChance: 0.00065, stock: [1, 1] },
  { id: "kolosseum", name: "Kolosseum-Ei",  rarity: "nova",         luckPercent: 250000000000,  hatchSeconds: 259200, basePrice: 200000000000000,  appearChance: 0.00036, stock: [1, 1] },
  { id: "iris",      name: "Regenbogen-Ei", rarity: "solar",        luckPercent: 1200000000000, hatchSeconds: 345600, basePrice: 1500000000000000, appearChance: 0.0002,  stock: [1, 1] },
  // Premium-Glas-Ei: aktuell das seltenste Ei im Spiel. luckPercent/rarity
  // sind hier nur Kosmetik (Rahmenfarbe, Sortierung) - anders als jedes
  // andere Ei nutzt es NICHT die normale Glücks-Leiter (drawPetFromPool),
  // sondern ausschließlich rollPremiumPet() (siehe premiumOnly-Flag, geprüft
  // in hatchEgg/adminInstantHatch in game.js).
  { id: "glaspremium", name: "Premium-Glas-Ei", rarity: "premium", luckPercent: 5000000000000, hatchSeconds: 432000, basePrice: 5000000000000000, appearChance: 0.00008, stock: [1, 1], premiumOnly: true },
];
// Kein eigenes Huge-Ei mehr - Huge Pets (Seltenheit "exklusiv") kommen
// stattdessen aus JEDEM Ei, mit einer Chance, die sich am jeweiligen Ei
// selbst orientiert (siehe rollHugePetOverride/astralOrBetterChance unten).

// ---- Rebirth-System ---------------------------------------------------------
// Für Münzen UND ein bestimmtes Pet (wird dabei verbraucht, der Rest der
// Sammlung bleibt) bekommt man dauerhaft mehr Ausrüstungsplätze und einen
// Geld-Multiplikator. "moneyMultiplier" ist der GESAMT-Multiplikator dieser
// Stufe (ersetzt den der vorherigen Stufe, addiert sich nicht).
const REBIRTHS = [
  { level: 1, petId: "einhorn", price: 1000000,    equipSlots: 4, moneyMultiplier: 2 },
  { level: 2, petId: "kitsune", price: 10000000,   equipSlots: 5, moneyMultiplier: 3 },
  { level: 3, petId: "phoenix", price: 100000000,  equipSlots: 6, moneyMultiplier: 4 },
  { level: 4, petId: "wyvern",  price: 1000000000, equipSlots: 7, moneyMultiplier: 5 },
  { level: 5, petId: "empyreumloewe", price: 10000000000,   equipSlots: 8,  moneyMultiplier: 6 },
  { level: 6, petId: "kosmosdrache",  price: 100000000000,  equipSlots: 9,  moneyMultiplier: 7 },
  { level: 7, petId: "runenqual",     price: 1000000000000, equipSlots: 10, moneyMultiplier: 8 },
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

// Huge Pets verdienen % vom besten anderen Pet statt fixem Basis-Geld (siehe
// effectiveMoneyPerSec in game.js) - ihr eigenes Gewicht soll sich trotzdem
// noch (leicht) auf den Bonus auswirken, nur mit einem viel kleineren
// Exponenten als die normale ratio³-Formel oben, damit ein besonders
// schwerer/leichter Roll spürbar, aber nicht dominant bleibt
// (0.85x…10x Gewicht → ca. 0.96x…1.78x statt 0.6x…1000x).
const HUGE_WEIGHT_INFLUENCE = 0.25;
function hugeWeightMultiplier(ratio) {
  return Math.pow(ratio, HUGE_WEIGHT_INFLUENCE);
}

// ---- Ziehungs-Formel (Ei-Glück → Pet aus dem Pool) -------------------------
// Stufen, deren Basis-Chance im Vergleich zum Glück des Eis "trivial" wird,
// fallen komplett aus dem Pool – seltenere Eier können so ab einem gewissen
// Glückswert gar keine häufigen Tiere mehr geben, statt sie nur seltener zu
// machen. Innerhalb des verbliebenen Pools potenziert das Glück weiterhin
// das Grundgewicht seltener Tiere stärker als das häufiger Tiere.
// Bei Glück=100% (Faktor 1) ändert sich nichts an der Basisverteilung.
const MAX_TIER_INDEX = RARITY_INDEX["lunar"]; // 15 – höchste im Pool vertretene Stufe

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
// War 10, dann wegen der Seltenheits-Garantie (siehe drawPetFromPool) auf 8
// gesenkt; jetzt wieder etwas angehoben, da der Ausgleich insgesamt zu hart war.
const LUCK_BOOST_STRENGTH = 9;

// Gemeinsame Gewichtungs-Logik für einen Ei-Glückswert: liefert den Pool
// (ohne "exklusiv" - Huge Pets sind nie Teil der normalen Glücks-Leiter,
// siehe rollHugePetOverride weiter unten) sowie das Gewicht jedes Pets
// darin. Wird sowohl vom eigentlichen Ziehen (drawPetFromPool) als auch
// von der Huge-Pet-Chance (die sich an der Astral-Chance orientiert)
// genutzt, damit beide exakt dieselbe Verteilung zugrunde legen.
function computeWeightedPool(luckPercent, eggRarity) {
  const luckFactor = Math.max(luckPercent, 100) / 100; // 100% => 1.0
  // Nach oben gedeckelt auf MAX_TIER_INDEX: bei sehr hohem Glück (siehe
  // minEligibleRarityIndex) würde die "trivial"-Schwelle sonst irgendwann
  // über die höchste tatsächlich mit Pets belegte Stufe hinausschießen -
  // eligiblePets wäre dann leer und der Fallback weiter unten würde den
  // KOMPLETTEN Pool (inkl. gewöhnlicher Tiere) wieder freigeben, statt bei
  // der höchsten Stufe zu bleiben.
  let minTierIdx = Math.min(minEligibleRarityIndex(luckPercent), MAX_TIER_INDEX);
  // Zusätzlich zum Glücks-Mechanismus gibt es immer die feste Garantie auf
  // mindestens ein Pet der Seltenheit des Eis selbst - jedes Ei liefert also
  // nie ein niedrigeres Pet, als es selbst eingestuft ist.
  if (eggRarity !== undefined) {
    minTierIdx = Math.max(minTierIdx, RARITY_INDEX[eggRarity]);
  }
  const eligiblePets = PETS.filter((pet) => (
    RARITY_INDEX[pet.rarity] >= minTierIdx && pet.rarity !== "exklusiv" && pet.rarity !== "premium"
  ));
  const pool = eligiblePets.length > 0 ? eligiblePets : PETS.filter((p) => p.rarity !== "exklusiv" && p.rarity !== "premium");

  const boost = 1 + LUCK_BOOST_STRENGTH / Math.sqrt(luckFactor);
  const weights = pool.map((pet) => {
    const tierIdx = RARITY_INDEX[pet.rarity];
    const raw = 1 / pet.baseChanceCache; // baseChanceCache wird unten gesetzt
    const exponent = boost * tierIdx / MAX_TIER_INDEX; // 0 (common) .. ~boost (solar)
    return raw * Math.pow(luckFactor, exponent);
  });
  return { pool, weights, total: weights.reduce((a, b) => a + b, 0) };
}

function drawPetFromPool(luckPercent, eggRarity) {
  const { pool, weights, total } = computeWeightedPool(luckPercent, eggRarity);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Chance, aus einem Ei mit diesem Glück/dieser Seltenheit ein Pet der Stufe
// "astral" oder besser zu ziehen - exakt dieselbe Formel wie drawPetFromPool,
// nur aufsummiert statt ausgewürfelt.
function astralOrBetterChance(luckPercent, eggRarity) {
  const { pool, weights, total } = computeWeightedPool(luckPercent, eggRarity);
  if (total <= 0) return 0;
  const astralIdx = RARITY_INDEX["astral"];
  let astralWeight = 0;
  for (let i = 0; i < pool.length; i++) {
    if (RARITY_INDEX[pool[i].rarity] >= astralIdx) astralWeight += weights[i];
  }
  return astralWeight / total;
}

// Huge Pets (Seltenheit "exklusiv") sind nie Teil der normalen Glücks-Leiter
// (siehe computeWeightedPool) - stattdessen hat JEDES Ei eine eigene,
// unabhängige Chance darauf, die sich direkt an dessen eigener Astral-Chance
// orientiert: 5x seltener als astral-oder-besser aus demselben Ei.
const HUGE_PET_RARITY_FACTOR = 5;

// astralOrBetterChance sättigt bei 100%, sobald der Glücks-Pool eines Eis
// komplett aus Astral-oder-besser-Tieren besteht (trifft schon auf Engel-Ei
// zu) - die 4 besten Eier bekämen damit alle exakt dieselbe Huge-Chance.
// Für genau diese 4 Eier sind deshalb feste Wunsch-Werte hinterlegt, alle
// anderen Eier nutzen weiter die normale, glücksbasierte Formel.
const HUGE_CHANCE_OVERRIDE_BY_EGG_ID = {
  nebel: 1 / 5,      // Engel-Ei
  himmel: 1 / 4,     // Himmels-Ei
  kolosseum: 1 / 3,  // Kolosseum-Ei
  iris: 1 / 2,        // Regenbogen-Ei
};

function rollHugePetOverride(luckPercent, eggRarity, eggId) {
  const chance = HUGE_CHANCE_OVERRIDE_BY_EGG_ID[eggId] !== undefined
    ? HUGE_CHANCE_OVERRIDE_BY_EGG_ID[eggId]
    : astralOrBetterChance(luckPercent, eggRarity) / HUGE_PET_RARITY_FACTOR;
  if (Math.random() >= chance) return null;
  const hugePets = PETS.filter((p) => p.rarity === "exklusiv");
  if (hugePets.length === 0) return null;
  return hugePets[Math.floor(Math.random() * hugePets.length)];
}

// ---- Premium-Glas-Ei (Seltenheit "premium") --------------------------------
// Komplett eigener Ziehungs-Mechanismus, unabhängig von computeWeightedPool:
// erst gleichverteilt eines der 3 Grundtiere würfeln, danach - nur für die
// beiden Tiere mit einer Riesig-Variante - eine kleine Chance auf das Upgrade.
const PREMIUM_BASE_PETS = ["glaskrokodil", "glasdominus", "glaskraken"];
const PREMIUM_HUGE_UPGRADE = {
  glaskrokodil: "glaskrokodilriesig",
  glasdominus: "glasdominusriesig",
};
const PREMIUM_HUGE_UPGRADE_CHANCE = 0.12;

function rollPremiumPet() {
  const baseId = PREMIUM_BASE_PETS[Math.floor(Math.random() * PREMIUM_BASE_PETS.length)];
  const hugeId = PREMIUM_HUGE_UPGRADE[baseId];
  const finalId = hugeId && Math.random() < PREMIUM_HUGE_UPGRADE_CHANCE ? hugeId : baseId;
  return PETS.find((p) => p.id === finalId);
}

// Basis-Chance pro Pet aus der Rarity-Tabelle cachen
// Zweiter Teil des Ausgleichs: die Basis-Chance ab Legendär wird zusätzlich
// seltener gemacht (die RARITIES-Tabelle selbst bleibt als "Referenzwert"
// unverändert, der Nerf sitzt bewusst nur hier zentral). War 1.15, jetzt
// zusammen mit LUCK_BOOST_STRENGTH etwas abgeschwächt.
const HIGH_TIER_NERF = 1.08;

// Bisher hatte JEDES Pet einer Seltenheitsstufe exakt dieselbe Chance (alle
// Common z.B. exakt 1 in 8) - etwas Variation pro einzelnem Pet, ohne die
// Reihenfolge zwischen den Stufen zu gefährden: der kleinste Abstand
// zwischen zwei benachbarten Stufen ist Faktor ~3,1 (common->uncommon), der
// Streufaktor hier bleibt mit 0,6x…1,6x klar darunter (Faktor ~2,7), sodass
// selbst das seltenste Common-Pet immer noch häufiger bleibt als das
// häufigste Uncommon-Pet. Deterministisch aus der Pet-id abgeleitet, damit
// es bei jedem Laden gleich bleibt statt bei jedem Zug neu zu variieren.
function petVariationFactor(petId) {
  let seed = 0;
  for (let i = 0; i < petId.length; i++) seed = (seed * 31 + petId.charCodeAt(i)) >>> 0;
  const t = (seed % 1000) / 1000; // 0..1, deterministisch pro Pet
  return 0.6 + t * 1.0; // 0.6 .. 1.6
}

PETS.forEach((p) => {
  const tierIdx = RARITY_INDEX[p.rarity];
  const nerf = tierIdx >= RARITY_INDEX["legendary"] ? HIGH_TIER_NERF : 1;
  p.baseChanceCache = RARITIES[tierIdx].petChance * nerf * petVariationFactor(p.id);
});

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

// ---- Mutationen ---------------------------------------------------------
// Zusätzlich zur normalen Seltenheit kann ein Pet beim Ausbrüten eine
// Mutation bekommen - unabhängig vom Ei/Glück, mit eigener Chance und
// eigenem Geld-Bonus. Als Array angelegt, damit sich leicht weitere
// Mutationen ergänzen lassen.
const MUTATIONS = [
  {
    id: "gold",
    name: "Gold",
    chance: 0.05, // 5% pro Ausbrüten, für jedes Pet gleich
    moneyMultiplier: 3,
  },
  {
    id: "rainbow",
    name: "Regenbogen",
    chance: 0.01, // 1% pro Ausbrüten, für jedes Pet gleich
    moneyMultiplier: 7,
  },
];
const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));

// Würfelt, ob ein frisch gezogenes Pet eine Mutation bekommt (oder null).
// Prüft von der seltensten zur häufigsten Mutation, damit deren Chance nicht
// durch eine vorher schon "verbrauchte" häufigere Mutation verwässert wird
// (die Reihenfolge in MUTATIONS selbst bleibt frei für die Anzeige).
function rollMutation() {
  const byRarityAsc = [...MUTATIONS].sort((a, b) => a.chance - b.chance);
  for (const mutation of byRarityAsc) {
    if (Math.random() < mutation.chance) return mutation.id;
  }
  return null;
}

// ---- Umgebungsmutationen -------------------------------------------------
// Anders als Ursprungsmutationen (oben) werden diese NICHT beim Ausbrüten
// gewürfelt, sondern nachträglich, während ein Pet equippt und das Spiel
// aktiv geöffnet ist: pro vergangener Sekunde eine Chance von
// "chancePerSecond". Sie erzeugen keine Farb-/Pattern-Änderung, sondern
// einen Partikel-Effekt, und stacken multiplikativ mit einer eventuell
// vorhandenen Ursprungsmutation (z.B. Gold x3 + Glitched x4,04 = x12,12).
const ENV_MUTATIONS = [
  {
    id: "glitched",
    name: "Glitched",
    chancePerSecond: 1 / 5000, // pro Sekunde, nur während aktiv equippt & Tab offen
    moneyMultiplier: 4.04,
    // Noch nicht erhältlich (Feature/Optik fertig, Drop aber bewusst
    // ausgeschaltet) - bleibt trotzdem im Index sichtbar, nur als "???"
    // (siehe tickEnvironmentalMutations in game.js).
    disabled: true,
  },
  {
    id: "lucky",
    name: "Lucky",
    // Kein passiver Roll (chancePerSecond 0 + disabled) - kommt ausschließlich
    // über die Fähigkeit von "Riesiger Lucki Agony" (siehe PETS unten).
    chancePerSecond: 0,
    moneyMultiplier: 7,
    disabled: true,
  },
  // Wetterbasierte Mutationen: kein passiver Sekunden-Roll (chancePerSecond
  // ungenutzt, disabled:true blockt den alten Passiv-Loop) - stattdessen ein
  // eigener Roll alle 15s über tickWeatherMutations (game.js), nur solange
  // gerade das passende ECHTE Wetter in Bergisch Gladbach herrscht (siehe
  // weather.js). "die bessere gewinnt" gilt weiterhin gemeinsam mit
  // Glitched/Lucky/Gold/Regenbogen.
  {
    id: "nass",
    name: "Nass",
    weatherCondition: "regen",
    chancePer15s: 0.04, // 4% pro 15s-Tick, solange es gerade regnet
    moneyMultiplier: 2,
    disabled: true,
  },
  {
    id: "gefroren",
    name: "Gefroren",
    weatherCondition: "schnee",
    chancePer15s: 0.016, // 1,6% pro 15s-Tick, solange es gerade schneit
    moneyMultiplier: 5,
    disabled: true,
  },
  {
    id: "lunar",
    name: "Lunar",
    weatherCondition: "nacht", // unabhängig vom Wetter, nur "ist es gerade Nacht"
    chancePer15s: 0.024, // 2,4% pro 15s-Tick, solange gerade Nacht ist
    moneyMultiplier: 2,
    disabled: true,
  },
];
const ENV_MUTATION_BY_ID = Object.fromEntries(ENV_MUTATIONS.map((m) => [m.id, m]));

export {
  RARITIES, RARITY_INDEX, PETS, EGGS, REBIRTHS, WEIGHT_ROLL_TABLE,
  MUTATIONS, MUTATION_BY_ID, ENV_MUTATIONS, ENV_MUTATION_BY_ID,
  rollWeightFactor, moneyMultiplierFromWeightRatio, hugeWeightMultiplier, drawPetFromPool, rollMutation,
  rollHugePetOverride, rollPremiumPet,
  formatNumber, formatDuration, getRarity,
};
