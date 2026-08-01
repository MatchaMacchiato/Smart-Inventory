import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const TITLES = {
  dashboard: 'Dashboard',
  produk: 'Data Produk',
  ar: 'AR 3D Viewer',
  'barang-masuk': 'Barang Masuk',
  'barang-keluar': 'Barang Keluar',
  laporan: 'Laporan Stok',
  'ai-asisten': 'Asisten AI',
  'bom-ai': 'BOM AI Material',
  'ai-scan': 'AI Scan Rak (YOLOv8)',
  'ai-intel': 'AI Intelligence',
  keuangan: 'Keuangan',
}

const ROLE_ICONS = { admin: '🚀', kasir: '💰', gudang: '📦' }

export default function Topbar({ page }) {
  const { user, logout, can } = useAuth()
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

      {(title === 'Dashboard' || title === 'Data Produk') && (
        <div className="topbar-search">
          <i className="fas fa-search"></i>
          <input placeholder="Cari menu, produk, atau fitur..." readOnly />
        </div>
      )}

      <div className="topbar-right">
        <button className="icon-btn" title="Notifikasi" type="button" style={{ position: 'relative' }}>
          <i className="fas fa-bell"></i>
          {user?.role === 'admin' && <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span>}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 8, lineHeight: 1.3 }}>
          <span style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            <i className="fas fa-clock" style={{ marginRight: 4, fontSize: 10 }}></i>{now}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{dateStr}</span>
        </div>
        <div className="user-chip" title="Logout" onClick={logout} style={{ cursor: 'pointer' }}>
          <div className="user-avatar" style={{ fontSize: 18, background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
            {ROLE_ICONS[user?.role] || 'S'}
          </div>
          <div className="user-meta">
            <span style={{ textTransform: 'capitalize' }}>{user?.name || 'User'}</span>
            <span style={{ textTransform: 'capitalize' }}>{user?.role || '-'} <span style={{ color: '#94a3b8' }}>· Klik logout</span></span>
          </div>
        </div>
      </div>
    </header>
  )
}
