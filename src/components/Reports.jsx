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

const MOCK_TOP = [
  { id: 7, name: 'Fitting E27 Porselen', category: 'Fitting', stock: 120, price: 8500 },
  { id: 16, name: 'Isolasi Listrik 3M', category: 'Aksesoris', stock: 200, price: 12000 },
  { id: 17, name: 'Kabel Ties 20cm', category: 'Aksesoris', stock: 150, price: 15000 },
  { id: 14, name: 'LED Philips 10W', category: 'Lampu', stock: 85, price: 35000 },
  { id: 1, name: 'MCB Schneider 20A', category: 'MCB', stock: 45, price: 85000 },
]

export default function Reports() {
  const [analytics, setAnalytics] = useState(MOCK_ANALYTICS)
  const [top, setTop] = useState(MOCK_TOP)

  useEffect(() => {
    stockApi.analytics().then(res => setAnalytics(res.data)).catch(() => {})
    dashboardApi.topProducts().then(res => setTop(res.data)).catch(() => {})
  }, [])

  const totalValue = MOCK_TOP.reduce((a, b) => a + (b.stock * b.price), 0)
  const barColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
          <i className="fas fa-chart-bar" style={{ color: '#6366f1', marginRight: 8 }}></i>
          Laporan & Analitik
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          <i className="fas fa-home"></i><span>Home / Laporan</span>
        </div>
      </div>

      {/* Ringkasan Atas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Produk', value: analytics.total_products, icon: 'fa-box', color: '#6366f1' },
          { label: 'Total Stok', value: analytics.total_stock?.toLocaleString() || '0', icon: 'fa-warehouse', color: '#06b6d4' },
          { label: 'Stok Menipis', value: analytics.low_stock_count, icon: 'fa-exclamation-triangle', color: '#f59e0b' },
          { label: 'Total Nilai Stok', value: `Rp ${(totalValue / 1000000).toFixed(1)}jt`, icon: 'fa-coins', color: '#10b981' },
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
        {/* Pie chart kategori (simplified bar) */}
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            <i className="fas fa-chart-pie" style={{ color: '#6366f1', marginRight: 8 }}></i>
            Distribusi Kategori
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analytics.categories.map((cat, i) => {
              const pct = ((cat.count / analytics.total_products) * 100).toFixed(0)
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

        {/* Top stok tertinggi */}
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            <i className="fas fa-arrow-up" style={{ color: '#10b981', marginRight: 8 }}></i>
            Stok Tertinggi
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
                    <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: i < 3 ? 'rgba(16,185,129,0.1)' : '#f1f5f9', color: i < 3 ? '#059669' : '#64748b' }}>#{i+1}</span>
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
    </div>
  )
}
