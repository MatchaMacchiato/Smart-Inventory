const Z = {
  0.8: 0.84,
  0.85: 1.04,
  0.9: 1.28,
  0.95: 1.64,
  0.97: 1.88,
  0.99: 2.33,
};
export const pct = (n) => `${Math.round(Number(n || 0) * 100)}%`;
export const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function zOf(p) {
  const k = Object.keys(Z)
    .map(Number)
    .sort((a, b) => Math.abs(a - p) - Math.abs(b - p))[0];
  return Z[k] || 1.64;
}

export function computeLocalEoq(
  products,
  history,
  params = {},
  suppliers = [],
  categories = [],
) {
  const days = params.days || 90;
  const orderingCost = params.ordering_cost || 25000;
  const holdingPct = params.holding_pct || 0.15;
  const leadTime = params.lead_time || 5;
  const z = zOf(params.service_level || 0.95);
  const cutoff = Date.now() - days * 86400000;
  const rows = (products || [])
    .map((p) => {
      const supplier = (suppliers || []).find(
        (s) =>
          String(s.name || "").toLowerCase() ===
          String(p.supplier || "").toLowerCase(),
      );
      const cat = (categories || []).find(
        (c) =>
          String(c.name || "").toLowerCase() ===
          String(p.category || "").toLowerCase(),
      );
      const lt =
        Number(supplier?.lead_time ?? cat?.lead_time ?? leadTime) || leadTime;
      const oc =
        Number(supplier?.cost_per_order ?? orderingCost) || orderingCost;
      const restock_priority = cat?.restock_priority || "Sedang";
      const tx = (history || []).filter(
        (h) =>
          String(h.product_id) === String(p.id) &&
          Number(h.change) < 0 &&
          new Date(h.created_at).getTime() >= cutoff,
      );
      const byDay = {};
      tx.forEach((h) => {
        const d = String(h.created_at).slice(0, 10);
        byDay[d] = (byDay[d] || 0) + Math.abs(Number(h.change) || 0);
      });
      const qtys = Object.values(byDay);
      const total = qtys.reduce((s, v) => s + v, 0);
      const avgDaily = total / Math.max(1, days);
      const unitCost = Number(p.cost || p.price || 0);
      if (avgDaily <= 0)
        return {
          product_id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          stock: p.stock,
          price: p.price,
          avg_daily_demand: 0,
          annual_demand: 0,
          std_demand: 0,
          eoq: 0,
          reorder_point: 0,
          safety_stock: 0,
          lead_time_days: lt,
          ordering_cost: oc,
          supplier: p.supplier || cat?.default_supplier || "-",
          status: "no_demand",
          recommendation: `Tidak ada penjualan ${days} hari`,
          restock_priority,
          category_margin: cat?.margin_pct ?? null,
        };
      const annual = avgDaily * 365;
      const holding = Math.max(0.01, unitCost * holdingPct);
      const eoq = Math.sqrt((2 * annual * oc) / holding);
      let std = 0;
      if (qtys.length > 1) {
        const mean = total / qtys.length;
        std = Math.sqrt(
          qtys.reduce((s, v) => s + (v - mean) ** 2, 0) / (qtys.length - 1),
        );
      }
      const ss = std * z * Math.sqrt(Math.max(0, lt));
      const rop = avgDaily * lt + ss;
      const stock = Number(p.stock || 0);
      let status = "ok",
        recommendation = "Stok aman";
      if (stock <= rop) {
        status = "restock";
        recommendation = `Segera PO ${Math.max(1, Math.ceil(Math.max(eoq, rop - stock + 1)))} ${p.unit || "pcs"}`;
      } else if (stock <= rop * 1.3) {
        status = "watch";
        recommendation = `Mendekati ROP (${Math.round(rop)})`;
      }
      return {
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock,
        price: p.price,
        avg_daily_demand: +avgDaily.toFixed(2),
        annual_demand: Math.round(annual),
        std_demand: +std.toFixed(2),
        eoq: Math.round(eoq),
        reorder_point: Math.round(rop),
        safety_stock: Math.round(ss),
        lead_time_days: lt,
        ordering_cost: oc,
        supplier: p.supplier || cat?.default_supplier || "-",
        status,
        recommendation,
        restock_priority,
        category_margin: cat?.margin_pct ?? null,
      };
    })
    .sort(
      (a, b) =>
        (b.status === "restock") - (a.status === "restock") ||
        Number(a.restock_priority === "Tinggi") * -1 +
          Number(b.restock_priority === "Tinggi") ||
        ({ Tinggi: 0, Sedang: 1, Rendah: 2 }[a.restock_priority] ?? 9) -
          ({ Tinggi: 0, Sedang: 1, Rendah: 2 }[b.restock_priority] ?? 9) ||
        b.avg_daily_demand - a.avg_daily_demand,
    );
  return {
    products: rows,
    summary: {
      total_products: rows.length,
      needs_restock: rows.filter((p) => p.status === "restock").length,
      watch: rows.filter((p) => p.status === "watch").length,
      ok: rows.filter((p) => p.status === "ok").length,
    },
  };
}

export function computeLocalApriori(history, params = {}) {
  const days = params.days || 90;
  const minSupport = params.min_support || 0.05;
  const minConfidence = params.min_confidence || 0.35;
  const cutoff = Date.now() - days * 86400000;
  const rows = (history || []).filter(
    (h) => Number(h.change) < 0 && new Date(h.created_at).getTime() >= cutoff,
  );
  const baskets = {};
  rows.forEach((h) => {
    const key = `${h.notes || "TX"}|${String(h.created_at).slice(0, 10)}`;
    if (!baskets[key]) baskets[key] = new Set();
    baskets[key].add(h.product_id);
  });
  const tx = Object.values(baskets)
    .map((s) => [...s])
    .filter((t) => t.length >= 1);
  const n = Math.max(1, tx.length);
  const freq1 = {};
  tx.forEach((t) =>
    t.forEach((id) => {
      freq1[id] = (freq1[id] || 0) + 1;
    }),
  );
  const items = Object.keys(freq1)
    .map(Number)
    .filter((id) => freq1[id] / n >= minSupport);
  const nameOf = (id) =>
    rows.find((r) => String(r.product_id) === String(id))?.product_name ||
    `Produk #${id}`;
  const rules = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i],
        b = items[j];
      let cnt = 0;
      tx.forEach((t) => {
        if (t.includes(a) && t.includes(b)) cnt++;
      });
      const support = cnt / n;
      if (support < minSupport) continue;
      const confAB = cnt / freq1[a],
        confBA = cnt / freq1[b];
      const liftAB = confAB / (freq1[b] / n),
        liftBA = confBA / (freq1[a] / n);
      if (confAB >= minConfidence)
        rules.push({
          antecedent: { product_id: a, name: nameOf(a) },
          consequent: { product_id: b, name: nameOf(b) },
          support: +support.toFixed(4),
          confidence: +confAB.toFixed(4),
          lift: +liftAB.toFixed(4),
          count: cnt,
          transactions: n,
        });
      if (confBA >= minConfidence)
        rules.push({
          antecedent: { product_id: b, name: nameOf(b) },
          consequent: { product_id: a, name: nameOf(a) },
          support: +support.toFixed(4),
          confidence: +confBA.toFixed(4),
          lift: +liftBA.toFixed(4),
          count: cnt,
          transactions: n,
        });
    }
  rules.sort((x, y) => y.lift - x.lift || y.confidence - x.confidence);
  return {
    transactions: n,
    rules: rules.slice(0, 40),
    total_rules: rules.length,
    message: rules.length
      ? null
      : "Data belum cukup — input transaksi barang keluar atau turunkan threshold.",
  };
}
