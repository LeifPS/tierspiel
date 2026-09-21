// ============================================================
// Online-Rangliste (Geld/Sekunde) – geräteübergreifend über Firestore.
// Der eigentliche Spielstand bleibt lokal; hier wird nur ein einzelner
// kleiner Eintrag pro Spieler (Name + Geld/Sek) geteilt.
//
// firebase.js wird bewusst erst LAZY per dynamic import() geladen (nicht
// als normaler Top-Level-Import): Firebase kommt vom Google-CDN, und ein
// fehlgeschlagener Top-Level-Import würde den kompletten Modul-Graph
// (inkl. main.js/game.js) zum Absturz bringen – dann würde bei jedem
// CDN-Ausfall/Adblocker das GANZE Spiel nicht mehr starten, nicht nur die
// Rangliste. Mit dynamic import() bleibt ein Ladefehler ein normaler,
// abfangbarer Promise-Reject.
let firebasePromise = null;
function loadFirebase() {
  if (!firebasePromise) firebasePromise = import("./firebase.js");
  return firebasePromise;
}

const LEADERBOARD_COLLECTION = "leaderboard";
const PLAYER_ID_KEY = "tierspiel_player_id";
const PLAYER_NAME_KEY = "tierspiel_player_name";

function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

function getOrCreatePlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = newId();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function getPlayerName() {
  let name = localStorage.getItem(PLAYER_NAME_KEY);
  if (!name) {
    name = "Spieler" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem(PLAYER_NAME_KEY, name);
  }
  return name;
}

function setPlayerName(name) {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return getPlayerName();
  localStorage.setItem(PLAYER_NAME_KEY, trimmed);
  return trimmed;
}

async function submitScore(moneyPerSec) {
  const { db, doc, setDoc } = await loadFirebase();
  const id = getOrCreatePlayerId();
  const name = getPlayerName();
  await setDoc(doc(db, LEADERBOARD_COLLECTION, id), {
    name,
    moneyPerSec,
    updatedAtMs: Date.now(),
  });
}

async function fetchLeaderboard(max = 50) {
  const { db, collection, getDocs, query, orderBy, limit } = await loadFirebase();
  const q = query(collection(db, LEADERBOARD_COLLECTION), orderBy("moneyPerSec", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Entfernt den eigenen Eintrag komplett (z.B. beim Aktivieren des
// Admin-/Testmodus - der zählt nie für die Rangliste, ein vorher schon
// eingetragener echter Score soll dann auch verschwinden statt nur
// "einzufrieren").
async function deleteScore() {
  const { db, doc, deleteDoc } = await loadFirebase();
  const id = getOrCreatePlayerId();
  await deleteDoc(doc(db, LEADERBOARD_COLLECTION, id));
}

export {
  getOrCreatePlayerId, getPlayerName, setPlayerName, submitScore, fetchLeaderboard, deleteScore,
};
