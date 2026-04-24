import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { encryptText, decryptText } from './crypto.js';

// ==========================================
// 1. 🔍 ELEMENTS & VARIABLES
// ==========================================
const myIdDisplay = document.getElementById('display-my-id');
const dashboardView = document.getElementById('dashboard-view');
const chatView = document.getElementById('chat-view');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-to-dash-btn');
const activeChatIdDisplay = document.getElementById('active-chat-id');
const chatInput = document.querySelector('.chat-input');
const sendBtn = document.querySelectorAll('.action-btn')[2];

let currentUserBCID = "";
let currentChatRoomId = "";
let receiverPublicKey = "";
let chatListener = null;

// ==========================================
// 2. 🔐 AUTH CHECK (With toUpperCase Fix)
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserBCID = user.email.split('@')[0].toUpperCase();
        myIdDisplay.innerText = currentUserBCID;
    } else {
        window.location.href = "index.html";
    }
});

// ==========================================
// 3. 🗺️ NAVIGATION (Dashboard to Vault)
// ==========================================
searchBtn.addEventListener('click', () => {
    const targetId = searchInput.value.trim().toUpperCase();
    if (!targetId.startsWith('BC-') || targetId === currentUserBCID) {
        alert("Invalid ID!"); 
        return;
    }
    openChatVault(targetId);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

backBtn.addEventListener('click', () => {
    chatView.style.display = 'none';
    dashboardView.style.display = 'flex';
    if (chatListener) {
        chatListener(); // Stop listening to old chat
        chatListener = null;
    }
    document.getElementById('chat-box').innerHTML = ''; // Clear screen
});

async function openChatVault(targetId) {
    activeChatIdDisplay.innerText = targetId;
    dashboardView.style.display = 'none';
    chatView.style.display = 'flex';
    
    // Sort to make consistent Room ID
    const array = [currentUserBCID, targetId].sort();
    currentChatRoomId = `${array[0]}_${array[1]}`;

    try {
        const docSnap = await getDoc(doc(db, "users", targetId));
        if (docSnap.exists() && docSnap.data().publicKey) {
            receiverPublicKey = docSnap.data().publicKey;
            startListeningForMessages(currentChatRoomId);
        } else {
            alert("Account keys not found!");
        }
    } catch (e) { console.error("Key fetch error:", e); }
}

// ==========================================
// 4. 📨 SEND LOGIC (With Local Memory Storage)
// ==========================================
sendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text || !receiverPublicKey || !currentChatRoomId) return;

    chatInput.value = "";
    const msgId = Date.now().toString(); // Unique ID for our local memory

    try {
        const encryptedText = await encryptText(text, receiverPublicKey);
        
        // Save unencrypted copy in browser memory so sender can read it
        localStorage.setItem(`msg_${msgId}`, text);

        await addDoc(collection(db, "chats", currentChatRoomId, "messages"), {
            senderId: currentUserBCID,
            message: encryptedText,
            localId: msgId, // This links the DB message to our local memory
            timestamp: serverTimestamp()
        });
    } catch (e) { console.error("Send error:", e); }
});

// ENTER dabane par bhi message send ho (Ye miss hua tha pichli baar!)
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// ==========================================
// 5. 📡 RECEIVE & LONG PRESS GHOST LOGIC
// ==========================================
function startListeningForMessages(roomId) {
    const chatBox = document.getElementById('chat-box');
    
    // Query exact time ke hisab se set ki hai
    const q = query(collection(db, "chats", roomId, "messages"), orderBy("timestamp", "asc"));

    chatListener = onSnapshot(q, async (snapshot) => {
        chatBox.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const msg = doc.data();
            const isMe = msg.senderId === currentUserBCID;
            let displayText = "";

            if (isMe) {
                // Apna bheja hua message local memory se uthao
                displayText = localStorage.getItem(`msg_${msg.localId}`) || "[Securely Dispatched]";
            } else {
                // Samne wale ka message apni Chabi se kholo
                displayText = await decryptText(msg.message);
            }

            const msgDiv = document.createElement('div');
            msgDiv.className = `msg ${isMe ? 'sent' : 'received'}`;
            msgDiv.innerHTML = `<div class="blur-text">${displayText}</div>`;

            // --- LONG PRESS GHOST EFFECT ---
            const reveal = () => msgDiv.classList.add('revealed');
            const hide = () => msgDiv.classList.remove('revealed');

            // Mobile touch events
            msgDiv.addEventListener('touchstart', (e) => { 
                e.preventDefault(); // Copy menu block karta hai
                reveal(); 
            });
            msgDiv.addEventListener('touchend', hide);
            
            // Desktop mouse events
            msgDiv.addEventListener('mousedown', reveal);
            msgDiv.addEventListener('mouseup', hide);
            msgDiv.addEventListener('mouseleave', hide);

            chatBox.appendChild(msgDiv);
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}
