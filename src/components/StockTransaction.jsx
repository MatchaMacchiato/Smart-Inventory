import { useState, useRef, useEffect, useMemo } from 'react'
import { useInventory } from '../context/InventoryContext'
import { REASON_LABEL, CATEGORY_BARCODES, formatDateTimeFull } from '../data/products'

let TMP_PRODUCT_ID = 100

export default function StockTransaction({ mode = 'in' }) {
  const { products, applyStockChange, categoryBarcodes } = useInventory()
  const isIn = mode === 'in'

  const [category, setCategory] = useState('Semua')
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [supplier, setSupplier] = useState('')
  const [customer, setCustomer] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [msg, setMsg] = useState(null)
  const [historyLocal, setHistoryLocal] = useState([])
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (detectRef.current) clearInterval(detectRef.current)
  }, [])

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean))
    return ['Semua', ...Array.from(set)]
  }, [products])

  // KETIKA PILIH KATEGORI → hanya tampilkan produk dari kategori itu
  const filtered = useMemo(() => {
    if (!category || category === 'Semua') return products
    return products.filter((p) => String(p.category || '').trim() === String(category).trim())
  }, [products, category])

  // Reset pilihan produk kalau gak ada di kategori aktif
  useEffect(() => {
    if (!selectedId) return
    const stillThere = filtered.some((p) => String(p.id) === String(selectedId))
    if (!stillThere) setSelectedId('')
  }, [category, filtered, selectedId])

  const selected = filtered.find((p) => String(p.id) === String(selectedId)) || null

  // Auto-isi supplier dari data produk saat pilih produk (Barang Masuk)
  useEffect(() => {
    if (!isIn) return
    if (selected?.supplier) setSupplier(selected.supplier)
  }, [selectedId, selected?.supplier, isIn])

  const supplierOptions = useMemo(() => {
    const set = new Set(products.map((p) => p.supplier).filter(Boolean))
    return Array.from(set).sort()
  }, [products])

  const show = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const findCatFromCode = (code) => {
    const q = String(code || '').trim().toUpperCase()
    const entry = Object.entries(categoryBarcodes).find(([, v]) => v === q || v.toLowerCase() === q.toLowerCase())
    if (entry) return entry[0]
    const cats = Object.keys(categoryBarcodes)
    return cats.find(c => c.toLowerCase() === String(code || '').trim().toLowerCase()) || null
  }

  const applyBarcode = (raw) => {
    const code = String(raw || '').trim()
    if (!code) return
    const cat = findCatFromCode(code)
    if (cat) {
      setCategory(cat)
      setBarcodeInput('')
      setSelectedId('')
      show('ok', `Kategori: ${cat}. Pilih produk atau scan SKU.`)
      inputRef.current?.focus()
      return
    }
    const product = products.find(p =>
      String(p.sku || '').toLowerCase() === code.toLowerCase() ||
      String(p.barcode || '').toLowerCase() === code.toLowerCase() ||
      String(p.id) === code ||
      String(p.name || '').toLowerCase() === code.toLowerCase()
    )
    if (!product) {
      show('err', `Produk tidak ditemukan: ${code}`)
      return
    }
    setCategory(product.category || 'Semua')
    setSelectedId(String(product.id))
    setBarcodeInput('')
    show('ok', `Ditemukan: ${product.name}`)
    inputRef.current?.focus()
  }

  const submit = async () => {
    if (!selected) {
      if (!selectedId) return show('err', 'Pilih produk dulu')
      // jika yang dipilih adalah new product
      try {
        const newProd = { name: selectedId, category, price: 0, stock: 0, min_stock: 0, unit: 'pcs' }
        const saved = await applyStockChange({ productId: null, qty: Number(qty) || 1, mode, reason: isIn ? 'purchase' : 'sale', notes })
        return
      } catch {}
    }
    const q = Number(qty)
    if (!q || q <= 0) return show('err', 'Qty harus > 0')
    if (isIn && !String(supplier || '').trim()) return show('err', 'Isi sumber supplier dulu')
    if (!isIn && !String(customer || '').trim()) return show('err', 'Isi nama customer dulu')
    try {
      const row = await applyStockChange({
        productId: selected.id,
        qty: q,
        mode,
        reason: isIn ? 'purchase' : 'sale',
        notes: notes || (isIn ? 'Barang masuk' : 'Barang keluar'),
        supplier: isIn ? supplier : undefined,
        customer: !isIn ? customer : undefined,
      })
      setHistoryLocal(prev => [row, ...prev].slice(0, 20))
      show('ok', `${isIn ? 'Barang masuk' : 'Barang keluar'} tersimpan: ${selected.name} (${q})`)
      setQty(1)
      setNotes('')
      if (!isIn) setCustomer('')
      inputRef.current?.focus()
    } catch (e) {
      show('err', e.message || 'Gagal menyimpan')
    }
  }

  const startCamera = async () => {
    if (!('BarcodeDetector' in window)) {
      show('err', 'Kamera barcode belum didukung browser. Gunakan scanner USB / ketik manual.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraOn(true)
      const detector = new window.BarcodeDetector({ formats: ['qr_code','ean_13','ean_8','code_128','code_39','upc_a'] })
      let cooldown = 0
      detectRef.current = setInterval(async () => {
        if (!videoRef.current || Date.now() < cooldown) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes?.[0]?.rawValue) { applyBarcode(codes[0].rawValue); cooldown = Date.now() + 1500 }
        } catch {}
      }, 500)
    } catch { show('err', 'Gagal akses kamera. Izinkan kamera.'); stopCamera() }
  }

  const stopCamera = () => {
    if (detectRef.current) clearInterval(detectRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  return (
    <div>
      <div className="page-title">{isIn ? 'Barang Masuk' : 'Barang Keluar'}</div>
      <div className="page-subtitle">
        {isIn ? 'Input restock manual atau scan barcode' : 'Catat barang keluar manual atau scan barcode'}
        &middot; <strong>terhubung ke seluruh menu</strong>
      </div>

      {msg && (
        <div style={{
          marginBottom: 14, padding: '12px 14px', borderRadius: 12, fontSize: 13,
          border: `1px solid ${msg.type === 'ok' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`,
          background: msg.type === 'ok' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)',
          color: msg.type === 'ok' ? '#059669' : '#B91C1C', fontWeight: 600,
        }}>{msg.text}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
        <div className="panel">
          <div className="panel-head">
            <h3>{isIn ? 'Form Barang Masuk' : 'Form Barang Keluar'}</h3>
            <span className="badge-pill">{isIn ? 'IN' : 'OUT'}</span>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={s.label}>Scan / Input Barcode atau SKU</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={inputRef} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyBarcode(barcodeInput) } }}
                  placeholder="Scan di sini lalu Enter" style={s.input} autoFocus />
                <button type="button" onClick={() => applyBarcode(barcodeInput)} style={s.btnP}>Cari</button>
                <button type="button" onClick={() => cameraOn ? stopCamera() : startCamera()} style={s.btnG}>
                  <i className={`fas ${cameraOn ? 'fa-times' : 'fa-camera'}`}></i>
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                Scanner USB otomatis + Enter. Kode kategori: MCB=CAT-MCB, Fitting=CAT-FITTING, Kabel=CAT-KABEL, Stop Kontak=CAT-STOPKONTAK, Steker=CAT-STEKER, Saklar=CAT-SAKLAR, Panel=CAT-PANEL, Lampu=CAT-LAMPU
              </div>
            </div>

            {cameraOn && (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E6E8EA', background: '#0F172A' }}>
                <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
              </div>
            )}

            {categories.length > 1 && (
              <div>
                <label style={s.label}>Kategori</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {categories.map(c => (
                    <button key={c} type="button" onClick={() => { setCategory(c); setSelectedId('') }}
                      style={{
                        padding: '6px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: category === c ? '1px solid #334155' : '1px solid #E6E8EA',
                        background: category === c ? 'rgba(51,65,85,0.09)' : '#fff',
                        color: category === c ? '#1E293B' : '#475569',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={s.label}>
                Produk {category && category !== 'Semua' ? `· ${category}` : ''} ({filtered.length})
              </label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={s.input}>
                <option value="">— Pilih {category && category !== 'Semua' ? `produk ${category}` : 'produk'} —</option>
                {filtered.length === 0 ? (
                  <option value="" disabled>Tidak ada produk di kategori ini</option>
                ) : (
                  filtered.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · stok {p.stock}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selected && (
              <div style={{ padding: 10, borderRadius: 10, background: '#F1F5F9', border: '1px solid #E6E8EA', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                <div><span style={{ color: '#64748B' }}>Stok</span><br /><strong>{selected.stock}</strong></div>
                <div><span style={{ color: '#64748B' }}>Min</span><br /><strong>{selected.min_stock ?? '-'}</strong></div>
                <div><span style={{ color: '#64748B' }}>SKU</span><br /><strong>{selected.sku || selected.id}</strong></div>
                <div><span style={{ color: '#64748B' }}>Supplier</span><br /><strong>{selected.supplier || '-'}</strong></div>
              </div>
            )}

            {isIn ? (
              <div>
                <label style={s.label}>Sumber Supplier <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  list="supplier-list"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="Contoh: PT Schneider, PT Broco..."
                  style={s.input}
                />
                <datalist id="supplier-list">
                  {supplierOptions.map(sp => <option key={sp} value={sp} />)}
                </datalist>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  Otomatis terisi dari data produk, bisa diganti.
                </div>
              </div>
            ) : (
              <div>
                <label style={s.label}>Customer <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  placeholder="Nama customer / toko / teknisi..."
                  style={s.input}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Qty</label>
                <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Catatan</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={isIn ? 'No. PO / keterangan restock...' : 'Keterangan penjualan...'} style={s.input} />
              </div>
            </div>

            <button type="button" onClick={submit} style={{ ...s.btnP, height: 44, fontSize: 14 }}>
              <i className={`fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'}`} style={{ marginRight: 8 }}></i>
              {isIn ? 'Simpan Barang Masuk' : 'Simpan Barang Keluar'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel">
            <div className="panel-head"><h3>Barcode per Kategori</h3><span className="badge-pill">BISA</span></div>
            <div className="panel-body">
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(categoryBarcodes).map(([cat, code]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: '#F1F5F9', border: '1px solid #E6E8EA' }}>
                    <strong style={{ fontSize: 13 }}>{cat}</strong>
                    <code style={{ fontSize: 11.5, color: '#334155', fontWeight: 700 }}>{code}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-head"><h3>Sesi Ini</h3></div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              {historyLocal.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: 13, padding: '12px 0' }}>Belum ada transaksi sesi ini.</div>
              ) : (
                <div className="activity-list">
                  {historyLocal.map(h => (
                    <div key={h.id} className="activity-row">
                      <div className={`activity-icon ${h.change > 0 ? 'in' : 'out'}`}>
                        <i className={`fas ${h.change > 0 ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{h.product_name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          {h.stock_before} → {h.stock_after}
                          {h.change > 0 && h.supplier ? ` · ${h.supplier}` : ''}
                          {h.change < 0 && h.customer ? ` · ${h.customer}` : ''}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: h.change > 0 ? '#059669' : '#DC2626' }}>
                        {h.change > 0 ? '+' : ''}{h.change}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 },
  input: { width: '100%', height: 40, border: '1px solid #E6E8EA', borderRadius: 10, padding: '0 12px', fontSize: 13, outline: 'none', background: '#fff', color: '#0F172A' },
  btnP: { height: 40, padding: '0 14px', border: 'none', borderRadius: 10, background: '#334155', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnG: { width: 40, height: 40, borderRadius: 10, border: '1px solid #E6E8EA', background: '#fff', color: '#475569', cursor: 'pointer' },
}
