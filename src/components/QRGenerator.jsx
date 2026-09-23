import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QRGenerator({ product, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!product || !canvasRef.current) return;

    const baseUrl = window.location.origin;
    const scanUrl = `${baseUrl}/scan/${product.id}`;

    QRCode.toCanvas(
      canvasRef.current,
      scanUrl,
      {
        width: size,
        margin: 2,
        color: {
          dark: "#002a5c",
          light: "#ffffff",
        },
      },
      (err) => {
        if (err) console.error("QR generation error:", err);
      },
    );
  }, [product, size]);

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `QR-${product.name.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const printQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head><title>Cetak QR - ${product.name}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .label { border: 1px dashed #ccc; padding: 20px; display: inline-block; }
        h3 { margin: 10px 0 5px; font-size: 14px; }
        p { margin: 0; font-size: 11px; color: #666; }
        .price { font-size: 13px; font-weight: bold; color: #0056b3; margin: 4px 0; }
      </style>
      </head>
      <body>
        <div class="label">
          <img src="${canvas.toDataURL("image/png")}" width="150" height="150" />
          <h3>${product.name}</h3>
          <p>${product.category} · Stok: ${product.stock}</p>
          <p class="price">Rp ${Number(product.price).toLocaleString()}</p>
          <p style="font-size:9px;color:#999;margin-top:8px;">Scan untuk lihat 3D & info produk</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div style={{ textAlign: "center" }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, maxWidth: "100%" }} />
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          justifyContent: "center",
        }}
      >
        <button
          onClick={downloadQR}
          style={{
            padding: "8px 16px",
            border: "1px solid #0056b3",
            borderRadius: 8,
            background: "#fff",
            color: "#0056b3",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="fas fa-download"></i> Download PNG
        </button>
        <button
          onClick={printQR}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: 8,
            background: "#0056b3",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="fas fa-print"></i> Cetak Stiker
        </button>
      </div>
    </div>
  );
}
