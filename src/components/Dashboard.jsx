import { useMemo, useState, useEffect } from 'react'
import { useInventory } from '../context/InventoryContext'
import { REASON_LABEL, formatDateTimeFull } from '../data/products'

const CAT_COLORS = {
  MCB: '#2563eb', Kabel: '#7c3aed', Fitting: '#f59e0b', Saklar: '#16a34a',
  'Stop Kontak': '#ef4444', Steker: '#0ea5e9', Panel: '#6366f1', Lampu: '#f97316',
  Aksesoris: '#10b981',
}

export default function Dashboard({ onNavigate }) {
  const { stats, daily, history, source, products, lowStock } = useInventory()
  const [recent, setRecent] = useState([])
  const [popup, setPopup] = useState(null)

  useEffect(() => { setRecent(history.slice(0, 6)) }, [history])

  /* ————— KPI popup data — sesuai angka KPI ————— */
  const popupRows = useMemo(() => {
    if (!popup) return []
    const f = popup.filter

    // "low" → tampilkan daftar produk stok menipis (bukan history)
    if (f === 'low') return lowStock

    // "stock" → tampilkan semua produk + stok
    if (f === 'stock') return products

    // history-based filters
    let rows = [...history]
    if (f === 'masuk') rows = rows.filter(h => h.change > 0)
    else if (f === 'keluar') rows = rows.filter(h => h.change < 0)
    else if (f === 'today_in') rows = rows.filter(h => h.change > 0 && new Date(h.created_at).toDateString() === new Date().toDateString())
    else if (f === 'today_out') rows = rows.filter(h => h.change < 0 && new Date(h.created_at).toDateString() === new Date().toDateString())
    return rows
  }, [popup, history, products, lowStock])

  /* ————— Group by category for popup ————— */
  const popupByCategory = useMemo(() => {
    if (!popup) return []
    const map = {}
    popupRows.forEach(r => {
      const cat = r.category || 'Lainnya'
      if (!map[cat]) map[cat] = []
      map[cat].push(r)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [popupRows, popup])

  /* ————— KPI popup count — harus match angka KPI ————— */
  const popupCount = useMemo(() => {
    if (!popup) return 0
    const f = popup.filter
    if (f === 'low') return lowStock.length
    if (f === 'stock') return Number(stats.total_stock || 0)
    if (f === 'masuk') return Number(stats.stock_in || 0)
    if (f === 'keluar') return Number(stats.stock_out || 0)
    if (f === 'today_in') return Number(stats.stock_in_today || 0)
    if (f === 'today_out') return Number(stats.stock_out_today || 0)
    return popupRows.length
  }, [popup, stats, lowStock, popupRows])

  const isProductPopup = popup?.filter === 'low' || popup?.filter === 'stock'

  const kpis = [
    { label: 'Total Produk', value: stats.total_products, sub: '→ Data Produk', icon: 'fa-cube', cls: 'kpi-blue', go: 'produk' },
    { label: 'Total Stok', value: Number(stats.total_stock || 0).toLocaleString('id-ID'), sub: 'klik → detail', icon: 'fa-boxes', cls: 'kpi-violet', pop: { title: 'Semua Produk & Stok', filter: 'stock' } },
    { label: 'Stok Menipis', value: stats.low_stock_count, sub: 'klik → detail', icon: 'fa-exclamation-triangle', cls: 'kpi-red', pop: { title: 'Produk Stok Menipis', filter: 'low' } },
    { label: 'Masuk Hari Ini', value: Number(stats.stock_in_today || 0).toLocaleString('id-ID'), sub: 'klik → detail', icon: 'fa-arrow-down', cls: 'kpi-green', pop: { title: 'Barang Masuk Hari Ini', filter: 'today_in' } },
    { label: 'Keluar Hari Ini', value: Number(stats.stock_out_today || 0).toLocaleString('id-ID'), sub: 'klik → detail', icon: 'fa-arrow-up', cls: 'kpi-orange', pop: { title: 'Barang Keluar Hari Ini', filter: 'today_out' } },
    { label: 'Total Barang Masuk', value: Number(stats.stock_in || 0).toLocaleString('id-ID'), sub: 'klik → detail', icon: 'fa-download', cls: 'kpi-purple', pop: { title: 'Semua Barang Masuk', filter: 'masuk' } },
    { label: 'Total Barang Keluar', value: Number(stats.stock_out || 0).toLocaleString('id-ID'), sub: 'klik → detail', icon: 'fa-upload', cls: 'kpi-sky', pop: { title: 'Semua Barang Keluar', filter: 'keluar' } },
    { label: 'Kategori', value: stats.categories_count, sub: '→ Data Produk', icon: 'fa-tags', cls: 'kpi-indigo', go: 'produk' },
  ]

  const maxDaily = Math.max(1, ...daily.map(d => Math.max(Number(d.stock_in || 0), Number(d.stock_out || 0))))
  const totalIn = Number(stats.stock_in || 0)
  const totalOut = Number(stats.stock_out || 0)
  const totalMove = Math.max(1, totalIn + totalOut)
  const outPct = Math.round((totalOut / totalMove) * 100)
  const donutStyle = useMemo(() => ({ background: `conic-gradient(#2563eb 0% ${100 - outPct}%, #f97316 ${100 - outPct}% 100%)` }), [outPct])

  return (
    <div>
      <div className="page-title">Dashboard</div>
      <div className="page-subtitle">
        <i className="fas fa-circle" style={{ color: source === 'api+local' ? '#16a34a' : '#f59e0b', fontSize: 8, marginRight: 6 }}></i>
        {source === 'api+local' ? 'Live MySQL' : 'Data Lokal'} — semua data real-time · klik KPI untuk popup detail
      </div>

      <div className="section-label"><h2>Ikhtisar Performa Sistem</h2></div>
      <div className="kpi-grid">
        {kpis.map(k => (
          <button key={k.label} type="button" className={`kpi-card ${k.cls}`}
            onClick={() => { if (k.go) onNavigate(k.go); if (k.pop) setPopup(k.pop) }}
            style={{ cursor: 'pointer', textAlign: 'left', border: 'none', width: '100%', font: 'inherit' }}>
            <div className="kpi-icon"><i className={`fas ${k.icon}`}></i></div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </button>
        ))}
      </div>

      <div className="section-label"><h2>Akses Cepat</h2></div>
      <div className="quick-grid">
        <button className="quick-card" type="button" onClick={() => onNavigate('produk')}>
          <div className="quick-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}><i className="fas fa-plus"></i></div>
          <div><h4>+ Tambah Produk</h4><p>Input barang baru ke katalog</p></div>
        </button>
        <button className="quick-card" type="button" onClick={() => onNavigate('barang-masuk')}>
          <div className="quick-icon" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}><i className="fas fa-arrow-down"></i></div>
          <div><h4>+ Barang Masuk</h4><p>Manual / scan barcode restock</p></div>
        </button>
        <button className="quick-card" type="button" onClick={() => onNavigate('barang-keluar')}>
          <div className="quick-icon" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}><i className="fas fa-arrow-up"></i></div>
          <div><h4>Barang Keluar</h4><p>Manual / scan barcode keluar</p></div>
        </button>
        <button className="quick-card" type="button" onClick={() => onNavigate('ai-asisten')}>
          <div className="quick-icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}><i className="fas fa-robot"></i></div>
          <div><h4>Asisten AI</h4><p>Rekomendasi stok &amp; analitik</p></div>
        </button>
      </div>

      <div className="section-label"><h2>Visualisasi Data Aktual</h2></div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Alur Transaksi {daily.length} Hari</h3>
            <button type="button" className="badge-pill" style={{ border: 'none', cursor: 'pointer' }} onClick={() => onNavigate('laporan')}>STATISTIK →</button>
          </div>
          <div className="panel-body">
            <div className="bar-chart">
              {daily.map((d, i) => (
                <div className="bar-col" key={d.date || i}>
                  <div className="bar-pair">
                    <div className="bar in" style={{ height: `${(Number(d.stock_in || 0) / maxDaily) * 100}%` }} title={`Masuk: ${d.stock_in}`} />
                    <div className="bar out" style={{ height: `${(Number(d.stock_out || 0) / maxDaily) * 100}%` }} title={`Keluar: ${d.stock_out}`} />
                  </div>
                  <div className="bar-label">{d.date ? new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}</div>
                </div>
              ))}
            </div>
            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: '#2563eb' }}></span>Masuk ({totalIn})</span>
              <span><span className="legend-dot" style={{ background: '#f97316' }}></span>Keluar ({totalOut})</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Proporsi Masuk/Keluar</h3>
            <button type="button" className="badge-pill" style={{ border: 'none', cursor: 'pointer' }} onClick={() => onNavigate('laporan')}>DETAIL →</button>
          </div>
          <div className="panel-body">
            <div className="donut-wrap">
              <div className="donut" style={donutStyle}>
                <div className="donut-hole">
                  <strong>{outPct}%</strong>
                  <span>Keluar</span>
                </div>
              </div>
              <div className="donut-legend">
                <div className="donut-legend-item"><div className="left"><span className="legend-dot" style={{ background: '#2563eb' }}></span>Masuk</div><strong>{totalIn}</strong></div>
                <div className="donut-legend-item"><div className="left"><span className="legend-dot" style={{ background: '#f97316' }}></span>Keluar</div><strong>{totalOut}</strong></div>
                <div className="donut-legend-item"><div className="left"><span className="legend-dot" style={{ background: '#16a34a' }}></span>Net</div><strong style={{ color: (totalIn - totalOut) >= 0 ? '#16a34a' : '#ef4444' }}>{(totalIn - totalOut) >= 0 ? '+' : ''}{totalIn - totalOut}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Aktivitas Stok Terbaru</h3>
          <button type="button" onClick={() => onNavigate('laporan')} style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Lihat Semua →</button>
        </div>
        <div className="panel-body" style={{ paddingTop: 4, paddingBottom: 8 }}>
          <div className="activity-list">
            {recent.map((h, i) => {
              const isIn = h.change > 0
              const dt = formatDateTimeFull(h.created_at)
              return (
                <div className="activity-row" key={h.id || i}>
                  <div className={`activity-icon ${isIn ? 'in' : 'out'}`}><i className={`fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{h.product_name}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{REASON_LABEL[h.reason] || h.reason} · {dt.hari}, {dt.tanggal} · {dt.jam}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: isIn ? '#16a34a' : '#ef4444', fontSize: 14 }}>{isIn ? '+' : ''}{h.change}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ———— POPUP DETAIL KPI (per kategori) ———— */}
      {popup && (
        <div style={st.overlay} onClick={() => setPopup(null)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                <i className="fas fa-history" style={{ color: '#2563eb', marginRight: 8 }}></i>
                {popup.title}
              </h3>
              <button onClick={() => setPopup(null)} style={st.close}>×</button>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Total: <strong style={{ color: '#0f172a' }}>{popupCount.toLocaleString('id-ID')}</strong>
              {!isProductPopup && <span> unit · {popupRows.length} transaksi</span>}
              {isProductPopup && <span> {popup.filter === 'low' ? 'produk menipis' : 'unit stok'}</span>}
              {' · '}{popupByCategory.length} kategori
            </div>

            {popupRows.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: 24, textAlign: 'center' }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, marginBottom: 8, display: 'block' }}></i>
                Tidak ada data.
              </div>
            ) : (
              <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
                {popupByCategory.map(([cat, rows]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      background: `${CAT_COLORS[cat] || '#64748b'}10`, borderRadius: 8, marginBottom: 6,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: CAT_COLORS[cat] || '#64748b',
                      }}></div>
                      <strong style={{ fontSize: 12, color: CAT_COLORS[cat] || '#64748b' }}>{cat}</strong>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>({rows.length})</span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 4 }}>
                      <thead>
                        <tr>
                          {isProductPopup
                            ? ['Produk', 'Stok', 'Min Stok', popup.filter === 'low' ? 'Kurang' : 'Harga'].map(h => (
                                <th key={h} style={st.th}>{h}</th>
                              ))
                            : ['Waktu', 'Produk', 'Perubahan', 'Alasan'].map(h => (
                                <th key={h} style={st.th}>{h}</th>
                              ))
                          }
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          if (isProductPopup) {
                            const gap = Math.max(0, Number(r.min_stock || 0) - Number(r.stock || 0))
                            return (
                              <tr key={r.id || i}>
                                <td style={st.td}><span style={{ fontWeight: 600 }}>{r.name}</span></td>
                                <td style={{ ...st.td, fontWeight: 700, color: r.stock <= r.min_stock ? '#ef4444' : '#0f172a' }}>{r.stock}</td>
                                <td style={st.td}>{r.min_stock || '-'}</td>
                                <td style={{ ...st.td, fontWeight: 700, color: popup.filter === 'low' ? '#ef4444' : '#2563eb' }}>
                                  {popup.filter === 'low' ? (gap > 0 ? `-${gap}` : 'Batas') : `Rp ${Number(r.price || 0).toLocaleString()}`}
                                </td>
                              </tr>
                            )
                          }
                          const dt = formatDateTimeFull(r.created_at)
                          return (
                            <tr key={r.id || i}>
                              <td style={{ ...st.td, whiteSpace: 'nowrap', fontSize: 10.5, color: '#64748b' }}>
                                <div>{dt.hari.slice(0, 3)}, {dt.tanggal}</div>
                                <div style={{ color: '#94a3b8' }}>{dt.jam}</div>
                              </td>
                              <td style={{ ...st.td, fontWeight: 600 }}>{r.product_name}</td>
                              <td style={{ ...st.td, fontWeight: 700, color: r.change > 0 ? '#16a34a' : '#ef4444' }}>
                                {r.change > 0 ? '+' : ''}{r.change}
                              </td>
                              <td style={{ ...st.td, color: '#64748b', fontSize: 10.5 }}>{REASON_LABEL[r.reason] || r.reason}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const st = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, padding: 20, maxWidth: 650, width: '92%', maxHeight: '75vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' },
  close: { width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 16, lineHeight: '30px' },
  th: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', padding: '6px 6px', textAlign: 'left', background: '#f8fafc', position: 'sticky', top: 0 },
  td: { padding: '5px 6px', borderBottom: '1px solid #f1f5f9' },
}
