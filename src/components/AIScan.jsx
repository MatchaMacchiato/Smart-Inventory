import { useEffect, useRef, useState } from "react";
import { aiApi } from "../services/api";

export default function AIScan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);
  const [storeId, setStoreId] = useState("rak-a1");
  const inputRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    aiApi
      .modelInfo()
      .then((res) => setModelInfo(res.data))
      .catch(() =>
        setModelInfo({ service_online: false, model_name: "unreachable" }),
      );
  }, []);

  useEffect(() => {
    if (!preview || !result?.detected_products?.length) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = 640;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const colors = [
        "#0056b3",
        "#059669",
        "#FF7300",
        "#DC2626",
        "#7C3AED",
        "#0EA5E9",
      ];
      result.detected_products.forEach((d, i) => {
        const box = d.bounding_box;
        if (!box) return;
        const x = (box.x || 0) * scale;
        const y = (box.y || 0) * scale;
        const w = (box.w || 40) * scale;
        const h = (box.h || 40) * scale;
        const color = colors[i % colors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        const label = `${d.category || d.name} ${Math.round((d.confidence || 0) * 100)}%`;
        ctx.font = "bold 12px system-ui";
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - 18), tw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 4, Math.max(12, y - 5));
      });
    };
    img.src = preview;
  }, [preview, result]);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const runScan = async () => {
    if (!file) {
      setError("Pilih foto rak dulu");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("store_id", storeId);
      const res = await aiApi.scanShelf(fd);
      setResult(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Scan gagal — cek login + Laravel + AI service",
      );
    } finally {
      setBusy(false);
    }
  };

  const online = modelInfo?.service_online || modelInfo?.model_loaded;

  return (
    <div>
      <div className="page-title">AI Scan Rak · YOLOv8</div>
      <div className="page-subtitle">
        Upload foto rak → deteksi objek + mapping ke kategori produk. Pipeline:
        React → Laravel → Python YOLOv8.
      </div>

      {/* Model status */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div
          className="panel-body"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              fontWeight: 800,
              fontSize: 12,
              background: online
                ? "rgba(5,150,105,0.1)"
                : "rgba(255,115,0,0.12)",
              color: online ? "#059669" : "#FF7300",
            }}
          >
            {online
              ? "● YOLOv8 service online"
              : "● Service offline → Laravel fallback simulasi"}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>
            Model: <b>{modelInfo?.model_name || "…"}</b>
            {modelInfo?.weights ? ` · ${modelInfo.weights}` : ""}
            {modelInfo?.confidence_threshold != null
              ? ` · conf ≥ ${modelInfo.confidence_threshold}`
              : ""}
          </div>
          <div style={{ fontSize: 11, color: "#64748B", marginLeft: "auto" }}>
            {modelInfo?.note ||
              "Train custom weights di Roboflow untuk akurasi produk listrik."}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 1.4fr)",
          gap: 16,
        }}
      >
        <div className="panel">
          <div className="panel-head">
            <h3>Upload Foto Rak</h3>
          </div>
          <div
            className="panel-body"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>
              ID Rak / Store
              <input
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  marginTop: 6,
                  border: "1px solid #E6E8EA",
                  borderRadius: 10,
                  padding: "0 12px",
                }}
              />
            </label>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                  setResult(null);
                }
              }}
              style={{
                border: "2px dashed #94A3B8",
                borderRadius: 14,
                padding: 28,
                textAlign: "center",
                cursor: "pointer",
                background: "#F1F5F9",
                color: "#94A3B8",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 700 }}>
                Klik / drop foto rak di sini
              </div>
              <div style={{ fontSize: 11, marginTop: 4 }}>JPG/PNG max 10MB</div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onPick}
              />
            </div>

            {preview && (
              <img
                src={preview}
                alt="preview"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid #E6E8EA",
                }}
              />
            )}

            {error && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(220,38,38,0.1)",
                  color: "#B91C1C",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={runScan}
              disabled={busy || !file}
              style={{
                height: 44,
                border: "none",
                borderRadius: 12,
                fontWeight: 800,
                color: "#fff",
                cursor: busy || !file ? "not-allowed" : "pointer",
                background: "#0056b3",
                opacity: busy || !file ? 0.6 : 1,
              }}
            >
              {busy ? (
                <>
                  <i
                    className="fas fa-spinner fa-spin"
                    style={{ marginRight: 8 }}
                  ></i>
                  Scanning…
                </>
              ) : (
                <>
                  <i className="fas fa-eye" style={{ marginRight: 8 }}></i>Scan
                  dengan AI
                </>
              )}
            </button>

            <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>
              <b>Cara skripsi-ready:</b> jalankan{" "}
              <code>ai-service/python app.py</code>, set{" "}
              <code>AI_SERVICE_URL</code> di Laravel .env, lalu train custom{" "}
              <code>.pt</code> dari foto toko sendiri.
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Hasil Deteksi</h3>
            {result && (
              <span
                className="badge-pill"
                style={{
                  background:
                    result.mode?.includes("yolo") ||
                    result.mode === "yolov8" ||
                    result.mode === "fallback_mock"
                      ? "rgba(0,86,179,0.09)"
                      : "rgba(255,115,0,0.12)",
                  color: "#004494",
                }}
              >
                mode: {result.mode || "—"}
              </span>
            )}
          </div>
          <div className="panel-body">
            {!result && (
              <div
                style={{ textAlign: "center", color: "#64748B", padding: 48 }}
              >
                Hasil bounding box + mapping produk muncul di sini
              </div>
            )}
            {result && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  {[
                    { l: "Objek/Item", v: result.total_detected },
                    {
                      l: "Avg Confidence",
                      v: `${Math.round((result.accuracy_score || 0) * 100)}%`,
                    },
                    { l: "Waktu", v: `${result.processing_time || 0} ms` },
                  ].map((k) => (
                    <div
                      key={k.l}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#F1F5F9",
                        border: "1px solid #E6E8EA",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: "#64748B",
                          fontWeight: 700,
                        }}
                      >
                        {k.l}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{k.v}</div>
                    </div>
                  ))}
                </div>

                <canvas
                  ref={canvasRef}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #E6E8EA",
                    marginBottom: 14,
                  }}
                />

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#F1F5F9" }}>
                      {["Produk", "Kategori", "Qty est.", "Confidence"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "8px 10px",
                              textAlign: "left",
                              fontSize: 10,
                              color: "#64748B",
                              textTransform: "uppercase",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.detected_products || []).map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #F8FAFC" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>
                          {d.name}
                        </td>
                        <td style={{ padding: "8px 10px" }}>{d.category}</td>
                        <td style={{ padding: "8px 10px" }}>{d.quantity}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color:
                                (d.confidence || 0) > 0.8
                                  ? "#059669"
                                  : "#FF7300",
                            }}
                          >
                            {Math.round((d.confidence || 0) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
