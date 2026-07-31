import { useMemo, useState } from 'react'
import { useInventory } from '../context/InventoryContext'
import { PROJECT_TEMPLATES, calculateBOM, formatRp } from '../data/bomEngine'
import { financeApi } from '../services/api'

const sel = {
  height: 38,
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '0 12px',
  fontSize: 13,
  background: '#fff',
  outline: 'none',
  width: '100%',
}

export default function BomAI({ onNavigate }) {
  const { products } = useInventory()
  const [templateId, setTemplateId] = useState('lampu_rumah')
  const template = PROJECT_TEMPLATES.find((t) => t.id === templateId) || PROJECT_TEMPLATES[0]

  const [params, setParams] = useState(() => {
    const init = {}
    template.fields.forEach((f) => { init[f.key] = f.default })
    return init
  })
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [customer, setCustomer] = useState('')

  const switchTemplate = (id) => {
    setTemplateId(id)
    const t = PROJECT_TEMPLATES.find((x) => x.id === id)
    const init = {}
    t.fields.forEach((f) => { init[f.key] = f.default })
    setParams(init)
    setResult(null)
  }

  const run = () => {
    setBusy(true)
    setTimeout(() => {
      const bom = calculateBOM(templateId, params, products || [])
      setResult(bom)
      setBusy(false)
    }, 350) // slight delay for "AI thinking" feel
  }

  const exportCSV = () => {
    if (!result) return
    const header = 'SKU,Nama,Kategori,Qty,Unit,Harga,Subtotal,Stok,Status,Catatan'
    const body = result.lines
      .map((r) =>
        [r.sku, `"${r.name}"`, r.category, r.qty, r.unit, r.price, r.subtotal, r.stock, r.stock_ok ? 'OK' : 'KURANG', `"${r.note}"`].join(',')
      )
      .join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bom-${templateId}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printBOM = () => {
    if (!result) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Rencana Material</title>
      <style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px}th{background:#f8fafc}.r{text-align:right}
      .ok{color:#16a34a}.bad{color:#ef4444}</style></head><body>
      <h2>BOM AI · Rencana Material</h2>
      <p>${result.summary}</p>
      <p>Customer: ${customer || '-'} · ${new Date(result.generated_at).toLocaleString('id-ID')}</p>
      <table><thead><tr><th>SKU</th><th>Nama</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Subtotal</th><th>Stok</th></tr></thead>
      <tbody>${result.lines.map((r) => `<tr>
        <td>${r.sku}</td><td>${r.name}<br><small>${r.note}</small></td>
        <td class="r">${r.qty} ${r.unit}</td><td class="r">${formatRp(r.price)}</td>
        <td class="r">${formatRp(r.subtotal)}</td>
        <td class="${r.stock_ok ? 'ok' : 'bad'}">${r.stock}${r.stock_ok ? '' : ` (−${r.shortage})`}</td>
      </tr>`).join('')}</tbody></table>
      <p><b>Material:</b> ${formatRp(result.total_material)} ·
         <b>Jasa ±15%:</b> ${formatRp(result.jasa_estimasi)} ·
         <b>Grand:</b> ${formatRp(result.grand_total)}</p>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const toInvoice = async () => {
    if (!result) return
    const nama = customer.trim() || 'Customer BOM AI'
    const nilai = result.grand_total
    // Optimistic + API
    try {
      await financeApi.create({
        no_faktur: `BOM${Date.now().toString().slice(-6)}`,
        tgl: new Date().toISOString().slice(0, 10),
        no_pelanggan: 'BOM',
        nama,
        nilai,
        terutang: nilai,
        keterangan: `BOM AI: ${result.summary}`.slice(0, 250),
      })
      setToast({ type: 'ok', msg: `Draft faktur ${formatRp(nilai)} dibuat untuk ${nama}` })
    } catch {
      setToast({ type: 'warn', msg: `Faktur lokal siap: ${formatRp(nilai)} (server off — buka Keuangan untuk input manual)` })
    }
    setTimeout(() => setToast(null), 4000)
  }

  const shortageLines = useMemo(() => (result?.lines || []).filter((r) => !r.stock_ok), [result])

  return (
    <div>
      <div className="page-title">BOM AI · Rencana Material</div>
      <div className="page-subtitle">
        Ketik spek pekerjaan → AI hitung material + cek stok + estimasi biaya. Anti-mainstream buat toko listrik.
      </div>

      {toast && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.12)',
          color: toast.type === 'ok' ? '#15803d' : '#c2410c',
        }}>
          {toast.msg}
          {toast.type === 'ok' && onNavigate && (
            <button type="button" onClick={() => onNavigate('keuangan')}
              style={{ marginLeft: 10, border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 800, cursor: 'pointer' }}>
              Buka Keuangan →
            </button>
          )}
        </div>
      )}

      {/* Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {PROJECT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTemplate(t.id)}
            style={{
              textAlign: 'left', padding: 14, borderRadius: 14, cursor: 'pointer',
              border: templateId === t.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: templateId === t.id ? 'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.06))' : '#fff',
            }}
          >
            <div style={{ fontSize: 22 }}>{t.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.6fr)', gap: 16 }}>
        {/* Form */}
        <div className="panel">
          <div className="panel-head"><h3>Parameter · {template.label}</h3></div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {template.fields.map((f) => (
              <label key={f.key} style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                {f.label}
                {f.type === 'number' && (
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    value={params[f.key] ?? f.default}
                    onChange={(e) => setParams((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                    style={{ ...sel, marginTop: 6 }}
                  />
                )}
                {f.type === 'bool' && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, [f.key]: !p[f.key] }))}
                      style={{
                        height: 36, padding: '0 14px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        border: params[f.key] ? '1px solid #16a34a' : '1px solid #e2e8f0',
                        background: params[f.key] ? 'rgba(22,163,74,0.1)' : '#fff',
                        color: params[f.key] ? '#15803d' : '#64748b',
                      }}
                    >
                      {params[f.key] ? '✓ Ya' : 'Tidak'}
                    </button>
                  </div>
                )}
                {f.type === 'select' && (
                  <select
                    value={params[f.key] ?? f.default}
                    onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ ...sel, marginTop: 6 }}
                  >
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {f.type === 'textarea' && (
                  <textarea
                    rows={4}
                    value={params[f.key] ?? f.default}
                    onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ ...sel, marginTop: 6, height: 'auto', padding: 10, resize: 'vertical' }}
                  />
                )}
              </label>
            ))}

            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
              Nama customer (opsional, untuk draft faktur)
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="cth. Pak Budi / AMIN ELECTRIC"
                style={{ ...sel, marginTop: 6 }} />
            </label>

            <button
              type="button"
              onClick={run}
              disabled={busy}
              style={{
                height: 44, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: '#fff',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>AI menghitung...</> : <><i className="fas fa-magic" style={{ marginRight: 8 }}></i>Hitung Material</>}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="panel">
          <div className="panel-head">
            <h3>Hasil BOM</h3>
            {result && <span className="badge-pill">{result.lines.length} item</span>}
          </div>
          <div className="panel-body" style={{ padding: result ? 0 : 20 }}>
            {!result && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🧮</div>
                Pilih template & isi parameter, lalu klik <b>Hitung Material</b>
              </div>
            )}
            {result && (
              <>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                  <b>{result.summary}</b>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    Generated {new Date(result.generated_at).toLocaleString('id-ID')} · safety factor ~10–15%
                  </div>
                </div>

                {result.warnings?.length > 0 && (
                  <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.1)', color: '#b45309', fontSize: 12 }}>
                    {result.warnings.join(' · ')}
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Produk', 'Qty', 'Harga', 'Subtotal', 'Stok'].map((h) => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.lines.map((r) => (
                        <tr key={r.sku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700 }}>{r.name}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.sku} · {r.note}</div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 700 }}>{r.qty} {r.unit}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatRp(r.price)}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 800 }}>{formatRp(r.subtotal)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                              background: r.stock_ok ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                              color: r.stock_ok ? '#16a34a' : '#ef4444',
                            }}>
                              {r.stock_ok ? `✓ ${r.stock}` : `⚠ butuh ${r.qty} (stok ${r.stock})`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>MATERIAL</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{formatRp(result.total_material)}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>JASA ±15%</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#7c3aed' }}>{formatRp(result.jasa_estimasi)}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: 'rgba(37,99,235,0.08)', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 700 }}>GRAND TOTAL</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1d4ed8' }}>{formatRp(result.grand_total)}</div>
                  </div>
                </div>

                {shortageLines.length > 0 && (
                  <div style={{ margin: '0 16px 12px', padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid #fecaca', fontSize: 12, color: '#b91c1c' }}>
                    <b>⚠ {shortageLines.length} item stok kurang</b> — sarankan restock dulu atau ganti ke brand lain.
                    <div style={{ marginTop: 6 }}>{shortageLines.map((r) => `${r.sku} (−${r.shortage})`).join(' · ')}</div>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 16px' }}>
                  <button type="button" onClick={toInvoice}
                    style={{ height: 40, padding: '0 14px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#059669)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    <i className="fas fa-file-invoice" style={{ marginRight: 6 }}></i>Jadikan Draft Faktur
                  </button>
                  <button type="button" onClick={exportCSV}
                    style={{ height: 40, padding: '0 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    CSV
                  </button>
                  <button type="button" onClick={printBOM}
                    style={{ height: 40, padding: '0 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Print / PDF
                  </button>
                  {onNavigate && (
                    <button type="button" onClick={() => onNavigate('barang-masuk')}
                      style={{ height: 40, padding: '0 14px', border: '1px solid #f59e0b', borderRadius: 10, background: 'rgba(245,158,11,0.08)', color: '#b45309', fontWeight: 700, cursor: 'pointer' }}>
                      Restock item kurang
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
