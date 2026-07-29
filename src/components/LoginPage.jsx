import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const AVATARS = ['🧑‍💼', '👩‍💼', '🧑‍🔧', '👨‍🔧']

export default function LoginPage({ onLogin }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDemo, setShowDemo] = useState(true)

  const doLogin = async (e) => {
    e?.prependDefault?.()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Isi email dan password terlebih dahulu.')
      return
    }
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.errors?.email?.[0] || err.response?.data?.message || 'Login gagal. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (role, em, pw) => {
    setEmail(em)
    setPassword(pw)
    setShowDemo(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 32,
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 12px',
            boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
          }}>
            <i className="fas fa-cube"></i>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Inventory Pro</h2>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Sistem Manajemen Stok Toko Listrik</p>
        </div>

        {error && (
          <div style={{ padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            style={{ height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '0 14px', fontSize: 14, outline: 'none' }} />
          <input value={password} onChange={e => setPassword(e.target.value)}
            type="password" placeholder="Password"
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            style={{ height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '0 14px', fontSize: 14, outline: 'none' }} />
          <button onClick={doLogin} disabled={busy} type="button"
            style={{ height: 44, borderRadius: 12, border: 'none',
              background: busy ? '#475569' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            {busy ? 'Memproses...' : 'Masuk'}
          </button>
        </div>

        {showDemo && (
          <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>Demo Akun</div>
            {[
              { role: 'Admin', label: '🚀 Full akses', email: 'admin@smartinventory.my.id', pass: 'admin123', color: '#2563eb' },
              { role: 'Kasir', label: '💰 Transaksi + Laporan', email: 'kasir@smartinventory.my.id', pass: 'kasir123', color: '#16a34a' },
              { role: 'Gudang', label: '📦 Stok + Barang Masuk', email: 'gudang@smartinventory.my.id', pass: 'gudang123', color: '#f59e0b' },
            ].map(d => (
              <button key={d.role} type="button" onClick={() => fillDemo(d.role, d.email, d.pass)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', border: 'none', borderRadius: 8, background: 'transparent', color: '#cbd5e1', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `${d.color}22`, color: d.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{d.role[0]}</span>
                <span style={{ flex: 1 }}>{d.label}</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>Klik isi</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#475569' }}>
          Smart Inventory AR v2.0 &middot; Sistem Informasi
        </div>
      </div>
    </div>
  )
}
