import { useMemo, useState, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { REASON_LABEL, formatDateTimeFull } from "../data/products";
import { getCategoryTheme } from "../utils/categoryRules";
import Modal from "./Modal";

export default function Dashboard({ onNavigate }) {
  const { stats, daily, history, source, products, lowStock } = useInventory();
  const [recent, setRecent] = useState([]);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    setRecent(history.slice(0, 6));
  }, [history]);

  /* ————— KPI popup data — sesuai angka KPI ————— */
  const popupRows = useMemo(() => {
    if (!popup) return [];
    const f = popup.filter;

    // "low" → tampilkan daftar produk stok menipis (bukan history)
    if (f === "low") return lowStock;

    // "stock" → tampilkan semua produk + stok
    if (f === "stock") return products;

    // history-based filters
    let rows = [...history];
    if (f === "masuk") rows = rows.filter((h) => h.change > 0);
    else if (f === "keluar") rows = rows.filter((h) => h.change < 0);
    else if (f === "today_in")
      rows = rows.filter(
        (h) =>
          h.change > 0 &&
          new Date(h.created_at).toDateString() === new Date().toDateString(),
      );
    else if (f === "today_out")
      rows = rows.filter(
        (h) =>
          h.change < 0 &&
          new Date(h.created_at).toDateString() === new Date().toDateString(),
      );
    return rows;
  }, [popup, history, products, lowStock]);

  /* ————— Group by category for popup ————— */
  const popupByCategory = useMemo(() => {
    if (!popup) return [];
    const map = {};
    popupRows.forEach((r) => {
      const cat = r.category || "Lainnya";
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [popupRows, popup]);

  /* ————— KPI popup count — harus match angka KPI ————— */
  const popupCount = useMemo(() => {
    if (!popup) return 0;
    const f = popup.filter;
    if (f === "low") return lowStock.length;
    if (f === "stock") return Number(stats.total_stock || 0);
    if (f === "masuk") return Number(stats.stock_in || 0);
    if (f === "keluar") return Number(stats.stock_out || 0);
    if (f === "today_in") return Number(stats.stock_in_today || 0);
    if (f === "today_out") return Number(stats.stock_out_today || 0);
    return popupRows.length;
  }, [popup, stats, lowStock, popupRows]);

  const isProductPopup = popup?.filter === "low" || popup?.filter === "stock";

  const kpis = [
    {
      label: "Total Produk",
      value: stats.total_products,
      sub: "→ Data Produk",
      icon: "fa-cube",
      cls: "kpi-blue",
      go: "produk",
    },
    {
      label: "Total Stok",
      value: Number(stats.total_stock || 0).toLocaleString("id-ID"),
      sub: "klik → detail",
      icon: "fa-boxes",
      cls: "kpi-violet",
      pop: { title: "Semua Produk & Stok", filter: "stock" },
    },
    {
      label: "Stok Menipis",
      value: stats.low_stock_count,
      sub: "klik → detail",
      icon: "fa-exclamation-triangle",
      cls: "kpi-red",
      pop: { title: "Produk Stok Menipis", filter: "low" },
    },
    {
      label: "Masuk Hari Ini",
      value: Number(stats.stock_in_today || 0).toLocaleString("id-ID"),
      sub: "klik → detail",
      icon: "fa-arrow-down",
      cls: "kpi-green",
      pop: { title: "Barang Masuk Hari Ini", filter: "today_in" },
    },
    {
      label: "Keluar Hari Ini",
      value: Number(stats.stock_out_today || 0).toLocaleString("id-ID"),
      sub: "klik → detail",
      icon: "fa-arrow-up",
      cls: "kpi-orange",
      pop: { title: "Barang Keluar Hari Ini", filter: "today_out" },
    },
    {
      label: "Total Barang Masuk",
      value: Number(stats.stock_in || 0).toLocaleString("id-ID"),
      sub: "klik → detail",
      icon: "fa-download",
      cls: "kpi-purple",
      pop: { title: "Semua Barang Masuk", filter: "masuk" },
    },
    {
      label: "Total Barang Keluar",
      value: Number(stats.stock_out || 0).toLocaleString("id-ID"),
      sub: "klik → detail",
      icon: "fa-upload",
      cls: "kpi-sky",
      pop: { title: "Semua Barang Keluar", filter: "keluar" },
    },
    {
      label: "Kategori",
      value: stats.categories_count,
      sub: "→ Data Produk",
      icon: "fa-tags",
      cls: "kpi-indigo",
      go: "produk",
    },
  ];

  const maxDaily = Math.max(
    1,
    ...daily.map((d) =>
      Math.max(Number(d.stock_in || 0), Number(d.stock_out || 0)),
    ),
  );
  const totalIn = Number(stats.stock_in || 0);
  const totalOut = Number(stats.stock_out || 0);
  const totalMove = Math.max(1, totalIn + totalOut);
  const outPct = Math.round((totalOut / totalMove) * 100);
  const donutStyle = useMemo(
    () => ({
      background: `conic-gradient(#0056b3 0% ${100 - outPct}%, #EA580C ${100 - outPct}% 100%)`,
    }),
    [outPct],
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            <i
              className="fas fa-circle"
              style={{
                color: source === "api+local" ? "#059669" : "#FF7300",
                fontSize: 8,
                marginRight: 6,
              }}
            ></i>
            {source === "api+local" ? "Live MySQL" : "Data Lokal"} — data
            real-time · klik KPI untuk detail
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="badge-pill"
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("laporan")}
          >
            <i className="fas fa-chart-line"></i> Laporan
          </button>
          <button
            type="button"
            className="badge-pill"
            style={{
              border: "none",
              background: "var(--success)",
              color: "#fff",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("barang-masuk")}
          >
            <i className="fas fa-plus"></i> Barang Masuk
          </button>
        </div>
      </div>

      <div className="section-label">
        <h2>Ikhtisar Performa Sistem</h2>
      </div>
      <div className="kpi-grid">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            className={`kpi-card ${k.cls}`}
            onClick={() => {
              if (k.go) onNavigate(k.go);
              if (k.pop) setPopup(k.pop);
            }}
            style={{
              cursor: "pointer",
              textAlign: "left",
              border: "none",
              width: "100%",
              font: "inherit",
            }}
          >
            <div className="kpi-icon">
              <i className={`fas ${k.icon}`}></i>
            </div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </button>
        ))}
      </div>

      <div className="section-label">
        <h2>Akses Cepat</h2>
      </div>
      <div className="quick-grid">
        <button
          className="quick-card"
          type="button"
          onClick={() => onNavigate("produk")}
        >
          <div
            className="quick-icon"
            style={{ background: "rgba(0,86,179,0.09)", color: "#0056b3" }}
          >
            <i className="fas fa-plus"></i>
          </div>
          <div>
            <h4>+ Tambah Produk</h4>
            <p>Input barang baru ke katalog</p>
          </div>
        </button>
        <button
          className="quick-card"
          type="button"
          onClick={() => onNavigate("barang-masuk")}
        >
          <div
            className="quick-icon"
            style={{ background: "rgba(5,150,105,0.1)", color: "#059669" }}
          >
            <i className="fas fa-arrow-down"></i>
          </div>
          <div>
            <h4>+ Barang Masuk</h4>
            <p>Manual / scan barcode restock</p>
          </div>
        </button>
        <button
          className="quick-card"
          type="button"
          onClick={() => onNavigate("barang-keluar")}
        >
          <div
            className="quick-icon"
            style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C" }}
          >
            <i className="fas fa-arrow-up"></i>
          </div>
          <div>
            <h4>Barang Keluar</h4>
            <p>Manual / scan barcode keluar</p>
          </div>
        </button>
        <button
          className="quick-card"
          type="button"
          onClick={() => onNavigate("ai-asisten")}
        >
          <div
            className="quick-icon"
            style={{ background: "rgba(124,58,237,0.1)", color: "#7C3AED" }}
          >
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h4>Asisten AI</h4>
            <p>Rekomendasi stok &amp; analitik</p>
          </div>
        </button>
      </div>

      <div className="section-label">
        <h2>Visualisasi Data Aktual</h2>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Alur Transaksi {daily.length} Hari</h3>
            <button
              type="button"
              className="badge-pill"
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => onNavigate("laporan")}
            >
              STATISTIK →
            </button>
          </div>
          <div className="panel-body">
            <div className="bar-chart">
              {daily.map((d, i) => (
                <div className="bar-col" key={d.date || i}>
                  <div className="bar-pair">
                    <div
                      className="bar in"
                      style={{
                        height: `${(Number(d.stock_in || 0) / maxDaily) * 100}%`,
                      }}
                      title={`Masuk: ${d.stock_in}`}
                    />
                    <div
                      className="bar out"
                      style={{
                        height: `${(Number(d.stock_out || 0) / maxDaily) * 100}%`,
                      }}
                      title={`Keluar: ${d.stock_out}`}
                    />
                  </div>
                  <div className="bar-label">
                    {d.date
                      ? new Date(d.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="legend-row">
              <span>
                <span
                  className="legend-dot"
                  style={{ background: "#0056b3" }}
                ></span>
                Masuk ({totalIn})
              </span>
              <span>
                <span
                  className="legend-dot"
                  style={{ background: "#EA580C" }}
                ></span>
                Keluar ({totalOut})
              </span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Proporsi Masuk/Keluar</h3>
            <button
              type="button"
              className="badge-pill"
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => onNavigate("laporan")}
            >
              DETAIL →
            </button>
          </div>
          <div className="panel-body">
            <div className="donut-wrap">
              <div className="donut" style={donutStyle}>
                <div className="donut-hole">
                  <strong>{outPct}%</strong>
                  <span>Keluar</span>
                </div>
              </div>
              <div className="donut-legend">
                <div className="donut-legend-item">
                  <div className="left">
                    <span
                      className="legend-dot"
                      style={{ background: "#0056b3" }}
                    ></span>
                    Masuk
                  </div>
                  <strong>{totalIn}</strong>
                </div>
                <div className="donut-legend-item">
                  <div className="left">
                    <span
                      className="legend-dot"
                      style={{ background: "#EA580C" }}
                    ></span>
                    Keluar
                  </div>
                  <strong>{totalOut}</strong>
                </div>
                <div className="donut-legend-item">
                  <div className="left">
                    <span
                      className="legend-dot"
                      style={{ background: "#059669" }}
                    ></span>
                    Net
                  </div>
                  <strong
                    style={{
                      color: totalIn - totalOut >= 0 ? "#059669" : "#DC2626",
                    }}
                  >
                    {totalIn - totalOut >= 0 ? "+" : ""}
                    {totalIn - totalOut}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Aktivitas Stok Terbaru</h3>
          <button
            type="button"
            onClick={() => onNavigate("laporan")}
            style={{
              border: "none",
              background: "none",
              color: "#0056b3",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Lihat Semua →
          </button>
        </div>
        <div className="panel-body" style={{ paddingTop: 4, paddingBottom: 8 }}>
          <div className="activity-list">
            {recent.map((h, i) => {
              const isIn = h.change > 0;
              const dt = formatDateTimeFull(h.created_at);
              return (
                <div className="activity-row" key={h.id || i}>
                  <div className={`activity-icon ${isIn ? "in" : "out"}`}>
                    <i
                      className={`fas ${isIn ? "fa-arrow-down" : "fa-arrow-up"}`}
                    ></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "#002a5c",
                      }}
                    >
                      {h.product_name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748B" }}>
                      {REASON_LABEL[h.reason] || h.reason} · {dt.hari},{" "}
                      {dt.tanggal} · {dt.jam}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: isIn ? "#059669" : "#DC2626",
                      fontSize: 14,
                    }}
                  >
                    {isIn ? "+" : ""}
                    {h.change}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ———— POPUP DETAIL KPI (per kategori) ———— */}
      <Modal isOpen={!!popup} onClose={() => setPopup(null)} size="lg">
        {popup && (
          <>
            <div className="modal-header">
              <div>
                <h3>
                  <i
                    className="fas fa-history"
                    style={{ color: "#0056b3" }}
                  ></i>
                  {popup.title}
                </h3>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                  Total:{" "}
                  <strong style={{ color: "#0F172A" }}>
                    {popupCount.toLocaleString("id-ID")}
                  </strong>
                  {!isProductPopup && (
                    <span> unit · {popupRows.length} transaksi</span>
                  )}
                  {isProductPopup && (
                    <span>
                      {" "}
                      {popup.filter === "low" ? "produk menipis" : "unit stok"}
                    </span>
                  )}
                  {" · "}
                  {popupByCategory.length} kategori
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="modal-close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body" style={{ padding: "16px 20px" }}>
              {popupRows.length === 0 ? (
                <div
                  style={{
                    color: "#64748B",
                    fontSize: 13,
                    padding: 32,
                    textAlign: "center",
                  }}
                >
                  <i
                    className="fas fa-inbox"
                    style={{
                      fontSize: 28,
                      marginBottom: 8,
                      display: "block",
                      color: "#94A3B8",
                    }}
                  ></i>
                  Tidak ada data untuk filter ini.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {popupByCategory.map(([cat, rows]) => {
                    const theme = getCategoryTheme(cat);
                    return (
                      <div
                        key={cat}
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: theme.light,
                            borderBottom: `1px solid ${theme.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: theme.badgeBg,
                                color: theme.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                              }}
                            >
                              <i className={`fas ${theme.icon}`}></i>
                            </div>
                            <strong
                              style={{ fontSize: 12.5, color: theme.dark }}
                            >
                              {cat}
                            </strong>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "1px 8px",
                              borderRadius: 999,
                              background: "#fff",
                              color: theme.dark,
                              border: `1px solid ${theme.border}`,
                            }}
                          >
                            {rows.length} item
                          </span>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: 12,
                            }}
                          >
                            <thead>
                              <tr style={{ background: "#F8FAFC" }}>
                                {isProductPopup
                                  ? [
                                      "Produk",
                                      "Stok",
                                      "Min Stok",
                                      popup.filter === "low"
                                        ? "Defisit"
                                        : "Harga Jual",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          textTransform: "uppercase",
                                          color: "#64748B",
                                          borderBottom: "1px solid #E2E8F0",
                                          padding: "7px 10px",
                                          textAlign: "left",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))
                                  : [
                                      "Waktu",
                                      "Produk",
                                      "Perubahan",
                                      "Alasan",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          textTransform: "uppercase",
                                          color: "#64748B",
                                          borderBottom: "1px solid #E2E8F0",
                                          padding: "7px 10px",
                                          textAlign: "left",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, i) => {
                                if (isProductPopup) {
                                  const gap = Math.max(
                                    0,
                                    Number(r.min_stock || 0) -
                                      Number(r.stock || 0),
                                  );
                                  const isLow =
                                    Number(r.stock) <= Number(r.min_stock || 0);
                                  return (
                                    <tr
                                      key={r.id || i}
                                      style={{
                                        borderBottom: "1px solid #F1F5F9",
                                        background: isLow
                                          ? "rgba(220,38,38,0.03)"
                                          : "transparent",
                                      }}
                                    >
                                      <td style={{ padding: "8px 10px" }}>
                                        <div
                                          style={{
                                            fontWeight: 600,
                                            color: "#0F172A",
                                          }}
                                        >
                                          {r.name}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 10.5,
                                            color: "#94A3B8",
                                          }}
                                        >
                                          {r.sku}
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 10px",
                                          fontWeight: 800,
                                          color: isLow ? "#DC2626" : "#0F172A",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {r.stock} {r.unit || "pcs"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 10px",
                                          color: "#64748B",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {r.min_stock || "-"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 10px",
                                          fontWeight: 700,
                                          color:
                                            popup.filter === "low"
                                              ? "#DC2626"
                                              : "#0056b3",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {popup.filter === "low"
                                          ? gap > 0
                                            ? `Kurang ${gap}`
                                            : "Batas Minimum"
                                          : `Rp ${Number(r.price || 0).toLocaleString("id-ID")}`}
                                      </td>
                                    </tr>
                                  );
                                }
                                const dt = formatDateTimeFull(r.created_at);
                                return (
                                  <tr
                                    key={r.id || i}
                                    style={{
                                      borderBottom: "1px solid #F1F5F9",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "8px 10px",
                                        whiteSpace: "nowrap",
                                        fontSize: 11,
                                        color: "#94A3B8",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          color: "#475569",
                                        }}
                                      >
                                        {dt.hari.slice(0, 3)}, {dt.tanggal}
                                      </div>
                                      <div style={{ color: "#64748B" }}>
                                        {dt.jam}
                                      </div>
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      <span
                                        style={{
                                          fontWeight: 600,
                                          color: "#0F172A",
                                        }}
                                      >
                                        {r.product_name}
                                      </span>
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 10px",
                                        fontWeight: 800,
                                        color:
                                          r.change > 0 ? "#059669" : "#DC2626",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {r.change > 0 ? `+${r.change}` : r.change}
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 10px",
                                        color: "#64748B",
                                        fontSize: 11.5,
                                      }}
                                    >
                                      {REASON_LABEL[r.reason] || r.reason}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
