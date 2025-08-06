// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD3G2Dkn0s611TUM9zGM_1CqjW1RFkUm1Q",
  authDomain: "hapy-474ab.firebaseapp.com",
  projectId: "hapy-474ab",
  storageBucket: "hapy-474ab.firebasestorage.app",
  messagingSenderId: "374678558234",
  appId: "1:374678558234:web:9929e563b5dd33459fa3a3",
  measurementId: "G-ZMF627YT28"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
