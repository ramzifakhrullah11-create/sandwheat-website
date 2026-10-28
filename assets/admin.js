(() => {
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbzY87VYeRRiXkdYTmZu7yUNVNCacAwfLI-N6iBkIUVIZa9IhmnuGjqscD2XhiZO5P1R/exec";
  const TOKEN_KEY = "sandwheat_admin_token";
  const DEFAULT_SETTINGS = {
    heroTitle: "Sandwich Gandum, Teman Aktivitasmu",
    heroSubtitle: "Praktis, lezat, dan siap menemani harimu.",
    heroImage: "",
    heroContent: "",
    aboutTitle: "Tentang SANDWHEAT",
    aboutStory: "SANDWHEAT adalah usaha sandwich berbahan roti gandum yang dikembangkan oleh mahasiswa untuk mahasiswa.",
    contactPhone: "08118481107",
    contactWhatsapp: "628118481107",
    contactBusiness: "Jalan Babadan, Yogyakarta",
    primaryColor: "#75C9E7",
    secondaryColor: "#238B57",
    accentColor: "#F4D35E",
    footerText: "SANDWHEAT — Sandwich praktis untuk aktivitasmu.",
    sectionOrder: "menu,about,contact",
    showAbout: true,
    showMenu: true,
    showContact: true,
    revision: 0
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    products: [],
    revision: 0,
    activeView: "dashboard",
    editingProductId: null,
    sessionValid: false,
    loading: false
  };

  const els = {
    appRoot: document.getElementById("appRoot"),
    loginScreen: document.getElementById("loginScreen"),
    pageTitle: document.getElementById("pageTitle"),
    statusBanner: document.getElementById("statusBanner"),
    navItems: Array.from(document.querySelectorAll(".nav-item")),
    saveBtn: document.getElementById("saveBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    loginForm: document.getElementById("loginForm"),
    adminEmail: document.getElementById("adminEmail"),
    adminPassword: document.getElementById("adminPassword"),
    statMenuCount: document.getElementById("statMenuCount"),
    statActiveCount: document.getElementById("statActiveCount"),
    statInactiveCount: document.getElementById("statInactiveCount"),
    statBackend: document.getElementById("statBackend"),
    dashboardSummary: document.getElementById("dashboardSummary"),
    productList: document.getElementById("productList"),
    productForm: document.getElementById("productForm"),
    productEditorTitle: document.getElementById("productEditorTitle"),
    productName: document.getElementById("productName"),
    productCategory: document.getElementById("productCategory"),
    productPrice: document.getElementById("productPrice"),
    productDescription: document.getElementById("productDescription"),
    productImage: document.getElementById("productImage"),
    productActive: document.getElementById("productActive"),
    productAvailable: document.getElementById("productAvailable"),
    saveProductBtn: document.getElementById("saveProductBtn"),
    resetProductBtn: document.getElementById("resetProductBtn"),
    newMenuBtn: document.getElementById("newMenuBtn"),
    previewFrame: document.getElementById("previewFrame")
  };

  const formKeys = [
    "heroTitle", "heroSubtitle", "heroImage", "heroContent",
    "aboutTitle", "aboutStory", "contactPhone", "contactWhatsapp", "contactBusiness",
    "primaryColor", "secondaryColor", "accentColor", "sectionOrder", "footerText",
    "showMenu", "showAbout", "showContact"
  ];

  function readToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function writeToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function setStatus(type, message) {
    const banner = els.statusBanner;
    if (!banner) return;
    banner.className = `flash ${type || ""}`.trim();
    banner.textContent = message || "";
  }

  function setLoading(flag, message) {
    state.loading = flag;
    const actions = [els.saveBtn, els.cancelBtn, els.logoutBtn, els.saveProductBtn, els.newMenuBtn];
    actions.forEach((button) => {
      if (button) button.disabled = flag;
    });
    if (flag && message) setStatus("loading", message);
  }

  function toggleLoginScreen(showApp) {
    if (!els.appRoot || !els.loginScreen) return;
    els.appRoot.hidden = !showApp;
    els.loginScreen.hidden = showApp;
  }

  function updateView(nextView) {
    state.activeView = nextView;
    document.querySelectorAll(".view-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${nextView}View`);
    });
    els.navItems.forEach((nav) => {
      nav.classList.toggle("active", nav.dataset.view === nextView);
    });
    const pageMap = {
      dashboard: "Dashboard",
      menu: "Manajemen Menu",
      homepage: "Homepage",
      about: "About Us",
      contact: "Kontak",
      appearance: "Tampilan Website",
      preview: "Preview Perubahan"
    };
    if (els.pageTitle) els.pageTitle.textContent = pageMap[nextView] || "Dashboard";
  }

  function normalizeSettings(raw) {
    const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
    merged.showAbout = merged.showAbout !== false;
    merged.showMenu = merged.showMenu !== false;
    merged.showContact = merged.showContact !== false;
    merged.revision = Number(merged.revision || 0);
    return merged;
  }

  function normalizeProduct(raw) {
    if (!raw || typeof raw !== "object") return null;
    const candidateId = String(raw.id || raw.productId || raw.slug || "").trim();
    const candidateName = String(raw.name || raw.title || raw.menuName || raw.productName || "").trim();
    if (!candidateId && !candidateName) return null;
    const price = Number(raw.price ?? raw.harga ?? raw.base ?? 0);
    const active = raw.active !== false && raw.isActive !== false && raw.status !== "archived" && raw.status !== "inactive";
    return {
      id: candidateId || candidateName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: candidateName,
      category: String(raw.category || raw.kategori || "Umum").trim(),
      description: String(raw.description || raw.desc || "").trim(),
      image: String(raw.image || raw.img || raw.photo || "").trim(),
      price: Number.isFinite(price) ? price : 0,
      active,
      available: raw.available !== false && raw.isAvailable !== false,
      status: active ? "active" : "inactive"
    };
  }

  function getSettingsFromForm() {
    const settings = { ...state.settings };
    formKeys.forEach((key) => {
      const field = document.getElementById(key);
      if (!field) return;
      if (field.type === "checkbox") settings[key] = Boolean(field.checked);
      else if (field.type === "color") settings[key] = field.value || "#000000";
      else settings[key] = field.value ?? "";
    });
    return normalizeSettings(settings);
  }

  function applySettingsToForm(settings) {
    const safe = normalizeSettings(settings);
    state.settings = safe;
    formKeys.forEach((key) => {
      const field = document.getElementById(key);
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(safe[key]);
      else field.value = safe[key] ?? "";
    });
    renderPreview();
  }

  function resetProductEditor() {
    state.editingProductId = null;
    els.productForm.reset();
    els.productName.value = "";
    els.productCategory.value = "";
    els.productPrice.value = "";
    els.productDescription.value = "";
    els.productImage.value = "";
    els.productActive.checked = true;
    els.productAvailable.checked = true;
    els.productEditorTitle.textContent = "Tambah menu";
  }

  function renderDashboard() {
    const activeCount = state.products.filter((item) => item.active).length;
    const inactiveCount = state.products.length - activeCount;
    const backendStatus = state.sessionValid ? "Aktif" : "Belum login";
    if (els.statMenuCount) els.statMenuCount.textContent = String(state.products.length);
    if (els.statActiveCount) els.statActiveCount.textContent = String(activeCount);
    if (els.statInactiveCount) els.statInactiveCount.textContent = String(inactiveCount);
    if (els.statBackend) els.statBackend.textContent = backendStatus;
    const summary = [
      { label: "Homepage", value: state.settings.heroTitle || "Judul default" },
      { label: "About Us", value: state.settings.aboutTitle || "Tentang SANDWHEAT" },
      { label: "Kontak", value: state.settings.contactPhone || "08118481107" },
      { label: "Footer", value: state.settings.footerText || "SANDWHEAT" }
    ];
    els.dashboardSummary.innerHTML = summary.map((row) => `
      <div class="summary-item"><span>${row.label}</span><strong>${row.value}</strong></div>
    `).join("");
  }

  function renderProducts() {
    if (!state.products.length) {
      els.productList.innerHTML = '<div class="panel-card"><p>Belum ada menu. Tambahkan produk baru untuk mulai.</p></div>';
      return;
    }
    els.productList.innerHTML = state.products.map((product) => `
      <div class="product-tile">
        <img class="product-thumb" src="${product.image || "https://images.unsplash.com/photo-1528735602780-2552fd4c4c?auto=format&fit=crop&w=900&q=80"}" alt="${product.name}" />
        <div class="product-info">
          <strong>${product.name}</strong>
          <div class="product-meta"><span>${product.category || "Umum"}</span><span>Rp ${Number(product.price || 0).toLocaleString("id-ID")}</span></div>
        </div>
        <div class="product-actions">
          <span class="product-pill ${product.active ? "status-active" : "status-inactive"}">${product.active ? "Aktif" : "Nonaktif"}</span>
          <button type="button" data-action="edit" data-id="${product.id}">Edit</button>
          <button type="button" data-action="toggle" data-id="${product.id}">${product.active ? "Nonaktifkan" : "Aktifkan"}</button>
          <button type="button" data-action="delete" data-id="${product.id}">Hapus</button>
        </div>
      </div>
    `).join("");

    els.productList.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const { action, id } = button.dataset;
        const product = state.products.find((item) => item.id === id);
        if (!product) return;
        if (action === "edit") {
          state.editingProductId = product.id;
          els.productEditorTitle.textContent = `Edit menu: ${product.name}`;
          els.productName.value = product.name || "";
          els.productCategory.value = product.category || "";
          els.productPrice.value = product.price || "";
          els.productDescription.value = product.description || "";
          els.productImage.value = product.image || "";
          els.productActive.checked = Boolean(product.active);
          els.productAvailable.checked = Boolean(product.available !== false);
          updateView("menu");
          return;
        }
        if (action === "toggle") {
          await saveProduct({ ...product, active: !product.active, status: !product.active ? "active" : "inactive" });
          return;
        }
        if (action === "delete") {
          if (!window.confirm(`Hapus menu "${product.name}"?`)) return;
          await deleteProduct(product.id);
        }
      });
    });
  }

  function renderPreview() {
    const preview = `
      <div style="display:grid;gap:14px;">
        <div style="padding:18px 20px;border-radius:16px;background:${state.settings.primaryColor || '#75C9E7'};color:#fff;">
          <small style="letter-spacing:0.15em;opacity:0.85;">SANDWHEAT</small>
          <h3 style="margin:10px 0 8px;font-size:2rem;">${state.settings.heroTitle || 'Sandwich Gandum, Teman Aktivitasmu'}</h3>
          <p style="margin:0;line-height:1.6;">${state.settings.heroSubtitle || 'Praktis, lezat, dan siap menemani harimu.'}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:12px;">
          <div style="background:#fff;border:1px solid #dfe9e2;border-radius:12px;padding:16px;"><strong>About</strong><div style="font-size:0.9rem;color:#5d6d62;margin-top:8px;">${state.settings.aboutTitle || 'Tentang SANDWHEAT'}</div></div>
          <div style="background:#fff;border:1px solid #dfe9e2;border-radius:12px;padding:16px;"><strong>Kontak</strong><div style="font-size:0.9rem;color:#5d6d62;margin-top:8px;">${state.settings.contactPhone || '08118481107'}</div></div>
          <div style="background:#fff;border:1px solid #dfe9e2;border-radius:12px;padding:16px;"><strong>Footer</strong><div style="font-size:0.9rem;color:#5d6d62;margin-top:8px;">${state.settings.footerText || 'SANDWHEAT'}</div></div>
        </div>
      </div>
    `;
    if (els.previewFrame) els.previewFrame.innerHTML = preview;
  }

  async function apiRequest(action, payload = {}, method = "POST") {
    const token = readToken();
    const request = { action, ...(payload || {}) };
    if (token) request.token = token;

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };

    const url = method === "GET" ? `${API_URL}?action=${encodeURIComponent(action)}${token ? `&token=${encodeURIComponent(token)}` : ""}` : API_URL;

    const init = {
      method,
      headers,
      mode: "cors",
      cache: "no-store"
    };

    if (method !== "GET") init.body = JSON.stringify(request);

    const response = await fetch(url, init);
    const text = await response.text();
    if (!text) return { ok: response.ok, status: response.status };

    try {
      return JSON.parse(text);
    } catch (error) {
      return { ok: response.ok, raw: text, status: response.status };
    }
  }

  async function validateSession() {
    const token = readToken();
    if (!token) {
      state.sessionValid = false;
      return false;
    }

    const actions = ["checkSession", "session", "validateSession", "whoami", "cmsSettings"];
    for (const action of actions) {
      try {
        const result = await apiRequest(action, {}, "GET");
        const ok = Boolean(
          result && (
            result.ok === true ||
            result.valid === true ||
            result.authenticated === true ||
            result.session === "valid" ||
            result.user ||
            (action === "cmsSettings" && (result.settings || result.data))
          )
        );

        if (ok) {
          state.sessionValid = true;
          return true;
        }

        const errorText = String(result?.error || result?.message || result?.code || "").toLowerCase();
        if (errorText.includes("invalid") || errorText.includes("expired") || errorText.includes("forbidden") || errorText.includes("unauthorized")) {
          break;
        }
      } catch (error) {
        // ignore and continue checking
      }
    }

    state.sessionValid = false;
    return false;
  }

  function clearSession() {
    writeToken("");
    state.sessionValid = false;
  }

  async function loadSiteData() {
    setLoading(true, "Memuat data dari backend...");
    try {
      const settingsResult = await apiRequest("cmsSettings", {}, "GET");
      const productsResult = await apiRequest("products", {}, "GET");

      const settings = normalizeSettings(settingsResult && (settingsResult.settings || settingsResult.data || settingsResult)) || DEFAULT_SETTINGS;
      const remoteProducts = Array.isArray(productsResult && (productsResult.products || productsResult.data))
        ? productsResult.products || productsResult.data
        : [];

      state.settings = settings;
      state.products = remoteProducts.map(normalizeProduct).filter(Boolean);
      state.revision = Number(settings.revision || productsResult?.revision || state.revision || 0);
      applySettingsToForm(state.settings);
      renderDashboard();
      renderProducts();
      setStatus("success", "Data CMS berhasil dimuat.");
    } catch (error) {
      setStatus("error", `Gagal memuat data: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  async function saveSettings() {
    if (!state.sessionValid) {
      setStatus("error", "Sesi admin tidak valid. Silakan login kembali.");
      toggleLoginScreen(true);
      return;
    }

    const payload = getSettingsFromForm();
    setLoading(true, "Menyimpan pengaturan...");
    try {
      const result = await apiRequest("saveSettings", { settings: payload, revision: state.revision }, "POST");
      const ok = result && (result.ok === true || result.success === true || result.saved === true || result.status === "ok");
      if (!ok) throw new Error(result?.error || result?.message || "Server menolak perubahan.");
      state.settings = normalizeSettings(payload);
      state.revision = Number(result.revision || state.revision || 0);
      applySettingsToForm(state.settings);
      renderDashboard();
      setStatus("success", "Pengaturan tersimpan dan dikirim ke backend.");
    } catch (error) {
      setStatus("error", `Penyimpanan gagal: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  async function saveProduct(productInput) {
    if (!state.sessionValid) {
      setStatus("error", "Sesi admin tidak valid. Silakan login kembali.");
      toggleLoginScreen(true);
      return;
    }

    const payload = {
      id: productInput.id || state.editingProductId || String(Date.now()),
      name: productInput.name || "",
      category: productInput.category || "Umum",
      description: productInput.description || "",
      image: productInput.image || "",
      price: Number(productInput.price || 0),
      active: productInput.active !== false,
      available: productInput.available !== false,
      status: productInput.active === false ? "inactive" : "active"
    };

    if (!payload.name) {
      setStatus("error", "Nama menu wajib diisi.");
      return;
    }

    setLoading(true, "Menyimpan menu...");
    try {
      const result = await apiRequest("saveProduct", { product: payload }, "POST");
      const ok = result && (result.ok === true || result.success === true || result.saved === true || result.status === "ok");
      if (!ok) throw new Error(result?.error || result?.message || "Server menolak simpan menu.");
      state.editingProductId = null;
      resetProductEditor();
      await loadSiteData();
      setStatus("success", "Menu berhasil disimpan.");
    } catch (error) {
      setStatus("error", `Menu gagal disimpan: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  async function deleteProduct(productId) {
    if (!state.sessionValid) {
      setStatus("error", "Sesi admin tidak valid. Silakan login kembali.");
      toggleLoginScreen(true);
      return;
    }

    setLoading(true, "Menghapus menu...");
    try {
      const result = await apiRequest("deleteProduct", { id: productId }, "POST");
      const ok = result && (result.ok === true || result.success === true || result.deleted === true || result.status === "ok");
      if (!ok) throw new Error(result?.error || result?.message || "Server gagal menghapus menu.");
      await loadSiteData();
      setStatus("success", "Menu berhasil dihapus.");
    } catch (error) {
      setStatus("error", `Hapus menu gagal: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  async function login(event) {
    event.preventDefault();
    const email = els.adminEmail.value.trim();
    const password = els.adminPassword.value;

    if (!email || !password) {
      setStatus("error", "Email dan password harus diisi.");
      return;
    }

    setLoading(true, "Mencoba login admin...");
    try {
      const result = await apiRequest("login", { email, password }, "POST");
      const token = result?.token || result?.sessionToken || result?.data?.token || result?.data?.sessionToken || "";
      const ok = result && (result.ok === true || result.success === true || result.status === "ok" || Boolean(token));
      if (!ok) throw new Error(result?.error || result?.message || "Kredensial tidak valid.");

      writeToken(token || readToken());
      const verified = await validateSession();
      if (!verified) throw new Error("Backend belum mengonfirmasi sesi yang valid.");

      state.sessionValid = true;
      toggleLoginScreen(true);
      setStatus("success", "Login berhasil.");
      await loadSiteData();
    } catch (error) {
      clearSession();
      toggleLoginScreen(true);
      setStatus("error", `Login gagal: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  async function logout() {
    const token = readToken();
    try {
      if (token) await apiRequest("logout", { token }, "POST");
    } catch (error) {
      // ignore server-side logout error and clear local session
    } finally {
      clearSession();
      state.sessionValid = false;
      toggleLoginScreen(true);
      setStatus("success", "Anda telah logout.");
    }
  }

  function bindEvents() {
    els.navItems.forEach((nav) => nav.addEventListener("click", () => updateView(nav.dataset.view)));
    els.saveBtn.addEventListener("click", saveSettings);
    els.cancelBtn.addEventListener("click", () => applySettingsToForm(state.settings));
    els.logoutBtn.addEventListener("click", logout);
    els.loginForm.addEventListener("submit", login);
    els.newMenuBtn.addEventListener("click", () => { resetProductEditor(); updateView("menu"); });
    els.resetProductBtn.addEventListener("click", resetProductEditor);
    els.productForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        id: state.editingProductId || String(Date.now()),
        name: els.productName.value.trim(),
        category: els.productCategory.value.trim(),
        description: els.productDescription.value.trim(),
        image: els.productImage.value.trim(),
        price: Number(els.productPrice.value || 0),
        active: els.productActive.checked,
        available: els.productAvailable.checked
      };
      await saveProduct(payload);
    });
  }

  async function bootstrap() {
    bindEvents();
    resetProductEditor();
    applySettingsToForm(DEFAULT_SETTINGS);
    renderDashboard();
    renderProducts();
    updateView("dashboard");

    toggleLoginScreen(false);
    setStatus("success", "Panel siap. Silakan login admin.");

    const token = readToken();
    if (!token) return;

    setLoading(true, "Memeriksa sesi admin...");
    try {
      const valid = await validateSession();
      if (!valid) {
        clearSession();
        toggleLoginScreen(false);
        setStatus("error", "Sesi kedaluwarsa atau tidak valid. Silakan login kembali.");
        return;
      }
      state.sessionValid = true;
      toggleLoginScreen(true);
      setStatus("success", "Sesi valid. Dashboard aktif.");
      await loadSiteData();
    } catch (error) {
      clearSession();
      toggleLoginScreen(false);
      setStatus("error", `Validasi sesi gagal: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  bootstrap();
})();
