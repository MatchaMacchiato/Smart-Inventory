import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

const GROUPS = [
  { title: "8 MENU UTAMA", items: [
    ["kategori", "1. Master Kategori", "grid", ["admin", "gudang"]],
    ["produk", "2. Master Produk", "box", ["admin", "kasir", "gudang"]],
    ["supplier", "3. Master Supplier", "truck", ["admin", "gudang"]],
    ["keuangan", "4. Keuangan & Kas", "wallet", ["admin", "kasir"]],
    ["manajemen-stok", "5. Manajemen Stok", "layers", ["admin", "kasir", "gudang"]],
    ["purchase-order", "6. Purchase Order (PO)", "po", ["admin", "gudang"]],
    ["retur-barang", "7. Retur Barang", "retur", ["admin", "kasir", "gudang"]],
    ["stock-opname", "8. Stock Opname", "opname", ["admin", "gudang"]],
  ]},
  { title: "OPERASIONAL TOKO", items: [
    ["dashboard", "Dashboard Ringkasan", "grid", ["admin", "kasir", "gudang"]],
    ["barang-masuk", "Penerimaan Barang", "down", ["admin", "gudang"]],
    ["barang-keluar", "Penjualan & Kasir", "up", ["admin", "kasir"]],
    ["laporan", "Laporan & Mutasi", "file", ["admin", "kasir", "gudang"]],
  ]},
  { title: "ALAT BANTU / UTILITAS", items: [
    ["ar", "Penampil AR 3D", "box", ["admin", "kasir", "gudang"]],
    ["ai-asisten", "Asisten Tanya Jawab", "tool", ["admin", "kasir", "gudang"]],
    ["ai-intel", "Analisis Prediktif", "chart", ["admin", "kasir", "gudang"]],
    ["bom-ai", "Estimasi Material", "layers", ["admin", "kasir", "gudang"]],
    ["ai-scan", "Pindai Rak / Barcode", "scan", ["admin", "gudang"]],
  ]},
];

export default function Sidebar({ page, onNavigate, open, onClose }) {
  const { user } = useAuth();
  const sidebarRef = useRef(null);
  const role = user?.role || "admin";
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector('button')?.focus();
    const keydown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const buttons = sidebarRef.current?.querySelectorAll('button');
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [open, onClose]);
  return <>
    {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Tutup navigasi" tabIndex={-1} />}
    <aside id="workspace-navigation" ref={sidebarRef} className={`sidebar ${open ? "is-open" : ""}`} aria-label="Navigasi utama">
      <div className="sidebar-brand">
        <span className="brand-mark"><img src="/logo-kdm.png" alt="KDM" /></span>
        <div className="sidebar-brand-text">Inventory<small>KEMILAU ABADI MAKMUR</small></div>
        <button className="sidebar-close" onClick={onClose} aria-label="Tutup menu"><Icon name="close" size={19} /></button>
      </div>
      <div className="workspace-label"><Icon name="box" size={19} /><span>Operasional toko<small>Persediaan & transaksi</small></span></div>
      <nav className="sidebar-nav">
        {GROUPS.map(group => {
          const items = group.items.filter(item => item[3].includes(role));
          if (!items.length) return null;
          return <div key={group.title}><div className="nav-group-title">{group.title}</div>
            {items.map(([key, label, icon]) => <button key={key} type="button" className={`nav-item ${page === key ? "active" : ""}`} aria-current={page === key ? "page" : undefined} onClick={() => onNavigate(key)}><Icon name={icon} size={17} /><span>{label}</span>{page === key && <span className="nav-active-dot" />}</button>)}
          </div>;
        })}
      </nav>
      <div className="sidebar-footer"><span className="sidebar-avatar">{(user?.name || "U").charAt(0)}</span><div><strong>{user?.name || "Pengguna"}</strong><small>{role} · Ruang kerja KDM</small></div></div>
    </aside>
  </>;
}
