/** Master katalog produk toko listrik — dipakai semua menu */
export const CATEGORY_BARCODES = {
  MCB: "CAT-MCB",
  Kabel: "CAT-KABEL",
  Fitting: "CAT-FITTING",
  Saklar: "CAT-SAKLAR",
  "Stop Kontak": "CAT-STOPKONTAK",
  Steker: "CAT-STEKER",
  Panel: "CAT-PANEL",
  Lampu: "CAT-LAMPU",
  Aksesoris: "CAT-AKSESORIS",
};

export const CATEGORY_MODELS = {
  MCB: "/models/mcb.glb",
  Kabel: "/models/kabel_roll.glb",
  Fitting: "/models/fitting_lampu.glb",
  Saklar: "/models/light_switch_3d.glb",
  "Stop Kontak": "/models/power_socket.glb",
  Steker: "/models/ac_socket.glb",
  Panel: "/models/panel_box.glb",
  Lampu: "/models/lampu_led_bulb.glb",
  Aksesoris: "/models/isolasi_listrik.glb",
};

export const CATEGORY_IMAGES = {
  MCB: "/images/products/mcb_schneider_1p.jpg",
  Kabel: "/images/products/kabel_nym_roll.jpg",
  Fitting: "/images/products/fitting_e27_porselen.jpg",
  Saklar: "/images/products/saklar_broco_1g.jpg",
  "Stop Kontak": "/images/products/stopkontak_broco_2l.svg",
  Steker: "/images/products/steker_arde_broco.svg",
  Panel: "/images/products/panel_box_6g.svg",
  Lampu: "/images/products/lampu_led_philips_10w.svg",
  Aksesoris: "/images/products/isolasi_listrik_3m.svg",
};

export const INITIAL_PRODUCTS = [
  // MCB
  {
    id: 1,
    name: "MCB Schneider 20A 1 Phase",
    category: "MCB",
    sku: "MCB-SCH-20A",
    barcode: "MCB-SCH-20A",
    price: 85000,
    cost: 66500,
    stock: 45,
    min_stock: 10,
    unit: "pcs",
    supplier: "PT Schneider",
    model_3d_url: "/models/mcb.glb",
    image_url: "/images/products/mcb_schneider_1p.jpg",
    image: "/images/products/mcb_schneider_1p.jpg",
    specifications: { amp: "20A", pole: "1P" },
  },
  {
    id: 2,
    name: "MCB Schneider 10A 1 Phase",
    category: "MCB",
    sku: "MCB-SCH-10A",
    barcode: "MCB-SCH-10A",
    price: 75000,
    cost: 58500,
    stock: 32,
    min_stock: 10,
    unit: "pcs",
    supplier: "PT Schneider",
    model_3d_url: "/models/mcb.glb",
    image_url: "/images/products/mcb_schneider_1p.jpg",
    image: "/images/products/mcb_schneider_1p.jpg",
    specifications: { amp: "10A", pole: "1P" },
  },
  {
    id: 3,
    name: "MCB Broco 20A 1 Phase",
    category: "MCB",
    sku: "MCB-BRC-20A",
    barcode: "MCB-BRC-20A",
    price: 55000,
    cost: 43000,
    stock: 3,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/modular_circuit_breaker_mcb.glb",
    image_url: "/images/products/mcb_broco_1p.jpg",
    image: "/images/products/mcb_broco_1p.jpg",
    specifications: { amp: "20A", pole: "1P" },
  },
  {
    id: 4,
    name: "MCB Schneider 25A 3 Phase",
    category: "MCB",
    sku: "MCB-SCH-25A3",
    barcode: "MCB-SCH-25A3",
    price: 195000,
    cost: 152000,
    stock: 8,
    min_stock: 5,
    unit: "pcs",
    supplier: "PT Schneider",
    model_3d_url: "/models/modular_circuit_breaker_mcb.glb",
    image_url: "/images/products/mcb_schneider_3p.jpg",
    image: "/images/products/mcb_schneider_3p.jpg",
    specifications: { amp: "25A", pole: "3P" },
  },
  {
    id: 5,
    name: "MCB Schneider 6A 1 Phase",
    category: "MCB",
    sku: "MCB-SCH-6A",
    barcode: "MCB-SCH-6A",
    price: 68000,
    cost: 53000,
    stock: 28,
    min_stock: 10,
    unit: "pcs",
    supplier: "PT Schneider",
    model_3d_url: "/models/mcb.glb",
    image_url: "/images/products/mcb_schneider_1p.jpg",
    image: "/images/products/mcb_schneider_1p.jpg",
    specifications: { amp: "6A", pole: "1P" },
  },
  {
    id: 6,
    name: "MCB Broco 16A 1 Phase",
    category: "MCB",
    sku: "MCB-BRC-16A",
    barcode: "MCB-BRC-16A",
    price: 48000,
    cost: 37500,
    stock: 22,
    min_stock: 10,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/modular_circuit_breaker_mcb.glb",
    image_url: "/images/products/mcb_broco_1p.jpg",
    image: "/images/products/mcb_broco_1p.jpg",
    specifications: { amp: "16A", pole: "1P" },
  },

  // Kabel
  {
    id: 7,
    name: "Kabel NYM 2×2.5mm @50m",
    category: "Kabel",
    sku: "KBL-NYM-25",
    barcode: "KBL-NYM-25",
    price: 285000,
    cost: 222500,
    stock: 12,
    min_stock: 5,
    unit: "roll",
    supplier: "PT Kabelindo",
    model_3d_url: "/models/kabel_roll.glb",
    image_url: "/images/products/kabel_nym_roll.jpg",
    image: "/images/products/kabel_nym_roll.jpg",
    specifications: { type: "NYM", core: "2×2.5mm²" },
  },
  {
    id: 8,
    name: "Kabel NYM 3×2.5mm @50m",
    category: "Kabel",
    sku: "KBL-NYM-325",
    barcode: "KBL-NYM-325",
    price: 385000,
    cost: 300500,
    stock: 8,
    min_stock: 5,
    unit: "roll",
    supplier: "PT Kabelindo",
    model_3d_url: "/models/kabel_roll.glb",
    image_url: "/images/products/kabel_nym_roll.jpg",
    image: "/images/products/kabel_nym_roll.jpg",
    specifications: { type: "NYM", core: "3×2.5mm²" },
  },
  {
    id: 9,
    name: "Kabel NYA 2.5mm @100m",
    category: "Kabel",
    sku: "KBL-NYA-25",
    barcode: "KBL-NYA-25",
    price: 175000,
    cost: 136500,
    stock: 20,
    min_stock: 10,
    unit: "roll",
    supplier: "PT Kabelindo",
    model_3d_url: "/models/kabel_roll.glb",
    image_url: "/images/products/kabel_nya_roll.jpg",
    image: "/images/products/kabel_nya_roll.jpg",
    specifications: { type: "NYA", size: "2.5mm" },
  },
  {
    id: 10,
    name: "Kabel NYA 4mm @100m",
    category: "Kabel",
    sku: "KBL-NYA-4",
    barcode: "KBL-NYA-4",
    price: 280000,
    cost: 218500,
    stock: 15,
    min_stock: 8,
    unit: "roll",
    supplier: "PT Kabelindo",
    model_3d_url: "/models/kabel_roll.glb",
    image_url: "/images/products/kabel_nya_roll.jpg",
    image: "/images/products/kabel_nya_roll.jpg",
    specifications: { type: "NYA", size: "4mm" },
  },
  {
    id: 11,
    name: "Kabel NYY 3×2.5mm @50m",
    category: "Kabel",
    sku: "KBL-NYY-325",
    barcode: "KBL-NYY-325",
    price: 420000,
    cost: 327500,
    stock: 6,
    min_stock: 4,
    unit: "roll",
    supplier: "PT Kabelindo",
    model_3d_url: "/models/kabel_roll.glb",
    image_url: "/images/products/kabel_nyy_roll.jpg",
    image: "/images/products/kabel_nyy_roll.jpg",
    specifications: { type: "NYY", core: "3×2.5mm²" },
  },
  {
    id: 12,
    name: "Kabel Serabut 2×1.5mm @50m",
    category: "Kabel",
    sku: "KBL-SRB-15",
    barcode: "KBL-SRB-15",
    price: 145000,
    cost: 113000,
    stock: 18,
    min_stock: 8,
    unit: "roll",
    supplier: "PT Kabelindo",
    model_3d_url: "/models/kabel_roll.glb",
    image_url: "/images/products/kabel_serabut_roll.jpg",
    image: "/images/products/kabel_serabut_roll.jpg",
    specifications: { type: "Serabut", core: "2×1.5mm²" },
  },

  // Fitting
  {
    id: 13,
    name: "Fitting Lampu E27 Porselen",
    category: "Fitting",
    sku: "FIT-E27",
    barcode: "FIT-E27",
    price: 8500,
    cost: 6500,
    stock: 120,
    min_stock: 25,
    unit: "pcs",
    supplier: "PT Philips",
    model_3d_url: "/models/fitting_lampu.glb",
    image_url: "/images/products/fitting_e27_porselen.jpg",
    image: "/images/products/fitting_e27_porselen.jpg",
    specifications: { base: "E27" },
  },
  {
    id: 14,
    name: "Fitting Lampu GU10 Keramik",
    category: "Fitting",
    sku: "FIT-GU10",
    barcode: "FIT-GU10",
    price: 12500,
    cost: 10000,
    stock: 65,
    min_stock: 20,
    unit: "pcs",
    supplier: "PT Philips",
    model_3d_url: "/models/fitting_lampu.glb",
    image_url: "/images/products/fitting_gu10_keramik.jpg",
    image: "/images/products/fitting_gu10_keramik.jpg",
    specifications: { base: "GU10" },
  },
  {
    id: 15,
    name: "Fitting Gantung E27 Putih",
    category: "Fitting",
    sku: "FIT-GNT-E27",
    barcode: "FIT-GNT-E27",
    price: 15000,
    cost: 11500,
    stock: 40,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/fitting_lampu.glb",
    image_url: "/images/products/fitting_gantung_putih.jpg",
    image: "/images/products/fitting_gantung_putih.jpg",
    specifications: { base: "E27", type: "Gantung" },
  },
  {
    id: 16,
    name: "Fitting Tempel E27 Hitam",
    category: "Fitting",
    sku: "FIT-TMP-E27",
    barcode: "FIT-TMP-E27",
    price: 11000,
    cost: 8500,
    stock: 55,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/fitting_lampu.glb",
    image_url: "/images/products/fitting_tempel_hitam.jpg",
    image: "/images/products/fitting_tempel_hitam.jpg",
    specifications: { base: "E27", type: "Tempel" },
  },

  // Saklar
  {
    id: 17,
    name: "Saklar Broco 1 Gang Putih",
    category: "Saklar",
    sku: "SKL-1G",
    barcode: "SKL-1G",
    price: 18000,
    cost: 14000,
    stock: 55,
    min_stock: 20,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/light_switch_3d.glb",
    image_url: "/images/products/saklar_broco_1g.jpg",
    image: "/images/products/saklar_broco_1g.jpg",
    specifications: { gang: "1" },
  },
  {
    id: 18,
    name: "Saklar Broco 2 Gang Putih",
    category: "Saklar",
    sku: "SKL-2G",
    barcode: "SKL-2G",
    price: 25000,
    cost: 19500,
    stock: 42,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/light_switch.glb",
    image_url: "/images/products/saklar_broco_2g.jpg",
    image: "/images/products/saklar_broco_2g.jpg",
    specifications: { gang: "2" },
  },
  {
    id: 19,
    name: "Saklar Broco 3 Gang Putih",
    category: "Saklar",
    sku: "SKL-3G",
    barcode: "SKL-3G",
    price: 32000,
    cost: 25000,
    stock: 30,
    min_stock: 12,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/light_switch_3d.glb",
    image_url: "/images/products/saklar_broco_3g.svg",
    image: "/images/products/saklar_broco_3g.svg",
    specifications: { gang: "3" },
  },
  {
    id: 20,
    name: "Saklar Schneider 1 Gang",
    category: "Saklar",
    sku: "SKL-SCH-1G",
    barcode: "SKL-SCH-1G",
    price: 45000,
    cost: 35000,
    stock: 20,
    min_stock: 8,
    unit: "pcs",
    supplier: "PT Schneider",
    model_3d_url: "/models/light_switch.glb",
    image_url: "/images/products/saklar_schneider_1g.svg",
    image: "/images/products/saklar_schneider_1g.svg",
    specifications: { gang: "1", brand: "Schneider" },
  },

  // Stop Kontak
  {
    id: 21,
    name: "Stop Kontak Broco 2 Lubang Putih",
    category: "Stop Kontak",
    sku: "STP-2L",
    barcode: "STP-2L",
    price: 22000,
    cost: 17000,
    stock: 38,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/power_socket.glb",
    image_url: "/images/products/stopkontak_broco_2l.svg",
    image: "/images/products/stopkontak_broco_2l.svg",
    specifications: { holes: "2" },
  },
  {
    id: 22,
    name: "Stop Kontak Broco 3 Lubang Putih",
    category: "Stop Kontak",
    sku: "STP-3L",
    barcode: "STP-3L",
    price: 28000,
    cost: 22000,
    stock: 25,
    min_stock: 12,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/uk_double_power_socket.glb",
    image_url: "/images/products/stopkontak_broco_3l.svg",
    image: "/images/products/stopkontak_broco_3l.svg",
    specifications: { holes: "3" },
  },
  {
    id: 23,
    name: "Stop Kontak Schneider 2 Lubang",
    category: "Stop Kontak",
    sku: "STP-SCH-2L",
    barcode: "STP-SCH-2L",
    price: 52000,
    cost: 40500,
    stock: 14,
    min_stock: 8,
    unit: "pcs",
    supplier: "PT Schneider",
    model_3d_url: "/models/power_socket.glb",
    image_url: "/images/products/stopkontak_schneider_2l.svg",
    image: "/images/products/stopkontak_schneider_2l.svg",
    specifications: { holes: "2" },
  },
  {
    id: 24,
    name: "Stop Kontak Outdoor Waterproof",
    category: "Stop Kontak",
    sku: "STP-OUT",
    barcode: "STP-OUT",
    price: 65000,
    cost: 50500,
    stock: 10,
    min_stock: 5,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/ac_socket.glb",
    image_url: "/images/products/stopkontak_outdoor.svg",
    image: "/images/products/stopkontak_outdoor.svg",
    specifications: { type: "Outdoor" },
  },

  // Steker
  {
    id: 25,
    name: "Steker Arde Broco Putih",
    category: "Steker",
    sku: "STK-ARD",
    barcode: "STK-ARD",
    price: 12000,
    cost: 9500,
    stock: 80,
    min_stock: 25,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/ac_socket.glb",
    image_url: "/images/products/steker_arde_broco.svg",
    image: "/images/products/steker_arde_broco.svg",
    specifications: { type: "Arde" },
  },
  {
    id: 26,
    name: "Steker Biasa Broco Putih",
    category: "Steker",
    sku: "STK-BIA",
    barcode: "STK-BIA",
    price: 8000,
    cost: 6000,
    stock: 95,
    min_stock: 30,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/ac_socket.glb",
    image_url: "/images/products/steker_biasa_broco.svg",
    image: "/images/products/steker_biasa_broco.svg",
    specifications: { type: "Biasa" },
  },
  {
    id: 27,
    name: "Steker Multi Uticon 4 Lubang",
    category: "Steker",
    sku: "STK-MUL-4",
    barcode: "STK-MUL-4",
    price: 35000,
    cost: 27500,
    stock: 28,
    min_stock: 10,
    unit: "pcs",
    supplier: "Uticon",
    model_3d_url: "/models/uk_double_power_socket.glb",
    image_url: "/images/products/steker_multi_uticon.svg",
    image: "/images/products/steker_multi_uticon.svg",
    specifications: { holes: "4" },
  },
  {
    id: 28,
    name: "Steker T Terminal 3 Cabang",
    category: "Steker",
    sku: "STK-T3",
    barcode: "STK-T3",
    price: 15000,
    cost: 11500,
    stock: 40,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Broco",
    model_3d_url: "/models/power_socket.glb",
    image_url: "/images/products/steker_t3.svg",
    image: "/images/products/steker_t3.svg",
    specifications: { type: "T-3" },
  },

  // Panel
  {
    id: 29,
    name: "Panel Box 6 Group Metal",
    category: "Panel",
    sku: "PNL-6G",
    barcode: "PNL-6G",
    price: 185000,
    cost: 144500,
    stock: 7,
    min_stock: 5,
    unit: "pcs",
    supplier: "PT Panelindo",
    model_3d_url: "/models/panel_box.glb",
    image_url: "/images/products/panel_box_6g.svg",
    image: "/images/products/panel_box_6g.svg",
    specifications: { groups: "6" },
  },
  {
    id: 30,
    name: "Panel Box 12 Group Metal",
    category: "Panel",
    sku: "PNL-12G",
    barcode: "PNL-12G",
    price: 275000,
    cost: 214500,
    stock: 4,
    min_stock: 3,
    unit: "pcs",
    supplier: "PT Panelindo",
    model_3d_url: "/models/panel_box.glb",
    image_url: "/images/products/panel_box_12g.svg",
    image: "/images/products/panel_box_12g.svg",
    specifications: { groups: "12" },
  },

  // Lampu
  {
    id: 31,
    name: "Lampu LED Philips 10W Cool White",
    category: "Lampu",
    sku: "LED-10W",
    barcode: "LED-10W",
    price: 35000,
    cost: 27500,
    stock: 85,
    min_stock: 20,
    unit: "pcs",
    supplier: "PT Philips",
    model_3d_url: "/models/philips_cfl_led_10w.glb",
    image_url: "/images/products/lampu_led_philips_10w.svg",
    image: "/images/products/lampu_led_philips_10w.svg",
    specifications: {
      watt: "10W",
      color: "Cool White",
      model: "Philips CFL inspired 3D",
    },
  },
  {
    id: 32,
    name: "Lampu LED Philips 20W Warm White",
    category: "Lampu",
    sku: "LED-20W",
    barcode: "LED-20W",
    price: 55000,
    cost: 43000,
    stock: 62,
    min_stock: 15,
    unit: "pcs",
    supplier: "PT Philips",
    model_3d_url: "/models/lampu_led_bulb.glb",
    image_url: "/images/products/lampu_led_philips_20w.svg",
    image: "/images/products/lampu_led_philips_20w.svg",
    specifications: { watt: "20W" },
  },

  // Aksesoris
  {
    id: 33,
    name: "Isolasi Listrik 3M 10m",
    category: "Aksesoris",
    sku: "AKS-ISO",
    barcode: "AKS-ISO",
    price: 12000,
    cost: 9500,
    stock: 200,
    min_stock: 30,
    unit: "pcs",
    supplier: "3M Indonesia",
    model_3d_url: "/models/isolasi_listrik.glb",
    image_url: "/images/products/isolasi_listrik_3m.svg",
    image: "/images/products/isolasi_listrik_3m.svg",
    specifications: { brand: "3M" },
  },
  {
    id: 34,
    name: "Kabel Ties 20cm (100pcs)",
    category: "Aksesoris",
    sku: "AKS-TIE",
    barcode: "AKS-TIE",
    price: 15000,
    cost: 11500,
    stock: 150,
    min_stock: 25,
    unit: "pack",
    supplier: "PT Indo Plastic",
    model_3d_url: "/models/kabel_ties.glb",
    image_url: "/images/products/kabel_ties_20cm.svg",
    image: "/images/products/kabel_ties_20cm.svg",
    specifications: { length: "20cm" },
  },
];

/**
 * Seed history — HANYA hari kemarin ke belakang (bukan hari ini).
 * Jadi KPI "Masuk/Keluar Hari Ini" mulai dari 0 dan hanya naik
 * kalau ada transaksi real di hari yang sama.
 */
export function buildInitialHistory(products) {
  const reasonsIn = ["purchase", "manual", "adjustment"];
  const reasonsOut = ["sale", "manual", "adjustment"];
  const rows = [];
  let id = 1;
  const sample = products.slice(0, 20);
  for (let i = 0; i < 40; i++) {
    const p = sample[i % sample.length];
    const isIn = i % 2 === 0;
    const qty = 2 + (i % 8);
    const change = isIn ? qty : -qty;
    const before = Math.max(0, Number(p.stock) + (isIn ? -qty : qty));
    const after = Math.max(0, before + change);
    const created = new Date();
    // Mulai dari kemarin (i%12)+1 → tidak pernah jatuh di hari ini
    created.setDate(created.getDate() - ((i % 12) + 1));
    created.setHours(8 + (i % 10), (i * 7) % 60, 0, 0);
    rows.push({
      id: id++,
      product_id: p.id,
      product_name: p.name,
      category: p.category,
      sku: p.sku,
      stock_before: before,
      stock_after: after,
      change,
      type: isIn ? "masuk" : "keluar",
      reason: isIn
        ? reasonsIn[i % reasonsIn.length]
        : reasonsOut[i % reasonsOut.length],
      notes: isIn ? "Seed barang masuk" : "Seed barang keluar",
      created_at: created.toISOString(),
    });
  }
  return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function resolveProductImage(product) {
  if (!product) return "/images/products/mcb_schneider_1p.jpg";
  if (product.image_url) return product.image_url;
  if (product.image) return product.image;
  if (CATEGORY_IMAGES[product.category])
    return CATEGORY_IMAGES[product.category];
  return "/images/products/mcb_schneider_1p.jpg";
}

export function resolveModelUrl(product) {
  if (!product) return "/models/mcb.glb";
  const name = (product.name || "").toLowerCase();
  const cat = product.category || "";

  // Specific product-level matching
  if (name.includes("ties") || name.includes("kabel tie")) {
    return "/models/kabel_ties.glb";
  }
  if (name.includes("isolasi")) {
    return "/models/isolasi_listrik.glb";
  }
  if (cat === "Lampu") {
    if (name.includes("10w") || name.includes("cfl")) {
      return "/models/philips_cfl_led_10w.glb";
    }
    return "/models/lampu_led_bulb.glb";
  }

  const url = product.model_3d_url;
  // If product has old placeholder models, upgrade to accurate category model
  if (
    url &&
    !url.includes("RobotExpressive") &&
    !url.includes("Astronaut") &&
    !url.includes("NeilArmstrong") &&
    !(cat === "Kabel" && (url.includes("circuit_breaker") || url.includes("mcb"))) &&
    !(cat === "Panel" && (url.includes("circuit_breaker") || url.includes("mcb"))) &&
    !(cat === "Fitting" && url.includes("light_switch")) &&
    !(cat === "Lampu" && url.includes("light_switch")) &&
    !(cat === "Aksesoris" && (url.includes("mcb") || url.includes("circuit_breaker")))
  ) {
    return url;
  }
  if (CATEGORY_MODELS[cat])
    return CATEGORY_MODELS[cat];
  return "/models/mcb.glb";
}

export const REASON_LABEL = {
  purchase: "Pembelian",
  sale: "Penjualan",
  manual: "Manual",
  ai_scan: "AI",
  adjustment: "Penyesuaian",
};

export function formatDateTimeFull(iso) {
  if (!iso) return { hari: "-", tanggal: "-", jam: "-", full: "-" };
  const d = new Date(iso);
  const hari = d.toLocaleDateString("id-ID", { weekday: "long" });
  const tanggal = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return { hari, tanggal, jam, full: `${hari}, ${tanggal} · ${jam}` };
}
