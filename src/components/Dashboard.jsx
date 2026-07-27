import { useState, useEffect } from 'react'
import { dashboardApi } from '../services/api'

const MOCK_STATS = {
  total_products: 18,
  total_stock: 962,
  low_stock_count: 7,
  categories_count: 7,
  stock_in: 245,
  stock_out: 189,
  stock_in_today: 12,
  stock_out_today: 8,
  net_movement: 56,
  total_movements: 40,
}

const MOCK_MOVEMENT = {
  stock_in: 245,
  stock_out: 189,
  net: 56,
  recent: [
    { id: 1, product_name: 'MCB Schneider 20A', change: 10, type: 'masuk', reason: 'purchase', created_at: '2026-07-24T08:00:00' },
    { id: 2, product_name: 'Kabel NYM 2.5mm', change: -3, type: 'keluar', reason: 'sale', created_at: '2026-07-24T07:30:00' },
    { id: 3, product_name: 'Fitting E27', change: 25, type: 'masuk', reason: 'purchase', created_at: '2026-07-24T07:00:00' },
    { id: 4, product_name: 'MCB Broco 20A', change: -1, type: 'keluar', reason: 'sale', created_at: '2026-07-23T16:00:00' },
    { id: 5, product_name: 'Lampu LED 10W', change: 15, type: 'masuk', reason: 'purchase', created_at: '2026-07-23T10:00:00' },
  ],
}

const MOCK_TOP = [
  { id: 1, name: 'MCB Schneider 20A', category: 'MCB', price: 85000, stock: 45 },
  { id: 2, name: 'Kabel NYM 2.5mm', category: 'Kabel', price: 285000, stock: 12 },
  { id: 3, name: 'Fitting E27', category: 'Fitting', price: 8500, stock: 120 },
  { id: 4, name: 'Saklar Broco 1G', category: 'Saklar', price: 18000, stock: 55 },
  { id: 5, name: 'Lampu LED 10W', category: 'Lampu', price: 35000, stock: 85 },
]

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(MOCK_STATS)
  const [topProducts, setTopProducts] = useState(MOCK_TOP)
  const [movement, setMovement] = useState(MOCK_MOVEMENT)
  const [source, setSource] = useState('mock')

  useEffect(() => {
    let alive = true

    Promise.allSettled([
      dashboardApi.stats(),
      dashboardApi.topProducts(),
      dashboardApi.stockMovement({ limit: 8, days: 30 }),
    ]).then(([statsRes, topRes, moveRes]) => {
      if (!alive) return

      let gotApi = false

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        const d = statsRes.value.data
        setStats(prev => ({
          ...prev,
          ...d,
          // jaga field masuk/keluar kalau backend belum update
          stock_in: d.stock_in ?? prev.stock_in ?? 0,
          stock_out: d.stock_out ?? prev.stock_out ?? 0,
          total_movements: d.total_movements ?? prev.total_movements ?? 0,
          net_movement: d.net_movement ?? ((d.stock_in ?? 0) - (d.stock_out ?? 0)),
        }))
        gotApi = true
      }

      if (topRes.status === 'fulfilled' && Array.isArray(topRes.value?.data) && topRes.value.data.length) {
        setTopProducts(topRes.value.data)
        gotApi = true
      }

      if (moveRes.status === 'fulfilled' && moveRes.value?.data) {
        const m = moveRes.value.data
        setMovement(prev => ({
          ...prev,
          ...m,
          recent: Array.isArray(m.recent) && m.recent.length ? m.recent : prev.recent,
        }))
        // sinkronkan total masuk/keluar dari movement bila ada
        if (m.stock_in != null || m.stock_out != null) {
          setStats(prev => ({
            ...prev,
            stock_in: m.stock_in ?? prev.stock_in,
            stock_out: m.stock_out ?? prev.stock_out,
            net_movement: (m.net != null) ? m.net : ((m.stock_in ?? prev.stock_in) - (m.stock_out ?? prev.stock_out)),
          }))
        }
        gotApi = true
      }

      setSource(gotApi ? 'api' : 'mock')
    })

    return () => { alive = false }
  }, [])

  const statItems = [
    { label: 'Total Produk', value: stats.total_products ?? 0, icon: 'fa-box', color: '#6366f1', bar: '80%' },
    { label: 'Semua Stok', value: Number(stats.total_stock || 0).toLocaleString('id-ID'), icon: 'fa-warehouse', color: '#06b6d4', bar: '60%' },
    { label: 'Barang Masuk', value: Number(stats.stock_in || 0).toLocaleString('id-ID'), icon: 'fa-arrow-down', color: '#10b981', bar: '55%' },
    { label: 'Barang Keluar', value: Number(stats.stock_out || 0).toLocaleString('id-ID'), icon: 'fa-arrow-up', color: '#f59e0b', bar: '45%' },
    { label: 'Stok Menipis', value: stats.low_stock_count ?? 0, icon: 'fa-exclamation-triangle', color: '#ef4444', bar: '30%' },
    { label: 'Total Transaksi', value: stats.total_movements ?? 0, icon: 'fa-exchange-alt', color: '#8b5cf6', bar: '40%' },
  ]

  const reasonLabel = {
    purchase: 'Pembelian',
    sale: 'Penjualan',
    manual: 'Manual',
    ai_scan: 'AI Scan',
    adjustment: 'Penyesuaian',
  }

  const recent = movement.recent || []

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
          Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4, flexWrap: 'wrap' }}>
          <i className="fas fa-home"></i>
          <span>Home / Dashboard</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
            background: source === 'api' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            color: source === 'api' ? '#059669' : '#d97706',
          }}>
            {source === 'api' ? 'Live MySQL' : 'Mock Data'}
          </span>
          {stats.net_movement !== undefined && (
            <span style={{ fontWeight: 600, color: Number(stats.net_movement) >= 0 ? '#10b981' : '#ef4444' }}>
              · Net: {Number(stats.net_movement) >= 0 ? '+' : ''}{stats.net_movement} unit
            </span>
          )}
        </div>
      </div>

      {/* 6 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {statItems.map((s, i) => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 18,
            position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: s.bar, background: s.color }} />
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 10,
            }}>
              <i className={`fas ${s.icon}`}></i>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color === '#10b981' || s.color === '#f59e0b' ? s.color : '#0f172a' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Highlight masuk/keluar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
          border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>
            <i className="fas fa-arrow-down" style={{ marginRight: 6 }}></i>TOTAL BARANG MASUK
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>
            +{Number(stats.stock_in || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Hari ini: +{Number(stats.stock_in_today || 0).toLocaleString('id-ID')} unit
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
          border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>
            <i className="fas fa-arrow-up" style={{ marginRight: 6 }}></i>TOTAL BARANG KELUAR
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>
            -{Number(stats.stock_out || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Hari ini: -{Number(stats.stock_out_today || 0).toLocaleString('id-ID')} unit
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Aktivitas terbaru */}
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              <i className="fas fa-clock" style={{ color: '#6366f1', marginRight: 8 }}></i>
              Aktivitas Stok Terbaru
            </h3>
            <button
              onClick={() => onNavigate('laporan')}
              style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Lihat Semua →
            </button>
          </div>
          <div>
            {recent.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Belum ada transaksi stok
              </div>
            ) : recent.map((m, i) => (
              <div
                key={m.id || i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px',
                  borderBottom: i < recent.length - 1 ? '1px solid #eef2f6' : 'none',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: m.type === 'masuk' || m.change > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: m.type === 'masuk' || m.change > 0 ? '#10b981' : '#f59e0b',
                }}>
                  <i className={`fas ${m.type === 'masuk' || m.change > 0 ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.product_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {reasonLabel[m.reason] || m.reason}
                    {m.created_at ? ` · ${new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: (m.type === 'masuk' || m.change > 0) ? '#10b981' : '#ef4444',
                }}>
                  {m.change > 0 ? '+' : ''}{m.change}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Produk + quick actions */}
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #eef2f6' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              <i className="fas fa-trophy" style={{ color: '#f59e0b', marginRight: 8 }}></i>
              Produk Stok Tertinggi
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Produk', 'Kategori', 'Stok'].map(h => (
                  <th key={h} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                    color: '#94a3b8', borderBottom: '1px solid #eef2f6', padding: '10px 14px',
                    background: '#f6f8fc', textAlign: 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 5).map((p, i) => (
                <tr key={p.id}>
                  <td style={{ fontSize: 13, padding: '11px 14px', borderBottom: '1px solid #eef2f6' }}>
                    <span style={{
                      display: 'inline-flex', padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: 'rgba(99,102,241,0.1)', color: '#4f46e5',
                    }}>#{i + 1}</span>
                  </td>
                  <td style={{ fontSize: 13, padding: '11px 14px', borderBottom: '1px solid #eef2f6', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontSize: 13, padding: '11px 14px', borderBottom: '1px solid #eef2f6', color: '#6366f1', fontWeight: 600 }}>{p.category}</td>
                  <td style={{ fontSize: 13, padding: '11px 14px', borderBottom: '1px solid #eef2f6' }}>{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '14px 16px', display: 'flex', gap: 8, borderTop: '1px solid #eef2f6' }}>
            <button onClick={() => onNavigate('laporan')} style={btnStyle('#6366f1')}>
              <i className="fas fa-chart-bar"></i> Laporan
            </button>
            <button onClick={() => onNavigate('stok')} style={btnStyle('#06b6d4')}>
              <i className="fas fa-warehouse"></i> Stok
            </button>
            <button onClick={() => onNavigate('scan')} style={{
              flex: 1, padding: '9px 0', border: 'none', borderRadius: 8,
              background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <i className="fas fa-camera"></i> AI Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    flex: 1, padding: '9px 0', border: `1px solid ${color}`, borderRadius: 8,
    background: `${color}15`, color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
}
