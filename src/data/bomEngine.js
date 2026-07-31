/**
 * BOM AI Engine — Rencana Material Otomatis untuk instalasi listrik
 * Rule-based expert system + matching ke stok produk toko.
 */

export const PROJECT_TEMPLATES = [
  {
    id: 'lampu_rumah',
    label: 'Instalasi Lampu Rumah',
    icon: '💡',
    desc: 'Pasang lampu + saklar di rumah',
    fields: [
      { key: 'titik', label: 'Jumlah titik lampu', type: 'number', default: 12, min: 1, max: 100 },
      { key: 'lantai', label: 'Jumlah lantai', type: 'number', default: 1, min: 1, max: 5 },
      { key: 'saklar_ganda', label: 'Pakai saklar 2 gang?', type: 'bool', default: false },
      { key: 'premium', label: 'Material premium (Schneider/Philips)', type: 'bool', default: false },
    ],
  },
  {
    id: 'stopkontak',
    label: 'Instalasi Stop Kontak',
    icon: '🔌',
    desc: 'Pasang stop kontak + steker',
    fields: [
      { key: 'titik', label: 'Jumlah stop kontak', type: 'number', default: 8, min: 1, max: 80 },
      { key: 'outdoor', label: 'Ada outdoor / waterproof?', type: 'bool', default: false },
      { key: 'outdoor_qty', label: 'Qty outdoor (jika ada)', type: 'number', default: 2, min: 0, max: 20 },
      { key: 'premium', label: 'Material premium', type: 'bool', default: false },
    ],
  },
  {
    id: 'panel_mcb',
    label: 'Panel + MCB Baru',
    icon: '⚡',
    desc: 'Pasang panel box + MCB group',
    fields: [
      { key: 'groups', label: 'Jumlah group (MCB)', type: 'number', default: 6, min: 2, max: 24 },
      { key: 'phase', label: 'Fase', type: 'select', options: ['1P', '3P'], default: '1P' },
      { key: 'amp', label: 'Ampere MCB utama', type: 'select', options: ['6A', '10A', '16A', '20A', '25A'], default: '20A' },
      { key: 'premium', label: 'MCB Schneider (premium)', type: 'bool', default: true },
    ],
  },
  {
    id: 'renovasi_kamar',
    label: 'Renovasi 1 Kamar',
    icon: '🏠',
    desc: 'Paket lengkap 1 kamar (lampu + saklar + stop kontak)',
    fields: [
      { key: 'lampu', label: 'Titik lampu', type: 'number', default: 2, min: 1, max: 10 },
      { key: 'stop', label: 'Stop kontak', type: 'number', default: 3, min: 1, max: 10 },
      { key: 'saklar', label: 'Saklar', type: 'number', default: 2, min: 1, max: 6 },
      { key: 'premium', label: 'Material premium', type: 'bool', default: false },
    ],
  },
  {
    id: 'custom',
    label: 'Custom / Bebas',
    icon: '✏️',
    desc: 'Isi deskripsi bebas, AI parse keyword',
    fields: [
      { key: 'prompt', label: 'Deskripsi pekerjaan', type: 'textarea', default: 'Pasang 10 lampu dan 6 stop kontak di rumah 2 lantai' },
      { key: 'premium', label: 'Material premium', type: 'bool', default: false },
    ],
  },
]

/** Preferensi SKU per kebutuhan material */
const SKU_PREFS = {
  mcb_6a: { premium: ['MCB-SCH-6A'], budget: ['MCB-BRC-16A', 'MCB-SCH-6A'] },
  mcb_10a: { premium: ['MCB-SCH-10A'], budget: ['MCB-BRC-16A', 'MCB-SCH-10A'] },
  mcb_16a: { premium: ['MCB-SCH-20A'], budget: ['MCB-BRC-16A', 'MCB-SCH-20A'] },
  mcb_20a: { premium: ['MCB-SCH-20A'], budget: ['MCB-BRC-20A', 'MCB-SCH-20A'] },
  mcb_25a3: { premium: ['MCB-SCH-25A3'], budget: ['MCB-SCH-25A3'] },
  kabel_nym_25: { premium: ['KBL-NYM-25'], budget: ['KBL-NYM-25', 'KBL-SRB-15'] },
  kabel_nym_325: { premium: ['KBL-NYM-325'], budget: ['KBL-NYM-325', 'KBL-NYM-25'] },
  kabel_nya: { premium: ['KBL-NYA-25'], budget: ['KBL-NYA-25', 'KBL-SRB-15'] },
  saklar_1g: { premium: ['SKL-SCH-1G'], budget: ['SKL-1G', 'SKL-SCH-1G'] },
  saklar_2g: { premium: ['SKL-2G'], budget: ['SKL-2G', 'SKL-1G'] },
  stop_2l: { premium: ['STP-SCH-2L'], budget: ['STP-2L', 'STP-SCH-2L'] },
  stop_3l: { premium: ['STP-3L'], budget: ['STP-3L', 'STP-2L'] },
  stop_out: { premium: ['STP-OUT'], budget: ['STP-OUT'] },
  steker: { premium: ['STK-ARD'], budget: ['STK-BIA', 'STK-ARD'] },
  fitting: { premium: ['FIT-E27'], budget: ['FIT-E27', 'FIT-TMP-E27'] },
  lampu: { premium: ['LED-20W', 'LED-10W'], budget: ['LED-10W', 'LED-20W'] },
  panel_6: { premium: ['PNL-6G'], budget: ['PNL-6G'] },
  panel_12: { premium: ['PNL-12G'], budget: ['PNL-12G', 'PNL-6G'] },
  isolasi: { premium: ['AKS-ISO'], budget: ['AKS-ISO'] },
  ties: { premium: ['AKS-TIE'], budget: ['AKS-TIE'] },
}

function pickProduct(products, needKey, premium) {
  const prefs = SKU_PREFS[needKey]
  if (!prefs) return null
  const order = premium ? prefs.premium : prefs.budget
  for (const sku of order) {
    const p = products.find((x) => x.sku === sku)
    if (p) return p
  }
  // fallback: by category keyword
  const catMap = {
    mcb: 'MCB', kabel: 'Kabel', saklar: 'Saklar', stop: 'Stop Kontak',
    steker: 'Steker', fitting: 'Fitting', lampu: 'Lampu', panel: 'Panel', isolasi: 'Aksesoris', ties: 'Aksesoris',
  }
  const prefix = needKey.split('_')[0]
  const cat = catMap[prefix]
  if (cat) return products.find((x) => x.category === cat) || null
  return null
}

function line(product, qty, note, safety = 1.1) {
  if (!product) return null
  const q = Math.max(1, Math.ceil(Number(qty) * safety))
  // roll kabel: qty dihitung meter, unit product = roll
  let finalQty = q
  let unitNote = product.unit
  if (product.category === 'Kabel' && product.unit === 'roll') {
    // asumsi 1 roll ≈ 50m (atau 100m untuk NYA) — qty param dalam meter
    const metersPerRoll = String(product.name).includes('100m') ? 100 : 50
    finalQty = Math.max(1, Math.ceil(q / metersPerRoll))
    unitNote = `roll (~${metersPerRoll}m)`
  }
  const subtotal = finalQty * Number(product.price || 0)
  const stockOk = Number(product.stock || 0) >= finalQty
  return {
    product_id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    qty: finalQty,
    unit: unitNote,
    price: Number(product.price || 0),
    subtotal,
    stock: Number(product.stock || 0),
    stock_ok: stockOk,
    shortage: stockOk ? 0 : finalQty - Number(product.stock || 0),
    note,
  }
}

function parseCustomPrompt(text) {
  const t = String(text || '').toLowerCase()
  const num = (re, def = 0) => {
    const m = t.match(re)
    return m ? Number(m[1]) : def
  }
  return {
    lampu: num(/(?:pasang\s+)?(\d+)\s*(?:titik\s+)?lampu/) || num(/lampu\s*(\d+)/) || (t.includes('lampu') ? 8 : 0),
    stop: num(/(\d+)\s*stop\s*kontak/) || num(/stop\s*kontak\s*(\d+)/) || (t.includes('stop') ? 4 : 0),
    saklar: num(/(\d+)\s*saklar/) || (t.includes('saklar') ? 4 : 0),
    lantai: num(/(\d+)\s*lantai/) || (t.includes('2 lantai') || t.includes('dua lantai') ? 2 : 1),
    mcb: t.includes('mcb') || t.includes('panel'),
    outdoor: t.includes('outdoor') || t.includes('luar'),
  }
}

/**
 * Hitung BOM dari template + params + katalog produk
 */
export function calculateBOM(templateId, params, products) {
  const premium = !!params.premium
  const items = []
  const warnings = []
  let summary = ''

  const add = (needKey, qty, note, safety = 1.1) => {
    const p = pickProduct(products, needKey, premium)
    const row = line(p, qty, note, safety)
    if (row) items.push(row)
    else warnings.push(`Produk untuk ${needKey} tidak ditemukan di katalog`)
  }

  if (templateId === 'lampu_rumah') {
    const titik = Number(params.titik) || 12
    const lantai = Number(params.lantai) || 1
    const dual = !!params.saklar_ganda
    // Kabel: ~8m per titik + 15m riser per lantai
    const meterKabel = titik * 8 + lantai * 15
    add('kabel_nym_25', meterKabel, `${titik} titik × ~8m + riser ${lantai} lantai`, 1.15)
    add('lampu', titik, `${titik} titik lampu LED`, 1.05)
    add('fitting', titik, `Fitting E27 per titik`, 1.05)
    if (dual) {
      const dualQty = Math.ceil(titik / 2)
      add('saklar_2g', dualQty, `Saklar 2 gang (hemat wiring)`, 1.05)
    } else {
      add('saklar_1g', titik, `Saklar 1 gang per titik`, 1.05)
    }
    add('mcb_6a', Math.max(1, Math.ceil(titik / 8)), `MCB lighting group`, 1)
    add('isolasi', Math.ceil(titik / 10), `Isolasi finishing`, 1)
    add('ties', Math.ceil(titik / 15), `Kabel ties`, 1)
    summary = `Instalasi ${titik} titik lampu, ${lantai} lantai${dual ? ', saklar 2 gang' : ''}`
  }

  if (templateId === 'stopkontak') {
    const titik = Number(params.titik) || 8
    const outdoor = !!params.outdoor
    const oq = outdoor ? Number(params.outdoor_qty) || 2 : 0
    const indoor = Math.max(0, titik - oq)
    const meterKabel = titik * 6 + 10
    add('kabel_nym_25', meterKabel, `${titik} stop × ~6m + feeder`, 1.15)
    if (indoor) add('stop_2l', indoor, `Stop kontak indoor`, 1.05)
    if (oq) add('stop_out', oq, `Stop outdoor waterproof`, 1.05)
    add('steker', Math.ceil(titik * 0.5), `Steker cadangan`, 1)
    add('mcb_16a', Math.max(1, Math.ceil(titik / 6)), `MCB power group`, 1)
    add('isolasi', 1, `Isolasi`, 1)
    summary = `Instalasi ${titik} stop kontak${oq ? ` (${oq} outdoor)` : ''}`
  }

  if (templateId === 'panel_mcb') {
    const groups = Number(params.groups) || 6
    const phase = params.phase || '1P'
    const amp = params.amp || '20A'
    const panelKey = groups > 6 ? 'panel_12' : 'panel_6'
    add(panelKey, 1, `Panel box ${groups} group`, 1)
    // main MCB
    if (phase === '3P') add('mcb_25a3', 1, `MCB utama 3 phase`, 1)
    else if (amp === '6A') add('mcb_6a', 1, `MCB utama ${amp}`, 1)
    else if (amp === '10A') add('mcb_10a', 1, `MCB utama ${amp}`, 1)
    else if (amp === '16A') add('mcb_16a', 1, `MCB utama ${amp}`, 1)
    else if (amp === '25A') add('mcb_20a', 1, `MCB utama ~${amp}`, 1)
    else add('mcb_20a', 1, `MCB utama ${amp}`, 1)
    // branch MCBs
    add('mcb_10a', Math.max(1, groups - 1), `MCB cabang (${groups - 1} group)`, 1)
    add('kabel_nym_325', 30, `Feeder panel ~30m`, 1.1)
    add('isolasi', 2, `Isolasi panel`, 1)
    summary = `Panel ${groups} group, fase ${phase}, main ${amp}`
  }

  if (templateId === 'renovasi_kamar') {
    const lampu = Number(params.lampu) || 2
    const stop = Number(params.stop) || 3
    const saklar = Number(params.saklar) || 2
    add('lampu', lampu, `Lampu kamar`, 1.05)
    add('fitting', lampu, `Fitting`, 1.05)
    add('saklar_1g', saklar, `Saklar`, 1.05)
    add('stop_2l', stop, `Stop kontak`, 1.05)
    add('kabel_nym_25', lampu * 6 + stop * 5 + 10, `Kabel kamar`, 1.15)
    add('steker', 2, `Steker`, 1)
    add('isolasi', 1, `Isolasi`, 1)
    add('ties', 1, `Kabel ties`, 1)
    summary = `Renovasi 1 kamar: ${lampu} lampu, ${stop} stop, ${saklar} saklar`
  }

  if (templateId === 'custom') {
    const p = parseCustomPrompt(params.prompt)
    if (p.lampu) {
      add('lampu', p.lampu, `Lampu dari prompt`, 1.05)
      add('fitting', p.lampu, `Fitting`, 1.05)
      add('saklar_1g', p.saklar || p.lampu, `Saklar`, 1.05)
      add('kabel_nym_25', p.lampu * 8 + p.lantai * 15, `Kabel lighting`, 1.15)
    }
    if (p.stop) {
      add('stop_2l', p.stop, `Stop kontak`, 1.05)
      add('kabel_nym_25', p.stop * 6, `Kabel power`, 1.15)
      add('steker', Math.ceil(p.stop / 2), `Steker`, 1)
    }
    if (p.mcb) {
      add('panel_6', 1, `Panel (dari keyword)`, 1)
      add('mcb_20a', 4, `MCB group`, 1)
    }
    if (p.outdoor) add('stop_out', 2, `Outdoor (keyword)`, 1)
    add('isolasi', 1, `Isolasi`, 1)
    if (!items.length) {
      warnings.push('Prompt kurang jelas — coba sebutkan jumlah lampu/stop kontak')
      // minimal fallback
      add('lampu', 4, `Default fallback`, 1)
      add('kabel_nym_25', 40, `Default kabel`, 1.1)
    }
    summary = `Custom: "${String(params.prompt || '').slice(0, 80)}"`
  }

  // Merge same SKU
  const merged = {}
  for (const it of items) {
    if (!it) continue
    if (merged[it.sku]) {
      merged[it.sku].qty += it.qty
      merged[it.sku].subtotal = merged[it.sku].qty * merged[it.sku].price
      merged[it.sku].note += ` · ${it.note}`
      merged[it.sku].stock_ok = merged[it.sku].stock >= merged[it.sku].qty
      merged[it.sku].shortage = merged[it.sku].stock_ok ? 0 : merged[it.sku].qty - merged[it.sku].stock
    } else {
      merged[it.sku] = { ...it }
    }
  }
  const lines = Object.values(merged)
  const total = lines.reduce((s, r) => s + r.subtotal, 0)
  const shortageCount = lines.filter((r) => !r.stock_ok).length
  const marginSuggest = Math.round(total * 0.15) // saran margin jasa 15%
  const grand = total + marginSuggest

  return {
    templateId,
    summary,
    lines,
    total_material: total,
    jasa_estimasi: marginSuggest,
    grand_total: grand,
    shortage_count: shortageCount,
    warnings,
    generated_at: new Date().toISOString(),
  }
}

export function formatRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}
