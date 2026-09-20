// ============================================================
// Firebase-Setup – nutzt dein bestehendes Projekt "tierspiel"
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction,
  serverTimestamp, increment,
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
const auth = getAuth(app);
const db = getFirestore(app);

export {
  app, auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, updateProfile,
  doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp, increment,
};
