import { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { useMaster } from "../context/MasterContext";
import { computeLocalApriori, fmt, pct } from "../utils/inventoryAnalytics";

/**
 * Analisis Apriori — output actionable:
 * rule A → B bisa dikirim ke pipeline Rekomendasi PO sebagai companion.
 */
export default function AnalisisApriori() {
  const { history } = useInventory();
  const { pushAprioriToPipeline, pipeline } = useMaster();
  const [support, setSupport] = useState(0.05);
  const [confidence, setConfidence] = useState(0.35);
  const [days, setDays] = useState(90);
  const [result, setResult] = useState(() =>
    computeLocalApriori(history, {
      min_support: 0.05,
      min_confidence: 0.35,
      days: 90,
    }),
  );
  const [selected, setSelected] = useState({}); // key rule index
  const [msg, setMsg] = useState(null);

  const run = () => {
    setResult(
      computeLocalApriori(history, {
        min_support: support,
        min_confidence: confidence,
        days,
      }),
    );
    setSelected({});
  };

  const show = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3200);
  };

  const toggle = (i) => setSelected((prev) => ({ ...prev, [i]: !prev[i] }));

  const selectTop = (n = 5) => {
    const next = {};
    result.rules.slice(0, n).forEach((_, i) => {
      next[i] = true;
    });
    setSelected(next);
  };

  const sendSelected = () => {
    const rules = result.rules.filter((_, i) => selected[i]);
    if (!rules.length) return show("err", "Pilih minimal 1 rule dulu");
    const payload = pushAprioriToPipeline(rules);
    show(
      "ok",
      `${rules.length} companion Apriori dikirim ke Rekomendasi PO (total pipeline: ${payload.apriori.length})`,
    );
  };

  const sendAll = () => {
    if (!result.rules.length)
      return show("err", "Belum ada rule — hitung Apriori dulu");
    const payload = pushAprioriToPipeline(result.rules);
    show(
      "ok",
      `Semua ${result.rules.length} rule dikirim ke pipeline Rekomendasi PO`,
    );
    return payload;
  };

  const queued = pipeline?.apriori?.length || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analisis Apriori</div>
          <div className="page-subtitle">
            Temukan pola barang yang sering keluar bersamaan → kirim companion
            ke <b>Rekomendasi PO</b>
          </div>
        </div>
        <span
          className="badge-pill"
          style={{
            background: queued ? "rgba(5,150,105,0.12)" : undefined,
            color: queued ? "#059669" : undefined,
          }}
        >
          <i className="fas fa-diagram-project"></i> Pipeline: {queued}{" "}
          companion
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1fr)",
          gap: 12,
        }}
      >
        <div className="panel">
          <div className="panel-head">
            <h3>Parameter Apriori</h3>
          </div>
          <div
            className="panel-body"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              Minimum Support: {support}
              <input
                type="range"
                min="0.02"
                max="0.5"
                step="0.01"
                value={support}
                onChange={(e) => setSupport(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              Minimum Confidence: {confidence}
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              Rentang transaksi
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{
                  display: "block",
                  width: "100%",
                  height: 36,
                  marginTop: 6,
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
            <button
              type="button"
              onClick={run}
              style={{
                height: 40,
                border: 0,
                borderRadius: 8,
                background: "var(--success)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <i className="fas fa-calculator"></i> Hitung Apriori
            </button>

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
                onClick={() => selectTop(5)}
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
                Pilih Top 5
              </button>
              <button
                type="button"
                onClick={sendSelected}
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
                Kirim terpilih → PO
              </button>
              <button
                type="button"
                onClick={sendAll}
                style={{
                  height: 34,
                  border: "1px solid #059669",
                  borderRadius: 8,
                  background: "rgba(5,150,105,0.08)",
                  color: "#059669",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Kirim semua rule
              </button>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                }}
              >
                Rule yang dikirim muncul di menu <b>8. Rekomendasi PO</b>{" "}
                sebagai companion item.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div
              className="panel-body"
              style={{ display: "flex", gap: 30, flexWrap: "wrap" }}
            >
              <div>
                <small>TRANSAKSI</small>
                <strong style={{ display: "block", fontSize: 22 }}>
                  {fmt(result.transactions)}
                </strong>
              </div>
              <div>
                <small>RULES DITEMUKAN</small>
                <strong
                  style={{
                    display: "block",
                    fontSize: 22,
                    color: "var(--success)",
                  }}
                >
                  {fmt(result.total_rules)}
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
              <div>
                <small>DI PIPELINE</small>
                <strong
                  style={{
                    display: "block",
                    fontSize: 22,
                    color: queued ? "#059669" : undefined,
                  }}
                >
                  {queued}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Aturan Asosiasi Barang</h3>
              <span className="badge-pill">centang → kirim ke PO</span>
            </div>
            <div className="panel-body">
              {result.message && (
                <div
                  style={{
                    color: "var(--warning)",
                    padding: 12,
                    background: "var(--warning-bg)",
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  {result.message}
                </div>
              )}
              {result.rules.map((r, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: selected[i]
                      ? "rgba(0,86,179,0.04)"
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[i]}
                    onChange={() => toggle(i)}
                    style={{ marginTop: 4 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>
                      {r.antecedent.name}{" "}
                      <span style={{ color: "var(--success)" }}>→</span>{" "}
                      {r.consequent.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 5,
                      }}
                    >
                      Confidence <b>{pct(r.confidence)}</b> · Support{" "}
                      <b>{pct(r.support)}</b> · Lift{" "}
                      <b
                        style={{
                          color:
                            r.lift >= 1 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {Number(r.lift).toFixed(2)}
                      </b>{" "}
                      · {r.count} transaksi
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      pushAprioriToPipeline([r]);
                      show(
                        "ok",
                        `Companion “${r.consequent.name}” dikirim ke Rekomendasi PO`,
                      );
                    }}
                    style={{
                      height: 32,
                      padding: "0 10px",
                      border: "none",
                      borderRadius: 8,
                      background: "#0056b3",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + ke PO
                  </button>
                </label>
              ))}
              {!result.rules.length && (
                <div style={{ color: "var(--text-muted)", padding: 12 }}>
                  Belum ada rule. Sesuaikan parameter lalu hitung.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
