import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// UI/UX Pro Max — Flat Design (industrial slate + stock green)
// Tokens dari skill ui-ux-pro-max (design system "Smart Inventory Login")
const DS = {
  primary: "#0056b3",
  onPrimary: "#FFFFFF",
  accent: "#FF7300",
  onAccent: "#FFFFFF",
  bg: "#F8FAFC",
  fg: "#002a5c",
  muted: "#F2F3F4",
  mutedFg: "#64748B",
  border: "#E6E8EA",
  destructive: "#DC2626",
  ring: "#0056b3",
  radius: 12,
  fontHead: "'Rubik', sans-serif",
  fontBody: "'Nunito Sans', sans-serif",
};

export default function LoginPage({ onLogin }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const doLogin = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Isi email dan password terlebih dahulu.");
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err.response?.data?.errors?.email?.[0] ||
          err.response?.data?.message ||
          "Login gagal. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (role, em, pw) => {
    setEmail(em);
    setPassword(pw);
    setShowDemo(false);
  };

  const inputStyle = {
    width: "100%",
    height: 48,
    border: `1.5px solid ${DS.border}`,
    borderRadius: DS.radius,
    padding: "0 14px",
    fontSize: 15,
    fontFamily: DS.fontBody,
    background: "#fff",
    color: DS.fg,
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: DS.primary,
    marginBottom: 6,
    fontFamily: DS.fontBody,
    letterSpacing: "-0.01em",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        background: DS.bg,
        fontFamily: DS.fontBody,
        color: DS.fg,
      }}
    >
      {/* ===== Kiri: brand panel (flat, solid slate) ===== */}
      <div
        style={{
          flex: 1.15,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 56px",
          background: DS.primary,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* dekorasi flat: kotak & lingkaran solid tanpa blur/gradient */}
        <div
          style={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 90,
            bottom: -40,
            width: 120,
            height: 120,
            borderRadius: 24,
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 32,
          }}
        >
          <img
            src="/logo-kdm.png"
            alt="KDM Logo"
            style={{ height: 60, objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                fontFamily: DS.fontHead,
                letterSpacing: "-0.01em",
              }}
            >
              Inventory Pro
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Smart Inventory System
            </div>
          </div>
        </div>

        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            fontFamily: DS.fontHead,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            maxWidth: 420,
            marginBottom: 16,
          }}
        >
          Kelola stok toko listrik jadi{" "}
          <span style={{ color: "#6EE7B7" }}>
            cepat, akurat, &amp; anti-tebak-tebakan
          </span>
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 400,
          }}
        >
          {[
            {
              icon: "fa-boxes-stacked",
              txt: "Stok real-time + laporan otomatis",
            },
            { icon: "fa-brain", txt: "Apriori & EOQ untuk prediksi restock" },
            {
              icon: "fa-file-invoice-dollar",
              txt: "Keuangan, invoice & pembayaran terpusat",
            },
          ].map((f) => (
            <div
              key={f.txt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                fontWeight: 600,
                opacity: 0.92,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.1)",
                  color: "#6EE7B7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                <i className={`fas ${f.icon}`}></i>
              </div>
              {f.txt}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 40,
            fontSize: 12,
            opacity: 0.6,
            fontWeight: 600,
          }}
        >
          PT Kemilau Abadi Makmur · Toko Listrik
        </div>
      </div>

      {/* ===== Kanan: form login ===== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: DS.fontHead,
                color: DS.fg,
                letterSpacing: "-0.02em",
                marginBottom: 6,
              }}
            >
              Selamat datang kembali 👋
            </h2>
            <p style={{ fontSize: 14, color: DS.mutedFg, fontWeight: 500 }}>
              Masuk untuk mengelola persediaan barang
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: 12,
                borderRadius: DS.radius,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fas fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <form
            onSubmit={doLogin}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <div>
              <label htmlFor="email" style={labelStyle}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = DS.ring;
                  e.target.style.boxShadow = `0 0 0 3px rgba(0,86,179,0.12)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = DS.border;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = DS.ring;
                  e.target.style.boxShadow = `0 0 0 3px rgba(0,86,179,0.12)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = DS.border;
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                height: 48,
                border: "none",
                borderRadius: DS.radius,
                background: busy ? DS.mutedFg : DS.accent,
                color: DS.onAccent,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: DS.fontBody,
                cursor: busy ? "not-allowed" : "pointer",
                transition: "background 0.15s ease, transform 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                if (!busy) e.target.style.background = "#047857";
              }}
              onMouseLeave={(e) => {
                if (!busy) e.target.style.background = DS.accent;
              }}
            >
              {busy ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <i
                    className="fas fa-arrow-right"
                    style={{ fontSize: 13 }}
                  ></i>
                </>
              )}
            </button>
          </form>

          {showDemo && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: DS.radius,
                background: DS.muted,
                border: `1px solid ${DS.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: DS.mutedFg,
                  marginBottom: 10,
                  letterSpacing: "0.06em",
                }}
              >
                Demo Akun
              </div>
              {[
                {
                  role: "Admin",
                  label: "Full akses",
                  email: "admin@smartinventory.my.id",
                  pass: "admin123",
                  icon: "fa-shield-halved",
                  color: DS.primary,
                },
                {
                  role: "Kasir",
                  label: "Transaksi + Laporan",
                  email: "kasir@smartinventory.my.id",
                  pass: "kasir123",
                  icon: "fa-cash-register",
                  color: DS.accent,
                },
                {
                  role: "Gudang",
                  label: "Stok + Barang Masuk",
                  email: "gudang@smartinventory.my.id",
                  pass: "gudang123",
                  icon: "fa-warehouse",
                  color: "#FF7300",
                },
              ].map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => fillDemo(d.role, d.email, d.pass)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 10px",
                    border: "none",
                    borderRadius: 8,
                    background: "transparent",
                    color: DS.fg,
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${d.color}14`,
                      color: d.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    <i className={`fas ${d.icon}`}></i>
                  </span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{d.role}</span>
                  <span
                    style={{ color: DS.mutedFg, fontSize: 12, fontWeight: 500 }}
                  >
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 20,
              textAlign: "center",
              fontSize: 12,
              color: DS.mutedFg,
              fontWeight: 500,
            }}
          >
            Smart Inventory{" "}
            <span style={{ color: "#B6BAC2" }}>· PT Kemilau Abadi Makmur</span>
          </div>
        </div>
      </div>
    </div>
  );
}
