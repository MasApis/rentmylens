// js/calendar.js
import { db } from './firebase-init.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Mengambil daftar tanggal yang tidak tersedia (booked, pending, maintenance) dari sub-koleksi kamera
 * @param {string} cameraId - ID/Slug kamera (contoh: 'sony-a7iii')
 * @returns {Promise<Array>} - Array string tanggal ["2026-06-15", "2026-06-16"]
 */
export async function getUnavailableDates(cameraId) {
  const unavailableDates = [];
  
  try {
    // Merujuk langsung ke sub-koleksi availability milik kamera tertentu
    const availabilityRef = collection(db, "cameras", cameraId, "availability");
    const querySnapshot = await getDocs(availabilityRef);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Jika statusnya bukan available, masukkan tanggalnya (ID dokumen adalah YYYY-MM-DD)
      if (data.status && data.status !== "available") {
        unavailableDates.push(doc.id); 
      }
    });
  } catch (error) {
    console.error("Gagal mengambil data ketersediaan Firestore:", error);
  }
  
  return unavailableDates;
}