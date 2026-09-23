const GROUPS = [
  {
    title: "8 MENU UTAMA",
    items: [
      {
        key: "kategori",
        label: "1. Master Kategori",
        icon: "fa-tags",
        roles: ["admin", "gudang"],
      },
      {
        key: "produk",
        label: "2. Master Produk",
        icon: "fa-box",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "supplier",
        label: "3. Master Supplier",
        icon: "fa-truck",
        roles: ["admin", "gudang"],
      },
      {
        key: "keuangan",
        label: "4. Keuangan",
        icon: "fa-file-invoice-dollar",
        roles: ["admin", "kasir"],
      },
      {
        key: "manajemen-stok",
        label: "5. Manajemen Stok",
        icon: "fa-warehouse",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "apriori",
        label: "6. Analisis Apriori",
        icon: "fa-diagram-project",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "eoq",
        label: "7. Optimasi EOQ",
        icon: "fa-calculator",
        roles: ["admin", "gudang"],
      },
      {
        key: "rekomendasi",
        label: "8. Rekomendasi PO",
        icon: "fa-lightbulb",
        roles: ["admin", "gudang"],
      },
    ],
  },
  {
    title: "OPERASIONAL",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "fa-th-large",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "barang-masuk",
        label: "Barang Masuk",
        icon: "fa-arrow-down",
        roles: ["admin", "gudang"],
      },
      {
        key: "barang-keluar",
        label: "Barang Keluar",
        icon: "fa-arrow-up",
        roles: ["admin", "kasir"],
      },
      {
        key: "laporan",
        label: "Laporan Stok",
        icon: "fa-chart-bar",
        roles: ["admin", "kasir", "gudang"],
      },
    ],
  },
  {
    title: "TOOLS",
    items: [
      {
        key: "ai-asisten",
        label: "Asisten AI",
        icon: "fa-robot",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "ai-intel",
        label: "AI Intelligence",
        icon: "fa-brain",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "bom-ai",
        label: "BOM AI Material",
        icon: "fa-magic",
        roles: ["admin", "kasir", "gudang"],
      },
      {
        key: "ai-scan",
        label: "AI Scan Rak",
        icon: "fa-camera",
        roles: ["admin", "gudang"],
      },
      {
        key: "ar",
        label: "AR 3D Viewer",
        icon: "fa-cube",
        roles: ["admin", "kasir", "gudang"],
      },
    ],
  },
];

import { useAuth } from "../context/AuthContext";

export default function Sidebar({ page, onNavigate }) {
  const { user } = useAuth();
  const role = user?.role || "admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" style={{ padding: "16px", gap: "12px" }}>
        <img
          src="/logo-kdm.png"
          alt="Logo"
          style={{ height: "36px", objectFit: "contain" }}
        />
        <div className="sidebar-brand-text" style={{ fontSize: "15px" }}>
          INVENTORY PRO
        </div>
      </div>

      <nav className="sidebar-nav">
        {GROUPS.map((group) => {
          const items = group.items.filter(
            (i) => !i.roles || i.roles.includes(role),
          );
          if (!items.length) return null;
          return (
            <div key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {items.map((item, idx) => {
                const active =
                  page === item.key ||
                  (item.key === "produk" && page === "ar") ||
                  (item.key === "ar" && page === "ar");
                return (
                  <button
                    key={`${group.title}-${item.key}-${idx}`}
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => onNavigate(item.key)}
                    type="button"
                  >
                    <i className={`fas ${item.icon}`}></i>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: "var(--navy)",
            textTransform: "capitalize",
          }}
        >
          {user?.name || "User"}
        </div>
        <div
          style={{
            textTransform: "capitalize",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--success)",
              display: "inline-block",
            }}
          ></span>
          Role: {role}
        </div>
      </div>
    </aside>
  );
}
