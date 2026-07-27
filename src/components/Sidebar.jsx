const GROUPS = [
  {
    title: 'UTAMA',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
      { key: 'produk', label: 'Data Produk', icon: 'fa-box' },
      { key: 'stok', label: 'Stok & Gudang', icon: 'fa-warehouse' },
      { key: 'laporan', label: 'Laporan Stok', icon: 'fa-chart-bar' },
    ],
  },
  {
    title: 'TRANSAKSI STOK',
    items: [
      { key: 'stok-masuk', label: 'Stok Masuk', icon: 'fa-arrow-down', alias: 'stok' },
      { key: 'stok-keluar', label: 'Stok Keluar', icon: 'fa-arrow-up', alias: 'stok' },
      { key: 'penyesuaian', label: 'Penyesuaian Stok', icon: 'fa-sliders-h', alias: 'stok' },
    ],
  },
  {
    title: 'SCANNER & TOOLS',
    items: [
      { key: 'scan', label: 'Smart Scanner AI', icon: 'fa-robot' },
      { key: 'ar', label: 'AR 3D Viewer', icon: 'fa-cube', alias: 'produk' },
    ],
  },
  {
    title: 'ADMIN & DATA',
    items: [
      { key: 'laporan', label: 'Analitik', icon: 'fa-chart-pie' },
    ],
  },
]

export default function Sidebar({ page, onNavigate }) {
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
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="nav-group-title">{group.title}</div>
            {group.items.map((item) => {
              const target = item.alias || item.key
              const active = page === item.key || page === target ||
                (item.key === 'dashboard' && page === 'dashboard') ||
                (item.key === 'produk' && (page === 'produk' || page === 'ar'))
              return (
                <button
                  key={item.key + item.label}
                  className={`nav-item ${active && (item.key === page || target === page || (item.key === 'produk' && page === 'ar')) ? 'active' : ''}`}
                  onClick={() => onNavigate(target)}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
