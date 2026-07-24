export default function Navbar({ page, onNavigate }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { key: 'produk', label: 'Produk', icon: 'fa-box' },
    { key: 'scan', label: 'AI Scan', icon: 'fa-robot' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 60,
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #eef2f6', zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard') }}
           style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 15, boxShadow: '0 3px 10px rgba(99,102,241,0.3)'
          }}>
            <i className="fas fa-bolt"></i>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Smart Inventory</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#94a3b8', fontWeight: 600 }}>Toko Listrik</div>
          </div>
        </a>
        <div style={{ display: 'flex', gap: 2 }}>
          {items.map(item => (
            <a key={item.key} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.key) }}
               style={{
                 display: 'flex', alignItems: 'center', gap: 7,
                 padding: '8px 16px', borderRadius: 8,
                 fontSize: 13.5, fontWeight: page === item.key ? 600 : 500,
                 color: page === item.key ? '#6366f1' : '#475569',
                 background: page === item.key ? 'rgba(99,102,241,0.1)' : 'transparent',
                 transition: 'all 0.2s'
               }}>
              <i className={`fas ${item.icon}`} style={{ fontSize: 14 }}></i>
              {item.label}
            </a>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 600
        }}>A</div>
      </div>
    </nav>
  )
}
