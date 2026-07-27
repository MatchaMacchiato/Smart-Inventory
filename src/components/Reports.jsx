import { useState, useEffect } from 'react'
import { stockApi, dashboardApi } from '../services/api'

const MOCK_ANALYTICS = {
  total_products: 18, total_stock: 962, low_stock_count: 7, out_of_stock: 0,
  categories: [
    { category: 'MCB', count: 4, total_stock: 88 },
    { category: 'Kabel', count: 4, total_stock: 55 },
    { category: 'Fitting', count: 2, total_stock: 185 },
    { category: 'Saklar', count: 3, total_stock: 135 },
    { category: 'Panel', count: 2, total_stock: 11 },
    { category: 'Lampu', count: 2, total_stock: 147 },
    { category: 'Aksesoris', count: 1, total_stock: 200 },
  ]
}

const MOCK_MOVEMENT = {
  stock_in: 245, stock_out: 189, net: 56, period_days: 30,
  by_reason: [
    { reason: 'purchase', total_in: 180, total_out: 0, count: 12 },
    { reason: 'sale', total_in: 0, total_out: 140, count: 14 },
    { reason: 'manual', total_in: 40, total_out: 30, count: 6 },
    { reason: 'ai_scan', total_in: 25, total_out: 0, count: 3 },
    { reason: 'adjustment', total_in: 0, total_out: 19, count: 5 },
  ],
  daily: [
    { date: '2026-07-18', stock_in: 30, stock_out: 15 },
    { date: '2026-07-19', stock_in: 20, stock_out: 25 },
    { date: '2026-07-20', stock_in: 45, stock_out: 18 },
    { date: '2026-07-21', stock_in: 12, stock_out: 30 },
    { date: '2026-07-22', stock_in: 35, stock_out: 22 },
    { date: '2026-07-23', stock_in: 50, stock_out: 40 },
    { date: '2026-07-24', stock_in: 53, stock_out: 39 },
  ],
  recent: [
    { id: 1, product_name: 'MCB Schneider 20A', change: 10, type: 'masuk', reason: 'purchase', stock_before: 35, stock_after: 45, created_at: '2026-07-24T08:00:00', notes: 'Barang masuk' },
  ]
}

const MOCK_TOP = [
  { id: 7, name: 'Fitting E27 Porselen', category: 'Fitting', stock: 120, price: 8500 },
  { id: 16, name: 'Isolasi Listrik 3M', category: 'Aksesoris', stock: 200, price: 12000 },
  { id: 14, name: 'Lampu LED Philips 10W', category: 'Lampu', stock: 85, price: 35000 },
  { id: 1, name: 'MCB Schneider 20A', category: 'MCB', stock: 45, price: 85000 },
  { id: 9, name: 'Saklar Broco 1G', category: 'Saklar', stock: 55, price: 18000 },
]

export default function Reports({ onNavigate }) {
  const [tab, setTab] = useState('ringkasan')
  const [analytics, setAnalytics] = useState(MOCK_ANALYTICS)
  const [top, setTop] = useState(MOCK_TOP)
  const [movement, setMovement] = useState(MOCK_MOVEMENT)

  useEffect(() => {
    stockApi.analytics().then(res => setAnalytics(res.data)).catch(() => {})
    dashboardApi.topProducts().then(res => setTop(res.data)).catch(() => {})
    dashboardApi.stockMovement({ limit: 50, days: 30 }).then(res => setMovement(res.data)).catch(() => {})
  }, [])

  const barColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  const reasonLabel = { purchase: 'Pembelian', sale: 'Penjualan', manual: 'Manual', ai_scan: 'AI Scan', adjustment: 'Penyesuaian' }

  const maxDaily = Math.max(...(movement.daily?.map(d => Math.max(d.stock_in, d.stock_out)) || [1]))
  const totalNilaiStok = top.reduce((a, b) => a + (b.stock * b.price), 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
          <i className="fas fa-chart-bar" style={{ color: '#6366f1', marginRight: 8 }}></i>Laporan
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          <i className="fas fa-home"></i><span>Home / Laporan</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'ringkasan', label: 'Ringkasan' },
          { key: 'pergerakan', label: 'Pergerakan Stok' },
          { key: 'riwayat', label: 'Riwayat Lengkap' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 8, border: tab === t.key ? '1px solid #6366f1' : '1px solid #eef2f6',
              background: tab === t.key ? 'rgba(99,102,241,0.1)' : '#fff', color: tab === t.key ? '#6366f1' : '#475569',
              fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Ringkasan */}
      {tab === 'ringkasan' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Produk', value: analytics.total_products, icon: 'fa-box', color: '#6366f1' },
              { label: 'Total Stok', value: analytics.total_stock?.toLocaleString() || '0', icon: 'fa-warehouse', color: '#06b6d4' },
              { label: 'Stok Menipis', value: analytics.low_stock_count, icon: 'fa-exclamation-triangle', color: '#f59e0b' },
              { label: 'Total Nilai Stok', value: `Rp ${(totalNilaiStok / 1000000).toFixed(1)}jt`, icon: 'fa-coins', color: '#10b981' },
              { label: 'Barang Masuk ({movement.period_days} hr)'.replace('{movement.period_days}', movement.period_days), value: movement.stock_in?.toLocaleString(), icon: 'fa-arrow-down', color: '#10b981' },
              { label: 'Barang Keluar ({movement.period_days} hr)'.replace('{movement.period_days}', movement.period_days), value: movement.stock_out?.toLocaleString(), icon: 'fa-arrow-up', color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  <i className={`fas ${s.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Distribusi kategori */}
            <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                <i className="fas fa-chart-pie" style={{ color: '#6366f1', marginRight: 8 }}></i>Distribusi Kategori
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analytics.categories.map((cat, i) => {
                  const pct = analytics.total_products > 0 ? ((cat.count / analytics.total_products) * 100).toFixed(0) : 0
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: barColors[i % barColors.length] }}></div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{cat.category}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{cat.count} produk</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stok Tertinggi */}
            <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                <i className="fas fa-arrow-up" style={{ color: '#10b981', marginRight: 8 }}></i>Stok Tertinggi
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Produk', 'Stok', 'Nilai'].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '8px 0', borderBottom: '1px solid #eef2f6', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 13, padding: '10px 0', borderBottom: '1px solid #eef2f6' }}>
                        <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: i < 3 ? 'rgba(16,185,129,0.1)' : '#f1f5f9', color: i < 3 ? '#059669' : '#64748b' }}>#{i+1}</span>
                      </td>
                      <td style={{ fontSize: 13, padding: '10px 0', borderBottom: '1px solid #eef2f6', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ fontSize: 13, padding: '10px 0', borderBottom: '1px solid #eef2f6', fontWeight: 700 }}>{p.stock}</td>
                      <td style={{ fontSize: 13, padding: '10px 0', borderBottom: '1px solid #eef2f6', color: '#6366f1', fontWeight: 600 }}>Rp {Number(p.stock * p.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab Pergerakan Stok */}
      {tab === 'pergerakan' && (
        <div>
          {/* Stat */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Barang Masuk ({r} hr)'.replace('{r}', movement.period_days || 30), value: movement.stock_in, icon: 'fa-arrow-down', color: '#10b981' },
              { label: 'Barang Keluar', value: movement.stock_out, icon: 'fa-arrow-up', color: '#f59e0b' },
              { label: 'Net Movement', value: movement.net >= 0 ? `+${movement.net}` : movement.net, icon: 'fa-balance-scale', color: (movement.net || 0) >= 0 ? '#10b981' : '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  <i className={`fas ${s.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart harian */}
          <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              <i className="fas fa-chart-line" style={{ color: '#6366f1', marginRight: 8 }}></i>Grafik Stok 7 Hari Terakhir
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', minHeight: 200, padding: '0 10px' }}>
              {(movement.daily || []).map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 3, width: '100%', justifyContent: 'center', alignItems: 'flex-end', height: 160 }}>
                    <div style={{ width: '35%', background: '#10b981', borderRadius: '4px 4px 0 0', height: `${(d.stock_in / maxDaily) * 140}px`, minHeight: d.stock_in > 0 ? 10 : 0 }} title={`Masuk: ${d.stock_in}`}></div>
                    <div style={{ width: '35%', background: '#f59e0b', borderRadius: '4px 4px 0 0', height: `${(d.stock_out / maxDaily) * 140}px`, minHeight: d.stock_out > 0 ? 10 : 0 }} title={`Keluar: ${d.stock_out}`}></div>
                  </div>
                  {d.stock_in > 0 && <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981' }}>{d.stock_in}</span>}
                  {d.stock_out > 0 && <span style={{ fontSize: 9, fontWeight: 600, color: '#f59e0b' }}>{d.stock_out}</span>}
                  <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
                    {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 12 }}>
              <span><span style={{ color: '#10b981', fontWeight: 600 }}>■</span> Masuk</span>
              <span><span style={{ color: '#f59e0b', fontWeight: 600 }}>■</span> Keluar</span>
            </div>
          </div>

          {/* By Reason */}
          <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              <i className="fas fa-tags" style={{ color: '#6366f1', marginRight: 8 }}></i>Berdasarkan Alasan
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Alasan', 'Masuk', 'Keluar', 'Transaksi'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '10px 12px', borderBottom: '1px solid #eef2f6', textAlign: 'left', background: '#f6f8fc' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(movement.by_reason || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #eef2f6', fontWeight: 600 }}>{reasonLabel[r.reason] || r.reason}</td>
                    <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #eef2f6', color: '#10b981', fontWeight: 600 }}>{r.total_in > 0 ? `+${r.total_in}` : '-'}</td>
                    <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #eef2f6', color: '#ef4444', fontWeight: 600 }}>{r.total_out > 0 ? `-${r.total_out}` : '-'}</td>
                    <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #eef2f6' }}>{r.count}x</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 700, padding: '12px' }}>Total</td>
                  <td style={{ fontWeight: 700, padding: '12px', color: '#10b981' }}>+{movement.stock_in}</td>
                  <td style={{ fontWeight: 700, padding: '12px', color: '#ef4444' }}>-{movement.stock_out}</td>
                  <td style={{ fontWeight: 700, padding: '12px' }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Riwayat Lengkap */}
      {tab === 'riwayat' && (
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden' }}>
          {(movement.recent || []).length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-inbox" style={{ fontSize: 36, marginBottom: 12, color: '#94a3b8' }}></i>
              <p>Belum ada riwayat pergerakan stok</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Waktu', 'Produk', 'Kategori', 'Stok Sebelum', 'Stok Akhir', 'Perubahan', 'Alasan', 'Catatan'].map(h => (
                    <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', borderBottom: '1px solid #eef2f6', padding: '10px 12px', background: '#f6f8fc', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(movement.recent || []).map((m, i) => (
                  <tr key={m.id || i}>
                    <td style={{ fontSize: 12, padding: '10px 12px', borderBottom: '1px solid #eef2f6', whiteSpace: 'nowrap', color: '#64748b' }}>
                      {new Date(m.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #eef2f6', fontWeight: 600 }}>{m.product_name}</td>
                    <td style={{ fontSize: 12, padding: '10px 12px', borderBottom: '1px solid #eef2f6', color: '#6366f1', fontWeight: 600 }}>{m.category}</td>
                    <td style={{ fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #eef2f6', textAlign: 'center' }}>{m.stock_before}</td>
                    <td style={{ fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #eef2f6', textAlign: 'center', fontWeight: 600 }}>{m.stock_after}</td>
                    <td style={{ fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #eef2f6', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: m.type === 'masuk' ? '#10b981' : '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <i className={`fas ${m.type === 'masuk' ? 'fa-arrow-down' : 'fa-arrow-up'}`} style={{ fontSize: 10 }}></i>
                        {m.type === 'masuk' ? '+' : ''}{m.change}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, padding: '10px 12px', borderBottom: '1px solid #eef2f6', color: '#64748b' }}>
                      {reasonLabel[m.reason] || m.reason}
                    </td>
                    <td style={{ fontSize: 12, padding: '10px 12px', borderBottom: '1px solid #eef2f6', color: '#94a3b8' }}>
                      {m.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
