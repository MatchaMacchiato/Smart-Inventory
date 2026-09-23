import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";
import { useMaster } from "../context/MasterContext";
import { getCategoryTheme } from "../utils/categoryRules";
import Icon from "./Icon";

const TITLES = {
  dashboard: "Ringkasan",
  kategori: "Master Kategori",
  produk: "Katalog produk",
  supplier: "Master Supplier",
  keuangan: "Keuangan · Penagihan",
  "manajemen-stok": "Manajemen Stok",
  "purchase-order": "Purchase Order (PO)",
  "retur-barang": "Retur Barang",
  "stock-opname": "Stock Opname",
  apriori: "Purchase Order (PO)",
  eoq: "Retur Barang",
  rekomendasi: "Stock Opname",
  ar: "AR 3D Viewer",
  "barang-masuk": "Barang Masuk",
  "barang-keluar": "Barang Keluar",
  laporan: "Laporan Stok",
  "ai-asisten": "Asisten AI",
  "bom-ai": "BOM AI Material",
  "ai-scan": "AI Scan Rak (YOLOv8)",
  "ai-intel": "AI Intelligence",
};

const ALL_MENUS = [
  { key: "dashboard", name: "Dashboard", desc: "Ringkasan performa & visualisasi stok", icon: "fa-th-large", cat: "Menu Utama" },
  { key: "kategori", name: "Master Kategori", desc: "Kelola kategori & aturan margin/lead time", icon: "fa-tags", cat: "Menu Utama" },
  { key: "produk", name: "Master Produk", desc: "Katalog barang, QR code & 3D model", icon: "fa-box", cat: "Menu Utama" },
  { key: "supplier", name: "Master Supplier", desc: "Kontak vendor, nomor WhatsApp & lead time", icon: "fa-truck", cat: "Menu Utama" },
  { key: "keuangan", name: "Keuangan · Penagihan", desc: "Pelunasan faktur, piutang & tagihan WA", icon: "fa-file-invoice-dollar", cat: "Menu Utama" },
  { key: "manajemen-stok", name: "Manajemen Stok", desc: "Posisi stok per kategori & restock", icon: "fa-warehouse", cat: "Menu Utama" },
  { key: "purchase-order", name: "Purchase Order (PO)", desc: "Surat pesanan resmi distributor & terima stok", icon: "fa-clipboard-list", cat: "Menu Utama" },
  { key: "retur-barang", name: "Retur Barang", desc: "Pengembalian barang rusak & klaim supplier", icon: "fa-rotate-left", cat: "Menu Utama" },
  { key: "stock-opname", name: "Stock Opname", desc: "Pencocokan stok fisik rak & rekonsiliasi data", icon: "fa-clipboard-check", cat: "Menu Utama" },
  { key: "barang-masuk", name: "Barang Masuk", desc: "Input penerimaan & scan barcode masuk", icon: "fa-arrow-down", cat: "Operasional" },
  { key: "barang-keluar", name: "Barang Keluar", desc: "Input pengeluaran & scan barcode keluar", icon: "fa-arrow-up", cat: "Operasional" },
  { key: "laporan", name: "Laporan Stok", desc: "Riwayat mutasi, kartu stok & export data", icon: "fa-chart-bar", cat: "Operasional" },
  { key: "ai-asisten", name: "Asisten AI", desc: "Konsultasi stok & rekomendasi cerdas", icon: "fa-robot", cat: "Tools AI" },
  { key: "ai-intel", name: "AI Intelligence", desc: "Analitik tingkat lanjut & prediksi stok", icon: "fa-brain", cat: "Tools AI" },
  { key: "bom-ai", name: "BOM AI Material", desc: "Bill of Materials & estimasi RAB proyek", icon: "fa-magic", cat: "Tools AI" },
  { key: "ai-scan", name: "AI Scan Rak", desc: "Deteksi visual rak berbasis YOLOv8", icon: "fa-camera", cat: "Tools AI" },
  { key: "ar", name: "AR 3D Viewer", desc: "Visualisasi 3D interaktif produk", icon: "fa-cube", cat: "Tools" },
];

const ROLE_ICONS = {
  admin: "fa-shield-halved",
  kasir: "fa-cash-register",
  gudang: "fa-warehouse",
};

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function Topbar({ page, onNavigate, onSelectProduct, menuOpen, onToggleMenu }) {
  const { user, logout } = useAuth();
  const { products = [], lowStock = [], history = [] } = useInventory() || {};
  const { categories = [], suppliers = [] } = useMaster() || {};

  const title = TITLES[page] || "Dashboard";

  // Time state
  const [now, setNow] = useState(() =>
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  const [dateStr] = useState(() =>
    new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Notification state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState("all"); // 'all', 'low', 'trans', 'po'
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem("kdm_read_notifs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const notifContainerRef = useRef(null);

  // Real-time clock tick
  useEffect(() => {
    const id = setInterval(() => {
      setNow(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Global keyboard shortcuts (Ctrl+K or / to focus search, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && e.key.toLowerCase() === "k") ||
        (e.key === "/" && document.activeElement !== searchInputRef.current)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ————— SEARCH RESULTS CALCULATION ————— */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        products: [],
        menus: ALL_MENUS.slice(0, 4),
        categories: categories.slice(0, 4),
        suppliers: suppliers.slice(0, 3),
        isEmpty: false,
        isDefault: true,
      };
    }

    const matchedProducts = products
      .filter((p) =>
        [p.name, p.sku, p.category, p.supplier]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);

    const matchedMenus = ALL_MENUS.filter((m) =>
      [m.name, m.desc, m.cat].join(" ").toLowerCase().includes(q),
    ).slice(0, 4);

    const matchedCategories = categories
      .filter((c) =>
        [c.name, c.code, c.description].join(" ").toLowerCase().includes(q),
      )
      .slice(0, 4);

    const matchedSuppliers = suppliers
      .filter((s) =>
        [s.name, s.phone, s.contact, s.address]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 3);

    const totalCount =
      matchedProducts.length +
      matchedMenus.length +
      matchedCategories.length +
      matchedSuppliers.length;

    return {
      products: matchedProducts,
      menus: matchedMenus,
      categories: matchedCategories,
      suppliers: matchedSuppliers,
      isEmpty: totalCount === 0,
      isDefault: false,
      totalCount,
    };
  }, [searchQuery, products, categories, suppliers]);

  /* ————— NOTIFICATIONS COMPILATION ————— */
  const notifications = useMemo(() => {
    const list = [];

    // 1. Low stock alerts (High Priority)
    lowStock.forEach((p) => {
      const gap = Math.max(0, Number(p.min_stock || 0) - Number(p.stock || 0));
      list.push({
        id: `low-${p.id}`,
        type: "low",
        title: `Stok Menipis: ${p.name}`,
        subtitle: `Tersisa ${p.stock} ${p.unit || "pcs"} (Batas minimum: ${p.min_stock} ${p.unit || "pcs"} · Defisit: ${gap})`,
        category: p.category,
        sku: p.sku,
        time: "Penting",
        icon: "fa-triangle-exclamation",
        color: "#DC2626",
        bg: "rgba(220,38,38,0.1)",
        actionLabel: "Restock",
        action: () => onNavigate?.("manajemen-stok"),
      });
    });

    // 2. Recent Transactions from history
    history.slice(0, 8).forEach((h) => {
      const isIn = h.change > 0;
      list.push({
        id: `tx-${h.id || h.created_at}`,
        type: "trans",
        title: isIn
          ? `Barang Masuk +${h.change} pcs`
          : `Barang Keluar ${h.change} pcs`,
        subtitle: `${h.product_name} (${h.category || "-"}) · ${h.reason || "Mutasi"}`,
        time: timeAgo(h.created_at),
        icon: isIn ? "fa-arrow-down" : "fa-arrow-up",
        color: isIn ? "#059669" : "#EA580C",
        bg: isIn ? "rgba(5,150,105,0.1)" : "rgba(234,88,12,0.1)",
        actionLabel: "Lihat",
        action: () => onNavigate?.("laporan"),
      });
    });

    // 3. EOQ / Procurement recommendation alert
    if (lowStock.length > 0) {
      list.push({
        id: "po-recommendation",
        type: "po",
        title: `${lowStock.length} Item Membutuhkan Pengadaan (PO)`,
        subtitle:
          "Sistem EOQ telah menghitung saran kuantitas reorder optimal untuk supplier.",
        time: "Rekomendasi",
        icon: "fa-lightbulb",
        color: "#7C3AED",
        bg: "rgba(124,58,237,0.1)",
        actionLabel: "Buka PO",
        action: () => onNavigate?.("rekomendasi"),
      });
    }

    return list;
  }, [lowStock, history, onNavigate]);

  const filteredNotifs = useMemo(() => {
    if (notifTab === "all") return notifications;
    return notifications.filter((n) => n.type === notifTab);
  }, [notifications, notifTab]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, readNotifIds]);

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem("kdm_read_notifs", JSON.stringify(allIds));
    } catch {}
  };

  const markSingleRead = (id) => {
    if (!readNotifIds.includes(id)) {
      const next = [...readNotifIds, id];
      setReadNotifIds(next);
      try {
        localStorage.setItem("kdm_read_notifs", JSON.stringify(next));
      } catch {}
    }
  };

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" type="button" aria-label="Buka menu navigasi" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={onToggleMenu}><Icon name="menu" size={19} /></button>
      <div className="topbar-left">
        <div className="breadcrumb">
          <span>Ruang kerja</span><span>/</span><strong>{title}</strong>
        </div>
      </div>

      {/* SEARCH BAR SPOTLIGHT */}
      <div className="topbar-search-wrapper" ref={searchContainerRef}>
        <i
          className="fas fa-search"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: isSearchOpen ? "var(--primary)" : "var(--text-muted)",
            fontSize: 13,
            pointerEvents: "none",
          }}
        ></i>

        <input
          ref={searchInputRef}
          className="topbar-search-input"
          placeholder="Cari produk, menu, atau supplier…"
          aria-label="Cari produk, menu, atau supplier"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              searchInputRef.current?.focus();
            }}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              color: "#94A3B8",
              cursor: "pointer",
              padding: 4,
              fontSize: 12,
            }}
            title="Hapus pencarian"
          >
            <i className="fas fa-times-circle"></i>
          </button>
        ) : (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 5px",
              borderRadius: 4,
              background: "#F1F5F9",
              color: "#64748B",
              border: "1px solid #CBD5E1",
              pointerEvents: "none",
            }}
          >
            Ctrl K
          </span>
        )}

        {/* SEARCH RESULTS DROPDOWN */}
        {isSearchOpen && (
          <div className="search-results-dropdown">
            <div className="search-results-box">
              {searchResults.isDefault && (
                <div
                  style={{
                    padding: "6px 8px 10px",
                    fontSize: 11.5,
                    color: "#64748B",
                  }}
                >
                  Ketik nama produk, SKU, kategori, atau pilih menu cepat:
                </div>
              )}

              {searchResults.isEmpty && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    color: "#64748B",
                  }}
                >
                  <i
                    className="fas fa-magnifying-glass"
                    style={{
                      fontSize: 24,
                      marginBottom: 8,
                      color: "#CBD5E1",
                      display: "block",
                    }}
                  ></i>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}
                  >
                    Tidak ada hasil
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 2 }}>
                    Coba cari dengan kata kunci lain (misal: "Schneider",
                    "Kabel", "Broco")
                  </div>
                </div>
              )}

              {/* Matching Products */}
              {searchResults.products.length > 0 && (
                <div>
                  <div className="search-group-title">
                    <i className="fas fa-box" style={{ marginRight: 6 }}></i>
                    Produk &amp; Stok ({searchResults.products.length})
                  </div>
                  {searchResults.products.map((p) => {
                    const theme = getCategoryTheme(p.category);
                    const isLow = Number(p.stock) <= Number(p.min_stock || 0);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="search-item-btn"
                        onClick={() => {
                          setIsSearchOpen(false);
                          if (onSelectProduct) {
                            onSelectProduct(p);
                          } else if (onNavigate) {
                            onNavigate("produk");
                          }
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: theme.badgeBg,
                              color: theme.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            <i className={`fas ${theme.icon}`}></i>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 700,
                                color: "#0F172A",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {p.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#64748B",
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <span>{p.sku}</span>
                              <span>·</span>
                              <span
                                style={{ color: theme.dark, fontWeight: 600 }}
                              >
                                {p.category}
                              </span>
                              <span>·</span>
                              <span
                                style={{ fontWeight: 700, color: "#0056b3" }}
                              >
                                Rp{" "}
                                {Number(p.price || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            className="badge-pill"
                            style={{
                              background: isLow
                                ? "var(--danger-bg)"
                                : "var(--success-bg)",
                              color: isLow ? "var(--danger)" : "var(--success)",
                              fontSize: 10.5,
                              padding: "2px 7px",
                              fontWeight: 700,
                            }}
                          >
                            {isLow
                              ? `⚠ ${p.stock} (Menipis)`
                              : `${p.stock} ${p.unit || "pcs"}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matching Navigation Menus */}
              {searchResults.menus.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div className="search-group-title">
                    <i
                      className="fas fa-compass"
                      style={{ marginRight: 6 }}
                    ></i>
                    Menu &amp; Fitur Sistem
                  </div>
                  {searchResults.menus.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className="search-item-btn"
                      onClick={() => {
                        setIsSearchOpen(false);
                        onNavigate?.(m.key);
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: "#F1F5F9",
                            color: "#0056b3",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          <i className={`fas ${m.icon}`}></i>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#0F172A",
                            }}
                          >
                            {m.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748B" }}>
                            {m.desc}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10.5,
                          color: "#94A3B8",
                          fontWeight: 600,
                        }}
                      >
                        Buka →
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Matching Categories */}
              {searchResults.categories.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div className="search-group-title">
                    <i className="fas fa-tags" style={{ marginRight: 6 }}></i>
                    Kategori Master
                  </div>
                  {searchResults.categories.map((c) => {
                    const theme = getCategoryTheme(c.name);
                    return (
                      <button
                        key={c.id || c.name}
                        type="button"
                        className="search-item-btn"
                        onClick={() => {
                          setIsSearchOpen(false);
                          onNavigate?.("manajemen-stok");
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: theme.badgeBg,
                              color: theme.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                            }}
                          >
                            <i className={`fas ${theme.icon}`}></i>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 700,
                                color: theme.dark,
                              }}
                            >
                              {c.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>
                              Margin {c.margin_pct || 25}% · Min{" "}
                              {c.min_stock || 10} · Prioritas{" "}
                              {c.restock_priority || "Sedang"}
                            </div>
                          </div>
                        </div>
                        <span
                          className="badge-pill"
                          style={{
                            fontSize: 10.5,
                            background: theme.light,
                            color: theme.dark,
                          }}
                        >
                          Lihat Stok
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matching Suppliers */}
              {searchResults.suppliers.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div className="search-group-title">
                    <i className="fas fa-truck" style={{ marginRight: 6 }}></i>
                    Master Supplier
                  </div>
                  {searchResults.suppliers.map((s) => (
                    <button
                      key={s.id || s.name}
                      type="button"
                      className="search-item-btn"
                      onClick={() => {
                        setIsSearchOpen(false);
                        onNavigate?.("supplier");
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "rgba(5,150,105,0.1)",
                            color: "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                          }}
                        >
                          <i className="fas fa-truck"></i>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#0F172A",
                            }}
                          >
                            {s.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748B" }}>
                            {s.phone ? `WA: ${s.phone}` : "Kontak belum diatur"}{" "}
                            {s.lead_time
                              ? `· Lead time ${s.lead_time} hari`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 10.5, color: "#94A3B8" }}>
                        Buka Supplier →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "8px 14px",
                borderTop: "1px solid var(--border)",
                background: "#FAFAFC",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#64748B",
              }}
            >
              <span>
                Gunakan kata kunci untuk menyaring hasil secara instan
              </span>
              <span>
                Tekan <b>Esc</b> untuk menutup
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TOPBAR RIGHT: NOTIFICATIONS, CLOCK, USER PROFILE */}
      <div className="topbar-right">
        {/* NOTIFICATION BUTTON & POPOVER */}
        <div style={{ position: "relative" }} ref={notifContainerRef}>
          <button
            className="icon-btn"
            title="Notifikasi Sistem"
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            style={{
              background: isNotifOpen ? "#F1F5F9" : "#fff",
              borderColor: isNotifOpen ? "var(--primary)" : "var(--border)",
            }}
          >
            <i
              className="fas fa-bell"
              style={{ color: unreadCount > 0 ? "#0F172A" : "#64748B" }}
            ></i>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: "var(--danger)",
                  color: "#fff",
                  fontSize: 9.5,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  border: "2px solid #fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION POPOVER */}
          {isNotifOpen && (
            <div className="notif-popover">
              <div className="notif-header">
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: "#0F172A",
                    }}
                  >
                    Notifikasi ({notifications.length})
                  </h4>
                  <div style={{ fontSize: 11, color: "#64748B" }}>
                    {unreadCount > 0
                      ? `${unreadCount} pemberitahuan baru`
                      : "Semua sudah dibaca"}
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#0056b3",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "4px 6px",
                    }}
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="notif-tabs">
                {[
                  { key: "all", label: `Semua (${notifications.length})` },
                  { key: "low", label: `Stok Menipis (${lowStock.length})` },
                  { key: "trans", label: "Transaksi" },
                  { key: "po", label: "Pengadaan" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setNotifTab(t.key)}
                    className={`notif-tab-btn ${notifTab === t.key ? "active" : ""}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="notif-body">
                {filteredNotifs.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 12px",
                      color: "#94A3B8",
                    }}
                  >
                    <i
                      className="fas fa-bell-slash"
                      style={{
                        fontSize: 22,
                        marginBottom: 6,
                        display: "block",
                      }}
                    ></i>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      Tidak ada notifikasi
                    </div>
                  </div>
                ) : (
                  filteredNotifs.map((n) => {
                    const isUnread = !readNotifIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        className={`notif-item ${isUnread ? "unread" : ""}`}
                        onClick={() => {
                          markSingleRead(n.id);
                          n.action?.();
                          setIsNotifOpen(false);
                        }}
                      >
                        <div
                          className="notif-icon"
                          style={{ background: n.bg, color: n.color }}
                        >
                          <i className={`fas ${n.icon}`}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: isUnread ? 800 : 700,
                                color: "#0F172A",
                                lineHeight: 1.25,
                              }}
                            >
                              {n.title}
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                color: "#94A3B8",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {n.time}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748B",
                              marginTop: 3,
                              lineHeight: 1.35,
                            }}
                          >
                            {n.subtitle}
                          </div>
                          {n.actionLabel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markSingleRead(n.id);
                                n.action?.();
                                setIsNotifOpen(false);
                              }}
                              style={{
                                marginTop: 6,
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: `1px solid ${n.color}`,
                                background: "#fff",
                                color: n.color,
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {n.actionLabel} →
                            </button>
                          )}
                        </div>
                        {isUnread && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              marginTop: 6,
                              flexShrink: 0,
                            }}
                          ></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "8px 12px",
                  borderTop: "1px solid var(--border)",
                  background: "#F8FAFC",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(false);
                    onNavigate?.("manajemen-stok");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#0056b3",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Manajemen Stok →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(false);
                    onNavigate?.("laporan");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#64748B",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Laporan Riwayat →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Clock */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            marginRight: 6,
            lineHeight: 1.3,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: "var(--success)",
              fontWeight: 700,
              fontFamily: "'Nunito Sans', sans-serif",
            }}
          >
            <i
              className="fas fa-clock"
              style={{ marginRight: 4, fontSize: 10 }}
            ></i>
            {now}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {dateStr}
          </span>
        </div>

        {/* User profile / Logout chip */}
        <div
          className="user-chip"
          title="Logout"
          onClick={logout}
          style={{ cursor: "pointer" }}
        >
          <div className="user-avatar" style={{ fontSize: 13 }}>
            <i className={`fas ${ROLE_ICONS[user?.role] || "fa-user"}`}></i>
          </div>
          <div className="user-meta">
            <span style={{ textTransform: "capitalize" }}>
              {user?.name || "User"}
            </span>
            <span style={{ textTransform: "capitalize" }}>
              {user?.role || "-"}{" "}
              <span style={{ color: "#64748B" }}>· Klik logout</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
