// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJwcAlXCU7oRdDrhIozL_lHJWM54sSKTo",
  authDomain: "ftfuedu.firebaseapp.com",
  projectId: "ftfuedu",
  storageBucket: "ftfuedu.firebasestorage.app",
  messagingSenderId: "836592822298",
  appId: "1:836592822298:web:af96a04b93e3fba47a49a3",
  measurementId: "G-YNVDTQXY76"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, doc, setDoc, updateDoc, query, where };