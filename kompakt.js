// ============================================================
// Kompakter Spielstand-Code (Einstellungen > Spielstand-Code)
// Ohne diese Umwandlung braucht jedes Tier im Code rund 80 Zeichen (lange Zufalls-ID,
// Gewicht, Geld/Sekunde mit 17 Stellen ...). Hier werden nur die Werte in den Code
// geschrieben, die sich nicht aus den anderen berechnen lassen:
//   - Gewicht und Geld/Sekunde werden beim Einlesen aus Tier, Gewichtsfaktor und Mutationen neu berechnet
//   - die langen Zufalls-IDs werden durch kurze Nummern ersetzt (beim Einlesen entstehen neue IDs)
// Sicherheitsnetz: Beim Erzeugen wird der Code sofort wieder zurückgerechnet und mit dem
// echten Spielstand verglichen. Weicht auch nur ein Wert ab, bleibt es beim bisherigen
// vollständigen Code, es geht also nichts verloren.
// ============================================================
import { PETS, MUTATION_BY_ID, ENV_MUTATION_BY_ID, moneyMultiplierFromWeightRatio } from "./data.js";

const SAVE_KEY = "tierspiel_save_v1";
const KOMPAKT_KEY = SAVE_KEY + "#k";
const TOLERANZ = 1e-9;
const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
const PET_KEYS = ["instanceId", "petId", "weightKg", "ratio", "moneyPerSec", "mutation", "envMutation", "abilityProgressMs", "obtainedAtMs"];

function istZahl(x) { return typeof x === "number" && Number.isFinite(x); }
function nahe(a, b) { return a === b || Math.abs(a - b) <= TOLERANZ * Math.max(Math.abs(a), Math.abs(b)); }

// Aus Tier, Gewichtsfaktor und Mutationen berechnete Werte (gleiche Formeln wie createPetInstance / addIncomingOfferToState).
function abgeleitet(p) {
  const def = PET_BY_ID[p.petId];
  if (!def || !istZahl(p.ratio)) return null;
  const mm = p.mutation ? (MUTATION_BY_ID[p.mutation] || {}).moneyMultiplier : 1;
  const em = p.envMutation ? (ENV_MUTATION_BY_ID[p.envMutation] || {}).moneyMultiplier : 1;
  if (!istZahl(mm) || !istZahl(em)) return null;
  return {
    weightKg: def.baseWeightKg * p.ratio,
    moneyPerSec: def.moneyPercentOfBest !== undefined ? 0 : def.baseMoney * moneyMultiplierFromWeightRatio(p.ratio) * mm * em,
  };
}

// Ein Tier passt ins kompakte Format, wenn es genau die bekannten Felder mit den erwarteten Typen hat.
function einfach(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  const keys = Object.keys(p);
  if (keys.length !== PET_KEYS.length || !PET_KEYS.every((k) => keys.includes(k))) return false;
  return typeof p.instanceId === "string" && typeof p.petId === "string"
    && istZahl(p.weightKg) && istZahl(p.ratio) && istZahl(p.moneyPerSec)
    && (p.mutation === null || typeof p.mutation === "string")
    && (p.envMutation === null || typeof p.envMutation === "string")
    && istZahl(p.abilityProgressMs) && Number.isSafeInteger(p.obtainedAtMs);
}

function packe(state) {
  const kurzIds = new Map();
  const kurz = (id) => {
    if (typeof id !== "string") return id;
    let k = kurzIds.get(id);
    if (k === undefined) { k = kurzIds.size.toString(36); kurzIds.set(id, k); }
    return k;
  };
  const tabelle = (liste) => {
    const t = [];
    return { index: (v) => { if (v === null) return -1; let i = t.indexOf(v); if (i < 0) { i = t.length; t.push(v); } return i; }, liste: t };
  };
  const petTab = tabelle(), mutTab = tabelle(), envTab = tabelle();
  const k = { pi: [], ra: [], mu: [], en: [], ob: [], ap: [], id: [] };
  const x = {}; // Abweichende Werte: Index -> [weightKg, moneyPerSec]
  const r = {}; // Tiere, die nicht ins Schema passen: Index -> unverändertes Tier (nur mit kurzer ID)
  let letzte = 0;
  state.pets.forEach((p, i) => {
    if (!einfach(p)) {
      r[i] = (p && typeof p === "object" && !Array.isArray(p) && typeof p.instanceId === "string") ? { ...p, instanceId: kurz(p.instanceId) } : p;
      k.pi.push(0); k.ra.push(0); k.mu.push(0); k.en.push(0); k.ob.push(0); k.ap.push(0); k.id.push(0);
      return;
    }
    const a = abgeleitet(p);
    if (!a || !nahe(a.weightKg, p.weightKg) || !nahe(a.moneyPerSec, p.moneyPerSec)) x[i] = [p.weightKg, p.moneyPerSec];
    k.pi.push(petTab.index(p.petId));
    k.ra.push(p.ratio);
    k.mu.push(mutTab.index(p.mutation));
    k.en.push(envTab.index(p.envMutation));
    k.ob.push(p.obtainedAtMs - letzte); letzte = p.obtainedAtMs;
    k.ap.push(p.abilityProgressMs);
    k.id.push(kurz(p.instanceId));
  });
  const s = { ...state, pets: 0 }; // Platzhalter, damit die Reihenfolge der Felder gleich bleibt
  if (Array.isArray(state.equipped)) s.equipped = state.equipped.map(kurz);
  if (Array.isArray(state.hatching)) s.hatching = state.hatching.map((h) => (h && typeof h === "object" && typeof h.instanceId === "string" ? { ...h, instanceId: kurz(h.instanceId) } : h));
  const out = { v: 1, s, pt: petTab.liste, mt: mutTab.liste, et: envTab.liste, ...k };
  if (Object.keys(x).length) out.x = x;
  if (Object.keys(r).length) out.r = r;
  return out;
}

function neueId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function entpacke(c) {
  if (!c || c.v !== 1 || !c.s || !Array.isArray(c.pi)) throw new Error("kompakt: unbekanntes Format");
  const ids = new Map();
  const lang = (id) => {
    if (typeof id !== "string") return id;
    let v = ids.get(id);
    if (v === undefined) { v = neueId(); ids.set(id, v); }
    return v;
  };
  const x = c.x || {}, r = c.r || {};
  const pets = [];
  let letzte = 0;
  for (let i = 0; i < c.pi.length; i++) {
    if (Object.prototype.hasOwnProperty.call(r, i)) {
      const p = r[i];
      pets.push(p && typeof p === "object" && !Array.isArray(p) && typeof p.instanceId === "string" ? { ...p, instanceId: lang(p.instanceId) } : p);
      continue;
    }
    letzte += c.ob[i];
    const p = {
      instanceId: lang(c.id[i]),
      petId: c.pt[c.pi[i]],
      weightKg: 0,
      ratio: c.ra[i],
      moneyPerSec: 0,
      mutation: c.mu[i] < 0 ? null : c.mt[c.mu[i]],
      envMutation: c.en[i] < 0 ? null : c.et[c.en[i]],
      abilityProgressMs: c.ap[i],
      obtainedAtMs: letzte,
    };
    if (Object.prototype.hasOwnProperty.call(x, i)) { p.weightKg = x[i][0]; p.moneyPerSec = x[i][1]; }
    else {
      const a = abgeleitet(p);
      if (!a) throw new Error("kompakt: Tier nicht berechenbar");
      p.weightKg = a.weightKg; p.moneyPerSec = a.moneyPerSec;
    }
    pets.push(p);
  }
  const state = { ...c.s, pets };
  if (Array.isArray(c.s.equipped)) state.equipped = c.s.equipped.map(lang);
  if (Array.isArray(c.s.hatching)) state.hatching = c.s.hatching.map((h) => (h && typeof h === "object" && typeof h.instanceId === "string" ? { ...h, instanceId: lang(h.instanceId) } : h));
  return state;
}

// Vergleich zweier Spielstände: IDs nur nach Reihenfolge ihres Auftretens, Zahlen mit winziger Toleranz.
function normalisiere(state) {
  const bekannt = new Set();
  for (const p of state.pets) if (p && typeof p.instanceId === "string") bekannt.add(p.instanceId);
  for (const h of (state.hatching || [])) if (h && typeof h.instanceId === "string") bekannt.add(h.instanceId);
  const nummer = new Map();
  // Feste Reihenfolge der Nummern (erst Tiere, dann Eier), unabhängig von der Feld-Reihenfolge.
  for (const id of bekannt) nummer.set(id, "#" + nummer.size);
  const geh = (v) => {
    if (typeof v === "string") {
      if (!bekannt.has(v)) return v;
      return nummer.get(v);
    }
    if (Array.isArray(v)) return v.map(geh);
    if (v && typeof v === "object") { const o = {}; for (const key of Object.keys(v)) o[key] = geh(v[key]); return o; }
    return v;
  };
  return geh(state);
}
function gleich(a, b) {
  if (typeof a === "number" && typeof b === "number") return nahe(a, b);
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => gleich(v, b[i]));
  if (a && typeof a === "object") {
    if (!b || typeof b !== "object" || Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((key) => Object.prototype.hasOwnProperty.call(b, key) && gleich(a[key], b[key]));
  }
  return a === b;
}

// Wird vom Spielstand-Code-Modul (lgh-modul.js) aufgerufen.
window.LGH_PACKEN = {
  // Speicher-Auszug {Schlüssel: Text} vor dem Erzeugen des Codes verkleinern. Im Zweifel unverändert zurückgeben.
  ein(d) {
    try {
      const raw = d[SAVE_KEY];
      if (typeof raw !== "string") return d;
      const state = JSON.parse(raw);
      if (!state || typeof state !== "object" || !Array.isArray(state.pets)) return d;
      const k = packe(state);
      const text = JSON.stringify(k);
      const zurueck = entpacke(JSON.parse(text));
      if (!gleich(normalisiere(state), normalisiere(zurueck))) return d;
      const neu = { ...d };
      delete neu[SAVE_KEY];
      neu[KOMPAKT_KEY] = text;
      return neu;
    } catch (e) {
      return d;
    }
  },
  // Beim Einlesen eines Codes: kompakten Spielstand wieder in das normale Speicher-Format zurückverwandeln.
  aus(d) {
    if (!Object.prototype.hasOwnProperty.call(d, KOMPAKT_KEY)) return d;
    const neu = { ...d };
    neu[SAVE_KEY] = JSON.stringify(entpacke(JSON.parse(neu[KOMPAKT_KEY])));
    delete neu[KOMPAKT_KEY];
    return neu;
  },
  schluessel: KOMPAKT_KEY,
};
