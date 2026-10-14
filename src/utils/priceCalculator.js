import QRCode from "qrcode";

export const PRESET_DISCOUNTS = [
  { label: "25% + 10%", d1: 25, d2: 10, d3: 0, expr: "25+10" },
  { label: "30% + 10%", d1: 30, d2: 10, d3: 0, expr: "30+10" },
  { label: "20% + 10%", d1: 20, d2: 10, d3: 0, expr: "20+10" },
  { label: "35% + 10%", d1: 35, d2: 10, d3: 0, expr: "35+10" },
  { label: "25%", d1: 25, d2: 0, d3: 0, expr: "25" },
  { label: "20%", d1: 20, d2: 0, d3: 0, expr: "20" },
  { label: "Netto (0%)", d1: 0, d2: 0, d3: 0, expr: "0" },
];

export const ROUNDING_OPTIONS = [
  { id: "1000", label: "Ke Atas Rp 1.000 (Rekomendasi)", step: 1000, desc: "11.272 → 12.000" },
  { id: "500", label: "Ke Atas Rp 500", step: 500, desc: "11.272 → 11.500" },
  { id: "100", label: "Ke Atas Rp 100", step: 100, desc: "11.272 → 11.300" },
  { id: "none", label: "Eksak (Tanpa Pembulatan)", step: 1, desc: "11.272 tetap 11.272" },
];

/**
 * Parsing ekspresi diskon seperti "25+10", "30%+10%", "25 + 10 + 5"
 */
export function parseDiscountExpr(expr = "") {
  const cleaned = String(expr).replace(/%/g, "").trim();
  const parts = cleaned.split(/[+\s,/]+/).filter(Boolean).map(Number);
  const d1 = parts.length > 0 && !isNaN(parts[0]) ? parts[0] : 0;
  const d2 = parts.length > 1 && !isNaN(parts[1]) ? parts[1] : 0;
  const d3 = parts.length > 2 && !isNaN(parts[2]) ? parts[2] : 0;
  return { d1, d2, d3 };
}

/**
 * Format string diskon untuk label tampilan (contoh: "25% + 10%")
 */
export function formatDiscountFormula(d1 = 0, d2 = 0, d3 = 0) {
  const list = [d1, d2, d3].filter((n) => Number(n) > 0);
  return list.length ? list.map((n) => `${n}%`).join(" + ") : "Netto";
}

/**
 * Kalkulasi diskon bertingkat:
 * Contoh: 16.700 disc 25% + 10%
 * Step 1: 16.700 - 25% = 12.525
 * Step 2: 12.525 - 10% = 11.272,5
 * Pembulatan ke atas (1000) = 12.000
 */
export function calculateMultiDiscount({
  basePrice,
  d1 = 0,
  d2 = 0,
  d3 = 0,
  rounding = "1000",
}) {
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

  const roundingDiff = roundedPrice - rawPrice;

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
    roundingDiff,
  };
}

/**
 * Fungsi mencetak Label Harga (Price Tag / Label Rak)
 */
export async function printSinglePriceTag({
  product,
  basePrice,
  finalPrice,
  discountFormula = "",
}) {
  const printWin = window.open("", "_blank", "width=850,height=700");
  if (!printWin) {
    alert("Popup blocker menghalangi jendela cetak. Silakan izinkan pop-up di browser.");
    return;
  }

  const formatRp = (n) => Number(n || 0).toLocaleString("id-ID");

  const scanUrl = `${window.location.origin}/scan/${product?.id || ""}`;
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch (e) {
    console.error("Gagal generate QR Code:", e);
  }

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const hasDiscount = Number(basePrice) > Number(finalPrice) && discountFormula && discountFormula !== "Netto";

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Label Harga - ${product?.name || "Produk"}</title>
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
          width: 440px;
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
          font-size: 15px;
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
          background: ${hasDiscount ? "#FEF2F2" : "#F8FAFC"};
          border: 2px solid ${hasDiscount ? "#DC2626" : "#E2E8F0"};
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
          font-size: 30px;
          font-weight: 900;
          color: ${hasDiscount ? "#DC2626" : "#0056b3"};
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
            hasDiscount
              ? `
                <div class="tag-normal-price">Rp ${formatRp(basePrice)}</div>
                <div class="tag-discount-badge">DISC ${discountFormula}</div>
              `
              : ""
          }
          <div class="tag-final-label">HARGA JUAL NETTO</div>
          <div class="tag-final-price">Rp ${formatRp(finalPrice)}</div>
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
}
