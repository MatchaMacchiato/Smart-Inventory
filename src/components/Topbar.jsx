const TITLES = {
  dashboard: 'Dashboard',
  produk: 'Data Produk',
  ar: 'AR 3D Viewer',
  stok: 'Stok & Gudang',
  laporan: 'Laporan Stok',
  scan: 'Smart Scanner AI',
}

export default function Topbar({ page }) {
  const title = TITLES[page] || 'Dashboard'
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumb">
          {title} / <strong>{title}</strong>
        </div>
      </div>

      <div className="topbar-search">
        <i className="fas fa-search"></i>
        <input placeholder="Cari produk, SKU, kategori..." />
      </div>

      <div className="topbar-right">
        <button className="icon-btn" title="Notifikasi" type="button">
          <i className="fas fa-bell"></i>
          <span className="dot"></span>
        </button>
        <div className="user-chip" title={`Waktu server ${now}`}>
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
