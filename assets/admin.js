(() => {
  "use strict";

  const API_URL =
    "https://script.google.com/macros/s/AKfycbxEXGWrfi3Z26DZHgMRyjLht5mDYk-hGb_BngkJfOJpQ3di6kJLpafVCeejNw4RiPyW/exec";

  const $ = (id) => document.getElementById(id);

  const loginForm = $("loginForm");
  const settingsPanel = $("settingsPanel");
  const statusBox = $("status");
  const saveButton = $("saveButton");
  const logoutButton = $("logoutButton");

  const TOKEN_KEY = "sandwheat_admin_token";

  let revision = 0;
  let busy = false;

  function showStatus(message) {
    if (statusBox) statusBox.textContent = message;
  }

  function setLoggedIn(value) {
    if (loginForm) loginForm.hidden = value;
    if (settingsPanel) settingsPanel.hidden = !value;
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  async function apiGet(action) {
    const response = await fetch(
      `${API_URL}?action=${encodeURIComponent(action)}`,
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async function apiPost(payload) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async function loadSettings() {
    showStatus("Memuat pengaturan dari Google Sheets...");

    const result = await apiGet("cmsSettings");

    if (!result.ok || !result.settings) {
      throw new Error(
        result.error || "Pengaturan gagal dimuat."
      );
    }

    const settings = result.settings;

    revision = Number(result.revision) || 0;

    const fields = [
      "heroTitle",
      "heroSubtitle",
      "aboutTitle",
      "aboutStory",
      "footerText"
    ];

    fields.forEach((key) => {
      const field = $(key);

      if (field) {
        field.value = settings[key] ?? "";
      }
    });

    showStatus("Login berhasil. Pengaturan berhasil dimuat.");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (busy) return;

      const email = $("email")?.value.trim();
      const password = $("password")?.value;

      if (!email || !password) {
        showStatus("Email dan password wajib diisi.");
        return;
      }

      const submitButton = loginForm.querySelector(
        'button[type="submit"]'
      );

      busy = true;
      if (submitButton) submitButton.disabled = true;

      showStatus("Memeriksa login admin...");

      try {
        const result = await apiPost({
          action: "login",
          email,
          password
        });

        if (!result.ok || !result.token) {
          throw new Error(
            result.error || "Email atau password tidak sesuai."
          );
        }

        sessionStorage.setItem(TOKEN_KEY, result.token);
        $("password").value = "";

        setLoggedIn(true);
        await loadSettings();
      } catch (error) {
        sessionStorage.removeItem(TOKEN_KEY);
        setLoggedIn(false);

        showStatus(
          "Login gagal: " + error.message +
          "\nPeriksa konfigurasi login, URL deployment, dan koneksi browser."
        );
      } finally {
        busy = false;
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      if (busy) return;

      const token = getToken();

      if (!token) {
        setLoggedIn(false);
        showStatus("Sesi berakhir. Silakan login kembali.");
        return;
      }

      const settings = {
        heroTitle: $("heroTitle")?.value.trim() || "",
        heroSubtitle: $("heroSubtitle")?.value.trim() || "",
        aboutTitle: $("aboutTitle")?.value.trim() || "",
        aboutStory: $("aboutStory")?.value.trim() || "",
        footerText: $("footerText")?.value.trim() || ""
      };

      busy = true;
      saveButton.disabled = true;
      showStatus("Menyimpan pengaturan...");

      try {
        const result = await apiPost({
          action: "saveSettings",
          token,
          settings,
          revision
        });

        if (!result.ok) {
          throw new Error(
            result.error || "Server menolak penyimpanan."
          );
        }

        revision = Number(result.revision) || revision;

        showStatus(
          "Server mengonfirmasi pengaturan tersimpan. " +
          "Perubahan pada website publik masih perlu diuji."
        );
      } catch (error) {
        showStatus(
          "Penyimpanan belum terkonfirmasi: " + error.message +
          "\nPeriksa koneksi browser dan tab CMS_Settings."
        );
      } finally {
        busy = false;
        saveButton.disabled = false;
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      if (busy) return;

      const token = getToken();

      sessionStorage.removeItem(TOKEN_KEY);
      setLoggedIn(false);

      if (loginForm) loginForm.reset();

      try {
        if (token) {
          await apiPost({
            action: "logout",
            token
          });
        }

        showStatus("Kamu sudah logout.");
      } catch (error) {
        showStatus(
          "Sesi lokal sudah ditutup, tetapi konfirmasi server gagal."
        );
      }
    });
  }

  // Jangan otomatis membuka panel hanya karena token tersimpan.
  setLoggedIn(false);
  showStatus("Panel siap. Silakan login sebagai admin.");
})();
