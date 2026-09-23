import { useMemo, useState } from "react";
import { useMaster } from "../context/MasterContext";
import {
  computeLocalEoq,
  computeLocalApriori,
  fmt,
  pct,
} from "../utils/inventoryAnalytics";

/**
 * Rekomendasi Pengadaan — titik integrasi teknis:
 * 1. Stok aktual (products)
 * 2. EOQ per-supplier (lead_time + cost dari Master Supplier)
 * 3. Companion items dari Apriori
 * 4. Output: Draft PO tersimpan → bisa di-apply di Barang Masuk
 */
export default function RekomendasiPengadaan() {
  const {
    products,
    history,
    suppliers,
    categories,
    purchaseOrders,
    addPurchaseOrder,
    updatePOStatus,
    deletePO,
    pipeline,
    clearPipeline,
    applyPOToStock,
  } = useMaster();
  const [msg, setMsg] = useState(null);
  const [busyPO, setBusyPO] = useState(null); // po id sedang di-apply

  const eoq = useMemo(
    () =>
      computeLocalEoq(
        products,
        history,
        {
          ordering_cost: 25000,
          holding_pct: 0.15,
          lead_time: 5,
          service_level: 0.95,
          days: 90,
        },
        suppliers,
        categories,
      ),
    [products, history, suppliers, categories],
  );
  const apriori = useMemo(
    () =>
      computeLocalApriori(history, {
        min_support: 0.05,
        min_confidence: 0.35,
        days: 90,
      }),
    [history],
  );

  const priority = useMemo(() => {
    const base = eoq.products.filter(
      (p) => p.status === "restock" || p.status === "watch",
    );
    return base.map((p) => {
      // Companion dari Apriori: kalau A restock, usulkan B yang sering bareng
      const companions = apriori.rules
        .filter((r) => String(r.antecedent.product_id) === String(p.product_id))
        .slice(0, 3)
        .map((r) => ({
          product_id: r.consequent.product_id,
          name: r.consequent.name,
          confidence: r.confidence,
          lift: r.lift,
        }));
      const qty = Math.max(
        1,
        Number(p.eoq) ||
          Math.ceil(Math.max(0, (p.reorder_point || 0) - (p.stock || 0) + 1)),
      );
      const sup =
        suppliers.find(
          (s) =>
            String(s.name).toLowerCase() ===
            String(p.supplier || "").toLowerCase(),
        ) ||
        suppliers.find((s) =>
          String(p.supplier || "")
            .toLowerCase()
            .includes(
              String(s.name || "")
                .toLowerCase()
                .split(" ")[1] || "___",
            ),
        ) ||
        null;
      // MOQ: qty pesan minimal sesuai master supplier
      const moq = Number(sup?.moq || 0) || 0;
      const finalQty = moq > 0 ? Math.max(qty, moq) : qty;
      return { ...p, qty: finalQty, moq, supplierObj: sup, companions: companions || [] };
    });
  }, [eoq, apriori, suppliers]);

  const show = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  /** Generate 1 Draft PO per supplier dari item restock */
  const generateDraftPOs = () => {
    const restock = priority.filter((p) => p.status === "restock");
    if (!restock.length)
      return show("err", "Tidak ada item status RESTOCK untuk dibuatkan PO");
    if (!suppliers.length)
      return show("err", "Master Supplier kosong — tidak bisa buat PO");

    const bySupplier = {};
    restock.forEach((p) => {
      const key = p.supplierObj?.name || p.supplier || "Tanpa Supplier";
      if (!bySupplier[key])
        bySupplier[key] = {
          supplier: key,
          supplier_id: p.supplierObj?.id || null,
          items: [],
          companions: [],
        };
      bySupplier[key].items.push({
        product_id: p.product_id,
        name: p.name,
        sku: p.sku,
        qty: p.qty,
        eoq: p.eoq,
        rop: p.reorder_point,
        stock: p.stock,
        unit_price: p.price || 0,
      });
      (p.companions || []).forEach((c) => {
        if (
          !bySupplier[key].companions.find(
            (x) => String(x.product_id) === String(c.product_id),
          )
        ) {
          bySupplier[key].companions.push(c);
        }
      });
    });

    let count = 0;
    Object.values(bySupplier).forEach((group) => {
      const total = group.items.reduce(
        (s, i) => s + Number(i.qty) * Number(i.unit_price || 0),
        0,
      );
      const companions = [...group.companions];
      // companion dari pipeline Apriori (menu 6) yang konsekuennya kebetulan sama — info opsional
      const aprioriRules = pipeline?.apriori || [];
      aprioriRules.forEach((r) => {
        const already = companions.find(
          (x) => String(x.product_id) === String(r.consequent_id),
        );
        if (!already && r.consequent_id != null && r.consequent_name) {
          companions.push({
            product_id: r.consequent_id,
            name: r.consequent_name,
            confidence: r.confidence,
            lift: r.lift,
            source: "pipeline",
          });
        }
      });
      addPurchaseOrder({
        supplier: group.supplier,
        supplier_id: group.supplier_id,
        items: group.items,
        companions,
        total_estimate: total,
        source: "eoq+apriori",
        note:
          `Auto dari Rekomendasi · ${group.items.length} item restock` +
          (companions.length
            ? ` + ${companions.length} companion Apriori`
            : ""),
      });
      count += 1;
    });
    show(
      "ok",
      `${count} Draft PO dibuat dari EOQ + Apriori. Buka di bawah / terapkan via Barang Masuk.`,
    );
  };

  const draftList = purchaseOrders.filter(
    (o) => o.status === "draft" || o.status === "ordered",
  );
  const doneList = purchaseOrders.filter((o) => o.status === "received");

  /** Apply Draft/Ordered PO → stok naik (Barang Masuk otomatis) */
  const applyPO = async (po) => {
    if (busyPO) return;
    setBusyPO(po.id);
    try {
      const res = await applyPOToStock(po.id);
      show(
        "ok",
        `${res.po.no} diterima — ${res.received} item masuk stok. Cek Manajemen Stok / Barang Masuk.`,
      );
    } catch (e) {
      show("err", e?.message || "Gagal apply PO ke stok");
    } finally {
      setBusyPO(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Rekomendasi Pengadaan</div>
          <div className="page-subtitle">
            Integrasi teknis: Stok + EOQ (per-supplier) + Apriori →{" "}
            <b>Draft PO</b> yang bisa dieksekusi di Barang Masuk
          </div>
        </div>
        <button
          type="button"
          onClick={generateDraftPOs}
          style={{
            height: 40,
            padding: "0 16px",
            border: "none",
            borderRadius: 10,
            background: "var(--success)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <i className="fas fa-file-circle-plus" style={{ marginRight: 8 }}></i>
          Generate Draft PO
        </button>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-head">
            <h3>
              <i
                className="fas fa-arrow-up"
                style={{ color: "#059669", marginRight: 8 }}
              ></i>
              Companion Apriori (dari menu 6)
            </h3>
            <span
              className="badge-pill"
              style={{
                background: (pipeline?.apriori || []).length
                  ? "var(--success-bg)"
                  : undefined,
                color: (pipeline?.apriori || []).length
                  ? "var(--success)"
                  : undefined,
              }}
            >
              {(pipeline?.apriori || []).length} rule
            </span>
          </div>
          <div
            className="panel-body"
            style={{ maxHeight: 150, overflowY: "auto", fontSize: 11.5 }}
          >
            {(!pipeline?.apriori || !pipeline.apriori.length) && (
              <div style={{ color: "var(--text-muted)", padding: 6 }}>
                Kosong — buka <b>6. Analisis Apriori</b> → centang rule →{" "}
                <b>Kirim ke PO</b>.
              </div>
            )}
            {(pipeline?.apriori || []).slice(0, 20).map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {r.antecedent_name} → {r.consequent_name}
                </span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pct(r.confidence)} · lift {Number(r.lift).toFixed(2)}
                </span>
              </div>
            ))}
            {(pipeline?.apriori || []).length > 10 && (
              <div
                style={{
                  color: "var(--text-muted)",
                  padding: "6px 0",
                  fontSize: 11,
                }}
              >
                +{pipeline.apriori.length - 10} rule lainnya…
              </div>
            )}
            {(pipeline?.apriori || []).length > 0 && (
              <button
                type="button"
                onClick={() => clearPipeline("apriori")}
                style={{
                  marginTop: 8,
                  border: "none",
                  background: "transparent",
                  color: "#B91C1C",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <i className="fas fa-trash" style={{ marginRight: 4 }}></i>
                Kosongkan pipeline Apriori
              </button>
            )}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-head">
            <b>
              <i
                className="fas fa-arrow-up"
                style={{ color: "#0056b3", marginRight: 8 }}
              ></i>
              Qty EOQ (dari menu 7)
            </b>
            <span
              className="badge-pill"
              style={{
                background: (pipeline?.eoq || []).length
                  ? "rgba(0,86,179,0.1)"
                  : undefined,
                color: (pipeline?.eoq || []).length ? "#0056b3" : undefined,
              }}
            >
              {(pipeline?.eoq || []).length} produk
            </span>
          </div>
          <div
            className="panel-body"
            style={{ maxHeight: 150, overflowY: "auto", fontSize: 12.5 }}
          >
            {(!pipeline?.eoq || !pipeline.eoq.length) && (
              <div style={{ color: "var(--text-muted)", padding: 6 }}>
                Kosong — buka <b>Optimasi EOQ</b> → centang item →{" "}
                <b>Kirim qty → PO</b>.
              </div>
            )}
            {(pipeline?.eoq || []).slice(0, 10).map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    color: "var(--success)",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmt(p.qty)} {p.unit || "pcs"}
                </span>
              </div>
            ))}
            {(pipeline?.eoq || []).length > 10 && (
              <div
                style={{
                  color: "var(--text-muted)",
                  padding: "6px 0",
                  fontSize: 11,
                }}
              >
                +{pipeline.eoq.length - 10} produk…
              </div>
            )}
            {(pipeline?.eoq || []).length > 0 && (
              <button
                type="button"
                onClick={() => clearPipeline("eoq")}
                style={{
                  marginTop: 8,
                  border: "none",
                  background: "transparent",
                  color: "#B91C1C",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <i className="fas fa-trash" style={{ marginRight: 4 }}></i>
                Kosongkan pipeline EOQ
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div
          className="panel-body"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
          }}
        >
          <div>
            <small>PERLU PO</small>
            <strong
              style={{ display: "block", fontSize: 24, color: "var(--danger)" }}
            >
              {priority.filter((r) => r.status === "restock").length}
            </strong>
          </div>
          <div>
            <small>WASPADA</small>
            <strong
              style={{
                display: "block",
                fontSize: 24,
                color: "var(--warning)",
              }}
            >
              {priority.filter((r) => r.status === "watch").length}
            </strong>
          </div>
          <div>
            <small>RULE APRIORI</small>
            <strong
              style={{
                display: "block",
                fontSize: 24,
                color: "var(--success)",
              }}
            >
              {apriori.total_rules}
            </strong>
          </div>
          <div>
            <small>DRAFT PO</small>
            <strong style={{ display: "block", fontSize: 24 }}>
              {draftList.length}
            </strong>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-head">
          <h3>Prioritas Pengadaan (EOQ + companion Apriori)</h3>
          <span className="badge-pill">hard-linked</span>
        </div>
        <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr>
                {[
                  "#",
                  "Produk",
                  "Supplier (master)",
                  "Stok",
                  "Qty usulan",
                  "ROP",
                  "Companion Apriori",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
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
              {priority.map((p, i) => (
                <tr key={p.product_id}>
                  <td style={{ padding: 10 }}>
                    <span
                      className="badge-pill"
                      style={{
                        background:
                          i < 3 ? "var(--danger-bg)" : "var(--warning-bg)",
                        color: i < 3 ? "var(--danger)" : "var(--warning)",
                      }}
                    >
                      #{i + 1}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>
                    <b>{p.name}</b>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {p.sku}
                    </div>
                  </td>
                  <td style={{ padding: 10 }}>
                    {p.supplierObj?.name || p.supplier || "—"}
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      LT {p.lead_time_days}h · S Rp {fmt(p.ordering_cost)}
                      {!p.supplierObj && (
                        <span style={{ color: "var(--warning)" }}>
                          {" "}
                          · belum match master
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 10, fontWeight: 800 }}>{p.stock}</td>
                  <td
                    style={{
                      padding: 10,
                      fontWeight: 800,
                      color: "var(--success)",
                    }}
                  >
                    {fmt(p.qty)}
                  </td>
                  <td style={{ padding: 10 }}>{fmt(p.reorder_point)}</td>
                  <td style={{ padding: 10, fontSize: 11 }}>
                    {(p.companions || []).length ? (
                      p.companions.map((c) => (
                        <div key={c.product_id}>
                          + {c.name}{" "}
                          <span style={{ color: "var(--text-muted)" }}>
                            ({pct(c.confidence)})
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: "var(--text-faint)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 10 }}>
                    <span
                      className="badge-pill"
                      style={{
                        background:
                          p.status === "restock"
                            ? "var(--danger-bg)"
                            : "var(--warning-bg)",
                        color:
                          p.status === "restock"
                            ? "var(--danger)"
                            : "var(--warning)",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!priority.length && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Semua stok aman — tidak ada prioritas PO
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-head">
          <h3>Draft Purchase Order</h3>
          <span className="badge-pill">{draftList.length} draft</span>
        </div>
        <div className="panel-body">
          {!draftList.length && (
            <div
              style={{ color: "var(--text-muted)", fontSize: 13, padding: 8 }}
            >
              Belum ada draft. Klik <b>Generate Draft PO</b> — sistem group by
              supplier dari item RESTOCK + companion Apriori.
            </div>
          )}
          {draftList.map((po) => (
            <div
              key={po.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {po.no} · {po.supplier}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {po.note} ·{" "}
                    {new Date(po.created_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong style={{ color: "var(--success)" }}>
                    Est. Rp {fmt(po.total_estimate)}
                  </strong>
                  <button
                    type="button"
                    className="badge-pill"
                    style={{
                      border: "none",
                      background: "#059669",
                      color: "#fff",
                      cursor: busyPO ? "not-allowed" : "pointer",
                      fontWeight: 800,
                    }}
                    onClick={() => applyPO(po)}
                    disabled={!!busyPO}
                    title="Terima barang → stok langsung naik + tercatat di Barang Masuk"
                  >
                    <i
                      className="fas fa-arrow-down"
                      style={{ marginRight: 4 }}
                    ></i>
                    {busyPO === po.id ? "Proses..." : "Terima → Stok"}
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
                    onClick={() => {
                      updatePOStatus(po.id, "ordered");
                      show(
                        "ok",
                        `${po.no} ditandai ORDERED — siap diterima di Barang Masuk`,
                      );
                    }}
                  >
                    Tandai Ordered
                  </button>
                  <button
                    type="button"
                    className="badge-pill"
                    style={{
                      border: "1px solid var(--border)",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                    onClick={() => deletePO(po.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12 }}>
                {po.items?.map((it) => (
                  <div
                    key={it.product_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <span>
                      {it.name}{" "}
                      <span style={{ color: "var(--text-muted)" }}>
                        ({it.sku})
                      </span>
                    </span>
                    <b>{it.qty} pcs</b>
                  </div>
                ))}
                {!!po.companions?.length && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    Saran Apriori (opsional bareng):{" "}
                    {po.companions.map((c) => c.name).join(", ")}
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  background: "#F8FAFC",
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                <b>Eksekusi otomatis:</b> klik <b>Terima → Stok</b> → seluruh
                item PO masuk stok & tercatat di Barang Masuk, status PO jadi{" "}
                <b>received</b>. Alternatif manual: menu Barang Masuk → input
                per produk.
              </div>
            </div>
          ))}
        </div>
      </div>

      {!!doneList.length && (
        <div className="panel">
          <div className="panel-head">
            <h3>Riwayat PO</h3>
          </div>
          <div className="panel-body" style={{ fontSize: 12 }}>
            {doneList.map((po) => (
              <div
                key={po.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span>
                  {po.no} · {po.supplier} · {po.items?.length || 0} item
                </span>
                <span className="badge-pill">{po.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
