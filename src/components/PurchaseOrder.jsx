import { useState, useMemo } from "react";
import { useMaster } from "../context/MasterContext";
import { useInventory } from "../context/InventoryContext";
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

export default function PurchaseOrder() {
  const { user } = useAuth();
  const {
    purchaseOrders,
    addPurchaseOrder,
    updatePOStatus,
    deletePO,
    applyPOToStock,
    suppliers,
  } = useMaster();
  const { products } = useInventory();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [printPO, setPrintPO] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Form State untuk PO Baru
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState([
    { product_id: "", qty: 10, unit_price: 0 },
  ]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === String(formSupplierId)),
    [suppliers, formSupplierId],
  );

  const resetForm = () => {
    setFormSupplierId(suppliers[0]?.id || "");
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    setFormDeliveryDate(in3Days);
    setFormNotes("");
    if (products.length > 0) {
      const p = products[0];
      setFormItems([
        {
          product_id: String(p.id),
          qty: 10,
          unit_price: p.cost || Math.round((p.price * 0.78) / 500) * 500,
        },
      ]);
    } else {
      setFormItems([]);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleAddItem = () => {
    const firstP = products[0];
    if (!firstP) return;
    setFormItems((prev) => [
      ...prev,
      {
        product_id: String(firstP.id),
        qty: 10,
        unit_price: firstP.cost || Math.round((firstP.price * 0.78) / 500) * 500,
      },
    ]);
  };

  const handleRemoveItem = (idx) => {
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    setFormItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      if (field === "product_id") {
        target.product_id = String(val);
        const prod = products.find((p) => String(p.id) === String(val));
        if (prod) {
          target.unit_price = prod.cost || Math.round((prod.price * 0.78) / 500) * 500;
        }
      } else if (field === "qty") {
        target.qty = Math.max(1, Number(val) || 1);
      } else if (field === "unit_price") {
        target.unit_price = Math.max(0, Number(val) || 0);
      }
      copy[idx] = target;
      return copy;
    });
  };

  const formTotal = useMemo(() => {
    return formItems.reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.unit_price || 0),
      0,
    );
  }, [formItems]);

  const handleSavePO = (status = "draft") => {
    if (!formSupplierId) {
      alert("Silakan pilih supplier");
      return;
    }
    if (!formItems.length) {
      alert("Tambahkan minimal 1 item produk");
      return;
    }

    const sup = suppliers.find((s) => String(s.id) === String(formSupplierId));
    const items = formItems.map((it) => {
      const prod = products.find((p) => String(p.id) === String(it.product_id));
      return {
        product_id: it.product_id,
        name: prod?.name || "Produk",
        sku: prod?.sku || "-",
        unit: prod?.unit || "pcs",
        qty: Number(it.qty),
        unit_price: Number(it.unit_price),
        subtotal: Number(it.qty) * Number(it.unit_price),
      };
    });

    const newPO = addPurchaseOrder({
      supplier_id: sup?.id || null,
      supplier: sup?.name || "Supplier",
      delivery_date: formDeliveryDate,
      notes: formNotes || "-",
      status,
      items,
      total: formTotal,
      created_by: user?.name || "Admin",
    });

    setIsCreateOpen(false);
    showToast(
      status === "ordered"
        ? `PO ${newPO.no} berhasil diterbitkan dan dipesan ke ${sup?.name}`
        : `Draft PO ${newPO.no} berhasil disimpan`,
    );
  };

  const handleReceivePO = async (po) => {
    if (!confirm(`Terima barang untuk pesanan ${po.no}?\n\nStok produk akan otomatis bertambah, tercatat di Barang Masuk, dan tagihan hutang akan dicatat ke Keuangan.`)) {
      return;
    }
    try {
      setLoadingAction(true);
      await applyPOToStock(po.id);
      showToast(`PO ${po.no} berhasil diterima! Stok otomatis bertambah & tagihan dicatat.`);
    } catch (err) {
      alert("Gagal menerima PO: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Filter & Search
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (activeTab === "draft" && po.status !== "draft") return false;
      if (activeTab === "ordered" && po.status !== "ordered") return false;
      if (activeTab === "received" && po.status !== "received") return false;
      if (activeTab === "canceled" && po.status !== "canceled") return false;

      if (!search) return true;
      const q = search.toLowerCase();
      const matchNo = String(po.no || "").toLowerCase().includes(q);
      const matchSup = String(po.supplier || "").toLowerCase().includes(q);
      return matchNo || matchSup;
    });
  }, [purchaseOrders, activeTab, search]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalCount = purchaseOrders.length;
    const orderedCount = purchaseOrders.filter((o) => o.status === "ordered").length;
    const receivedCount = purchaseOrders.filter((o) => o.status === "received").length;
    const activeValue = purchaseOrders
      .filter((o) => o.status === "ordered" || o.status === "draft")
      .reduce((sum, o) => {
        const t = o.total ?? (o.items || []).reduce((s, it) => s + (it.qty * (it.unit_price || 0)), 0);
        return sum + Number(t || 0);
      }, 0);

    return { totalCount, orderedCount, receivedCount, activeValue };
  }, [purchaseOrders]);

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
          <div className="eyebrow">PENGADAAN & SUPLAI</div>
          <h1 className="page-title">Purchase Order (PO) Supplier</h1>
          <p className="page-subtitle">
            Penerbitan surat pesanan resmi ke distributor, monitoring status pengiriman, dan penerimaan otomatis ke stok gudang.
          </p>
        </div>
        <div className="header-actions">
          <button className="button button-primary" onClick={openCreateModal}>
            <Icon name="plus" size={16} />
            <span>Buat PO Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-top">
            <span>Total Transaksi PO</span>
            <Icon name="po" size={18} />
          </div>
          <span className="metric-value">{metrics.totalCount}</span>
          <div className="metric-bottom">
            <span>Semua histori pemesanan</span>
          </div>
        </div>

        <div className="metric metric-attention">
          <div className="metric-top">
            <span>Menunggu Pengiriman</span>
            <Icon name="truck" size={18} />
          </div>
          <span className="metric-value">{metrics.orderedCount}</span>
          <div className="metric-bottom">
            <span>Status dipesan ke distributor</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>Nilai Pengadaan Aktif</span>
            <Icon name="wallet" size={18} />
          </div>
          <span className="metric-value" style={{ fontSize: "20px" }}>
            {formatRp(metrics.activeValue)}
          </span>
          <div className="metric-bottom">
            <span>Draft & pesanan berjalan</span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-top">
            <span>PO Selesai / Diterima</span>
            <Icon name="check" size={18} />
          </div>
          <span className="metric-value">{metrics.receivedCount}</span>
          <div className="metric-bottom">
            <span>Stok telah masuk sistem</span>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="workspace-toolbar">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Semua ({purchaseOrders.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "ordered" ? "active" : ""}`}
            onClick={() => setActiveTab("ordered")}
          >
            Dipesan ({purchaseOrders.filter((o) => o.status === "ordered").length})
          </button>
          <button
            className={`tab-btn ${activeTab === "draft" ? "active" : ""}`}
            onClick={() => setActiveTab("draft")}
          >
            Draft ({purchaseOrders.filter((o) => o.status === "draft").length})
          </button>
          <button
            className={`tab-btn ${activeTab === "received" ? "active" : ""}`}
            onClick={() => setActiveTab("received")}
          >
            Selesai ({purchaseOrders.filter((o) => o.status === "received").length})
          </button>
          <button
            className={`tab-btn ${activeTab === "canceled" ? "active" : ""}`}
            onClick={() => setActiveTab("canceled")}
          >
            Dibatalkan
          </button>
        </div>

        <div className="toolbar-search">
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Cari nomor PO atau supplier..."
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
                <th>No. PO</th>
                <th>Tanggal Terbit</th>
                <th>Supplier</th>
                <th style={{ textAlign: "center" }}>Jumlah Item</th>
                <th style={{ textAlign: "right" }}>Total Nilai (Rp)</th>
                <th>Target Tiba</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aksi Operasional</th>
              </tr>
            </thead>
            <tbody>
              {!filteredPOs.length ? (
                <tr>
                  <td colSpan={8} className="empty-table-cell">
                    <div className="empty-state">
                      <Icon name="po" size={32} />
                      <p>Tidak ada purchase order yang sesuai kriteria.</p>
                      <button className="button button-primary" onClick={openCreateModal}>
                        Buat Purchase Order Baru
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const itemCount = po.items?.length || 0;
                  const total =
                    po.total ??
                    (po.items || []).reduce(
                      (s, it) => s + (it.qty * (it.unit_price || 0)),
                      0,
                    );

                  return (
                    <tr key={po.id}>
                      <td className="font-semibold text-navy">
                        <span className="code-pill">{po.no || `PO-${po.id}`}</span>
                      </td>
                      <td>{formatDate(po.created_at)}</td>
                      <td>
                        <strong>{po.supplier || "Supplier"}</strong>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge-count">{itemCount} item</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatRp(total)}
                      </td>
                      <td>{po.delivery_date ? formatDate(po.delivery_date) : "-"}</td>
                      <td>
                        {po.status === "draft" && (
                          <span className="status-pill status-draft">Draft</span>
                        )}
                        {po.status === "ordered" && (
                          <span className="status-pill status-ordered">Dipesan</span>
                        )}
                        {po.status === "received" && (
                          <span className="status-pill status-received">Diterima</span>
                        )}
                        {po.status === "canceled" && (
                          <span className="status-pill status-canceled">Batal</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions">
                          {po.status === "draft" && (
                            <>
                              <button
                                className="btn-table-action btn-primary"
                                title="Kirim Pesanan ke Supplier"
                                onClick={() => {
                                  updatePOStatus(po.id, "ordered");
                                  showToast(`PO ${po.no} diubah status menjadi Dipesan`);
                                }}
                              >
                                Kirim PO
                              </button>
                              <button
                                className="btn-table-action btn-danger"
                                title="Hapus PO"
                                onClick={() => {
                                  if (confirm(`Hapus draft PO ${po.no}?`)) {
                                    deletePO(po.id);
                                    showToast("Draft PO berhasil dihapus");
                                  }
                                }}
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            </>
                          )}

                          {po.status === "ordered" && (
                            <>
                              <button
                                className="btn-table-action btn-success"
                                title="Barang Tiba: Masukkan ke Stok & Catat Barang Masuk"
                                disabled={loadingAction}
                                onClick={() => handleReceivePO(po)}
                              >
                                <Icon name="down" size={14} />
                                <span>Terima Barang</span>
                              </button>
                              <button
                                className="btn-table-action btn-ghost"
                                title="Batalkan PO"
                                onClick={() => {
                                  if (confirm(`Batalkan PO ${po.no}?`)) {
                                    updatePOStatus(po.id, "canceled");
                                    showToast("PO berhasil dibatalkan");
                                  }
                                }}
                              >
                                Batal
                              </button>
                            </>
                          )}

                          <button
                            className="btn-table-action btn-ghost"
                            title="Cetak Surat Pesanan PO"
                            onClick={() => setPrintPO(po)}
                          >
                            <Icon name="printer" size={14} />
                            <span>Surat PO</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat PO Baru */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Buat Surat Purchase Order (PO) Baru"
        subtitle="Formulir resmi pemesanan barang ke distributor mitra."
        size="large"
      >
        <div className="form-grid-modal">
          <div className="form-row-2">
            <div className="form-field">
              <label>Pilih Supplier Mitra *</label>
              <select
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                className="input-select"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || `ID-${s.id}`}) — Term: {s.payment_term || 0} hari
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Target Tanggal Pengiriman / Tiba *</label>
              <input
                type="date"
                className="input-text"
                value={formDeliveryDate}
                onChange={(e) => setFormDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Catatan / Instruksi Pengiriman</label>
            <input
              type="text"
              className="input-text"
              placeholder="Contoh: Pengiriman ke Gudang Utama KDM, harap sertakan Surat Jalan resmi."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <div className="section-divider">
            <strong>Daftar Item Barang yang Dipesan</strong>
            <button
              type="button"
              className="button button-sm"
              onClick={handleAddItem}
            >
              <Icon name="plus" size={14} />
              <span>Tambah Baris Produk</span>
            </button>
          </div>

          <div className="po-item-editor">
            <table className="enterprise-table mini-table">
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Pilih Produk Katalog</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Qty Pesan</th>
                  <th style={{ width: "25%", textAlign: "right" }}>Harga Satuan (Rp)</th>
                  <th style={{ width: "15%", textAlign: "right" }}>Subtotal</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {formItems.map((item, idx) => {
                  const sub = Number(item.qty || 0) * Number(item.unit_price || 0);
                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          className="input-select table-select"
                          value={item.product_id}
                          onChange={(e) =>
                            handleItemChange(idx, "product_id", e.target.value)
                          }
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name} (Stok: {p.stock} {p.unit || "pcs"})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="input-text table-input"
                          style={{ textAlign: "center" }}
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(idx, "qty", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          className="input-text table-input"
                          style={{ textAlign: "right" }}
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(idx, "unit_price", e.target.value)
                          }
                        />
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatRp(sub)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon-danger"
                            onClick={() => handleRemoveItem(idx)}
                            title="Hapus baris"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="po-summary-bar">
            <div className="summary-left">
              <span>Supplier Terpilih: </span>
              <strong>{selectedSupplier?.name || "-"}</strong>
              <span style={{ marginLeft: 12 }}>
                Kontak: {selectedSupplier?.phone || "-"}
              </span>
            </div>
            <div className="summary-right">
              <span>Total Nilai Pengadaan: </span>
              <strong className="summary-total-val">{formatRp(formTotal)}</strong>
            </div>
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
              className="button"
              onClick={() => handleSavePO("draft")}
            >
              Simpan Sebagai Draft
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => handleSavePO("ordered")}
            >
              <Icon name="truck" size={15} />
              <span>Terbitkan & Pesan Sekarang</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Cetak Surat PO */}
      {printPO && (
        <Modal
          open={Boolean(printPO)}
          onClose={() => setPrintPO(null)}
          title={`Dokumen Surat Pesanan — ${printPO.no}`}
          size="large"
        >
          <div className="print-document">
            <div className="print-header">
              <div className="print-brand">
                <h2>PT KEMILAU ABADI MAKMUR</h2>
                <p>Distributor & Retail Perlengkapan Elektrikal dan Mekanikal</p>
                <small>Jl. Raya Industri No. 88, Kawasan Niaga KDM | Telp: (021) 8899-2345</small>
              </div>
              <div className="print-meta">
                <div className="po-stamp">PURCHASE ORDER</div>
                <table>
                  <tbody>
                    <tr>
                      <td>Nomor PO</td>
                      <td>:</td>
                      <td><strong>{printPO.no}</strong></td>
                    </tr>
                    <tr>
                      <td>Tanggal</td>
                      <td>:</td>
                      <td>{formatDate(printPO.created_at)}</td>
                    </tr>
                    <tr>
                      <td>Status</td>
                      <td>:</td>
                      <td>
                        <span style={{ textTransform: "uppercase", fontWeight: 700 }}>
                          {printPO.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="print-addresses">
              <div className="addr-box">
                <span className="addr-title">DITUJUKAN KEPADA:</span>
                <strong>{printPO.supplier || "Supplier Mitra"}</strong>
                <p>Status: Rekanan Resmi KDM</p>
              </div>
              <div className="addr-box">
                <span className="addr-title">LOKASI PENERIMAAN BARANG:</span>
                <strong>Gudang Operasional KDM Pusat</strong>
                <p>Penerima: Tim Inventory & Gudang</p>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: "35px" }}>No</th>
                  <th>Kode SKU</th>
                  <th>Deskripsi Produk</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "center" }}>Satuan</th>
                  <th style={{ textAlign: "right" }}>Harga Satuan</th>
                  <th style={{ textAlign: "right" }}>Subtotal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {(printPO.items || []).map((it, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td><code>{it.sku || "-"}</code></td>
                    <td><strong>{it.name}</strong></td>
                    <td style={{ textAlign: "center" }}>{it.qty}</td>
                    <td style={{ textAlign: "center" }}>{it.unit || "pcs"}</td>
                    <td style={{ textAlign: "right" }}>{formatRp(it.unit_price)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {formatRp(Number(it.qty) * Number(it.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ textAlign: "right", fontWeight: 700 }}>
                    TOTAL PEMBELIAN:
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>
                    {formatRp(
                      printPO.total ??
                        (printPO.items || []).reduce(
                          (s, it) => s + (it.qty * (it.unit_price || 0)),
                          0,
                        ),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>

            {printPO.notes && (
              <div className="print-notes">
                <strong>Catatan PO:</strong> {printPO.notes}
              </div>
            )}

            <div className="print-signatures">
              <div className="sig-box">
                <span>Dibuat Oleh,</span>
                <div className="sig-space"></div>
                <strong>{printPO.created_by || "Bagian Pengadaan"}</strong>
              </div>
              <div className="sig-box">
                <span>Disetujui,</span>
                <div className="sig-space"></div>
                <strong>Manajer Operasional</strong>
              </div>
              <div className="sig-box">
                <span>Konfirmasi Supplier,</span>
                <div className="sig-space"></div>
                <strong>{printPO.supplier}</strong>
              </div>
            </div>

            <div className="modal-footer-actions no-print">
              <button
                type="button"
                className="button button-primary"
                onClick={() => window.print()}
              >
                <Icon name="printer" size={15} />
                <span>Cetak Dokumen Sekarang</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setPrintPO(null)}
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
