import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { INITIAL_SUPPLIERS } from "../data/suppliers";
import { INITIAL_CUSTOMERS } from "../data/customers";
import { CATEGORY_BARCODES } from "../data/products";
import { useInventory } from "./InventoryContext";
import { withCategoryDefaults, findCategory } from "../utils/categoryRules";

const MasterContext = createContext(null);

function readPO() {
  try {
    return JSON.parse(localStorage.getItem("sis_po")) || [];
  } catch {
    return [];
  }
}

function readPayables() {
  try {
    return JSON.parse(localStorage.getItem("sis_payables")) || [];
  } catch {
    return [];
  }
}

function readPipeline() {
  try {
    return (
      JSON.parse(localStorage.getItem("sis_pipeline")) || {
        apriori: [],
        eoq: [],
        updated_at: null,
      }
    );
  } catch {
    return { apriori: [], eoq: [], updated_at: null };
  }
}

const SEED_CATEGORIES = [
  { id: 1, name: "MCB", code: "CAT-MCB", description: "Proteksi arus listrik" },
  {
    id: 2,
    name: "Kabel",
    code: "CAT-KABEL",
    description: "Konduktor & instalasi",
  },
  { id: 3, name: "Fitting", code: "CAT-FITTING", description: "Dudukan lampu" },
  {
    id: 4,
    name: "Saklar",
    code: "CAT-SAKLAR",
    description: "Pengendali listrik",
  },
  {
    id: 5,
    name: "Stop Kontak",
    code: "CAT-STOPKONTAK",
    description: "Outlet listrik",
  },
  {
    id: 6,
    name: "Steker",
    code: "CAT-STEKER",
    description: "Konektor colokan",
  },
  { id: 7, name: "Panel", code: "CAT-PANEL", description: "Panel distribusi" },
  { id: 8, name: "Lampu", code: "CAT-LAMPU", description: "Sumber penerangan" },
  {
    id: 9,
    name: "Aksesoris",
    code: "CAT-AKSESORIS",
    description: "Perlengkapan pendukung",
  },
].map(withCategoryDefaults);

function readCategories() {
  try {
    const raw = JSON.parse(localStorage.getItem("sis_categories"));
    if (Array.isArray(raw) && raw.length) return raw.map(withCategoryDefaults);
  } catch {}
  return SEED_CATEGORIES;
}

function readSuppliers() {
  try {
    const raw = JSON.parse(localStorage.getItem("sis_suppliers"));
    if (Array.isArray(raw) && raw.length) return raw;
  } catch {}
  return INITIAL_SUPPLIERS;
}

/**
 * Alur inti skripsi:
 * Apriori (companion) ─┐
 * EOQ (qty ideal)     ─┼→ pipeline → Rekomendasi PO (Draft) → Apply ke Barang Masuk (stok naik)
 * Stok aktual         ─┘
 */
export function MasterProvider({ children }) {
  const inventory = useInventory();
  const [categories, setCategories] = useState(() => readCategories());

  const persistCategories = useCallback((list) => {
    setCategories(list);
    try {
      localStorage.setItem("sis_categories", JSON.stringify(list));
    } catch {}
    return list;
  }, []);
  const [suppliers, setSuppliers] = useState(() => readSuppliers());

  const persistSuppliers = useCallback((list) => {
    setSuppliers(list);
    try {
      localStorage.setItem("sis_suppliers", JSON.stringify(list));
    } catch {}
    return list;
  }, []);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [purchaseOrders, setPurchaseOrders] = useState(() => readPO());
  const [payables, setPayables] = useState(() => readPayables());
  const [pipeline, setPipeline] = useState(() => readPipeline());

  const supplierById = useCallback(
    (id) => suppliers.find((s) => String(s.id) === String(id)),
    [suppliers],
  );

  const savePO = useCallback((list) => {
    setPurchaseOrders(list);
    try {
      localStorage.setItem("sis_po", JSON.stringify(list));
    } catch {}
  }, []);

  const savePayables = useCallback((list) => {
    setPayables(list);
    try {
      localStorage.setItem("sis_payables", JSON.stringify(list));
    } catch {}
  }, []);

  /** Catat hutang ke supplier saat PO diterima (otomatis). */
  const addPayableFromPO = useCallback(
    (po) => {
      if (!po || !Array.isArray(po.items) || !po.items.length) return null;
      const supplierId = po.supplier_id || null;
      const supplier =
        suppliers.find((s) => String(s.id) === String(supplierId)) ||
        suppliers.find(
          (s) =>
            String(s.name || "").toLowerCase() ===
            String(po.supplier || "").toLowerCase(),
        );
      const term = Number(supplier?.payment_term || 0) || 0;
      const dueAt =
        term > 0 ? new Date(Date.now() + term * 86400000).toISOString() : null;
      const total = po.items.reduce(
        (sum, it) => sum + Number(it.qty) * Number(it.unit_price || 0),
        0,
      );
      const item = {
        id: `pay-${po.id}-${Date.now()}`,
        po_id: po.id,
        po_no: po.no || "-",
        supplier_id: supplier?.id || supplierId,
        supplier: po.supplier || supplier?.name || "Supplier",
        total,
        paid: 0,
        due_at: dueAt,
        payment_term: term,
        status: "unpaid",
        created_at: new Date().toISOString(),
        payments: [],
      };
      const next = [item, ...payables];
      savePayables(next);
      return item;
    },
    [payables, suppliers, savePayables],
  );

  const savePipeline = useCallback((next) => {
    const payload = { ...next, updated_at: new Date().toISOString() };
    setPipeline(payload);
    try {
      localStorage.setItem("sis_pipeline", JSON.stringify(payload));
    } catch {}
    return payload;
  }, []);

  const addPurchaseOrder = useCallback(
    (po) => {
      const id =
        Math.max(0, ...purchaseOrders.map((o) => Number(o.id) || 0)) + 1;
      const item = {
        id,
        no: `PO-${String(Date.now()).slice(-6)}`,
        created_at: new Date().toISOString(),
        status: "draft",
        ...po,
      };
      const next = [item, ...purchaseOrders];
      savePO(next);
      return item;
    },
    [purchaseOrders, savePO],
  );

  const updatePOStatus = useCallback(
    (id, status, extra = {}) => {
      const next = purchaseOrders.map((o) =>
        String(o.id) === String(id) ? { ...o, status, ...extra } : o,
      );
      savePO(next);
    },
    [purchaseOrders, savePO],
  );

  const deletePO = useCallback(
    (id) => {
      savePO(purchaseOrders.filter((o) => String(o.id) !== String(id)));
    },
    [purchaseOrders, savePO],
  );

  /** Terima companion rules dari menu Analisis Apriori */
  const pushAprioriToPipeline = useCallback(
    (rules = []) => {
      const mapped = rules.map((r) => ({
        id: `apr-${r.antecedent?.product_id || r.antecedent?.id || "x"}-${r.consequent?.product_id || r.consequent?.id || "y"}-${Date.now()}`,
        antecedent_id: r.antecedent?.product_id ?? r.antecedent?.id,
        antecedent_name: r.antecedent?.name,
        consequent_id: r.consequent?.product_id ?? r.consequent?.id,
        consequent_name: r.consequent?.name,
        confidence: r.confidence,
        support: r.support,
        lift: r.lift,
        count: r.count,
        source: "apriori",
        added_at: new Date().toISOString(),
      }));
      // merge unik by consequent+antecedent
      const prev = pipeline.apriori || [];
      const keyOf = (x) => `${x.antecedent_id}|${x.consequent_id}`;
      const map = new Map(prev.map((x) => [keyOf(x), x]));
      mapped.forEach((x) => map.set(keyOf(x), x));
      return savePipeline({ ...pipeline, apriori: Array.from(map.values()) });
    },
    [pipeline, savePipeline],
  );

  /** Terima qty EOQ dari menu Optimasi EOQ */
  const pushEoqToPipeline = useCallback(
    (items = []) => {
      const mapped = items.map((p) => ({
        id: `eoq-${p.product_id || p.id}-${Date.now()}`,
        product_id: p.product_id ?? p.id,
        name: p.name,
        sku: p.sku,
        supplier: p.supplier,
        stock: p.stock,
        eoq: p.eoq,
        qty: Math.max(1, Number(p.eoq) || Number(p.qty) || 1),
        reorder_point: p.reorder_point,
        status: p.status,
        lead_time_days: p.lead_time_days,
        ordering_cost: p.ordering_cost,
        price: p.price,
        source: "eoq",
        added_at: new Date().toISOString(),
      }));
      const prev = pipeline.eoq || [];
      const map = new Map(prev.map((x) => [String(x.product_id), x]));
      mapped.forEach((x) => map.set(String(x.product_id), x));
      return savePipeline({ ...pipeline, eoq: Array.from(map.values()) });
    },
    [pipeline, savePipeline],
  );

  const clearPipeline = useCallback(
    (part) => {
      if (part === "apriori") return savePipeline({ ...pipeline, apriori: [] });
      if (part === "eoq") return savePipeline({ ...pipeline, eoq: [] });
      return savePipeline({
        apriori: [],
        eoq: [],
        updated_at: new Date().toISOString(),
      });
    },
    [pipeline, savePipeline],
  );

  /**
   * Apply Draft/Ordered PO → stok naik (Barang Masuk otomatis)
   * Setiap item di PO di-restock via applyStockChange.
   */
  const applyPOToStock = useCallback(
    async (poId) => {
      const po = purchaseOrders.find((o) => String(o.id) === String(poId));
      if (!po) throw new Error("PO tidak ditemukan");
      if (po.status === "received")
        throw new Error("PO ini sudah pernah di-apply ke stok");
      const items = Array.isArray(po.items) ? po.items : [];
      if (!items.length) throw new Error("PO tidak punya item");

      const results = [];
      for (const it of items) {
        const qty = Number(it.qty) || 0;
        if (qty <= 0) continue;
        const row = await inventory.applyStockChange({
          productId: it.product_id,
          qty,
          mode: "in",
          reason: "purchase",
          notes: `Terima ${po.no} · ${po.supplier || "-"}`,
          supplier: po.supplier || it.supplier || "-",
        });
        results.push(row);
      }

      // companion opsional: jika ada di products, restock qty kecil (1 unit) sebagai saran — skip auto stok
      // companion hanya info; tidak auto-restock agar tidak mengubah stok tanpa keputusan user

      updatePOStatus(poId, "received", {
        received_at: new Date().toISOString(),
        received_count: results.length,
      });

      addPayableFromPO(po);

      return { po, received: results.length, rows: results };
    },
    [purchaseOrders, inventory, updatePOStatus, addPayableFromPO],
  );

  const stats = useMemo(
    () => ({
      categories: categories.length,
      suppliers: suppliers.length,
      customers: customers.length,
    }),
    [categories, suppliers, customers],
  );

  const addCategory = useCallback(
    (row) => {
      const id = Math.max(0, ...categories.map((c) => Number(c.id) || 0)) + 1;
      const code =
        row.code ||
        `CAT-${String(row.name || "BARU")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")}`;
      const item = withCategoryDefaults({
        id,
        code,
        name: row.name,
        description: row.description || "-",
        ...row,
        active: row.active ?? true,
      });
      persistCategories([...categories, item]);
      return item;
    },
    [categories, persistCategories],
  );

  const updateCategory = useCallback(
    (id, row) => {
      persistCategories(
        categories.map((c) =>
          String(c.id) === String(id)
            ? withCategoryDefaults({ ...c, ...row })
            : c,
        ),
      );
    },
    [categories, persistCategories],
  );

  const deleteCategory = useCallback(
    (id) => {
      persistCategories(categories.filter((c) => String(c.id) !== String(id)));
    },
    [categories, persistCategories],
  );

  const getCategoryByName = useCallback(
    (name) => findCategory(categories, name),
    [categories],
  );

  const addSupplier = useCallback(
    (row) => {
      const id = Math.max(0, ...suppliers.map((s) => Number(s.id) || 0)) + 1;
      const item = {
        id,
        status: row.status || "aktif",
        lead_time: Number(row.lead_time) || 3,
        cost_per_order: Number(row.cost_per_order) || 50000,
        ...row,
        moq: Number(row.moq) || 0,
        payment_term: Number(row.payment_term) || 0,
      };
      persistSuppliers([...suppliers, item]);
      return item;
    },
    [suppliers, persistSuppliers],
  );

  const updateSupplier = useCallback(
    (id, row) => {
      persistSuppliers(
        suppliers.map((s) =>
          String(s.id) === String(id) ? { ...s, ...row } : s,
        ),
      );
    },
    [suppliers, persistSuppliers],
  );

  const deleteSupplier = useCallback(
    (id) => {
      persistSuppliers(suppliers.filter((s) => String(s.id) !== String(id)));
    },
    [suppliers, persistSuppliers],
  );

  const toggleSupplierStatus = useCallback(
    (id) => {
      persistSuppliers(
        suppliers.map((s) => {
          if (String(s.id) !== String(id)) return s;
          const next = s.status === "aktif" ? "nonaktif" : "aktif";
          return { ...s, status: next };
        }),
      );
    },
    [suppliers, persistSuppliers],
  );

  const addCustomer = useCallback(
    (row) => {
      const id = Math.max(0, ...customers.map((c) => Number(c.id) || 0)) + 1;
      const item = { id, status: "aktif", ...row };
      setCustomers((prev) => [...prev, item]);
      return item;
    },
    [customers],
  );

  const updateCustomer = useCallback((id, row) => {
    setCustomers((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, ...row } : c)),
    );
  }, []);

  const value = {
    ...inventory,
    categories,
    suppliers,
    customers,
    categoryBarcodes: CATEGORY_BARCODES,
    masterStats: stats,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryByName,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
    addCustomer,
    updateCustomer,
    supplierById,
    payables,
    savePayables,
    addPayableFromPO,
    purchaseOrders,
    addPurchaseOrder,
    updatePOStatus,
    deletePO,
    applyPOToStock,
    pipeline,
    pushAprioriToPipeline,
    pushEoqToPipeline,
    clearPipeline,
    setCategories,
    setSuppliers,
    setCustomers,
  };

  return (
    <MasterContext.Provider value={value}>{children}</MasterContext.Provider>
  );
}

export function useMaster() {
  const ctx = useContext(MasterContext);
  if (!ctx) throw new Error("useMaster must be used within MasterProvider");
  return ctx;
}
