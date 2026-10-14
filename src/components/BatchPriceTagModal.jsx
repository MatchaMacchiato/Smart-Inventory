import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
import Modal from "./Modal";

const formatRp = (n) => Number(n || 0).toLocaleString("id-ID");

export default function BatchPriceTagModal({
  isOpen,
  onClose,
  products = [],
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [discountStr, setDiscountStr] = useState("25+10");
  const [d1, setD1] = useState(25);
  const [d2, setD2] = useState(10);
  const [rounding, setRounding] = useState("1000"); // round up 1000 default
  const [qrMap, setQrMap] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen || !products.length) return;
    // Default select first 8 products or all if less than 8
    setSelectedIds(products.slice(0, 8).map((p) => String(p.id)));

    // Generate QR codes for all products
    const baseUrl = window.location.origin;
    const newQrMap = {};
    let pending = products.length;

    products.forEach((p) => {
      const scanUrl = `${baseUrl}/scan/${p.id}`;
      QRCode.toDataURL(
        scanUrl,
        { width: 100, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } },
        (err, url) => {
          if (!err && url) newQrMap[p.id] = url;
          pending--;
          if (pending === 0) setQrMap(newQrMap);
        }
      );
    });
  }, [isOpen, products]);

  const handleDiscountChange = (val) => {
    setDiscountStr(val);
    const cleaned = val.replace(/%/g, "").trim();
    const parts = cleaned.split(/[+\s,/]+/).filter(Boolean).map(Number);
    if (parts.length > 0 && !isNaN(parts[0])) setD1(parts[0]);
    if (parts.length > 1 && !isNaN(parts[1])) setD2(parts[1]);
    else setD2(0);
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedProducts = useMemo(() => {
    const set = new Set(selectedIds.map(String));
    return products.filter((p) => set.has(String(p.id)));
  }, [products, selectedIds]);

  const toggleSelect = (id) => {
    const sId = String(id);
    setSelectedIds((prev) =>
      prev.includes(sId) ? prev.filter((x) => x !== sId) : [...prev, sId]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => String(p.id)));
    }
  };

  const calculateItemPrice = (p) => {
    const base = Number(p.base_price || p.price || 0);
    const cut1 = base * (d1 / 100);
    const after1 = base - cut1;
    const cut2 = after1 * (d2 / 100);
    const after2 = after1 - cut2;
    const raw = after2;

    let rounded = raw;
    if (rounding === "1000") rounded = Math.ceil(raw / 1000) * 1000;
    else if (rounding === "500") rounded = Math.ceil(raw / 500) * 500;
    else if (rounding === "100") rounded = Math.ceil(raw / 100) * 100;
    else rounded = Math.round(raw);

    return { base, rounded, raw };
  };

  const handlePrintBatch = () => {
    if (!selectedProducts.length) {
      alert("Pilih minimal satu produk untuk dicetak!");
      return;
    }

    const printWin = window.open("", "_blank", "width=900,height=750");
    if (!printWin) {
      alert("Popup blocker menghalangi jendela cetak. Izinkan pop-up di browser.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const itemsHtml = selectedProducts
      .map((p) => {
        const { base, rounded } = calculateItemPrice(p);
        const qr = qrMap[p.id] || "";
        return `
          <div class="tag-card">
            <div class="tag-header">
              <div>
                <div class="tag-brand">KDM INVENTORY PRO</div>
                <div class="tag-store">PT. KEMILAU ABADI MAKMUR</div>
              </div>
              <span class="tag-cat">${p.category || "ELEKTRIK"}</span>
            </div>

            <div class="tag-body">
              <div class="tag-info">
                <div class="tag-title">${p.name}</div>
                <div class="tag-sku">SKU: ${p.sku || p.barcode || "-"}</div>
                ${p.supplier ? `<div class="tag-spec">Dist: ${p.supplier}</div>` : ""}
              </div>
              ${
                qr
                  ? `
                <div class="tag-qr">
                  <img src="${qr}" alt="QR" />
                  <span>Scan Item</span>
                </div>
              `
                  : ""
              }
            </div>

            <div class="tag-price-box">
              ${
                base > rounded
                  ? `
                <div class="tag-strike">Rp ${formatRp(base)} <span class="tag-disc">DISC ${discountStr}%</span></div>
              `
                  : ""
              }
              <div class="tag-price-lbl">HARGA JUAL NETTO</div>
              <div class="tag-price">Rp ${formatRp(rounded)}</div>
            </div>

            <div class="tag-footer">
              <span>*Termasuk PPN · per ${p.unit || "pcs"}</span>
              <span>Update: ${todayStr}</span>
            </div>
          </div>
        `;
      })
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Cetak Label Rak Kolektif - KDM</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          }
          body {
            background: #fff;
            padding: 10px;
          }
          .sheet-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .tag-card {
            border: 2px dashed #0f172a;
            border-radius: 8px;
            padding: 12px 14px;
            background: #fff;
            page-break-inside: avoid;
          }
          .tag-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }
          .tag-brand {
            font-size: 10px;
            font-weight: 900;
            color: #0056b3;
            letter-spacing: 0.5px;
          }
          .tag-store {
            font-size: 8px;
            color: #64748b;
          }
          .tag-cat {
            font-size: 8.5px;
            font-weight: 700;
            color: #0056b3;
            border: 1px solid #0056b3;
            padding: 1px 5px;
            border-radius: 3px;
          }
          .tag-body {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }
          .tag-info {
            flex: 1;
            min-width: 0;
          }
          .tag-title {
            font-size: 12.5px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.25;
            margin-bottom: 3px;
          }
          .tag-sku {
            font-size: 9px;
            font-weight: 700;
            color: #475569;
            background: #f1f5f9;
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
          }
          .tag-spec {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
          }
          .tag-qr {
            width: 50px;
            text-align: center;
            flex-shrink: 0;
          }
          .tag-qr img {
            width: 45px;
            height: 45px;
            display: block;
            margin: 0 auto;
          }
          .tag-qr span {
            font-size: 7px;
            color: #64748b;
          }
          .tag-price-box {
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 8px;
            text-align: center;
            margin-bottom: 6px;
          }
          .tag-strike {
            font-size: 9.5px;
            color: #64748b;
            text-decoration: line-through;
            margin-bottom: 1px;
          }
          .tag-disc {
            background: #dc2626;
            color: #fff;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 2px;
            margin-left: 4px;
            text-decoration: none;
            display: inline-block;
          }
          .tag-price-lbl {
            font-size: 8px;
            font-weight: 800;
            color: #475569;
            letter-spacing: 0.5px;
          }
          .tag-price {
            font-size: 22px;
            font-weight: 900;
            color: #0056b3;
            line-height: 1.1;
          }
          .tag-footer {
            display: flex;
            justify-content: space-between;
            font-size: 7.5px;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 4px;
          }
          @media print {
            body { padding: 0; }
            .sheet-grid { gap: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="sheet-grid">
          ${itemsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" maxWidth="880px">
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
                background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
              }}
            >
              <i className="fas fa-tags"></i>
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                Cetak Label Rak &amp; Price Tag Kolektif (Batch)
              </h3>
              <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0 0" }}>
                Pilih produk, terapkan diskon bertingkat &amp; pembulatan ke atas otomatis, lalu cetak lembar rak A4
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
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Konten Utama */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1 }}>
          {/* Baris Parameter Diskon Global */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr",
              gap: 14,
              padding: "14px 16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Diskon Massal (contoh: 25+10)
              </label>
              <input
                type="text"
                value={discountStr}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="25+10"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  fontWeight: 700,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 10.5, color: "#64748B" }}>
                Diskon 1: {d1}% | Diskon 2: {d2}%
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Aturan Pembulatan ke Atas
              </label>
              <select
                value={rounding}
                onChange={(e) => setRounding(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #CBD5E1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: "#fff",
                }}
              >
                <option value="1000">Ke Atas Rp 1.000 (11.272 → 12.000)</option>
                <option value="500">Ke Atas Rp 500 (11.272 → 11.500)</option>
                <option value="100">Ke Atas Rp 100 (11.272 → 11.300)</option>
                <option value="none">Tanpa Pembulatan (Eksak)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Filter / Cari Barang
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau SKU..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #CBD5E1",
                  fontSize: 12.5,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Baris Status Seleksi & Tombol Pilih Semua */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              fontSize: 12.5,
            }}
          >
            <div style={{ color: "#334155" }}>
              Terpilih: <b>{selectedIds.length}</b> dari {products.length} produk siap dicetak
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={selectAll}
                style={{
                  padding: "4px 10px",
                  fontSize: 11.5,
                  borderRadius: 6,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  color: "#0056b3",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {selectedIds.length === filteredProducts.length ? "Batal Pilih Semua" : "Pilih Semua yang Tampil"}
              </button>
            </div>
          </div>

          {/* Tabel / Grid Seleksi Produk */}
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F1F5F9", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "8px 12px", width: 40, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                      onChange={selectAll}
                    />
                  </th>
                  <th style={{ padding: "8px 10px" }}>Nama Produk</th>
                  <th style={{ padding: "8px 10px" }}>Kategori</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Harga Asli</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Setelah Diskon</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Hasil Dibulatkan</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isChecked = selectedIds.includes(String(p.id));
                  const { base, rounded, raw } = calculateItemPrice(p);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => toggleSelect(p.id)}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        cursor: "pointer",
                        background: isChecked ? "rgba(0,86,179,0.04)" : "#fff",
                      }}
                    >
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A" }}>
                        {p.name}
                        <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 400 }}>
                          SKU: {p.sku || "-"}
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{p.category}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748B" }}>
                        Rp {formatRp(base)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#DC2626" }}>
                        Rp {formatRp(Math.round(raw))}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#0056b3" }}>
                        Rp {formatRp(rounded)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

          <button
            type="button"
            onClick={handlePrintBatch}
            disabled={!selectedProducts.length}
            style={{
              padding: "9px 22px",
              borderRadius: 8,
              border: "none",
              background: selectedProducts.length
                ? "linear-gradient(135deg, #059669 0%, #10B981 100%)"
                : "#CBD5E1",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: selectedProducts.length ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: selectedProducts.length ? "0 2px 6px rgba(5,150,105,0.3)" : "none",
            }}
          >
            <i className="fas fa-print"></i>
            Cetak {selectedProducts.length} Label Rak Terpilih (A4 Grid)
          </button>
        </div>
      </div>
    </Modal>
  );
}
