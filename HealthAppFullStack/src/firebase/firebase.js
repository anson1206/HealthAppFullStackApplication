import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCgQAxLLQUMtnooqx5r5_9AmTV6irmFmOw",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "healthapp-45111.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "healthapp-45111",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "healthapp-45111.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1042837733335",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1042837733335:web:df8a01a2da5351b18f9592",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-GGCBQ59FGP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };