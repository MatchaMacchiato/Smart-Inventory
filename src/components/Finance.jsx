import { useMemo, useState, useCallback, useEffect } from 'react'
import { financeApi } from '../services/api'
import {
  SEED_INVOICES,
  COMPANY,
  formatRp,
  formatDateId,
  summarizeInvoices,
} from '../data/invoices'

const STATUS_META = {
  lunas: { label: 'Lunas', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  belum: { label: 'Belum Bayar', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  sebagian: { label: 'Sebagian', color: '#B45309', bg: 'rgba(180,83,9,0.12)' },
}

const MAX_UNDO = 30

function deriveStatus(nilai, terutang) {
  const n = Number(nilai || 0)
  const t = Number(terutang || 0)
  const dibayar = Math.max(0, n - t)
  if (t <= 0) return { status: 'lunas', dibayar: n }
  if (dibayar > 0) return { status: 'sebagian', dibayar }
  return { status: 'belum', dibayar: 0 }
}

function normalizeApiInvoices(list) {
  if (!Array.isArray(list) || !list.length) return null
  return list
    .map((r) => ({
      id: r.id,
      no_faktur: r.no_faktur || '',
      tgl: String(r.tgl || '').slice(0, 10),
      no_pelanggan: r.no_pelanggan || '-',
      nama: r.nama,
      nilai: Number(r.nilai || 0),
      terutang: Number(r.terutang || 0),
      dibayar: Number(r.dibayar || 0),
      status: r.status || 'belum',
      keterangan: r.keterangan || '',
      payments: (r.payments || []).map((p) => ({
        id: p.id,
        amount: Number(p.amount || 0),
        at: p.paid_at || p.created_at || new Date().toISOString(),
        note: p.note || '',
        type: p.type || 'bayar',
        source: p.source || 'user',
      })),
    }))
    .sort((a, b) => b.tgl.localeCompare(a.tgl) || String(b.no_faktur).localeCompare(String(a.no_faktur)))
}

function withSeedHistory(list) {
  return list.map((r) => {
    const payments = []
    const dibayar = Math.max(0, Number(r.nilai) - Number(r.terutang))
    if (dibayar > 0) {
      payments.push({
        id: `seed-${r.id}`,
        amount: dibayar,
        at: `${r.tgl}T12:00:00`,
        note: r.terutang <= 0 ? 'Pelunasan (data Accurate)' : 'Pembayaran awal (data Accurate)',
        type: r.terutang <= 0 ? 'lunas' : 'bayar',
        source: 'seed',
      })
    }
    return { ...r, payments }
  })
}

function snapshotRow(r) {
  return {
    terutang: r.terutang,
    dibayar: r.dibayar,
    status: r.status,
    payments: (r.payments || []).map((p) => ({ ...p })),
  }
}

export default function Finance() {
  const [rows, setRows] = useState(() =>
    withSeedHistory([...SEED_INVOICES]).sort(
      (a, b) => b.tgl.localeCompare(a.tgl) || b.no_faktur.localeCompare(a.no_faktur)
    )
  )
  const [undoStack, setUndoStack] = useState([]) // { id, label, before }
  const [toast, setToast] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('2026-07-01')
  const [dateTo, setDateTo] = useState('2026-07-27')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    no_faktur: '',
    tgl: new Date().toISOString().slice(0, 10),
    no_pelanggan: '',
    nama: '',
    nilai: '',
    terutang: '',
    keterangan: COMPANY.bank,
  })
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [historyModal, setHistoryModal] = useState(null) // invoice row
  const [apiConnected, setApiConnected] = useState(false)

  // Load dari backend Laravel; fallback seed lokal kalau API off
  useEffect(() => {
    let alive = true
    financeApi
      .list()
      .then((res) => {
        if (!alive) return
        const normalized = normalizeApiInvoices(res?.data?.invoices)
        if (normalized) {
          setRows(normalized)
          setApiConnected(true)
        }
      })
      .catch(() => {
        // offline — seed lokal tetap dipakai
      })
    return () => {
      alive = false
    }
  }, [])

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const pushUndo = useCallback((entry) => {
    setUndoStack((prev) => [entry, ...prev].slice(0, MAX_UNDO))
  }, [])

  const customers = useMemo(() => {
    const set = new Set(rows.map((r) => r.nama).filter(Boolean))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let list = [...rows]
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    if (customerFilter !== 'all') list = list.filter((r) => r.nama === customerFilter)
    if (dateFrom) list = list.filter((r) => r.tgl >= dateFrom)
    if (dateTo) list = list.filter((r) => r.tgl <= dateTo)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          String(r.no_faktur).includes(q) ||
          String(r.nama).toLowerCase().includes(q) ||
          String(r.no_pelanggan).includes(q) ||
          String(r.keterangan || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, statusFilter, customerFilter, dateFrom, dateTo, search])

  const summary = useMemo(() => summarizeInvoices(filtered), [filtered])
  const allSummary = useMemo(() => summarizeInvoices(rows), [rows])

  /** Apply payment / full settle with history + undo */
  const applyPaymentToRow = (id, amount, opts = {}) => {
    const { type = 'bayar', note = '', confirmLunas = false } = opts
    let applied = 0
    let label = ''

    setRows((prev) => {
      const target = prev.find((r) => r.id === id)
      if (!target) return prev
      const before = snapshotRow(target)
      const sisa = Number(target.terutang || 0)
      if (sisa <= 0) return prev

      let amt = Math.min(Math.max(0, Number(amount) || 0), sisa)
      if (type === 'lunas' || confirmLunas) amt = sisa
      if (amt <= 0) return prev

      applied = amt
      const newTerutang = Math.max(0, sisa - amt)
      const derived = deriveStatus(target.nilai, newTerutang)
      const payType = newTerutang <= 0 ? 'lunas' : 'bayar'
      label =
        payType === 'lunas'
          ? `Pelunasan FP ${target.no_faktur} ${formatRp(amt)}`
          : `Bayar FP ${target.no_faktur} ${formatRp(amt)}`

      const payment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        amount: amt,
        at: new Date().toISOString(),
        note: note || (payType === 'lunas' ? 'Pelunasan penuh' : 'Pembayaran sebagian'),
        type: payType,
        source: 'user',
        before_terutang: sisa,
        after_terutang: newTerutang,
      }

      pushUndo({ id, label, before, paymentId: payment.id })

      // Push ke backend (fire & forget, jangan blokir UI)
      try {
        if (payType === 'lunas') {
          financeApi.markPaid(target.id).catch(() => {})
        } else {
          financeApi.pay(target.id, amt, note).catch(() => {})
        }
      } catch {}

      return prev.map((r) =>
        r.id === id
          ? {
              ...r,
              terutang: newTerutang,
              dibayar: derived.dibayar,
              status: derived.status,
              payments: [...(r.payments || []), payment],
            }
          : r
      )
    })

    if (applied > 0) showToast(label || 'Pembayaran tersimpan')
  }

  const markPaid = (row) => {
    const ok = window.confirm(
      `Tandai LUNAS faktur ${row.no_faktur} (${row.nama})?\n\nSisa terutang: ${formatRp(row.terutang)}\n\nKalau salah, bisa Undo.`
    )
    if (!ok) return
    applyPaymentToRow(row.id, row.terutang, { type: 'lunas', note: 'Pelunasan penuh (tombol Lunas)', confirmLunas: true })
  }

  const applyPayment = () => {
    if (!payModal) return
    const amt = Number(String(payAmount).replace(/\D/g, '')) || 0
    if (amt <= 0) {
      showToast('Jumlah bayar harus > 0', 'err')
      return
    }
    if (amt > Number(payModal.terutang)) {
      showToast('Jumlah melebihi sisa terutang', 'err')
      return
    }
    applyPaymentToRow(payModal.id, amt, { note: payNote || 'Pembayaran manual' })
    setPayModal(null)
    setPayAmount('')
    setPayNote('')
  }

  /** Undo last action globally */
  const undoLast = () => {
    setUndoStack((stack) => {
      if (!stack.length) {
        showToast('Tidak ada aksi untuk di-undo', 'err')
        return stack
      }
      const [top, ...rest] = stack
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== top.id) return r
          return {
            ...r,
            terutang: top.before.terutang,
            dibayar: top.before.dibayar,
            status: top.before.status,
            payments: top.before.payments,
          }
        })
      )
      showToast(`Undo: ${top.label}`, 'undo')
      return rest
    })
  }

  /** Undo last payment on one invoice (from history modal) */
  const undoLastPaymentOnInvoice = (invoiceId) => {
    const row = rows.find((r) => r.id === invoiceId)
    if (!row) return
    const userPays = (row.payments || []).filter((p) => p.source === 'user')
    if (!userPays.length) {
      showToast('Tidak ada pembayaran user yang bisa di-undo (data seed Accurate tetap)', 'err')
      return
    }
    const last = userPays[userPays.length - 1]
    const ok = window.confirm(
      `Batalkan pembayaran terakhir?\n\n${formatRp(last.amount)}\n${last.note || ''}\n${new Date(last.at).toLocaleString('id-ID')}`
    )
    if (!ok) return

    // Remove last user payment and recompute from remaining payments
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== invoiceId) return r
        const payments = [...(r.payments || [])]
        const idx = payments.map((p) => p.id).lastIndexOf(last.id)
        if (idx >= 0) payments.splice(idx, 1)
        const paidSum = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
        const terutang = Math.max(0, Number(r.nilai) - paidSum)
        const derived = deriveStatus(r.nilai, terutang)
        return { ...r, payments, terutang, dibayar: derived.dibayar, status: derived.status }
      })
    )
    // Also drop matching undo stack entries for this payment
    setUndoStack((stack) => stack.filter((u) => u.paymentId !== last.id))
    try {
      financeApi.undoPayment(invoiceId).catch(() => {})
    } catch {}
    showToast(`Pembayaran ${formatRp(last.amount)} dibatalkan`, 'undo')
  }

  /** Reset invoice to fully unpaid (clear user payments only, keep seed note as voided) */
  const resetInvoicePayments = (invoiceId) => {
    const row = rows.find((r) => r.id === invoiceId)
    if (!row) return
    const ok = window.confirm(
      `Reset semua pembayaran user pada FP ${row.no_faktur}?\n\nFaktur kembali ke status piutang penuh (nilai faktur).\nData seed Accurate yang sudah lunas juga bisa di-reset ke terutang penuh.`
    )
    if (!ok) return
    pushUndo({
      id: invoiceId,
      label: `Reset bayar FP ${row.no_faktur}`,
      before: snapshotRow(row),
    })
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== invoiceId) return r
        return {
          ...r,
          terutang: Number(r.nilai),
          dibayar: 0,
          status: 'belum',
          payments: [],
        }
      })
    )
    try {
      financeApi.reset(invoiceId).catch(() => {})
    } catch {}
    showToast(`FP ${row.no_faktur} di-reset ke belum bayar`, 'undo')
  }

  const addInvoice = (e) => {
    e.preventDefault()
    const nilai = Number(String(form.nilai).replace(/\D/g, '')) || 0
    let terutang = form.terutang === '' ? nilai : Number(String(form.terutang).replace(/\D/g, '')) || 0
    terutang = Math.min(terutang, nilai)
    const derived = deriveStatus(nilai, terutang)
    const id = Math.max(0, ...rows.map((r) => r.id)) + 1
    const payments = []
    if (derived.dibayar > 0) {
      payments.push({
        id: `init-${id}`,
        amount: derived.dibayar,
        at: new Date().toISOString(),
        note: 'Pembayaran saat buat faktur',
        type: derived.status === 'lunas' ? 'lunas' : 'bayar',
        source: 'user',
      })
    }
    setRows((prev) => [
      {
        id,
        no_faktur: form.no_faktur || String(252000 + id),
        tgl: form.tgl,
        no_pelanggan: form.no_pelanggan || '-',
        nama: form.nama || 'Pelanggan Baru',
        nilai,
        terutang,
        dibayar: derived.dibayar,
        status: derived.status,
        keterangan: form.keterangan || COMPANY.bank,
        payments,
      },
      ...prev,
    ])
    // Push ke backend
    try {
      financeApi
        .create({
          no_faktur: form.no_faktur || null,
          tgl: form.tgl,
          no_pelanggan: form.no_pelanggan || null,
          nama: form.nama || 'Pelanggan Baru',
          nilai,
          terutang,
          keterangan: form.keterangan || COMPANY.bank,
        })
        .catch(() => {})
    } catch {}
    setShowForm(false)
    setForm({
      no_faktur: '',
      tgl: new Date().toISOString().slice(0, 10),
      no_pelanggan: '',
      nama: '',
      nilai: '',
      terutang: '',
      keterangan: COMPANY.bank,
    })
    showToast('Faktur baru ditambahkan')
  }

  const downloadCSV = () => {
    const header = 'No Faktur,Tgl,No Pelanggan,Nama Pelanggan,Nilai Faktur,Dibayar,Terutang,Status,Keterangan'
    const body = filtered
      .map((r) =>
        [
          r.no_faktur,
          r.tgl,
          r.no_pelanggan,
          `"${r.nama}"`,
          r.nilai,
          r.dibayar,
          r.terutang,
          r.status,
          `"${(r.keterangan || '').replace(/"/g, '""')}"`,
        ].join(',')
      )
      .join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `faktur-penjualan-${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>${COMPANY.reportTitle}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#0F172A}
        h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:0 0 12px;color:#475569}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #E6E8EA;padding:6px 8px;text-align:left}
        th{background:#F1F5F9} .r{text-align:right}
        .sum{margin-top:16px;font-size:12px}
      </style></head><body>
      <h1>${COMPANY.name}</h1>
      <h2>${COMPANY.reportTitle} · ${dateFrom} s/d ${dateTo}</h2>
      <table><thead><tr>
        <th>No. Faktur</th><th>Tgl</th><th>No. Pel.</th><th>Nama Pelanggan</th>
        <th class="r">Nilai</th><th class="r">Terutang</th><th>Status</th><th>Keterangan</th>
      </tr></thead><tbody>
      ${filtered
        .map(
          (r) => `<tr>
          <td>${r.no_faktur}</td><td>${formatDateId(r.tgl)}</td><td>${r.no_pelanggan}</td><td>${r.nama}</td>
          <td class="r">${formatRp(r.nilai)}</td><td class="r">${formatRp(r.terutang)}</td>
          <td>${STATUS_META[r.status]?.label || r.status}</td><td>${r.keterangan || ''}</td>
        </tr>`
        )
        .join('')}
      </tbody></table>
      <div class="sum">
        <b>Total Faktur:</b> ${formatRp(summary.total_nilai)} ·
        <b>Terbayar:</b> ${formatRp(summary.total_dibayar)} ·
        <b>Piutang:</b> ${formatRp(summary.total_terutang)} ·
        <b>Collection:</b> ${summary.collection_rate}%
      </div>
      </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  const sel = {
    height: 36,
    border: '1px solid #E6E8EA',
    borderRadius: 10,
    padding: '0 10px',
    fontSize: 12,
    background: '#fff',
    outline: 'none',
  }

  const historyRow = historyModal
    ? rows.find((r) => r.id === historyModal.id) || historyModal
    : null

  const historyPayments = historyRow
    ? [...(historyRow.payments || [])].sort((a, b) => new Date(a.at) - new Date(b.at))
    : []

  const runningPaid = []
  let run = 0
  historyPayments.forEach((p) => {
    run += Number(p.amount || 0)
    runningPaid.push({ ...p, running: run, sisa: Math.max(0, Number(historyRow?.nilai || 0) - run) })
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <div>
          <div className="page-title">Keuangan · Faktur Penjualan</div>
          <div className="page-subtitle">
            {COMPANY.name} · {COMPANY.reportTitle} · Undo & history pembayaran
            {apiConnected ? (
              <span style={{ color: '#059669', fontWeight: 700 }}> · <i className="fas fa-database"></i> tersimpan di server</span>
            ) : (
              <span style={{ color: '#B45309', fontWeight: 700 }}> · mode lokal (server off)</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={undoLast}
          disabled={!undoStack.length}
          title={undoStack[0]?.label || 'Tidak ada undo'}
          style={{
            height: 40,
            padding: '0 16px',
            border: '1px solid #E6E8EA',
            borderRadius: 12,
            background: undoStack.length ? 'rgba(180,83,9,0.12)' : '#F1F5F9',
            color: undoStack.length ? '#B45309' : '#64748B',
            fontWeight: 800,
            fontSize: 13,
            cursor: undoStack.length ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="fas fa-undo"></i>
          Undo{undoStack.length ? ` (${undoStack.length})` : ''}
        </button>
      </div>

      {toast && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background: toast.type === 'err' ? 'rgba(220,38,38,0.1)' : toast.type === 'undo' ? 'rgba(180,83,9,0.12)' : 'rgba(5,150,105,0.1)',
            color: toast.type === 'err' ? '#B91C1C' : toast.type === 'undo' ? '#B45309' : '#059669',
          }}
        >
          {toast.msg}
        </div>
      )}

      {undoStack[0] && (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#94A3B8' }}>
          Aksi terakhir: <b style={{ color: '#0F172A' }}>{undoStack[0].label}</b> — klik Undo untuk batalkan
        </div>
      )}

      {/* KPI */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Total Faktur', value: formatRp(summary.total_nilai), sub: `${summary.count} dokumen`, icon: 'fa-file-invoice-dollar', color: '#334155' },
          { label: 'Sudah Dibayar', value: formatRp(summary.total_dibayar), sub: `${summary.lunas} lunas`, icon: 'fa-check-circle', color: '#059669' },
          { label: 'Piutang (Terutang)', value: formatRp(summary.total_terutang), sub: `${summary.belumbayar} belum bayar`, icon: 'fa-exclamation-circle', color: '#DC2626' },
          { label: 'Collection Rate', value: `${summary.collection_rate}%`, sub: `${summary.sebagian} sebagian`, icon: 'fa-percent', color: '#7C3AED' },
        ].map((k) => (
          <div key={k.label} className="kpi-card" style={{ borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{k.sub}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}15`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${k.icon}`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari no faktur / pelanggan..." style={{ ...sel, minWidth: 200, flex: 1 }} />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={sel} />
          <span style={{ color: '#64748B', fontSize: 12 }}>s/d</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={sel} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={sel}>
            <option value="all">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum">Belum Bayar</option>
            <option value="sebagian">Sebagian</option>
          </select>
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={{ ...sel, maxWidth: 200 }}>
            <option value="all">Semua Pelanggan</option>
            {customers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="button" onClick={() => setShowForm((v) => !v)}
            style={{ height: 36, padding: '0 14px', border: 'none', borderRadius: 10, background: '#334155', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Faktur Baru
          </button>
          <button type="button" onClick={downloadCSV}
            style={{ height: 36, padding: '0 12px', border: '1px solid #E6E8EA', borderRadius: 10, background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            CSV
          </button>
          <button type="button" onClick={printReport}
            style={{ height: 36, padding: '0 12px', border: '1px solid #E6E8EA', borderRadius: 10, background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            PDF/Print
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addInvoice} className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head"><h3>Tambah Faktur Penjualan</h3></div>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {[
              { key: 'no_faktur', label: 'No. Faktur', ph: '252xxx' },
              { key: 'tgl', label: 'Tgl Faktur', type: 'date' },
              { key: 'no_pelanggan', label: 'No. Pelanggan', ph: '16xx' },
              { key: 'nama', label: 'Nama Pelanggan', ph: 'Nama toko/customer' },
              { key: 'nilai', label: 'Nilai Faktur', ph: '1000000' },
              { key: 'terutang', label: 'Terutang (kosong = full)', ph: '0 = lunas' },
              { key: 'keterangan', label: 'Keterangan / Rekening', ph: COMPANY.bank },
            ].map((f) => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
                {f.label}
                <input
                  type={f.type || 'text'}
                  required={['tgl', 'nama', 'nilai'].includes(f.key)}
                  value={form[f.key]}
                  placeholder={f.ph}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...sel, height: 38 }}
                />
              </label>
            ))}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button type="submit" style={{ height: 38, padding: '0 16px', border: 'none', borderRadius: 10, background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Simpan</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ height: 38, padding: '0 16px', border: '1px solid #E6E8EA', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>Batal</button>
            </div>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(260px, 1fr)', gap: 16 }}>
        <div className="panel">
          <div className="panel-head">
            <h3>Daftar Faktur</h3>
            <span className="badge-pill">{filtered.length} / {rows.length}</span>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  {['No. Faktur', 'Tgl', 'Pelanggan', 'Nilai', 'Terutang', 'Status', 'Aksi'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', borderBottom: '1px solid #E6E8EA' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = STATUS_META[r.status] || STATUS_META.belum
                  const payCount = (r.payments || []).length
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.no_faktur}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatDateId(r.tgl)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{r.nama}</div>
                        <div style={{ fontSize: 10, color: '#64748B' }}>#{r.no_pelanggan}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatRp(r.nilai)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: r.terutang > 0 ? '#DC2626' : '#059669', whiteSpace: 'nowrap' }}>{formatRp(r.terutang)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <button type="button" onClick={() => setHistoryModal(r)}
                          style={{ marginRight: 4, padding: '4px 8px', border: '1px solid #7C3AED', borderRadius: 8, background: 'rgba(124,58,237,0.08)', color: '#7C3AED', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          title="Riwayat bayar">
                          <i className="fas fa-history"></i>{payCount ? ` ${payCount}` : ''}
                        </button>
                        {r.terutang > 0 && (
                          <>
                            <button type="button" onClick={() => { setPayModal(r); setPayAmount(String(r.terutang)); setPayNote('') }}
                              style={{ marginRight: 4, padding: '4px 8px', border: '1px solid #334155', borderRadius: 8, background: 'rgba(51,65,85,0.09)', color: '#1E293B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              Bayar
                            </button>
                            <button type="button" onClick={() => markPaid(r)}
                              style={{ padding: '4px 8px', border: '1px solid #059669', borderRadius: 8, background: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              Lunas
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Tidak ada faktur di filter ini</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><h3>Top Pelanggan</h3></div>
            <div className="panel-body" style={{ padding: '8px 12px' }}>
              {summary.topCustomers.slice(0, 8).map((c, i) => (
                <div key={c.nama} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #F8FAFC' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: i < 3 ? '#334155' : '#E6E8EA', color: i < 3 ? '#fff' : '#94A3B8', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nama}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{c.count} faktur · piutang {formatRp(c.terutang)}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800 }}>{formatRp(c.nilai)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Riwayat Undo</h3></div>
            <div className="panel-body" style={{ padding: '8px 12px', maxHeight: 180, overflowY: 'auto' }}>
              {!undoStack.length && <div style={{ fontSize: 12, color: '#64748B' }}>Belum ada aksi bayar/lunas. Setelah bayar, Undo muncul di sini.</div>}
              {undoStack.slice(0, 8).map((u, i) => (
                <div key={i} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid #F8FAFC', color: i === 0 ? '#B45309' : '#94A3B8' }}>
                  {i === 0 ? '↩ ' : ''}{u.label}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Ringkasan Global</h3></div>
            <div className="panel-body" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94A3B8' }}>Semua faktur</span><b>{allSummary.count}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94A3B8' }}>Omzet total</span><b>{formatRp(allSummary.total_nilai)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94A3B8' }}>Piutang total</span><b style={{ color: '#DC2626' }}>{formatRp(allSummary.total_terutang)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94A3B8' }}>Collection</span><b style={{ color: '#059669' }}>{allSummary.collection_rate}%</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pay modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setPayModal(null)}>
          <div className="panel" style={{ width: '100%', maxWidth: 420, margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head"><h3>Catat Pembayaran</h3></div>
            <div className="panel-body">
              <div style={{ marginBottom: 12, fontSize: 13 }}>
                <b>FP {payModal.no_faktur}</b> · {payModal.nama}
                <div style={{ color: '#94A3B8', marginTop: 4 }}>
                  Nilai {formatRp(payModal.nilai)} · Sisa {formatRp(payModal.terutang)}
                </div>
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 10 }}>
                Jumlah bayar (Rp)
                <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  style={{ ...sel, width: '100%', height: 42, marginTop: 6, fontSize: 14, fontWeight: 700 }} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block' }}>
                Catatan (opsional)
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Transfer BCA / cash / dll"
                  style={{ ...sel, width: '100%', height: 38, marginTop: 6 }} />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={applyPayment}
                  style={{ flex: 1, height: 40, border: 'none', borderRadius: 10, background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Simpan Pembayaran
                </button>
                <button type="button" onClick={() => setPayModal(null)}
                  style={{ height: 40, padding: '0 14px', border: '1px solid #E6E8EA', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
                  Batal
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
                Salah input? Pakai tombol <b>Undo</b> di atas, atau buka History → batalkan bayar terakhir.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setHistoryModal(null)}>
          <div className="panel" style={{ width: '100%', maxWidth: 560, margin: 0, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h3>
                <i className="fas fa-history" style={{ marginRight: 8, color: '#7C3AED' }}></i>
                History Bayar · FP {historyRow.no_faktur}
              </h3>
              <button type="button" onClick={() => setHistoryModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#64748B' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 10, borderRadius: 10, background: '#F1F5F9', border: '1px solid #E6E8EA' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>NILAI FAKTUR</div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{formatRp(historyRow.nilai)}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: 'rgba(5,150,105,0.1)', border: '1px solid #D1FAE5' }}>
                  <div style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>DIBAYAR</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#059669' }}>{formatRp(historyRow.dibayar)}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 10, background: historyRow.terutang > 0 ? 'rgba(220,38,38,0.1)' : 'rgba(5,150,105,0.1)', border: '1px solid #E6E8EA' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700 }}>SISA / STATUS</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: historyRow.terutang > 0 ? '#DC2626' : '#059669' }}>
                    {historyRow.terutang > 0 ? formatRp(historyRow.terutang) : 'LUNAS ✓'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>
                <b>{historyRow.nama}</b> · #{historyRow.no_pelanggan} · {formatDateId(historyRow.tgl)}
              </div>

              {/* Timeline */}
              <div style={{ position: 'relative', paddingLeft: 4 }}>
                <div style={{
                  padding: '10px 12px', marginBottom: 8, borderRadius: 10,
                  border: '1px dashed #94A3B8', background: '#F1F5F9', fontSize: 12,
                }}>
                  <div style={{ fontWeight: 700 }}>📄 Faktur dibuat</div>
                  <div style={{ color: '#64748B', fontSize: 11 }}>{formatDateId(historyRow.tgl)} · Nilai {formatRp(historyRow.nilai)} · Piutang awal penuh</div>
                </div>

                {runningPaid.map((p, i) => (
                  <div key={p.id || i} style={{
                    padding: '12px', marginBottom: 8, borderRadius: 12,
                    border: `1px solid ${p.type === 'lunas' ? '#D1FAE5' : '#E6E8EA'}`,
                    background: p.type === 'lunas' ? 'rgba(5,150,105,0.08)' : '#fff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: p.type === 'lunas' ? '#059669' : '#334155' }}>
                          {p.type === 'lunas' ? '✓ Pelunasan' : '💰 Pembayaran'} {formatRp(p.amount)}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                          {new Date(p.at).toLocaleString('id-ID')}
                          {p.source === 'seed' ? ' · data Accurate' : ' · input user'}
                        </div>
                        {p.note && <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{p.note}</div>}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11 }}>
                        <div style={{ color: '#059669', fontWeight: 700 }}>Kumulatif {formatRp(p.running)}</div>
                        <div style={{ color: p.sisa > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>
                          {p.sisa > 0 ? `Sisa ${formatRp(p.sisa)}` : 'Lunas'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!runningPaid.length && (
                  <div style={{ padding: 16, textAlign: 'center', color: '#64748B', fontSize: 13, border: '1px dashed #E6E8EA', borderRadius: 10 }}>
                    Belum ada pembayaran. Status: belum bayar.
                  </div>
                )}

                {historyRow.status === 'lunas' && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 12, marginTop: 4,
                    background: 'rgba(5,150,105,0.1)',
                    border: '1px solid #D1FAE5', color: '#059669', fontWeight: 800, fontSize: 13, textAlign: 'center',
                  }}>
                    ✓ Faktur LUNAS — total terbayar {formatRp(historyRow.dibayar)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                <button type="button" onClick={() => undoLastPaymentOnInvoice(historyRow.id)}
                  style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #B45309', background: 'rgba(180,83,9,0.12)', color: '#B45309', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  <i className="fas fa-undo" style={{ marginRight: 6 }}></i>Batalkan bayar terakhir
                </button>
                <button type="button" onClick={() => resetInvoicePayments(historyRow.id)}
                  style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #DC2626', background: 'rgba(220,38,38,0.1)', color: '#B91C1C', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  <i className="fas fa-rotate-left" style={{ marginRight: 6 }}></i>Reset ke belum bayar
                </button>
                {historyRow.terutang > 0 && (
                  <button type="button" onClick={() => { setHistoryModal(null); setPayModal(historyRow); setPayAmount(String(historyRow.terutang)) }}
                    style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#334155', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    + Bayar lagi
                  </button>
                )}
                <button type="button" onClick={() => setHistoryModal(null)}
                  style={{ marginLeft: 'auto', padding: '8px 12px', borderRadius: 10, border: '1px solid #E6E8EA', background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
