export default function Navbar({ page, onNavigate }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { key: 'produk', label: 'Produk', icon: 'fa-box' },
    { key: 'stok', label: 'Stok', icon: 'fa-warehouse' },
    { key: 'laporan', label: 'Laporan', icon: 'fa-chart-bar' },
    { key: 'scan', label: 'AI Scan', icon: 'fa-robot' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 60, zIndex: 100,
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #E6E8EA',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: "'Plus Jakarta Sans','Inter',sans-serif"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>
          <i className="fas fa-bolt"></i>
        </div>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#0F172A' }}>
          Smart Inventory
        </span>
        <span style={{ fontSize: 11, color: '#334155', fontWeight: 600, background: 'rgba(51,65,85,0.09)', padding: '2px 8px', borderRadius: 6 }}>
          TOKO LISTRIK
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: page === item.key ? 'rgba(51,65,85,0.09)' : 'transparent',
              color: page === item.key ? '#334155' : '#94A3B8',
              fontSize: 13, fontWeight: page === item.key ? 700 : 500,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <i className={`fas ${item.icon}`}></i>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
          A
        </div>
      </div>
    </nav>
  )
}
