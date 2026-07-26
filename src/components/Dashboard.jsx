import { useState, useEffect } from 'react'
import { dashboardApi } from '../services/api'

const MOCK_DATA = {
  stats: { total_products: 18, total_stock: 962, low_stock_count: 7, categories_count: 7 },
  top: [
    { id: 1, name: 'MCB Schneider 20A', category: 'MCB', price: 85000, stock: 45 },
    { id: 2, name: 'Kabel NYM 2.5mm', category: 'Kabel', price: 285000, stock: 12 },
    { id: 3, name: 'Fitting E27', category: 'Fitting', price: 8500, stock: 120 },
    { id: 4, name: 'Saklar Broco 1G', category: 'Saklar', price: 18000, stock: 55 },
    { id: 5, name: 'Lampu LED 10W', category: 'Lampu', price: 35000, stock: 85 },
  ]
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(MOCK_DATA.stats)
  const [topProducts, setTopProducts] = useState(MOCK_DATA.top)

  useEffect(() => {
    dashboardApi.stats()
      .then(res => setStats(res.data))
      .catch(() => {})
    dashboardApi.topProducts()
      .then(res => setTopProducts(res.data))
      .catch(() => {})
  }, [])

  const statItems = [
    { label: 'Total Produk', value: stats.total_products, icon: 'fa-box', color: '#6366f1', bar: '80%' },
    { label: 'Semua Stok', value: stats.total_stock?.toLocaleString() || '0', icon: 'fa-warehouse', color: '#06b6d4', bar: '60%' },
    { label: 'Kategori', value: stats.categories_count, icon: 'fa-tags', color: '#10b981', bar: '45%' },
    { label: 'Stok Menipis', value: stats.low_stock_count, icon: 'fa-exclamation-triangle', color: '#ef4444', bar: '35%' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          <i className="fas fa-home"></i><span>Home / Dashboard</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statItems.map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, width: s.bar, background: s.color, borderRadius: '0 2px 0 0' }}></div>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, marginBottom: 12 }}>
              <i className={`fas ${s.icon}`}></i>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: '#475569', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #eef2f6' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}><i className="fas fa-trophy" style={{ color: '#f59e0b', marginRight: 8 }}></i>Produk Terlaris</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Produk', 'Kategori', 'Stok', 'Harga'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', borderBottom: '1px solid #eef2f6', padding: '12px 16px', background: '#f6f8fc', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ fontSize: 13, padding: '13px 16px', borderBottom: '1px solid #eef2f6' }}>
                    <span style={{ display: 'inline-flex', padding: '4px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>#{i+1}</span>
                  </td>
                  <td style={{ fontSize: 13, padding: '13px 16px', borderBottom: '1px solid #eef2f6', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontSize: 13, padding: '13px 16px', borderBottom: '1px solid #eef2f6', color: '#6366f1', fontWeight: 600 }}>{p.category}</td>
                  <td style={{ fontSize: 13, padding: '13px 16px', borderBottom: '1px solid #eef2f6' }}>{p.stock}</td>
                  <td style={{ fontSize: 13, padding: '13px 16px', borderBottom: '1px solid #eef2f6' }}>Rp {Number(p.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #eef2f6' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}><i className="fas fa-rocket" style={{ color: '#6366f1', marginRight: 8 }}></i>Quick Actions</h3>
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => onNavigate('scan')}
              style={{ padding: '12px 20px', border: '1px solid #6366f1', borderRadius: 10, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-camera"></i> 📸 AI Scan Rak
            </button>
            <button onClick={() => onNavigate('produk')}
              style={{ padding: '12px 20px', border: '1px solid #06b6d4', borderRadius: 10, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-box"></i> 📦 Lihat Produk 3D
            </button>
            <button onClick={() => onNavigate('stok')}
              style={{ padding: '12px 20px', border: '1px solid #f59e0b', borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: '#d97706', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-warehouse"></i> 📊 Kelola Stok
            </button>
            <button onClick={() => onNavigate('laporan')}
              style={{ padding: '12px 20px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
              <i className="fas fa-chart-bar"></i> 📈 Lihat Laporan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
