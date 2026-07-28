import { useState, useEffect } from 'react'

const TITLES = {
  dashboard: 'Dashboard',
  produk: 'Data Produk',
  ar: 'AR 3D Viewer',
  'barang-masuk': 'Barang Masuk',
  'barang-keluar': 'Barang Keluar',
  laporan: 'Laporan Stok',
  'ai-asisten': 'Asisten AI',
}

export default function Topbar({ page }) {
  const title = TITLES[page] || 'Dashboard'
  const [now, setNow] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )
  const [dateStr] = useState(() =>
    new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  )

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumb">{title} / <strong>{title}</strong></div>
      </div>

      <div className="topbar-search">
        <i className="fas fa-search"></i>
        <input placeholder="Cari menu, produk, atau fitur..." readOnly />
      </div>

      <div className="topbar-right">
        <button className="icon-btn" title="Notifikasi" type="button" style={{ position: 'relative' }}>
          <i className="fas fa-bell"></i>
          <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 8, lineHeight: 1.3 }}>
          <span style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            <i className="fas fa-clock" style={{ marginRight: 4, fontSize: 10 }}></i>{now}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{dateStr}</span>
        </div>
        <div className="user-chip">
          <div className="user-avatar">S</div>
          <div className="user-meta">
            <span>Super Admin</span>
            <span>Toko Listrik</span>
          </div>
        </div>
      </div>
    </header>
  )
}
