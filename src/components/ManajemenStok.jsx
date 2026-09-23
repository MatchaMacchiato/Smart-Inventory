import { useMemo, useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { useMaster } from "../context/MasterContext";
import { getCategoryTheme } from "../utils/categoryRules";
import Modal from "./Modal";

function formatWaNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-().+]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (cleaned.startsWith("62")) return cleaned;
  return cleaned;
}

function findSupplier(suppliers, productSupplierName) {
  const raw = String(productSupplierName || "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  // exact / starts-with / includes match (produk sering singkat: "PT Schneider" vs "PT Schneider Electric")
  return (
    suppliers.find((s) => String(s.name || "").toLowerCase() === raw) ||
    suppliers.find((s) =>
      String(s.name || "")
        .toLowerCase()
        .startsWith(raw),
    ) ||
    suppliers.find((s) =>
      raw.startsWith(
        String(s.name || "")
          .toLowerCase()
          .slice(0, 12),
      ),
    ) ||
    suppliers.find(
      (s) =>
        String(s.name || "")
          .toLowerCase()
          .includes(raw) ||
        raw.includes(
          String(s.name || "")
            .toLowerCase()
            .split(" ")[1] || "___",
        ),
    ) ||
    null
  );
}

function buildRestockWa(supplier, product, qty) {
  const wa = formatWaNumber(supplier?.phone);
  if (!wa) return null;
  const text = [
    `Assalamualaikum, Bapak/Ibu ${supplier.contact || supplier.name}.`,
    `Kami dari PT Kemilau Abadi Makmur ingin melakukan restock:`,
    ``,
    `Produk: ${product.name}`,
    `SKU: ${product.sku}`,
    `Kategori: ${product.category}`,
    `Qty pesan: ${qty} ${product.unit || "pcs"}`,
    `Stok saat ini: ${product.stock} ${product.unit || "pcs"}`,
    `Minimum: ${product.min_stock} ${product.unit || "pcs"}`,
    ``,
    `Mohon konfirmasi ketersediaan & estimasi pengiriman. Terima kasih 🙏`,
  ].join("\n");
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

const sel = {
  height: 36,
  border: "1px solid #E6E8EA",
  borderRadius: 10,
  padding: "0 10px",
  fontSize: 12,
  background: "#fff",
  color: "#0F172A",
};

export default function ManajemenStok() {
  const { products, lowStock, stats, applyStockChange } = useInventory();
  const { suppliers, categories: masterCategories } = useMaster();

  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [collapsed, setCollapsed] = useState({}); // category -> bool (true = collapsed)
  const [toast, setToast] = useState(null);
  const [restock, setRestock] = useState(null); // product
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2800);
  };

  const prioOf = useMemo(() => {
    const map = {};
    (masterCategories || []).forEach((c) => {
      map[
        String(c.name || "")
          .trim()
          .toLowerCase()
      ] = c.restock_priority || "Sedang";
    });
    return map;
  }, [masterCategories]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rank = { Tinggi: 0, Sedang: 1, Rendah: 2 };
    return products
      .filter((p) => {
        if (onlyLow && Number(p.stock) > Number(p.min_stock || 0)) return false;
        if (activeCategory !== "all" && p.category !== activeCategory)
          return false;
        if (!query) return true;
        return [p.name, p.sku, p.category, p.supplier]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const aLow = Number(a.stock) <= Number(a.min_stock || 0) ? 0 : 1;
        const bLow = Number(b.stock) <= Number(b.min_stock || 0) ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;
        const ap =
          rank[
            prioOf[
              String(a.category || "")
                .trim()
                .toLowerCase()
            ]
          ] ?? 9;
        const bp =
          rank[
            prioOf[
              String(b.category || "")
                .trim()
                .toLowerCase()
            ]
          ] ?? 9;
        if (ap !== bp) return ap - bp;
        return String(a.name).localeCompare(String(b.name));
      });
  }, [products, onlyLow, activeCategory, q, prioOf]);

  const categories = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const cat = p.category || "Lainnya";
      if (!map[cat])
        map[cat] = { category: cat, count: 0, low: 0, total_stock: 0 };
      map[cat].count += 1;
      map[cat].total_stock += Number(p.stock || 0);
      if (Number(p.stock) <= Number(p.min_stock || 0)) map[cat].low += 1;
    });
    return Object.values(map).sort((a, b) =>
      a.category.localeCompare(b.category),
    );
  }, [products]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      const cat = p.category || "Lainnya";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return Object.entries(map)
      .map(([category, items]) => ({
        category,
        items,
        low: items.filter((p) => Number(p.stock) <= Number(p.min_stock || 0))
          .length,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [filtered]);

  const openRestock = (product) => {
    const gap = Math.max(
      0,
      Number(product.min_stock || 0) - Number(product.stock || 0),
    );
    const suggest = Math.max(
      gap,
      Math.ceil(Number(product.min_stock || 0) * 0.5) || 1,
      1,
    );
    setRestock(product);
    setQty(String(suggest));
    setNotes(`Restock ${product.category}`);
  };

  const doDirectRestock = async () => {
    if (!restock) return;
    const n = Number(qty);
    if (!n || n <= 0) {
      showToast("err", "Qty restock harus > 0");
      return;
    }
    setBusy(true);
    try {
      const supplierMeta = findSupplier(suppliers, restock.supplier);
      await applyStockChange({
        productId: restock.id,
        qty: n,
        mode: "in",
        reason: "purchase",
        notes: notes || `Restock manual · ${restock.name}`,
        supplier: supplierMeta?.name || restock.supplier || "-",
      });
      showToast(
        "ok",
        `Restock ${n} ${restock.unit || "pcs"} · ${restock.name} berhasil`,
      );
      setRestock(null);
    } catch (e) {
      showToast("err", e?.message || "Gagal restock");
    } finally {
      setBusy(false);
    }
  };

  const toggleCollapse = (cat) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const expandAll = () => {
    const next = {};
    grouped.forEach((g) => {
      next[g.category] = false;
    });
    setCollapsed(next);
  };

  const collapseAll = () => {
    const next = {};
    grouped.forEach((g) => {
      next[g.category] = true;
    });
    setCollapsed(next);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Manajemen Stok</div>
          <div className="page-subtitle">
            Posisi stok per kategori · restock langsung atau hubungi supplier
          </div>
        </div>
        <span
          className="badge-pill"
          style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
        >
          {lowStock.length} stok menipis
        </span>
      </div>

      {toast && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background:
              toast.type === "err"
                ? "rgba(220,38,38,0.1)"
                : "rgba(5,150,105,0.1)",
            color: toast.type === "err" ? "#B91C1C" : "#059669",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        <div className="kpi-card kpi-blue">
          <div className="kpi-label">Total Produk</div>
          <div className="kpi-value">{stats.total_products}</div>
          <div className="kpi-sub">item terdaftar</div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-label">Total Unit</div>
          <div className="kpi-value">{stats.total_stock}</div>
          <div className="kpi-sub">stok tersedia</div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-label">Perlu Restock</div>
          <div className="kpi-value">{lowStock.length}</div>
          <div className="kpi-sub">di bawah minimum</div>
        </div>
        <div className="kpi-card kpi-violet">
          <div className="kpi-label">Kategori</div>
          <div className="kpi-value">{categories.length}</div>
          <div className="kpi-sub">grup stok aktif</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div
          className="panel-body"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            placeholder="Cari produk / SKU / supplier..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ ...sel, minWidth: 220, flex: 1 }}
          />
          <button
            type="button"
            className="badge-pill"
            onClick={() => setOnlyLow(!onlyLow)}
            style={{
              border: "1px solid var(--border)",
              background: onlyLow ? "var(--danger-bg)" : "#fff",
              color: onlyLow ? "var(--danger)" : "var(--text-secondary)",
              cursor: "pointer",
              height: 34,
            }}
          >
            <i
              className="fas fa-triangle-exclamation"
              style={{ marginRight: 6 }}
            ></i>
            {onlyLow ? "Semua Stok" : "Stok Menipis"}
          </button>
          <button
            type="button"
            onClick={expandAll}
            style={{ ...sel, cursor: "pointer", fontWeight: 700 }}
          >
            Expand
          </button>
          <button
            type="button"
            onClick={collapseAll}
            style={{ ...sel, cursor: "pointer", fontWeight: 700 }}
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: 999,
            border:
              activeCategory === "all"
                ? "2px solid #0F172A"
                : "1px solid #E2E8F0",
            background: activeCategory === "all" ? "#0F172A" : "#ffffff",
            color: activeCategory === "all" ? "#ffffff" : "#334155",
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow:
              activeCategory === "all"
                ? "0 2px 8px rgba(15,23,42,0.18)"
                : "none",
            transition: "all 0.18s ease",
          }}
        >
          <i className="fas fa-layer-group" style={{ fontSize: 11 }}></i>
          Semua ({products.length})
        </button>
        {categories.map((c) => {
          const active = activeCategory === c.category;
          const theme = getCategoryTheme(c.category);
          return (
            <button
              key={c.category}
              type="button"
              onClick={() => setActiveCategory(c.category)}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                border: active
                  ? `2px solid ${theme.dark}`
                  : `1px solid ${theme.border}`,
                background: active ? theme.gradient : theme.light,
                color: active ? "#ffffff" : theme.dark,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: active ? `0 4px 12px ${theme.color}35` : "none",
                transition: "all 0.18s ease",
              }}
              title={`${c.count} item · ${c.low} menipis`}
            >
              <i
                className={`fas ${theme.icon}`}
                style={{ fontSize: 11, opacity: active ? 1 : 0.9 }}
              ></i>
              <span>{c.category}</span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: active
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.7)",
                  color: active ? "#fff" : theme.dark,
                  fontWeight: 800,
                }}
              >
                {c.count}
              </span>
              {c.low > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: "#DC2626",
                    color: "#fff",
                    fontWeight: 800,
                    animation: "pulse 1.8s infinite",
                  }}
                >
                  ⚠ {c.low}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grouped by category */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {grouped.map((g) => {
          const isCollapsed = !!collapsed[g.category];
          const theme = getCategoryTheme(g.category);
          return (
            <div
              key={g.category}
              className="panel"
              style={{
                marginBottom: 0,
                borderLeft: `5px solid ${theme.color}`,
                boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
              }}
            >
              <button
                type="button"
                onClick={() => toggleCollapse(g.category)}
                className="panel-head"
                style={{
                  width: "100%",
                  border: "none",
                  background: isCollapsed ? "#ffffff" : theme.light,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  textAlign: "left",
                  padding: "12px 18px",
                  transition: "background 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: theme.badgeBg,
                      color: theme.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    <i className={`fas ${theme.icon}`}></i>
                  </div>
                  <div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 800,
                          color: theme.dark,
                        }}
                      >
                        {g.category}
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: theme.badgeBg,
                          color: theme.dark,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {g.items.length} item
                      </span>
                      {g.low > 0 && (
                        <span
                          className="badge-pill"
                          style={{
                            background: "var(--danger-bg)",
                            color: "var(--danger)",
                            border: "1px solid rgba(220,38,38,0.25)",
                            fontWeight: 800,
                          }}
                        >
                          <i
                            className="fas fa-exclamation-triangle"
                            style={{ fontSize: 10 }}
                          ></i>
                          {g.low} Perlu Restock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: theme.dark,
                      fontWeight: 700,
                    }}
                  >
                    {isCollapsed ? "Buka Detail" : "Tutup"}
                  </span>
                  <i
                    className={`fas fa-chevron-${isCollapsed ? "right" : "down"}`}
                    style={{ color: theme.color, width: 14, fontSize: 12 }}
                  ></i>
                </div>
              </button>

              {!isCollapsed && (
                <div
                  className="panel-body"
                  style={{ padding: 0, overflowX: "auto" }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        {[
                          "Produk",
                          "Supplier",
                          "Stok",
                          "Minimum",
                          "Status",
                          "Progress",
                          "Aksi",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 12px",
                              textAlign: "left",
                              fontSize: 10,
                              textTransform: "uppercase",
                              color: "var(--text-muted)",
                              fontWeight: 800,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((p) => {
                        const low = Number(p.stock) <= Number(p.min_stock || 0);
                        const ratio = Math.min(
                          100,
                          Math.round(
                            (Number(p.stock) /
                              Math.max(1, Number(p.min_stock || 1))) *
                              100,
                          ),
                        );
                        const supplierMeta = findSupplier(
                          suppliers,
                          p.supplier,
                        );
                        const gap = Math.max(
                          0,
                          Number(p.min_stock || 0) - Number(p.stock || 0),
                        );
                        const suggest = Math.max(
                          gap,
                          Math.ceil(Number(p.min_stock || 0) * 0.5) || 1,
                          1,
                        );
                        const wa = supplierMeta
                          ? buildRestockWa(supplierMeta, p, suggest)
                          : null;

                        return (
                          <tr
                            key={p.id}
                            style={{
                              borderBottom: "1px solid #F1F5F9",
                              background: low
                                ? "rgba(220,38,38,0.03)"
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: "10px 12px" }}>
                              <b>{p.name}</b>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {p.sku}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ fontWeight: 600 }}>
                                {p.supplier || "-"}
                              </div>
                              {supplierMeta?.phone ? (
                                <div style={{ fontSize: 10, color: "#64748B" }}>
                                  {supplierMeta.phone}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#94A3B8",
                                    fontStyle: "italic",
                                  }}
                                >
                                  No. HP belum di master
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                fontWeight: 800,
                                color: low ? "var(--danger)" : "var(--text)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.stock} {p.unit}
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.min_stock}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span
                                className="badge-pill"
                                style={{
                                  background: low
                                    ? "var(--danger-bg)"
                                    : "var(--success-bg)",
                                  color: low
                                    ? "var(--danger)"
                                    : "var(--success)",
                                }}
                              >
                                {low ? "RESTOCK" : "AMAN"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", minWidth: 120 }}>
                              <div
                                style={{
                                  height: 6,
                                  background: "#E2E8F0",
                                  borderRadius: 9,
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${ratio}%`,
                                    background: low
                                      ? "var(--danger)"
                                      : "var(--success)",
                                    borderRadius: 9,
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "#94A3B8",
                                  marginTop: 4,
                                }}
                              >
                                {ratio}% vs min
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => openRestock(p)}
                                style={{
                                  marginRight: 6,
                                  padding: "5px 10px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: low ? "#DC2626" : "#0056b3",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                                title="Restock langsung / hubungi supplier"
                              >
                                <i
                                  className="fas fa-boxes-stacked"
                                  style={{ marginRight: 5 }}
                                ></i>
                                Restock
                              </button>
                              {wa ? (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "5px 10px",
                                    borderRadius: 8,
                                    background: "#25D366",
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    textDecoration: "none",
                                  }}
                                  title={`Chat ${supplierMeta.name}`}
                                >
                                  <i className="fab fa-whatsapp"></i> Supplier
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openRestock(p)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 8,
                                    border: "1px solid #E6E8EA",
                                    background: "#F8FAFC",
                                    color: "#64748B",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title="Buka modal restock (supplier WA belum tersedia)"
                                >
                                  <i className="fas fa-truck"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {!grouped.length && (
          <div className="panel">
            <div
              className="panel-body"
              style={{ textAlign: "center", color: "#64748B", padding: 28 }}
            >
              Tidak ada produk di filter ini
            </div>
          </div>
        )}
      </div>

      {/* Restock modal */}
      {restock &&
        (() => {
          const supplierMeta = findSupplier(suppliers, restock.supplier);
          const n = Number(qty) || 0;
          const wa = supplierMeta
            ? buildRestockWa(supplierMeta, restock, n || 1)
            : null;
          const low = Number(restock.stock) <= Number(restock.min_stock || 0);
          const gap = Math.max(
            0,
            Number(restock.min_stock || 0) - Number(restock.stock || 0),
          );
          const after = Number(restock.stock || 0) + (n > 0 ? n : 0);
          const theme = getCategoryTheme(restock.category);

          return (
            <Modal
              isOpen={!!restock}
              onClose={() => !busy && setRestock(null)}
              size="md"
            >
              <div className="modal-header">
                <h3>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: theme.badgeBg,
                      color: theme.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    <i className="fas fa-boxes-stacked"></i>
                  </div>
                  Restock Produk
                </h3>
                <button
                  type="button"
                  onClick={() => setRestock(null)}
                  disabled={busy}
                  className="modal-close-btn"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}
                  >
                    {restock.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{restock.sku}</span>
                    <span>·</span>
                    <span
                      style={{
                        padding: "1px 8px",
                        borderRadius: 999,
                        background: theme.badgeBg,
                        color: theme.dark,
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      {restock.category}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="badge-pill"
                      style={{
                        background: low
                          ? "var(--danger-bg)"
                          : "var(--success-bg)",
                        color: low ? "var(--danger)" : "var(--success)",
                        fontWeight: 700,
                      }}
                    >
                      Stok saat ini: {restock.stock} {restock.unit}
                    </span>
                    <span className="badge-pill" style={{ fontWeight: 600 }}>
                      Min {restock.min_stock} {restock.unit}
                    </span>
                    <span
                      className="badge-pill"
                      style={{
                        background: "#F1F5F9",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      Supplier: {restock.supplier || "-"}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Qty restock ({restock.unit || "pcs"})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Masukkan jumlah..."
                    style={{
                      ...sel,
                      width: "100%",
                      height: 42,
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#0F172A",
                      borderColor: "#CBD5E1",
                    }}
                  />
                  {/* Quick preset increments */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {gap > 0 && (
                      <button
                        type="button"
                        onClick={() => setQty(String(gap))}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: "1px solid #DC2626",
                          background: "rgba(220,38,38,0.08)",
                          color: "#DC2626",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Gap Min (+{gap})
                      </button>
                    )}
                    {[5, 10, 25, 50].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setQty(String((Number(qty) || 0) + inc))}
                        style={{
                          padding: "4px 9px",
                          borderRadius: 8,
                          border: "1px solid #E2E8F0",
                          background: "#F8FAFC",
                          color: "#475569",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        +{inc}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQty("1")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                        color: "#64748B",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Reset (1)
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Catatan (opsional)
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Restock gudang / PO supplier..."
                    style={{
                      ...sel,
                      width: "100%",
                      height: 38,
                      borderColor: "#CBD5E1",
                    }}
                  />
                </div>

                {n > 0 && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(5,150,105,0.08)",
                      border: "1px solid rgba(5,150,105,0.2)",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                    }}
                  >
                    Stok setelah restock:{" "}
                    <b style={{ color: "#047857", fontSize: 14 }}>
                      {after} {restock.unit || "pcs"}
                    </b>
                    {supplierMeta && (
                      <div
                        style={{
                          marginTop: 4,
                          color: "#475569",
                          fontSize: 11.5,
                        }}
                      >
                        Supplier: <b>{supplierMeta.name}</b>
                        {supplierMeta.phone ? ` · ${supplierMeta.phone}` : ""}
                        {supplierMeta.lead_time
                          ? ` · lead time ${supplierMeta.lead_time} hari`
                          : ""}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: wa ? "1fr 1fr" : "1fr",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={doDirectRestock}
                    disabled={busy}
                    style={{
                      height: 42,
                      border: "none",
                      borderRadius: 10,
                      background: busy ? "#94A3B8" : "var(--success)",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: busy ? "not-allowed" : "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fas fa-plus-circle"></i>
                    {busy ? "Menyimpan..." : "Restock Langsung"}
                  </button>

                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        height: 42,
                        borderRadius: 10,
                        background: "#25D366",
                        color: "#fff",
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontSize: 13,
                      }}
                    >
                      <i className="fab fa-whatsapp"></i>
                      Hubungi Supplier
                    </a>
                  )}
                </div>

                {!wa && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: "#64748B",
                      display: "flex",
                      gap: 6,
                      alignItems: "flex-start",
                    }}
                  >
                    <i
                      className="fas fa-info-circle"
                      style={{ marginTop: 2, color: "#0EA5E9" }}
                    ></i>
                    <span>
                      Nomor WA supplier belum terhubung di Master Supplier.
                      {restock.supplier
                        ? ` Lengkapi nomor telepon pada "${restock.supplier}".`
                        : " Isi supplier di data produk terlebih dahulu."}
                    </span>
                  </div>
                )}
              </div>
            </Modal>
          );
        })()}
    </div>
  );
}
