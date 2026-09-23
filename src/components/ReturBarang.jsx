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
    });
  } catch {
    return dateStr;
  }
}

const SEED_RETURNS = [
  {
    id: "RET-2026-001",
    type: "supplier", // 'supplier' | 'customer'
    party_name: "PT Schneider Electric Indonesia",
    product_id: 1,
    product_name: "MCB Domae 1P 10A",
    sku: "MCB-DOM-1P-10A",
    qty: 5,
    unit_price: 45000,
    total_value: 225000,
    reason: "Gagal Fungsi / Korsleting Listrik",
    resolution: "Ganti Unit Baru",
    condition: "Rusak Total / Afkir",
    notes: "Pengujian terminal trip tidak merespons beban lebih saat uji lab gudang.",
    status: "completed", // 'pending' | 'approved' | 'completed' | 'rejected'
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_by: "Staf Gudang",
  },
  {
    id: "RET-2026-002",
    type: "customer",
    party_name: "PT Graha Bangun Mandiri",
    product_id: 2,
    product_name: "Kabel NYM 3x2.5mm (50m)",
    sku: "KBL-NYM-3X25",
    qty: 2,
    unit_price: 685000,
    total_value: 1370000,
    reason: "Salah Kirim Spesifikasi / Tipe",
    resolution: "Tukar Barang Sesuai PO",
    condition: "Layak Jual Kembali",
    notes: "Pelanggan memesan NYY 3x2.5mm namun terkirim tipe NYM. Segel rol utuh.",
    status: "approved",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    completed_at: null,
    created_by: "Kasir KDM",
  },
];

function readStoredReturns() {
  try {
    const raw = localStorage.getItem("sis_returns");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return SEED_RETURNS;
}

export default function ReturBarang() {
  const { user } = useAuth();
  const { products, applyStockChange } = useInventory();
  const { suppliers } = useMaster();

  const [returnsList, setReturnsList] = useState(() => readStoredReturns());
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formType, setFormType] = useState("supplier");
  const [formPartyName, setFormPartyName] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [formReason, setFormReason] = useState("Cacat Fisik / Bodi Pecah");
  const [formCondition, setFormCondition] = useState("Rusak Total / Afkir");
  const [formResolution, setFormResolution] = useState("Ganti Unit Baru");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("sis_returns", JSON.stringify(returnsList));
    } catch {}
  }, [returnsList]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(formProductId)),
    [products, formProductId],
  );

  const resetForm = () => {
    setFormType("supplier");
    setFormPartyName(suppliers[0]?.name || "PT Schneider Electric Indonesia");
    setFormProductId(products[0]?.id ? String(products[0].id) : "");
    setFormQty(1);
    setFormReason("Cacat Fisik / Bodi Pecah");
    setFormCondition("Rusak Total / Afkir");
    setFormResolution("Ganti Unit Baru");
    setFormNotes("");
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleCreateReturn = async () => {
    if (!formPartyName.trim()) {
      alert("Harap isi nama supplier atau pelanggan");
      return;
    }
    if (!selectedProduct) {
      alert("Pilih produk yang akan diretur");
      return;
    }
    const q = Number(formQty);
    if (!q || q <= 0) {
      alert("Jumlah barang retur tidak valid");
      return;
    }

    const price = selectedProduct.cost || selectedProduct.price || 0;
    const newId = `RET-2026-${String(returnsList.length + 1).padStart(3, "0")}`;

    const newRecord = {
      id: newId,
      type: formType,
      party_name: formPartyName.trim(),
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      sku: selectedProduct.sku,
      qty: q,
      unit_price: price,
      total_value: q * price,
      reason: formReason,
      condition: formCondition,
      resolution: formResolution,
      notes: formNotes || "-",
      status: "pending", // awal masuk pengajuan
      created_at: new Date().toISOString(),
      completed_at: null,
      created_by: user?.name || "Staf Operasional",
    };

    setReturnsList((prev) => [newRecord, ...prev]);
    setIsCreateOpen(false);
    showToast(`Pengajuan ${newId} berhasil dibuat dan menunggu persetujuan.`);
  };

  // Proses Approval & Sinkronisasi Stok
  const handleApproveAndExecute = async (ret) => {
    if (!confirm(`Setujui dan proses ${ret.id}?\n\nAlur stok akan disinkronisasi ke sistem sesuai jenis retur.`)) {
      return;
    }

    try {
      setLoading(true);

      if (ret.type === "supplier") {
        // Retur ke Supplier: Stok berkurang (dikeluarkan dari gudang untuk dikirim kembali ke vendor)
        await applyStockChange({
          productId: ret.product_id,
          qty: ret.qty,
          mode: "out",
          reason: "return_supplier",
          notes: `Retur ke ${ret.party_name} · ${ret.reason} (No: ${ret.id})`,
          supplier: ret.party_name,
        });
      } else if (ret.type === "customer") {
        // Retur dari Pelanggan:
        // Jika kondisi layak jual kembali -> masukkan kembali ke stok
        if (ret.condition === "Layak Jual Kembali") {
          await applyStockChange({
            productId: ret.product_id,
            qty: ret.qty,
            mode: "in",
            reason: "return_customer",
            notes: `Retur dari ${ret.party_name} · Restock (${ret.id})`,
            customer: ret.party_name,
          });
        }
        // Jika Rusak Total / Afkir -> stok tidak bertambah kembali karena barang rusak
      }

      setReturnsList((prev) =>
        prev.map((r) =>
          r.id === ret.id
            ? {
                ...r,
                status: "completed",
                completed_at: new Date().toISOString(),
              }
            : r,
        ),
      );

      showToast(`Retur ${ret.id} selesai diproses! Perubahan stok telah disinkronisasi.`);
    } catch (err) {
      alert("Gagal memproses retur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (id) => {
    if (confirm(`Tolak pengajuan retur ${id}?`)) {
      setReturnsList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
      );
      showToast(`Pengajuan retur ${id} ditolak.`);
    }
  };

  // Filter & Search
  const filteredReturns = useMemo(() => {
    return returnsList.filter((item) => {
      if (activeTab === "supplier" && item.type !== "supplier") return false;
      if (activeTab === "customer" && item.type !== "customer") return false;
      if (activeTab === "pending" && item.status !== "pending") return false;
      if (activeTab === "completed" && item.status !== "completed") return false;

      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.party_name.toLowerCase().includes(q) ||
        (item.sku || "").toLowerCase().includes(q)
      );
    });
  }, [returnsList, activeTab, search]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalCount = returnsList.length;
    const supplierReturns = returnsList.filter((r) => r.type === "supplier");
    const customerReturns = returnsList.filter((r) => r.type === "customer");
    const pendingCount = returnsList.filter((r) => r.status === "pending").length;

    const totalValue = returnsList.reduce((s, r) => s + Number(r.total_value || 0), 0);
    const supplierVal = supplierReturns.reduce((s, r) => s + Number(r.total_value || 0), 0);
    const customerVal = customerReturns.reduce((s, r) => s + Number(r.total_value || 0), 0);

    return { totalCount, supplierVal, customerVal, pendingCount, totalValue };
  }, [returnsList]);

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
          <div className="eyebrow">PENGELOLAAN DEFECT & KLAIM</div>
          <h1 className="page-title">Retur Barang & Pengembalian</h1>
          <p className="page-subtitle">
            Tata kelola barang cacat/rusak ke distributor (Return to Vendor) dan klaim komplain pembeli yang terhubung ke mutasi stok.
          </p>
        </div>
        <div className="header-actions">
          <button className="button button-primary" onClick={openCreateModal}>
            <Icon name="plus" size={16} />
            <span>Ajukan Retur Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-top">
            <span>Total Pengajuan Retur</span>
            <Icon name="retur" size={18} />
          </div>
          <span className="metric-value">{metrics.totalCount}</span>
          <div className="metric-bottom">
            <span>Nilai: {formatRp(metrics.totalValue)}</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Retur ke Supplier (Klaim)</span>
            <Icon name="truck" size={18} />
          </div>
          <span className="metric-value" style={{ fontSize: "20px" }}>
            {formatRp(metrics.supplierVal)}
          </span>
          <div className="metric-bottom">
            <span>Barang reject dikembalikan ke pabrik</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Retur dari Pelanggan</span>
            <Icon name="up" size={18} />
          </div>
          <span className="metric-value" style={{ fontSize: "20px" }}>
            {formatRp(metrics.customerVal)}
          </span>
          <div className="metric-bottom">
            <span>Salah kirim / klaim konsumen</span>
          </div>
        </div>

        <div className="metric metric-attention">
          <div className="metric-top">
            <span>Menunggu Persetujuan</span>
            <Icon name="clock" size={18} />
          </div>
          <span className="metric-value">{metrics.pendingCount}</span>
          <div className="metric-bottom">
            <span>Butuh verifikasi fisik gudang</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="workspace-toolbar">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Semua ({returnsList.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "supplier" ? "active" : ""}`}
            onClick={() => setActiveTab("supplier")}
          >
            Ke Supplier ({returnsList.filter((r) => r.type === "supplier").length})
          </button>
          <button
            className={`tab-btn ${activeTab === "customer" ? "active" : ""}`}
            onClick={() => setActiveTab("customer")}
          >
            Dari Pelanggan ({returnsList.filter((r) => r.type === "customer").length})
          </button>
          <button
            className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Menunggu Approval ({returnsList.filter((r) => r.status === "pending").length})
          </button>
          <button
            className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Selesai Diproses
          </button>
        </div>

        <div className="toolbar-search">
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Cari ID, produk, atau nama pihak..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="enterprise-card">
        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>No. Tiket</th>
                <th>Jenis Retur</th>
                <th>Tanggal</th>
                <th>Pihak / Rekanan</th>
                <th>Produk & SKU</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Nilai Klaim</th>
                <th>Alasan Retur</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!filteredReturns.length ? (
                <tr>
                  <td colSpan={10} className="empty-table-cell">
                    <div className="empty-state">
                      <Icon name="retur" size={32} />
                      <p>Tidak ada transaksi retur yang ditemukan.</p>
                      <button className="button button-primary" onClick={openCreateModal}>
                        Ajukan Retur Baru
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id}>
                    <td>
                      <span className="code-pill">{ret.id}</span>
                    </td>
                    <td>
                      {ret.type === "supplier" ? (
                        <span className="type-badge badge-supplier">
                          <Icon name="truck" size={12} />
                          <span>Ke Supplier</span>
                        </span>
                      ) : (
                        <span className="type-badge badge-customer">
                          <Icon name="up" size={12} />
                          <span>Dari Pelanggan</span>
                        </span>
                      )}
                    </td>
                    <td>{formatDate(ret.created_at)}</td>
                    <td><strong>{ret.party_name}</strong></td>
                    <td>
                      <div>
                        <strong>{ret.product_name}</strong>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          SKU: {ret.sku}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>
                      {ret.qty} unit
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {formatRp(ret.total_value)}
                    </td>
                    <td>
                      <span className="reason-pill">{ret.reason}</span>
                    </td>
                    <td>
                      {ret.status === "pending" && (
                        <span className="status-pill status-ordered">Menunggu</span>
                      )}
                      {ret.status === "approved" && (
                        <span className="status-pill status-draft">Disetujui</span>
                      )}
                      {ret.status === "completed" && (
                        <span className="status-pill status-received">Selesai</span>
                      )}
                      {ret.status === "rejected" && (
                        <span className="status-pill status-canceled">Ditolak</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="table-actions">
                        {ret.status === "pending" && (
                          <>
                            <button
                              className="btn-table-action btn-success"
                              title="Setujui dan Sinkronisasi Stok"
                              disabled={loading}
                              onClick={() => handleApproveAndExecute(ret)}
                            >
                              <Icon name="check" size={13} />
                              <span>Setujui</span>
                            </button>
                            <button
                              className="btn-table-action btn-danger"
                              title="Tolak Pengajuan"
                              onClick={() => handleReject(ret.id)}
                            >
                              Tolak
                            </button>
                          </>
                        )}

                        {ret.status === "approved" && (
                          <button
                            className="btn-table-action btn-success"
                            title="Selesaikan dan potong/tambah stok"
                            disabled={loading}
                            onClick={() => handleApproveAndExecute(ret)}
                          >
                            Finalisasi Stok
                          </button>
                        )}

                        <button
                          className="btn-table-action btn-ghost"
                          title="Cetak Berita Acara / Surat Jalan Retur"
                          onClick={() => setPrintDoc(ret)}
                        >
                          <Icon name="printer" size={14} />
                          <span>Surat Jalan</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajukan Retur Baru */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Formulir Pengajuan Retur Barang"
        subtitle="Pencatatan barang cacat pabrik atau komplain retur pelanggan."
        size="large"
      >
        <div className="form-grid-modal">
          <div className="form-row-2">
            <div className="form-field">
              <label>Jenis Transaksi Retur *</label>
              <select
                className="input-select"
                value={formType}
                onChange={(e) => {
                  const t = e.target.value;
                  setFormType(t);
                  if (t === "supplier") {
                    setFormPartyName(suppliers[0]?.name || "PT Schneider Electric Indonesia");
                  } else {
                    setFormPartyName("");
                  }
                }}
              >
                <option value="supplier">Retur ke Supplier (Barang Reject / Cacat Pabrik)</option>
                <option value="customer">Retur dari Pelanggan (Komplain / Salah Kirim)</option>
              </select>
            </div>

            <div className="form-field">
              <label>
                {formType === "supplier" ? "Nama Distributor / Supplier *" : "Nama Pelanggan / Proyek *"}
              </label>
              {formType === "supplier" ? (
                <select
                  className="input-select"
                  value={formPartyName}
                  onChange={(e) => setFormPartyName(e.target.value)}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="input-text"
                  placeholder="Contoh: PT Graha Bangun Mandiri / Bpk. Hendra"
                  value={formPartyName}
                  onChange={(e) => setFormPartyName(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Pilih Produk yang Diretur *</label>
              <select
                className="input-select"
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name} — Stok Gudang: {p.stock} {p.unit || "pcs"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Jumlah (Qty) Retur *</label>
              <input
                type="number"
                min="1"
                className="input-text"
                value={formQty}
                onChange={(e) => setFormQty(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Alasan Utama Retur *</label>
              <select
                className="input-select"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              >
                <option value="Cacat Fisik / Bodi Pecah">Cacat Fisik / Bodi Pecah</option>
                <option value="Gagal Fungsi / Korsleting Listrik">Gagal Fungsi / Korsleting Listrik</option>
                <option value="Salah Kirim Spesifikasi / Tipe">Salah Kirim Spesifikasi / Tipe</option>
                <option value="Kemasan Terbuka / Rusak Parah">Kemasan Terbuka / Rusak Parah</option>
                <option value="Melewati Tanggal Garansi / Kadaluwarsa">Melewati Tanggal Garansi / Kadaluwarsa</option>
              </select>
            </div>

            <div className="form-field">
              <label>Kondisi Fisik Barang</label>
              <select
                className="input-select"
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value)}
              >
                <option value="Rusak Total / Afkir">Rusak Total / Afkir (Karantina / Pemusnahan)</option>
                <option value="Layak Jual Kembali">Layak Jual Kembali (Kemasan utuh / Segel)</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label>Tindakan Solusi yang Diharapkan</label>
              <select
                className="input-select"
                value={formResolution}
                onChange={(e) => setFormResolution(e.target.value)}
              >
                <option value="Ganti Unit Baru">Ganti Unit Baru (Replace)</option>
                <option value="Potong Tagihan Hutang / Kredit">Potong Tagihan Hutang / Nota Kredit</option>
                <option value="Pengembalian Dana (Refund)">Pengembalian Dana Tunai (Refund)</option>
                <option value="Perbaikan Teknis (Service)">Perbaikan Teknis / Garansi Pabrik</option>
              </select>
            </div>

            <div className="form-field">
              <label>Nilai Estimasi Klaim</label>
              <input
                type="text"
                disabled
                className="input-text"
                style={{ background: "#f1f5f9", fontWeight: 600 }}
                value={formatRp(
                  Number(formQty) *
                    Number(selectedProduct?.cost || selectedProduct?.price || 0),
                )}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Keterangan Tambahan / Kronologi Masalah</label>
            <textarea
              className="input-textarea"
              rows={3}
              placeholder="Jelaskan kondisi kerusakan atau nomor faktur pengiriman awal..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer-actions">
            <button
              type="button"
              className="button"
              onClick={() => setIsCreateOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleCreateReturn}
            >
              <Icon name="check" size={15} />
              <span>Kirim Pengajuan Retur</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Cetak Surat Jalan Retur */}
      {printDoc && (
        <Modal
          open={Boolean(printDoc)}
          onClose={() => setPrintDoc(null)}
          title={`Surat Pengantar Retur Barang — ${printDoc.id}`}
          size="large"
        >
          <div className="print-document">
            <div className="print-header">
              <div className="print-brand">
                <h2>PT KEMILAU ABADI MAKMUR</h2>
                <p>Bagian Quality Control & Retur Logistik</p>
                <small>Jl. Raya Industri No. 88, Kawasan Niaga KDM | Telp: (021) 8899-2345</small>
              </div>
              <div className="print-meta">
                <div className="po-stamp">SURAT PENGANTAR RETUR</div>
                <table>
                  <tbody>
                    <tr>
                      <td>No. Tiket</td>
                      <td>:</td>
                      <td><strong>{printDoc.id}</strong></td>
                    </tr>
                    <tr>
                      <td>Tanggal</td>
                      <td>:</td>
                      <td>{formatDate(printDoc.created_at)}</td>
                    </tr>
                    <tr>
                      <td>Tipe</td>
                      <td>:</td>
                      <td>
                        <strong>
                          {printDoc.type === "supplier" ? "RETUR SUPPLIER" : "RETUR KONSUMEN"}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print-addresses">
              <div className="addr-box">
                <span className="addr-title">PIHAK PENERIMA DOKUMEN:</span>
                <strong>{printDoc.party_name}</strong>
                <p>Status: Rekanan Bisnis Terkait</p>
              </div>
              <div className="addr-box">
                <span className="addr-title">PENGIRIM UNIT RETUR:</span>
                <strong>QC & Inventory KDM Pusat</strong>
                <p>Petugas: {printDoc.created_by}</p>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: "35px" }}>No</th>
                  <th>Kode SKU</th>
                  <th>Nama Barang</th>
                  <th style={{ textAlign: "center" }}>Qty Retur</th>
                  <th>Alasan Retur</th>
                  <th>Kondisi Fisik</th>
                  <th style={{ textAlign: "right" }}>Nilai (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "center" }}>1</td>
                  <td><code>{printDoc.sku}</code></td>
                  <td><strong>{printDoc.product_name}</strong></td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{printDoc.qty} unit</td>
                  <td>{printDoc.reason}</td>
                  <td>{printDoc.condition}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatRp(printDoc.total_value)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="print-notes" style={{ marginTop: 16 }}>
              <strong>Keterangan & Rekomendasi Solusi:</strong> {printDoc.resolution} — {printDoc.notes}
            </div>

            <div className="print-signatures">
              <div className="sig-box">
                <span>Pengirim (Gudang KDM),</span>
                <div className="sig-space"></div>
                <strong>{printDoc.created_by}</strong>
              </div>
              <div className="sig-box">
                <span>Quality Control,</span>
                <div className="sig-space"></div>
                <strong>Supervisor QC</strong>
              </div>
              <div className="sig-box">
                <span>Tanda Terima Rekanan,</span>
                <div className="sig-space"></div>
                <strong>{printDoc.party_name}</strong>
              </div>
            </div>

            <div className="modal-footer-actions no-print">
              <button
                type="button"
                className="button button-primary"
                onClick={() => window.print()}
              >
                <Icon name="printer" size={15} />
                <span>Cetak Dokumen</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setPrintDoc(null)}
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
