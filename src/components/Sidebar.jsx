const GROUPS = [
  {
    title: 'UTAMA',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-th-large', roles: ['admin', 'kasir', 'gudang'] },
      { key: 'produk', label: 'Data Produk', icon: 'fa-box', roles: ['admin', 'kasir', 'gudang'] },
      { key: 'laporan', label: 'Laporan Stok', icon: 'fa-chart-bar', roles: ['admin', 'kasir', 'gudang'] },
      { key: 'keuangan', label: 'Keuangan', icon: 'fa-file-invoice-dollar', roles: ['admin', 'kasir'] },
    ],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { key: 'barang-masuk', label: 'Barang Masuk', icon: 'fa-arrow-down', roles: ['admin', 'gudang'] },
      { key: 'barang-keluar', label: 'Barang Keluar', icon: 'fa-arrow-up', roles: ['admin', 'kasir'] },
    ],
  },
  {
    title: 'SCANNER & TOOLS',
    items: [
      { key: 'ai-asisten', label: 'Asisten AI', icon: 'fa-robot', roles: ['admin', 'kasir', 'gudang'] },
      { key: 'bom-ai', label: 'BOM AI Material', icon: 'fa-magic', roles: ['admin', 'kasir', 'gudang'] },
      { key: 'ai-scan', label: 'AI Scan Rak', icon: 'fa-camera', roles: ['admin', 'gudang'] },
      { key: 'ar', label: 'AR 3D Viewer', icon: 'fa-cube', roles: ['admin', 'kasir', 'gudang'] },
    ],
  },
]

import { useAuth } from '../context/AuthContext'

export default function Sidebar({ page, onNavigate }) {
  const { user } = useAuth()
  const role = user?.role || 'admin'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="fas fa-cube"></i>
        </div>
        <div className="sidebar-brand-text">
          INVENTORY PRO<br />SYSTEM
        </div>
      </div>

      <nav className="sidebar-nav">
        {GROUPS.map((group) => {
          const items = group.items.filter(i => !i.roles || i.roles.includes(role))
          if (!items.length) return null
          return (
            <div key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {items.map((item, idx) => {
                const active =
                  page === item.key ||
                  (item.key === 'produk' && page === 'ar') ||
                  (item.key === 'ar' && page === 'ar')
                return (
                  <button
                    key={`${group.title}-${item.key}-${idx}`}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => onNavigate(item.key)}
                    type="button"
                  >
                    <i className={`fas ${item.icon}`}></i>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8' }}>
        <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{user?.name || 'User'}</div>
        <div style={{ textTransform: 'capitalize' }}>Role: {role}</div>
      </div>
    </aside>
  )
}
