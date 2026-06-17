// assets/js/checkout.js
import { RENTAL_CONFIG } from './config.js';
import { getUnavailableDates } from './calendar.js';
import { db } from './firebase-init.js';
// PERUBAHAN: Mengganti addDoc menjadi setDoc dan doc
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const inputTanggal = document.getElementById("tanggal-sewa");
  const inputJam = document.getElementById("jam-ambil");
  const checkboxRules = document.getElementById("setuju-rules");
  const btnOrder = document.getElementById("btn-order");
  const elTotalHari = document.getElementById("total-hari");
  const elTotalHarga = document.getElementById("total-harga");
  const infoBox = document.getElementById("info-booking-box");

  if (!infoBox) return;
  if (!inputTanggal) return;

  const cameraId = inputTanggal.dataset.cameraId;
  const cameraName = inputTanggal.dataset.cameraName;
  const hargaPerHari = parseInt(inputTanggal.dataset.price);

  let tanggalTerpilih = [];
  let isSubmitting = false; // PERUBAHAN: Tambahkan state untuk mencegah klik ganda

  const availabilityRef = collection(db, "cameras", cameraId, "availability");
  onSnapshot(availabilityRef, (querySnapshot) => {
    const activeBookedDates = [];
    querySnapshot.forEach((doc) => {
      if (doc.data().status === "booked") {
        const [y, m, d] = doc.id.split('-');
        const dateObj = new Date(y, m - 1, d);
        activeBookedDates.push(dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
      }
    });
    activeBookedDates.sort((a, b) => new Date(a) - new Date(b));
    if (activeBookedDates.length > 0) {
      infoBox.className = "p-4 rounded-2xl text-xs font-semibold mb-3 bg-amber-50 text-amber-800 border border-amber-200";
      infoBox.innerHTML = `⚠️ Kamera sedang disewa tanggal: <br><span class="font-mono text-red-600 block mt-1">${activeBookedDates.join(', ')}</span>`;
    } else {
      infoBox.className = "p-4 rounded-2xl text-xs font-bold mb-3 bg-green-50 text-green-700 text-center shadow-sm";
      infoBox.innerHTML = "✨ Kamera ready, bebas booking! 😎";
    }
  });

  const disabledDates = await getUnavailableDates(cameraId);
  const minDateBound = new Date(Date.now() + RENTAL_CONFIG.minAdvanceBookingHours * 60 * 60 * 1000);

  const picker = flatpickr(inputTanggal, {
    mode: "range",
    minDate: minDateBound,
    dateFormat: "Y-m-d",
    disable: disabledDates,
    onChange: function(selectedDates) {
      tanggalTerpilih = selectedDates;
      if (selectedDates.length === 2) {
        const diffDays = Math.ceil(Math.abs(selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > RENTAL_CONFIG.maxRentalDays) {
          alert(`Maksimal sewa ${RENTAL_CONFIG.maxRentalDays} hari.`);
          picker.clear(); tanggalTerpilih = []; updateKalkulator(0); return;
        }
        updateKalkulator(diffDays);
      } else { updateKalkulator(0); }
      validasiForm();
    }
  });

  function updateKalkulator(hari) {
    if (hari === 0) {
      elTotalHari.innerText = "-"; elTotalHarga.innerText = "Rp 0";
      document.getElementById("total-dp").innerText = "Rp 0"; return;
    }
    const totalHarga = hari * hargaPerHari;
    elTotalHari.innerText = `${hari} Hari`;
    elTotalHarga.innerText = `Rp ${totalHarga.toLocaleString('id-ID')}`;
    document.getElementById("total-dp").innerText = `Rp ${(totalHarga*0.5).toLocaleString('id-ID')} (DP 50%)`;
  }

  function validasiForm() {
    if (isSubmitting) return; // Cegah validasi mengubah warna jika sedang proses

    if (tanggalTerpilih.length === 2 && inputJam.value !== "" && checkboxRules.checked) {
      btnOrder.disabled = false;
      btnOrder.className = "w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md text-center text-sm transition uppercase";
      btnOrder.innerText = "Kirim Bukti TF (via WA)";
    } else {
      btnOrder.disabled = true;
      btnOrder.className = "w-full py-4 bg-gray-400 text-white font-bold rounded-2xl shadow-md text-center text-sm cursor-not-allowed transition uppercase";
      btnOrder.innerText = "Pilih Tanggal, Jam & Setujui";
    }
  }

  inputJam.addEventListener("change", validasiForm);
  checkboxRules.addEventListener("change", validasiForm);

  btnOrder.addEventListener("click", async () => {
    if (tanggalTerpilih.length !== 2 || inputJam.value === "" || isSubmitting) return;

    // PERUBAHAN: Kunci UI Seketika
    isSubmitting = true;
    btnOrder.disabled = true;
    btnOrder.className = "w-full py-4 bg-pink-300 text-white font-bold rounded-2xl shadow-md text-center text-sm cursor-wait transition uppercase";
    btnOrder.innerText = "Memproses Pesanan...";

    const tglMulai = tanggalTerpilih[0].toLocaleDateString('id-ID', { day:'numeric', month:'short' });
    const tglSelesai = tanggalTerpilih[1] ? tanggalTerpilih[1].toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : tglMulai;
    const diffDays = Math.ceil(Math.abs(tanggalTerpilih[1] - tanggalTerpilih[0]) / (1000 * 60 * 60 * 24)) + 1;
    const totalHarga = diffDays * hargaPerHari;

    // PERUBAHAN: Membuat ID Transaksi Idempotent (Anti-Ganda)
    // Format: idKamera_YYYYMMDD_JamAmbil_MenitPesan
    const now = new Date();
    const cleanDate = tanggalTerpilih[0].toISOString().split('T')[0].replace(/-/g, '');
    const cleanTime = inputJam.value.replace(':', '');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    
    // Gabungan string ini memastikan klik di menit yang sama untuk pesanan yang sama akan menghasilkan ID yang sama
    const uniqueTxId = `${cameraId}_${cleanDate}_${cleanTime}_m${currentMinute}`;
    
    const docRef = doc(db, "transactions", uniqueTxId);

    try {
      // Menggunakan setDoc alih-alih addDoc
      await setDoc(docRef, {
        cameraName: cameraName,
        duration: `${diffDays} Hari`,
        dateRange: inputTanggal.value, 
        timeAmbil: inputJam.value,
        totalPrice: totalHarga,
        status: "pending", 
        createdAt: now.toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})
      });

      const teksPesan = `Halo Admin Rentmylens.id, ini detail pesanan & bukti TF DP 50% saya:\n\n` +
                        `• Kamera: ${cameraName}\n` +
                        `• Tanggal: ${tglMulai} s/d ${tglSelesai} (${diffDays} Hari)\n` +
                        `• *Jam Ambil/Kembali: ${inputJam.value} WIB*\n` +
                        `• Sisa Pelunasan di Basecamp: Rp ${(totalHarga*0.5).toLocaleString('id-ID')}\n\n` +
                        `(Saya lampirkan gambar bukti transfer DP 50% di bawah)`;

      const urlWA = `https://api.whatsapp.com/send?phone=${RENTAL_CONFIG.adminWhatsAppNumber}&text=${encodeURIComponent(teksPesan)}`;
      window.open(urlWA, '_blank');

      // Opsional: Reset form setelah sukses
      setTimeout(() => {
        isSubmitting = false;
        picker.clear();
        inputJam.value = "";
        checkboxRules.checked = false;
        validasiForm();
      }, 2000);

    } catch(err) { 
      console.error(err); 
      alert("Terjadi kesalahan sistem, silakan coba lagi.");
      isSubmitting = false;
      validasiForm();
    }
  });
});