const GROUPS = [
  {
    title: 'UTAMA',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
      { key: 'produk', label: 'Data Produk', icon: 'fa-box' },
      { key: 'laporan', label: 'Laporan Stok', icon: 'fa-chart-bar' },
    ],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { key: 'barang-masuk', label: 'Barang Masuk', icon: 'fa-arrow-down' },
      { key: 'barang-keluar', label: 'Barang Keluar', icon: 'fa-arrow-up' },
    ],
  },
  {
    title: 'SCANNER & TOOLS',
    items: [
      { key: 'ai-asisten', label: 'Asisten AI', icon: 'fa-robot' },
      { key: 'ar', label: 'AR 3D Viewer', icon: 'fa-cube' },
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
            {group.items.map((item, idx) => {
              const active =
                page === item.key ||
                (item.key === 'produk' && page === 'ar') ||
                (item.key === 'ar' && page === 'ar') ||
                (item.key === 'laporan' && page === 'laporan')
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
        ))}
      </nav>
    </aside>
  )
}
