// ============================================================
// Firebase-Setup – NUR für die Online-Rangliste (kein Login, kein Spielstand).
// Der Spielstand bleibt komplett lokal im Browser (siehe game.js).
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, deleteDoc, collection, getDocs, query, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAHdHVVWr7W-GtnvPU3Uvf2fpnLIzk6JQ",
  authDomain: "tierspiel.firebaseapp.com",
  projectId: "tierspiel",
  storageBucket: "tierspiel.firebasestorage.app",
  messagingSenderId: "153533418198",
  appId: "1:153533418198:web:a4b4e6768d89bd8ed81777",
  measurementId: "G-VMNW25DYQK",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, setDoc, deleteDoc, collection, getDocs, query, orderBy, limit };
