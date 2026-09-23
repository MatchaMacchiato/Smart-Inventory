import { useState, useMemo, useRef, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { REASON_LABEL, formatDateTimeFull } from "../data/products";

export default function Reports({ onNavigate, initialFilter }) {
  const { stats, daily, history, products, lowStock, getHistoryFiltered } =
    useInventory();

  const [tab, setTab] = useState(initialFilter ? "riwayat" : "ringkasan");
  const [filterType, setFilterType] = useState(initialFilter || "all");
  const [filterReason, setFilterReason] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterParty, setFilterParty] = useState("all"); // all | supplier | customer | specific name
  const [searchText, setSearchText] = useState("");
  const printRef = useRef(null);

  // Update tab jika initialFilter berubah dari luar (KPI click)
  useEffect(() => {
    if (initialFilter) {
      setTab("riwayat");
      setFilterType(initialFilter);
    }
  }, [initialFilter]);

  const barColors = [
    "#0056b3",
    "#7C3AED",
    "#059669",
    "#FF7300",
    "#DC2626",
    "#8B5CF6",
    "#0EA5E9",
    "#0056b3",
  ];

  // Top products by stock value
  const topByValue = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            Number(b.stock) * Number(b.price) -
            Number(a.stock) * Number(a.price),
        )
        .slice(0, 10),
    [products],
  );

  const filteredHistory = useMemo(() => {
    let rows = history;
    if (filterType === "masuk") rows = rows.filter((h) => h.change > 0);
    else if (filterType === "keluar") rows = rows.filter((h) => h.change < 0);
    else if (filterType === "today") {
      const t = new Date().toDateString();
      rows = rows.filter((h) => new Date(h.created_at).toDateString() === t);
    } else if (filterType === "low") {
      const ids = new Set(lowStock.map((p) => String(p.id)));
      rows = rows.filter((h) => ids.has(String(h.product_id)));
    }
    if (filterReason !== "all")
      rows = rows.filter((h) => h.reason === filterReason);
    if (filterCategory !== "all")
      rows = rows.filter((h) => h.category === filterCategory);
    if (filterParty === "supplier")
      rows = rows.filter(
        (h) => h.change > 0 && h.supplier && h.supplier !== "-",
      );
    else if (filterParty === "customer")
      rows = rows.filter(
        (h) => h.change < 0 && h.customer && h.customer !== "-",
      );
    else if (filterParty.startsWith("sup:")) {
      const name = filterParty.slice(4);
      rows = rows.filter((h) => String(h.supplier || "") === name);
    } else if (filterParty.startsWith("cus:")) {
      const name = filterParty.slice(4);
      rows = rows.filter((h) => String(h.customer || "") === name);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      rows = rows.filter(
        (h) =>
          (h.product_name || "").toLowerCase().includes(q) ||
          (h.sku || "").toLowerCase().includes(q) ||
          (h.supplier || "").toLowerCase().includes(q) ||
          (h.customer || "").toLowerCase().includes(q) ||
          (h.notes || "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [
    history,
    filterType,
    filterReason,
    filterCategory,
    filterParty,
    searchText,
    lowStock,
  ]);

  const totalInFilter = filteredHistory
    .filter((h) => h.change > 0)
    .reduce((s, h) => s + h.change, 0);
  const totalOutFilter = Math.abs(
    filteredHistory
      .filter((h) => h.change < 0)
      .reduce((s, h) => s + h.change, 0),
  );

  const partyOf = (h) => {
    if (h.change > 0)
      return h.supplier && h.supplier !== "-" ? h.supplier : "-";
    if (h.change < 0)
      return h.customer && h.customer !== "-" ? h.customer : "-";
    return h.supplier || h.customer || "-";
  };
  const partyLabelOf = (h) =>
    h.change > 0 ? "Supplier" : h.change < 0 ? "Customer" : "Pihak";

  const downloadCSV = () => {
    const header =
      "ID,Waktu,Produk,Kategori,SKU,Stok Sebelum,Stok Sesudah,Perubahan,Alasan,Supplier,Customer,Pihak,Catatan";
    const rows = filteredHistory.slice(0, 1000).map((h) => {
      const dt = h.created_at
        ? new Date(h.created_at).toLocaleString("id-ID")
        : "-";
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        h.id,
        esc(dt),
        esc(h.product_name),
        esc(h.category || ""),
        esc(h.sku || ""),
        h.stock_before,
        h.stock_after,
        h.change,
        esc(REASON_LABEL[h.reason] || h.reason),
        esc(h.supplier || ""),
        esc(h.customer || ""),
        esc(partyOf(h)),
        esc(h.notes || ""),
      ].join(",");
    });
    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-inventaris-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Izinkan popup untuk unduh PDF");
      return;
    }
    const d = w.document;
    const style = `
      body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #002a5c; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .sub { color: #475569; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #0056b3; color: #fff; padding: 7px 5px; text-align: left; }
      td { padding: 5px; border-bottom: 1px solid #E6E8EA; }
      .in { color: #059669; font-weight: 700; }
      .out { color: #DC2626; font-weight: 700; }
      .summary { display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
      .summary div { padding: 10px; border-radius: 8px; background: #F1F5F9; border: 1px solid #E6E8EA; }
    `;
    d.write(
      `<html><head><meta charset="utf-8"><title>Laporan Inventaris</title><style>${style}</style></head><body>`,
    );
    d.write("<h1>Laporan Inventaris Toko Listrik</h1>");
    d.write(
      `<p class="sub">${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${filteredHistory.length} transaksi · Produk: ${products.length}</p>`,
    );
    d.write(
      '<div class="summary"><div><strong>Total Masuk</strong><br>+' +
        totalInFilter +
        "</div><div><strong>Total Keluar</strong><br>-" +
        totalOutFilter +
        "</div><div><strong>Produk</strong><br>" +
        products.length +
        "</div></div>",
    );
    d.write(
      "<table><thead><tr><th>Waktu</th><th>Produk</th><th>Kategori</th><th>Perubahan</th><th>Alasan</th><th>Supplier</th><th>Customer</th></tr></thead><tbody>",
    );
    filteredHistory.slice(0, 500).forEach((h) => {
      const dt = h.created_at
        ? new Date(h.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
      d.write(
        `<tr><td>${dt}</td><td>${h.product_name}</td><td>${h.category || "-"}</td><td class="${h.change > 0 ? "in" : "out"}">${h.change > 0 ? "+" : ""}${h.change}</td><td>${REASON_LABEL[h.reason] || h.reason}</td><td>${h.supplier || "-"}</td><td>${h.customer || "-"}</td></tr>`,
      );
    });
    d.write(
      '</tbody></table><p style="margin-top:16px;color:#64748B;font-size:10px;">Dicetak dari Smart Inventory Pro System</p></body></html>',
    );
    d.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const categories = useMemo(() => {
    const set = new Set(history.map((h) => h.category).filter(Boolean));
    return Array.from(set);
  }, [history]);

  const supplierList = useMemo(() => {
    const set = new Set(
      history.map((h) => h.supplier).filter((s) => s && s !== "-"),
    );
    products.forEach((p) => {
      if (p.supplier) set.add(p.supplier);
    });
    return Array.from(set).sort();
  }, [history, products]);

  const customerList = useMemo(() => {
    const set = new Set(
      history.map((h) => h.customer).filter((c) => c && c !== "-"),
    );
    return Array.from(set).sort();
  }, [history]);

  const maxDaily = Math.max(
    1,
    ...daily.map((d) =>
      Math.max(Number(d.stock_in || 0), Number(d.stock_out || 0)),
    ),
  );
  const totalIn = Number(stats.stock_in || 0);
  const totalOut = Number(stats.stock_out || 0);
  const totalNilaiStok = topByValue.reduce(
    (a, p) => a + Number(p.stock) * Number(p.price),
    0,
  );

  return (
    <div ref={printRef}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 8,
        }}
      >
        <div>
          <div className="page-title">Laporan Stok</div>
          <div className="page-subtitle" style={{ marginBottom: 0 }}>
            Semua data real-time dari server &middot; {filteredHistory.length}{" "}
            transaksi termuat
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={downloadCSV} style={s.btn}>
            <i className="fas fa-download"></i> CSV
          </button>
          <button
            type="button"
            onClick={downloadPDF}
            style={{ ...s.btn, background: "#DC2626", color: "#fff" }}
          >
            <i className="fas fa-file-pdf"></i> PDF
          </button>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          { key: "ringkasan", label: "Ringkasan" },
          { key: "pergerakan", label: "Pergerakan" },
          { key: "riwayat", label: "Riwayat" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: tab === t.key ? "1px solid #0056b3" : "1px solid #E6E8EA",
              background: tab === t.key ? "rgba(0,86,179,0.09)" : "#fff",
              color: tab === t.key ? "#004494" : "#475569",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ringkasan */}
      {tab === "ringkasan" && (
        <>
          <div
            className="kpi-grid"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            {[
              {
                label: "Total Produk",
                value: stats.total_products,
                icon: "fa-cube",
                color: "#0056b3",
              },
              {
                label: "Total Stok",
                value: Number(stats.total_stock || 0).toLocaleString("id-ID"),
                icon: "fa-boxes",
                color: "#7C3AED",
              },
              {
                label: "Stok Menipis",
                value: lowStock.length,
                icon: "fa-exclamation-triangle",
                color: "#DC2626",
              },
              {
                label: "Nilai Stok",
                value: `Rp ${(totalNilaiStok / 1000000).toFixed(1)}jt`,
                icon: "fa-coins",
                color: "#059669",
              },
              {
                label: "Barang Masuk",
                value: totalIn.toLocaleString("id-ID"),
                icon: "fa-arrow-down",
                color: "#059669",
              },
              {
                label: "Barang Keluar",
                value: totalOut.toLocaleString("id-ID"),
                icon: "fa-arrow-up",
                color: "#EA580C",
              },
              {
                label: "Total Transaksi",
                value: history.length,
                icon: "fa-exchange-alt",
                color: "#8B5CF6",
              },
              {
                label: "Kategori",
                value: stats.categories_count,
                icon: "fa-tags",
                color: "#0EA5E9",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1px solid #E6E8EA",
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `${s.color}15`,
                    color: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  <i className={`fas ${s.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-grid" style={{ marginTop: 14 }}>
            <div className="panel">
              <div className="panel-head">
                <h3>Stok Tertinggi (nilai)</h3>
              </div>
              <div className="panel-body">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      {["#", "Produk", "Stok", "Nilai Stok"].map((h) => (
                        <th
                          key={h}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "#64748B",
                            textAlign: "left",
                            padding: "7px 4px",
                            borderBottom: "1px solid #E6E8EA",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topByValue.slice(0, 8).map((p, i) => (
                      <tr key={p.id}>
                        <td
                          style={{
                            padding: "7px 4px",
                            borderBottom: "1px solid #F8FAFC",
                            fontWeight: 600,
                            fontSize: 10,
                            color: "#64748B",
                          }}
                        >
                          #{i + 1}
                        </td>
                        <td
                          style={{
                            padding: "7px 4px",
                            borderBottom: "1px solid #F8FAFC",
                            fontWeight: 600,
                          }}
                        >
                          {p.name}
                        </td>
                        <td
                          style={{
                            padding: "7px 4px",
                            borderBottom: "1px solid #F8FAFC",
                          }}
                        >
                          {p.stock}
                        </td>
                        <td
                          style={{
                            padding: "7px 4px",
                            borderBottom: "1px solid #F8FAFC",
                            color: "#0056b3",
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          Rp{" "}
                          {(Number(p.stock) * Number(p.price)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3>Distribusi per Kategori</h3>
              </div>
              <div className="panel-body">
                {(stats.categories || []).map((c, i) => (
                  <div
                    key={c.category}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: barColors[i % barColors.length],
                      }}
                    ></div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                      {c.category}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      {c.count} SKU
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {c.total_stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pergerakan */}
      {tab === "pergerakan" && (
        <>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="panel-head">
              <h3>Grafik Harian</h3>
            </div>
            <div className="panel-body">
              <div className="bar-chart" style={{ height: 160 }}>
                {daily.map((d, i) => (
                  <div className="bar-col" key={d.date || i}>
                    <div className="bar-pair">
                      <div
                        className="bar in"
                        style={{
                          height: `${(Number(d.stock_in || 0) / maxDaily) * 100}%`,
                        }}
                      />
                      <div
                        className="bar out"
                        style={{
                          height: `${(Number(d.stock_out || 0) / maxDaily) * 100}%`,
                        }}
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
              <h3>Berdasarkan Alasan</h3>
            </div>
            <div className="panel-body">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {["Alasan", "Masuk", "Keluar", "Transaksi"].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#64748B",
                          padding: "8px 10px",
                          borderBottom: "1px solid #E6E8EA",
                          background: "#F1F5F9",
                          textAlign: "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(REASON_LABEL).map(([k, v]) => {
                    const masuk = history
                      .filter((h) => h.reason === k && h.change > 0)
                      .reduce((s, h) => s + h.change, 0);
                    const keluar = Math.abs(
                      history
                        .filter((h) => h.reason === k && h.change < 0)
                        .reduce((s, h) => s + h.change, 0),
                    );
                    const count = history.filter((h) => h.reason === k).length;
                    if (count === 0) return null;
                    return (
                      <tr key={k}>
                        <td
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid #F8FAFC",
                            fontWeight: 600,
                          }}
                        >
                          {v}
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid #F8FAFC",
                            color: "#059669",
                            fontWeight: 600,
                          }}
                        >
                          {masuk > 0 ? `+${masuk}` : "-"}
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid #F8FAFC",
                            color: "#DC2626",
                            fontWeight: 600,
                          }}
                        >
                          {keluar > 0 ? `-${keluar}` : "-"}
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid #F8FAFC",
                          }}
                        >
                          {count}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Riwayat */}
      {tab === "riwayat" && (
        <div className="panel">
          <div className="panel-head" style={{ flexWrap: "wrap", gap: 8 }}>
            <h3>Riwayat Transaksi (filtered)</h3>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={s.sel}
              >
                <option value="all">Semua</option>
                <option value="masuk">Barang Masuk</option>
                <option value="keluar">Barang Keluar</option>
                <option value="today">Hari Ini</option>
                <option value="low">Stok Menipis</option>
              </select>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                style={s.sel}
              >
                <option value="all">Semua Alasan</option>
                {Object.entries(REASON_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {categories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={s.sel}
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                style={s.sel}
              >
                <option value="all">Semua Pihak</option>
                <option value="supplier">Hanya Supplier</option>
                <option value="customer">Hanya Customer</option>
                {supplierList.map((sp) => (
                  <option key={`sup-${sp}`} value={`sup:${sp}`}>
                    Supplier: {sp}
                  </option>
                ))}
                {customerList.map((cu) => (
                  <option key={`cus-${cu}`} value={`cus:${cu}`}>
                    Customer: {cu}
                  </option>
                ))}
              </select>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari produk, SKU, supplier, customer..."
                style={{ ...s.sel, width: 220 }}
              />
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Waktu",
                    "Produk",
                    "Kategori",
                    "Sebelum",
                    "Sesudah",
                    "Perubahan",
                    "Alasan",
                    "Supplier",
                    "Customer",
                    "Catatan",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "#64748B",
                        borderBottom: "1px solid #E6E8EA",
                        padding: "8px 6px",
                        background: "#F1F5F9",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.slice(0, 500).map((h, i) => {
                  const dt = h.created_at
                    ? formatDateTimeFull(h.created_at)
                    : { hari: "-", tanggal: "-", jam: "-", full: "-" };
                  return (
                    <tr key={h.id || i}>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontSize: 10.5,
                          whiteSpace: "nowrap",
                          color: "#94A3B8",
                        }}
                      >
                        {dt.hari.slice(0, 3)}, {dt.tanggal}
                        <br />
                        <span style={{ fontSize: 10, color: "#64748B" }}>
                          {dt.jam}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontWeight: 600,
                          fontSize: 11.5,
                        }}
                      >
                        {h.product_name}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontSize: 10.5,
                        }}
                      >
                        {h.category || "-"}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          textAlign: "center",
                        }}
                      >
                        {h.stock_before}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {h.stock_after}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: h.change > 0 ? "#059669" : "#DC2626",
                          }}
                        >
                          {h.change > 0 ? "+" : ""}
                          {h.change}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontSize: 10.5,
                          color: "#94A3B8",
                        }}
                      >
                        {REASON_LABEL[h.reason] || h.reason}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: h.change > 0 ? "#059669" : "#64748B",
                        }}
                      >
                        {h.supplier && h.supplier !== "-"
                          ? h.supplier
                          : h.change > 0
                            ? "-"
                            : "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: h.change < 0 ? "#EA580C" : "#64748B",
                        }}
                      >
                        {h.customer && h.customer !== "-"
                          ? h.customer
                          : h.change < 0
                            ? "-"
                            : "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 6px",
                          borderBottom: "1px solid #F8FAFC",
                          fontSize: 10,
                          color: "#64748B",
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
                {filteredHistory.length > 500 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "#64748B",
                        fontSize: 12,
                      }}
                    >
                      Menampilkan 500 dari {filteredHistory.length} transaksi.
                      Download CSV/PDF untuk semua data.
                    </td>
                  </tr>
                )}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "#64748B",
                      }}
                    >
                      Tidak ada data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  btn: {
    padding: "8px 12px",
    border: "1px solid #E6E8EA",
    borderRadius: 8,
    background: "#fff",
    color: "#475569",
    fontWeight: 700,
    fontSize: 11.5,
    cursor: "pointer",
  },
  sel: {
    padding: "6px 10px",
    border: "1px solid #E6E8EA",
    borderRadius: 8,
    fontSize: 12,
    background: "#fff",
    color: "#002a5c",
  },
};
