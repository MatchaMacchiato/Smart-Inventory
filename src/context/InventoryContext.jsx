import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import { productApi, stockApi, dashboardApi } from '../services/api'
import {
  INITIAL_PRODUCTS,
  buildInitialHistory,
  CATEGORY_BARCODES,
} from '../data/products'

const InventoryContext = createContext(null)

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

function mergeProducts(apiList, local) {
  if (!apiList?.length) return local
  // merge by sku/name — jaga model_3d_url lokal kalau API belum punya
  const map = new Map()
  local.forEach((p) => map.set(String(p.sku || p.id), { ...p }))
  apiList.forEach((p) => {
    const key = String(p.sku || p.id)
    const prev = map.get(key)
    map.set(key, {
      ...prev,
      ...p,
      sku: p.sku || prev?.sku || `SKU-${p.id}`,
      barcode: p.barcode || p.sku || prev?.barcode || `SKU-${p.id}`,
      stock: Number(p.stock ?? prev?.stock ?? 0),
      min_stock: Number(p.min_stock ?? prev?.min_stock ?? 0),
      price: Number(p.price ?? prev?.price ?? 0),
      model_3d_url: p.model_3d_url || prev?.model_3d_url || null,
    })
  })
  return Array.from(map.values())
}

export function InventoryProvider({ children }) {
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [history, setHistory] = useState(() => buildInitialHistory(INITIAL_PRODUCTS))
  const [source, setSource] = useState('local')
  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState([])
  const [predictionSummary, setPredictionSummary] = useState(null)

  // Load dari API jika ada, tetap jaga data lokal lengkap
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.allSettled([
      productApi.list({ per_page: 200 }),
      dashboardApi.stockMovement({ limit: 100, days: 60 }),
    ]).then(([prodRes, moveRes]) => {
      if (!alive) return
      let got = false
      if (prodRes.status === 'fulfilled') {
        const list = normalizeList(prodRes.value.data)
        if (list.length) {
          setProducts((prev) => mergeProducts(list, prev.length ? prev : INITIAL_PRODUCTS))
          got = true
        }
      }
      if (moveRes.status === 'fulfilled' && moveRes.value?.data?.recent?.length) {
        const recent = moveRes.value.data.recent.map((h, i) => ({
          id: h.id || `api-${i}`,
          product_id: h.product_id,
          product_name: h.product_name,
          category: h.category || '-',
          sku: h.sku || '',
          stock_before: h.stock_before,
          stock_after: h.stock_after,
          change: h.change,
          type: h.type || (h.change >= 0 ? 'masuk' : 'keluar'),
          reason: h.reason,
          notes: h.notes,
          created_at: h.created_at,
        }))
        // gabungkan API + seed local (hindari kosong)
        setHistory((prev) => {
          const ids = new Set(recent.map((r) => String(r.id)))
          const rest = prev.filter((p) => !ids.has(String(p.id)))
          return [...recent, ...rest].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        })
        got = true
      }
      setSource(got ? 'api+local' : 'local')
      setLoading(false)
    })
    // Fetch predictions jika API tersedia
    stockApi.predictions().then(res => {
      if (res?.data?.predictions) {
        setPredictions(res.data.predictions)
        setPredictionSummary(res.data.summary)
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const stats = useMemo(() => {
    const total_products = products.length
    const total_stock = products.reduce((s, p) => s + Number(p.stock || 0), 0)
    const low_stock_count = products.filter((p) => Number(p.stock) <= Number(p.min_stock || 0)).length
    const categories_count = new Set(products.map((p) => p.category)).size
    const stock_in = history.filter((h) => h.change > 0).reduce((s, h) => s + h.change, 0)
    const stock_out = Math.abs(history.filter((h) => h.change < 0).reduce((s, h) => s + h.change, 0))
    // "Hari Ini" = hanya tanggal kalender hari ini (otomatis reset tiap ganti hari)
    const todayKey = new Date().toDateString()
    const isToday = (iso) => {
      try { return new Date(iso).toDateString() === todayKey } catch { return false }
    }
    const stock_in_today = history
      .filter((h) => h.change > 0 && isToday(h.created_at))
      .reduce((s, h) => s + Number(h.change || 0), 0)
    const stock_out_today = Math.abs(
      history
        .filter((h) => h.change < 0 && isToday(h.created_at))
        .reduce((s, h) => s + Number(h.change || 0), 0)
    )
    const total_movements = history.length
    const net_movement = stock_in - stock_out
    const byCategory = {}
    products.forEach((p) => {
      if (!byCategory[p.category]) byCategory[p.category] = { category: p.category, count: 0, total_stock: 0 }
      byCategory[p.category].count += 1
      byCategory[p.category].total_stock += Number(p.stock || 0)
    })
    return {
      total_products,
      total_stock,
      low_stock_count,
      categories_count,
      stock_in,
      stock_out,
      stock_in_today,
      stock_out_today,
      total_movements,
      net_movement,
      categories: Object.values(byCategory),
      suppliers: new Set(products.map((p) => p.supplier).filter(Boolean)).size || 4,
      users: 2,
    }
  }, [products, history])

  const daily = useMemo(() => {
    const map = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map[key] = { date: key, stock_in: 0, stock_out: 0 }
    }
    history.forEach((h) => {
      const key = new Date(h.created_at).toISOString().slice(0, 10)
      if (!map[key]) return
      if (h.change > 0) map[key].stock_in += h.change
      else map[key].stock_out += Math.abs(h.change)
    })
    return Object.values(map)
  }, [history])

  const lowStock = useMemo(
    () => products
      .filter((p) => Number(p.stock) <= Number(p.min_stock || 0))
      .map((p) => {
        const gap = Math.max(0, Number(p.min_stock || 0) - Number(p.stock || 0))
        return { ...p, gap, suggest: Math.max(gap, Math.ceil(Number(p.min_stock || 0) * 0.5)) }
      })
      .sort((a, b) => b.gap - a.gap),
    [products]
  )

  const topProducts = useMemo(
    () => [...products].sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 8),
    [products]
  )

  const addProduct = useCallback((data) => {
    const id = Math.max(0, ...products.map((p) => Number(p.id) || 0)) + 1
    const sku = data.sku || `SKU-${id}`
    const row = {
      ...data,
      id,
      sku,
      barcode: data.barcode || sku,
      price: Number(data.price) || 0,
      stock: Number(data.stock) || 0,
      min_stock: Number(data.min_stock) || 0,
    }
    setProducts((prev) => [...prev, row])
    productApi.create(row).catch(() => {})
    return row
  }, [products])

  const updateProduct = useCallback((id, data) => {
    setProducts((prev) => prev.map((p) => (String(p.id) === String(id) ? {
      ...p,
      ...data,
      price: data.price != null ? Number(data.price) : p.price,
      stock: data.stock != null ? Number(data.stock) : p.stock,
      min_stock: data.min_stock != null ? Number(data.min_stock) : p.min_stock,
    } : p)))
    productApi.update(id, data).catch(() => {})
  }, [])

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)))
    productApi.delete(id).catch(() => {})
  }, [])

  /**
   * Transaksi stok — update produk + history (semua menu ikut berubah)
   */
  const applyStockChange = useCallback(async ({ productId, qty, mode, reason, notes, supplier, customer }) => {
    const product = products.find((p) => String(p.id) === String(productId))
    if (!product) throw new Error('Produk tidak ditemukan')
    const n = Number(qty)
    if (!n || n <= 0) throw new Error('Qty tidak valid')

    const before = Number(product.stock || 0)
    const change = mode === 'in' ? n : -n
    const after = before + change
    if (after < 0) throw new Error(`Stok tidak cukup. Stok saat ini: ${before}`)

    const supplierName = mode === 'in'
      ? (String(supplier || product.supplier || '').trim() || '-')
      : (product.supplier || '-')
    const customerName = mode === 'out'
      ? (String(customer || '').trim() || '-')
      : null

    const row = {
      id: `local-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      sku: product.sku,
      stock_before: before,
      stock_after: after,
      change,
      type: mode === 'in' ? 'masuk' : 'keluar',
      reason: reason || (mode === 'in' ? 'purchase' : 'sale'),
      notes: notes || (mode === 'in' ? 'Barang masuk' : 'Barang keluar'),
      supplier: supplierName,
      customer: customerName,
      created_at: new Date().toISOString(),
    }

    // Barang masuk: update supplier default produk kalau diisi
    setProducts((prev) => prev.map((p) => {
      if (String(p.id) !== String(productId)) return p
      const next = { ...p, stock: after }
      if (mode === 'in' && supplierName && supplierName !== '-') next.supplier = supplierName
      return next
    }))
    setHistory((prev) => [row, ...prev])

    try {
      await stockApi.update(productId, {
        stock: after,
        reason: row.reason,
        notes: row.notes,
        supplier: mode === 'in' ? supplierName : undefined,
        customer: mode === 'out' ? customerName : undefined,
      })
    } catch {
      // offline ok — state lokal tetap master
    }
    return row
  }, [products])

  const getHistoryFiltered = useCallback((filter) => {
    let rows = [...history]
    if (filter === 'masuk' || filter === 'in') rows = rows.filter((h) => h.change > 0)
    if (filter === 'keluar' || filter === 'out') rows = rows.filter((h) => h.change < 0)
    if (filter === 'today') {
      const t = new Date().toDateString()
      rows = rows.filter((h) => new Date(h.created_at).toDateString() === t)
    }
    if (filter === 'low') {
      // history terkait produk low stock
      const lowIds = new Set(lowStock.map((p) => String(p.id)))
      rows = rows.filter((h) => lowIds.has(String(h.product_id)))
    }
    return rows
  }, [history, lowStock])

  const value = {
    products,
    history,
    stats,
    daily,
    lowStock,
    topProducts,
    source,
    loading,
    categoryBarcodes: CATEGORY_BARCODES,
    addProduct,
    updateProduct,
    deleteProduct,
    applyStockChange,
    getHistoryFiltered,
    setProducts,
    predictions,
    predictionSummary,
  }

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider')
  return ctx
}
