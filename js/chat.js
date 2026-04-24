import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { encryptText, decryptText } from './crypto.js'; // decryptText bhi add kiya

// ==========================================
// 1. 🔍 ELEMENTS SELECT KARNA
// ==========================================
const myIdDisplay = document.getElementById('display-my-id');
const dashboardView = document.getElementById('dashboard-view');
const chatView = document.getElementById('chat-view');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-to-dash-btn');
const activeChatIdDisplay = document.getElementById('active-chat-id');

// Chat bhejne ke elements
const chatInput = document.querySelector('.chat-input');
const actionBtns = document.querySelectorAll('.action-btn'); 
const sendBtn = actionBtns[2]; // 3rd button Send wala SVG hai

// Global Variables (Data yaad rakhne ke liye)
let currentUserBCID = "";
let currentChatRoomId = "";
let receiverPublicKey = "";
let chatListener = null; 
// ==========================================
// 2. 🔐 CHECK LOGIN & GET ID
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserBCID = user.email.split('@')[0].toUpperCase();
        myIdDisplay.innerText = currentUserBCID;
        console.log("Logged in as:", currentUserBCID);
    } else {
        window.location.href = "index.html"; // Bina login bhaga do
    }
});

// ==========================================
// 3. 🗺️ NAVIGATION & SEARCH LOGIC
// ==========================================
searchBtn.addEventListener('click', () => {
    const targetId = searchInput.value.trim().toUpperCase();

    if (!targetId.startsWith('BC-')) {
        alert("Sahi ID dalo! ID hamesha BC- se start hoti hai.");
        return;
    }
    if (targetId === currentUserBCID) {
        alert("Khud se kya baat karoge bhai? Kisi aur ka ID dalo!");
        return;
    }

    openChatVault(targetId);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

// Back Button Logic
backBtn.addEventListener('click', () => {
    chatView.style.display = 'none';
    dashboardView.style.display = 'flex';
    activeChatIdDisplay.innerText = "BC-XXXXXX";
    currentChatRoomId = ""; // Room ID clear kar do
    receiverPublicKey = ""; // Key clear kar do

    // 👇 YAHAN AAYEGA WOH MISSING CODE 👇
    if (chatListener) {
        chatListener(); // Purane chat ka listener band kar do (Stop listening)
        chatListener = null;
    }
    document.getElementById('chat-box').innerHTML = ''; // Screen se purani chat clear kar do
});


// ==========================================
// 4. 🚪 OPEN CHAT ROOM & GET PUBLIC KEY
// ==========================================
async function openChatVault(targetId) {
    activeChatIdDisplay.innerText = targetId;
    dashboardView.style.display = 'none';
    chatView.style.display = 'flex';
    
    // Room ID humesha Alphabetical order me banega taaki Abrar aur Mariya ka room ek hi rahe
    const array = [currentUserBCID, targetId].sort();
    currentChatRoomId = `${array[0]}_${array[1]}`;

    try {
        // Samne wale ki Chabi (Public Key) database se mango
        const docSnap = await getDoc(doc(db, "users", targetId));
        if (docSnap.exists() && docSnap.data().publicKey) {
            receiverPublicKey = docSnap.data().publicKey;
            console.log("Target Locked! Public Key mil gayi.");
            chatInput.disabled = false;
            startListeningForMessages(currentChatRoomId); 
        } else {
            alert("Samne wale ka account exist nahi karta ya key nahi hai.");
            chatInput.disabled = true; 
        }
    } catch (error) {
        console.error("Error fetching key:", error);
    }
}

// ==========================================
// 5. 📨 SEND ENCRYPTED MESSAGE LOGIC
// ==========================================
sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !receiverPublicKey || !currentChatRoomId) return;

    chatInput.value = ""; // Message jate hi input box khali kar do

    try {
        // 🔒 Message ko kachre (Ciphertext) me badlo
        const encryptedText = await encryptText(text, receiverPublicKey);

        if (!encryptedText) throw new Error("Encryption fail ho gaya");

        // 🚀 Firebase me message bhej do
        await addDoc(collection(db, "chats", currentChatRoomId, "messages"), {
            senderId: currentUserBCID,
            message: encryptedText, // Ye database me x8Hj... bankar jayega
            timestamp: serverTimestamp()
        });

        console.log("Encrypted message sent!");
        
    } catch (error) {
        console.error("Message nahi gaya:", error);
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});
// ==========================================
// 6. 📡 REAL-TIME RECEIVER ENGINE
// ==========================================
function startListeningForMessages(roomId) {
    const chatBox = document.getElementById('chat-box');
    
    // Database se messages lane ka query (Time ke hisab se line me)
    const q = query(collection(db, "chats", roomId, "messages"), orderBy("timestamp", "asc"));

    // onSnapshot: Jaise hi database me naya message aayega, ye function turant chalega
    chatListener = onSnapshot(q, async (snapshot) => {
        chatBox.innerHTML = ''; // Pehle purane messages hatao taaki duplicate na hon
        
        const messages = snapshot.docs.map(doc => doc.data());

        for (const msg of messages) {
            let displayText = "";
            const isMe = msg.senderId === currentUserBCID;

            if (isMe) {
                // MAHA-FLEX: Humne apna hi message samne wale ke tale se lock kiya tha.
                // Toh hum khud usko nahi padh sakte database se! Isliye ye likha aayega.
                displayText = "[Securely Dispatched]";
            } else {
                // Agar samne wale ne bheja hai, toh apni Chabi se kholo!
                displayText = await decryptText(msg.message);
            }

            // Message ko screen par dikhana (Glassmorphism + Hold to Reveal)
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg ${isMe ? 'sent' : 'received'}`;
            msgDiv.innerHTML = `<div class="blur-text">${displayText}</div>`;
            chatBox.appendChild(msgDiv);
        }

        // Scroll automatically niche chala jaye
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}
