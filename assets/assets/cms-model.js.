const DEFAULT_SETTINGS = {
  heroTitle: "Sandwich Gandum, Teman Aktivitasmu",
  heroSubtitle: "Praktis, lezat, dan siap menemani harimu.",
  aboutTitle: "Tentang SANDWHEAT",
  aboutStory: "SANDWHEAT adalah usaha sandwich berbahan roti gandum yang dikembangkan oleh mahasiswa untuk mahasiswa. Kami hadir bagi mahasiswa dengan aktivitas padat yang membutuhkan makanan praktis, lezat, dan mudah dinikmati di sela-sela perkuliahan. Dengan pilihan isian yang lezat dan sayuran segar, SANDWHEAT ingin menjadi teman makan praktis untuk menemani aktivitas kampus sehari-hari.",
  aboutImage: "",
  contactPhone: "08118481107",
  contactWhatsapp: "628118481107",
  primaryColor: "#75C9E7",
  secondaryColor: "#238B57",
  accentColor: "#F4D35E",
  footerText: "SANDWHEAT — Sandwich praktis untuk aktivitasmu.",
  showAbout: true,
  showMenu: true,
  showContact: true
};

function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

function validateSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Pengaturan tidak valid.");
  }

  const defaults = getDefaultSettings();
  const clean = { ...defaults };

  for (const key of Object.keys(defaults)) {
    if (typeof settings[key] === typeof defaults[key]) {
      clean[key] = settings[key];
    }
  }

  return clean;
}

function validateProduct(product) {
  if (!product || typeof product !== "object") {
    throw new Error("Data produk tidak valid.");
  }

  const id = String(product.id || "").trim();
  const name = String(product.name || "").trim();

  if (!id || !name) {
    throw new Error("ID dan nama produk wajib diisi.");
  }

  return {
    ...product,
    id,
    name
  };
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""), location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

window.SANDWHEAT_CMS = {
  DEFAULT_SETTINGS,
  getDefaultSettings,
  validateSettings,
  validateProduct,
  safeUrl
};
