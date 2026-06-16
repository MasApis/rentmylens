// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// TAMBAHAN: Modul Storage untuk menyimpan gambar resi DP
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDs6RkPfEKFkAHuAO6gXSBQHwrH66fKHEM",
    authDomain: "rentmylens-8438b.firebaseapp.com",
    projectId: "rentmylens-8438b",
    storageBucket: "rentmylens-8438b.firebasestorage.app",
    messagingSenderId: "466559618512",
    appId: "1:466559618512:web:25548d354422c8cce5bdd5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); // EXPORT STORAGE