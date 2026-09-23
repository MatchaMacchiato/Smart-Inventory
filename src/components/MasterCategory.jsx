import { useMemo, useState } from "react";
import { useMaster } from "../context/MasterContext";
import {
  PRIORITY_OPTIONS,
  PRIORITY_RANK,
  suggestedSellPrice,
} from "../utils/categoryRules";
import Modal from "./Modal";

const EMPTY = {
  name: "",
  code: "",
  description: "",
  margin_pct: 25,
  min_stock: 10,
  lead_time: 3,
  restock_priority: "Sedang",
  default_supplier: "",
  default_unit: "pcs",
  active: true,
};

const CATEGORY_THEMES = {
  MCB: {
    icon: "fa-bolt",
    color: "#0056b3",
    bg: "rgba(0, 86, 179, 0.08)",
    border: "rgba(0, 86, 179, 0.2)",
  },
  Kabel: {
    icon: "fa-plug",
    color: "#0284c7",
    bg: "rgba(2, 132, 199, 0.08)",
    border: "rgba(2, 132, 199, 0.2)",
  },
  Fitting: {
    icon: "fa-lightbulb",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.08)",
    border: "rgba(217, 119, 6, 0.2)",
  },
  Saklar: {
    icon: "fa-toggle-on",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
    border: "rgba(124, 58, 237, 0.2)",
  },
  "Stop Kontak": {
    icon: "fa-plug-circle-bolt",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
    border: "rgba(5, 150, 105, 0.2)",
  },
  Steker: {
    icon: "fa-power-off",
    color: "#ea580c",
    bg: "rgba(234, 88, 12, 0.08)",
    border: "rgba(234, 88, 12, 0.2)",
  },
  Panel: {
    icon: "fa-cubes",
    color: "#4f46e5",
    bg: "rgba(79, 70, 229, 0.08)",
    border: "rgba(79, 70, 229, 0.2)",
  },
  Lampu: {
    icon: "fa-sun",
    color: "#ca8a04",
    bg: "rgba(202, 138, 4, 0.08)",
    border: "rgba(202, 138, 4, 0.2)",
  },
  Aksesoris: {
    icon: "fa-toolbox",
    color: "#475569",
    bg: "rgba(71, 85, 105, 0.08)",
    border: "rgba(71, 85, 105, 0.2)",
  },
};

const PRIORITY_BADGES = {
  Tinggi: {
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.09)",
    border: "rgba(220, 38, 38, 0.25)",
    icon: "fa-triangle-exclamation",
  },
  Sedang: {
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.09)",
    border: "rgba(217, 119, 6, 0.25)",
    icon: "fa-circle-info",
  },
  Rendah: {
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.09)",
    border: "rgba(100, 116, 139, 0.25)",
    icon: "fa-circle-check",
  },
};

export default function MasterCategory() {
  const {
    categories,
    products,
    suppliers = [],
    addCategory,
    updateCategory,
    deleteCategory,
  } = useMaster();

  const [q, setQ] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  const [formModal, setFormModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [simCost, setSimCost] = useState(100000);

  // Map product count per category
  const productCount = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      const key = String(p.category || "").trim();
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  // Overall KPI Statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.active !== false).length;
    const totalMappedProducts = Object.values(productCount).reduce(
      (a, b) => a + b,
      0,
    );
    const avgMargin =
      total > 0
        ? Math.round(
            (categories.reduce(
              (acc, c) => acc + Number(c.margin_pct || 0),
              0,
            ) /
              total) *
              10,
          ) / 10
        : 0;
    const highPriority = categories.filter(
      (c) => c.restock_priority === "Tinggi",
    ).length;

    return {
      total,
      active,
      inactive: total - active,
      totalMappedProducts,
      avgMargin,
      highPriority,
    };
  }, [categories, productCount]);

  // Filtered & Sorted Categories
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let rows = categories.filter((c) => {
      if (
        s &&
        ![c.name, c.code, c.description, c.default_supplier, c.restock_priority]
          .join(" ")
          .toLowerCase()
          .includes(s)
      ) {
        return false;
      }
      if (priorityFilter && c.restock_priority !== priorityFilter) {
        return false;
      }
      if (statusFilter === "active" && c.active === false) {
        return false;
      }
      if (statusFilter === "inactive" && c.active !== false) {
        return false;
      }
      return true;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === "priority") {
        const pa = PRIORITY_RANK[a.restock_priority] ?? 9;
        const pb = PRIORITY_RANK[b.restock_priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return String(a.name).localeCompare(String(b.name), "id");
      }
      if (sortBy === "name_asc") {
        return String(a.name).localeCompare(String(b.name), "id");
      }
      if (sortBy === "name_desc") {
        return String(b.name).localeCompare(String(a.name), "id");
      }
      if (sortBy === "margin_desc") {
        return Number(b.margin_pct || 0) - Number(a.margin_pct || 0);
      }
      if (sortBy === "products_desc") {
        const ca = productCount[a.name] || 0;
        const cb = productCount[b.name] || 0;
        return cb - ca;
      }
      return 0;
    });
  }, [categories, q, priorityFilter, statusFilter, sortBy, productCount]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY);
    setSimCost(100000);
    setFormModal(true);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      name: c.name || "",
      code: c.code || "",
      description: c.description || "",
      margin_pct: c.margin_pct ?? 25,
      min_stock: c.min_stock ?? 10,
      lead_time: c.lead_time ?? 3,
      restock_priority: c.restock_priority || "Sedang",
      default_supplier: c.default_supplier || "",
      default_unit: c.default_unit || "pcs",
      active: c.active !== false,
    });
    setSimCost(100000);
    setFormModal(true);
  };

  const closeModal = () => {
    setFormModal(false);
    setEditId(null);
    setForm(EMPTY);
  };

  const save = () => {
    if (!form.name.trim()) return alert("Nama kategori wajib diisi!");
    const code =
      form.code.trim() ||
      `CAT-${form.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")}`;
    const payload = {
      ...form,
      name: form.name.trim(),
      code,
      margin_pct: Number(form.margin_pct) || 0,
      min_stock: Number(form.min_stock) || 0,
      lead_time: Number(form.lead_time) || 0,
      active: !!form.active,
    };
    if (editId) updateCategory(editId, payload);
    else addCategory(payload);
    closeModal();
  };

  const toggleActive = (c) => updateCategory(c.id, { active: !c.active });

  const del = (c) => {
    const count = productCount[c.name] || 0;
    const warning =
      count > 0
        ? `\nPerhatian: Ada ${count} produk yang memakai kategori ini.`
        : "";
    if (confirm(`Hapus kategori "${c.name}"?${warning}`)) {
      deleteCategory?.(c.id);
    }
  };

  // Simulated selling price calculation for form modal
  const simulatedMarginNominal = Math.round(
    (Number(simCost || 0) * (Number(form.margin_pct) || 0)) / 100,
  );
  const simulatedSellPrice = suggestedSellPrice(simCost, form.margin_pct);

  const hasActiveFilters = Boolean(
    q || priorityFilter || statusFilter || sortBy !== "priority",
  );

  return (
    <div>
      {/* 1. Modern Page Header */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(0, 86, 179, 0.1)",
                color: "#0056b3",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              <i className="fas fa-tags"></i>
            </span>
            <div className="page-title" style={{ margin: 0, fontSize: 22 }}>
              Master Kategori Produk
            </div>
          </div>
          <div className="page-subtitle" style={{ fontSize: 13, color: "#64748B" }}>
            Konfigurasi aturan bisnis per kategori: target margin penjualan, kuota stok minimum, lead time pengadaan, dan prioritas restock otomatis.
          </div>
        </div>

        <button
          onClick={openAdd}
          style={{
            background: "linear-gradient(135deg, #0056b3 0%, #004085 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 8px rgba(0, 86, 179, 0.25)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-1px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          <i className="fas fa-plus"></i> Tambah Kategori
        </button>
      </div>

      {/* 2. Top KPI Metric Cards Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Total Kategori */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(0, 86, 179, 0.08)",
              color: "#0056b3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            <i className="fas fa-layer-group"></i>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>
              TOTAL KATEGORI
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.2,
              }}
            >
              {stats.total}{" "}
              <span
                style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}
              >
                ({stats.active} Aktif)
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Produk Terpetakan */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(2, 132, 199, 0.08)",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            <i className="fas fa-boxes-stacked"></i>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>
              PRODUK TERPETAKAN
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.2,
              }}
            >
              {stats.totalMappedProducts}{" "}
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                Barang Katalog
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Rata-Rata Margin */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(5, 150, 105, 0.08)",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            <i className="fas fa-percent"></i>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>
              RATA-RATA MARGIN
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.2,
              }}
            >
              {stats.avgMargin}%{" "}
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                Target Laba
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Prioritas Tinggi */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(220, 38, 38, 0.08)",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            <i className="fas fa-bell"></i>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>
              PRIORITAS TINGGI
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#dc2626",
                lineHeight: 1.2,
              }}
            >
              {stats.highPriority}{" "}
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                Kategori Kritis
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modern Filter & Controls Toolbar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", gridColumn: "1 / -1", minWidth: 260 }}>
            <i
              className="fas fa-magnifying-glass"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94A3B8",
                fontSize: 13,
                pointerEvents: "none",
              }}
            ></i>
            <input
              type="text"
              placeholder="Cari kategori (nama, kode SKU, deskripsi, supplier)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 40px 10px 38px",
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                fontSize: 13.5,
                outline: "none",
                background: "#fff",
                color: "#0F172A",
              }}
            />
            {q && (
              <i
                className="fas fa-times-circle"
                onClick={() => setQ("")}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94A3B8",
                  cursor: "pointer",
                }}
              ></i>
            )}
          </div>

          {/* Priority Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Prioritas Restock
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                background: "#fff",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              <option value="">Semua Prioritas</option>
              <option value="Tinggi">🔴 Prioritas Tinggi</option>
              <option value="Sedang">🟠 Prioritas Sedang</option>
              <option value="Rendah">⚪ Prioritas Rendah</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Status Aturan
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                background: "#fff",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              <option value="">Semua Status</option>
              <option value="active">🟢 Aktif Saja</option>
              <option value="inactive">⚪ Nonaktif</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Urutkan Berdasarkan
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                background: "#fff",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              <option value="priority">Prioritas (Tertinggi)</option>
              <option value="name_asc">Nama Kategori (A - Z)</option>
              <option value="name_desc">Nama Kategori (Z - A)</option>
              <option value="margin_desc">Margin Tertinggi (%)</option>
              <option value="products_desc">Produk Terbanyak</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Tampilan
            </label>
            <div
              style={{
                display: "flex",
                background: "#F1F5F9",
                borderRadius: 8,
                padding: 2,
                border: "1px solid #CBD5E1",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: viewMode === "grid" ? "#fff" : "transparent",
                  color: viewMode === "grid" ? "#0056b3" : "#64748B",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow:
                    viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <i className="fas fa-table-cells-large"></i> Kartu
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 6,
                  background: viewMode === "table" ? "#fff" : "transparent",
                  color: viewMode === "table" ? "#0056b3" : "#64748B",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow:
                    viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <i className="fas fa-table-list"></i> Tabel
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid #F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 12,
              color: "#64748B",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>Menampilkan <b>{filtered.length}</b> dari {categories.length} kategori</span>
              {q && (
                <span
                  style={{
                    background: "#F1F5F9",
                    color: "#334155",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  Kata Kunci: "{q}"
                </span>
              )}
              {priorityFilter && (
                <span
                  style={{
                    background: "rgba(217, 119, 6, 0.1)",
                    color: "#B45309",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  Prioritas: {priorityFilter}
                </span>
              )}
              {statusFilter && (
                <span
                  style={{
                    background: "rgba(5, 150, 105, 0.1)",
                    color: "#047857",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  Status: {statusFilter === "active" ? "Aktif" : "Nonaktif"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setPriorityFilter("");
                setStatusFilter("");
                setSortBy("priority");
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#0056b3",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <i className="fas fa-rotate-left"></i> Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Category View (Grid or Table) */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px dashed #CBD5E1",
            borderRadius: 14,
            padding: "48px 24px",
            textAlign: "center",
            color: "#64748B",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#F1F5F9",
              color: "#94A3B8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              margin: "0 auto 14px",
            }}
          >
            <i className="fas fa-folder-open"></i>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1E293B", marginBottom: 6 }}>
            Tidak ada kategori yang cocok
          </div>
          <p style={{ fontSize: 13, maxWidth: 420, margin: "0 auto 16px" }}>
            Coba sesuaikan kata kunci pencarian atau bersihkan filter yang aktif.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setPriorityFilter("");
              setStatusFilter("");
            }}
            style={{
              background: "#0056b3",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Tampilkan Semua Kategori
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((c) => {
            const theme = CATEGORY_THEMES[c.name] || {
              icon: "fa-tag",
              color: "#0056b3",
              bg: "rgba(0, 86, 179, 0.08)",
              border: "rgba(0, 86, 179, 0.2)",
            };
            const prioBadge = PRIORITY_BADGES[c.restock_priority] || PRIORITY_BADGES["Sedang"];
            const count = productCount[c.name] || 0;
            const sampleSell = suggestedSellPrice(100000, c.margin_pct);
            const isActive = c.active !== false;

            return (
              <div
                key={c.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  padding: 20,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  opacity: isActive ? 1 : 0.65,
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Header Card: Icon + Category Name & Priority */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: theme.bg,
                        color: theme.color,
                        border: `1px solid ${theme.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      <i className={`fas ${theme.icon}`}></i>
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 16,
                          color: "#0F172A",
                          lineHeight: 1.2,
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            background: "#F1F5F9",
                            padding: "1px 6px",
                            borderRadius: 4,
                            color: "#334155",
                          }}
                        >
                          {c.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <span
                    style={{
                      background: prioBadge.bg,
                      color: prioBadge.color,
                      border: `1px solid ${prioBadge.border}`,
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <i className={`fas ${prioBadge.icon}`} style={{ fontSize: 9 }}></i>
                    {c.restock_priority}
                  </span>
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#475569",
                    marginBottom: 16,
                    lineHeight: 1.45,
                    minHeight: 36,
                  }}
                >
                  {c.description || "Tidak ada deskripsi khusus."}
                </div>

                {/* Metrics 2x2 Grid */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 14px",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700 }}>
                      JUMLAH PRODUK
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", marginTop: 2 }}>
                      {count} {c.default_unit || "pcs"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700 }}>
                      TARGET MARGIN
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#059669", marginTop: 2 }}>
                      {c.margin_pct}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700 }}>
                      MIN. STOK REKOMENDASI
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", marginTop: 2 }}>
                      {c.min_stock} {c.default_unit || "pcs"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700 }}>
                      LEAD TIME ORDER
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", marginTop: 2 }}>
                      {c.lead_time} Hari
                    </div>
                  </div>
                </div>

                {/* Default Supplier */}
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#64748B",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="fas fa-truck" style={{ color: "#0056b3", fontSize: 11 }}></i>
                  <span>
                    Supplier:{" "}
                    <b style={{ color: "#1E293B" }}>
                      {c.default_supplier || "Belum Ditentukan"}
                    </b>
                  </span>
                </div>

                {/* Margin Preview Pill */}
                <div
                  style={{
                    background: "rgba(0, 86, 179, 0.04)",
                    border: "1px dashed rgba(0, 86, 179, 0.2)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11,
                    color: "#0056b3",
                    marginBottom: 16,
                  }}
                >
                  <i className="fas fa-calculator" style={{ marginRight: 5 }}></i>
                  Contoh HPP Rp 100k &rarr; Jual <b>Rp {sampleSell.toLocaleString("id-ID")}</b> (+{c.margin_pct}%)
                </div>

                {/* Footer Action Buttons */}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                    borderTop: "1px solid #F1F5F9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    style={{
                      border: "none",
                      background: isActive ? "rgba(5, 150, 105, 0.1)" : "#F1F5F9",
                      color: isActive ? "#047857" : "#64748B",
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Klik untuk mengubah status aktif kategori"
                  >
                    <i className={`fas ${isActive ? "fa-toggle-on" : "fa-toggle-off"}`}></i>
                    {isActive ? "Aktif" : "Nonaktif"}
                  </button>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #CBD5E1",
                        background: "#fff",
                        color: "#1E293B",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <i className="fas fa-edit" style={{ color: "#0056b3" }}></i> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del(c)}
                      style={{
                        padding: "6px 9px",
                        borderRadius: 6,
                        border: "1px solid #FCA5A5",
                        background: "#fff",
                        color: "#DC2626",
                        fontSize: 11.5,
                        cursor: "pointer",
                      }}
                      title="Hapus Kategori"
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
        /* TABLE VIEW */
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {[
                    "Kategori",
                    "Kode SKU",
                    "Produk",
                    "Margin (%)",
                    "Min. Stok",
                    "Lead Time",
                    "Prioritas",
                    "Supplier Bawaan",
                    "Status",
                    "Aksi",
                  ].map((th) => (
                    <th
                      key={th}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#475569",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const theme = CATEGORY_THEMES[c.name] || {
                    icon: "fa-tag",
                    color: "#0056b3",
                  };
                  const prioBadge = PRIORITY_BADGES[c.restock_priority] || PRIORITY_BADGES["Sedang"];
                  const count = productCount[c.name] || 0;
                  const isActive = c.active !== false;

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        opacity: isActive ? 1 : 0.6,
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#F8FAFC")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: theme.bg || "rgba(0,86,179,0.08)",
                              color: theme.color,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                            }}
                          >
                            <i className={`fas ${theme.icon}`}></i>
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0F172A" }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>
                              {c.description || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            background: "#F1F5F9",
                            padding: "2px 6px",
                            borderRadius: 4,
                            color: "#334155",
                            fontSize: 11,
                          }}
                        >
                          {c.code}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, fontSize: 13 }}>
                        {count} <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{c.default_unit}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 13,
                            color: "#059669",
                          }}
                        >
                          {c.margin_pct}%
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12.5 }}>
                        {c.min_stock} {c.default_unit}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12.5 }}>
                        {c.lead_time} Hari
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            background: prioBadge.bg,
                            color: prioBadge.color,
                            border: `1px solid ${prioBadge.border}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <i className={`fas ${prioBadge.icon}`} style={{ fontSize: 9 }}></i>
                          {c.restock_priority}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#334155" }}>
                        {c.default_supplier || "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => toggleActive(c)}
                          style={{
                            border: "none",
                            background: isActive ? "rgba(5, 150, 105, 0.1)" : "#F1F5F9",
                            color: isActive ? "#047857" : "#64748B",
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            style={{
                              border: "1px solid #CBD5E1",
                              background: "#fff",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              cursor: "pointer",
                              color: "#0056b3",
                              fontWeight: 700,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => del(c)}
                            style={{
                              border: "1px solid #FCA5A5",
                              background: "#fff",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              cursor: "pointer",
                              color: "#DC2626",
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

      {/* 5. Modern Add / Edit Category Modal */}
      <Modal isOpen={formModal} onClose={closeModal} size="lg">
        <div style={{ padding: "20px 24px" }}>
          {/* Modal Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(0, 86, 179, 0.1)",
                  color: "#0056b3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                <i className="fas fa-sliders"></i>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#0F172A" }}>
                  {editId ? "Edit Aturan Kategori" : "Tambah Kategori Baru"}
                </div>
                <div style={{ fontSize: 11.5, color: "#64748B" }}>
                  Parameter ini akan menjadi acuan margin dan pengadaan produk.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              style={{
                border: "none",
                background: "transparent",
                color: "#94A3B8",
                fontSize: 18,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Modal Form Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Bagian 1: Identitas Kategori */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0056b3",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 10,
                }}
              >
                1. Identitas Kategori
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Nama Kategori <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: MCB, Kabel, Fitting..."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Kode Aturan SKU (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Otomatis: CAT-XXX"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Satuan Default
                  </label>
                  <input
                    type="text"
                    placeholder="pcs, roll, meter, pack..."
                    value={form.default_unit}
                    onChange={(e) =>
                      setForm({ ...form, default_unit: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: 4,
                  }}
                >
                  Deskripsi / Catatan Penggunaan
                </label>
                <input
                  type="text"
                  placeholder="Keterangan singkat fungsi barang dalam kategori ini..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            {/* Bagian 2: Parameter Bisnis & Restock */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0056b3",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 10,
                }}
              >
                2. Parameter Bisnis & Restock
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Margin Target (%) <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={form.margin_pct}
                    onChange={(e) =>
                      setForm({ ...form, margin_pct: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Stok Minimum Default
                  </label>
                  <input
                    type="number"
                    value={form.min_stock}
                    onChange={(e) =>
                      setForm({ ...form, min_stock: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Lead Time Order (Hari)
                  </label>
                  <input
                    type="number"
                    value={form.lead_time}
                    onChange={(e) =>
                      setForm({ ...form, lead_time: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Prioritas Restock
                  </label>
                  <select
                    value={form.restock_priority}
                    onChange={(e) =>
                      setForm({ ...form, restock_priority: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Supplier Default
                  </label>
                  <select
                    value={form.default_supplier}
                    onChange={(e) =>
                      setForm({ ...form, default_supplier: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    <option value="">— Belum Ditentukan —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bagian 3: Simulasi Interaktif Kalkulator Margin */}
            <div
              style={{
                background: "rgba(0, 86, 179, 0.04)",
                border: "1px solid rgba(0, 86, 179, 0.2)",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: "#0056b3",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="fas fa-calculator"></i> Simulasi Hitung Margin & Harga Jual Otomatis
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Contoh Modal (HPP): Rp</span>
                  <input
                    type="number"
                    value={simCost}
                    onChange={(e) => setSimCost(Number(e.target.value) || 0)}
                    style={{
                      width: 110,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #CBD5E1",
                      fontSize: 12.5,
                    }}
                  />
                </div>
                <div style={{ color: "#64748B" }}>&rarr;</div>
                <div>
                  Margin ({Number(form.margin_pct) || 0}%):{" "}
                  <b style={{ color: "#059669" }}>
                    Rp {simulatedMarginNominal.toLocaleString("id-ID")}
                  </b>
                </div>
                <div style={{ color: "#64748B" }}>&rarr;</div>
                <div>
                  Usulan Jual:{" "}
                  <b style={{ color: "#0056b3", fontSize: 13.5 }}>
                    Rp {simulatedSellPrice.toLocaleString("id-ID")}
                  </b>
                </div>
              </div>
            </div>

            {/* Bagian 4: Status Aktif */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingTop: 4,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1E293B",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  style={{ width: 16, height: 16, accentColor: "#0056b3" }}
                />
                Aktifkan Aturan Kategori ini
              </label>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>
                (Kategori nonaktif tidak akan muncul di opsi kategori produk baru)
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#fff",
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              style={{
                padding: "8px 22px",
                borderRadius: 8,
                border: "none",
                background: "#0056b3",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 86, 179, 0.2)",
              }}
            >
              {editId ? "Simpan Perubahan" : "Tambahkan Kategori"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
