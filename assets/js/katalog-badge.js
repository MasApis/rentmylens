import { db } from './firebase-init.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const badgeStatus = document.getElementById("badge-status-m10");
  const btnCek = document.getElementById("btn-cek-m10"); // Tambahkan id="btn-cek-m10" di tag <a> tombolmu
  
  if (!badgeStatus || !btnCek) return;

  const cameraDocRef = doc(db, "cameras", "canon-eos-m10");

  // Pantau status global kamera secara real-time
  onSnapshot(cameraDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data.status === "maintenance") {
        // Mode Rusak / Perbaikan
        badgeStatus.className = "px-3 py-1 bg-gray-200 text-gray-700 rounded-full font-bold text-[10px] uppercase tracking-wide border border-gray-300";
        badgeStatus.innerText = "Maintenance";

        // Matikan Tombol Cek Ketersediaan
        btnCek.removeAttribute("href"); // Hapus link biar gak bisa pindah halaman
        btnCek.style.pointerEvents = "none"; // Matikan fungsi klik
        btnCek.className = "w-full py-3 bg-gray-300 text-gray-500 font-bold rounded-3xl text-center text-xs uppercase cursor-not-allowed shadow-none";
        btnCek.innerText = "Tidak Dapat Disewa";
      } else {
        // Mode Normal / Tersedia
        badgeStatus.className = "px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-[10px] uppercase tracking-wide border border-green-200";
        badgeStatus.innerText = "Tersedia";

        // Hidupkan Tombol Kembali
        btnCek.setAttribute("href", "kamera/canon-eos-m10.html");
        btnCek.style.pointerEvents = "auto";
        btnCek.className = "w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-3xl text-center text-xs uppercase shadow-md hover:opacity-90 transition block";
        btnCek.innerText = "Cek Ketersediaan";
      }
    }
  });
});