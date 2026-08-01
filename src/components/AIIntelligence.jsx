import { useEffect, useMemo, useState } from 'react'
import { aiIntelApi } from '../services/api'
import { useInventory } from '../context/InventoryContext'

const fmt = (n) => Number(n || 0).toLocaleString('id-ID')
const pct = (n) => `${Math.round(Number(n || 0) * 100)}%`

function RuleCard({ rule }) {
  return (
    <div className="panel" style={{ marginBottom: 10 }}>
      <div className="panel-body" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{rule.antecedent?.name}</span>
          <span style={{ fontWeight: 900, color: '#2563eb', fontSize: 15 }}>→</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#1d4ed8' }}>{rule.consequent?.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
          <span><b style={{ color: '#0f172a' }}>{pct(rule.confidence)}</b> confidence</span>
          <span><b style={{ color: '#0f172a' }}>{pct(rule.support)}</b> support</span>
          <span>Lift <b style={{ color: rule.lift >= 1 ? '#16a34a' : '#ef4444' }}>{Number(rule.lift).toFixed(2)}</b></span>
          <span>{rule.count} transaksi</span>
        </div>
      </div>
    </div>
  )
}

export default function AIIntelligence({ onNavigate }) {
  const { products } = useInventory()
  const [tab, setTab] = useState('bundling')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Apriori params
  const [minSupport, setMinSupport] = useState(0.1)
  const [minConfidence, setMinConfidence] = useState(0.4)
  const [days, setDays] = useState(60)

  // EOQ params
  const [orderingCost, setOrderingCost] = useState(25000)
  const [holdingPct, setHoldingPct] = useState(0.15)
  const [leadTime, setLeadTime] = useState(5)
  const [serviceLevel, setServiceLevel] = useState(0.95)
  const [eoqDays, setEoqDays] = useState(90)

  const [apriori, setApriori] = useState(null)
  const [eoq, setEoq] = useState(null)

  const runApriori = () => {
    setLoading(true)
    setError(null)
    aiIntelApi
      .apriori({ min_support: minSupport, min_confidence: minConfidence, days })
      .then((res) => setApriori(res.data))
      .catch((e) => setError(e?.response?.data?.message || 'Gagal load Apriori — cek server'))
      .finally(() => setLoading(false))
  }

  const runEoq = () => {
    setLoading(true)
    setError(null)
    aiIntelApi
      .eoq({ ordering_cost: orderingCost, holding_pct: holdingPct, lead_time: leadTime, service_level: serviceLevel, days: eoqDays })
      .then((res) => setEoq(res.data))
      .catch((e) => setError(e?.response?.data?.message || 'Gagal load EOQ — cek server'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    runApriori()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nameOf = (id) => products?.find((p) => p.id === id)?.name || `Produk #${id}`

  const statusMeta = {
    restock: { label: 'SEGERA RESTOCK', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    watch: { label: 'WASPADA', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ok: { label: 'AMAN', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    no_demand: { label: 'NO DEMAND', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  }

  const restockRows = useMemo(() => (eoq?.products || []).filter((p) => p.status === 'restock' || p.status === 'watch'), [eoq])

  const sel = { height: 36, border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 10px', fontSize: 12, background: '#fff', outline: 'none' }

  return (
    <div>
      <div className="page-title">AI Intelligence · Apriori + EOQ</div>
      <div className="page-subtitle">
        Analisis data penjualan deterministik — bundling produk (Apriori) & optimasi restock (EOQ). Hasil pasti, bisa dipertanggungjawabkan.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'bundling', label: '🛒 Bundling (Apriori)', desc: 'Produk yang sering dibeli bareng' },
          { id: 'eoq', label: '📦 Optimasi Restock (EOQ)', desc: 'Qty pesanan optimal + reorder point' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px', borderRadius: 12, border: tab === t.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: tab === t.id ? 'rgba(37,99,235,0.08)' : '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {error && <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#b91c1c', fontSize: 12 }}>{error}</div>}

      {tab === 'bundling' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><h3>Parameter Apriori</h3></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Min Support ({minSupport})
                <input type="range" min="0.02" max="0.5" step="0.01" value={minSupport}
                  onChange={(e) => setMinSupport(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Min Confidence ({minConfidence})
                <input type="range" min="0.1" max="0.9" step="0.05" value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Rentang data (hari)
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }}>
                  {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} hari</option>)}
                </select>
              </label>
              <button type="button" onClick={runApriori} disabled={loading}
                style={{ height: 40, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {loading ? 'Menghitung…' : '🔄 Hitung Ulang'}
              </button>
            </div>
          </div>

          <div>
            {apriori && (
              <div className="panel" style={{ marginBottom: 12 }}>
                <div className="panel-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>TRANSAKSI</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(apriori.transactions)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>RULES DITEMUKAN</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{fmt(apriori.total_rules)}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    {apriori.message && <span style={{ fontSize: 12, color: '#b45309' }}>{apriori.message}</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="panel">
              <div className="panel-head"><h3>Aturan Bundling (A→B)</h3></div>
              <div className="panel-body" style={{ padding: 14 }}>
                {!apriori?.rules?.length && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>Belum ada rule. Turunkan threshold atau pastikan ada data barang keluar di server.</div>}
                {apriori?.rules?.map((r, i) => <RuleCard key={i} rule={r} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'eoq' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><h3>Parameter EOQ</h3></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Biaya sekali PO (Rp)
                <input type="number" value={orderingCost} onChange={(e) => setOrderingCost(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Biaya simpan / tahun ({Math.round(holdingPct * 100)}% dari harga)
                <input type="range" min="0.05" max="0.4" step="0.01" value={holdingPct}
                  onChange={(e) => setHoldingPct(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Lead time supplier (hari)
                <input type="number" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Service level ({serviceLevel})
                <input type="range" min="0.8" max="0.99" step="0.01" value={serviceLevel}
                  onChange={(e) => setServiceLevel(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                Rentang demand (hari)
                <select value={eoqDays} onChange={(e) => setEoqDays(Number(e.target.value))} style={{ ...sel, width: '100%', marginTop: 6 }}>
                  {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} hari</option>)}
                </select>
              </label>
              <button type="button" onClick={runEoq} disabled={loading}
                style={{ height: 40, border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
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
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>PRODUK DIPANTAU</div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{eoq.summary?.total_products}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>SEGERA RESTOCK</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{eoq.summary?.needs_restock}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>WASPADA</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{eoq.summary?.watch}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>AMAN</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{eoq.summary?.ok}</div>
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
                        <tr style={{ background: '#f8fafc' }}>
                          {['Produk', 'Stok', 'Demand/hari', 'EOQ', 'ROP', 'Status', 'Rekomendasi'].map((h) => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(eoq?.products || []).map((p) => {
                          const st = statusMeta[p.status] || statusMeta.ok
                          return (
                            <tr key={p.product_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700 }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.sku} · {p.category}</div>
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 800 }}>{p.stock}</td>
                              <td style={{ padding: '10px 12px' }}>{p.avg_daily_demand}</td>
                              <td style={{ padding: '10px 12px' }}>{p.eoq ? fmt(p.eoq) : '—'}</td>
                              <td style={{ padding: '10px 12px' }}>{p.reorder_point ? fmt(p.reorder_point) : '—'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>{p.recommendation}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
