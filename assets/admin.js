(() => {
  "use strict";

  // Gunakan URL Web App dari Google Apps Script > Deploy > Manage deployments.
  const API_URL =
    "https://script.google.com/macros/s/AKfycbxEXGWrfi3Z26DZHgMRyjLht5mDYk-hGb_BngkJfOJpQ3di6kJLpafVCeejNw4RiPyW/exec";

  const $ = (id) => document.getElementById(id);
  const statusBox = $("status");
  const loginForm = $("loginForm");
  const settingsPanel = $("settingsPanel");
  const saveButton = $("saveButton");
  const logoutButton = $("logoutButton");

  let revision = 0;

  function showStatus(message) {
    if (statusBox) statusBox.textContent = message;
  }

  function setLoggedIn(loggedIn) {
    if (loginForm) loginForm.hidden = loggedIn;
    if (settingsPanel) settingsPanel.hidden = !loggedIn;
  }

  function getToken() {
    return sessionStorage.getItem("sandwheat_admin_token") || "";
  }

  async function requestGet(action) {
    const response = await fetch(
      API_URL + "?action=" + encodeURIComponent(action),
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Server merespons dengan status " + response.status);
    }

    return response.json();
  }

  async function requestPost(payload) {
    // text/plain menghindari preflight CORS untuk request POST.
    // Browser tetap harus mengizinkan pembacaan respons server.
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Server merespons dengan status " + response.status);
    }

    return response.json();
  }

  async function loadSettings() {
    showStatus("Memuat pengaturan website...");

    const data = await requestGet("cmsSettings");

    if (!data.ok || !data.settings) {
      throw new Error(data.error || "Pengaturan tidak berhasil dimuat.");
    }

    const settings = data.settings;
    revision = Number(data.revision) || 0;

    // Isi kolom yang tersedia dengan data dari CMS_Settings.
    for (const key of [
      "heroTitle",
      "heroSubtitle",
      "aboutTitle",
      "aboutStory",
      "footerText"
    ]) {
      const field = $(key);
      if (field) field.value = settings[key] ?? "";
    }

    showStatus("Login berhasil. Pengaturan website berhasil dimuat.");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = $("email")?.value.trim();
      const password = $("password")?.value;

      if (!email || !password) {
        showStatus("Masukkan email dan password admin.");
        return;
      }

      const submitButton = loginForm.querySelector(
        'button[type="submit"]'
      );

      if (submitButton) submitButton.disabled = true;
      showStatus("Memeriksa login...");

      try {
        const data = await requestPost({
          action: "login",
          email,
          password
        });

        if (!data.ok || !data.token) {
          throw new Error(data.error || "Login gagal. Periksa kredensial.");
        }

        sessionStorage.setItem("sandwheat_admin_token", data.token);
        setLoggedIn(true);
        $("password").value = "";

        await loadSettings();
      } catch (error) {
        showStatus(
          "Login/koneksi gagal: " +
          error.message +
          "\nPeriksa URL deployment dan izin akses Google Apps Script."
        );
        sessionStorage.removeItem("sandwheat_admin_token");
        setLoggedIn(false);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const token = getToken();

      if (!token) {
        showStatus("Sesi admin tidak ditemukan. Silakan login kembali.");
        setLoggedIn(false);
        return;
      }

      const settings = {
        heroTitle: $("heroTitle")?.value.trim() || "",
        heroSubtitle: $("heroSubtitle")?.value.trim() || "",
        aboutTitle: $("aboutTitle")?.value.trim() || "",
        aboutStory: $("aboutStory")?.value.trim() || "",
        footerText: $("footerText")?.value.trim() || ""
      };

      saveButton.disabled = true;
      showStatus("Menyimpan pengaturan...");

      try {
        const data = await requestPost({
          action: "saveSettings",
          token,
          settings,
          revision
        });

        if (!data.ok) {
          throw new Error(
            data.error || "Pengaturan gagal disimpan."
          );
        }

        revision = Number(data.revision) || revision;
        showStatus(
          "Pengaturan berhasil disimpan ke Google Sheets. " +
          "Perubahan di website publik perlu dihubungkan dan diuji."
        );
      } catch (error) {
        showStatus(
          "Pengaturan belum dapat dipastikan tersimpan: " +
          error.message +
          "\nPeriksa koneksi browser dan tab CMS_Settings."
        );
      } finally {
        saveButton.disabled = false;
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const token = getToken();

      // Tutup panel secara lokal terlebih dahulu.
      sessionStorage.removeItem("sandwheat_admin_token");
      setLoggedIn(false);
      if (loginForm) loginForm.reset();

      try {
        if (token) {
          await requestPost({ action: "logout", token });
        }
        showStatus("Kamu sudah logout.");
      } catch {
        showStatus(
          "Sesi lokal sudah ditutup. Server tidak dapat dikonfirmasi."
        );
      }
    });
  }

  // Token disimpan hanya untuk sesi tab saat ini.
  // Server tetap memeriksa token setiap kali ada operasi terlindungi.
  setLoggedIn(false);
  showStatus("Panel siap. Silakan login sebagai admin.");
})();
