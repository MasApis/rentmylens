// assets/js/checkout.js
import { RENTAL_CONFIG } from './config.js';
import { getUnavailableDates } from './calendar.js';
import { db } from './firebase-init.js';
import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const inputTanggal = document.getElementById("tanggal-sewa");
  const inputJam = document.getElementById("jam-ambil"); // BARU
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

  // Validasi mewajibkan inputJam
  function validasiForm() {
    if (tanggalTerpilih.length === 2 && inputJam.value !== "" && checkboxRules.checked) {
      btnOrder.disabled = false;
      btnOrder.className = "w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md text-center text-sm transition";
      btnOrder.innerText = "Kirim Bukti TF (via WA)";
    } else {
      btnOrder.disabled = true;
      btnOrder.className = "w-full py-4 bg-gray-400 text-white font-bold rounded-2xl text-center text-sm cursor-not-allowed";
      btnOrder.innerText = "Lengkapi Form & Setujui Aturan";
    }
  }

  inputJam.addEventListener("change", validasiForm);
  checkboxRules.addEventListener("change", validasiForm);

  btnOrder.addEventListener("click", async () => {
    if (tanggalTerpilih.length !== 2 || inputJam.value === "") return;

    const tglMulai = tanggalTerpilih[0].toLocaleDateString('id-ID', { day:'numeric', month:'short' });
    const tglSelesai = tanggalTerpilih[1] ? tanggalTerpilih[1].toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : tglMulai;
    const diffDays = Math.ceil(Math.abs(tanggalTerpilih[1] - tanggalTerpilih[0]) / (1000 * 60 * 60 * 24)) + 1;
    const totalHarga = diffDays * hargaPerHari;

    try {
      await addDoc(collection(db, "transactions"), {
        cameraName: cameraName,
        duration: `${diffDays} Hari`,
        dateRange: inputTanggal.value, 
        timeAmbil: inputJam.value, // SIMPAN JAM KE DATABASE
        totalPrice: totalHarga,
        status: "pending", 
        createdAt: new Date().toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})
      });
    } catch(err) { console.error(err); }

    const teksPesan = `Halo Admin Rentmylens.id, ini detail pesanan & bukti TF DP 50% saya:\n\n` +
                      `• Kamera: ${cameraName}\n` +
                      `• Tanggal: ${tglMulai} s/d ${tglSelesai} (${diffDays} Hari)\n` +
                      `• *Jam Ambil/Kembali: ${inputJam.value} WIB*\n` +
                      `• Sisa Pelunasan di Basecamp: Rp ${(totalHarga*0.5).toLocaleString('id-ID')}\n\n` +
                      `(Saya lampirkan gambar bukti transfer DP 50% di bawah)`;

    const urlWA = `https://api.whatsapp.com/send?phone=${RENTAL_CONFIG.adminWhatsAppNumber}&text=${encodeURIComponent(teksPesan)}`;
    window.open(urlWA, '_blank');
  });
});