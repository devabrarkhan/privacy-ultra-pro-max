// Web Crypto API Settings
const algoParams = {
    name: "RSA-OAEP",
    modulusLength: 2048, // Bank-level 2048-bit encryption
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
};

// 1. 🔑 Generate Keys (Tala aur Chabi banana)
export async function generateAndStoreKeys() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(algoParams, true, ["encrypt", "decrypt"]);
        
        // Private Key ko browser (session) me save karna taaki hum message khol sakein
        const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
        sessionStorage.setItem("myPrivateKey", JSON.stringify(privateKeyJwk));

        // Public Key ko string me convert karna taaki Firebase pe bhej sakein
        const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
        return JSON.stringify(publicKeyJwk); // Ye firebase pe jayega
        
    } catch (error) {
        console.error("Encryption Error: ", error);
    }
}

// 2. 🔒 Encrypt Message (Message ko kachre me badalna samne wale ke Tale se)
export async function encryptText(text, receiverPublicKeyString) {
    try {
        const receiverKeyJwk = JSON.parse(receiverPublicKeyString);
        const publicKey = await window.crypto.subtle.importKey("jwk", receiverKeyJwk, algoParams, true, ["encrypt"]);
        
        const encodedText = new TextEncoder().encode(text);
        const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encodedText);
        
        // Buffer ko Base64 string me convert karna taaki database me save ho sake
        return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    } catch (error) {
        console.error("Encryption failed:", error);
        return null;
    }
}

// 3. 🔓 Decrypt Message (Kachre ko wapas text me badalna apni Chabi se)
export async function decryptText(encryptedBase64) {
    try {
        const privateKeyString = sessionStorage.getItem("myPrivateKey");
        if (!privateKeyString) return "Error: Private key missing!";

        const privateKeyJwk = JSON.parse(privateKeyString);
        const privateKey = await window.crypto.subtle.importKey("jwk", privateKeyJwk, algoParams, true, ["decrypt"]);

        const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedBytes);
        
        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.error("Decryption failed:", error);
        return "[Locked Message]"; // Agar galat chabi hui toh ye dikhega
    }
}
