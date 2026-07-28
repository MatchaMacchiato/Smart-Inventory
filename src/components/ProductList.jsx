import { useState, useMemo } from 'react'
import { useInventory } from '../context/InventoryContext'
import QRGenerator from './QRGenerator'

const EMPTY_FORM = { name: '', category: 'MCB', price: '', stock: '', min_stock: '', unit: 'pcs', supplier: '' }

const ICONS = {
  MCB: 'fa-bolt',
  Kabel: 'fa-plug',
  Fitting: 'fa-lightbulb',
  Saklar: 'fa-toggle-on',
  'Stop Kontak': 'fa-plug',
  Steker: 'fa-plug',
  Panel: 'fa-cube',
  Lampu: 'fa-lightbulb',
  Aksesoris: 'fa-toolbox',
}

export default function ProductList({ onSelect }) {
  const { products, addProduct, updateProduct, deleteProduct } = useInventory()
  const [filter, setFilter] = useState('')
  const [catFilter, setCatFilter] = useState('') // '' = semua
  const [qrProduct, setQrProduct] = useState(null)
  const [showBatchQR, setShowBatchQR] = useState(false)
  const [formModal, setFormModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  )

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchName =
        !filter ||
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        String(p.sku || '').toLowerCase().includes(filter.toLowerCase())
      const matchCat = !catFilter || p.category === catFilter
      return matchName && matchCat
    })
  }, [products, filter, catFilter])

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, category: catFilter || 'MCB' })
    setFormModal('add')
    setEditId(null)
  }
  const openEdit = (p) => {
    setForm({
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      min_stock: p.min_stock,
      unit: p.unit || 'pcs',
      supplier: p.supplier || '',
    })
    setFormModal('edit')
    setEditId(p.id)
  }

  const saveForm = () => {
    if (!form.name || !form.price) return alert('Nama & Harga wajib diisi!')
    if (formModal === 'add') {
      addProduct({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock) || 0,
        min_stock: Number(form.min_stock) || 0,
      })
    } else {
      updateProduct(editId, form)
    }
    setFormModal(null)
  }

  const del = (id, name) => {
    if (!confirm(`Hapus produk "${name}"?`)) return
    deleteProduct(id)
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Produk</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            <i className="fas fa-home"></i>
            <span>Home / Produk · {filtered.length} item{catFilter ? ` · ${catFilter}` : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowBatchQR(true)} style={btnOutline}>
            <i className="fas fa-qrcode"></i> Cetak QR
          </button>
          <button onClick={openAdd} style={btnPrimary}>
            <i className="fas fa-plus"></i> Tambah Produk
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          placeholder="Cari produk / SKU..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #eef2f6',
            borderRadius: 10,
            fontSize: 13,
            outline: 'none',
            flex: 1,
            minWidth: 200,
            background: '#fff',
            color: '#0f172a',
          }}
        />
      </div>

      {/* Category chips — pemisah kategori */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setCatFilter('')}
          style={chipStyle(!catFilter)}
        >
          Semua ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category === c).length
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              style={chipStyle(catFilter === c)}
            >
              <i className={`fas ${ICONS[c] || 'fa-cube'}`} style={{ marginRight: 6, fontSize: 11 }}></i>
              {c} ({count})
            </button>
          )
        })}
      </div>

      {/* Card grid — tampilan seperti sebelumnya */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={{
              background: '#fff',
              border: '1px solid #eef2f6',
              borderRadius: 12,
              padding: 20,
              transition: 'all 0.25s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              position: 'relative',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
          >
            {p.stock <= p.min_stock && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: p.stock <= 5 ? '#ef4444' : '#f59e0b',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                {p.stock <= 5 ? 'Kritis' : 'Menipis'}
              </div>
            )}
            <div onClick={() => onSelect?.(p)} style={{ cursor: 'pointer' }}>
              <div
                style={{
                  width: '100%',
                  height: 120,
                  borderRadius: 8,
                  marginBottom: 12,
                  background: 'linear-gradient(135deg, #eef2f6, #f6f8fc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 32,
                }}
              >
                <i className={`fas ${ICONS[p.category] || 'fa-cube'}`}></i>
              </div>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 4 }}>{p.category}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
              {p.sku && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>SKU: {p.sku}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Rp {Number(p.price).toLocaleString()}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: p.stock <= p.min_stock ? '#ef4444' : '#10b981',
                    fontWeight: 600,
                  }}
                >
                  Stok: {p.stock}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(p)
                }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  border: 'none',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-cube"></i> 3D
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setQrProduct(p)
                }}
                style={iconBtn('#6366f1')}
              >
                <i className="fas fa-qrcode"></i>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openEdit(p)
                }}
                style={iconBtn('#f59e0b')}
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  del(p.id, p.name)
                }}
                style={iconBtn('#ef4444')}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          Tidak ada produk{catFilter ? ` di kategori ${catFilter}` : ''}.
        </div>
      )}

      {/* Add/Edit Modal */}
      {formModal && (
        <div style={overlay} onClick={() => setFormModal(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              <i
                className={formModal === 'add' ? 'fas fa-plus-circle' : 'fas fa-edit'}
                style={{ color: '#6366f1', marginRight: 8 }}
              ></i>
              {formModal === 'add' ? 'Tambah Produk Baru' : 'Edit Produk'}
            </h3>
            {[
              { key: 'name', label: 'Nama Produk', type: 'text', required: true },
              {
                key: 'category',
                label: 'Kategori',
                type: 'select',
                options: categories.length
                  ? categories
                  : ['MCB', 'Kabel', 'Fitting', 'Saklar', 'Stop Kontak', 'Steker', 'Panel', 'Lampu', 'Aksesoris'],
              },
              { key: 'price', label: 'Harga (Rp)', type: 'number', required: true },
              { key: 'stock', label: 'Stok', type: 'number' },
              { key: 'min_stock', label: 'Min Stok', type: 'number' },
              { key: 'unit', label: 'Satuan', type: 'text' },
              { key: 'supplier', label: 'Supplier', type: 'text' },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={form[field.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    style={inputStyle}
                  >
                    {field.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setFormModal(null)} style={btnGhost}>
                Batal
              </button>
              <button onClick={saveForm} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                {formModal === 'add' ? 'Tambah' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrProduct && (
        <div style={overlay} onClick={() => setQrProduct(null)}>
          <div style={{ ...modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-qrcode" style={{ color: '#6366f1', marginRight: 8 }}></i>QR Code
              </h3>
              <button onClick={() => setQrProduct(null)} style={closeBtn}>
                ×
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{qrProduct.category}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{qrProduct.name}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#6366f1' }}>
                Rp {Number(qrProduct.price).toLocaleString()}
              </div>
            </div>
            <QRGenerator product={qrProduct} size={220} />
            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
              Scan dari HP untuk lihat model 3D + info produk
            </p>
          </div>
        </div>
      )}

      {/* Batch QR */}
      {showBatchQR && (
        <div style={overlay} onClick={() => setShowBatchQR(false)}>
          <div style={{ ...modal, maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-qrcode" style={{ color: '#6366f1', marginRight: 8 }}></i>
                QR {catFilter || 'Semua'} ({filtered.length})
              </h3>
              <button onClick={() => setShowBatchQR(false)} style={closeBtn}>
                ×
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {filtered.map((p) => (
                <div key={p.id} style={{ padding: 12, border: '1px solid #eef2f6', borderRadius: 10, textAlign: 'center' }}>
                  <QRGenerator product={p} size={120} />
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                    Rp {Number(p.price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function chipStyle(active) {
  return {
    padding: '8px 14px',
    borderRadius: 999,
    border: active ? '1px solid #6366f1' : '1px solid #eef2f6',
    background: active ? 'rgba(99,102,241,0.1)' : '#fff',
    color: active ? '#4f46e5' : '#475569',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  }
}

function iconBtn(color) {
  return {
    padding: '7px 10px',
    border: `1px solid ${color}`,
    borderRadius: 8,
    background: '#fff',
    color,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

const btnPrimary = {
  padding: '9px 18px',
  border: 'none',
  borderRadius: 10,
  background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
}

const btnOutline = {
  padding: '9px 18px',
  border: '1px solid #6366f1',
  borderRadius: 10,
  background: '#fff',
  color: '#6366f1',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const btnGhost = {
  flex: 1,
  padding: '10px',
  border: '1px solid #eef2f6',
  borderRadius: 8,
  background: '#fff',
  color: '#475569',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const overlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modal = {
  background: '#fff',
  borderRadius: 16,
  padding: 28,
  maxWidth: 480,
  width: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #eef2f6',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  color: '#0f172a',
}

const closeBtn = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 'none',
  background: '#f1f5f9',
  cursor: 'pointer',
  fontSize: 16,
}
