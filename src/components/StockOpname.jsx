import { useState, useMemo, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { useMaster } from "../context/MasterContext";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import Modal from "./Modal";

function formatRp(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

const SEED_SESSIONS = [
  {
    id: "SOP-2026-Q1-01",
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    auditor: "Kepala Gudang KDM",
    total_items: 12,
    match_items: 10,
    discrepancy_items: 2,
    net_value_diff: -110000,
    notes: "Audit triwulan kategori MCB dan Panel. Ditemukan 1 MCB pecah dan 1 selisih hitung.",
    details: [
      {
        sku: "MCB-DOM-1P-10A",
        name: "MCB Domae 1P 10A",
        system_stock: 45,
        physical_stock: 44,
        diff: -1,
        unit_cost: 45000,
        subtotal_diff: -45000,
        reason: "Barang Rusak di Rak",
      },
      {
        sku: "MCB-DOM-1P-16A",
        name: "MCB Domae 1P 16A",
        system_stock: 30,
        physical_stock: 29,
        diff: -1,
        unit_cost: 65000,
        subtotal_diff: -65000,
        reason: "Hilang / Salah Hitung",
      },
    ],
  },
];

function readStoredSessions() {
  try {
    const raw = localStorage.getItem("sis_stock_opname");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return SEED_SESSIONS;
}

export default function StockOpname() {
  const { user } = useAuth();
  const { products, applyStockChange } = useInventory();
  const { categories } = useMaster();

  const [sessions, setSessions] = useState(() => readStoredSessions());
  const [viewMode, setViewMode] = useState("audit"); // 'audit' | 'history'
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [printSession, setPrintSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Worksheet State: Map dari product.id -> { physical_stock: number, reason: string, rack: string }
  const [auditInputs, setAuditInputs] = useState({});

  // Sync initial auditInputs jika kosong atau produk berubah
  useEffect(() => {
    setAuditInputs((prev) => {
      const next = { ...prev };
      products.forEach((p, idx) => {
        if (!next[p.id]) {
          const rackCode = `Rak ${String.fromCharCode(65 + (idx % 4))}-${String((idx % 12) + 1).padStart(2, "0")}`;
          next[p.id] = {
            physical_stock: Number(p.stock || 0),
            reason: "Tidak Ada Selisih",
            rack: p.rack || rackCode,
          };
        }
      });
      return next;
    });
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem("sis_stock_opname", JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePhysicalChange = (productId, val) => {
    const num = Number(val);
    setAuditInputs((prev) => {
      const current = prev[productId] || {
        physical_stock: 0,
        reason: "Tidak Ada Selisih",
        rack: "Rak A-01",
      };
      return {
        ...prev,
        [productId]: {
          ...current,
          physical_stock: Math.max(0, isNaN(num) ? 0 : num),
        },
      };
    });
  };

  const handleReasonChange = (productId, reason) => {
    setAuditInputs((prev) => {
      const current = prev[productId] || {
        physical_stock: 0,
        reason: "Tidak Ada Selisih",
        rack: "Rak A-01",
      };
      return {
        ...prev,
        [productId]: {
          ...current,
          reason,
        },
      };
    });
  };

  // Filter Produk di Lembar Kerja
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, search]);

  // Kalkulasi Live Summary Lembar Kerja
  const auditSummary = useMemo(() => {
    let checkedCount = displayedProducts.length;
    let matchCount = 0;
    let diffCount = 0;
    let netFinancialDiff = 0;
    const discrepancies = [];

    displayedProducts.forEach((p) => {
      const input = auditInputs[p.id] || {
        physical_stock: Number(p.stock || 0),
        reason: "Tidak Ada Selisih",
        rack: "Rak A-01",
      };
      const sysStock = Number(p.stock || 0);
      const physStock = Number(input.physical_stock);
      const diff = physStock - sysStock;
      const cost = Number(p.cost || p.price * 0.78 || 0);
      const subtotalDiff = diff * cost;

      if (diff === 0) {
        matchCount++;
      } else {
        diffCount++;
        netFinancialDiff += subtotalDiff;
        discrepancies.push({
          product_id: p.id,
          sku: p.sku || "-",
          name: p.name,
          category: p.category,
          rack: input.rack,
          system_stock: sysStock,
          physical_stock: physStock,
          diff,
          unit_cost: cost,
          subtotal_diff: subtotalDiff,
          reason: input.reason,
        });
      }
    });

    return {
      checkedCount,
      matchCount,
      diffCount,
      netFinancialDiff,
      discrepancies,
    };
  }, [displayedProducts, auditInputs]);

  // Finalisasi & Terapkan Penyesuaian ke Stok Sistem
  const handleFinalizeOpname = async () => {
    const { diffCount, discrepancies, netFinancialDiff } = auditSummary;

    if (diffCount === 0) {
      if (
        !confirm(
          "Semua item fisik tercatat COCOK (0 selisih).\n\nApakah Anda ingin menyimpan sesi opname ini sebagai bukti audit berkala?",
        )
      ) {
        return;
      }
    } else {
      const confirmMsg =
        `Ditemukan ${diffCount} item berselisih dengan total penyesuaian ${formatRp(netFinancialDiff)}.\n\n` +
        `Sistem akan otomatis:\n` +
        `1. Mengupdate stok komputer agar sama dengan stok fisik aktual.\n` +
        `2. Mencatat mutasi penyesuaian (Stock Adjustment) di riwayat inventaris.\n` +
        `3. Merekam Berita Acara Sesi Audit resmi.\n\n` +
        `Lanjutkan penyesuaian stok?`;
      if (!confirm(confirmMsg)) return;
    }

    try {
      setIsProcessing(true);
      const sessionId = `SOP-2026-${String(sessions.length + 1).padStart(3, "0")}`;

      // Eksekusi penyesuaian stok untuk setiap item yang beda
      for (const item of discrepancies) {
        const absQty = Math.abs(item.diff);
        const mode = item.diff > 0 ? "in" : "out";
        const reasonText = `Stock Opname ${sessionId} · ${item.reason} (${item.diff > 0 ? "+" : ""}${item.diff} unit)`;

        await applyStockChange({
          productId: item.product_id,
          qty: absQty,
          mode,
          reason: "audit_adjustment",
          notes: reasonText,
        });
      }

      const newSessionRecord = {
        id: sessionId,
        date: new Date().toISOString(),
        auditor: user?.name || "Auditor Gudang",
        total_items: displayedProducts.length,
        match_items: displayedProducts.length - diffCount,
        discrepancy_items: diffCount,
        net_value_diff: netFinancialDiff,
        notes: `Pemeriksaan stok fisik kategori: ${selectedCategory === "all" ? "Semua Produk" : selectedCategory}.`,
        details: discrepancies,
      };

      setSessions((prev) => [newSessionRecord, ...prev]);
      showToast(
        `Stock Opname ${sessionId} berhasil difinalisasi! Stok telah diperbarui.`,
      );
      setPrintSession(newSessionRecord);
    } catch (err) {
      alert("Gagal melakukan rekonsiliasi stok: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="module-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <Icon name="check" size={16} />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">AUDIT FISIK & REKONSILIASI</div>
          <h1 className="page-title">Stock Opname & Audit Fisik</h1>
          <p className="page-subtitle">
            Pencocokan jumlah stok fisik di rak gudang dengan data komputer dan penyesuaian selisih otomatis.
          </p>
        </div>
        <div className="header-actions">
          <button
            className={`button ${viewMode === "audit" ? "button-primary" : ""}`}
            onClick={() => setViewMode("audit")}
          >
            <Icon name="opname" size={15} />
            <span>Lembar Kerja Opname</span>
          </button>
          <button
            className={`button ${viewMode === "history" ? "button-primary" : ""}`}
            onClick={() => setViewMode("history")}
          >
            <Icon name="clock" size={15} />
            <span>Riwayat Sesi Audit ({sessions.length})</span>
          </button>
        </div>
      </div>

      {viewMode === "audit" ? (
        <>
          {/* Live Summary Bar */}
          <div className="opname-summary-banner">
            <div className="opname-stat-item">
              <span className="stat-label">Total Item Diperiksa</span>
              <strong className="stat-val">{auditSummary.checkedCount}</strong>
              <small>Barang dalam cakupan</small>
            </div>
            <div className="opname-stat-item stat-success">
              <span className="stat-label">Stok Cocok (Akurat)</span>
              <strong className="stat-val text-success">
                {auditSummary.matchCount}
              </strong>
              <small>Fisik = Sistem Komputer</small>
            </div>
            <div className="opname-stat-item stat-warning">
              <span className="stat-label">Item Berselisih</span>
              <strong className="stat-val text-danger">
                {auditSummary.diffCount}
              </strong>
              <small>Perlu penyesuaian</small>
            </div>
            <div className="opname-stat-item stat-financial">
              <span className="stat-label">Estimasi Nilai Selisih</span>
              <strong
                className={`stat-val ${auditSummary.netFinancialDiff < 0 ? "text-danger" : "text-primary"}`}
              >
                {formatRp(auditSummary.netFinancialDiff)}
              </strong>
              <small>Dampak finansial inventaris</small>
            </div>
            <div className="opname-stat-action">
              <button
                className="button button-primary"
                disabled={isProcessing}
                onClick={handleFinalizeOpname}
              >
                <Icon name="check" size={16} />
                <span>Terapkan Penyesuaian</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="workspace-toolbar">
            <div className="toolbar-filters">
              <div className="form-field" style={{ minWidth: 200 }}>
                <select
                  className="input-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">Semua Kategori Produk</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="toolbar-search">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Cari kode SKU atau nama barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Interactive Audit Table */}
          <div className="enterprise-card">
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th style={{ width: "12%" }}>Kode SKU</th>
                    <th style={{ width: "24%" }}>Nama Produk</th>
                    <th style={{ width: "12%" }}>Lokasi Rak</th>
                    <th style={{ width: "10%", textAlign: "center" }}>
                      Stok Sistem
                    </th>
                    <th style={{ width: "14%", textAlign: "center" }}>
                      Hitung Fisik (Rak)
                    </th>
                    <th style={{ width: "10%", textAlign: "center" }}>Selisih</th>
                    <th style={{ width: "18%" }}>Keterangan Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {!displayedProducts.length ? (
                    <tr>
                      <td colSpan={7} className="empty-table-cell">
                        <div className="empty-state">
                          <Icon name="box" size={32} />
                          <p>Tidak ada produk pada kategori terpilih.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((p) => {
                      const input = auditInputs[p.id] || {
                        physical_stock: Number(p.stock || 0),
                        reason: "Tidak Ada Selisih",
                        rack: "Rak A-01",
                      };
                      const sys = Number(p.stock || 0);
                      const phys = Number(input.physical_stock);
                      const diff = phys - sys;

                      return (
                        <tr
                          key={p.id}
                          className={diff !== 0 ? "row-discrepant" : ""}
                        >
                          <td>
                            <span className="code-pill">{p.sku || "-"}</span>
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Kategori: {p.category}
                            </div>
                          </td>
                          <td>
                            <span className="rack-badge">
                              {input.rack || "Rak A-01"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>
                            {sys} {p.unit || "pcs"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div className="physical-input-wrap">
                              <input
                                type="number"
                                min="0"
                                className="input-text physical-input"
                                value={input.physical_stock}
                                onChange={(e) =>
                                  handlePhysicalChange(p.id, e.target.value)
                                }
                              />
                              <span className="input-unit">
                                {p.unit || "pcs"}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {diff === 0 ? (
                              <span className="diff-pill diff-match">
                                Sesuai
                              </span>
                            ) : diff > 0 ? (
                              <span className="diff-pill diff-surplus">
                                +{diff} (Surplus)
                              </span>
                            ) : (
                              <span className="diff-pill diff-minus">
                                {diff} (Minus)
                              </span>
                            )}
                          </td>
                          <td>
                            {diff === 0 ? (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                Cocok
                              </span>
                            ) : (
                              <select
                                className="input-select table-select"
                                value={input.reason}
                                onChange={(e) =>
                                  handleReasonChange(p.id, e.target.value)
                                }
                              >
                                <option value="Barang Rusak di Rak">
                                  Barang Rusak di Rak
                                </option>
                                <option value="Hilang / Salah Hitung">
                                  Hilang / Salah Hitung
                                </option>
                                <option value="Belum Tercatat Masuk">
                                  Belum Tercatat Masuk
                                </option>
                                <option value="Koreksi Data Sistem">
                                  Koreksi Data Sistem
                                </option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* History Sessions Mode */
        <div className="enterprise-card">
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>No. Sesi Audit</th>
                  <th>Tanggal Audit</th>
                  <th>Auditor / Penanggung Jawab</th>
                  <th style={{ textAlign: "center" }}>Item Diperiksa</th>
                  <th style={{ textAlign: "center" }}>Item Selisih</th>
                  <th style={{ textAlign: "right" }}>Dampak Finansial (Rp)</th>
                  <th>Catatan Audit</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!sessions.length ? (
                  <tr>
                    <td colSpan={8} className="empty-table-cell">
                      <div className="empty-state">
                        <Icon name="clock" size={32} />
                        <p>Belum ada riwayat sesi stock opname.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="code-pill">{s.id}</span>
                      </td>
                      <td>{formatDate(s.date)}</td>
                      <td>
                        <strong>{s.auditor}</strong>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge-count">
                          {s.total_items} item
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {s.discrepancy_items > 0 ? (
                          <span className="diff-pill diff-minus">
                            {s.discrepancy_items} selisih
                          </span>
                        ) : (
                          <span className="diff-pill diff-match">
                            0 (Sempurna)
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            s.net_value_diff < 0
                              ? "var(--danger)"
                              : "var(--navy)",
                        }}
                      >
                        {formatRp(s.net_value_diff)}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {s.notes || "-"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-table-action btn-ghost"
                          onClick={() => setPrintSession(s)}
                        >
                          <Icon name="printer" size={14} />
                          <span>Berita Acara</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cetak Berita Acara Stock Opname */}
      {printSession && (
        <Modal
          open={Boolean(printSession)}
          onClose={() => setPrintSession(null)}
          title={`Berita Acara Stock Opname — ${printSession.id}`}
          size="large"
        >
          <div className="print-document">
            <div className="print-header">
              <div className="print-brand">
                <h2>PT KEMILAU ABADI MAKMUR</h2>
                <p>Berita Acara Pemeriksaan Fisik & Rekonsiliasi Inventaris</p>
                <small>Jl. Raya Industri No. 88, Kawasan Niaga KDM | Telp: (021) 8899-2345</small>
              </div>
              <div className="print-meta">
                <div className="po-stamp">BERITA ACARA AUDIT</div>
                <table>
                  <tbody>
                    <tr>
                      <td>Nomor Sesi</td>
                      <td>:</td>
                      <td>
                        <strong>{printSession.id}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Tanggal</td>
                      <td>:</td>
                      <td>{formatDate(printSession.date)}</td>
                    </tr>
                    <tr>
                      <td>Auditor</td>
                      <td>:</td>
                      <td>
                        <strong>{printSession.auditor}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print-addresses">
              <div className="addr-box">
                <span className="addr-title">REKAPITULASI PEMERIKSAAN:</span>
                <p>Total Item Diperiksa: <strong>{printSession.total_items} SKU</strong></p>
                <p>Item Sesuai / Akurat: <strong>{printSession.match_items} SKU</strong></p>
                <p>Item Selisih Koreksi: <strong>{printSession.discrepancy_items} SKU</strong></p>
              </div>
              <div className="addr-box">
                <span className="addr-title">DAMPAK FINANSIAL SELISIH:</span>
                <h3 style={{ margin: "6px 0", color: printSession.net_value_diff < 0 ? "#b91c1c" : "#1e40af" }}>
                  {formatRp(printSession.net_value_diff)}
                </h3>
                <p style={{ fontSize: 11, color: "#64748b" }}>
                  Telah disesuaikan secara otomatis pada buku besar stok inventaris.
                </p>
              </div>
            </div>

            <h4 style={{ margin: "18px 0 8px", fontSize: 13, textTransform: "uppercase" }}>
              Daftar Barang yang Disesuaikan (Selisih Fisik vs Komputer)
            </h4>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: "35px" }}>No</th>
                  <th>Kode SKU</th>
                  <th>Nama Barang</th>
                  <th style={{ textAlign: "center" }}>Stok Sistem</th>
                  <th style={{ textAlign: "center" }}>Stok Fisik</th>
                  <th style={{ textAlign: "center" }}>Selisih</th>
                  <th style={{ textAlign: "right" }}>Nilai Selisih (Rp)</th>
                  <th>Alasan Koreksi</th>
                </tr>
              </thead>
              <tbody>
                {!printSession.details || !printSession.details.length ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "16px", color: "#64748b" }}>
                      Tidak ada barang yang berselisih. Semua stok fisik 100% cocok dengan komputer.
                    </td>
                  </tr>
                ) : (
                  printSession.details.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td><code>{it.sku}</code></td>
                      <td><strong>{it.name}</strong></td>
                      <td style={{ textAlign: "center" }}>{it.system_stock}</td>
                      <td style={{ textAlign: "center" }}>{it.physical_stock}</td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 700,
                          color: it.diff < 0 ? "#b91c1c" : "#1d4ed8",
                        }}
                      >
                        {it.diff > 0 ? `+${it.diff}` : it.diff}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatRp(it.subtotal_diff)}
                      </td>
                      <td>{it.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="print-signatures">
              <div className="sig-box">
                <span>Pelaksana Audit,</span>
                <div className="sig-space"></div>
                <strong>{printSession.auditor}</strong>
              </div>
              <div className="sig-box">
                <span>Kepala Gudang KDM,</span>
                <div className="sig-space"></div>
                <strong>Supervisor Gudang</strong>
              </div>
              <div className="sig-box">
                <span>Mengetahui & Menyetujui,</span>
                <div className="sig-space"></div>
                <strong>Manajer Operasional KDM</strong>
              </div>
            </div>

            <div className="modal-footer-actions no-print">
              <button
                type="button"
                className="button button-primary"
                onClick={() => window.print()}
              >
                <Icon name="printer" size={15} />
                <span>Cetak Berita Acara</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setPrintSession(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
