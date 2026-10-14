import { useState, useMemo, useEffect, useRef } from "react";
import QRCode from "qrcode";
import Modal from "./Modal";

const formatRp = (n) => Number(n || 0).toLocaleString("id-ID");

const PRESET_DISCOUNTS = [
  { label: "25% + 10%", d1: 25, d2: 10, d3: 0 },
  { label: "30% + 10%", d1: 30, d2: 10, d3: 0 },
  { label: "20% + 10%", d1: 20, d2: 10, d3: 0 },
  { label: "35% + 10%", d1: 35, d2: 10, d3: 0 },
  { label: "25%", d1: 25, d2: 0, d3: 0 },
  { label: "20%", d1: 20, d2: 0, d3: 0 },
  { label: "15%", d1: 15, d2: 0, d3: 0 },
  { label: "10%", d1: 10, d2: 0, d3: 0 },
  { label: "Netto (0%)", d1: 0, d2: 0, d3: 0 },
];

const ROUNDING_OPTIONS = [
  { id: "1000", label: "Ke Atas Rp 1.000", step: 1000, desc: "11.272 → 12.000 (Default Toko)" },
  { id: "500", label: "Ke Atas Rp 500", step: 500, desc: "11.272 → 11.500" },
  { id: "100", label: "Ke Atas Rp 100", step: 100, desc: "11.272 → 11.300" },
  { id: "none", label: "Eksak (Tanpa Pembulatan)", step: 1, desc: "11.272 tetap 11.272" },
];

/**
 * Kalkulasi diskon bertingkat:
 * Contoh: 16.700 disc 25% + 10%
 * Step 1: 16.700 - (16.700 * 25%) = 12.525
 * Step 2: 12.525 - (12.525 * 10%) = 11.272,5 (11.272)
 * Pembulatan ke atas (1000) = 12.000
 */
export function calculateMultiDiscount({ basePrice, d1 = 0, d2 = 0, d3 = 0, rounding = "1000", manualPrice = null }) {
  const base = Math.max(0, Number(basePrice) || 0);
  const p1 = Math.max(0, Math.min(100, Number(d1) || 0));
  const p2 = Math.max(0, Math.min(100, Number(d2) || 0));
  const p3 = Math.max(0, Math.min(100, Number(d3) || 0));

  // Step 1
  const cut1 = base * (p1 / 100);
  const after1 = base - cut1;

  // Step 2
  const cut2 = after1 * (p2 / 100);
  const after2 = after1 - cut2;

  // Step 3
  const cut3 = after2 * (p3 / 100);
  const after3 = after2 - cut3;

  const rawPrice = after3;
  const totalCut = base - rawPrice;
  const effectivePct = base > 0 ? (totalCut / base) * 100 : 0;

  // Pembulatan ke atas
  let roundedPrice = rawPrice;
  if (rounding === "1000") {
    roundedPrice = Math.ceil(rawPrice / 1000) * 1000;
  } else if (rounding === "500") {
    roundedPrice = Math.ceil(rawPrice / 500) * 500;
  } else if (rounding === "100") {
    roundedPrice = Math.ceil(rawPrice / 100) * 100;
  } else {
    roundedPrice = Math.round(rawPrice);
  }

  // Jika user memasukkan harga manual
  const finalPrice = manualPrice != null && manualPrice !== "" && Number(manualPrice) > 0
    ? Number(manualPrice)
    : roundedPrice;

  const roundingDiff = finalPrice - rawPrice;

  return {
    base,
    p1,
    p2,
    p3,
    cut1,
    after1,
    cut2,
    after2,
    cut3,
    after3,
    rawPrice,
    totalCut,
    effectivePct,
    roundedPrice,
    finalPrice,
    roundingDiff,
  };
}

export default function PriceCalculatorModal({
  isOpen,
  onClose,
  product,
  onSavePrice,
}) {
  const [activeTab, setActiveTab] = useState("calc"); // 'calc' | 'preview'
  const [basePrice, setBasePrice] = useState("");
  const [d1, setD1] = useState(25);
  const [d2, setD2] = useState(10);
  const [d3, setD3] = useState(0);
  const [customExpr, setCustomExpr] = useState("25+10");
  const [rounding, setRounding] = useState("1000"); // default '1000' -> pembulatan ke atas ribuan
  const [manualPrice, setManualPrice] = useState("");
  const [labelTemplate, setLabelTemplate] = useState("shelf"); // 'shelf' | 'compact' | 'promo'
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [savedAlert, setSavedAlert] = useState(false);

  // Inisialisasi saat produk dibuka
  useEffect(() => {
    if (!product || !isOpen) return;

    // Default base price: jika produk punya base_price gunakan itu, jika tidak gunakan harga saat ini
    const initialBase = product.base_price || product.price || 16700;
    setBasePrice(String(initialBase));
    setD1(25);
    setD2(10);
    setD3(0);
    setCustomExpr("25+10");
    setRounding("1000");
    setManualPrice("");
    setActiveTab("calc");
    setSavedAlert(false);

    // Generate QR Code data URL
    const scanUrl = `${window.location.origin}/scan/${product.id}`;
    QRCode.toDataURL(
      scanUrl,
      {
        width: 140,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      },
      (err, url) => {
        if (!err && url) setQrDataUrl(url);
      }
    );
  }, [product, isOpen]);

  // Parser custom expression (misal: "25+10" atau "30%+10%" atau "25 + 10 + 5")
  const handleCustomExprChange = (val) => {
    setCustomExpr(val);
    const cleaned = val.replace(/%/g, "").trim();
    const parts = cleaned.split(/[+\s,/]+/).filter(Boolean).map(Number);
    if (parts.length > 0 && !isNaN(parts[0])) setD1(parts[0]);
    if (parts.length > 1 && !isNaN(parts[1])) setD2(parts[1]);
    else setD2(0);
    if (parts.length > 2 && !isNaN(parts[2])) setD3(parts[2]);
    else setD3(0);
  };

  const applyPreset = (preset) => {
    setD1(preset.d1);
    setD2(preset.d2);
    setD3(preset.d3);
    const expr = [preset.d1, preset.d2, preset.d3].filter(Boolean).join("+");
    setCustomExpr(expr || "0");
    setManualPrice("");
  };

  // Kalkulasi reaktif
  const calc = useMemo(() => {
    return calculateMultiDiscount({
      basePrice: Number(basePrice) || 0,
      d1,
      d2,
      d3,
      rounding,
      manualPrice,
    });
  }, [basePrice, d1, d2, d3, rounding, manualPrice]);

  // HPP dan Margin
  const cost = Number(product?.cost || 0);
  const grossProfit = calc.finalPrice - cost;
  const marginPct = cost > 0 ? Math.round((grossProfit / cost) * 100) : 0;

  // Format rumus diskon untuk display
  const discountFormulaStr = useMemo(() => {
    const list = [d1, d2, d3].filter((n) => Number(n) > 0);
    return list.length ? list.map((n) => `${n}%`).join(" + ") : "Netto (0%)";
  }, [d1, d2, d3]);

  // Handler Simpan
  const handleSave = () => {
    if (!product || !onSavePrice) return;
    onSavePrice(product.id, calc.finalPrice, {
      base_price: Number(basePrice) || product.price,
      discount_formula: discountFormulaStr,
      rounded_price: calc.roundedPrice,
      raw_discounted_price: Math.round(calc.rawPrice),
      price_updated_at: new Date().toISOString(),
    });
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  // Handler Print Price Tag
  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=850,height=700");
    if (!printWin) {
      alert("Popup blocker menghalangi jendela cetak. Izinkan pop-up di browser.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const isPromo = labelTemplate === "promo";
    const isCompact = labelTemplate === "compact";

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Price Tag - ${product?.name || "Produk"}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          body {
            background: #fff;
            color: #0f172a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 10px;
          }
          .tag-card {
            width: ${isCompact ? "320px" : "440px"};
            border: 2.5px solid #0f172a;
            border-radius: 12px;
            padding: 14px 16px;
            background: #ffffff;
            box-shadow: none;
            position: relative;
            page-break-inside: avoid;
          }
          .tag-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .tag-brand {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            color: #0056b3;
            text-transform: uppercase;
          }
          .tag-store {
            font-size: 9px;
            font-weight: 600;
            color: #64748b;
          }
          .tag-body {
            display: flex;
            gap: 12px;
            margin-bottom: 10px;
          }
          .tag-info {
            flex: 1;
            min-width: 0;
          }
          .tag-title {
            font-size: ${isCompact ? "13px" : "15px"};
            font-weight: 800;
            line-height: 1.25;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .tag-sku {
            font-size: 10px;
            font-weight: 700;
            color: #475569;
            background: #f1f5f9;
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 4px;
          }
          .tag-spec {
            font-size: 10px;
            color: #64748b;
          }
          .tag-qr {
            width: 70px;
            text-align: center;
          }
          .tag-qr img {
            width: 65px;
            height: 65px;
            display: block;
            margin: 0 auto;
          }
          .tag-qr span {
            font-size: 8px;
            color: #64748b;
            display: block;
            margin-top: 2px;
          }
          .tag-price-box {
            background: ${isPromo ? "#FEF2F2" : "#F8FAFC"};
            border: 2px solid ${isPromo ? "#DC2626" : "#E2E8F0"};
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
            margin-bottom: 8px;
          }
          .tag-normal-price {
            font-size: 11px;
            color: #64748b;
            text-decoration: line-through;
            margin-bottom: 2px;
          }
          .tag-discount-badge {
            display: inline-block;
            background: #DC2626;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 4px;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .tag-final-label {
            font-size: 9px;
            font-weight: 800;
            color: #475569;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          .tag-final-price {
            font-size: ${isCompact ? "24px" : "30px"};
            font-weight: 900;
            color: ${isPromo ? "#DC2626" : "#0056b3"};
            line-height: 1.1;
            letter-spacing: -0.5px;
          }
          .tag-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8.5px;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 6px;
          }
          .cut-line {
            position: absolute;
            bottom: -12px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .tag-card {
              border-color: #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="tag-card">
          <div class="tag-header">
            <div>
              <div class="tag-brand">KDM INVENTORY PRO</div>
              <div class="tag-store">PT. KEMILAU ABADI MAKMUR · TOKO LISTRIK</div>
            </div>
            <div style="font-size: 9px; font-weight: 700; color: #0056b3; border: 1px solid #0056b3; padding: 2px 6px; border-radius: 4px;">
              ${product?.category || "ELEKTRIK"}
            </div>
          </div>

          <div class="tag-body">
            <div class="tag-info">
              <div class="tag-title">${product?.name || "Nama Barang"}</div>
              <div class="tag-sku">SKU: ${product?.sku || product?.barcode || "-"}</div>
              ${product?.supplier ? `<div class="tag-spec">Dist: ${product.supplier}</div>` : ""}
            </div>
            <div class="tag-qr">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ""}
              <span>Scan Item</span>
            </div>
          </div>

          <div class="tag-price-box">
            ${
              Number(basePrice) > calc.finalPrice
                ? `
                  <div class="tag-normal-price">Rp ${formatRp(basePrice)}</div>
                  <div class="tag-discount-badge">DISC ${discountFormulaStr}</div>
                `
                : ""
            }
            <div class="tag-final-label">HARGA JUAL NETTO</div>
            <div class="tag-final-price">Rp ${formatRp(calc.finalPrice)}</div>
          </div>

          <div class="tag-footer">
            <span>*Sudah Termasuk PPN · Harga per ${product?.unit || "pcs"}</span>
            <span>Update: ${todayStr}</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  if (!isOpen || !product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" maxWidth="720px">
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "88vh" }}>
        {/* Header Modal */}
        <div
          style={{
            padding: "18px 24px 16px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FAFAFA",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "linear-gradient(135deg, #0056b3 0%, #1D4ED8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                boxShadow: "0 4px 12px rgba(0,86,179,0.25)",
              }}
            >
              <i className="fas fa-calculator"></i>
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                Kalkulator &amp; Edit Harga Produk
              </h3>
              <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0 0" }}>
                Perhitungan diskon bertingkat (25%+10%), pembulatan otomatis ke atas &amp; cetak label rak
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#F1F5F9",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748B",
              cursor: "pointer",
              fontSize: 14,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E2E8F0";
              e.currentTarget.style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #E2E8F0",
            padding: "0 24px",
            background: "#fff",
          }}
        >
          <button
            onClick={() => setActiveTab("calc")}
            style={{
              padding: "12px 18px",
              border: "none",
              background: "none",
              fontSize: 13,
              fontWeight: 700,
              color: activeTab === "calc" ? "#0056b3" : "#64748B",
              borderBottom: activeTab === "calc" ? "2.5px solid #0056b3" : "2.5px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="fas fa-calculator"></i>
            Kalkulator &amp; Diskon
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            style={{
              padding: "12px 18px",
              border: "none",
              background: "none",
              fontSize: 13,
              fontWeight: 700,
              color: activeTab === "preview" ? "#0056b3" : "#64748B",
              borderBottom: activeTab === "preview" ? "2.5px solid #0056b3" : "2.5px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="fas fa-print"></i>
            Pratinjau &amp; Cetak Label (Price Tag)
          </button>
        </div>

        {/* Isi Modal Scrollable */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Card Info Produk Ringkas */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={product.image_url || product.image || "/images/products/mcb_schneider_1p.jpg"}
                alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/products/mcb_schneider_1p.jpg";
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {product.name}
              </div>
              <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", gap: 12, marginTop: 2 }}>
                <span>SKU: <b>{product.sku || "-"}</b></span>
                <span>Kategori: <b>{product.category}</b></span>
                <span>Stok: <b>{product.stock} {product.unit || "pcs"}</b></span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>Harga Jual Saat Ini</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0056b3" }}>
                Rp {formatRp(product.price)}
              </div>
            </div>
          </div>

          {activeTab === "calc" ? (
            <div>
              {/* Form Input 2 Kolom */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Kolom 1: Harga Dasar / Pricelist */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    1. Harga Pricelist / Katalog (Rp) <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#64748B",
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => {
                        setBasePrice(e.target.value);
                        setManualPrice("");
                      }}
                      placeholder="16700"
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 40px",
                        borderRadius: 8,
                        border: "1.5px solid #CBD5E1",
                        fontSize: 14,
                        fontWeight: 700,
                        outline: "none",
                        color: "#0F172A",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setBasePrice(String(product.price || 16700))}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                        color: "#0056b3",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Pakai Harga Saat Ini ({formatRp(product.price)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasePrice("16700")}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                        color: "#64748B",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Contoh 16.700
                    </button>
                  </div>
                </div>

                {/* Kolom 2: Diskon Cepat / Preset */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    2. Diskon Bertingkat (Ketik: 25+10)
                  </label>
                  <input
                    type="text"
                    value={customExpr}
                    onChange={(e) => handleCustomExprChange(e.target.value)}
                    placeholder="Contoh: 25+10"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 14,
                      fontWeight: 700,
                      outline: "none",
                      color: "#0F172A",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                    Aktif: Diskon 1: <b>{d1}%</b> | Diskon 2: <b>{d2}%</b> {d3 > 0 ? `| Diskon 3: ${d3}%` : ""}
                  </div>
                </div>
              </div>

              {/* Chips Preset Diskon Cepat */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>
                  PILIHAN CEPAT DISKON TOKO LISTRIK:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PRESET_DISCOUNTS.map((preset) => {
                    const isSelected = d1 === preset.d1 && d2 === preset.d2 && d3 === preset.d3;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: isSelected ? "1.5px solid #0056b3" : "1px solid #CBD5E1",
                          background: isSelected ? "rgba(0,86,179,0.09)" : "#fff",
                          color: isSelected ? "#0056b3" : "#334155",
                          transition: "all 0.15s",
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aturan Pembulatan Otomatis ke Atas */}
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1.5px solid #86EFAC",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="fas fa-arrow-up-right-dots" style={{ color: "#16A34A", fontSize: 14 }}></i>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#14532D" }}>
                      Pembulatan Nominal ke Atas Otomatis
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "2px 8px", borderRadius: 999 }}>
                    Sesuai Permintaan
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                  {ROUNDING_OPTIONS.map((opt) => {
                    const isSelected = rounding === opt.id;
                    return (
                      <label
                        key={opt.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: isSelected ? "#fff" : "rgba(255,255,255,0.6)",
                          border: isSelected ? "1.5px solid #16A34A" : "1px solid #CBD5E1",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? "#14532D" : "#334155",
                        }}
                      >
                        <input
                          type="radio"
                          name="rounding"
                          value={opt.id}
                          checked={isSelected}
                          onChange={(e) => setRounding(e.target.value)}
                        />
                        <div>
                          <div>{opt.label}</div>
                          <div style={{ fontSize: 10, color: "#64748B", fontWeight: 400 }}>{opt.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Rincian Kalkulasi Live Step-by-Step */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Rincian Simulasi Perhitungan
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                    <span>Harga Pricelist Awal:</span>
                    <span style={{ fontWeight: 700, color: "#0F172A" }}>Rp {formatRp(calc.base)}</span>
                  </div>

                  {calc.p1 > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#DC2626" }}>
                      <span>Potongan Diskon 1 ({calc.p1}%):</span>
                      <span style={{ fontWeight: 700 }}>- Rp {formatRp(Math.round(calc.cut1))} → (Sisa: Rp {formatRp(Math.round(calc.after1))})</span>
                    </div>
                  )}

                  {calc.p2 > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#DC2626" }}>
                      <span>Potongan Diskon 2 ({calc.p2}%):</span>
                      <span style={{ fontWeight: 700 }}>- Rp {formatRp(Math.round(calc.cut2))} → (Sisa: Rp {formatRp(Math.round(calc.after2))})</span>
                    </div>
                  )}

                  {calc.p3 > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#DC2626" }}>
                      <span>Potongan Diskon 3 ({calc.p3}%):</span>
                      <span style={{ fontWeight: 700 }}>- Rp {formatRp(Math.round(calc.cut3))} → (Sisa: Rp {formatRp(Math.round(calc.after3))})</span>
                    </div>
                  )}

                  <div style={{ borderTop: "1px dashed #CBD5E1", margin: "4px 0" }}></div>

                  <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                    <span>Harga Bersih Sebelum Dibulatkan:</span>
                    <span style={{ fontWeight: 700, color: "#475569" }}>Rp {formatRp(Math.round(calc.rawPrice))}</span>
                  </div>

                  {calc.roundingDiff !== 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#16A34A" }}>
                      <span>Penyesuaian Pembulatan ke Atas:</span>
                      <span style={{ fontWeight: 700 }}>+ Rp {formatRp(Math.round(calc.roundingDiff))}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#EFF6FF",
                      border: "1.5px solid #BFDBFE",
                      padding: "10px 14px",
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#1E40AF", textTransform: "uppercase" }}>
                        Harga Jual Final (Hasil Dibulatkan)
                      </div>
                      <div style={{ fontSize: 11, color: "#3B82F6" }}>
                        Diskon Efektif: {calc.effectivePct.toFixed(1)}% ({discountFormulaStr})
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#0056b3" }}>
                      Rp {formatRp(calc.finalPrice)}
                    </div>
                  </div>
                </div>

                {/* HPP & Margin Check */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid #E2E8F0",
                    fontSize: 11.5,
                  }}
                >
                  <span style={{ color: "#64748B" }}>
                    HPP (Modal Beli): <b>Rp {formatRp(cost)}</b>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: grossProfit >= 0 ? "#15803D" : "#DC2626",
                    }}
                  >
                    Laba Bersih: Rp {formatRp(grossProfit)} ({marginPct > 0 ? `+${marginPct}%` : `${marginPct}%`})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: PRATINJAU & CETAK LABEL HARGA (PRICE TAG) */
            <div>
              {/* Opsi Template */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {[
                  { id: "shelf", label: "Label Rak Toko (8 x 5 cm)", icon: "fa-tag" },
                  { id: "compact", label: "Stiker Barcode Mini (5 x 3 cm)", icon: "fa-barcode" },
                  { id: "promo", label: "Label Promo Spesial", icon: "fa-percent" },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setLabelTemplate(tpl.id)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: labelTemplate === tpl.id ? "1.5px solid #0056b3" : "1px solid #CBD5E1",
                      background: labelTemplate === tpl.id ? "rgba(0,86,179,0.08)" : "#fff",
                      color: labelTemplate === tpl.id ? "#0056b3" : "#334155",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <i className={`fas ${tpl.icon}`}></i>
                    {tpl.label}
                  </button>
                ))}
              </div>

              {/* Box Preview Label yang siap cetak */}
              <div
                style={{
                  background: "#F1F5F9",
                  padding: 24,
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "1px dashed #CBD5E1",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: labelTemplate === "compact" ? 300 : 380,
                    background: "#ffffff",
                    border: "2px solid #0F172A",
                    borderRadius: 10,
                    padding: "14px 16px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                    position: "relative",
                  }}
                >
                  {/* Brand & Store */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1.5px solid #0F172A",
                      paddingBottom: 6,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "#0056b3", letterSpacing: 0.6 }}>
                        KDM INVENTORY PRO
                      </div>
                      <div style={{ fontSize: 8.5, color: "#64748B" }}>
                        PT. KEMILAU ABADI MAKMUR
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#0056b3",
                        background: "rgba(0,86,179,0.08)",
                        padding: "1px 6px",
                        borderRadius: 4,
                        border: "1px solid rgba(0,86,179,0.2)",
                      }}
                    >
                      {product.category}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: labelTemplate === "compact" ? 12 : 13.5, fontWeight: 800, color: "#0F172A", lineHeight: 1.25 }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 9.5, color: "#475569", marginTop: 3 }}>
                        SKU: <b>{product.sku || product.barcode || "-"}</b>
                      </div>
                    </div>
                    {qrDataUrl && (
                      <div style={{ width: 55, textAlign: "center", flexShrink: 0 }}>
                        <img src={qrDataUrl} alt="QR Code" style={{ width: 50, height: 50, display: "block", margin: "0 auto" }} />
                        <span style={{ fontSize: 7.5, color: "#64748B" }}>Scan QR</span>
                      </div>
                    )}
                  </div>

                  {/* Price Tag Highlight */}
                  <div
                    style={{
                      background: labelTemplate === "promo" ? "#FEF2F2" : "#F8FAFC",
                      border: labelTemplate === "promo" ? "1.5px solid #FCA5A5" : "1.5px solid #E2E8F0",
                      borderRadius: 8,
                      padding: "8px 10px",
                      textAlign: "center",
                      marginBottom: 6,
                    }}
                  >
                    {Number(basePrice) > calc.finalPrice && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: "#64748B", textDecoration: "line-through" }}>
                          Rp {formatRp(basePrice)}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            background: "#DC2626",
                            color: "#fff",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          DISC {discountFormulaStr}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 8.5, fontWeight: 800, color: "#475569", letterSpacing: 0.6 }}>
                      HARGA JUAL NETTO
                    </div>
                    <div
                      style={{
                        fontSize: labelTemplate === "compact" ? 22 : 26,
                        fontWeight: 900,
                        color: labelTemplate === "promo" ? "#DC2626" : "#0056b3",
                        letterSpacing: -0.5,
                      }}
                    >
                      Rp {formatRp(calc.finalPrice)}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#64748B", borderTop: "1px dashed #CBD5E1", paddingTop: 4 }}>
                    <span>*Termasuk PPN · per {product.unit || "pcs"}</span>
                    <span>Tgl: {new Date().toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Keterangan Cetak */}
              <div style={{ fontSize: 12, color: "#475569", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="fas fa-info-circle" style={{ color: "#2563EB", fontSize: 16 }}></i>
                <span>
                  Tombol <b>Cetak Sekarang</b> akan langsung membuka jendela cetak sistem (kompatibel dengan printer kertas biasa A4 maupun printer label thermal/barcode).
                </span>
              </div>
            </div>
          )}

          {/* Alert Sukses Simpan */}
          {savedAlert && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: "#DCFCE7",
                border: "1px solid #86EFAC",
                color: "#15803D",
                fontSize: 12.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fas fa-check-circle"></i>
              Harga baru Rp {formatRp(calc.finalPrice)} berhasil disimpan ke produk "{product.name}"!
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#FAFAFA",
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              background: "#fff",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tutup
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #0056b3",
                background: "#fff",
                color: "#0056b3",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="fas fa-print"></i>
              Cetak Label Harga (Print)
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #0056b3 0%, #1D4ED8 100%)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(0,86,179,0.3)",
              }}
            >
              <i className="fas fa-check"></i>
              Simpan Harga (Rp {formatRp(calc.finalPrice)})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
