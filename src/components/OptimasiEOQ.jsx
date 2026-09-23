import { useMemo, useState } from "react";
import { useMaster } from "../context/MasterContext";
import { computeLocalEoq, fmt } from "../utils/inventoryAnalytics";

/**
 * Optimasi EOQ — hard-linked ke Master Supplier + output ke pipeline Rekomendasi PO.
 * lead_time & cost_per_order dari supplier; qty EOQ bisa di-apply ke draft pengadaan.
 */
export default function OptimasiEOQ() {
  const {
    products,
    history,
    suppliers,
    categories,
    pushEoqToPipeline,
    pipeline,
    addPurchaseOrder,
  } = useMaster();
  const [params, setParams] = useState({
    ordering_cost: 25000,
    holding_pct: 0.15,
    lead_time: 5,
    service_level: 0.95,
    days: 90,
  });
  const [selected, setSelected] = useState({});
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setParams((p) => ({ ...p, [k]: Number(v) }));

  const result = useMemo(
    () => computeLocalEoq(products, history, params, suppliers, categories),
    [products, history, params, suppliers, categories],
  );

  const linked = useMemo(() => {
    const withSupplier = result.products.filter((p) =>
      suppliers.some(
        (s) =>
          String(s.name).toLowerCase() ===
          String(p.supplier || "").toLowerCase(),
      ),
    ).length;
    return { withSupplier, total: result.products.length };
  }, [result, suppliers]);

  const show = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3200);
  };

  const restockItems = useMemo(
    () =>
      result.products.filter(
        (p) => p.status === "restock" || p.status === "watch",
      ),
    [result],
  );

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectRestock = () => {
    const next = {};
    result.products
      .filter((p) => p.status === "restock")
      .forEach((p) => {
        next[p.product_id] = true;
      });
    setSelected(next);
  };

  const selectedRows = () =>
    result.products.filter((p) => selected[p.product_id]);

  const sendToPipeline = (rows) => {
    if (!rows.length)
      return show("err", "Pilih produk dulu atau tidak ada item restock");
    const payload = pushEoqToPipeline(rows);
    show(
      "ok",
      `${rows.length} qty EOQ dikirim ke pipeline Rekomendasi PO (total: ${payload.eoq.length})`,
    );
  };

  const sendRestockAll = () => {
    const rows = result.products.filter((p) => p.status === "restock");
    if (!rows.length) return show("err", "Tidak ada status RESTOCK");
    sendToPipeline(rows);
  };

  const createDraftFromSelected = () => {
    const rows = selectedRows().length
      ? selectedRows()
      : result.products.filter((p) => p.status === "restock");
    if (!rows.length) return show("err", "Tidak ada item untuk Draft PO");

    const bySupplier = {};
    rows.forEach((p) => {
      const key = p.supplier || "Tanpa Supplier";
      if (!bySupplier[key]) bySupplier[key] = [];
      const qty = Math.max(
        1,
        Number(p.eoq) ||
          Math.ceil(Math.max(0, (p.reorder_point || 0) - (p.stock || 0) + 1)),
      );
      bySupplier[key].push({
        product_id: p.product_id,
        name: p.name,
        sku: p.sku,
        qty,
        eoq: p.eoq,
        rop: p.reorder_point,
        stock: p.stock,
        unit_price: p.price || 0,
      });
    });

    let count = 0;
    Object.entries(bySupplier).forEach(([supplier, items]) => {
      const sup = suppliers.find(
        (s) => String(s.name).toLowerCase() === String(supplier).toLowerCase(),
      );
      const total = items.reduce(
        (s, i) => s + Number(i.qty) * Number(i.unit_price || 0),
        0,
      );
      addPurchaseOrder({
        supplier,
        supplier_id: sup?.id || null,
        items,
        companions: [],
        total_estimate: total,
        source: "eoq",
        note: `Dari Optimasi EOQ · ${items.length} item`,
      });
      count += 1;
    });
    // juga isi pipeline
    pushEoqToPipeline(rows);
    show("ok", `${count} Draft PO dibuat dari EOQ. Cek menu Rekomendasi PO.`);
  };

  const queued = pipeline?.eoq?.length || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Optimasi EOQ</div>
          <div className="page-subtitle">
            Q*, ROP, safety stock — lead time & biaya pesan dari{" "}
            <b>Master Supplier</b> · apply qty ke <b>Rekomendasi PO</b>
          </div>
        </div>
        <span className="badge-pill">
          <i className="fas fa-link"></i> {linked.withSupplier}/{linked.total}{" "}
          terhubung · pipeline {queued}
        </span>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background:
              msg.type === "ok" ? "var(--success-bg)" : "var(--danger-bg)",
            color: msg.type === "ok" ? "var(--success)" : "var(--danger)",
          }}
        >
          {msg.text}
        </div>
      )}

      {!suppliers.length && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            background: "var(--warning-bg)",
            color: "var(--warning)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Master Supplier kosong — EOQ memakai parameter global. Isi supplier
          dulu agar hitungan per-pemasok valid.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1fr)",
          gap: 12,
        }}
      >
        <div className="panel">
          <div className="panel-head">
            <h3>Parameter Global (fallback)</h3>
          </div>
          <div
            className="panel-body"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              Dipakai hanya jika produk belum punya supplier di master. Supplier
              yang match → pakai lead_time & cost_per_order-nya.
            </div>
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              Biaya pesan fallback (Rp)
              <input
                type="number"
                value={params.ordering_cost}
                onChange={(e) => set("ordering_cost", e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  height: 36,
                  marginTop: 5,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0 10px",
                }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              Holding cost ({Math.round(params.holding_pct * 100)}% harga)
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.01"
                value={params.holding_pct}
                onChange={(e) => set("holding_pct", e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              Lead time fallback (hari)
              <input
                type="number"
                value={params.lead_time}
                onChange={(e) => set("lead_time", e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  height: 36,
                  marginTop: 5,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0 10px",
                }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              Service level ({params.service_level})
              <input
                type="range"
                min="0.8"
                max="0.99"
                step="0.01"
                value={params.service_level}
                onChange={(e) => set("service_level", e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>
              Horizon demand
              <select
                value={params.days}
                onChange={(e) => set("days", e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  height: 36,
                  marginTop: 5,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              >
                {[30, 60, 90, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} hari
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                Output ke sistem
              </div>
              <button
                type="button"
                onClick={selectRestock}
                style={{
                  height: 34,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Pilih semua RESTOCK
              </button>
              <button
                type="button"
                onClick={() => sendToPipeline(selectedRows())}
                style={{
                  height: 38,
                  border: "none",
                  borderRadius: 8,
                  background: "#0056b3",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <i className="fas fa-share" style={{ marginRight: 6 }}></i>
                Kirim qty terpilih → PO
              </button>
              <button
                type="button"
                onClick={sendRestockAll}
                style={{
                  height: 34,
                  border: "1px solid #DC2626",
                  borderRadius: 8,
                  background: "rgba(220,38,38,0.08)",
                  color: "#DC2626",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Kirim semua RESTOCK
              </button>
              <button
                type="button"
                onClick={createDraftFromSelected}
                style={{
                  height: 38,
                  border: "none",
                  borderRadius: 8,
                  background: "var(--success)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <i
                  className="fas fa-file-circle-plus"
                  style={{ marginRight: 6 }}
                ></i>
                Buat Draft PO langsung
              </button>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                }}
              >
                Qty usulan = EOQ (atau gap ke ROP). Draft muncul di menu{" "}
                <b>8. Rekomendasi PO</b>.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div
              className="panel-body"
              style={{ display: "flex", gap: 28, flexWrap: "wrap" }}
            >
              <div>
                <small>PRODUK</small>
                <strong style={{ display: "block", fontSize: 22 }}>
                  {result.summary.total_products}
                </strong>
              </div>
              <div>
                <small style={{ color: "var(--danger)" }}>RESTOCK</small>
                <strong
                  style={{
                    display: "block",
                    fontSize: 22,
                    color: "var(--danger)",
                  }}
                >
                  {result.summary.needs_restock}
                </strong>
              </div>
              <div>
                <small style={{ color: "var(--warning)" }}>WASPADA</small>
                <strong
                  style={{
                    display: "block",
                    fontSize: 22,
                    color: "var(--warning)",
                  }}
                >
                  {result.summary.watch}
                </strong>
              </div>
              <div>
                <small style={{ color: "var(--success)" }}>AMAN</small>
                <strong
                  style={{
                    display: "block",
                    fontSize: 22,
                    color: "var(--success)",
                  }}
                >
                  {result.summary.ok}
                </strong>
              </div>
              <div>
                <small>DIPILIH</small>
                <strong
                  style={{ display: "block", fontSize: 22, color: "#0056b3" }}
                >
                  {Object.values(selected).filter(Boolean).length}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>EOQ per Produk (supplier-aware)</h3>
              <span className="badge-pill">
                {restockItems.length} prioritas
              </span>
            </div>
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
                  <tr>
                    {[
                      "",
                      "Produk",
                      "Supplier",
                      "LT",
                      "S (biaya)",
                      "Stok",
                      "EOQ",
                      "ROP",
                      "Status",
                      "Aksi",
                    ].map((h) => (
                      <th
                        key={h || "chk"}
                        style={{
                          padding: 10,
                          textAlign: "left",
                          fontSize: 10,
                          color: "var(--text-muted)",
                          background: "#F8FAFC",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.products.map((p) => {
                    const linkedSup = suppliers.some(
                      (s) =>
                        String(s.name).toLowerCase() ===
                        String(p.supplier || "").toLowerCase(),
                    );
                    const actionable =
                      p.status === "restock" || p.status === "watch";
                    return (
                      <tr
                        key={p.product_id}
                        style={{
                          background: selected[p.product_id]
                            ? "rgba(0,86,179,0.04)"
                            : "transparent",
                        }}
                      >
                        <td style={{ padding: 10 }}>
                          <input
                            type="checkbox"
                            checked={!!selected[p.product_id]}
                            disabled={!p.eoq && p.status === "no_demand"}
                            onChange={() => toggle(p.product_id)}
                          />
                        </td>
                        <td style={{ padding: 10 }}>
                          <b>{p.name}</b>
                          <div
                            style={{ fontSize: 10, color: "var(--text-muted)" }}
                          >
                            {p.sku}
                          </div>
                        </td>
                        <td style={{ padding: 10 }}>
                          {p.supplier || "—"}
                          {!linkedSup && p.supplier && p.supplier !== "-" && (
                            <div
                              style={{ fontSize: 10, color: "var(--warning)" }}
                            >
                              tidak match master
                            </div>
                          )}
                        </td>
                        <td style={{ padding: 10 }}>{p.lead_time_days}h</td>
                        <td style={{ padding: 10 }}>{fmt(p.ordering_cost)}</td>
                        <td style={{ padding: 10, fontWeight: 800 }}>
                          {p.stock}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            fontWeight: 800,
                            color: "var(--success)",
                          }}
                        >
                          {p.eoq ? fmt(p.eoq) : "—"}
                        </td>
                        <td style={{ padding: 10 }}>
                          {p.reorder_point ? fmt(p.reorder_point) : "—"}
                        </td>
                        <td style={{ padding: 10 }}>
                          <span
                            className="badge-pill"
                            style={{
                              background:
                                p.status === "restock"
                                  ? "var(--danger-bg)"
                                  : p.status === "watch"
                                    ? "var(--warning-bg)"
                                    : "var(--success-bg)",
                              color:
                                p.status === "restock"
                                  ? "var(--danger)"
                                  : p.status === "watch"
                                    ? "var(--warning)"
                                    : "var(--success)",
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                          {actionable && (
                            <button
                              type="button"
                              onClick={() => {
                                pushEoqToPipeline([p]);
                                show(
                                  "ok",
                                  `Qty EOQ “${p.name}” dikirim ke Rekomendasi PO`,
                                );
                              }}
                              style={{
                                height: 30,
                                padding: "0 10px",
                                border: "none",
                                borderRadius: 8,
                                background: "#0056b3",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              + ke PO
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
