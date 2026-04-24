// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDs8GNvuiYRFowExgmkS-sIxJK-FMY5Vgk",
  authDomain: "private-9f960.firebaseapp.com",
  projectId: "private-9f960",
  storageBucket: "private-9f960.firebasestorage.app",
  messagingSenderId: "574853388736",
  appId: "1:574853388736:web:993402b104fd3a5299d025"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export for other files to use
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 BrokenCorner Backend Connected Successfully!");
