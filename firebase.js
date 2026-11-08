import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVDjWRSamm5xChl288274TP20aeJNYjdM",
  authDomain: "baseball-team-desk.firebaseapp.com",
  projectId: "baseball-team-desk",
  storageBucket: "baseball-team-desk.firebasestorage.app",
  messagingSenderId: "413050251121",
  appId: "1:413050251121:web:ad32970236864dac3db8d0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseBridge = {
  app, auth, db,
  get currentUser(){ return auth.currentUser; },
  signIn(email,password){ return signInWithEmailAndPassword(auth,email,password); },
  signOut(){ return signOut(auth); }
};

onAuthStateChanged(auth,user=>{
  window.dispatchEvent(new CustomEvent("firebase-auth-state",{detail:{user:user?{uid:user.uid,email:user.email}:null}}));
});
window.dispatchEvent(new Event("firebase-ready"));
