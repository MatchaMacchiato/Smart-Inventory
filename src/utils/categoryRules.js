export const PRIORITY_OPTIONS = ["Tinggi", "Sedang", "Rendah"];
export const PRIORITY_RANK = { Tinggi: 0, Sedang: 1, Rendah: 2 };

export const CATEGORY_THEMES = {
  MCB: {
    color: "#0284C7",
    dark: "#0369A1",
    light: "#E0F2FE",
    border: "#7DD3FC",
    badgeBg: "rgba(2, 132, 199, 0.12)",
    icon: "fa-bolt",
    gradient: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
  },
  Kabel: {
    color: "#7C3AED",
    dark: "#6D28D9",
    light: "#EDE9FE",
    border: "#C4B5FD",
    badgeBg: "rgba(124, 58, 237, 0.12)",
    icon: "fa-plug",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
  },
  Fitting: {
    color: "#EA580C",
    dark: "#C2410C",
    light: "#FFEDD5",
    border: "#FDBA74",
    badgeBg: "rgba(234, 88, 12, 0.12)",
    icon: "fa-lightbulb",
    gradient: "linear-gradient(135deg, #EA580C 0%, #C2410C 100%)",
  },
  Saklar: {
    color: "#059669",
    dark: "#047857",
    light: "#D1FAE5",
    border: "#6EE7B7",
    badgeBg: "rgba(5, 150, 105, 0.12)",
    icon: "fa-toggle-on",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
  },
  "Stop Kontak": {
    color: "#E11D48",
    dark: "#BE123C",
    light: "#FFE4E6",
    border: "#FDA4AF",
    badgeBg: "rgba(225, 29, 72, 0.12)",
    icon: "fa-power-off",
    gradient: "linear-gradient(135deg, #E11D48 0%, #BE123C 100%)",
  },
  Steker: {
    color: "#0891B2",
    dark: "#0E7490",
    light: "#CFFAFE",
    border: "#67E8F9",
    badgeBg: "rgba(8, 145, 178, 0.12)",
    icon: "fa-plug-circle-bolt",
    gradient: "linear-gradient(135deg, #0891B2 0%, #0E7490 100%)",
  },
  Panel: {
    color: "#4F46E5",
    dark: "#3730A3",
    light: "#EEF2FF",
    border: "#A5B4FC",
    badgeBg: "rgba(79, 70, 229, 0.12)",
    icon: "fa-cubes",
    gradient: "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)",
  },
  Lampu: {
    color: "#D97706",
    dark: "#B45309",
    light: "#FEF3C7",
    border: "#FCD34D",
    badgeBg: "rgba(217, 119, 6, 0.14)",
    icon: "fa-sun",
    gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
  },
  Aksesoris: {
    color: "#0D9488",
    dark: "#0F766E",
    light: "#CCFBF1",
    border: "#5EEAD4",
    badgeBg: "rgba(13, 148, 136, 0.12)",
    icon: "fa-toolbox",
    gradient: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
  },
};

const FALLBACK_PALETTES = [
  {
    color: "#2563EB",
    dark: "#1D4ED8",
    light: "#DBEAFE",
    border: "#93C5FD",
    icon: "fa-box",
  },
  {
    color: "#9333EA",
    dark: "#7E22CE",
    light: "#F3E8FF",
    border: "#D8B4FE",
    icon: "fa-tag",
  },
  {
    color: "#D946EF",
    dark: "#C026D3",
    light: "#FAE8FF",
    border: "#F0ABFC",
    icon: "fa-shapes",
  },
  {
    color: "#0284C7",
    dark: "#0369A1",
    light: "#E0F2FE",
    border: "#7DD3FC",
    icon: "fa-layer-group",
  },
  {
    color: "#059669",
    dark: "#047857",
    light: "#D1FAE5",
    border: "#6EE7B7",
    icon: "fa-cube",
  },
];

export function getCategoryTheme(name) {
  const key = normalizeCatName(name);
  if (CATEGORY_THEMES[key]) return CATEGORY_THEMES[key];

  // Case-insensitive lookup
  const match = Object.keys(CATEGORY_THEMES).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  if (match) return CATEGORY_THEMES[match];

  // Deterministic fallback for custom categories
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = (hash << 5) - hash + key.charCodeAt(i);
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  const pal = FALLBACK_PALETTES[idx];
  return {
    ...pal,
    badgeBg: `${pal.color}18`,
    gradient: `linear-gradient(135deg, ${pal.color} 0%, ${pal.dark} 100%)`,
  };
}

export const DEFAULT_CATEGORY_RULES = {
  MCB: {
    margin_pct: 25,
    min_stock: 10,
    lead_time: 3,
    restock_priority: "Tinggi",
    default_supplier: "PT Schneider Electric",
    default_unit: "pcs",
  },
  Kabel: {
    margin_pct: 18,
    min_stock: 5,
    lead_time: 5,
    restock_priority: "Tinggi",
    default_supplier: "PT Kabelindo Murni",
    default_unit: "roll",
  },
  Fitting: {
    margin_pct: 28,
    min_stock: 20,
    lead_time: 2,
    restock_priority: "Sedang",
    default_supplier: "PT Broco Indonesia",
    default_unit: "pcs",
  },
  Saklar: {
    margin_pct: 22,
    min_stock: 15,
    lead_time: 2,
    restock_priority: "Sedang",
    default_supplier: "PT Broco Indonesia",
    default_unit: "pcs",
  },
  "Stop Kontak": {
    margin_pct: 22,
    min_stock: 12,
    lead_time: 2,
    restock_priority: "Sedang",
    default_supplier: "PT Broco Indonesia",
    default_unit: "pcs",
  },
  Steker: {
    margin_pct: 30,
    min_stock: 25,
    lead_time: 2,
    restock_priority: "Rendah",
    default_supplier: "PT Broco Indonesia",
    default_unit: "pcs",
  },
  Panel: {
    margin_pct: 20,
    min_stock: 3,
    lead_time: 7,
    restock_priority: "Tinggi",
    default_supplier: "PT Panelindo Pratama",
    default_unit: "pcs",
  },
  Lampu: {
    margin_pct: 30,
    min_stock: 20,
    lead_time: 2,
    restock_priority: "Sedang",
    default_supplier: "PT Philips Indonesia",
    default_unit: "pcs",
  },
  Aksesoris: {
    margin_pct: 35,
    min_stock: 30,
    lead_time: 2,
    restock_priority: "Rendah",
    default_supplier: "",
    default_unit: "pcs",
  },
};

export function normalizeCatName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findCategory(categories, name) {
  const key = normalizeCatName(name).toLowerCase();
  if (!key) return null;
  return (
    (categories || []).find(
      (c) => normalizeCatName(c.name).toLowerCase() === key,
    ) || null
  );
}

export function suggestedSellPrice(cost, marginPct) {
  const c = Number(cost) || 0;
  const m = Number(marginPct) || 0;
  if (c <= 0) return 0;
  return Math.round((c * (1 + m / 100)) / 500) * 500;
}

export function suggestedCostFromPrice(price, marginPct) {
  const p = Number(price) || 0;
  const m = Number(marginPct) || 0;
  if (p <= 0) return 0;
  const denom = 1 + m / 100;
  if (denom <= 0) return 0;
  return Math.round(p / denom / 500) * 500;
}

export function withCategoryDefaults(row = {}) {
  const extra = DEFAULT_CATEGORY_RULES[row.name] || {
    margin_pct: 25,
    min_stock: 10,
    lead_time: 5,
    restock_priority: "Sedang",
    default_supplier: "",
    default_unit: "pcs",
  };
  return {
    active: true,
    ...extra,
    ...row,
    margin_pct: Number(row.margin_pct ?? extra.margin_pct) || 0,
    min_stock: Number(row.min_stock ?? extra.min_stock) || 0,
    lead_time: Number(row.lead_time ?? extra.lead_time) || 0,
    restock_priority: row.restock_priority || extra.restock_priority,
    default_supplier: row.default_supplier ?? extra.default_supplier ?? "",
    default_unit: row.default_unit || extra.default_unit || "pcs",
  };
}

export function applyCategoryToForm(
  form,
  category,
  { fillPrice = false } = {},
) {
  if (!category) return { ...form };
  const next = { ...form, category: category.name };
  if (
    form.min_stock === "" ||
    form.min_stock == null ||
    Number(form.min_stock) === 0
  ) {
    next.min_stock = category.min_stock;
  }
  if (!form.unit) next.unit = category.default_unit || "pcs";
  if (!String(form.supplier || "").trim())
    next.supplier = category.default_supplier || "";
  if (fillPrice && Number(form.cost) > 0) {
    next.price = suggestedSellPrice(form.cost, category.margin_pct);
  }
  return next;
}
