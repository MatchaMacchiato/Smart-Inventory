import { useState, useMemo, useRef } from "react";
import { useInventory } from "../context/InventoryContext";
import { useMaster } from "../context/MasterContext";
import QRGenerator from "./QRGenerator";
import {
  applyCategoryToForm,
  findCategory,
  suggestedSellPrice,
  suggestedCostFromPrice,
} from "../utils/categoryRules";
import Modal from "./Modal";
import Icon from "./Icon";
import { resolveProductImage, CATEGORY_IMAGES } from "../data/products";

const EMPTY_FORM = {
  name: "",
  category: "MCB",
  price: "",
  cost: "",
  stock: "",
  min_stock: "",
  unit: "pcs",
  supplier: "",
  image_url: "",
};

const ICONS = {
  MCB: "fa-bolt",
  Kabel: "fa-plug",
  Fitting: "fa-lightbulb",
  Saklar: "fa-toggle-on",
  "Stop Kontak": "fa-plug",
  Steker: "fa-plug",
  Panel: "fa-cube",
  Lampu: "fa-lightbulb",
  Aksesoris: "fa-toolbox",
};

const formatRp = (n) => Number(n || 0).toLocaleString("id-ID");
const defaultCostFromPrice = (price) =>
  Math.round((Number(price || 0) * 0.78) / 500) * 500;
const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const normalizeCat = (value) => normalizeText(value).toLowerCase();

const normalizeForSearch = (str) =>
  String(str ?? "")
    .toLowerCase()
    .replace(/[×✕]/g, "x")
    .replace(/,/g, ".")
    .replace(/[@#]/g, " ")
    .replace(/[\s\-_/\\|;:()]+/g, " ")
    .trim();

function getSearchableText(p) {
  if (!p) return "";
  const specValues =
    p.specifications && typeof p.specifications === "object"
      ? Object.values(p.specifications).join(" ")
      : String(p.specifications || "");
  const stock = Number(p.stock || 0);
  const minStock = Number(p.min_stock || 0);
  let statusTerms = "aman normal cukup";
  if (stock <= 5) {
    statusTerms = "kritis bahaya defisit habis";
  } else if (stock <= minStock) {
    statusTerms = "menipis restock order";
  }
  return normalizeForSearch(
    `${p.name} ${p.sku} ${p.category} ${p.supplier} ${p.barcode} ${p.unit} ${specValues} ${statusTerms}`,
  );
}

export default function ProductList({ onSelect }) {
  const { products, addProduct, updateProduct, deleteProduct } = useInventory();
  const { categories: masterCategories, suppliers = [] } = useMaster();
  const [view, setView] = useState("table");
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState(""); // '' = semua
  const [statusFilter, setStatusFilter] = useState(""); // '' = semua, 'kritis', 'menipis', 'aman'
  const [supplierFilter, setSupplierFilter] = useState(""); // '' = semua
  const [sortBy, setSortBy] = useState("default");
  const fileInputRef = useRef(null);

  const [qrProduct, setQrProduct] = useState(null);
  const [showBatchQR, setShowBatchQR] = useState(false);
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const activeMasterCats = useMemo(
    () => (masterCategories || []).filter((c) => c.active !== false),
    [masterCategories],
  );
  const selectedCatRule = useMemo(
    () => findCategory(masterCategories, form.category),
    [masterCategories, form.category],
  );

  const categories = useMemo(() => {
    const map = new Map();
    activeMasterCats.forEach((c) => {
      const raw = normalizeText(c.name);
      if (!raw) return;
      map.set(raw.toLowerCase(), raw);
    });
    products.forEach((p) => {
      const raw = normalizeText(p.category);
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, raw);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "id"));
  }, [products, activeMasterCats]);

  // List of unique suppliers from master and products
  const availableSuppliers = useMemo(() => {
    const set = new Set();
    suppliers.forEach((s) => s.name && set.add(s.name.trim()));
    products.forEach((p) => p.supplier && set.add(p.supplier.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [suppliers, products]);

  // 1. Matches for search query across ALL categories
  const allSearchMatches = useMemo(() => {
    const rawQ = String(filter || "").trim();
    if (!rawQ) return products;
    const tokens = normalizeForSearch(rawQ).split(" ").filter(Boolean);
    if (!tokens.length) return products;
    return products.filter((p) => {
      if (!p) return false;
      const searchable = getSearchableText(p);
      return tokens.every((token) => searchable.includes(token));
    });
  }, [products, filter]);

  // 2. Filtered products with all active criteria
  const filtered = useMemo(() => {
    const rawQ = String(filter || "").trim();
    const catKey = normalizeCat(catFilter);
    const tokens = normalizeForSearch(rawQ).split(" ").filter(Boolean);

    let result = products.filter((p) => {
      if (!p) return false;

      // Category filter
      if (catKey && normalizeCat(p.category) !== catKey) {
        return false;
      }

      // Stock status filter
      if (statusFilter) {
        const stock = Number(p.stock || 0);
        const min = Number(p.min_stock || 0);
        if (statusFilter === "kritis" && stock > 5) return false;
        if (statusFilter === "menipis" && (stock > min || stock <= 5)) return false;
        if (statusFilter === "aman" && stock <= min) return false;
      }

      // Supplier filter
      if (supplierFilter) {
        if (
          normalizeText(p.supplier).toLowerCase() !==
          supplierFilter.toLowerCase()
        ) {
          return false;
        }
      }

      // Search tokens
      if (tokens.length) {
        const searchable = getSearchableText(p);
        if (!tokens.every((token) => searchable.includes(token))) {
          return false;
        }
      }

      return true;
    });

    // Sort order
    if (sortBy === "name_asc") {
      result.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "id"),
      );
    } else if (sortBy === "name_desc") {
      result.sort((a, b) =>
        String(b.name || "").localeCompare(String(a.name || ""), "id"),
      );
    } else if (sortBy === "price_asc") {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "stock_asc") {
      result.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
    } else if (sortBy === "stock_desc") {
      result.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    }

    return result;
  }, [products, filter, catFilter, statusFilter, supplierFilter, sortBy]);

  const handleCategoryClick = (c) => {
    const nextCat = normalizeCat(catFilter) === normalizeCat(c) ? "" : c;
    setCatFilter(nextCat);

    // If there's an active search query that has NO matches in this category,
    // clear the search so user immediately sees all products in that category
    if (filter && nextCat) {
      const tokens = normalizeForSearch(filter).split(" ").filter(Boolean);
      const matchInNext = products.some((p) => {
        if (normalizeCat(p.category) !== normalizeCat(nextCat)) return false;
        return tokens.every((t) => getSearchableText(p).includes(t));
      });
      if (!matchInNext) {
        setFilter("");
      }
    }
  };

  const resetAllFilters = () => {
    setFilter("");
    setCatFilter("");
    setStatusFilter("");
    setSupplierFilter("");
    setSortBy("default");
  };

  const hasActiveFilters = Boolean(
    filter ||
      catFilter ||
      statusFilter ||
      supplierFilter ||
      sortBy !== "default",
  );

  const openAdd = () => {
    const catName = catFilter || activeMasterCats[0]?.name || "MCB";
    const rule = findCategory(masterCategories, catName);
    const base = { ...EMPTY_FORM, category: catName, image_url: "" };
    setForm(applyCategoryToForm(base, rule));
    setFormModal("add");
    setEditId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyCategoryChange = (name) => {
    const rule = findCategory(masterCategories, name);
    setForm((prev) =>
      applyCategoryToForm(
        {
          ...prev,
          category: name,
          min_stock: formModal === "add" ? "" : prev.min_stock,
          supplier: formModal === "add" ? "" : prev.supplier,
        },
        rule,
        {
          fillPrice: formModal === "add" && Number(prev.cost) > 0,
        },
      ),
    );
  };

  const openEdit = (p) => {
    setForm({
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost ?? defaultCostFromPrice(p.price),
      stock: p.stock,
      min_stock: p.min_stock,
      unit: p.unit || "pcs",
      supplier: p.supplier || "",
      image_url: p.image_url || p.image || "",
    });
    setFormModal("edit");
    setEditId(p.id);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handler for uploading local image file with automatic canvas optimization
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("File yang dipilih harus berupa gambar (JPG, PNG, WEBP, SVG)!");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file gambar maksimal 5MB!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const resized = canvas.toDataURL("image/jpeg", 0.88);
          setForm((prev) => ({ ...prev, image_url: resized }));
        } else {
          setForm((prev) => ({ ...prev, image_url: dataUrl }));
        }
      };
      img.onerror = () => {
        setForm((prev) => ({ ...prev, image_url: dataUrl }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const clearImageToDefault = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveForm = () => {
    if (!form.name) return alert("Nama wajib diisi!");
    const rule = findCategory(masterCategories, form.category);
    const cost = Number(form.cost || 0);
    let price = Number(form.price || 0);
    if (!price && cost > 0 && rule)
      price = suggestedSellPrice(cost, rule.margin_pct);
    if (!price) return alert("Nama & Harga wajib diisi!");

    const finalImage =
      form.image_url && form.image_url.trim()
        ? form.image_url.trim()
        : CATEGORY_IMAGES[form.category] ||
          "/images/products/mcb_schneider_1p.jpg";

    const payload = {
      ...form,
      price,
      cost:
        cost ||
        (rule
          ? suggestedCostFromPrice(price, rule.margin_pct)
          : defaultCostFromPrice(price)),
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock || rule?.min_stock) || 0,
      supplier: form.supplier || rule?.default_supplier || "",
      unit: form.unit || rule?.default_unit || "pcs",
      image_url: finalImage,
      image: finalImage,
    };
    if (formModal === "add") {
      addProduct(payload);
    } else {
      updateProduct(editId, payload);
    }
    setFormModal(null);
  };

  const del = (id, name) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    deleteProduct(id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">PERSEDIAAN</div><h1 className="page-title">Katalog produk</h1>
          <div className="page-subtitle">
            Katalog barang toko listrik · {filtered.length} item
            {catFilter ? ` · Kategori ${catFilter}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowBatchQR(true)} style={btnOutline}>
            <i className="fas fa-qrcode"></i> Cetak QR
          </button>
          <button onClick={openAdd} className="button button-primary">
            <i className="fas fa-plus"></i> Tambah Produk
          </button>
        </div>
      </div>

      <div className="catalog-summary"><span><strong>{products.length}</strong> produk terdaftar</span><span><strong>{categories.length}</strong> kategori</span><span><strong>{products.filter(p => Number(p.stock) <= Number(p.min_stock || 0)).length}</strong> perlu perhatian</span></div>
      {/* Product filters */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", gridColumn: "1 / -1", minWidth: 0 }}>
            <i
              className="fas fa-magnifying-glass"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94A3B8",
                fontSize: 13,
                pointerEvents: "none",
              }}
            ></i>
            <input
              type="text"
              placeholder={
                catFilter
                  ? `Cari produk di kategori "${catFilter}" (atau ketik nama/SKU)...`
                  : "Cari nama produk / SKU / supplier / spesifikasi (contoh: 2x2.5, broco, 20A)..."
              }
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 40px 11px 38px",
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                fontSize: 13.5,
                outline: "none",
                background: "#fff",
                color: "#0F172A",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#0056b3";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(0,86,179,0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#CBD5E1";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
              }}
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#E2E8F0",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748B",
                  cursor: "pointer",
                  fontSize: 11,
                }}
                title="Hapus kata kunci pencarian"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* Status Stok Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Status Stok
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                background: "#fff",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              <option value="">Semua Status Stok</option>
              <option value="kritis">⚠ Kritis (Stok ≤ 5)</option>
              <option value="menipis">Menipis (Stok ≤ Minimum)</option>
              <option value="aman">Aman (Stok &gt; Minimum)</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Supplier
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                background: "#fff",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              <option value="">Semua Supplier</option>
              {availableSuppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Urutkan Berdasarkan
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 12.5,
                background: "#fff",
                color: "#1E293B",
                fontWeight: 500,
              }}
            >
              <option value="default">Default Katalog</option>
              <option value="name_asc">Nama Produk (A - Z)</option>
              <option value="name_desc">Nama Produk (Z - A)</option>
              <option value="price_asc">Harga (Termurah)</option>
              <option value="price_desc">Harga (Termahal)</option>
              <option value="stock_asc">Stok (Tersedikit)</option>
              <option value="stock_desc">Stok (Terbanyak)</option>
            </select>
          </div>

          {/* Reset All Button */}
          {hasActiveFilters && (
            <div style={{ display: "flex", alignItems: "flex-end", height: "100%" }}>
              <button
                type="button"
                onClick={resetAllFilters}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#E2E8F0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F8FAFC")}
              >
                <i className="fas fa-rotate-left"></i> Reset Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category chips — toggleable with accurate count */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}
      >
        <button
          type="button"
          onClick={() => setCatFilter("")}
          style={chipStyle(!catFilter)}
        >
          Semua ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter(
            (p) => normalizeCat(p.category) === normalizeCat(c),
          ).length;
          const active = normalizeCat(catFilter) === normalizeCat(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => handleCategoryClick(c)}
              style={chipStyle(active)}
              title={active ? "Klik untuk membatalkan filter" : `Filter kategori ${c}`}
            >
              <i
                className={`fas ${ICONS[c] || "fa-cube"}`}
                style={{ marginRight: 6, fontSize: 11 }}
              ></i>
              {c} ({count})
            </button>
          );
        })}
      </div>

      {/* Active filters badges & Cross-category suggestions */}
      {hasActiveFilters && (
        <div
          style={{
            fontSize: 12,
            color: "#475569",
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>Menampilkan <b>{filtered.length}</b> dari {products.length} produk</span>

          {catFilter && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(0,86,179,0.08)",
                color: "#0056b3",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Kategori: {catFilter}
              <i
                className="fas fa-times"
                style={{ cursor: "pointer" }}
                onClick={() => setCatFilter("")}
                title="Hapus filter kategori"
              ></i>
            </span>
          )}

          {filter && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#F1F5F9",
                color: "#334155",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Cari: "{filter}"
              <i
                className="fas fa-times"
                style={{ cursor: "pointer" }}
                onClick={() => setFilter("")}
                title="Hapus kata kunci"
              ></i>
            </span>
          )}

          {statusFilter && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#FEF3C7",
                color: "#B45309",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Status: {statusFilter}
              <i
                className="fas fa-times"
                style={{ cursor: "pointer" }}
                onClick={() => setStatusFilter("")}
              ></i>
            </span>
          )}

          {supplierFilter && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#F1F5F9",
                color: "#334155",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              Supplier: {supplierFilter}
              <i
                className="fas fa-times"
                style={{ cursor: "pointer" }}
                onClick={() => setSupplierFilter("")}
              ></i>
            </span>
          )}
        </div>
      )}

      {/* Helpful cross-category search notification */}
      {catFilter && filter && filtered.length === 0 && allSearchMatches.length > 0 && (
        <div
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#1E40AF", fontSize: 13 }}>
            <i className="fas fa-lightbulb" style={{ fontSize: 16 }}></i>
            <span>
              Tidak ada produk di kategori <b>"{catFilter}"</b> dengan kata kunci <b>"{filter}"</b>.
              Ditemukan <b>{allSearchMatches.length} produk</b> yang cocok di kategori lain!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCatFilter("")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "#0056b3",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Lihat di Semua Kategori ({allSearchMatches.length})
          </button>
        </div>
      )}

      <div className="catalog-view-bar"><span><strong>{filtered.length}</strong> produk ditampilkan</span><div className="view-toggle" role="group" aria-label="Tampilan katalog"><button aria-pressed={view === "table"} onClick={() => setView("table")}><Icon name="file" size={14} />Tabel</button><button aria-pressed={view === "grid"} onClick={() => setView("grid")}><Icon name="grid" size={14} />Kartu</button></div></div>
      {view === "table" && filtered.length > 0 && <div className="panel table-scroll"><table className="activity-table catalog-table"><thead><tr><th scope="col">Produk / SKU</th><th scope="col">Kategori</th><th scope="col">Supplier</th><th scope="col">Harga jual</th><th scope="col">Stok tersedia</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>{filtered.map(p => <tr key={p.sku || p.id}>
        <td><div className="catalog-product"><img src={resolveProductImage(p)} alt="" loading="lazy" /><div><button className="product-name-button" onClick={() => onSelect?.(p)}>{p.name}</button><small>{p.sku || "Tanpa SKU"}</small></div></div></td><td>{p.category}</td><td>{p.supplier || "—"}</td><td><strong>Rp {formatRp(p.price)}</strong></td><td><strong>{p.stock}</strong> {p.unit || "pcs"}<small>Minimum {p.min_stock || 0}</small></td><td><span className={"status-tag " + (Number(p.stock) <= Number(p.min_stock || 0) ? "out" : "")}>{Number(p.stock) === 0 ? "Habis" : Number(p.stock) <= Number(p.min_stock || 0) ? "Menipis" : "Tersedia"}</span></td>
        <td><div className="catalog-actions"><button className="icon-btn" title="Lihat QR" aria-label={"QR " + p.name} onClick={() => setQrProduct(p)}><Icon name="scan" size={15} /></button><button className="icon-btn" title="Edit produk" aria-label={"Edit " + p.name} onClick={() => openEdit(p)}><i className="fas fa-pen" aria-hidden="true" /></button><button className="icon-btn" title="Hapus produk" aria-label={"Hapus " + p.name} onClick={() => del(p.id, p.name)}><i className="fas fa-trash" aria-hidden="true" /></button></div></td>
      </tr>)}</tbody></table></div>}
      {view === "grid" && <>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((p, pIdx) => {
          const cost = Number(p.cost ?? defaultCostFromPrice(p.price));
          const price = Number(p.price || 0);
          const gross = price - cost;
          const marginPct = cost > 0 ? Math.round((gross / cost) * 100) : 0;
          const cardKey = p.sku
            ? `prod-sku-${p.sku}`
            : `prod-${p.id || pIdx}-${p.name}`;
          return (
            <div
              key={cardKey}
              style={{
                background: "#fff",
                border: "1px solid #E6E8EA",
                borderRadius: 12,
                padding: 20,
                transition: "all 0.25s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                position: "relative",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 8px 25px rgba(0,0,0,0.07)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)")
              }
            >
              {/* Badge Kritis / Menipis — elevated z-index & strong shadow */}
              {p.stock <= p.min_stock && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 20,
                    background: p.stock <= 5 ? "#DC2626" : "#FF7300",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3.5px 8px",
                    borderRadius: 6,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    pointerEvents: "none",
                  }}
                >
                  <i
                    className="fas fa-exclamation-triangle"
                    style={{ fontSize: 9 }}
                  ></i>
                  {p.stock <= 5 ? "Kritis" : "Menipis"}
                </div>
              )}
              <div onClick={() => onSelect?.(p)} style={{ cursor: "pointer" }}>
                <div
                  style={{
                    width: "100%",
                    height: 140,
                    borderRadius: 10,
                    marginBottom: 12,
                    background: "#ffffff",
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <img
                    src={resolveProductImage(p)}
                    alt={p.name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: 8,
                      transition: "transform 0.25s ease",
                    }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        CATEGORY_IMAGES[p.category] ||
                        "/images/products/mcb_schneider_1p.jpg";
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: 6,
                      padding: "2px 7px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(241, 245, 249, 0.92)",
                      color: "#334155",
                      border: "1px solid #E2E8F0",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <i
                      className={`fas ${ICONS[p.category] || "fa-cube"}`}
                      style={{ fontSize: 9, color: "#0056b3" }}
                    ></i>
                    {p.category}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 4,
                    color: "#0F172A",
                  }}
                >
                  {p.name}
                </div>
                {p.sku && (
                  <div
                    style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}
                  >
                    SKU: {p.sku}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <i
                    className="fas fa-truck"
                    style={{ fontSize: 10, color: "#0056b3" }}
                  ></i>
                  <span style={{ fontWeight: 600 }}>
                    {p.supplier || "Supplier belum diisi"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      Rp {price.toLocaleString("id-ID")}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      HPP Rp {cost.toLocaleString("id-ID")} · Margin {marginPct}
                      %
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: p.stock <= p.min_stock ? "#DC2626" : "#059669",
                      fontWeight: 600,
                    }}
                  >
                    Stok: {p.stock}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(p);
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    border: "none",
                    borderRadius: 8,
                    background: "#0056b3",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <i className="fas fa-cube"></i> 3D
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrProduct(p);
                  }}
                  style={iconBtn("#0056b3")}
                >
                  <i className="fas fa-qrcode"></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p);
                  }}
                  style={iconBtn("#FF7300")}
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    del(p.id, p.name);
                  }}
                  style={iconBtn("#DC2626")}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      </>}
      {filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            marginTop: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#F1F5F9",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 22,
            }}
          >
            <i className="fas fa-search"></i>
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1E293B",
              marginBottom: 6,
            }}
          >
            Produk Tidak Ditemukan
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#64748B",
              maxWidth: 460,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            {catFilter && filter && allSearchMatches.length > 0 ? (
              <span>
                Tidak ada produk di kategori <b>"{catFilter}"</b> dengan kata kunci <b>"{filter}"</b>.
                Namun ditemukan <b>{allSearchMatches.length} produk</b> yang cocok di kategori lainnya.
              </span>
            ) : hasActiveFilters ? (
              <span>
                Tidak ada produk yang cocok dengan kombinasi pencarian atau filter aktif saat ini.
                Coba gunakan kata kunci yang lebih umum atau reset filter.
              </span>
            ) : (
              <span>Belum ada produk yang terdaftar di katalog.</span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {catFilter && filter && allSearchMatches.length > 0 && (
              <button
                type="button"
                onClick={() => setCatFilter("")}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0056b3",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Lihat di Semua Kategori ({allSearchMatches.length})
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <i className="fas fa-rotate-left" style={{ marginRight: 6 }}></i>
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={!!formModal} onClose={() => setFormModal(null)} size="lg">
        {formModal && (
          <>
            <div className="modal-header">
              <h3>
                <i
                  className={
                    formModal === "add" ? "fas fa-plus-circle" : "fas fa-edit"
                  }
                  style={{ color: "#0056b3" }}
                ></i>
                {formModal === "add" ? "Tambah Produk Baru" : "Edit Produk"}
              </h3>
              <button
                onClick={() => setFormModal(null)}
                className="modal-close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Nama Produk <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Contoh: MCB Schneider 20A 1 Phase"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Kategori
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => applyCategoryChange(e.target.value)}
                    style={inputStyle}
                  >
                    {(categories.length
                      ? categories
                      : [
                          "MCB",
                          "Kabel",
                          "Fitting",
                          "Saklar",
                          "Stop Kontak",
                          "Steker",
                          "Panel",
                          "Lampu",
                          "Aksesoris",
                        ]
                    ).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Supplier
                  </label>
                  <select
                    value={form.supplier}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, supplier: e.target.value }))
                    }
                    style={inputStyle}
                  >
                    <option value="">— Pilih supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Harga Jual (Rp) <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Harga Beli / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((prev) => {
                        const next = { ...prev, cost: value };
                        if (
                          formModal === "add" &&
                          selectedCatRule &&
                          Number(value) > 0 &&
                          !prev.price
                        ) {
                          next.price = suggestedSellPrice(
                            value,
                            selectedCatRule.margin_pct,
                          );
                        }
                        return next;
                      });
                    }}
                    placeholder="0"
                    style={inputStyle}
                  />
                  {selectedCatRule && (
                    <div
                      style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}
                    >
                      Margin target: {selectedCatRule.margin_pct}%
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, stock: e.target.value }))
                    }
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Minimum Stok (Safety Stock)
                  </label>
                  <input
                    type="number"
                    value={form.min_stock}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        min_stock: e.target.value,
                      }))
                    }
                    placeholder={
                      selectedCatRule ? String(selectedCatRule.min_stock) : "10"
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="pcs / roll / pack"
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1E293B",
                          display: "block",
                        }}
                      >
                        <i
                          className="fas fa-image"
                          style={{ color: "#0056b3", marginRight: 6 }}
                        ></i>
                        Gambar Produk
                      </label>
                      <span style={{ fontSize: 11, color: "#64748B" }}>
                        Upload foto dari perangkat atau biarkan kosong untuk memakai gambar default katalog
                      </span>
                    </div>

                    {form.image_url ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: "#ECFDF5",
                          color: "#059669",
                          border: "1px solid #A7F3D0",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <i className="fas fa-check-circle"></i> Gambar Sendiri Terpasang
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: "#EFF6FF",
                          color: "#1D4ED8",
                          border: "1px solid #BFDBFE",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <i className="fas fa-sparkles"></i> Gambar Default Kategori ({form.category})
                      </span>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Preview Box */}
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 10,
                        background: "#fff",
                        border: "2px dashed #CBD5E1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        cursor: "pointer",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      title="Klik untuk memilih file foto dari komputer"
                    >
                      <img
                        src={
                          form.image_url ||
                          CATEGORY_IMAGES[form.category] ||
                          "/images/products/mcb_schneider_1p.jpg"
                        }
                        alt="Preview Produk"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          padding: 6,
                        }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            CATEGORY_IMAGES[form.category] ||
                            "/images/products/mcb_schneider_1p.jpg";
                        }}
                      />
                    </div>

                    {/* Action Controls */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 240,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "none",
                            background: "#0056b3",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 2px 6px rgba(0,86,179,0.2)",
                          }}
                        >
                          <i className="fas fa-upload"></i>
                          {form.image_url ? "Ganti Gambar dari File" : "Upload Gambar Sendiri"}
                        </button>

                        <button
                          type="button"
                          onClick={clearImageToDefault}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: "1px solid #CBD5E1",
                            background: form.image_url ? "#fff" : "#F1F5F9",
                            color: form.image_url ? "#DC2626" : "#64748B",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                          title="Hapus gambar sendiri dan otomatis pakai gambar default kategori"
                        >
                          <i className="fas fa-rotate-left"></i>
                          Kosongkan (Gunakan Default)
                        </button>
                      </div>

                      <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                        {form.image_url ? (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
                            Foto kustom Anda siap disimpan. Klik <b>"Kosongkan (Gunakan Default)"</b> jika ingin kembali menggunakan foto bawaan kategori <b>{form.category}</b>.
                          </span>
                        ) : (
                          <span>
                            <i className="fas fa-info-circle" style={{ marginRight: 4, color: "#0056b3" }}></i>
                            Kolom gambar kosong. Produk otomatis akan memakai gambar resmi kategori <b>{form.category}</b>.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setFormModal(null)}
                style={btnGhost}
              >
                Batal
              </button>
              <button type="button" onClick={saveForm} style={btnPrimary}>
                <i className="fas fa-check"></i>
                {formModal === "add" ? "Tambah Produk" : "Simpan Perubahan"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal isOpen={!!qrProduct} onClose={() => setQrProduct(null)} size="sm">
        {qrProduct && (
          <>
            <div className="modal-header">
              <h3>
                <i className="fas fa-qrcode" style={{ color: "#0056b3" }}></i>
                QR Code Produk
              </h3>
              <button
                onClick={() => setQrProduct(null)}
                className="modal-close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#0056b3",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {qrProduct.category}
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#0F172A",
                    marginTop: 2,
                  }}
                >
                  {qrProduct.name}
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#0056b3",
                    marginTop: 4,
                  }}
                >
                  Rp {Number(qrProduct.price).toLocaleString("id-ID")}
                </div>
              </div>
              <QRGenerator product={qrProduct} size={200} />
              <p
                style={{
                  fontSize: 11.5,
                  color: "#64748B",
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                Scan dari HP atau cetak stiker untuk rak &amp; kardus barang
              </p>
            </div>
          </>
        )}
      </Modal>

      {/* Batch QR */}
      <Modal
        isOpen={showBatchQR}
        onClose={() => setShowBatchQR(false)}
        size="xl"
      >
        <div className="modal-header">
          <h3>
            <i className="fas fa-qrcode" style={{ color: "#0056b3" }}></i>
            Batch QR Code — {catFilter || "Semua Kategori"} ({filtered.length}{" "}
            Produk)
          </h3>
          <button
            onClick={() => setShowBatchQR(false)}
            className="modal-close-btn"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  textAlign: "center",
                  background: "#fff",
                }}
              >
                <QRGenerator product={p} size={110} />
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{ fontSize: 11, color: "#0056b3", fontWeight: 800 }}
                >
                  Rp {Number(p.price).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function chipStyle(active) {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: active ? "1px solid #0056b3" : "1px solid #E6E8EA",
    background: active ? "rgba(0,86,179,0.09)" : "#fff",
    color: active ? "#0056b3" : "#475569",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  };
}

function iconBtn(color) {
  return {
    padding: "7px 10px",
    border: `1px solid ${color}`,
    borderRadius: 8,
    background: "#fff",
    color,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  };
}

const btnPrimary = {
  padding: "9px 18px",
  border: "none",
  borderRadius: 10,
  background: "var(--success)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
  transition:
    "background 0.2s var(--ease-soft), transform 0.2s var(--ease-out)",
};

const btnOutline = {
  padding: "9px 18px",
  border: "1px solid #0056b3",
  borderRadius: 10,
  background: "#fff",
  color: "#0056b3",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const btnGhost = {
  flex: 1,
  padding: "10px",
  border: "1px solid #E6E8EA",
  borderRadius: 8,
  background: "#fff",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modal = {
  background: "#fff",
  borderRadius: 16,
  padding: 28,
  maxWidth: 480,
  width: "90%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #E6E8EA",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  color: "#002a5c",
};

const closeBtn = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "none",
  background: "#F8FAFC",
  cursor: "pointer",
  fontSize: 16,
};
