// ============================================================
// Echtes Wetter (Bergisch Gladbach) über Open-Meteo (kostenlos, kein
// API-Key nötig - wichtig, weil hier alles clientseitig liegt und ein
// eingebetteter Key sowieso für jeden im Quelltext sichtbar wäre).
//
// Es gibt keinen eigenen Server/Cron: alle 15 Minuten prüft JEDER Client,
// ob das geteilte Firestore-Dokument "weather/current" abgelaufen ist -
// falls ja, holt genau der Client, der das zuerst bemerkt, die echten
// Daten und schreibt sie (per Transaktion gegen doppeltes Schreiben
// abgesichert) für alle sichtbar weg. Alle anderen lesen nur mit.
//
// firebase.js wird wie bei leaderboard.js/trading.js bewusst erst LAZY
// per dynamic import() geladen, damit ein CDN-Ausfall nicht das ganze
// Spiel mitreißt.
let firebasePromise = null;
function loadFirebase() {
  if (!firebasePromise) firebasePromise = import("./firebase.js");
  return firebasePromise;
}

const WEATHER_DOC_PATH = ["weather", "current"];
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
// Bergisch Gladbach
const LATITUDE = 51.0996;
const LONGITUDE = 7.1281;
// Ab dieser Windgeschwindigkeit (km/h) gilt es als "windig" - nur relevant,
// wenn es gerade weder regnet noch schneit (die haben Vorrang).
const WINDY_THRESHOLD_KMH = 30;

// WMO-Wettercodes (von Open-Meteo verwendet) auf unsere 4 Kategorien
// gemappt. Nebel (45/48) und reines Bewölkt/Klar (0-3) zählen als "sonne"
// (neutraler Normalzustand), außer der Wind ist stark genug für "windig".
const SNOW_CODES = new Set([66, 67, 71, 73, 75, 77, 85, 86]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82, 95, 96, 99]);

function classifyWeather(weatherCode, windSpeedKmh) {
  if (SNOW_CODES.has(weatherCode)) return "schnee";
  if (RAIN_CODES.has(weatherCode)) return "regen";
  if (windSpeedKmh >= WINDY_THRESHOLD_KMH) return "windig";
  return "sonne";
}

async function fetchRealWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=weather_code,is_day,wind_speed_10m&timezone=Europe%2FBerlin`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Wetter-API nicht erreichbar");
  const data = await res.json();
  const current = data.current;
  return {
    condition: classifyWeather(current.weather_code, current.wind_speed_10m),
    isDay: !!current.is_day,
  };
}

// Liefert das aktuell gültige Wetter (aus Firestore) und stößt bei Bedarf
// selbst einen Refresh an - siehe Kommentar oben zum "wer holt's"-Ablauf.
async function ensureWeatherFresh() {
  const { db, doc, getDoc, runTransaction } = await loadFirebase();
  const ref = doc(db, ...WEATHER_DOC_PATH);
  const now = Date.now();

  const snap = await getDoc(ref);
  if (snap.exists() && now < snap.data().validUntilMs) {
    return snap.data();
  }

  let fresh;
  try {
    fresh = await fetchRealWeather();
  } catch {
    // API gerade nicht erreichbar - lieber das alte Wetter (falls
    // vorhanden) weiter anzeigen, als das Spiel damit zu stören.
    return snap.exists() ? snap.data() : null;
  }
  const payload = { ...fresh, fetchedAtMs: now, validUntilMs: now + WEATHER_REFRESH_MS };

  try {
    await runTransaction(db, async (tx) => {
      const current = await tx.get(ref);
      if (current.exists() && now < current.data().validUntilMs) return; // ein anderer Client war schneller
      tx.set(ref, payload);
    });
  } catch {
    // Transaktion fehlgeschlagen (z.B. Konflikt mit einem anderen Client) -
    // nicht schlimm, der nächste Poll versucht es einfach erneut.
  }

  const finalSnap = await getDoc(ref);
  return finalSnap.exists() ? finalSnap.data() : payload;
}

export { ensureWeatherFresh, classifyWeather, WEATHER_REFRESH_MS };
