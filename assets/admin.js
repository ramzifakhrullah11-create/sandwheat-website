(() => {
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbxEXGWrfi3Z26DZHgMRyjLht5mDYk-hGb_BngkJfOJpQ3di6kJLpafVCeejNw4RiPyW/exec";
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
    businessInfo: "Jalan Babadan, Yogyakarta",
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

  const state = { settings: { ...DEFAULT_SETTINGS }, products: [], revision: 0, activeView: "dashboard", editingProductId: null };

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
    statRevision: document.getElementById("statRevision"),
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

  function readStoredToken() { return sessionStorage.getItem(TOKEN_KEY) || ""; }

  function setStatus(type, message) {
    if (!els.statusBanner) return;
    els.statusBanner.className = `flash ${type || ""}`.trim();
    els.statusBanner.textContent = message || "";
  }

  function updateView(nextView) {
    state.activeView = nextView;
    document.querySelectorAll(".view-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${nextView}View`);
    });
    els.navItems.forEach((nav) => {
      nav.classList.toggle("active", nav.dataset.view === nextView);
    });
    const pageMap = { dashboard: "Dashboard", menu: "Manajemen Menu", homepage: "Homepage", about: "About Us", contact: "Kontak", appearance: "Tampilan Website", preview: "Preview Perubahan" };
    els.pageTitle.textContent = pageMap[nextView] || "Dashboard";
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
    const id = String(raw.id || raw.productId || raw.slug || "").trim();
    const name = String(raw.name || raw.title || raw.menuName || "").trim();
    if (!id && !name) return null;
    const price = Number(raw.price ?? raw.harga ?? raw.base ?? 0);
    const active = raw.active !== false && raw.isActive !== false && raw.status !== "archived" && raw.status !== "inactive";
    return {
      id: id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      category: String(raw.category || raw.kategori || "Umum").trim(),
      description: String(raw.description || raw.desc || "").trim(),
      image: String(raw.image || raw.img || raw.photo || "").trim(),
      price: Number.isFinite(price) ? price : 0,
      active,
      available: raw.available !== false && raw.isAvailable !== false,
      status: active ? "active" : "inactive"
    };
  }

  function setLoading(flag, text) {
    els.saveBtn.disabled = flag;
    els.cancelBtn.disabled = flag;
    els.logoutBtn.disabled = flag;
    els.saveProductBtn.disabled = flag;
    els.newMenuBtn.disabled = flag;
    if (flag && text) setStatus("loading", text);
  }

  function getSettingsFromForm() {
    const settings = { ...state.settings };
    formKeys.forEach((key) => {
      const field = document.getElementById(key);
      if (!field) return;
      if (field.type === "checkbox") settings[key] = field.checked;
      else if (field.type === "color") settings[key] = field.value || "#000000";
      else settings[key] = field.value;
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
    els.statMenuCount.textContent = String(state.products.length);
    els.statActiveCount.textContent = String(activeCount);
    els.statInactiveCount.textContent = String(inactiveCount);
    els.statRevision.textContent = String(state.revision || 0);
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
    els.previewFrame.innerHTML = preview;
  }

  async function apiGet(action) {
    const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } });
    const text = await response.text();
    let payload = {};
    if (text) { try { payload = JSON.parse(text); } catch { payload = { raw: text }; } }
    if (!response.ok && payload.ok !== true) throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
    return payload;
  }

  async function apiPost(payload) {
    const response = await fetch(API_URL, { method: "POST", cache: "no-store", headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" }, body: JSON.stringify(payload) });
    const text = await response.text();
    let result = {};
    if (text) { try { result = JSON.parse(text); } catch { result = { raw: text }; } }
    if (!response.ok && result.ok !== true) throw new Error(result.error || result.message || `HTTP ${response.status}`);
    return result;
  }

  async function loadSiteData() {
    setLoading(true, "Memuat data dari backend...");
    try {
      const [settingsResult, productsResult] = await Promise.all([
        apiGet("cmsSettings").catch(() => ({ ok: false, settings: {} })),
        apiGet("products").catch(() => ({ ok: false, products: [] }))
      ]);
      const mergedSettings = normalizeSettings(settingsResult?.settings || {});
      const remoteProducts = Array.isArray(productsResult?.products) ? productsResult.products : Array.isArray(productsResult?.data) ? productsResult.data : [];
      state.settings = mergedSettings;
      state.products = remoteProducts.map(normalizeProduct).filter(Boolean);
      state.revision = Number(settingsResult?.revision || mergedSettings.revision || 0);
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
    const token = readStoredToken();
    if (!token) {
      setStatus("error", "Sesi admin berakhir. Silakan login kembali.");
      toggleLoginScreen(true);
      return;
    }
    const payload = getSettingsFromForm();
    setLoading(true, "Menyimpan pengaturan...");
    try {
      const result = await apiPost({ action: "saveSettings", token, settings: payload, revision: state.revision || 0 });
      if (!result.ok) throw new Error(result.error || "Server menolak perubahan.");
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
    const token = readStoredToken();
    if (!token) {
      setStatus("error", "Sesi admin berakhir. Silakan login kembali.");
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
    setLoading(true, "Menyimpan menu...");
    try {
      const result = await apiPost({ action: "saveProduct", token, product: payload });
      if (!result.ok) throw new Error(result.error || "Server menolak simpan menu.");
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
    const token = readStoredToken();
    if (!token) {
      setStatus("error", "Sesi admin berakhir. Silakan login kembali.");
      toggleLoginScreen(true);
      return;
    }
    setLoading(true, "Menghapus menu...");
    try {
      const result = await apiPost({ action: "deleteProduct", token, id: productId });
      if (!result.ok) throw new Error(result.error || "Server gagal menghapus menu.");
      await loadSiteData();
      setStatus("success", "Menu berhasil dihapus.");
    } catch (error) {
      setStatus("error", `Hapus menu gagal: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  function toggleLoginScreen(showLogin) {
    if (showLogin) {
      els.loginScreen.hidden = false;
      els.appRoot.style.display = "none";
      return;
    }
    els.loginScreen.hidden = true;
    els.appRoot.style.display = "flex";
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = els.adminEmail.value.trim();
    const password = els.adminPassword.value;
    if (!email || !password) {
      setStatus("error", "Email dan password harus diisi.");
      return;
    }
    setLoading(true, "Mencoba login admin...");
    try {
      const result = await apiPost({ action: "login", email, password });
      if (!result.ok || !result.token) throw new Error(result.error || "Kredensial tidak valid.");
      sessionStorage.setItem(TOKEN_KEY, result.token);
      els.adminPassword.value = "";
      toggleLoginScreen(false);
      await loadSiteData();
      setStatus("success", "Login berhasil.");
    } catch (error) {
      setStatus("error", `Login gagal: ${error.message}`);
    } finally {
      setLoading(false, "");
    }
  }

  function logout() {
    const token = readStoredToken();
    if (token) apiPost({ action: "logout", token }).catch(() => undefined);
    sessionStorage.removeItem(TOKEN_KEY);
    els.adminEmail.value = "";
    els.adminPassword.value = "";
    toggleLoginScreen(true);
    setStatus("success", "Anda telah logout.");
  }

  function bindEvents() {
    els.navItems.forEach((nav) => nav.addEventListener("click", () => updateView(nav.dataset.view)));
    els.saveBtn.addEventListener("click", saveSettings);
    els.cancelBtn.addEventListener("click", () => applySettingsToForm(state.settings));
    els.logoutBtn.addEventListener("click", logout);
    els.loginForm.addEventListener("submit", handleLogin);
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
      if (!payload.name) {
        setStatus("error", "Nama menu wajib diisi.");
        return;
      }
      await saveProduct(payload);
    });
  }

  function bootstrap() {
    bindEvents();
    resetProductEditor();
    applySettingsToForm(DEFAULT_SETTINGS);
    renderDashboard();
    renderProducts();
    updateView("dashboard");
    if (readStoredToken()) {
      toggleLoginScreen(false);
      loadSiteData();
    } else {
      toggleLoginScreen(true);
      setStatus("success", "Panel siap. Silakan login admin.");
    }
  }

  bootstrap();
})();
