import { useState, useMemo } from 'react'
import { useInventory } from '../context/InventoryContext'

const SUGGESTIONS = [
  { id: 'predictions', title: '🔮 Prediksi Stok AI', desc: 'Perkiraan kapan stok habis + saran restock per produk', icon: 'fa-chart-line', color: '#2563eb' },
  { id: 'low-stock', title: 'Cek stok menipis', desc: 'Lihat produk di bawah min stok + rekomendasi restock', icon: 'fa-exclamation-triangle', color: '#ef4444' },
  { id: 'restock-plan', title: 'Rencana restock', desc: 'Prioritas barang yang harus dibeli', icon: 'fa-cart-plus', color: '#16a34a' },
  { id: 'movement-summary', title: 'Ringkas masuk/keluar', desc: 'Total pergerakan stok + analitik', icon: 'fa-exchange-alt', color: '#2563eb' },
  { id: 'category-health', title: 'Kesehatan per kategori', desc: 'Kategori rawan habis berdasarkan data real', icon: 'fa-chart-pie', color: '#7c3aed' },
  { id: 'overview', title: 'Ikhtisar cepat', desc: 'Ringkasan semua aspek stok toko', icon: 'fa-chart-simple', color: '#0ea5e9' },
]

export default function AIAsisten({ onNavigate }) {
  const { products, history, stats, lowStock, daily, predictions, predictionSummary } = useInventory()
  const [active, setActive] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chat, setChat] = useState('')

  // Local prediction fallback (moving average 14 hari dari history)
  const localPredictions = useMemo(() => {
    const since = Date.now() - 14 * 24 * 60 * 60 * 1000
    const outMap = {}
    history.forEach(h => {
      if (h.change >= 0) return
      const t = new Date(h.created_at).getTime()
      if (t < since) return
      const id = String(h.product_id)
      outMap[id] = (outMap[id] || 0) + Math.abs(Number(h.change || 0))
    })
    return products.map(p => {
      const totalOut = outMap[String(p.id)] || 0
      const avgDaily = totalOut / 14
      const stock = Number(p.stock || 0)
      const min = Number(p.min_stock || 0)
      const daysLeft = avgDaily > 0 ? Math.round((stock / avgDaily) * 10) / 10 : (stock <= min ? 0 : null)
      let urgency = 'aman'
      if (stock <= 0) urgency = 'habis'
      else if (stock <= min || (daysLeft !== null && daysLeft <= 3)) urgency = 'kritis'
      else if (daysLeft !== null && daysLeft <= 7) urgency = 'waspada'
      else if (daysLeft !== null && daysLeft <= 14) urgency = 'pantau'
      const suggest = Math.max(
        Math.max(0, Math.ceil(min * 1.5) - stock),
        avgDaily > 0 ? Math.ceil(avgDaily * 14) : 0
      )
      return {
        product_id: p.id,
        name: p.name,
        category: p.category,
        stock,
        min_stock: min,
        avg_daily_out: Math.round(avgDaily * 100) / 100,
        days_left: daysLeft,
        days_left_label: daysLeft === null ? 'Stabil' : (daysLeft <= 0 ? 'Segera habis' : `~${daysLeft} hari`),
        urgency,
        suggest_restock: suggest,
        confidence: totalOut > 0 ? (totalOut >= 10 ? 'tinggi' : 'sedang') : 'rendah',
      }
    }).sort((a, b) => {
      const order = { habis: 0, kritis: 1, waspada: 2, pantau: 3, aman: 4 }
      return (order[a.urgency] - order[b.urgency]) * 1000 + ((a.days_left ?? 999) - (b.days_left ?? 999))
    })
  }, [products, history])

  const predRows = predictions?.length ? predictions : localPredictions

  const run = (id) => {
    setActive(id)
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      try {
        if (id === 'predictions') {
          const critical = predRows.filter(r => ['habis', 'kritis', 'waspada'].includes(r.urgency))
          const totalSuggest = predRows.reduce((s, r) => s + (r.suggest_restock || 0), 0)
          setResult({
            type: 'predictions',
            title: 'Prediksi Stok AI (Moving Average 14 hari)',
            summary: critical.length
              ? `${critical.length} produk berisiko habis ≤7 hari. Total saran restock: ${totalSuggest} unit. Metode: rata-rata keluar harian.`
              : `Semua stok relatif aman. ${predRows.length} SKU dianalisis. Saran preventif: ${totalSuggest} unit.`,
            rows: predRows.slice(0, 20),
            metrics: [
              { label: 'Kritis/Habis', value: predRows.filter(r => r.urgency === 'kritis' || r.urgency === 'habis').length, color: '#ef4444' },
              { label: 'Waspada', value: predRows.filter(r => r.urgency === 'waspada').length, color: '#f59e0b' },
              { label: 'Pantau', value: predRows.filter(r => r.urgency === 'pantau').length, color: '#0ea5e9' },
              { label: 'Aman', value: predRows.filter(r => r.urgency === 'aman').length, color: '#16a34a' },
              { label: 'Saran Restock', value: totalSuggest, color: '#7c3aed' },
            ],
            actions: [
              { label: 'Barang Masuk', go: 'barang-masuk' },
              { label: 'Data Produk', go: 'produk' },
            ],
          })
        }
        if (id === 'low-stock' || id === 'restock-plan') {
          const rows = [...lowStock].sort((a, b) => b.gap - a.gap)
          setResult({
            type: id,
            title: id === 'restock-plan' ? 'Rencana Restock' : 'Produk Stok Menipis',
            summary: id === 'restock-plan'
              ? `${rows.length} produk perlu restock segera. Total saran pengadaan: ${rows.reduce((s, r) => s + (r.suggest || 0), 0)} unit.`
              : `Ditemukan ${rows.length} produk di bawah / mendekati min stok dari ${products.length} total SKU.`,
            rows: rows.length ? rows : [{ name: 'Semua stok aman', stock: '-', min_stock: '-' }],
            actions: [
              { label: 'Barang Masuk', go: 'barang-masuk' },
              { label: 'Data Produk', go: 'produk' },
            ],
          })
        }
        if (id === 'movement-summary') {
          const totalIn = Number(stats.stock_in || 0)
          const totalOut = Number(stats.stock_out || 0)
          setResult({
            type: id,
            title: 'Ringkasan Pergerakan Stok',
            summary: `30 hari terakhir: masuk ${totalIn} unit, keluar ${totalOut} unit, net ${totalIn - totalOut >= 0 ? '+' : ''}${totalIn - totalOut} unit.`,
            metrics: [
              { label: 'Barang Masuk', value: totalIn.toLocaleString(), color: '#16a34a' },
              { label: 'Barang Keluar', value: totalOut.toLocaleString(), color: '#f97316' },
              { label: 'Net', value: (totalIn - totalOut) >= 0 ? `+${totalIn - totalOut}` : totalIn - totalOut, color: '#2563eb' },
              { label: 'Total Transaksi', value: history.length, color: '#7c3aed' },
              { label: 'Produk', value: products.length, color: '#0ea5e9' },
            ],
            actions: [
              { label: 'Barang Masuk', go: 'barang-masuk' },
              { label: 'Barang Keluar', go: 'barang-keluar' },
              { label: 'Laporan', go: 'laporan' },
            ],
          })
        }
        if (id === 'category-health') {
          const catMap = {}
          products.forEach(p => {
            const c = p.category || 'Lainnya'
            if (!catMap[c]) catMap[c] = { category: c, count: 0, total_stock: 0, total_min: 0 }
            catMap[c].count += 1
            catMap[c].total_stock += Number(p.stock || 0)
            catMap[c].total_min += Number(p.min_stock || 0)
          })
          const cats = Object.values(catMap)
            .map(c => ({
              ...c,
              avg: (c.total_stock / Math.max(1, c.count)).toFixed(1),
              health: c.total_stock >= c.total_min ? 'Aman' : c.total_stock >= c.total_min * 0.5 ? 'Perlu pantau' : 'Rawan',
            }))
            .sort((a, b) => a.total_stock / Math.max(1, a.count) - b.total_stock / Math.max(1, b.count))
          setResult({
            type: 'category-health',
            title: 'Kesehatan Stok per Kategori',
            summary: cats.length
              ? `Rata-rata terendah: ${cats[0].category} (rata-rata ${cats[0].avg}/SKU) — prioritaskan restock.`
              : 'Belum ada data kategori.',
            rows: cats,
            actions: [
              { label: 'Data Produk', go: 'produk' },
              { label: 'Barang Masuk', go: 'barang-masuk' },
            ],
          })
        }
        if (id === 'overview') {
          setResult({
            type: 'overview',
            title: 'Ikhtisar Cepat',
            summary: `${products.length} produk, ${stats.categories_count} kategori, ${history.length} transaksi stok tercatat. Stok menipis: ${lowStock.length}.`,
            metrics: [
              { label: 'Produk', value: products.length, color: '#2563eb' },
              { label: 'Kategori', value: stats.categories_count, color: '#7c3aed' },
              { label: 'Total Stok', value: Number(stats.total_stock || 0).toLocaleString(), color: '#10b981' },
              { label: 'Stok Menipis', value: lowStock.length, color: '#ef4444' },
              { label: 'Transaksi', value: history.length, color: '#f59e0b' },
            ],
            actions: [
              { label: 'Dashboard', go: 'dashboard' },
              { label: 'Laporan', go: 'laporan' },
            ],
          })
        }
      } finally { setLoading(false) }
    }, 300)
  }

  const freeTextHint = useMemo(() => {
    const q = chat.trim().toLowerCase()
    if (!q) return null
    if (q.includes('prediksi') || q.includes('forecast') || q.includes('habis kapan') || q.includes('berapa hari')) return 'predictions'
    if (q.includes('menipis') || q.includes('habis') || q.includes('low') || q.includes('kurang')) return 'low-stock'
    if (q.includes('restock') || q.includes('beli') || q.includes('order') || q.includes('stok')) return 'restock-plan'
    if (q.includes('masuk') || q.includes('keluar') || q.includes('mutasi') || q.includes('ringkas')) return 'movement-summary'
    if (q.includes('kategori') || q.includes('sehat') || q.includes('rawan')) return 'category-health'
    if (q.includes('ikhtisar') || q.includes('overview') || q.includes('semua')) return 'overview'
    return null
  }, [chat])

  return (
    <div>
      <div className="page-title">Asisten AI Inventaris</div>
      <div className="page-subtitle">
        Rekomendasi stok berbasis data nyata &middot; <strong>terhubung ke update produk & transaksi</strong>
      </div>

      <div className="quick-grid" style={{ marginBottom: 18 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s.id} type="button"
            className="quick-card"
            style={{ borderColor: active === s.id ? s.color : undefined }}
            onClick={() => run(s.id)}>
            <div className="quick-icon" style={{ background: `${s.color}18`, color: s.color }}>
              <i className={`fas ${s.icon}`}></i>
            </div>
            <div><h4>{s.title}</h4><p>{s.desc}</p></div>
          </button>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h3>Tanya cepat</h3><span className="badge-pill">RULE-BASED AI</span></div>
        <div className="panel-body" style={{ display: 'flex', gap: 8 }}>
          <input value={chat} onChange={e => setChat(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && freeTextHint) run(freeTextHint) }}
            placeholder='Contoh: "stok menipis", "rencana restock", "ringkas masuk keluar"'
            style={{ flex: 1, height: 42, border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 12px', fontSize: 13, outline: 'none' }} />
          <button type="button" disabled={!freeTextHint || loading}
            onClick={() => freeTextHint && run(freeTextHint)}
            style={{ height: 42, padding: '0 16px', border: 'none', borderRadius: 10,
              background: freeTextHint ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : '#e2e8f0',
              color: freeTextHint ? '#fff' : '#94a3b8', fontWeight: 700, cursor: freeTextHint ? 'pointer' : 'not-allowed' }}>
            Analisis
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{result?.title || 'Hasil Asisten'}</h3>{loading && <span className="badge-pill">Memproses...</span>}</div>
        <div className="panel-body">
          {!result && !loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Pilih salah satu kartu di atas, atau ketik pertanyaan.</div>}
          {loading && <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 13 }}><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Menganalisis data...</div>}
          {result && !loading && (
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>{result.summary}</p>

              {result.metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {result.metrics.map(m => (
                    <div key={m.label} style={{ padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {result.rows?.length > 0 && result.type === 'predictions' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 12 }}>
                  <thead><tr>
                    {['Produk', 'Stok', 'Avg/hari', 'Sisa', 'Urgensi', 'Saran'].map(h => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '7px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {result.rows.map((r, i) => {
                      const color = r.urgency === 'habis' || r.urgency === 'kritis' ? '#ef4444'
                        : r.urgency === 'waspada' ? '#f59e0b'
                        : r.urgency === 'pantau' ? '#0ea5e9' : '#16a34a'
                      return (
                        <tr key={i}>
                          <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{r.name}<div style={{ fontSize: 10, color: '#94a3b8' }}>{r.category}</div></td>
                          <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.stock}</td>
                          <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.avg_daily_out ?? 0}</td>
                          <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color }}>{r.days_left_label || (r.days_left != null ? `~${r.days_left} hari` : 'Stabil')}</td>
                          <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color, textTransform: 'capitalize' }}>{r.urgency}</td>
                          <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#7c3aed' }}>{r.suggest_restock > 0 ? `+${r.suggest_restock}` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {result.rows?.length > 0 && result.type !== 'category-health' && result.type !== 'predictions' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 12 }}>
                  <thead><tr>
                    {['Produk', 'Kategori', 'Stok', 'Min', 'Keterangan'].map(h => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '7px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {result.rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{r.name || r.category}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.category || '-'}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', color: r.gap > 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>{r.stock ?? '-'}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.min_stock ?? '-'}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', color: r.gap > 0 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
                          {r.gap > 0 ? `Kurang ${r.gap}` : 'Aman'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {result.rows?.length > 0 && result.type === 'category-health' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 12 }}>
                  <thead><tr>
                    {['Kategori', 'SKU', 'Total Stok', 'Rata-rata', 'Status'].map(h => (
                      <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '7px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {result.rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{r.category}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.count}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.total_stock}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>{r.avg}</td>
                        <td style={{ padding: '6px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: r.health === 'Aman' ? '#16a34a' : r.health === 'Perlu pantau' ? '#f59e0b' : '#ef4444' }}>{r.health}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {result.actions && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {result.actions.map(a => (
                    <button key={a.go + a.label} type="button" onClick={() => onNavigate?.(a.go)}
                      style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #2563eb', background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {a.label} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
