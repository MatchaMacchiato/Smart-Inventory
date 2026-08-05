import { useEffect, useMemo, useState } from 'react'
import { aiIntelApi } from '../services/api'
import { useInventory } from '../context/InventoryContext'

const fmt = (n) => Number(n || 0).toLocaleString('id-ID')
const pct = (n) => `${Math.round(Number(n || 0) * 100)}%`

const Z = { 0.8: 0.84, 0.85: 1.04, 0.9: 1.28, 0.95: 1.64, 0.97: 1.88, 0.99: 2.33 }
function zOf(p) {
  const k = Object.keys(Z).map(Number).sort((a, b) => Math.abs(a - p) - Math.abs(b - p))[0]
  return Z[k] || 1.64
}

/** Local EOQ fallback dari history frontend (kalau API gagal) */
function computeLocalEoq(products, history, params) {
  const days = params.days || 90
  const orderingCost = params.ordering_cost || 25000
  const holdingPct = params.holding_pct || 0.15
  const leadTime = params.lead_time || 5
  const z = zOf(params.service_level || 0.95)
  const cutoff = Date.now() - days * 86400000

  const out = (products || []).map((p) => {
    const rows = (history || []).filter(
      (h) => h.product_id === p.id && Number(h.change) < 0 && new Date(h.created_at).getTime() >= cutoff
    )
    // group by day
    const byDay = {}
    rows.forEach((h) => {
      const d = String(h.created_at).slice(0, 10)
      byDay[d] = (byDay[d] || 0) + Math.abs(Number(h.change) || 0)
    })
    const qtys = Object.values(byDay)
    const total = qtys.reduce((s, v) => s + v, 0)
    const avgDaily = total / Math.max(1, days)
    if (avgDaily <= 0) {
      return {
        product_id: p.id, name: p.name, sku: p.sku, category: p.category,
        stock: p.stock, price: p.price, avg_daily_demand: 0, annual_demand: 0,
        std_demand: 0, eoq: 0, reorder_point: 0, safety_stock: 0, lead_time_days: leadTime,
        status: 'no_demand', recommendation: `Tidak ada penjualan ${days} hari — jangan restock`,
      }
    }
    const annual = avgDaily * 365
    const holding = Math.max(0.01, Number(p.price || 0) * holdingPct)
    const eoq = Math.sqrt((2 * annual * orderingCost) / holding)
    let std = 0
    if (qtys.length > 1) {
      const mean = total / qtys.length
      std = Math.sqrt(qtys.reduce((s, v) => s + (v - mean) ** 2, 0) / (qtys.length - 1))
    }
    const ss = std * z * Math.sqrt(Math.max(0, leadTime))
    const rop = avgDaily * leadTime + ss
    const stock = Number(p.stock || 0)
    let status = 'ok'
    let recommendation = 'Stok aman di atas reorder point'
    if (stock <= rop) {
      status = 'restock'
      const qty = Math.max(1, Math.ceil(Math.max(eoq, rop - stock + 1)))
      recommendation = `Segera PO ${qty} pcs (EOQ ${Math.round(eoq)})`
    } else if (stock <= rop * 1.3) {
      status = 'watch'
      recommendation = `Mendekati reorder point (${Math.round(rop)}) — siapkan PO`
    }
    return {
      product_id: p.id, name: p.name, sku: p.sku, category: p.category,
      stock, price: p.price, avg_daily_demand: +avgDaily.toFixed(2), annual_demand: Math.round(annual),
      std_demand: +std.toFixed(2), eoq: Math.round(eoq), reorder_point: Math.round(rop),
      safety_stock: Math.round(ss), lead_time_days: leadTime, status, recommendation,
    }
  }).sort((a, b) => b.avg_daily_demand - a.avg_daily_demand)

  return {
    algorithm: 'EOQ (local fallback)',
    source: 'local',
    products: out,
    summary: {
      total_products: out.length,
      needs_restock: out.filter((p) => p.status === 'restock').length,
      watch: out.filter((p) => p.status === 'watch').length,
      ok: out.filter((p) => p.status === 'ok').length,
    },
  }
}

/** Local Apriori fallback */
function computeLocalApriori(history, params) {
  const days = params.days || 60
  const minSupport = params.min_support || 0.1
  const minConfidence = params.min_confidence || 0.4
  const cutoff = Date.now() - days * 86400000
  const rows = (history || []).filter((h) => Number(h.change) < 0 && new Date(h.created_at).getTime() >= cutoff)

  const baskets = {}
  rows.forEach((h) => {
    const key = `${h.notes || ''}|${String(h.created_at).slice(0, 10)}`
    if (!baskets[key]) baskets[key] = new Set()
    baskets[key].add(h.product_id)
  })
  const tx = Object.values(baskets).map((s) => [...s]).filter((t) => t.length >= 1)
  const n = Math.max(1, tx.length)
  const freq1 = {}
  tx.forEach((t) => t.forEach((id) => { freq1[id] = (freq1[id] || 0) + 1 }))
  const items = Object.keys(freq1).map(Number).filter((id) => freq1[id] / n >= minSupport)
  const nameOf = (id) => rows.find((r) => r.product_id === id)?.product_name || `Produk #${id}`

  const rules = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]; const b = items[j]
      let cnt = 0
      tx.forEach((t) => { if (t.includes(a) && t.includes(b)) cnt++ })
      const support = cnt / n
      if (support < minSupport) continue
      const confAB = cnt / freq1[a]
      const confBA = cnt / freq1[b]
      const liftAB = confAB / (freq1[b] / n)
      const liftBA = confBA / (freq1[a] / n)
      if (confAB >= minConfidence) {
        rules.push({
          antecedent: { product_id: a, name: nameOf(a) },
          consequent: { product_id: b, name: nameOf(b) },
          support: +support.toFixed(4), confidence: +confAB.toFixed(4), lift: +liftAB.toFixed(4), count: cnt, transactions: n,
        })
      }
      if (confBA >= minConfidence) {
        rules.push({
          antecedent: { product_id: b, name: nameOf(b) },
          consequent: { product_id: a, name: nameOf(a) },
          support: +support.toFixed(4), confidence: +confBA.toFixed(4), lift: +liftBA.toFixed(4), count: cnt, transactions: n,
        })
      }
    }
  }
  rules.sort((x, y) => y.lift - x.lift)
  return {
    algorithm: 'Apriori (local fallback)',
    source: 'local',
    transactions: n,
    rules: rules.slice(0, 40),
    total_rules: rules.length,
    message: rules.length ? null : 'Data lokal kurang — turunkan threshold atau input barang keluar dulu.',
  }
}

function RuleCard({ rule }) {
  return (
    <div className="panel" style={{ marginBottom: 10 }}>
      <div className="panel-body" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{rule.antecedent?.name}</span>
          <span style={{ fontWeight: 900, color: '#334155', fontSize: 15 }}>→</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#1E293B' }}>{rule.consequent?.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#94A3B8', flexWrap: 'wrap' }}>
          <span><b style={{ color: '#0F172A' }}>{pct(rule.confidence)}</b> confidence</span>
          <span><b style={{ color: '#0F172A' }}>{pct(rule.support)}</b> support</span>
          <span>Lift <b style={{ color: rule.lift >= 1 ? '#059669' : '#DC2626' }}>{Number(rule.lift).toFixed(2)}</b></span>
          <span>{rule.count} transaksi</span>
        </div>
      </div>
    </div>
  )
}

export default function AIIntelligence() {
  const { products, history } = useInventory()
  const [tab, setTab] = useState('bundling')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sourceNote, setSourceNote] = useState('')

  const [minSupport, setMinSupport] = useState(0.05)
  const [minConfidence, setMinConfidence] = useState(0.35)
  const [days, setDays] = useState(90)

  const [orderingCost, setOrderingCost] = useState(25000)
  const [holdingPct, setHoldingPct] = useState(0.15)
  const [leadTime, setLeadTime] = useState(5)
  const [serviceLevel, setServiceLevel] = useState(0.95)
  const [eoqDays, setEoqDays] = useState(90)

  const [apriori, setApriori] = useState(null)
  const [eoq, setEoq] = useState(null)

  const errText = (e, fallback) => {
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message
    const status = e?.response?.status
    if (msg) return status ? `${msg} (HTTP ${status})` : msg
    return fallback
  }

  const runApriori = () => {
    setLoading(true)
    setError(null)
    const params = { min_support: minSupport, min_confidence: minConfidence, days }
    aiIntelApi
      .apriori(params)
      .then((res) => {
        setApriori(res.data)
        setSourceNote(res.data?.source === 'local' ? 'lokal' : 'server')
      })
      .catch((e) => {
        // fallback lokal
        const local = computeLocalApriori(history, params)
        setApriori(local)
        setSourceNote('lokal (API gagal)')
        setError(`API: ${errText(e, 'gagal')} — pakai hitungan lokal`)
      })
      .finally(() => setLoading(false))
  }

  const runEoq = () => {
    setLoading(true)
    setError(null)
    const params = {
      ordering_cost: orderingCost,
      holding_pct: holdingPct,
      lead_time: leadTime,
      service_level: serviceLevel,
      days: eoqDays,
    }
    aiIntelApi
      .eoq(params)
      .then((res) => {
        setEoq(res.data)
        setSourceNote('server')
      })
      .catch((e) => {
        const local = computeLocalEoq(products, history, params)
        setEoq(local)
        setSourceNote('lokal (API gagal)')
        setError(`API: ${errText(e, 'gagal')} — pakai hitungan lokal dari history frontend`)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    runApriori()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-run EOQ when switching tab first time
  useEffect(() => {
    if (tab === 'eoq' && !eoq) runEoq()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const statusMeta = {
    restock: { label: 'SEGERA RESTOCK', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
    watch: { label: 'WASPADA', color: '#B45309', bg: 'rgba(180,83,9,0.12)' },
    ok: { label: 'AMAN', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
    no_demand: { label: 'NO DEMAND', color: '#64748B', bg: 'rgba(148,163,184,0.1)' },
  }

  const restockRows = useMemo(
    () => (eoq?.products || []).filter((p) => p.status === 'restock' || p.status === 'watch'),
    [eoq]
  )

  const sel = {
    height: 36, border: '1px solid #E6E8EA', borderRadius: 10, padding: '0 10px',
    fontSize: 12, background: '#fff', outline: 'none',
  }

  return (
    <div>
      <div className="page-title">AI Intelligence · Apriori + EOQ</div>
      <div className="page-subtitle">
        Analisis data penjualan deterministik — bundling (Apriori) & optimasi restock (EOQ).
        {sourceNote && (
          <span style={{ marginLeft: 8, color: sourceNote.includes('lokal') ? '#B45309' : '#059669', fontWeight: 700 }}>
            · sumber: {sourceNote}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'bundling', label: '🛒 Bundling (Apriori)', desc: 'Produk yang sering dibeli bareng' },
          { id: 'eoq', label: '📦 Optimasi Restock (EOQ)', desc: 'Qty pesanan optimal + reorder point' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px', borderRadius: 12,
              border: tab === t.id ? '2px solid #334155' : '1px solid #E6E8EA',
              background: tab === t.id ? 'rgba(51,65,85,0.09)' : '#fff',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: 'rgba(180,83,9,0.12)', color: '#B45309', fontSize: 12 }}>
          {error}
        </div>
      )}

      {tab === 'bundling' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)', gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><h3>Parameter Apriori</h3></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Min Support ({minSupport})
                <input type="range" min="0.02" max="0.5" step="0.01" value={minSupport}
                  onChange={(e) => setMinSupport(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Min Confidence ({minConfidence})
                <input type="range" min="0.1" max="0.9" step="0.05" value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Rentang data (hari)
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }}>
                  {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} hari</option>)}
                </select>
              </label>
              <button type="button" onClick={runApriori} disabled={loading}
                style={{ height: 40, border: 'none', borderRadius: 10, background: '#334155', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {loading ? 'Menghitung…' : '🔄 Hitung Ulang'}
              </button>
            </div>
          </div>

          <div>
            {apriori && (
              <div className="panel" style={{ marginBottom: 12 }}>
                <div className="panel-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>TRANSAKSI</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(apriori.transactions)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>RULES</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#334155' }}>{fmt(apriori.total_rules)}</div>
                  </div>
                  {apriori.message && <div style={{ fontSize: 12, color: '#B45309', alignSelf: 'center' }}>{apriori.message}</div>}
                </div>
              </div>
            )}
            <div className="panel">
              <div className="panel-head"><h3>Aturan Bundling (A→B)</h3></div>
              <div className="panel-body" style={{ padding: 14 }}>
                {!apriori?.rules?.length && (
                  <div style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>
                    Belum ada rule. Turunkan threshold atau pastikan ada data barang keluar.
                  </div>
                )}
                {apriori?.rules?.map((r, i) => <RuleCard key={i} rule={r} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'eoq' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)', gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><h3>Parameter EOQ</h3></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Biaya sekali PO (Rp)
                <input type="number" value={orderingCost} onChange={(e) => setOrderingCost(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Biaya simpan / tahun ({Math.round(holdingPct * 100)}% harga)
                <input type="range" min="0.05" max="0.4" step="0.01" value={holdingPct}
                  onChange={(e) => setHoldingPct(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Lead time supplier (hari)
                <input type="number" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Service level ({serviceLevel})
                <input type="range" min="0.8" max="0.99" step="0.01" value={serviceLevel}
                  onChange={(e) => setServiceLevel(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>
                Rentang demand (hari)
                <select value={eoqDays} onChange={(e) => setEoqDays(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }}>
                  {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} hari</option>)}
                </select>
              </label>
              <button type="button" onClick={runEoq} disabled={loading}
                style={{ height: 40, border: 'none', borderRadius: 10, background: '#059669', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {loading ? 'Menghitung…' : '🔄 Hitung Ulang'}
              </button>
            </div>
          </div>

          <div>
            {eoq && (
              <>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>PRODUK</div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{eoq.summary?.total_products ?? 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>RESTOCK</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{eoq.summary?.needs_restock ?? 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#B45309', fontWeight: 700 }}>WASPADA</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309' }}>{eoq.summary?.watch ?? 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>AMAN</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{eoq.summary?.ok ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h3>Rekomendasi Restock</h3>
                    <span className="badge-pill">{restockRows.length} butuh aksi</span>
                  </div>
                  <div className="panel-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9' }}>
                          {['Produk', 'Stok', 'Demand/hari', 'EOQ', 'ROP', 'Status', 'Rekomendasi'].map((h) => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #E6E8EA' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(eoq?.products || []).map((p) => {
                          const st = statusMeta[p.status] || statusMeta.ok
                          return (
                            <tr key={p.product_id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700 }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: '#64748B' }}>{p.sku || `PRD-${p.product_id}`} · {p.category}</div>
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 800 }}>{p.stock}</td>
                              <td style={{ padding: '10px 12px' }}>{p.avg_daily_demand}</td>
                              <td style={{ padding: '10px 12px' }}>{p.eoq ? fmt(p.eoq) : '—'}</td>
                              <td style={{ padding: '10px 12px' }}>{p.reorder_point ? fmt(p.reorder_point) : '—'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: 11 }}>{p.recommendation}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {!eoq && !loading && (
              <div className="panel"><div className="panel-body" style={{ textAlign: 'center', color: '#64748B', padding: 40 }}>Klik Hitung Ulang untuk hitung EOQ</div></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
