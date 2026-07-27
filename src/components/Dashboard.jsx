import { useState, useEffect, useMemo } from 'react'
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
  suppliers: 4,
  users: 2,
}

const MOCK_MOVEMENT = {
  stock_in: 245,
  stock_out: 189,
  net: 56,
  daily: [
    { date: '2026-07-20', stock_in: 30, stock_out: 12 },
    { date: '2026-07-21', stock_in: 18, stock_out: 22 },
    { date: '2026-07-22', stock_in: 42, stock_out: 15 },
    { date: '2026-07-23', stock_in: 25, stock_out: 28 },
    { date: '2026-07-24', stock_in: 35, stock_out: 19 },
    { date: '2026-07-25', stock_in: 48, stock_out: 31 },
    { date: '2026-07-26', stock_in: 47, stock_out: 62 },
  ],
  recent: [
    { id: 1, product_name: 'MCB Schneider 20A', change: 10, type: 'masuk', reason: 'purchase', created_at: '2026-07-26T08:00:00' },
    { id: 2, product_name: 'Kabel NYM 2.5mm', change: -3, type: 'keluar', reason: 'sale', created_at: '2026-07-26T07:30:00' },
    { id: 3, product_name: 'Fitting E27', change: 25, type: 'masuk', reason: 'purchase', created_at: '2026-07-26T07:00:00' },
    { id: 4, product_name: 'MCB Broco 20A', change: -1, type: 'keluar', reason: 'sale', created_at: '2026-07-25T16:00:00' },
    { id: 5, product_name: 'Lampu LED 10W', change: 15, type: 'masuk', reason: 'purchase', created_at: '2026-07-25T10:00:00' },
  ],
}

const reasonLabel = {
  purchase: 'Pembelian',
  sale: 'Penjualan',
  manual: 'Manual',
  ai_scan: 'AI Scan',
  adjustment: 'Penyesuaian',
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(MOCK_STATS)
  const [movement, setMovement] = useState(MOCK_MOVEMENT)
  const [source, setSource] = useState('mock')
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      dashboardApi.stats(),
      dashboardApi.stockMovement({ limit: 8, days: 30 }),
    ]).then(([statsRes, moveRes]) => {
      if (!alive) return
      let got = false
      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        const d = statsRes.value.data
        setStats(prev => ({
          ...prev,
          ...d,
          stock_in: d.stock_in ?? prev.stock_in,
          stock_out: d.stock_out ?? prev.stock_out,
          stock_in_today: d.stock_in_today ?? prev.stock_in_today,
          stock_out_today: d.stock_out_today ?? prev.stock_out_today,
          total_movements: d.total_movements ?? prev.total_movements,
        }))
        got = true
      }
      if (moveRes.status === 'fulfilled' && moveRes.value?.data) {
        const m = moveRes.value.data
        setMovement(prev => ({
          ...prev,
          ...m,
          daily: Array.isArray(m.daily) && m.daily.length ? m.daily : prev.daily,
          recent: Array.isArray(m.recent) && m.recent.length ? m.recent : prev.recent,
        }))
        got = true
      }
      setSource(got ? 'api' : 'mock')
    })
    return () => { alive = false }
  }, [])

  const kpis = [
    { label: 'Total Produk', value: stats.total_products, sub: 'SKU aktif', icon: 'fa-cube', cls: 'kpi-blue' },
    { label: 'Total Stok', value: Number(stats.total_stock || 0).toLocaleString('id-ID'), sub: 'Semua gudang', icon: 'fa-boxes', cls: 'kpi-violet' },
    { label: 'Stok Menipis', value: stats.low_stock_count, sub: 'Perlu restock', icon: 'fa-exclamation-triangle', cls: 'kpi-red' },
    { label: 'Masuk Hari Ini', value: Number(stats.stock_in_today || 0).toLocaleString('id-ID'), sub: 'Barang masuk', icon: 'fa-arrow-down', cls: 'kpi-green' },
    { label: 'Keluar Hari Ini', value: Number(stats.stock_out_today || 0).toLocaleString('id-ID'), sub: 'Barang keluar', icon: 'fa-arrow-up', cls: 'kpi-orange' },
    { label: 'Total Supplier', value: stats.suppliers || 4, sub: 'Partner aktif', icon: 'fa-truck', cls: 'kpi-purple' },
    { label: 'Total User', value: stats.users || 2, sub: 'Akses sistem', icon: 'fa-users', cls: 'kpi-sky' },
    { label: 'Kategori', value: stats.categories_count, sub: 'Kelompok produk', icon: 'fa-tags', cls: 'kpi-indigo' },
  ]

  const daily = movement.daily || []
  const maxDaily = Math.max(1, ...daily.map(d => Math.max(Number(d.stock_in || 0), Number(d.stock_out || 0))))
  const totalOut = Number(movement.stock_out || stats.stock_out || 0)
  const totalIn = Number(movement.stock_in || stats.stock_in || 0)
  const totalMove = Math.max(1, totalIn + totalOut)
  const outPct = Math.round((totalOut / totalMove) * 100)
  const inPct = 100 - outPct

  const donutStyle = useMemo(() => ({
    background: `conic-gradient(#2563eb 0% ${inPct}%, #f97316 ${inPct}% 100%)`,
  }), [inPct])

  const serverTime = clock.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return (
    <div>
      <div className="page-title">Dashboard</div>
      <div className="page-subtitle">
        Ikhtisar performa inventaris toko listrik ·{' '}
        <span style={{
          fontWeight: 700,
          color: source === 'api' ? '#16a34a' : '#d97706',
        }}>
          {source === 'api' ? 'Live MySQL' : 'Mock Data'}
        </span>
      </div>

      {/* KPI */}
      <div className="section-label">
        <h2>Ikhtisar Performa Sistem</h2>
      </div>
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-icon"><i className={`fas ${k.icon}`}></i></div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="section-label">
        <h2>Akses Cepat Admin</h2>
      </div>
      <div className="quick-grid">
        <button className="quick-card" onClick={() => onNavigate('produk')}>
          <div className="quick-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
            <i className="fas fa-plus"></i>
          </div>
          <div>
            <h4>+ Tambah Produk</h4>
            <p>Input barang baru ke katalog</p>
          </div>
        </button>
        <button className="quick-card" onClick={() => onNavigate('stok')}>
          <div className="quick-icon" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>
            <i className="fas fa-arrow-down"></i>
          </div>
          <div>
            <h4>+ Barang Masuk</h4>
            <p>Catat restock / adjust stok</p>
          </div>
        </button>
        <button className="quick-card" onClick={() => onNavigate('laporan')}>
          <div className="quick-icon" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
            <i className="fas fa-download"></i>
          </div>
          <div>
            <h4>↓ Unduh Laporan</h4>
            <p>Lihat analitik & riwayat stok</p>
          </div>
        </button>
        <div className="quick-card dark" style={{ cursor: 'default' }}>
          <div className="quick-icon" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div>
            <h4>Waktu Server</h4>
            <p style={{ color: '#cbd5e1', fontWeight: 700, fontSize: 15 }}>{serverTime} WIB</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="section-label">
        <h2>Visualisasi Data Aktual</h2>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Alur Transaksi Bulanan</h3>
            <span className="badge-pill">STATISTIK</span>
          </div>
          <div className="panel-body">
            <div className="bar-chart">
              {daily.map((d, i) => (
                <div className="bar-col" key={d.date || i}>
                  <div className="bar-pair">
                    <div
                      className="bar in"
                      style={{ height: `${(Number(d.stock_in || 0) / maxDaily) * 100}%` }}
                      title={`Masuk: ${d.stock_in}`}
                    />
                    <div
                      className="bar out"
                      style={{ height: `${(Number(d.stock_out || 0) / maxDaily) * 100}%` }}
                      title={`Keluar: ${d.stock_out}`}
                    />
                  </div>
                  <div className="bar-label">
                    {d.date
                      ? new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                      : `H${i + 1}`}
                  </div>
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
            <h3>Proporsi Stok Masuk/Keluar</h3>
            <span className="badge-pill">ANALITIK</span>
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
                <div className="donut-legend-item">
                  <div className="left">
                    <span className="legend-dot" style={{ background: '#2563eb' }}></span>
                    Barang Masuk
                  </div>
                  <strong>{totalIn}</strong>
                </div>
                <div className="donut-legend-item">
                  <div className="left">
                    <span className="legend-dot" style={{ background: '#f97316' }}></span>
                    Barang Keluar
                  </div>
                  <strong>{totalOut}</strong>
                </div>
                <div className="donut-legend-item">
                  <div className="left">
                    <span className="legend-dot" style={{ background: '#16a34a' }}></span>
                    Net Movement
                  </div>
                  <strong style={{ color: (totalIn - totalOut) >= 0 ? '#16a34a' : '#ef4444' }}>
                    {(totalIn - totalOut) >= 0 ? '+' : ''}{totalIn - totalOut}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="panel">
        <div className="panel-head">
          <h3>Aktivitas Stok Terbaru</h3>
          <button
            onClick={() => onNavigate('laporan')}
            style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            Lihat Semua →
          </button>
        </div>
        <div className="panel-body" style={{ paddingTop: 4, paddingBottom: 8 }}>
          <div className="activity-list">
            {(movement.recent || []).slice(0, 6).map((m, i) => {
              const isIn = m.type === 'masuk' || m.change > 0
              return (
                <div className="activity-row" key={m.id || i}>
                  <div className={`activity-icon ${isIn ? 'in' : 'out'}`}>
                    <i className={`fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{m.product_name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {reasonLabel[m.reason] || m.reason}
                      {m.created_at
                        ? ` · ${new Date(m.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: isIn ? '#16a34a' : '#ef4444', fontSize: 14 }}>
                    {m.change > 0 ? '+' : ''}{m.change}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
