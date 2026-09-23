import { useEffect, useRef, useState, useMemo } from "react";
import { resolveModelUrl } from "../data/products";

export default function ARViewer({ product, onBack }) {
  const modelRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [modelError, setModelError] = useState(false);

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    setModelError(false);
  }, [product?.id]);

  const modelUrl = resolveModelUrl(product);
  const fileName = modelUrl.split("/").pop();

  // Scale model biar keliatan full
  const modelScale = useMemo(() => {
    const cat = product?.category || "";
    if (cat === "MCB") return "1.5 1.5 1.5";
    if (cat === "Kabel") return "1.8 1.8 1.8";
    if (cat === "Fitting") return "1.5 1.5 1.5";
    if (cat === "Saklar" || cat === "Stop Kontak" || cat === "Steker")
      return "1.8 1.8 1.8";
    if (cat === "Panel") return "1.2 1.2 1.2";
    if (cat === "Lampu") return "1.5 1.5 1.5";
    if (cat === "Aksesoris") return "1.5 1.5 1.5";
    return "1.8 1.8 1.8";
  }, [product?.category]);
  const specs = product.specifications
    ? Object.entries(product.specifications).map(([k, v]) => ({
        label: k,
        value: v,
      }))
    : [];

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
            }}
          >
            <i
              className="fas fa-cube"
              style={{ color: "#0056b3", marginRight: 8 }}
            ></i>
            {product.name}
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
            <span>{product.category}</span>
            <span>·</span>
            <span style={{ color: "#0056b3", fontWeight: 600 }}>
              3D: {fileName}
            </span>
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "9px 20px",
            border: "1px solid #E6E8EA",
            borderRadius: 10,
            background: "#fff",
            color: "#475569",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="fas fa-arrow-left"></i> Kembali
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E6E8EA",
            borderRadius: 16,
            padding: 20,
            minHeight: 400,
          }}
        >
          {modelError ? (
            <div
              style={{
                height: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#F1F5F9",
                borderRadius: 12,
                color: "#64748B",
              }}
            >
              <i
                className="fas fa-cube"
                style={{ fontSize: 48, marginBottom: 12 }}
              ></i>
              <div>Model 3D gagal dimuat</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{modelUrl}</div>
            </div>
          ) : (
            <model-viewer
              ref={modelRef}
              src={modelUrl}
              alt={product.name}
              ar={isMobile}
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              ar-placement="floor"
              camera-controls
              camera-orbit="0deg 75deg auto"
              min-camera-orbit="auto auto 0.3m"
              max-camera-orbit="auto auto 20m"
              shadow-intensity="1"
              auto-rotate
              auto-rotate-delay="500"
              rotation-per-second="15deg"
              scale={modelScale}
              touch-action="pan-y"
              interaction-prompt="auto"
              style={{
                width: "100%",
                height: "400px",
                background: "#F8FAFC",
                borderRadius: 12,
              }}
              onError={() => setModelError(true)}
            ></model-viewer>
          )}
          {isMobile && (
            <button
              onClick={() => modelRef.current?.activateAR?.()}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: 10,
                background: "#0056b3",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,86,179,0.25)",
              }}
            >
              <i className="fas fa-camera"></i> Lihat di AR
            </button>
          )}
          {!isMobile && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 20px",
                borderRadius: 10,
                background: "rgba(6,182,212,0.1)",
                color: "#0EA5E9",
                fontSize: 13,
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              <i className="fas fa-info-circle"></i> Buka di HP untuk mode AR
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E6E8EA",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 16,
                fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
              }}
            >
              <i
                className="fas fa-info-circle"
                style={{ color: "#0056b3", marginRight: 8 }}
              ></i>
              Informasi Produk
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Kategori", value: product.category },
                { label: "SKU", value: product.sku || "-" },
                ...specs.map((s) => ({
                  label: s.label.charAt(0).toUpperCase() + s.label.slice(1),
                  value: s.value,
                })),
                {
                  label: "Harga",
                  value: `Rp ${Number(product.price).toLocaleString()}`,
                },
                {
                  label: "Stok",
                  value: `${product.stock} unit`,
                  color:
                    product.stock <= product.min_stock ? "#DC2626" : "#059669",
                },
                { label: "Min. Stok", value: product.min_stock },
                { label: "Model 3D", value: fileName },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid #E6E8EA",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#475569" }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: item.color || "#002a5c",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
