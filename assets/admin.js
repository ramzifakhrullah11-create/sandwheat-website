(() => {
  "use strict";

  const statusBox = document.getElementById("status");
  const loginForm = document.getElementById("loginForm");
  const settingsPanel = document.getElementById("settingsPanel");

  function showStatus(message) {
    if (statusBox) statusBox.textContent = message;
  }

  // Isi URL Web App Google Apps Script yang berakhiran /exec.
  const API_URL = "https://script.google.com/macros/s/AKfycbxEXGWrfi3Z26DZHgMRyjLht5mDYk-hGb_BngkJfOJpQ3di6kJLpafVCeejNw4RiPyW/exec";

  function validApiUrl() {
    try {
      const url = new URL(API_URL);
      return url.origin === "https://script.google.com" &&
        url.pathname.includes("/macros/s/") &&
        url.pathname.endsWith("/exec");
    } catch {
      return false;
    }
  }

  async function checkBackend() {
    if (!validApiUrl()) {
      showStatus("URL Google Apps Script belum diatur.");
      return;
    }

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (data && data.service === "SANDWHEAT order receiver") {
        showStatus("Backend merespons. Login dan penyimpanan CMS belum diaktifkan.");
      } else {
        showStatus("Backend merespons, tetapi format respons perlu diperiksa.");
      }
    } catch {
      showStatus(
        "Respons backend belum dapat dibaca dari browser. " +
        "Login belum diaktifkan; kita perlu memeriksa kompatibilitas koneksi."
      );
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      showStatus(
        "Login belum diaktifkan. Backend saat ini memakai ADMIN_TOKEN, " +
        "bukan login email dan password."
      );
    });
  }

  if (settingsPanel) {
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.addEventListener("click", () => {
        showStatus(
          "Pengaturan belum disimpan. Koneksi penyimpanan CMS harus " +
          "disiapkan terlebih dahulu."
        );
      });
    }
  }

  checkBackend();
})();
