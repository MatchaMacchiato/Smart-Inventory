/** Master katalog produk toko listrik — dipakai semua menu */
export const CATEGORY_BARCODES = {
  MCB: 'CAT-MCB',
  Kabel: 'CAT-KABEL',
  Fitting: 'CAT-FITTING',
  Saklar: 'CAT-SAKLAR',
  'Stop Kontak': 'CAT-STOPKONTAK',
  Steker: 'CAT-STEKER',
  Panel: 'CAT-PANEL',
  Lampu: 'CAT-LAMPU',
  Aksesoris: 'CAT-AKSESORIS',
}

/** Default model 3D per kategori (file di public/models/) */
export const CATEGORY_MODELS = {
  MCB: '/models/mcb.glb',
  Kabel: '/models/modular_circuit_breaker_mcb.glb',
  Fitting: '/models/light_switch.glb',
  Saklar: '/models/light_switch_3d.glb',
  'Stop Kontak': '/models/power_socket.glb',
  Steker: '/models/ac_socket.glb',
  Panel: '/models/modular_circuit_breaker_mcb.glb',
  Lampu: '/models/light_switch.glb',
  Aksesoris: '/models/RobotExpressive.glb',
}

export const INITIAL_PRODUCTS = [
  // MCB
  { id: 1, name: 'MCB Schneider 20A 1 Phase', category: 'MCB', sku: 'MCB-SCH-20A', barcode: 'MCB-SCH-20A', price: 85000, stock: 45, min_stock: 10, unit: 'pcs', supplier: 'PT Schneider', model_3d_url: '/models/mcb.glb', specifications: { amp: '20A', pole: '1P' } },
  { id: 2, name: 'MCB Schneider 10A 1 Phase', category: 'MCB', sku: 'MCB-SCH-10A', barcode: 'MCB-SCH-10A', price: 75000, stock: 32, min_stock: 10, unit: 'pcs', supplier: 'PT Schneider', model_3d_url: '/models/mcb.glb', specifications: { amp: '10A', pole: '1P' } },
  { id: 3, name: 'MCB Broco 20A 1 Phase', category: 'MCB', sku: 'MCB-BRC-20A', barcode: 'MCB-BRC-20A', price: 55000, stock: 3, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { amp: '20A', pole: '1P' } },
  { id: 4, name: 'MCB Schneider 25A 3 Phase', category: 'MCB', sku: 'MCB-SCH-25A3', barcode: 'MCB-SCH-25A3', price: 195000, stock: 8, min_stock: 5, unit: 'pcs', supplier: 'PT Schneider', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { amp: '25A', pole: '3P' } },
  { id: 5, name: 'MCB Schneider 6A 1 Phase', category: 'MCB', sku: 'MCB-SCH-6A', barcode: 'MCB-SCH-6A', price: 68000, stock: 28, min_stock: 10, unit: 'pcs', supplier: 'PT Schneider', model_3d_url: '/models/mcb.glb', specifications: { amp: '6A', pole: '1P' } },
  { id: 6, name: 'MCB Broco 16A 1 Phase', category: 'MCB', sku: 'MCB-BRC-16A', barcode: 'MCB-BRC-16A', price: 48000, stock: 22, min_stock: 10, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { amp: '16A', pole: '1P' } },

  // Kabel (belum ada model kabel khusus → pakai MCB modular sebagai placeholder visual)
  { id: 7, name: 'Kabel NYM 2×2.5mm @50m', category: 'Kabel', sku: 'KBL-NYM-25', barcode: 'KBL-NYM-25', price: 285000, stock: 12, min_stock: 5, unit: 'roll', supplier: 'PT Kabelindo', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { type: 'NYM', core: '2×2.5mm²' } },
  { id: 8, name: 'Kabel NYM 3×2.5mm @50m', category: 'Kabel', sku: 'KBL-NYM-325', barcode: 'KBL-NYM-325', price: 385000, stock: 8, min_stock: 5, unit: 'roll', supplier: 'PT Kabelindo', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { type: 'NYM', core: '3×2.5mm²' } },
  { id: 9, name: 'Kabel NYA 2.5mm @100m', category: 'Kabel', sku: 'KBL-NYA-25', barcode: 'KBL-NYA-25', price: 175000, stock: 20, min_stock: 10, unit: 'roll', supplier: 'PT Kabelindo', model_3d_url: '/models/mcb.glb', specifications: { type: 'NYA', size: '2.5mm' } },
  { id: 10, name: 'Kabel NYA 4mm @100m', category: 'Kabel', sku: 'KBL-NYA-4', barcode: 'KBL-NYA-4', price: 280000, stock: 15, min_stock: 8, unit: 'roll', supplier: 'PT Kabelindo', model_3d_url: '/models/mcb.glb', specifications: { type: 'NYA', size: '4mm' } },
  { id: 11, name: 'Kabel NYY 3×2.5mm @50m', category: 'Kabel', sku: 'KBL-NYY-325', barcode: 'KBL-NYY-325', price: 420000, stock: 6, min_stock: 4, unit: 'roll', supplier: 'PT Kabelindo', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { type: 'NYY', core: '3×2.5mm²' } },
  { id: 12, name: 'Kabel Serabut 2×1.5mm @50m', category: 'Kabel', sku: 'KBL-SRB-15', barcode: 'KBL-SRB-15', price: 145000, stock: 18, min_stock: 8, unit: 'roll', supplier: 'PT Kabelindo', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { type: 'Serabut', core: '2×1.5mm²' } },

  // Fitting
  { id: 13, name: 'Fitting Lampu E27 Porselen', category: 'Fitting', sku: 'FIT-E27', barcode: 'FIT-E27', price: 8500, stock: 120, min_stock: 25, unit: 'pcs', supplier: 'PT Philips', model_3d_url: '/models/light_switch.glb', specifications: { base: 'E27' } },
  { id: 14, name: 'Fitting Lampu GU10 Keramik', category: 'Fitting', sku: 'FIT-GU10', barcode: 'FIT-GU10', price: 12500, stock: 65, min_stock: 20, unit: 'pcs', supplier: 'PT Philips', model_3d_url: '/models/light_switch.glb', specifications: { base: 'GU10' } },
  { id: 15, name: 'Fitting Gantung E27 Putih', category: 'Fitting', sku: 'FIT-GNT-E27', barcode: 'FIT-GNT-E27', price: 15000, stock: 40, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/light_switch_3d.glb', specifications: { base: 'E27', type: 'Gantung' } },
  { id: 16, name: 'Fitting Tempel E27 Hitam', category: 'Fitting', sku: 'FIT-TMP-E27', barcode: 'FIT-TMP-E27', price: 11000, stock: 55, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/light_switch_3d.glb', specifications: { base: 'E27', type: 'Tempel' } },

  // Saklar
  { id: 17, name: 'Saklar Broco 1 Gang Putih', category: 'Saklar', sku: 'SKL-1G', barcode: 'SKL-1G', price: 18000, stock: 55, min_stock: 20, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/light_switch_3d.glb', specifications: { gang: '1' } },
  { id: 18, name: 'Saklar Broco 2 Gang Putih', category: 'Saklar', sku: 'SKL-2G', barcode: 'SKL-2G', price: 25000, stock: 42, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/light_switch.glb', specifications: { gang: '2' } },
  { id: 19, name: 'Saklar Broco 3 Gang Putih', category: 'Saklar', sku: 'SKL-3G', barcode: 'SKL-3G', price: 32000, stock: 30, min_stock: 12, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/light_switch_3d.glb', specifications: { gang: '3' } },
  { id: 20, name: 'Saklar Schneider 1 Gang', category: 'Saklar', sku: 'SKL-SCH-1G', barcode: 'SKL-SCH-1G', price: 45000, stock: 20, min_stock: 8, unit: 'pcs', supplier: 'PT Schneider', model_3d_url: '/models/light_switch.glb', specifications: { gang: '1', brand: 'Schneider' } },

  // Stop Kontak
  { id: 21, name: 'Stop Kontak Broco 2 Lubang Putih', category: 'Stop Kontak', sku: 'STP-2L', barcode: 'STP-2L', price: 22000, stock: 38, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/power_socket.glb', specifications: { holes: '2' } },
  { id: 22, name: 'Stop Kontak Broco 3 Lubang Putih', category: 'Stop Kontak', sku: 'STP-3L', barcode: 'STP-3L', price: 28000, stock: 25, min_stock: 12, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/uk_double_power_socket.glb', specifications: { holes: '3' } },
  { id: 23, name: 'Stop Kontak Schneider 2 Lubang', category: 'Stop Kontak', sku: 'STP-SCH-2L', barcode: 'STP-SCH-2L', price: 52000, stock: 14, min_stock: 8, unit: 'pcs', supplier: 'PT Schneider', model_3d_url: '/models/power_socket.glb', specifications: { holes: '2' } },
  { id: 24, name: 'Stop Kontak Outdoor Waterproof', category: 'Stop Kontak', sku: 'STP-OUT', barcode: 'STP-OUT', price: 65000, stock: 10, min_stock: 5, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/ac_socket.glb', specifications: { type: 'Outdoor' } },

  // Steker
  { id: 25, name: 'Steker Arde Broco Putih', category: 'Steker', sku: 'STK-ARD', barcode: 'STK-ARD', price: 12000, stock: 80, min_stock: 25, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/ac_socket.glb', specifications: { type: 'Arde' } },
  { id: 26, name: 'Steker Biasa Broco Putih', category: 'Steker', sku: 'STK-BIA', barcode: 'STK-BIA', price: 8000, stock: 95, min_stock: 30, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/ac_socket.glb', specifications: { type: 'Biasa' } },
  { id: 27, name: 'Steker Multi Uticon 4 Lubang', category: 'Steker', sku: 'STK-MUL-4', barcode: 'STK-MUL-4', price: 35000, stock: 28, min_stock: 10, unit: 'pcs', supplier: 'Uticon', model_3d_url: '/models/uk_double_power_socket.glb', specifications: { holes: '4' } },
  { id: 28, name: 'Steker T Terminal 3 Cabang', category: 'Steker', sku: 'STK-T3', barcode: 'STK-T3', price: 15000, stock: 40, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', model_3d_url: '/models/power_socket.glb', specifications: { type: 'T-3' } },

  // Panel
  { id: 29, name: 'Panel Box 6 Group Metal', category: 'Panel', sku: 'PNL-6G', barcode: 'PNL-6G', price: 185000, stock: 7, min_stock: 5, unit: 'pcs', supplier: 'PT Panelindo', model_3d_url: '/models/modular_circuit_breaker_mcb.glb', specifications: { groups: '6' } },
  { id: 30, name: 'Panel Box 12 Group Metal', category: 'Panel', sku: 'PNL-12G', barcode: 'PNL-12G', price: 275000, stock: 4, min_stock: 3, unit: 'pcs', supplier: 'PT Panelindo', model_3d_url: '/models/mcb.glb', specifications: { groups: '12' } },

  // Lampu
  { id: 31, name: 'Lampu LED Philips 10W Cool White', category: 'Lampu', sku: 'LED-10W', barcode: 'LED-10W', price: 35000, stock: 85, min_stock: 20, unit: 'pcs', supplier: 'PT Philips', model_3d_url: '/models/light_switch.glb', specifications: { watt: '10W' } },
  { id: 32, name: 'Lampu LED Philips 20W Warm White', category: 'Lampu', sku: 'LED-20W', barcode: 'LED-20W', price: 55000, stock: 62, min_stock: 15, unit: 'pcs', supplier: 'PT Philips', model_3d_url: '/models/light_switch_3d.glb', specifications: { watt: '20W' } },

  // Aksesoris
  { id: 33, name: 'Isolasi Listrik 3M 10m', category: 'Aksesoris', sku: 'AKS-ISO', barcode: 'AKS-ISO', price: 12000, stock: 200, min_stock: 30, unit: 'pcs', supplier: '3M Indonesia', model_3d_url: '/models/RobotExpressive.glb', specifications: { brand: '3M' } },
  { id: 34, name: 'Kabel Ties 20cm (100pcs)', category: 'Aksesoris', sku: 'AKS-TIE', barcode: 'AKS-TIE', price: 15000, stock: 150, min_stock: 25, unit: 'pack', supplier: 'PT Indo Plastic', model_3d_url: '/models/RobotExpressive.glb', specifications: { length: '20cm' } },
]

/**
 * Seed history — HANYA hari kemarin ke belakang (bukan hari ini).
 * Jadi KPI "Masuk/Keluar Hari Ini" mulai dari 0 dan hanya naik
 * kalau ada transaksi real di hari yang sama.
 */
export function buildInitialHistory(products) {
  const reasonsIn = ['purchase', 'manual', 'adjustment']
  const reasonsOut = ['sale', 'manual', 'adjustment']
  const rows = []
  let id = 1
  const sample = products.slice(0, 20)
  for (let i = 0; i < 40; i++) {
    const p = sample[i % sample.length]
    const isIn = i % 2 === 0
    const qty = 2 + (i % 8)
    const change = isIn ? qty : -qty
    const before = Math.max(0, Number(p.stock) + (isIn ? -qty : qty))
    const after = Math.max(0, before + change)
    const created = new Date()
    // Mulai dari kemarin (i%12)+1 → tidak pernah jatuh di hari ini
    created.setDate(created.getDate() - ((i % 12) + 1))
    created.setHours(8 + (i % 10), (i * 7) % 60, 0, 0)
    rows.push({
      id: id++,
      product_id: p.id,
      product_name: p.name,
      category: p.category,
      sku: p.sku,
      stock_before: before,
      stock_after: after,
      change,
      type: isIn ? 'masuk' : 'keluar',
      reason: isIn ? reasonsIn[i % reasonsIn.length] : reasonsOut[i % reasonsOut.length],
      notes: isIn ? 'Seed barang masuk' : 'Seed barang keluar',
      created_at: created.toISOString(),
    })
  }
  return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export function resolveModelUrl(product) {
  if (!product) return '/models/mcb.glb'
  if (product.model_3d_url) return product.model_3d_url
  if (CATEGORY_MODELS[product.category]) return CATEGORY_MODELS[product.category]
  return '/models/mcb.glb'
}

export const REASON_LABEL = {
  purchase: 'Pembelian',
  sale: 'Penjualan',
  manual: 'Manual',
  ai_scan: 'AI',
  adjustment: 'Penyesuaian',
}

export function formatDateTimeFull(iso) {
  if (!iso) return { hari: '-', tanggal: '-', jam: '-', full: '-' }
  const d = new Date(iso)
  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' })
  const tanggal = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return { hari, tanggal, jam, full: `${hari}, ${tanggal} · ${jam}` }
}
