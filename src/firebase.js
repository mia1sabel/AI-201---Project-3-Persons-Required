import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1rc7NN4b_ZA_o8o0wTJWAqf5H441MzQ4",
  authDomain: "lineupiq-7fe09.firebaseapp.com",
  projectId: "lineupiq-7fe09",
  storageBucket: "lineupiq-7fe09.firebasestorage.app",
  messagingSenderId: "977508908189",
  appId: "1:977508908189:web:9611c33cf042713e862874",
  measurementId: "G-HHZ6PE88SE"
};

// Initialize Firebase App instance
const app = initializeApp(firebaseConfig);

// Export instances to sync cleanly with App.jsx
export const auth = getAuth(app);
export const db = getFirestore(app);