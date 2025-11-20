// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCvIorMNyO53vmdoK2jtxdUgEeyBsZLFeI",
  authDomain: "ayurvedicdietchart.firebaseapp.com",
  projectId: "ayurvedicdietchart",
  storageBucket: "ayurvedicdietchart.appspot.com", // corrected
  messagingSenderId: "335672243413",
  appId: "1:335672243413:web:a67320783cfa7d5a451e5c",
  measurementId: "G-9N8TTTDZV4"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
