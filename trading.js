// ============================================================
// Trading – Tiere/Eier/Münzen mit anderen Spielern tauschen, über einen
// kurzen Code oder Link (kein Login). Läuft rein über Firestore-Dokumente,
// siehe Kommentar in game.js zu isValidTradedPet/addIncomingOfferToState:
// ohne Firebase-Auth ist das ein Ehrensystem, kein wasserdichter Schutz vor
// einem absichtlich manipulierten Client.
//
// firebase.js wird wie bei leaderboard.js bewusst erst LAZY per dynamic
// import() geladen, damit ein CDN-Ausfall nicht das ganze Spiel mitreißt.
let firebasePromise = null;
function loadFirebase() {
  if (!firebasePromise) firebasePromise = import("./firebase.js");
  return firebasePromise;
}

const TRADES_COLLECTION = "trades";
// Ohne leicht verwechselbare Zeichen (0/O, 1/I), damit ein per Hand
// abgetippter Code seltener danebengeht.
const TRADE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRADE_CODE_LENGTH = 6;
const TRADE_EXPIRES_MS = 30 * 60 * 1000;

function generateTradeCode() {
  let code = "";
  for (let i = 0; i < TRADE_CODE_LENGTH; i++) {
    code += TRADE_CODE_ALPHABET[Math.floor(Math.random() * TRADE_CODE_ALPHABET.length)];
  }
  return code;
}

function emptyOffer() {
  return { pets: [], eggs: [], coins: 0 };
}

async function createTrade(playerId, playerName) {
  const { db, doc, setDoc } = await loadFirebase();
  const code = generateTradeCode();
  const now = Date.now();
  await setDoc(doc(db, TRADES_COLLECTION, code), {
    code,
    createdAtMs: now,
    expiresAtMs: now + TRADE_EXPIRES_MS,
    status: "open",
    host: { playerId, name: playerName, offer: emptyOffer(), ready: false },
    guest: { playerId: null, name: null, offer: emptyOffer(), ready: false },
  });
  return code;
}

// Gibt "host" oder "guest" zurück, je nachdem, als wer man diesem Trade
// beitritt (bzw. wieder beitritt, falls man selbst schon Host/Gast war).
async function joinTrade(code, playerId, playerName) {
  const { db, doc, getDoc, updateDoc } = await loadFirebase();
  const ref = doc(db, TRADES_COLLECTION, code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Diesen Trade-Code gibt es nicht.");
  const data = snap.data();
  if (data.status !== "open") throw new Error("Dieser Trade ist nicht mehr aktiv.");
  if (data.host.playerId === playerId) return "host";
  if (data.guest.playerId === playerId) return "guest";
  if (data.guest.playerId) throw new Error("Dieser Trade ist schon voll.");
  await updateDoc(ref, { "guest.playerId": playerId, "guest.name": playerName });
  return "guest";
}

function subscribeTrade(code, onUpdate) {
  let cancelled = false;
  let unsub = () => { cancelled = true; };
  loadFirebase().then(({ db, doc, onSnapshot }) => {
    if (cancelled) return;
    unsub = onSnapshot(doc(db, TRADES_COLLECTION, code), (snap) => {
      onUpdate(snap.exists() ? snap.data() : null);
    });
  });
  return () => unsub();
}

// Ersetzt das eigene Angebot komplett und setzt dabei BEIDE Bereit-Flags
// zurück - verhindert, dass eine Seite ihr Angebot ändert, nachdem die
// andere schon "bereit" gedrückt hat (Last-Second-Swap).
async function updateOwnOffer(code, side, offer) {
  const { db, doc, updateDoc } = await loadFirebase();
  const otherSide = side === "host" ? "guest" : "host";
  await updateDoc(doc(db, TRADES_COLLECTION, code), {
    [`${side}.offer`]: offer,
    [`${side}.ready`]: false,
    [`${otherSide}.ready`]: false,
  });
}

async function setReady(code, side, ready) {
  const { db, doc, updateDoc } = await loadFirebase();
  await updateDoc(doc(db, TRADES_COLLECTION, code), { [`${side}.ready`]: ready });
}

async function cancelTrade(code) {
  const { db, doc, updateDoc } = await loadFirebase();
  await updateDoc(doc(db, TRADES_COLLECTION, code), { status: "cancelled" });
}

// Kippt den Trade genau einmal von "open" auf "completed", wenn beide Seiten
// bereit sind - als Transaktion, damit es egal ist, ob beide Clients das
// gleichzeitig versuchen (nur der erste Transaktions-Commit gewinnt, die
// zweite sieht dann schon status "completed" und tut nichts). Gibt die
// eingefrorenen Angebote zurück, wenn DIESER Aufruf abgeschlossen hat, sonst
// null (z.B. weil eine Seite doch noch nicht bereit ist oder es ein anderer
// Client bereits erledigt hat).
async function tryCompleteTrade(code) {
  const { db, doc, runTransaction } = await loadFirebase();
  const ref = doc(db, TRADES_COLLECTION, code);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.status !== "open") return null;
    if (!(data.host.ready && data.guest.ready)) return null;
    tx.update(ref, { status: "completed", completedAtMs: Date.now() });
    return data;
  });
}

export {
  TRADE_EXPIRES_MS,
  createTrade, joinTrade, subscribeTrade, updateOwnOffer, setReady, cancelTrade, tryCompleteTrade,
};
