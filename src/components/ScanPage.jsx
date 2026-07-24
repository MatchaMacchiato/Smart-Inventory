import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ARViewer from './ARViewer'

export default function ScanPage({ onBack }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    // Coba ambil dari API, fallback ke mock
    const mockProducts = [
      { id: 1, name: 'MCB Schneider 20A 1 Phase', category: 'MCB', price: 85000, stock: 45, min_stock: 10, specifications: { Ampere: '20A', Pole: '1P', Breaking: '6kA' } },
      { id: 2, name: 'MCB Schneider 10A 1 Phase', category: 'MCB', price: 75000, stock: 32, min_stock: 10, specifications: { Ampere: '10A', Pole: '1P', Breaking: '6kA' } },
      { id: 3, name: 'MCB Broco 20A 1 Phase', category: 'MCB', price: 55000, stock: 3, min_stock: 15, specifications: { Ampere: '20A', Pole: '1P', Breaking: '4.5kA' } },
      { id: 4, name: 'Kabel NYM 2×2.5mm @50m', category: 'Kabel', price: 285000, stock: 12, min_stock: 5, specifications: { Type: 'NYM', Core: '2×2.5mm²', Panjang: '50m' } },
      { id: 5, name: 'Kabel NYM 3×2.5mm @50m', category: 'Kabel', price: 385000, stock: 8, min_stock: 5, specifications: { Type: 'NYM', Core: '3×2.5mm²', Panjang: '50m' } },
      { id: 6, name: 'Kabel NYA 2.5mm @100m', category: 'Kabel', price: 175000, stock: 20, min_stock: 10, specifications: { Type: 'NYA', Size: '2.5mm', Panjang: '100m' } },
      { id: 7, name: 'Fitting Lampu E27 Porselen', category: 'Fitting', price: 8500, stock: 120, min_stock: 25, specifications: { Base: 'E27', Material: 'Porselen', MaxWatt: '60W' } },
      { id: 8, name: 'Fitting Lampu GU10 Keramik', category: 'Fitting', price: 12500, stock: 65, min_stock: 20, specifications: { Base: 'GU10', Material: 'Keramik', MaxWatt: '50W' } },
      { id: 9, name: 'Saklar Broco 1 Gang Putih', category: 'Saklar', price: 18000, stock: 55, min_stock: 20, specifications: { Gang: '1', Warna: 'Putih', Material: 'PVC' } },
      { id: 10, name: 'Saklar Broco 2 Gang Putih', category: 'Saklar', price: 25000, stock: 42, min_stock: 15, specifications: { Gang: '2', Warna: 'Putih', Material: 'PVC' } },
    ]

    const found = mockProducts.find(p => p.id === parseInt(id))
    if (found) {
      setProduct(found)
    } else {
      // Fallback: product not found
      setProduct(null)
    }
    setLoading(false)

    // Try API
    import('../services/api').then(({ productApi }) => {
      productApi.get(id).then(res => setProduct(res.data)).catch(() => {})
    })
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ fontSize: 14, color: '#475569' }}>Memuat produk...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Produk Tidak Ditemukan</h2>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>QR Code ini tidak valid atau produk sudah dihapus</p>
          <button onClick={() => window.location.href = '/'}
            style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#6366f1', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Scan Success Banner */}
      <div style={{ marginBottom: 20, padding: '12px 20px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>QR Code Terdeteksi!</span>
          <span style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>Produk: <strong>{product.name}</strong></span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          <i className="fas fa-clock"></i> {new Date().toLocaleString('id-ID')}
        </div>
      </div>

      {/* AR Viewer langsung */}
      <ARViewer product={product} onBack={() => window.location.href = '/'} />
    </div>
  )
}
