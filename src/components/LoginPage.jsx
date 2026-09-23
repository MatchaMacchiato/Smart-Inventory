import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const doLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try { await login(email, password); }
    catch (err) { setError(err.response?.data?.message || err.message || "Tidak dapat masuk. Periksa email dan kata sandi Anda."); }
    finally { setBusy(false); }
  };
  return <div className="login-page">
    <section className="login-story" aria-label="Inventory KDM">
      <div className="login-brand"><span className="brand-mark"><img src="/logo-kdm.png" alt="KDM" /></span><div>Inventory<small>KEMILAU ABADI MAKMUR</small></div></div>
      <div className="login-story-main">
        <div className="eyebrow">SISTEM OPERASIONAL TOKO</div>
        <h1>Setiap barang tercatat.<br />Setiap keputusan terukur.</h1>
        <p>Satu ruang kerja untuk mengelola persediaan, memantau transaksi, dan merencanakan kebutuhan toko.</p>
        <div className="login-ledger">
          <div><Icon name="layers" /><span><strong>Persediaan yang tertata</strong><small>Produk, stok, dan supplier dalam satu tempat.</small></span></div>
          <div><Icon name="down" /><span><strong>Pergerakan yang terlacak</strong><small>Catat penerimaan dan pengeluaran barang.</small></span></div>
          <div><Icon name="chart" /><span><strong>Pengadaan yang terencana</strong><small>Tinjau kebutuhan sebelum melakukan pemesanan.</small></span></div>
        </div>
      </div>
      <div className="login-story-footer"><span>PT Kemilau Abadi Makmur</span><span>Inventory Management</span></div>
    </section>
    <section className="login-form-side">
      <div className="login-form-top">Portal internal · KDM</div>
      <div className="login-form-box">
        <div className="eyebrow">AKSES RUANG KERJA</div>
        <h2>Selamat datang kembali.</h2>
        <p>Masuk dengan akun Anda untuk melanjutkan<br />operasional toko hari ini.</p>
        {error && <div role="alert" id="login-error" className="login-error">{error}</div>}
        <form className="login-form" onSubmit={doLogin} aria-busy={busy}>
          <div><label htmlFor="email">Alamat email</label><input id="email" type="email" autoComplete="username" placeholder="nama@perusahaan.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy} aria-describedby={error ? "login-error" : undefined} /></div>
          <div><label htmlFor="password">Kata sandi</label><div className="password-field"><input id="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} /><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={visible}><Icon name="eye" size={18} /></button></div></div>
          <button className="button button-primary" type="submit" disabled={busy}><span>{busy ? "Memeriksa akun…" : "Masuk ke ruang kerja"}</span><Icon name="arrow" size={17} /></button>
        </form>
        <p className="login-help">Kendala akses akun? Hubungi administrator toko Anda.</p>
        <details className="demo-accounts"><summary>Coba dengan akun demo</summary><p>Pilih peran untuk mengisi akun contoh, lalu tekan tombol masuk. Akun demo mengikuti konfigurasi data aplikasi.</p><div className="demo-roles">{["admin", "kasir", "gudang"].map(role => <button type="button" key={role} disabled={busy} onClick={() => { setEmail(`${role}@smartinventory.my.id`); setPassword(`${role}123`); setError(""); }}>{role.charAt(0).toUpperCase() + role.slice(1)}</button>)}</div></details>
      </div>
      <div className="login-form-footer">© {new Date().getFullYear()} KDM · Smart Inventory</div>
    </section>
  </div>;
}
