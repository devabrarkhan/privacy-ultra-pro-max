// js/ui.js (Updated with Key Storage)
import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { generateAndStoreKeys } from './crypto.js'; 
// 1. 🆔 RANDOM ID GENERATOR (BC-XXXXXX format)
// Yeh function ek unique ID banayega jo 'BC-' se start hoga
export function generateBCID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'BC-';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 2. 🛡️ PANIC GESTURE (Double Tap to Hide)
// Agar screen pe kahin bhi jaldi se double click kiya, toh website Google pe chali jayegi
document.addEventListener('dblclick', () => {
    window.location.href = "https://constabrar.in"; 
});
const loginBtn = document.getElementById('login-btn');
const generateBtn = document.getElementById('generate-id-btn');
const idInput = document.getElementById('anonymous-id');
const passwordInput = document.getElementById('secret-password');

// User details save karne ka function
async function saveUserSetup(bcID) {
    try {
        // 1. Tala aur Chabi banao
        const publicKeyString = await generateAndStoreKeys();
        
        // 2. Sirf Tala (Public Key) database me save karo
        await setDoc(doc(db, "users", bcID), {
            publicKey: publicKeyString,
            lastLogin: new Date().toISOString()
        }, { merge: true });
        
        console.log("Public Key secured in vault!");
    } catch (err) {
        console.error("Key setup failed:", err);
    }
}

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const bcID = idInput.value.trim().toUpperCase();
        const password = passwordInput.value;

        if (!bcID || password.length < 6) {
            alert("Valid ID aur 6-character password zaruri hai!");
            return;
        }

        loginBtn.innerText = "ACCESSING...";
        const fakeEmail = `${bcID}@brokencorner.in`;

        try {
            await signInWithEmailAndPassword(auth, fakeEmail, password);
            await saveUserSetup(bcID); // Login ke baad keys setup
            window.location.href = "chat.html"; 
        } catch (error) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                try {
                    await createUserWithEmailAndPassword(auth, fakeEmail, password);
                    await saveUserSetup(bcID); // Naya account banne ke baad keys setup
                    alert("Vault Created! Tumhari ID set ho gayi hai.");
                    window.location.href = "chat.html";
                } catch (regError) {
                    alert("System Error: " + regError.message);
                }
            } else {
                alert("System Error: " + error.message);
            }
        } finally {
            loginBtn.innerText = "ENTER VAULT";
        }
    });
}

// 4. 🖐️ FINGERPRINT (WebAuthn) - Placeholder
// Yeh biometric prompt dikhane ke liye hai
export async function startBiometricAuth() {
    if (window.PublicKeyCredential) {
        console.log("Fingerprint supported! Hum isse next step mein active karenge.");
    } else {
        console.log("Is browser mein fingerprint kaam nahi karega.");
    }
}
