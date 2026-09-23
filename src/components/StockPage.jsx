import { useState, useEffect } from "react";
import { stockApi, dashboardApi } from "../services/api";
import Modal from "./Modal";

const MOCK_ANALYTICS = {
  total_products: 18,
  total_stock: 962,
  low_stock_count: 7,
  out_of_stock: 0,
  categories: [
    { category: "MCB", count: 4, total_stock: 88 },
    { category: "Kabel", count: 4, total_stock: 55 },
    { category: "Fitting", count: 2, total_stock: 185 },
    { category: "Saklar", count: 3, total_stock: 135 },
    { category: "Panel", count: 2, total_stock: 11 },
    { category: "Lampu", count: 2, total_stock: 147 },
    { category: "Aksesoris", count: 1, total_stock: 200 },
  ],
};

export default function StockPage() {
  const [analytics, setAnalytics] = useState(MOCK_ANALYTICS);
  const [lowStock, setLowStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("manual");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    stockApi
      .analytics()
      .then((res) => setAnalytics(res.data))
      .catch(() => {});
    stockApi
      .lowStock()
      .then((res) => setLowStock(res.data))
      .catch(() =>
        setLowStock([
          {
            id: 3,
            name: "MCB Broco 20A",
            category: "MCB",
            stock: 3,
            min_stock: 15,
            price: 55000,
          },
          {
            id: 13,
            name: "Panel Box 12 Group",
            category: "Panel",
            stock: 4,
            min_stock: 3,
            price: 275000,
          },
        ]),
      );
  }, []);

  const barColors = [
    "#0056b3",
    "#0EA5E9",
    "#059669",
    "#FF7300",
    "#DC2626",
    "#8B5CF6",
    "#e0449c",
  ];
  const maxStock = Math.max(...analytics.categories.map((c) => c.total_stock));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
          }}
        >
          <i
            className="fas fa-warehouse"
            style={{ color: "#0056b3", marginRight: 8 }}
          ></i>
          Manajemen Stok
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#64748B",
            marginTop: 4,
          }}
        >
          <i className="fas fa-home"></i>
          <span>Home / Stok</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: "overview", label: "Ringkasan" },
          { key: "low", label: "Stok Menipis" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: tab === t.key ? "1px solid #0056b3" : "1px solid #E6E8EA",
              background: tab === t.key ? "rgba(0,86,179,0.09)" : "#fff",
              color: tab === t.key ? "#0056b3" : "#475569",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: "Total Produk",
                value: analytics.total_products,
                icon: "fa-box",
                color: "#0056b3",
              },
              {
                label: "Total Stok",
                value: analytics.total_stock.toLocaleString(),
                icon: "fa-warehouse",
                color: "#0EA5E9",
              },
              {
                label: "Stok Menipis",
                value: analytics.low_stock_count,
                icon: "fa-exclamation-triangle",
                color: "#FF7300",
              },
              {
                label: "Habis",
                value: analytics.out_of_stock,
                icon: "fa-times-circle",
                color: "#DC2626",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1px solid #E6E8EA",
                  borderRadius: 12,
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: `${s.color}15`,
                    color: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  <i className={`fas ${s.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                  <div
                    style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart per kategori */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E6E8EA",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              <i
                className="fas fa-chart-bar"
                style={{ color: "#0056b3", marginRight: 8 }}
              ></i>
              Stok per Kategori
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analytics.categories.map((cat, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span
                    style={{
                      width: 80,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#475569",
                      textAlign: "right",
                    }}
                  >
                    {cat.category}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 24,
                      background: "#F8FAFC",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(cat.total_stock / maxStock) * 100}%`,
                        height: "100%",
                        background: barColors[i % barColors.length],
                        borderRadius: 6,
                        transition: "width 0.5s",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 8,
                      }}
                    >
                      {cat.total_stock > 20 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {cat.total_stock}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      width: 50,
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    {cat.total_stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "low" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E6E8EA",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {lowStock.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
              <i
                className="fas fa-check-circle"
                style={{ fontSize: 36, marginBottom: 12, color: "#059669" }}
              ></i>
              <p>Semua stok aman! Tidak ada produk yang menipis.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "Produk",
                    "Kategori",
                    "Stok",
                    "Min Stok",
                    "Rasio",
                    "Aksi",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "#64748B",
                        borderBottom: "1px solid #E6E8EA",
                        padding: "12px 16px",
                        background: "#f6f8fc",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => {
                  const ratio =
                    p.min_stock > 0
                      ? ((p.stock / p.min_stock) * 100).toFixed(0)
                      : 0;
                  const isCritical = p.stock <= p.min_stock * 0.5;
                  return (
                    <tr key={p.id}>
                      <td
                        style={{
                          fontSize: 13,
                          padding: "12px 16px",
                          borderBottom: "1px solid #E6E8EA",
                          fontWeight: 600,
                        }}
                      >
                        {p.name}
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          padding: "12px 16px",
                          borderBottom: "1px solid #E6E8EA",
                          color: "#475569",
                        }}
                      >
                        {p.category}
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          padding: "12px 16px",
                          borderBottom: "1px solid #E6E8EA",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: isCritical ? "#DC2626" : "#FF7300",
                          }}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          padding: "12px 16px",
                          borderBottom: "1px solid #E6E8EA",
                          color: "#94A3B8",
                        }}
                      >
                        {p.min_stock}
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          padding: "12px 16px",
                          borderBottom: "1px solid #E6E8EA",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            background: isCritical
                              ? "rgba(220,38,38,0.1)"
                              : "rgba(255,115,0,0.12)",
                            color: isCritical ? "#DC2626" : "#FF7300",
                          }}
                        >
                          {ratio}%
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          padding: "12px 16px",
                          borderBottom: "1px solid #E6E8EA",
                        }}
                      >
                        <button
                          onClick={() => {
                            setAdjustModal(p);
                            setAdjustQty("");
                            setAdjustReason("manual");
                            setAdjustNotes("");
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "#0056b3",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <i className="fas fa-edit"></i> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Adjust Modal */}
      <Modal
        isOpen={!!adjustModal}
        onClose={() => setAdjustModal(null)}
        size="sm"
      >
        {adjustModal && (
          <>
            <div className="modal-header">
              <h3>
                <i className="fas fa-edit" style={{ color: "#0056b3" }}></i>
                Adjust Stok
              </h3>
              <button
                onClick={() => setAdjustModal(null)}
                className="modal-close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}
                >
                  {adjustModal.name}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  {adjustModal.sku} · {adjustModal.category}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#F1F5F9",
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  Stok saat ini:{" "}
                  <strong style={{ color: "#0F172A" }}>
                    {adjustModal.stock}
                  </strong>{" "}
                  · Min: <strong>{adjustModal.min_stock}</strong>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Stok Baru
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E6E8EA",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    color: "#002a5c",
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Alasan
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E6E8EA",
                    borderRadius: 8,
                    fontSize: 13,
                    outline: "none",
                    color: "#002a5c",
                  }}
                >
                  <option value="manual">Manual</option>
                  <option value="ai_scan">AI Scan</option>
                  <option value="purchase">Pembelian</option>
                  <option value="sale">Penjualan</option>
                  <option value="adjustment">Penyesuaian</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Catatan
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Opsional..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E6E8EA",
                    borderRadius: 8,
                    fontSize: 13,
                    outline: "none",
                    color: "#002a5c",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setAdjustModal(null)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "1px solid #E6E8EA",
                    borderRadius: 8,
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
                  onClick={() => {
                    if (!adjustQty || isNaN(adjustQty)) return;
                    stockApi
                      .update(adjustModal.id, {
                        stock: parseInt(adjustQty),
                        reason: adjustReason,
                        notes: adjustNotes,
                      })
                      .then(() => {
                        setAdjustModal(null);
                        alert("✅ Stok berhasil diupdate!");
                      })
                      .catch(() =>
                        alert("⚠️ Backend offline. Update tidak tersimpan."),
                      );
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    borderRadius: 8,
                    background: "#0056b3",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
