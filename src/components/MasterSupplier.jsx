import { useMemo, useState } from "react";
import { useMaster } from "../context/MasterContext";
import Modal from "./Modal";

/** Format nomor HP Indonesia jadi format WhatsApp internasional */
function formatWaNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (cleaned.startsWith("+62")) cleaned = cleaned.slice(1);
  return cleaned;
}

/** Hasilkan URL WhatsApp resmi dengan pesan pembuka sopan */
function getWaUrl(supplier) {
  const wa = formatWaNumber(supplier?.phone);
  if (!wa) return "#";
  const greeting = encodeURIComponent(
    `Halo ${supplier.contact ? supplier.contact + " - " : ""}${supplier.name}, kami dari Toko Listrik Smart Inventory ingin menanyakan terkait informasi ketersediaan produk dan pengadaan stok. Terima kasih.`,
  );
  return `https://wa.me/${wa}?text=${greeting}`;
}

/** Ekstrak inisial dan warna gradien dari nama supplier */
const SUPPLIER_PALETTES = [
  { bg: "linear-gradient(135deg, #0056b3, #0284c7)", text: "#fff", shadow: "rgba(0, 86, 179, 0.25)" },
  { bg: "linear-gradient(135deg, #059669, #10b981)", text: "#fff", shadow: "rgba(5, 150, 105, 0.25)" },
  { bg: "linear-gradient(135deg, #7c3aed, #a855f7)", text: "#fff", shadow: "rgba(124, 58, 237, 0.25)" },
  { bg: "linear-gradient(135deg, #dc2626, #f97316)", text: "#fff", shadow: "rgba(220, 38, 38, 0.25)" },
  { bg: "linear-gradient(135deg, #d97706, #f59e0b)", text: "#fff", shadow: "rgba(217, 119, 6, 0.25)" },
  { bg: "linear-gradient(135deg, #0f766e, #06b6d4)", text: "#fff", shadow: "rgba(15, 118, 110, 0.25)" },
];

function getSupplierPalette(id, name = "") {
  const code = (String(name) + String(id)).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SUPPLIER_PALETTES[code % SUPPLIER_PALETTES.length];
}

function getSupplierInitials(name = "") {
  const clean = name.replace(/^PT\.?\s+/i, "").replace(/^CV\.?\s+/i, "").replace(/^UD\.?\s+/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "SP";
}

const EMPTY_FORM = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
  lead_time: 3,
  cost_per_order: 50000,
  moq: 10,
  payment_term: 14,
  status: "aktif",
};

export default function MasterSupplier() {
  const {
    suppliers = [],
    products = [],
    payables = [],
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
  } = useMaster();

  // State Toolbar
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // '' | 'aktif' | 'nonaktif'
  const [termFilter, setTermFilter] = useState(""); // '' | 'cash' | 'tempo_le14' | 'tempo_gt14'
  const [debtFilter, setDebtFilter] = useState(""); // '' | 'has_debt' | 'no_debt'
  const [sortBy, setSortBy] = useState("name_asc");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // State Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  // State Modal Hapus
  const [deleteId, setDeleteId] = useState(null);

  // Map Total Belanja per Supplier
  const totalOf = useMemo(() => {
    const map = {};
    (payables || []).forEach((p) => {
      const key = String(p.supplier_id || p.supplier);
      map[key] = (map[key] || 0) + Number(p.total || 0);
    });
    return map;
  }, [payables]);

  // Map Outstanding Hutang per Supplier
  const outstandingOf = useMemo(() => {
    const map = {};
    (payables || []).forEach((p) => {
      const key = String(p.supplier_id || p.supplier);
      map[key] = (map[key] || 0) + (Number(p.total || 0) - Number(p.paid || 0));
    });
    return map;
  }, [payables]);

  // Map Jumlah Produk Terkait per Supplier
  const productCountOf = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => {
      const sClean = (s.name || "").toLowerCase().replace(/^pt\.?\s+/i, "").replace(/^cv\.?\s+/i, "").trim();
      const sWord = sClean.split(/\s+/)[0] || "";
      let count = 0;
      (products || []).forEach((p) => {
        const pSup = (p.supplier || "").toLowerCase();
        if (
          pSup === (s.name || "").toLowerCase() ||
          (sWord && pSup.includes(sWord)) ||
          ((p.name || "").toLowerCase().includes(sWord) && sWord.length >= 4)
        ) {
          count++;
        }
      });
      map[String(s.id)] = count;
    });
    return map;
  }, [suppliers, products]);

  // Hitung Metrik Agregat KPI
  const stats = useMemo(() => {
    const totalCount = suppliers.length;
    const activeCount = suppliers.filter((s) => s.status === "aktif").length;

    let grandTotalSpend = 0;
    let grandTotalOutstanding = 0;
    let suppliersWithDebt = 0;

    suppliers.forEach((s) => {
      const tot = totalOf[String(s.id)] || 0;
      const out = outstandingOf[String(s.id)] || 0;
      grandTotalSpend += tot;
      grandTotalOutstanding += out;
      if (out > 0) suppliersWithDebt += 1;
    });

    const sumLead = suppliers.reduce((acc, s) => acc + (Number(s.lead_time) || 0), 0);
    const avgLead = totalCount ? (sumLead / totalCount).toFixed(1) : "0";

    const sumMoq = suppliers.reduce((acc, s) => acc + (Number(s.moq) || 0), 0);
    const avgMoq = totalCount ? Math.round(sumMoq / totalCount) : 0;

    return {
      totalCount,
      activeCount,
      grandTotalSpend,
      grandTotalOutstanding,
      suppliersWithDebt,
      avgLead,
      avgMoq,
    };
  }, [suppliers, totalOf, outstandingOf]);

  // Filter & Sort Data
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter((s) => {
      // 1. Text Query
      if (q.trim()) {
        const needle = q.toLowerCase();
        const haystack = [s.name, s.contact, s.phone, s.email, s.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      // 2. Status Filter
      if (statusFilter && s.status !== statusFilter) return false;

      // 3. Payment Term Filter
      const term = Number(s.payment_term) || 0;
      if (termFilter === "cash" && term > 0) return false;
      if (termFilter === "tempo_le14" && (term <= 0 || term > 14)) return false;
      if (termFilter === "tempo_gt14" && term <= 14) return false;

      // 4. Debt Filter
      const out = outstandingOf[String(s.id)] || 0;
      if (debtFilter === "has_debt" && out <= 0) return false;
      if (debtFilter === "no_debt" && out > 0) return false;

      return true;
    });

    // Pengurutan (Sorting)
    result.sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "lead_time") return (Number(a.lead_time) || 0) - (Number(b.lead_time) || 0);
      if (sortBy === "cost_order") return (Number(a.cost_per_order) || 0) - (Number(b.cost_per_order) || 0);
      if (sortBy === "moq_asc") return (Number(a.moq) || 0) - (Number(b.moq) || 0);
      if (sortBy === "debt_desc") {
        const outA = outstandingOf[String(a.id)] || 0;
        const outB = outstandingOf[String(b.id)] || 0;
        return outB - outA;
      }
      if (sortBy === "total_desc") {
        const totA = totalOf[String(a.id)] || 0;
        const totB = totalOf[String(b.id)] || 0;
        return totB - totA;
      }
      return 0;
    });

    return result;
  }, [suppliers, q, statusFilter, termFilter, debtFilter, sortBy, outstandingOf, totalOf]);

  // Handler Buka Modal Tambah
  const openAdd = () => {
    setModalMode("add");
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  // Handler Buka Modal Edit
  const openEdit = (s) => {
    setModalMode("edit");
    setEditId(s.id);
    setForm({
      name: s.name || "",
      contact: s.contact || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      lead_time: s.lead_time ?? 3,
      cost_per_order: s.cost_per_order ?? 50000,
      moq: s.moq ?? 10,
      payment_term: s.payment_term ?? 14,
      status: s.status || "aktif",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Validasi & Simpan Form
  const handleSave = (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = "Nama supplier wajib diisi";
    if (form.lead_time < 0) errors.lead_time = "Lead time minimal 0 hari";
    if (form.cost_per_order < 0) errors.cost_per_order = "Biaya pesan tidak boleh negatif";
    if (form.moq < 0) errors.moq = "MOQ tidak boleh negatif";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      contact: form.contact.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      lead_time: Number(form.lead_time) || 0,
      cost_per_order: Number(form.cost_per_order) || 0,
      moq: Number(form.moq) || 0,
      payment_term: Number(form.payment_term) || 0,
      status: form.status || "aktif",
    };

    if (modalMode === "edit" && editId) {
      updateSupplier(editId, payload);
    } else {
      addSupplier(payload);
    }

    setModalOpen(false);
  };

  // Handler Konfirmasi Hapus
  const confirmDelete = () => {
    if (!deleteId) return;
    deleteSupplier(deleteId);
    setDeleteId(null);
  };

  const supplierToDelete = suppliers.find((s) => s.id === deleteId);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 1. Header Halaman */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#64748B",
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            <span>Master Data</span>
            <i className="fas fa-chevron-right" style={{ fontSize: 10, color: "#94A3B8" }}></i>
            <span style={{ color: "#0056b3", fontWeight: 600 }}>Master Supplier</span>
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.03em",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(0, 86, 179, 0.1)",
                color: "#0056b3",
                fontSize: 18,
              }}
            >
              <i className="fas fa-truck-field"></i>
            </span>
            Master Rekanan Supplier
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#64748B", fontSize: 14 }}>
            Kelola parameter vendor: lead time pengiriman, biaya pesan EOQ, batas MOQ, kontak WhatsApp, dan tempo pembayaran.
          </p>
        </div>

        <button
          onClick={openAdd}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #0056b3, #0284c7)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0, 86, 179, 0.25)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <i className="fas fa-plus"></i> Tambah Supplier Baru
        </button>
      </div>

      {/* 2. Top 4 KPI Executive Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Supplier */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B" }}>
                Total Supplier
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", marginTop: 6 }}>
                {stats.totalCount}{" "}
                <span style={{ fontSize: 15, fontWeight: 500, color: "#64748B" }}>Vendor</span>
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(0, 86, 179, 0.1)",
                color: "#0056b3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-truck-field"></i>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10B981" }}></span>
            <strong style={{ color: "#059669" }}>{stats.activeCount} Aktif</strong>
            <span>·</span>
            <span>{stats.totalCount - stats.activeCount} Nonaktif</span>
          </div>
        </div>

        {/* Card 2: Total Belanja PO */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B" }}>
                Total Pengadaan (PO)
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#059669", marginTop: 8 }}>
                Rp {stats.grandTotalSpend.toLocaleString("id-ID")}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(5, 150, 105, 0.1)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>
            Akumulasi transaksi pembelian barang
          </div>
        </div>

        {/* Card 3: Hutang Tertunggak */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B" }}>
                Hutang Tertunggak
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: stats.grandTotalOutstanding > 0 ? "#DC2626" : "#059669",
                  marginTop: 8,
                }}
              >
                {stats.grandTotalOutstanding > 0
                  ? `Rp ${stats.grandTotalOutstanding.toLocaleString("id-ID")}`
                  : "Rp 0 (Lunas)"}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: stats.grandTotalOutstanding > 0 ? "rgba(220, 38, 38, 0.1)" : "rgba(5, 150, 105, 0.1)",
                color: stats.grandTotalOutstanding > 0 ? "#DC2626" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-clock-rotate-left"></i>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>
            {stats.suppliersWithDebt > 0 ? (
              <span style={{ color: "#DC2626", fontWeight: 600 }}>
                {stats.suppliersWithDebt} vendor memiliki tagihan berjalan
              </span>
            ) : (
              <span style={{ color: "#059669", fontWeight: 600 }}>
                Seluruh hutang tempo berstatus lunas
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Rata-rata Lead Time & MOQ */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748B" }}>
                Rata-rata Waktu Kirim
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#4F46E5", marginTop: 6 }}>
                {stats.avgLead}{" "}
                <span style={{ fontSize: 15, fontWeight: 500, color: "#64748B" }}>Hari</span>
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(79, 70, 229, 0.1)",
                color: "#4F46E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-stopwatch"></i>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>
            Rata-rata batas MOQ: <strong style={{ color: "#0F172A" }}>{stats.avgMoq} unit</strong>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Kontrol, Pencarian, Filter, Sort & View Switcher */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "16px 20px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Kolom Kiri: Search Input */}
        <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
          <i
            className="fas fa-search"
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94A3B8",
              fontSize: 14,
            }}
          ></i>
          <input
            type="text"
            placeholder="Cari nama supplier, kontak PIC, HP/WA, email, alamat..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 36px 10px 38px",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              fontSize: 13,
              color: "#0F172A",
              background: "#F8FAFC",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>

        {/* Kolom Kanan: Filter Dropdowns, Sort & View Switcher */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              fontSize: 13,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <option value="">Semua Status</option>
            <option value="aktif">Status: Aktif</option>
            <option value="nonaktif">Status: Nonaktif</option>
          </select>

          {/* Filter Tempo Pembayaran */}
          <select
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              fontSize: 13,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <option value="">Semua Tempo</option>
            <option value="cash">Tunai / Cash (0 Hari)</option>
            <option value="tempo_le14">Tempo ≤ 14 Hari</option>
            <option value="tempo_gt14">Tempo &gt; 14 Hari</option>
          </select>

          {/* Filter Hutang */}
          <select
            value={debtFilter}
            onChange={(e) => setDebtFilter(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              fontSize: 13,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <option value="">Semua Tagihan</option>
            <option value="has_debt">Ada Hutang Berjalan</option>
            <option value="no_debt">Lunas / Bersih</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              fontSize: 13,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <option value="name_asc">Nama (A - Z)</option>
            <option value="name_desc">Nama (Z - A)</option>
            <option value="lead_time">Lead Time Tercepat</option>
            <option value="cost_order">Biaya Pesan Terendah</option>
            <option value="moq_asc">MOQ Terendah</option>
            <option value="debt_desc">Hutang Tertinggi</option>
            <option value="total_desc">Total Belanja Terbanyak</option>
          </select>

          {/* View Mode Switcher */}
          <div
            style={{
              display: "flex",
              background: "#F1F5F9",
              borderRadius: 10,
              padding: 3,
              border: "1px solid #E2E8F0",
            }}
          >
            <button
              onClick={() => setViewMode("grid")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                border: "none",
                borderRadius: 8,
                background: viewMode === "grid" ? "#fff" : "transparent",
                color: viewMode === "grid" ? "#0056b3" : "#64748B",
                fontWeight: viewMode === "grid" ? 700 : 500,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: viewMode === "grid" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <i className="fas fa-grip-vertical"></i> Grid
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                border: "none",
                borderRadius: 8,
                background: viewMode === "table" ? "#fff" : "transparent",
                color: viewMode === "table" ? "#0056b3" : "#64748B",
                fontWeight: viewMode === "table" ? 700 : 500,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: viewMode === "table" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <i className="fas fa-table-list"></i> Tabel
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Hasil Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          fontSize: 13,
          color: "#64748B",
        }}
      >
        <div>
          Menampilkan <strong style={{ color: "#0F172A" }}>{filteredSuppliers.length}</strong> dari{" "}
          <strong>{suppliers.length}</strong> supplier
          {q && (
            <span>
              {" "}
              untuk kata kunci &ldquo;<strong>{q}</strong>&rdquo;
            </span>
          )}
        </div>
        {(q || statusFilter || termFilter || debtFilter || sortBy !== "name_asc") && (
          <button
            onClick={() => {
              setQ("");
              setStatusFilter("");
              setTermFilter("");
              setDebtFilter("");
              setSortBy("name_asc");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#DC2626",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <i className="fas fa-rotate-left"></i> Reset Filter
          </button>
        )}
      </div>

      {/* 4. Konten Utama: Mode Grid vs Mode Tabel */}
      {filteredSuppliers.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            border: "1px dashed #CBD5E1",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#F1F5F9",
              color: "#94A3B8",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 16,
            }}
          >
            <i className="fas fa-truck-ramp-box"></i>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Tidak ada supplier yang cocok
          </h3>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 6, maxWidth: 400, margin: "6px auto 16px" }}>
            Tidak ditemukan vendor dengan kriteria filter atau pencarian saat ini. Silakan ubah kata kunci atau klik reset filter.
          </p>
          <button
            onClick={() => {
              setQ("");
              setStatusFilter("");
              setTermFilter("");
              setDebtFilter("");
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              background: "#fff",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Bersihkan Filter
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* MODE GRID (KARTU VISUAL MODERN) */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: 20,
          }}
        >
          {filteredSuppliers.map((s) => {
            const palette = getSupplierPalette(s.id, s.name);
            const initials = getSupplierInitials(s.name);
            const totalSpend = totalOf[String(s.id)] || 0;
            const outstanding = outstandingOf[String(s.id)] || 0;
            const waUrl = getWaUrl(s);
            const prodCount = productCountOf[String(s.id)] || 0;
            const isAktif = s.status === "aktif";

            return (
              <div
                key={s.id}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.07)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
                }}
              >
                {/* Header Kartu */}
                <div style={{ padding: "20px 20px 14px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Avatar Initials */}
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 14,
                          background: palette.bg,
                          color: palette.text,
                          boxShadow: `0 4px 12px ${palette.shadow}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#0F172A",
                            lineHeight: 1.3,
                          }}
                        >
                          {s.name}
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: "#64748B",
                            marginTop: 4,
                          }}
                        >
                          <i className="fas fa-location-dot" style={{ color: "#94A3B8" }}></i>
                          <span
                            title={s.address}
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 190,
                            }}
                          >
                            {s.address || "Alamat belum diatur"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Toggle Switch */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <button
                        onClick={() => toggleSupplierStatus?.(s.id)}
                        title={`Klik untuk ubah ke ${isAktif ? "Nonaktif" : "Aktif"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 20,
                          border: `1px solid ${isAktif ? "rgba(16, 185, 129, 0.3)" : "rgba(148, 163, 184, 0.3)"}`,
                          background: isAktif ? "rgba(16, 185, 129, 0.08)" : "rgba(148, 163, 184, 0.08)",
                          color: isAktif ? "#059669" : "#64748B",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: isAktif ? "#10B981" : "#94A3B8",
                          }}
                        ></span>
                        {isAktif ? "Aktif" : "Nonaktif"}
                      </button>
                    </div>
                  </div>

                  {/* Kontak & WhatsApp Direct */}
                  <div
                    style={{
                      marginTop: 14,
                      background: "#F8FAFC",
                      borderRadius: 12,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, color: "#1E293B", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-user-tie" style={{ color: "#64748B", fontSize: 11 }}></i>
                        <span>{s.contact || "Kontak Umum"}</span>
                      </div>
                      <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>
                        {s.phone || "Tidak ada telepon"}
                      </div>
                    </div>

                    {s.phone ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#25D366",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                          boxShadow: "0 2px 6px rgba(37, 211, 102, 0.3)",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      >
                        <i className="fab fa-whatsapp" style={{ fontSize: 14 }}></i>
                        <span>Chat WA</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>No WA (-)</span>
                    )}
                  </div>
                </div>

                {/* Body Kartu: 4 Chip Metrik Pengadaan (2x2 Grid) */}
                <div style={{ padding: "16px 20px", flex: 1 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {/* Metrik 1: Lead Time */}
                    <div
                      style={{
                        background: "#F8FAFC",
                        borderRadius: 10,
                        padding: "10px 12px",
                        border: "1px solid #F1F5F9",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-truck-fast" style={{ color: "#0056b3" }}></i>
                        Lead Time
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                        {s.lead_time} Hari
                      </div>
                    </div>

                    {/* Metrik 2: Biaya Pesan */}
                    <div
                      style={{
                        background: "#F8FAFC",
                        borderRadius: 10,
                        padding: "10px 12px",
                        border: "1px solid #F1F5F9",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-money-bill-wave" style={{ color: "#D97706" }}></i>
                        Biaya Pesan (PO)
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                        Rp {Number(s.cost_per_order).toLocaleString("id-ID")}
                      </div>
                    </div>

                    {/* Metrik 3: MOQ */}
                    <div
                      style={{
                        background: "#F8FAFC",
                        borderRadius: 10,
                        padding: "10px 12px",
                        border: "1px solid #F1F5F9",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-boxes-stacked" style={{ color: "#7C3AED" }}></i>
                        Batas Min. (MOQ)
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                        {s.moq ? `${s.moq} Unit` : "Tanpa Batas"}
                      </div>
                    </div>

                    {/* Metrik 4: Tempo Pembayaran */}
                    <div
                      style={{
                        background: "#F8FAFC",
                        borderRadius: 10,
                        padding: "10px 12px",
                        border: "1px solid #F1F5F9",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-calendar-check" style={{ color: "#0D9488" }}></i>
                        Tempo Bayar
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>
                        {s.payment_term ? `${s.payment_term} Hari` : "Tunai / Cash"}
                      </div>
                    </div>
                  </div>

                  {/* Strip Finansial & Jumlah Produk Katalog */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px solid #F1F5F9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>Total Belanja PO:</div>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>
                        {totalSpend > 0 ? `Rp ${totalSpend.toLocaleString("id-ID")}` : "Belum Ada PO"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#64748B" }}>Status Hutang:</div>
                      {outstanding > 0 ? (
                        <span
                          style={{
                            color: "#DC2626",
                            fontWeight: 700,
                            background: "rgba(220, 38, 38, 0.1)",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                        >
                          Rp {outstanding.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#059669",
                            fontWeight: 700,
                            background: "rgba(5, 150, 105, 0.1)",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                        >
                          Lunas ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Kartu: Tag Katalog & Aksi */}
                <div
                  style={{
                    padding: "12px 20px",
                    background: "#F8FAFC",
                    borderTop: "1px solid #F1F5F9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "#E2E8F0",
                        color: "#475569",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <i className="fas fa-box" style={{ marginRight: 4 }}></i>
                      {prodCount} Produk
                    </span>
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        title={s.email}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: "#fff",
                          border: "1px solid #CBD5E1",
                          color: "#64748B",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          textDecoration: "none",
                        }}
                      >
                        <i className="fas fa-envelope"></i>
                      </a>
                    )}
                  </div>

                  {/* Tombol Aksi Edit & Hapus */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => openEdit(s)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        background: "#fff",
                        color: "#0056b3",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <i className="fas fa-pen-to-square"></i> Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(s.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #FCA5A5",
                        background: "#FEF2F2",
                        color: "#DC2626",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "all 0.15s ease",
                      }}
                      title="Hapus Supplier"
                    >
                      <i className="fas fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE TABEL (ENTERPRISE DATA TABLE) */
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E2E8F0",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1040,
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {[
                    "Supplier & Kontak",
                    "Lead Time",
                    "Biaya Pesan",
                    "MOQ",
                    "Tempo Bayar",
                    "Total PO",
                    "Hutang Berjalan",
                    "Status",
                    "WhatsApp",
                    "Aksi",
                  ].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 16px",
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#64748B",
                        textAlign: i >= 1 && i <= 6 ? "right" : "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s, idx) => {
                  const palette = getSupplierPalette(s.id, s.name);
                  const initials = getSupplierInitials(s.name);
                  const totalSpend = totalOf[String(s.id)] || 0;
                  const outstanding = outstandingOf[String(s.id)] || 0;
                  const waUrl = getWaUrl(s);
                  const prodCount = productCountOf[String(s.id)] || 0;
                  const isAktif = s.status === "aktif";

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: idx % 2 === 0 ? "#fff" : "#FAFAFC",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#FAFAFC")}
                    >
                      {/* 1. Supplier & Kontak */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: palette.bg,
                              color: palette.text,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{s.name}</span>
                              {prodCount > 0 && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: "#E2E8F0",
                                    color: "#475569",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                  }}
                                >
                                  {prodCount} item
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, display: "flex", gap: 6 }}>
                              <span>{s.contact || "—"}</span>
                              {s.phone && (
                                <>
                                  <span>·</span>
                                  <span>{s.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Lead Time */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <span style={{ fontWeight: 700, color: "#0056b3" }}>{s.lead_time}</span>{" "}
                        <span style={{ fontSize: 12, color: "#64748B" }}>hari</span>
                      </td>

                      {/* 3. Biaya Pesan */}
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                        Rp {Number(s.cost_per_order).toLocaleString("id-ID")}
                      </td>

                      {/* 4. MOQ */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {s.moq ? (
                          <span style={{ fontWeight: 600, color: "#7C3AED" }}>{s.moq} unit</span>
                        ) : (
                          <span style={{ color: "#94A3B8" }}>—</span>
                        )}
                      </td>

                      {/* 5. Tempo */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {s.payment_term ? (
                          <span style={{ fontWeight: 600, color: "#0D9488" }}>{s.payment_term} hari</span>
                        ) : (
                          <span style={{ color: "#64748B", fontWeight: 500 }}>Tunai</span>
                        )}
                      </td>

                      {/* 6. Total Belanja */}
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, color: "#0F172A" }}>
                        {totalSpend > 0 ? `Rp ${totalSpend.toLocaleString("id-ID")}` : "—"}
                      </td>

                      {/* 7. Hutang */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {outstanding > 0 ? (
                          <span
                            style={{
                              color: "#DC2626",
                              fontWeight: 700,
                              background: "rgba(220, 38, 38, 0.1)",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            Rp {outstanding.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span style={{ color: "#059669", fontWeight: 600, fontSize: 12 }}>Lunas ✓</span>
                        )}
                      </td>

                      {/* 8. Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => toggleSupplierStatus?.(s.id)}
                          title="Klik untuk ubah status"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 10px",
                            borderRadius: 20,
                            border: `1px solid ${isAktif ? "rgba(16, 185, 129, 0.3)" : "rgba(148, 163, 184, 0.3)"}`,
                            background: isAktif ? "rgba(16, 185, 129, 0.08)" : "rgba(148, 163, 184, 0.08)",
                            color: isAktif ? "#059669" : "#64748B",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isAktif ? "#10B981" : "#94A3B8",
                            }}
                          ></span>
                          {isAktif ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>

                      {/* 9. WhatsApp */}
                      <td style={{ padding: "14px 16px" }}>
                        {s.phone ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#25D366",
                              color: "#fff",
                              padding: "5px 10px",
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 600,
                              textDecoration: "none",
                              boxShadow: "0 2px 5px rgba(37, 211, 102, 0.25)",
                            }}
                          >
                            <i className="fab fa-whatsapp"></i> Chat
                          </a>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* 10. Aksi */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => openEdit(s)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: "1px solid #CBD5E1",
                              background: "#fff",
                              color: "#0056b3",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            style={{
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: "1px solid #FCA5A5",
                              background: "#FEF2F2",
                              color: "#DC2626",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                            title="Hapus"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL FORM TAMBAH / EDIT SUPPLIER */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <div style={{ padding: "24px 28px" }}>
          {/* Header Modal */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: modalMode === "edit" ? "rgba(0, 86, 179, 0.1)" : "rgba(16, 185, 129, 0.1)",
                  color: modalMode === "edit" ? "#0056b3" : "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                <i className={modalMode === "edit" ? "fas fa-pen-to-square" : "fas fa-building"}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
                  {modalMode === "edit" ? "Edit Data Rekanan Supplier" : "Tambah Supplier Baru"}
                </h3>
                <p style={{ margin: "3px 0 0 0", fontSize: 13, color: "#64748B" }}>
                  {modalMode === "edit"
                    ? "Perbarui informasi identitas, ketentuan pengadaan, dan tempo pembayaran."
                    : "Lengkapi profil vendor pemasok baru untuk kalkulasi pengadaan dan EOQ."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 18,
                color: "#94A3B8",
                cursor: "pointer",
                padding: 6,
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Seksi 1: Identitas Perusahaan & Kontak */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <i className="fas fa-address-card" style={{ color: "#0056b3" }}></i>
                  1. Identitas Perusahaan & Kontak PIC
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* Nama Supplier */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Nama Perusahaan / Supplier <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: PT Schneider Electric Indonesia"
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: `1px solid ${formErrors.name ? "#DC2626" : "#CBD5E1"}`,
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    {formErrors.name && (
                      <div style={{ color: "#DC2626", fontSize: 11, marginTop: 4 }}>{formErrors.name}</div>
                    )}
                  </div>

                  {/* Kontak Person (PIC) */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Nama Kontak / Sales PIC
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Hartono"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* No HP / WhatsApp */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      No. WhatsApp / HP (Contoh: 081234567890)
                    </label>
                    <input
                      type="text"
                      placeholder="0812-xxxx-xxxx"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Alamat Email
                    </label>
                    <input
                      type="email"
                      placeholder="sales@supplier.co.id"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Alamat Lengkap */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Alamat Gudang / Kantor
                    </label>
                    <input
                      type="text"
                      placeholder="Kota / Alamat operasional"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Ketentuan Pengadaan (Procurement & EOQ) */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <i className="fas fa-sliders" style={{ color: "#7C3AED" }}></i>
                  2. Parameter Pengadaan & Optimasi EOQ
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {/* Lead Time */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Lead Time (Hari) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.lead_time}
                      onChange={(e) => setForm({ ...form, lead_time: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                      Waktu kirim ke toko
                    </span>
                  </div>

                  {/* Biaya Pesan (Ordering Cost) */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Biaya Pesan / PO (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.cost_per_order}
                      onChange={(e) => setForm({ ...form, cost_per_order: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                      Ongkos kirim / admin
                    </span>
                  </div>

                  {/* MOQ */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Batas Min. Order (MOQ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.moq}
                      onChange={(e) => setForm({ ...form, moq: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                      0 jika tanpa batas
                    </span>
                  </div>
                </div>
              </div>

              {/* Seksi 3: Kebijakan Pembayaran & Status */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <i className="fas fa-credit-card" style={{ color: "#0D9488" }}></i>
                  3. Kebijakan Pembayaran & Status Kemitraan
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* Tempo Pembayaran */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Tempo Pembayaran (Hari)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.payment_term}
                      onChange={(e) => setForm({ ...form, payment_term: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                      Isi <strong>0</strong> untuk pembayaran Tunai / Cash saat barang datang
                    </span>
                  </div>

                  {/* Status Supplier */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Status Kemitraan
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        fontSize: 13,
                        background: "#fff",
                        boxSizing: "border-box",
                        cursor: "pointer",
                      }}
                    >
                      <option value="aktif">Aktif (Dapat Dipilih untuk PO)</option>
                      <option value="nonaktif">Nonaktif (Diarsipkan Sementara)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 24,
                paddingTop: 16,
                borderTop: "1px solid #E2E8F0",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #0056b3, #0284c7)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0, 86, 179, 0.25)",
                }}
              >
                {modalMode === "edit" ? "Simpan Perubahan" : "Simpan Supplier"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 6. MODAL KONFIRMASI HAPUS SUPPLIER */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} size="sm">
        <div style={{ padding: "24px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#FEE2E2",
              color: "#DC2626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              marginBottom: 16,
            }}
          >
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Hapus Rekanan Supplier?
          </h3>
          <p style={{ fontSize: 13, color: "#64748B", margin: "10px 0 20px", lineHeight: 1.5 }}>
            Apakah Anda yakin ingin menghapus data supplier{" "}
            <strong style={{ color: "#0F172A" }}>&ldquo;{supplierToDelete?.name}&rdquo;</strong>? Data yang dihapus
            akan hilang dari daftar pemasok aktif.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={() => setDeleteId(null)}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#fff",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: "#DC2626",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
              }}
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
