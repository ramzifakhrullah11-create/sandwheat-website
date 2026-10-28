
(() => {
  "use strict";

  const statusBox = document.getElementById("status");

  function showStatus(message) {
    if (statusBox) statusBox.textContent = message;
  }

  // URL backend akan diisi setelah endpoint dan format respons
  // Google Apps Script selesai diverifikasi.
  const API_URL = "";

  async function checkBackend() {
    if (!API_URL) {
      showStatus(
        "Panel tampil, tetapi backend belum dihubungkan. " +
        "Koneksi akan diaktifkan setelah URL dan format API diverifikasi."
      );
      return;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Backend tidak merespons.");

      const data = await response.json();
      showStatus(
        data && data.ok
          ? "Backend terhubung."
          : "Backend merespons, tetapi format datanya perlu diperiksa."
      );
    } catch (error) {
      showStatus(
        "Belum dapat memverifikasi koneksi backend. " +
        "Periksa URL dan konfigurasi Google Apps Script."
      );
    }
  }

  checkBackend();
})();
