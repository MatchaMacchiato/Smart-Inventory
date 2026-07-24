import { useEffect, useRef, useState } from 'react'

export default function ARViewer({ product, onBack }) {
  const modelRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
  }, [])

  const getModelUrl = () => {
    // Gunakan file lokal dari public/models/
    const models = {
      'MCB': '/models/Astronaut.glb',
      'Fitting': '/models/NeilArmstrong.glb',
      'Saklar': '/models/RobotExpressive.glb',
      'Kabel': '/models/Astronaut.glb',
      'Panel': '/models/NeilArmstrong.glb',
      'Lampu': '/models/RobotExpressive.glb',
    }
    return product.model_3d_url || models[product.category] || '/models/Astronaut.glb'
  }

  const specs = product.specifications ? Object.entries(product.specifications).map(([k, v]) => ({ label: k, value: v })) : []

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
            <i className="fas fa-cube" style={{ color: '#6366f1', marginRight: 8 }}></i>{product.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            <span>{product.category}</span>
          </div>
        </div>
        <button onClick={onBack}
          style={{ padding: '9px 20px', border: '1px solid #eef2f6', borderRadius: 10, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-arrow-left"></i> Kembali
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 16, padding: 20, minHeight: 400 }}>
          <model-viewer ref={modelRef} src={getModelUrl()} alt={product.name}
            ar={isMobile} ar-modes="webxr scene-viewer quick-look"
            camera-controls shadow-intensity="1" auto-rotate
            style={{ width: '100%', height: '400px', background: 'linear-gradient(135deg, #f6f8fc 0%, #eef2f6 100%)', borderRadius: 12 }}
          ></model-viewer>
          {isMobile && (
            <button onClick={() => modelRef.current?.activateAR()}
              style={{ marginTop: 16, width: '100%', padding: '12px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
              <i className="fas fa-camera"></i> Lihat di AR
            </button>
          )}
          {!isMobile && (
            <div style={{ marginTop: 16, padding: '12px 20px', borderRadius: 10, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontSize: 13, fontWeight: 500, textAlign: 'center' }}>
              <i className="fas fa-info-circle"></i> Buka di HP untuk mode AR
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              <i className="fas fa-info-circle" style={{ color: '#6366f1', marginRight: 8 }}></i>Informasi Produk
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Kategori', value: product.category },
                ...specs.map(s => ({ label: s.label.charAt(0).toUpperCase() + s.label.slice(1), value: s.value })),
                { label: 'Harga', value: `Rp ${Number(product.price).toLocaleString()}` },
                { label: 'Stok', value: `${product.stock} unit`, color: product.stock <= product.min_stock ? '#ef4444' : '#10b981' },
                { label: 'Min. Stok', value: product.min_stock },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < (specs.length + 3) ? '1px solid #eef2f6' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.color || '#0f172a' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
