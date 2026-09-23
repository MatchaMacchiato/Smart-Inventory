import { useMemo, useState, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { REASON_LABEL, formatDateTimeFull } from "../data/products";
import { getCategoryTheme } from "../utils/categoryRules";
import Modal from "./Modal";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

export default function Dashboard({ onNavigate }) {
  const { stats, daily, history, source, products, lowStock, loading } = useInventory();
  const { can } = useAuth();
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

  const formatNumber = (value) => Number(value || 0).toLocaleString("id-ID");
  const maxDaily = Math.max(3, ...daily.flatMap(d => [Number(d.stock_in || 0), Number(d.stock_out || 0)]));
  const chartIn = daily.reduce((sum, d) => sum + Number(d.stock_in || 0), 0);
  const chartOut = daily.reduce((sum, d) => sum + Number(d.stock_out || 0), 0);
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const metrics = [
    { label: "Produk dalam katalog", value: stats.total_products, note: formatNumber(stats.categories_count) + " kategori produk", icon: "box", go: "produk" },
    { label: "Total unit tersedia", value: stats.total_stock, note: "Seluruh persediaan tercatat", icon: "layers", filter: "stock", title: "Semua Produk & Stok" },
    { label: "Stok perlu perhatian", value: lowStock.length, note: "Mencapai batas minimum", icon: "alert", filter: "low", title: "Produk Stok Menipis", attention: true },
    { label: "Barang keluar hari ini", value: stats.stock_out_today, note: formatNumber(stats.stock_in_today) + " unit masuk hari ini", icon: "up", filter: "today_out", title: "Barang Keluar Hari Ini" },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div><div className="eyebrow">OPERASIONAL TOKO</div><h1 className="page-title">Ringkasan inventaris</h1><p className="page-subtitle">Pantau persediaan dan pergerakan barang toko Anda.</p></div>
        <div className="header-actions">
          <button className="button" onClick={() => onNavigate("laporan")}><Icon name="file" size={16} />Lihat laporan</button>
          {can("barang-masuk.manage") && <button className="button button-primary" onClick={() => onNavigate("barang-masuk")}><Icon name="plus" size={16} />Barang masuk</button>}
          {!can("barang-masuk.manage") && can("barang-keluar.manage") && <button className="button button-primary" onClick={() => onNavigate("barang-keluar")}><Icon name="plus" size={16} />Barang keluar</button>}
        </div>
      </div>
      <div className="overview-context"><strong>{today}</strong><span className={"data-state " + (source !== "local" ? "connected" : "")} role="status">{loading ? "Memuat persediaan…" : source === "local" ? "Data lokal · tersimpan di perangkat" : "Data terhubung · termasuk catatan lokal"}</span></div>
      <div className="metrics-grid">{metrics.map(metric => <button key={metric.label} className={"metric " + (metric.attention ? "metric-attention" : "")} onClick={() => metric.go ? onNavigate(metric.go) : setPopup({ title: metric.title, filter: metric.filter })}>
        <span className="metric-top">{metric.label}<Icon name={metric.icon} size={18} /></span><strong className="metric-value">{formatNumber(metric.value)}</strong><span className="metric-bottom">{metric.note}<Icon name="arrow" size={13} /></span>
      </button>)}</div>
      <div className="dashboard-grid">
        <section className="panel" aria-label="Pergerakan stok">
          <div className="panel-head"><div><h3>Pergerakan stok</h3><p>Barang masuk dan keluar dalam {daily.length} hari terakhir</p></div><div className="chart-legend"><span><b />Masuk</span><span><b />Keluar</span></div></div>
          <div className="movement-totals"><button onClick={() => setPopup({ title: "Semua Barang Masuk", filter: "masuk" })}><small>Barang masuk · periode grafik</small><strong>{formatNumber(chartIn)}<span>unit</span></strong></button><button onClick={() => setPopup({ title: "Semua Barang Keluar", filter: "keluar" })}><small>Barang keluar · periode grafik</small><strong>{formatNumber(chartOut)}<span>unit</span></strong></button></div>
          <div className="chart-area"><div className="chart-with-axis"><div className="chart-axis" aria-hidden="true">{[1, 2 / 3, 1 / 3, 0].map(n => <span key={n}>{formatNumber(Math.round(maxDaily * n))}</span>)}</div><div className="bar-chart" role="img" aria-label={daily.map(d => d.date + ': ' + d.stock_in + ' masuk, ' + d.stock_out + ' keluar').join('; ')}>{daily.map(d => <div key={d.date} className="bar-col"><div className="bar-pair"><div className="bar in" title={formatNumber(d.stock_in) + " unit masuk"} style={{ height: (Number(d.stock_in || 0) / maxDaily * 100) + "%" }} /><div className="bar out" title={formatNumber(d.stock_out) + " unit keluar"} style={{ height: (Number(d.stock_out || 0) / maxDaily * 100) + "%" }} /></div><span className="bar-label">{new Date(d.date + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span></div>)}</div></div></div>
          <div className="panel-foot"><span>{chartIn + chartOut ? "Jumlah unit berdasarkan riwayat transaksi" : "Belum ada pergerakan pada periode ini"}</span><button className="button-link" onClick={() => onNavigate("laporan")}>Detail transaksi<Icon name="arrow" size={13} /></button></div>
        </section>
        <section className="panel" aria-label="Stok perlu perhatian"><div className="panel-head"><div><h3>Perlu perhatian</h3><p>Prioritaskan produk di batas minimum</p></div><span className="count-badge">{lowStock.length} produk</span></div>
          <div className="attention-list">{lowStock.slice(0, 4).map(p => <div className="attention-item" key={p.id}><span className="product-symbol"><Icon name="box" size={17} /></span><div className="attention-name"><strong title={p.name}>{p.name}</strong><small>{p.sku || p.category}</small></div><div className="stock-quantity">{formatNumber(p.stock)} <span>{p.unit || "pcs"}</span><small>Min. {formatNumber(p.min_stock)}</small></div></div>)}</div>
          {!lowStock.length && <div className="empty-state"><Icon name="check" />{loading ? "Memuat status persediaan…" : "Tidak ada produk di bawah batas minimum."}</div>}
          <div className="panel-foot"><span>Diurutkan berdasarkan kekurangan stok</span><button className="button-link" onClick={() => setPopup({ title: "Produk Stok Menipis", filter: "low" })}>Lihat semua<Icon name="arrow" size={13} /></button></div>
        </section>
      </div>
      <section className="panel" aria-label="Transaksi terbaru"><div className="panel-head"><div><h3>Aktivitas terbaru</h3><p>Riwayat penerimaan dan pengeluaran barang</p></div><button className="button-link" onClick={() => onNavigate("laporan")}>Semua aktivitas<Icon name="arrow" size={13} /></button></div>
        <div className="table-scroll"><table className="activity-table"><thead><tr><th scope="col">Produk</th><th scope="col">Jenis transaksi</th><th scope="col">Jumlah</th><th scope="col">Keterangan</th><th scope="col">Waktu</th></tr></thead><tbody>{recent.map((h, i) => { const isIn = Number(h.change) > 0; const dt = formatDateTimeFull(h.created_at); return <tr key={h.id || i}><td><strong>{h.product_name}</strong><small>{h.category || "Persediaan toko"}</small></td><td><span className={"status-tag " + (isIn ? "" : "out")}><Icon name={isIn ? "down" : "up"} size={12} />{isIn ? "Barang masuk" : "Barang keluar"}</span></td><td><strong>{isIn ? "+" : ""}{formatNumber(h.change)}</strong></td><td>{REASON_LABEL[h.reason] || h.reason || "—"}</td><td>{dt.tanggal}<small>{dt.jam}</small></td></tr>; })}</tbody></table></div>
        {!recent.length && <div className="empty-state"><Icon name="clock" />Belum ada aktivitas. Transaksi yang dicatat akan muncul di sini.</div>}
        <div className="panel-foot"><span>Menampilkan {recent.length} dari {formatNumber(history.length)} transaksi</span><span>Riwayat stok</span></div>
      </section>
      <footer className="workspace-footer"><span>KDM Inventory · PT Kemilau Abadi Makmur</span><span>Ruang kerja operasional</span></footer>

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
