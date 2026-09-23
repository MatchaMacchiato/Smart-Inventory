import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import { productApi, stockApi, dashboardApi } from "../services/api";
import {
  INITIAL_PRODUCTS,
  buildInitialHistory,
  CATEGORY_BARCODES,
  CATEGORY_IMAGES,
  CATEGORY_MODELS,
  resolveProductImage,
  resolveModelUrl,
} from "../data/products";

const InventoryContext = createContext(null);

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function normalizeCategory(value) {
  const raw = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return raw || "Lainnya";
}

function normalizeName(str) {
  return String(str ?? "")
    .replace(/[×✕]/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isCustomImage(img) {
  if (!img || typeof img !== "string") return false;
  return (
    img.startsWith("data:") ||
    img.startsWith("blob:") ||
    img.startsWith("http://") ||
    img.startsWith("https://") ||
    img.startsWith("/storage/")
  );
}

export function deduplicateProducts(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const nameMap = new Map();
  const skuMap = new Map();
  const idMap = new Map();
  const unique = [];

  for (const p of list) {
    if (!p) continue;
    const nameKey = normalizeName(p.name);
    const skuKey = p.sku ? String(p.sku).trim().toUpperCase() : "";
    const idKey = p.id != null ? String(p.id) : "";

    let existing = null;
    if (nameKey && nameMap.has(nameKey)) {
      existing = nameMap.get(nameKey);
    } else if (skuKey && skuMap.has(skuKey)) {
      existing = skuMap.get(skuKey);
    } else if (idKey && idMap.has(idKey)) {
      existing = idMap.get(idKey);
    }

    const resolvedCat = normalizeCategory(p.category);
    if (existing) {
      // Merge best properties into existing
      if (!existing.sku && p.sku) existing.sku = p.sku;
      if (!existing.barcode && (p.barcode || p.sku)) {
        existing.barcode = p.barcode || p.sku;
      }
      existing.model_3d_url = resolveModelUrl(existing) || resolveModelUrl(p);
      const pImg = p.image_url || p.image;
      const exImg = existing.image_url || existing.image;
      if (isCustomImage(pImg) && !isCustomImage(exImg)) {
        existing.image_url = pImg;
        existing.image = pImg;
      }
      continue;
    }

    const item = {
      ...p,
      category: resolvedCat,
      model_3d_url: resolveModelUrl({ ...p, category: resolvedCat }),
    };
    unique.push(item);
    if (nameKey) nameMap.set(nameKey, item);
    if (skuKey) skuMap.set(skuKey, item);
    if (idKey) idMap.set(idKey, item);
  }

  return unique;
}

function mergeProducts(apiList, local) {
  const cleanLocal = deduplicateProducts(
    Array.isArray(local) && local.length ? local : INITIAL_PRODUCTS,
  );
  if (!apiList?.length) return cleanLocal;

  const byName = new Map();
  const bySku = new Map();
  const byId = new Map();

  cleanLocal.forEach((p, idx) => {
    const nameKey = normalizeName(p.name);
    const skuKey = p.sku ? String(p.sku).trim().toUpperCase() : "";
    const idKey = p.id != null ? String(p.id) : "";

    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, idx);
    if (skuKey && !bySku.has(skuKey)) bySku.set(skuKey, idx);
    if (idKey && !byId.has(idKey)) byId.set(idKey, idx);
  });

  const merged = [...cleanLocal];

  apiList.forEach((apiP) => {
    if (!apiP) return;
    const nameKey = normalizeName(apiP.name);
    const skuKey = apiP.sku ? String(apiP.sku).trim().toUpperCase() : "";
    const idKey = apiP.id != null ? String(apiP.id) : "";

    let matchIdx = -1;
    if (nameKey && byName.has(nameKey)) {
      matchIdx = byName.get(nameKey);
    } else if (skuKey && bySku.has(skuKey)) {
      matchIdx = bySku.get(skuKey);
    } else if (idKey && byId.has(idKey)) {
      matchIdx = byId.get(idKey);
    }

    const apiCategory = String(apiP.category ?? "").trim();
    const apiSupplier = String(apiP.supplier ?? "").trim();

    if (matchIdx >= 0) {
      const prev = merged[matchIdx];
      const resolvedCat = normalizeCategory(apiCategory || prev.category);
      const prevImg = prev.image_url || prev.image;
      const apiImg = apiP.image_url || apiP.image;
      const finalImg =
        (isCustomImage(prevImg) ? prevImg : null) ||
        (isCustomImage(apiImg) ? apiImg : null) ||
        prevImg ||
        apiImg ||
        CATEGORY_IMAGES[resolvedCat] ||
        "/images/products/mcb_schneider_1p.jpg";

      merged[matchIdx] = {
        ...prev,
        ...apiP,
        id: prev.id ?? apiP.id,
        sku: prev.sku || apiP.sku || `SKU-${apiP.id || matchIdx + 1}`,
        barcode:
          prev.barcode ||
          apiP.barcode ||
          prev.sku ||
          apiP.sku ||
          `SKU-${apiP.id || matchIdx + 1}`,
        name: apiP.name || prev.name,
        category: resolvedCat,
        supplier: apiSupplier || prev.supplier || "",
        stock: Number(apiP.stock ?? prev.stock ?? 0),
        min_stock: Number(apiP.min_stock ?? prev.min_stock ?? 0),
        price: Number(apiP.price ?? prev.price ?? 0),
        cost: Number(apiP.cost ?? prev.cost ?? 0) || prev.cost || undefined,
        model_3d_url: prev.model_3d_url || apiP.model_3d_url || null,
        image_url: finalImg,
        image: finalImg,
        unit: apiP.unit || prev.unit || "pcs",
      };
    } else {
      const resolvedCat = normalizeCategory(apiCategory || "Lainnya");
      const newSku = apiP.sku || `SKU-${apiP.id || Date.now()}`;
      const newImg =
        apiP.image_url ||
        apiP.image ||
        CATEGORY_IMAGES[resolvedCat] ||
        "/images/products/mcb_schneider_1p.jpg";
      const newProd = {
        ...apiP,
        id: apiP.id || Date.now(),
        sku: newSku,
        barcode: apiP.barcode || newSku,
        name: apiP.name || "Produk Baru",
        category: resolvedCat,
        supplier: apiSupplier,
        stock: Number(apiP.stock || 0),
        min_stock: Number(apiP.min_stock || 0),
        price: Number(apiP.price || 0),
        cost: Number(apiP.cost || 0) || undefined,
        model_3d_url: apiP.model_3d_url || null,
        image_url: newImg,
        image: newImg,
        unit: apiP.unit || "pcs",
      };
      const newIdx = merged.length;
      merged.push(newProd);
      if (nameKey) byName.set(nameKey, newIdx);
      if (skuKey) bySku.set(skuKey, newIdx);
      if (idKey) byId.set(idKey, newIdx);
    }
  });

  return deduplicateProducts(merged);
}

function readStoredProducts() {
  try {
    const raw = localStorage.getItem("sis_products");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        const cleaned = deduplicateProducts(parsed);
        if (cleaned.length) return cleaned;
      }
    }
  } catch {}
  return deduplicateProducts(INITIAL_PRODUCTS);
}

export function InventoryProvider({ children }) {
  const [products, setProducts] = useState(() => readStoredProducts());
  const [history, setHistory] = useState(() =>
    buildInitialHistory(INITIAL_PRODUCTS),
  );
  const [source, setSource] = useState("local");
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [predictionSummary, setPredictionSummary] = useState(null);

  // Sync products ke localStorage agar produk kustom & gambar tersimpan
  useEffect(() => {
    try {
      if (products && products.length) {
        localStorage.setItem("sis_products", JSON.stringify(products));
      }
    } catch {}
  }, [products]);

  // Load dari API jika ada, tetap jaga data lokal lengkap
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      productApi.list({ per_page: 200 }),
      dashboardApi.stockMovement({ limit: 100, days: 60 }),
    ]).then(([prodRes, moveRes]) => {
      if (!alive) return;
      let got = false;
      if (prodRes.status === "fulfilled") {
        const list = normalizeList(prodRes.value.data);
        if (list.length) {
          setProducts((prev) =>
            mergeProducts(list, prev.length ? prev : INITIAL_PRODUCTS),
          );
          got = true;
        }
      }
      if (
        moveRes.status === "fulfilled" &&
        moveRes.value?.data?.recent?.length
      ) {
        const recent = moveRes.value.data.recent.map((h, i) => ({
          id: h.id || `api-${i}`,
          product_id: h.product_id,
          product_name: h.product_name,
          category: h.category || "-",
          sku: h.sku || "",
          stock_before: h.stock_before,
          stock_after: h.stock_after,
          change: h.change,
          type: h.type || (h.change >= 0 ? "masuk" : "keluar"),
          reason: h.reason,
          notes: h.notes,
          created_at: h.created_at,
        }));
        // gabungkan API + seed local (hindari kosong)
        setHistory((prev) => {
          const ids = new Set(recent.map((r) => String(r.id)));
          const rest = prev.filter((p) => !ids.has(String(p.id)));
          return [...recent, ...rest].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          );
        });
        got = true;
      }
      setSource(got ? "api+local" : "local");
      setLoading(false);
    });
    // Fetch predictions jika API tersedia
    stockApi
      .predictions()
      .then((res) => {
        if (res?.data?.predictions) {
          setPredictions(res.data.predictions);
          setPredictionSummary(res.data.summary);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total_products = products.length;
    const total_stock = products.reduce((s, p) => s + Number(p.stock || 0), 0);
    const low_stock_count = products.filter(
      (p) => Number(p.stock) <= Number(p.min_stock || 0),
    ).length;
    const categories_count = new Set(products.map((p) => p.category)).size;
    const stock_in = history
      .filter((h) => h.change > 0)
      .reduce((s, h) => s + h.change, 0);
    const stock_out = Math.abs(
      history.filter((h) => h.change < 0).reduce((s, h) => s + h.change, 0),
    );
    // "Hari Ini" = hanya tanggal kalender hari ini (otomatis reset tiap ganti hari)
    const todayKey = new Date().toDateString();
    const isToday = (iso) => {
      try {
        return new Date(iso).toDateString() === todayKey;
      } catch {
        return false;
      }
    };
    const stock_in_today = history
      .filter((h) => h.change > 0 && isToday(h.created_at))
      .reduce((s, h) => s + Number(h.change || 0), 0);
    const stock_out_today = Math.abs(
      history
        .filter((h) => h.change < 0 && isToday(h.created_at))
        .reduce((s, h) => s + Number(h.change || 0), 0),
    );
    const total_movements = history.length;
    const net_movement = stock_in - stock_out;
    const byCategory = {};
    products.forEach((p) => {
      if (!byCategory[p.category])
        byCategory[p.category] = {
          category: p.category,
          count: 0,
          total_stock: 0,
        };
      byCategory[p.category].count += 1;
      byCategory[p.category].total_stock += Number(p.stock || 0);
    });
    return {
      total_products,
      total_stock,
      low_stock_count,
      categories_count,
      stock_in,
      stock_out,
      stock_in_today,
      stock_out_today,
      total_movements,
      net_movement,
      categories: Object.values(byCategory),
      suppliers:
        new Set(products.map((p) => p.supplier).filter(Boolean)).size || 4,
      users: 2,
    };
  }, [products, history]);

  const daily = useMemo(() => {
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key, stock_in: 0, stock_out: 0 };
    }
    history.forEach((h) => {
      const key = new Date(h.created_at).toISOString().slice(0, 10);
      if (!map[key]) return;
      if (h.change > 0) map[key].stock_in += h.change;
      else map[key].stock_out += Math.abs(h.change);
    });
    return Object.values(map);
  }, [history]);

  const lowStock = useMemo(
    () =>
      products
        .filter((p) => Number(p.stock) <= Number(p.min_stock || 0))
        .map((p) => {
          const gap = Math.max(
            0,
            Number(p.min_stock || 0) - Number(p.stock || 0),
          );
          return {
            ...p,
            gap,
            suggest: Math.max(gap, Math.ceil(Number(p.min_stock || 0) * 0.5)),
          };
        })
        .sort((a, b) => b.gap - a.gap),
    [products],
  );

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(b.stock) - Number(a.stock))
        .slice(0, 8),
    [products],
  );

  const addProduct = useCallback(
    (data) => {
      const id = Math.max(0, ...products.map((p) => Number(p.id) || 0)) + 1;
      const sku = data.sku || `SKU-${id}`;
      const price = Number(data.price) || 0;
      const img =
        data.image_url ||
        data.image ||
        CATEGORY_IMAGES[data.category] ||
        "/images/products/mcb_schneider_1p.jpg";
      const row = {
        ...data,
        id,
        sku,
        barcode: data.barcode || sku,
        image_url: img,
        image: img,
        price,
        cost:
          data.cost != null
            ? Number(data.cost)
            : Math.round((price * 0.78) / 500) * 500,
        stock: Number(data.stock) || 0,
        min_stock: Number(data.min_stock) || 0,
      };
      setProducts((prev) => deduplicateProducts([...prev, row]));
      productApi.create(row).catch(() => {});
      return row;
    },
    [products],
  );

  const updateProduct = useCallback((id, data) => {
    setProducts((prev) =>
      prev.map((p) =>
        String(p.id) === String(id)
          ? {
              ...p,
              ...data,
              price: data.price != null ? Number(data.price) : p.price,
              cost: data.cost != null ? Number(data.cost) : p.cost,
              stock: data.stock != null ? Number(data.stock) : p.stock,
              min_stock:
                data.min_stock != null ? Number(data.min_stock) : p.min_stock,
            }
          : p,
      ),
    );
    productApi.update(id, data).catch(() => {});
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    productApi.delete(id).catch(() => {});
  }, []);

  /**
   * Transaksi stok — update produk + history (semua menu ikut berubah)
   */
  const applyStockChange = useCallback(
    async ({ productId, qty, mode, reason, notes, supplier, customer }) => {
      const product = products.find((p) => String(p.id) === String(productId));
      if (!product) throw new Error("Produk tidak ditemukan");
      const n = Number(qty);
      if (!n || n <= 0) throw new Error("Qty tidak valid");

      const before = Number(product.stock || 0);
      const change = mode === "in" ? n : -n;
      const after = before + change;
      if (after < 0)
        throw new Error(`Stok tidak cukup. Stok saat ini: ${before}`);

      const supplierName =
        mode === "in"
          ? String(supplier || product.supplier || "").trim() || "-"
          : product.supplier || "-";
      const customerName =
        mode === "out" ? String(customer || "").trim() || "-" : null;

      const row = {
        id: `local-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        sku: product.sku,
        stock_before: before,
        stock_after: after,
        change,
        type: mode === "in" ? "masuk" : "keluar",
        reason: reason || (mode === "in" ? "purchase" : "sale"),
        notes: notes || (mode === "in" ? "Barang masuk" : "Barang keluar"),
        supplier: supplierName,
        customer: customerName,
        created_at: new Date().toISOString(),
      };

      // Barang masuk: update supplier default produk kalau diisi
      setProducts((prev) =>
        prev.map((p) => {
          if (String(p.id) !== String(productId)) return p;
          const next = { ...p, stock: after };
          if (mode === "in" && supplierName && supplierName !== "-")
            next.supplier = supplierName;
          return next;
        }),
      );
      setHistory((prev) => [row, ...prev]);

      try {
        await stockApi.update(productId, {
          stock: after,
          reason: row.reason,
          notes: row.notes,
          supplier: mode === "in" ? supplierName : undefined,
          customer: mode === "out" ? customerName : undefined,
        });
      } catch {
        // offline ok — state lokal tetap master
      }
      return row;
    },
    [products],
  );

  const getHistoryFiltered = useCallback(
    (filter) => {
      let rows = [...history];
      if (filter === "masuk" || filter === "in")
        rows = rows.filter((h) => h.change > 0);
      if (filter === "keluar" || filter === "out")
        rows = rows.filter((h) => h.change < 0);
      if (filter === "today") {
        const t = new Date().toDateString();
        rows = rows.filter((h) => new Date(h.created_at).toDateString() === t);
      }
      if (filter === "low") {
        // history terkait produk low stock
        const lowIds = new Set(lowStock.map((p) => String(p.id)));
        rows = rows.filter((h) => lowIds.has(String(h.product_id)));
      }
      return rows;
    },
    [history, lowStock],
  );

  const value = {
    products,
    history,
    stats,
    daily,
    lowStock,
    topProducts,
    source,
    loading,
    categoryBarcodes: CATEGORY_BARCODES,
    addProduct,
    updateProduct,
    deleteProduct,
    applyStockChange,
    getHistoryFiltered,
    setProducts,
    predictions,
    predictionSummary,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx)
    throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
