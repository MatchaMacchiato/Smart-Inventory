import { useState, useEffect } from 'react'
import { productApi } from '../services/api'
import QRGenerator from './QRGenerator'

const MOCK_PRODUCTS = [
  { id: 1, name: 'MCB Schneider 20A 1 Phase', category: 'MCB', price: 85000, stock: 45, min_stock: 10, unit: 'pcs', supplier: 'PT Schneider', specifications: { amp: '20A', pole: '1P' } },
  { id: 2, name: 'MCB Schneider 10A 1 Phase', category: 'MCB', price: 75000, stock: 32, min_stock: 10, unit: 'pcs', supplier: 'PT Schneider', specifications: { amp: '10A', pole: '1P' } },
  { id: 3, name: 'MCB Broco 20A 1 Phase', category: 'MCB', price: 55000, stock: 3, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', specifications: { amp: '20A', pole: '1P' } },
  { id: 4, name: 'Kabel NYM 2×2.5mm @50m', category: 'Kabel', price: 285000, stock: 12, min_stock: 5, unit: 'roll', supplier: 'PT Kabelindo', specifications: { type: 'NYM', core: '2×2.5mm²' } },
  { id: 5, name: 'Kabel NYM 3×2.5mm @50m', category: 'Kabel', price: 385000, stock: 8, min_stock: 5, unit: 'roll', supplier: 'PT Kabelindo', specifications: { type: 'NYM', core: '3×2.5mm²' } },
  { id: 6, name: 'Kabel NYA 2.5mm @100m', category: 'Kabel', price: 175000, stock: 20, min_stock: 10, unit: 'roll', supplier: 'PT Kabelindo', specifications: { type: 'NYA', size: '2.5mm' } },
  { id: 7, name: 'Fitting Lampu E27 Porselen', category: 'Fitting', price: 8500, stock: 120, min_stock: 25, unit: 'pcs', supplier: 'PT Philips', specifications: { base: 'E27', material: 'Porselen' } },
  { id: 8, name: 'Fitting Lampu GU10 Keramik', category: 'Fitting', price: 12500, stock: 65, min_stock: 20, unit: 'pcs', supplier: 'PT Philips', specifications: { base: 'GU10', material: 'Keramik' } },
  { id: 9, name: 'Saklar Broco 1 Gang Putih', category: 'Saklar', price: 18000, stock: 55, min_stock: 20, unit: 'pcs', supplier: 'PT Broco', specifications: { gang: '1', color: 'Putih' } },
  { id: 10, name: 'Saklar Broco 2 Gang Putih', category: 'Saklar', price: 25000, stock: 42, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', specifications: { gang: '2', color: 'Putih' } },
  { id: 11, name: 'Stop Kontak Broco 2 Lubang', category: 'Saklar', price: 22000, stock: 38, min_stock: 15, unit: 'pcs', supplier: 'PT Broco', specifications: { holes: '2' } },
  { id: 12, name: 'Panel Box 6 Group', category: 'Panel', price: 185000, stock: 7, min_stock: 5, unit: 'pcs', supplier: 'PT Panelindo', specifications: { groups: '6', material: 'Metal' } },
  { id: 13, name: 'Panel Box 12 Group', category: 'Panel', price: 275000, stock: 4, min_stock: 3, unit: 'pcs', supplier: 'PT Panelindo', specifications: { groups: '12', material: 'Metal' } },
  { id: 14, name: 'Lampu LED Philips 10W', category: 'Lampu', price: 35000, stock: 85, min_stock: 20, unit: 'pcs', supplier: 'PT Philips', specifications: { watt: '10W', base: 'E27' } },
  { id: 15, name: 'Lampu LED Philips 20W', category: 'Lampu', price: 55000, stock: 62, min_stock: 15, unit: 'pcs', supplier: 'PT Philips', specifications: { watt: '20W', base: 'E27' } },
  { id: 16, name: 'Isolasi Listrik 3M 10m', category: 'Aksesoris', price: 12000, stock: 200, min_stock: 30, unit: 'pcs', supplier: '3M Indonesia', specifications: { brand: '3M' } },
  { id: 17, name: 'Kabel Ties 20cm (100pcs)', category: 'Aksesoris', price: 15000, stock: 150, min_stock: 25, unit: 'pack', supplier: 'PT Indo Plastic', specifications: { length: '20cm' } },
]

const EMPTY_FORM = { name: '', category: 'MCB', price: '', stock: '', min_stock: '', unit: 'pcs', supplier: '', specifications: {} }

export default function ProductList({ onSelect }) {
  const [products, setProducts] = useState(MOCK_PRODUCTS)
  const [filter, setFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [qrProduct, setQrProduct] = useState(null)
  const [showBatchQR, setShowBatchQR] = useState(false)
  const [formModal, setFormModal] = useState(null) // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    productApi.list({ per_page: 50 })
      .then(res => { if (res.data?.data) setProducts(res.data.data) })
      .catch(() => {})
  }, [])

  const categories = [...new Set(products.map(p => p.category))]
  const filtered = products.filter(p => {
    const matchName = p.name.toLowerCase().includes(filter.toLowerCase())
    const matchCat = !catFilter || p.category === catFilter
    return matchName && matchCat
  })

  const iconMap = { 'MCB': 'fa-bolt', 'Kabel': 'fa-plug', 'Fitting': 'fa-lightbulb', 'Saklar': 'fa-toggle-on', 'Panel': 'fa-cube', 'Lampu': 'fa-lightbulb', 'Aksesoris': 'fa-toolbox' }

  const openAdd = () => { setForm(EMPTY_FORM); setFormModal('add'); setEditId(null) }
  const openEdit = (p) => { setForm({ name: p.name, category: p.category, price: p.price, stock: p.stock, min_stock: p.min_stock, unit: p.unit || 'pcs', supplier: p.supplier || '', specifications: p.specifications || {} }); setFormModal('edit'); setEditId(p.id) }

  const saveForm = () => {
    if (!form.name || !form.price) return alert('Nama & Harga wajib diisi!')
    if (formModal === 'add') {
      const newId = Math.max(...products.map(p => p.id)) + 1
      const newProduct = { ...form, id: newId, price: Number(form.price), stock: Number(form.stock) || 0, min_stock: Number(form.min_stock) || 0 }
      setProducts(prev => [...prev, newProduct])
      productApi.create(newProduct).catch(() => {})
    } else {
      setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...form, price: Number(form.price), stock: Number(form.stock) || 0, min_stock: Number(form.min_stock) || 0 } : p))
      productApi.update(editId, form).catch(() => {})
    }
    setFormModal(null)
  }

  const deleteProduct = (id, name) => {
    if (!confirm(`Hapus produk "${name}"?`)) return
    setProducts(prev => prev.filter(p => p.id !== id))
    productApi.delete(id).catch(() => {})
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Produk</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            <i className="fas fa-home"></i><span>Home / Produk · {filtered.length} item</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowBatchQR(true)}
            style={{ padding: '9px 18px', border: '1px solid #6366f1', borderRadius: 10, background: '#fff', color: '#6366f1', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-qrcode"></i> Cetak QR
          </button>
          <button onClick={openAdd}
            style={{ padding: '9px 18px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
            <i className="fas fa-plus"></i> Tambah Produk
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input placeholder="Cari produk..." value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #eef2f6', borderRadius: 10, fontSize: 13, outline: 'none', flex: 1, minWidth: 200, background: '#fff', color: '#0f172a' }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #eef2f6', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}>
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: 12, padding: 20, transition: 'all 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}>
            {(p.stock <= p.min_stock) && (
              <div style={{ position: 'absolute', top: 12, right: 12, background: p.stock <= 5 ? '#ef4444' : '#f59e0b', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                {p.stock <= 5 ? 'Kritis' : 'Menipis'}
              </div>
            )}
            <div onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
              <div style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 12, background: 'linear-gradient(135deg, #eef2f6, #f6f8fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 32 }}>
                <i className={`fas ${iconMap[p.category] || 'fa-cube'}`}></i>
              </div>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 4 }}>{p.category}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
              {p.specifications && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{Object.values(p.specifications).filter(Boolean).join(' · ')}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Rp {Number(p.price).toLocaleString()}</span>
                <span style={{ fontSize: 12, color: p.stock <= p.min_stock ? '#ef4444' : '#10b981', fontWeight: 600 }}>Stok: {p.stock}</span>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onSelect(p) }}
                style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-cube"></i> 3D
              </button>
              <button onClick={(e) => { e.stopPropagation(); setQrProduct(p) }}
                style={{ padding: '7px 10px', border: '1px solid #6366f1', borderRadius: 8, background: '#fff', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-qrcode"></i>
              </button>
              <button onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                style={{ padding: '7px 10px', border: '1px solid #f59e0b', borderRadius: 8, background: '#fff', color: '#f59e0b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-edit"></i>
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteProduct(p.id, p.name) }}
                style={{ padding: '7px 10px', border: '1px solid #ef4444', borderRadius: 8, background: '#fff', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {formModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setFormModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '90%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              <i className={formModal === 'add' ? 'fas fa-plus-circle' : 'fas fa-edit'} style={{ color: '#6366f1', marginRight: 8 }}></i>
              {formModal === 'add' ? 'Tambah Produk Baru' : 'Edit Produk'}
            </h3>
            {[
              { key: 'name', label: 'Nama Produk', type: 'text', required: true },
              { key: 'category', label: 'Kategori', type: 'select', options: categories.length ? categories : ['MCB','Kabel','Fitting','Saklar','Panel','Lampu','Aksesoris'] },
              { key: 'price', label: 'Harga (Rp)', type: 'number', required: true },
              { key: 'stock', label: 'Stok', type: 'number' },
              { key: 'min_stock', label: 'Min Stok', type: 'number' },
              { key: 'unit', label: 'Satuan', type: 'text' },
              { key: 'supplier', label: 'Supplier', type: 'text' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                {field.type === 'select' ? (
                  <select value={form[field.key]} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #eef2f6', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0f172a' }}>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={form[field.key]} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #eef2f6', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0f172a' }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setFormModal(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid #eef2f6', borderRadius: 8, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={saveForm}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {formModal === 'add' ? 'Tambah' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setQrProduct(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}><i className="fas fa-qrcode" style={{ color: '#6366f1', marginRight: 8 }}></i>QR Code</h3>
              <button onClick={() => setQrProduct(null)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{qrProduct.category}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{qrProduct.name}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#6366f1' }}>Rp {Number(qrProduct.price).toLocaleString()}</div>
            </div>
            <QRGenerator product={qrProduct} size={220} />
            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>Scan dari HP untuk lihat model 3D + info produk</p>
          </div>
        </div>
      )}

      {/* Batch QR Modal */}
      {showBatchQR && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowBatchQR(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 800, width: '95%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}><i className="fas fa-qrcode" style={{ color: '#6366f1', marginRight: 8 }}></i>QR Semua Produk ({filtered.length})</h3>
              <button onClick={() => setShowBatchQR(false)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {filtered.map(p => (
                <div key={p.id} style={{ padding: 12, border: '1px solid #eef2f6', borderRadius: 10, textAlign: 'center' }}>
                  <QRGenerator product={p} size={120} />
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Rp {Number(p.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
