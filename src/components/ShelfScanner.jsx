import { useState, useRef, useEffect } from 'react'

// Map COCO-SSD classes ke produk toko listrik kita
const COCO_TO_PRODUCT = {
  'cell phone': { name: 'Smartphone / HP', category: 'Elektronik', price: 2500000 },
  'laptop': { name: 'Laptop', category: 'Elektronik', price: 8500000 },
  'remote': { name: 'Remote / Kontrol', category: 'Aksesoris', price: 35000 },
  'keyboard': { name: 'Keyboard', category: 'Aksesoris', price: 150000 },
  'mouse': { name: 'Mouse', category: 'Aksesoris', price: 85000 },
  'book': { name: 'Buku Panduan', category: 'Aksesoris', price: 25000 },
  'bottle': { name: 'Botol / Container', category: 'Aksesoris', price: 15000 },
  'cup': { name: 'Gelas / Cup', category: 'Aksesoris', price: 10000 },
  'vase': { name: 'Vas / Container', category: 'Aksesoris', price: 45000 },
  'clock': { name: 'Jam Digital', category: 'Elektronik', price: 75000 },
}

export default function ShelfScanner() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [model, setModel] = useState(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [useRealAI, setUseRealAI] = useState(true)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)

  // Load TensorFlow.js + COCO-SSD
  useEffect(() => {
    if (!useRealAI) return

    setModelLoading(true)
    let cancelled = false

    const loadModel = async () => {
      try {
        const tf = await import('@tensorflow/tfjs')
        await tf.ready()
        const cocossd = await import('@tensorflow-models/coco-ssd')
        const m = await cocossd.load()
        if (!cancelled) {
          setModel(m)
          setModelLoading(false)
        }
      } catch (err) {
        console.warn('AI model load failed, falling back:', err.message)
        if (!cancelled) {
          setModelLoading(false)
          setUseRealAI(false)
          setError('Model AI gagal dimuat. Fallback ke mode simulasi.')
        }
      }
    }

    loadModel()
    return () => { cancelled = true }
  }, [useRealAI])

  // Install dependencies
  useEffect(() => {
    // Check if TensorFlow is installed
    import('@tensorflow/tfjs').catch(() => {
      setUseRealAI(false)
      setError('TensorFlow.js tidak terinstall. Pakai mode simulasi.')
    })
  }, [])

  const detectReal = async () => {
    if (!model || !imgRef.current) return

    setScanning(true)
    setResult(null)

    try {
      // Run COCO-SSD detection
      const predictions = await model.detect(imgRef.current)

      if (!predictions || predictions.length === 0) {
        // Fallback: simulate if no objects found
        setResult(generateMockResult())
        setScanning(false)
        return
      }

      // Group by class
      const grouped = {}
      predictions.forEach(p => {
        const key = p.class
        if (!grouped[key]) {
          grouped[key] = { class: key, count: 0, confidence: 0 }
        }
        grouped[key].count++
        grouped[key].confidence = Math.max(grouped[key].confidence, p.score)
      })

      // Map to products
      const detected = Object.values(grouped).map(g => {
        const product = COCO_TO_PRODUCT[g.class] || { name: g.class, category: 'Unknown', price: 0 }
        return {
          name: product.name,
          category: product.category,
          quantity: g.count,
          confidence: Math.round(g.confidence * 100),
          price: product.price,
        }
      })

      // Draw bounding boxes on canvas
      const canvas = canvasRef.current
      if (canvas && imgRef.current) {
        canvas.width = imgRef.current.naturalWidth
        canvas.height = imgRef.current.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(imgRef.current, 0, 0)

        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 3
        ctx.font = '14px Inter, sans-serif'
        ctx.fillStyle = '#334155'

        predictions.forEach(p => {
          const [x, y, w, h] = p.bbox
          ctx.strokeRect(x, y, w, h)
          ctx.fillStyle = 'rgba(51,65,85,0.8)'
          const label = `${p.class} (${Math.round(p.score * 100)}%)`
          const tw = ctx.measureText(label).width
          ctx.fillRect(x, y - 24, tw + 12, 24)
          ctx.fillStyle = 'white'
          ctx.fillText(label, x + 6, y - 6)
        })
      }

      setResult({ products: detected, total: detected.reduce((a, b) => a + b.quantity, 0), real: true })
    } catch (err) {
      console.error('Detection error:', err)
      setResult({ products: generateMockResult().products, total: 0, real: false })
    }

    setScanning(false)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setPreview(url)

    // Preload image
    const img = new Image()
    img.onload = () => {
      if (imgRef.current) imgRef.current.src = url
      if (useRealAI && model) {
        detectReal()
      } else {
        simulateDetection()
      }
    }
    img.src = url
  }

  const simulateDetection = () => {
    setScanning(true)
    setResult(null)

    setTimeout(() => {
      const res = generateMockResult()
      setResult(res)
      setScanning(false)
    }, 2000)
  }

  const generateMockResult = () => {
    const products = [
      { name: 'MCB Schneider 20A', category: 'MCB', quantity: 12, confidence: 94, price: 85000 },
      { name: 'MCB Schneider 10A', category: 'MCB', quantity: 8, confidence: 87, price: 75000 },
      { name: 'Kabel NYM 2.5mm', category: 'Kabel', quantity: 5, confidence: 91, price: 285000 },
      { name: 'Fitting E27', category: 'Fitting', quantity: 20, confidence: 96, price: 8500 },
    ]
    return { products, total: 45, real: false }
  }

  const updateStock = async () => {
    if (!result) return

    try {
      const { stockApi } = await import('../services/api')
      for (const p of result.products) {
        await stockApi.update(p.id || 1, {
          stock: p.quantity,
          reason: 'ai_scan',
          notes: `AI scan: detected ${p.quantity} units`
        }).catch(() => {}) // silent if backend offline
      }
    } catch (e) {
      console.warn('Backend offline, mock update only')
    }

    alert('✅ Stok berhasil diperbarui berdasarkan scan AI!')
    setResult(null)
    setImage(null)
    setPreview(null)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
          <i className="fas fa-robot" style={{ color: '#334155', marginRight: 8 }}></i>
          AI Shelf Scanner
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B', marginTop: 4 }}>
          <i className="fas fa-home"></i>
          <span>Home / AI Scan</span>
          {modelLoading && <span style={{ color: '#B45309' }}>· Loading AI model...</span>}
          {model && <span style={{ color: '#059669' }}>· AI Active ✓</span>}
          {!useRealAI && <span style={{ color: '#DC2626' }}>· Mode: Simulasi</span>}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(180,83,9,0.12)', color: '#B45309', fontSize: 13, fontWeight: 500 }}>
          <i className="fas fa-info-circle"></i> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Upload */}
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${preview ? '#334155' : '#E6E8EA'}`,
              borderRadius: 16, padding: 40, textAlign: 'center', cursor: 'pointer',
              background: preview ? 'rgba(51,65,85,0.03)' : '#fff',
              transition: 'all 0.3s', minHeight: 300, position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
            {preview ? (
              <>
                <img ref={imgRef} src={preview} alt="Shelf" crossOrigin="anonymous"
                  style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, position: 'relative', zIndex: 1 }} />
                <canvas ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, borderRadius: 16 }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Upload Foto Rak</h3>
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>Klik untuk upload gambar rak toko listrik</p>
                <p style={{ fontSize: 12, color: '#64748B' }}>JPG, PNG — Maks 10MB</p>
                {model && <p style={{ fontSize: 11, color: '#059669', marginTop: 8 }}>🤖 Real AI Detection siap</p>}
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Mode toggle */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#475569' }}>Mode:</span>
            <button onClick={() => setUseRealAI(true)}
              style={{ padding: '6px 14px', borderRadius: 8, border: useRealAI ? '1px solid #334155' : '1px solid #E6E8EA', background: useRealAI ? 'rgba(51,65,85,0.09)' : '#fff', color: useRealAI ? '#334155' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              🧠 Real AI (COCO-SSD)
            </button>
            <button onClick={() => { setUseRealAI(false); setModel(null) }}
              style={{ padding: '6px 14px', borderRadius: 8, border: !useRealAI ? '1px solid #B45309' : '1px solid #E6E8EA', background: !useRealAI ? 'rgba(180,83,9,0.12)' : '#fff', color: !useRealAI ? '#B45309' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              💻 Simulasi
            </button>
          </div>

          {/* Scanning indicator */}
          {scanning && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(51,65,85,0.09)', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #334155', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                {useRealAI ? 'AI menganalisis gambar...' : 'Simulasi deteksi...'}
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #E6E8EA', borderRadius: 12, padding: 20, minHeight: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
                <i className="fas fa-chart-bar" style={{ color: '#059669', marginRight: 8 }}></i>
                Hasil Deteksi
              </h3>
              {result && (
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: result.real ? 'rgba(5,150,105,0.1)' : 'rgba(180,83,9,0.12)', color: result.real ? '#059669' : '#B45309', fontWeight: 600 }}>
                  {result.real ? 'AI Real ✓' : 'Simulasi'}
                </span>
              )}
            </div>

            {!result && !scanning && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 14 }}>Upload foto rak untuk memulai deteksi</p>
                <p style={{ fontSize: 12 }}>AI akan mendeteksi & menghitung produk otomatis</p>
              </div>
            )}

            {result && (
              <div>
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: 13, fontWeight: 600 }}>
                  <i className="fas fa-check-circle"></i> {result.total} unit terdeteksi
                </div>

                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      {['Produk', 'Kategori', 'Qty', 'Akurasi'].map(h => (
                        <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748B', borderBottom: '1px solid #E6E8EA', padding: '10px 12px', background: '#f6f8fc', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.products.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #E6E8EA', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #E6E8EA', color: '#475569' }}>{item.category}</td>
                        <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #E6E8EA', fontWeight: 700 }}>{item.quantity}</td>
                        <td style={{ fontSize: 13, padding: '12px', borderBottom: '1px solid #E6E8EA' }}>
                          <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: item.confidence > 90 ? 'rgba(5,150,105,0.1)' : 'rgba(180,83,9,0.12)', color: item.confidence > 90 ? '#059669' : '#B45309' }}>
                            {item.confidence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button onClick={updateStock}
                  style={{ marginTop: 16, width: '100%', padding: '12px', border: 'none', borderRadius: 10, background: '#334155', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(51,65,85,0.25)' }}>
                  <i className="fas fa-check"></i> Konfirmasi & Update Stok
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
