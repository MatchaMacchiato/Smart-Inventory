import { useMemo, useState, useCallback, useEffect } from "react";
import { financeApi } from "../services/api";
import {
  SEED_INVOICES,
  COMPANY,
  formatRp,
  formatDateId,
  summarizeInvoices,
} from "../data/invoices";
import { INITIAL_CUSTOMERS } from "../data/customers";
import Modal from "./Modal";

const STATUS_META = {
  lunas: {
    label: "Lunas",
    icon: "fa-check-circle",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.1)",
    border: "rgba(5, 150, 105, 0.25)",
  },
  belum: {
    label: "Belum Bayar",
    icon: "fa-exclamation-circle",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.08)",
    border: "rgba(220, 38, 38, 0.25)",
  },
  sebagian: {
    label: "Sebagian",
    icon: "fa-clock",
    color: "#D97706",
    bg: "rgba(217, 119, 6, 0.1)",
    border: "rgba(217, 119, 6, 0.25)",
  },
};

const MAX_UNDO = 30;
const PHONE_STORAGE_KEY = "sis_finance_phones";

/** Seed nomor WA untuk pelanggan faktur Accurate (demo penagihan) */
const DEFAULT_PHONES = {
  "TERANG LABUAN": "0812-7001-1703",
  "SINAR TERANG SERANG": "0813-7002-1702",
  "EKI JAYA": "0821-7000-1700",
  "AMIN ELECTRIC": "0856-6999-1699",
  "CAHAYA LISTRIK": "0878-6997-1697",
  "BERKAH WALANTAKA": "0812-6996-1696",
  "TB. KK JAYA": "0813-6995-1695",
  "DEWI ELEKTRIK": "0821-6994-1694",
  "Sinar Mitra Sejahtera 2": "0856-6888-1688",
  "Sinar Mitra Sejahtera": "0878-6887-1687",
  MUKSI: "0812-6886-1686",
  "CAHAYA TERANG": "0813-6885-1685",
  "CINDY INTERIOR": "0821-6884-1684",
  "KONDI PUTRA": "0856-6882-1682",
  "SDP TEKNIK": "0878-6881-1681",
};

// Helper warna inisial avatar yang konsisten
const AVATAR_PALETTES = [
  { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  { bg: "#FAF5FF", text: "#7E22CE", border: "#E9D5FF" },
  { bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5" },
  { bg: "#ECFEFF", text: "#0E7490", border: "#A5F3FC" },
  { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
];

function getAvatarPalette(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "PL";
}

function formatWaNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[\s\-().+]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (cleaned.startsWith("62")) return cleaned;
  return cleaned;
}

function readPhoneBook() {
  const base = { ...DEFAULT_PHONES };
  INITIAL_CUSTOMERS.forEach((c) => {
    if (c.name && c.phone) base[c.name] = c.phone;
  });
  try {
    const saved = JSON.parse(localStorage.getItem(PHONE_STORAGE_KEY) || "{}");
    return { ...base, ...saved };
  } catch {
    return base;
  }
}

function buildWaTagihLink(phone, row) {
  const wa = formatWaNumber(phone);
  if (!wa) return null;
  const sisa = formatRp(row.terutang);
  const nilai = formatRp(row.nilai);
  const text = [
    `Halo Bapak/Ibu ${row.nama},`,
    `Salam hormat dari tim Keuangan ${COMPANY.name}.`,
    ``,
    `Kami ingin menginformasikan ringkasan faktur tagihan:`,
    `• No. Faktur: ${row.no_faktur}`,
    `• Tanggal: ${formatDateId(row.tgl)}`,
    `• Nilai Tagihan: ${nilai}`,
    `• Sisa Terutang: ${sisa}`,
    ``,
    `Pembayaran dapat ditransfer ke:`,
    row.keterangan ? `${row.keterangan}` : `${COMPANY.bank}`,
    ``,
    `Mohon konfirmasi jika pembayaran telah dilakukan. Terima kasih atas kerja samanya! 🙏`,
  ].join("\n");
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

function buildWaLunasLink(phone, row) {
  const wa = formatWaNumber(phone);
  if (!wa) return null;
  const text = [
    `Halo Bapak/Ibu ${row.nama},`,
    `Terima kasih, pembayaran untuk faktur ${row.no_faktur} telah kami terima dan verifikasi.`,
    ``,
    `Status Faktur: LUNAS ✓`,
    `Nilai: ${formatRp(row.nilai)}`,
    ``,
    `Salam hangat,`,
    `${COMPANY.name}`,
  ].join("\n");
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

function deriveStatus(nilai, terutang) {
  const n = Number(nilai || 0);
  const t = Number(terutang || 0);
  const dibayar = Math.max(0, n - t);
  if (t <= 0) return { status: "lunas", dibayar: n };
  if (dibayar > 0) return { status: "sebagian", dibayar };
  return { status: "belum", dibayar: 0 };
}

function normalizeApiInvoices(list) {
  if (!Array.isArray(list) || !list.length) return null;
  return list
    .map((r) => ({
      id: r.id,
      no_faktur: r.no_faktur || "",
      tgl: String(r.tgl || "").slice(0, 10),
      no_pelanggan: r.no_pelanggan || "-",
      nama: r.nama,
      nilai: Number(r.nilai || 0),
      terutang: Number(r.terutang || 0),
      dibayar: Number(r.dibayar || 0),
      status: r.status || "belum",
      keterangan: r.keterangan || "",
      payments: (r.payments || []).map((p) => ({
        id: p.id,
        amount: Number(p.amount || 0),
        at: p.paid_at || p.created_at || new Date().toISOString(),
        note: p.note || "",
        type: p.type || "bayar",
        source: p.source || "user",
      })),
    }))
    .sort(
      (a, b) =>
        b.tgl.localeCompare(a.tgl) ||
        String(b.no_faktur).localeCompare(String(a.no_faktur)),
    );
}

function withSeedHistory(list) {
  return list.map((r) => {
    const payments = [];
    const dibayar = Math.max(0, Number(r.nilai) - Number(r.terutang));
    if (dibayar > 0) {
      payments.push({
        id: `seed-${r.id}`,
        amount: dibayar,
        at: `${r.tgl}T12:00:00`,
        note:
          r.terutang <= 0
            ? "Pelunasan (data Accurate)"
            : "Pembayaran awal (data Accurate)",
        type: r.terutang <= 0 ? "lunas" : "bayar",
        source: "seed",
      });
    }
    return { ...r, payments };
  });
}

function snapshotRow(r) {
  return {
    terutang: r.terutang,
    dibayar: r.dibayar,
    status: r.status,
    payments: (r.payments || []).map((p) => ({ ...p })),
  };
}

export default function Finance() {
  const [rows, setRows] = useState(() =>
    withSeedHistory([...SEED_INVOICES]).sort(
      (a, b) =>
        b.tgl.localeCompare(a.tgl) || b.no_faktur.localeCompare(a.no_faktur),
    ),
  );
  const [undoStack, setUndoStack] = useState([]);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-07-01");
  const [dateTo, setDateTo] = useState("2026-07-27");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    no_faktur: "",
    tgl: new Date().toISOString().slice(0, 10),
    no_pelanggan: "",
    nama: "",
    nilai: "",
    terutang: "",
    keterangan: COMPANY.bank,
  });
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [historyModal, setHistoryModal] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [phoneBook, setPhoneBook] = useState(() => readPhoneBook());
  const [phoneEdit, setPhoneEdit] = useState(null);
  const [statusQuick, setStatusQuick] = useState("piutang"); // all | piutang | lunas
  const [financeView, setFinanceView] = useState("tagihan"); // tagihan | pelanggan | data
  const [tagihanViewMode, setTagihanViewMode] = useState("cards"); // cards | table
  const [expandedDebtor, setExpandedDebtor] = useState(null);

  // Load dari backend Laravel
  useEffect(() => {
    let alive = true;
    financeApi
      .list()
      .then((res) => {
        if (!alive) return;
        const normalized = normalizeApiInvoices(res?.data?.invoices);
        if (normalized) {
          setRows(normalized);
          setApiConnected(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const pushUndo = useCallback((entry) => {
    setUndoStack((prev) => [entry, ...prev].slice(0, MAX_UNDO));
  }, []);

  const customers = useMemo(() => {
    const set = new Set(rows.map((r) => r.nama).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const allCustomersData = useMemo(() => {
    const map = new Map();
    INITIAL_CUSTOMERS.forEach((c) => {
      map.set(c.name, {
        nama: c.name,
        no_pelanggan: c.id,
        is_master: true,
        type: c.type || "retail",
        invoices: [],
      });
    });
    rows.forEach((r) => {
      if (r.nama) {
        if (!map.has(r.nama)) {
          map.set(r.nama, {
            nama: r.nama,
            no_pelanggan: r.no_pelanggan || "-",
            is_master: false,
            type: "retail",
            invoices: [],
          });
        }
        map.get(r.nama).invoices.push(r);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama),
    );
  }, [rows]);

  const getPhone = useCallback((nama) => phoneBook[nama] || "", [phoneBook]);

  const savePhone = useCallback((nama, phone) => {
    if (!nama) return;
    setPhoneBook((prev) => {
      const next = { ...prev, [nama]: phone };
      try {
        const raw = JSON.parse(localStorage.getItem(PHONE_STORAGE_KEY) || "{}");
        raw[nama] = phone;
        localStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(raw));
      } catch {}
      return next;
    });
    setPhoneEdit(null);
    showToast(`Nomor WA untuk ${nama} berhasil disimpan`);
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (statusQuick === "piutang")
      list = list.filter((r) => Number(r.terutang) > 0);
    else if (statusQuick === "lunas")
      list = list.filter((r) => Number(r.terutang) <= 0);
    if (statusFilter !== "all")
      list = list.filter((r) => r.status === statusFilter);
    if (customerFilter !== "all")
      list = list.filter((r) => r.nama === customerFilter);
    if (dateFrom) list = list.filter((r) => r.tgl >= dateFrom);
    if (dateTo) list = list.filter((r) => r.tgl <= dateTo);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.no_faktur).toLowerCase().includes(q) ||
          String(r.nama).toLowerCase().includes(q) ||
          String(r.no_pelanggan).toLowerCase().includes(q) ||
          String(r.keterangan || "").toLowerCase().includes(q) ||
          String(getPhone(r.nama) || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    rows,
    statusFilter,
    customerFilter,
    dateFrom,
    dateTo,
    search,
    statusQuick,
    getPhone,
  ]);

  const summary = useMemo(() => summarizeInvoices(filtered), [filtered]);
  const allSummary = useMemo(() => summarizeInvoices(rows), [rows]);

  /** Agregat pelanggan yang masih punya tagihan — untuk penagihan WA */
  const piutangCustomers = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const t = Number(r.terutang || 0);
      if (t <= 0) return;
      if (!map[r.nama]) {
        map[r.nama] = {
          nama: r.nama,
          no_pelanggan: r.no_pelanggan,
          total: 0,
          count: 0,
          invoices: [],
        };
      }
      map[r.nama].total += t;
      map[r.nama].count += 1;
      map[r.nama].invoices.push(r);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);

  /** Filtered piutang customers for search */
  const filteredPiutangCustomers = useMemo(() => {
    if (!search.trim()) return piutangCustomers;
    const q = search.trim().toLowerCase();
    return piutangCustomers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        String(c.no_pelanggan).toLowerCase().includes(q) ||
        String(getPhone(c.nama) || "").toLowerCase().includes(q),
    );
  }, [piutangCustomers, search, getPhone]);

  const totalPiutangAll = useMemo(() => {
    return piutangCustomers.reduce((sum, c) => sum + c.total, 0);
  }, [piutangCustomers]);

  /** Apply payment / full settle with history + undo */
  const applyPaymentToRow = (id, amount, opts = {}) => {
    const { type = "bayar", note = "", confirmLunas = false } = opts;
    let applied = 0;
    let label = "";

    setRows((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      const before = snapshotRow(target);
      const sisa = Number(target.terutang || 0);
      if (sisa <= 0) return prev;

      let amt = Math.min(Math.max(0, Number(amount) || 0), sisa);
      if (type === "lunas" || confirmLunas) amt = sisa;
      if (amt <= 0) return prev;

      applied = amt;
      const newTerutang = Math.max(0, sisa - amt);
      const derived = deriveStatus(target.nilai, newTerutang);
      const payType = newTerutang <= 0 ? "lunas" : "bayar";
      label =
        payType === "lunas"
          ? `Pelunasan FP ${target.no_faktur} (${formatRp(amt)})`
          : `Bayar FP ${target.no_faktur} (${formatRp(amt)})`;

      const payment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        amount: amt,
        at: new Date().toISOString(),
        note:
          note ||
          (payType === "lunas" ? "Pelunasan penuh" : "Pembayaran termin"),
        type: payType,
        source: "user",
        before_terutang: sisa,
        after_terutang: newTerutang,
      };

      pushUndo({ id, label, before, paymentId: payment.id });

      try {
        if (payType === "lunas") {
          financeApi.markPaid(target.id).catch(() => {});
        } else {
          financeApi.pay(target.id, amt, note).catch(() => {});
        }
      } catch {}

      return prev.map((r) =>
        r.id === id
          ? {
              ...r,
              terutang: newTerutang,
              dibayar: derived.dibayar,
              status: derived.status,
              payments: [...(r.payments || []), payment],
            }
          : r,
      );
    });

    if (applied > 0) showToast(label || "Pembayaran berhasil dicatat");
  };

  const markPaid = (row) => {
    const ok = window.confirm(
      `Tandai LUNAS faktur ${row.no_faktur} (${row.nama})?\n\nSisa terutang: ${formatRp(row.terutang)}\n\nPembayaran dapat dibatalkan sewaktu-waktu dengan tombol Undo.`,
    );
    if (!ok) return;
    applyPaymentToRow(row.id, row.terutang, {
      type: "lunas",
      note: "Pelunasan penuh (tombol Lunas)",
      confirmLunas: true,
    });
  };

  const applyPayment = () => {
    if (!payModal) return;
    const amt = Number(String(payAmount).replace(/\D/g, "")) || 0;
    if (amt <= 0) {
      showToast("Jumlah pembayaran harus lebih dari 0", "err");
      return;
    }
    if (amt > Number(payModal.terutang)) {
      showToast("Jumlah bayar melebihi sisa tagihan terutang", "err");
      return;
    }
    applyPaymentToRow(payModal.id, amt, {
      note: payNote || "Pembayaran transfer/tunai",
    });
    setPayModal(null);
    setPayAmount("");
    setPayNote("");
  };

  /** Undo last action globally */
  const undoLast = () => {
    setUndoStack((stack) => {
      if (!stack.length) {
        showToast("Tidak ada aksi untuk di-undo", "err");
        return stack;
      }
      const [top, ...rest] = stack;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== top.id) return r;
          return {
            ...r,
            terutang: top.before.terutang,
            dibayar: top.before.dibayar,
            status: top.before.status,
            payments: top.before.payments,
          };
        }),
      );
      showToast(`Aksi dibatalkan: ${top.label}`, "undo");
      return rest;
    });
  };

  /** Undo last payment on one invoice (from history modal) */
  const undoLastPaymentOnInvoice = (invoiceId) => {
    const row = rows.find((r) => r.id === invoiceId);
    if (!row) return;
    const userPays = (row.payments || []).filter((p) => p.source === "user");
    if (!userPays.length) {
      showToast(
        "Tidak ada pembayaran user yang dapat di-undo pada faktur ini",
        "err",
      );
      return;
    }
    const last = userPays[userPays.length - 1];
    const ok = window.confirm(
      `Batalkan pembayaran terakhir?\n\nJumlah: ${formatRp(last.amount)}\nCatatan: ${last.note || "-"}\nWaktu: ${new Date(last.at).toLocaleString("id-ID")}`,
    );
    if (!ok) return;

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== invoiceId) return r;
        const payments = [...(r.payments || [])];
        const idx = payments.map((p) => p.id).lastIndexOf(last.id);
        if (idx >= 0) payments.splice(idx, 1);
        const paidSum = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const terutang = Math.max(0, Number(r.nilai) - paidSum);
        const derived = deriveStatus(r.nilai, terutang);
        return {
          ...r,
          payments,
          terutang,
          dibayar: derived.dibayar,
          status: derived.status,
        };
      }),
    );
    setUndoStack((stack) => stack.filter((u) => u.paymentId !== last.id));
    try {
      financeApi.undoPayment(invoiceId).catch(() => {});
    } catch {}
    showToast(`Pembayaran ${formatRp(last.amount)} dibatalkan`, "undo");
  };

  /** Reset invoice to fully unpaid */
  const resetInvoicePayments = (invoiceId) => {
    const row = rows.find((r) => r.id === invoiceId);
    if (!row) return;
    const ok = window.confirm(
      `Reset seluruh pembayaran pada Faktur ${row.no_faktur}?\n\nFaktur akan kembali menjadi BELUM BAYAR dengan sisa piutang penuh sebesar ${formatRp(row.nilai)}.`,
    );
    if (!ok) return;
    pushUndo({
      id: invoiceId,
      label: `Reset Faktur ${row.no_faktur}`,
      before: snapshotRow(row),
    });
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== invoiceId) return r;
        return {
          ...r,
          terutang: Number(r.nilai),
          dibayar: 0,
          status: "belum",
          payments: [],
        };
      }),
    );
    try {
      financeApi.reset(invoiceId).catch(() => {});
    } catch {}
    showToast(`Faktur ${row.no_faktur} di-reset ke Belum Bayar`, "undo");
  };

  const addInvoice = (e) => {
    e.preventDefault();
    const nilai = Number(String(form.nilai).replace(/\D/g, "")) || 0;
    if (nilai <= 0) {
      showToast("Nilai faktur wajib diisi dan lebih dari 0", "err");
      return;
    }
    let terutang =
      form.terutang === ""
        ? nilai
        : Number(String(form.terutang).replace(/\D/g, "")) || 0;
    terutang = Math.min(terutang, nilai);
    const derived = deriveStatus(nilai, terutang);
    const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
    const payments = [];
    if (derived.dibayar > 0) {
      payments.push({
        id: `init-${id}`,
        amount: derived.dibayar,
        at: new Date().toISOString(),
        note: "Pembayaran awal saat terbit faktur",
        type: derived.status === "lunas" ? "lunas" : "bayar",
        source: "user",
      });
    }
    const newInvoice = {
      id,
      no_faktur: form.no_faktur || String(252000 + id),
      tgl: form.tgl,
      no_pelanggan: form.no_pelanggan || "-",
      nama: form.nama || "Pelanggan Baru",
      nilai,
      terutang,
      dibayar: derived.dibayar,
      status: derived.status,
      keterangan: form.keterangan || COMPANY.bank,
      payments,
    };
    setRows((prev) => [newInvoice, ...prev]);

    try {
      financeApi
        .create({
          no_faktur: newInvoice.no_faktur,
          tgl: newInvoice.tgl,
          no_pelanggan: newInvoice.no_pelanggan,
          nama: newInvoice.nama,
          nilai,
          terutang,
          keterangan: newInvoice.keterangan,
        })
        .catch(() => {});
    } catch {}

    setShowForm(false);
    setForm({
      no_faktur: "",
      tgl: new Date().toISOString().slice(0, 10),
      no_pelanggan: "",
      nama: "",
      nilai: "",
      terutang: "",
      keterangan: COMPANY.bank,
    });
    showToast(`Faktur ${newInvoice.no_faktur} berhasil ditambahkan`);
  };

  const downloadCSV = () => {
    const header =
      "No Faktur,Tgl,No Pelanggan,Nama Pelanggan,Nilai Faktur,Dibayar,Terutang,Status,Keterangan";
    const body = filtered
      .map((r) =>
        [
          r.no_faktur,
          r.tgl,
          r.no_pelanggan,
          `"${r.nama}"`,
          r.nilai,
          r.dibayar,
          r.terutang,
          r.status,
          `"${(r.keterangan || "").replace(/"/g, '""')}"`,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-keuangan-${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("File CSV laporan keuangan berhasil diunduh");
  };

  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${COMPANY.reportTitle}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#0F172A;line-height:1.4}
        h1{font-size:20px;margin:0 0 4px;color:#0056B3;font-weight:800}
        h2{font-size:13px;margin:0 0 16px;color:#64748B;font-weight:500}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}
        th,td{border:1px solid #E2E8F0;padding:8px 10px;text-align:left}
        th{background:#F8FAFC;font-weight:700;color:#475569;text-transform:uppercase;font-size:10px}
        .r{text-align:right}
        .sum{margin-top:20px;padding:14px;background:#F8FAFC;border-radius:8px;font-size:12px;display:flex;gap:20px;flex-wrap:wrap}
      </style></head><body>
      <h1>${COMPANY.name}</h1>
      <h2>${COMPANY.reportTitle} · Periode ${dateFrom} s/d ${dateTo}</h2>
      <table><thead><tr>
        <th>No. Faktur</th><th>Tgl</th><th>No. Pel.</th><th>Nama Pelanggan</th>
        <th class="r">Nilai Faktur</th><th class="r">Terutang</th><th>Status</th><th>Rekening / Keterangan</th>
      </tr></thead><tbody>
      ${filtered
        .map(
          (r) => `<tr>
          <td><b>${r.no_faktur}</b></td><td>${formatDateId(r.tgl)}</td><td>#${r.no_pelanggan}</td><td>${r.nama}</td>
          <td class="r">${formatRp(r.nilai)}</td><td class="r" style="color:${r.terutang > 0 ? "#DC2626" : "#059669"}">${formatRp(r.terutang)}</td>
          <td>${STATUS_META[r.status]?.label || r.status}</td><td>${r.keterangan || "-"}</td>
        </tr>`,
        )
        .join("")}
      </tbody></table>
      <div class="sum">
        <div><b>Total Faktur:</b> ${formatRp(summary.total_nilai)} (${summary.count} Dokumen)</div>
        <div><b>Total Diterima:</b> ${formatRp(summary.total_dibayar)} (${summary.lunas} Lunas)</div>
        <div><b>Total Piutang:</b> ${formatRp(summary.total_terutang)}</div>
        <div><b>Collection Rate:</b> ${summary.collection_rate}%</div>
      </div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  const historyRow = historyModal
    ? rows.find((r) => r.id === historyModal.id) || historyModal
    : null;

  const historyPayments = historyRow
    ? [...(historyRow.payments || [])].sort(
        (a, b) => new Date(a.at) - new Date(b.at),
      )
    : [];

  const runningPaid = [];
  let run = 0;
  historyPayments.forEach((p) => {
    run += Number(p.amount || 0);
    runningPaid.push({
      ...p,
      running: run,
      sisa: Math.max(0, Number(historyRow?.nilai || 0) - run),
    });
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 1. HEADER HALAMAN */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#64748B",
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            <span>Akuntansi & Finansial</span>
            <i
              className="fas fa-chevron-right"
              style={{ fontSize: 10, color: "#94A3B8" }}
            ></i>
            <span style={{ color: "#0056b3", fontWeight: 600 }}>
              Keuangan & Penagihan
            </span>
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.03em",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(0,86,179,0.12), rgba(2,132,199,0.18))",
                color: "#0056b3",
                fontSize: 19,
              }}
            >
              <i className="fas fa-file-invoice-dollar"></i>
            </span>
            Keuangan & Penagihan Piutang
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              margin: "6px 0 0 0",
              color: "#64748B",
              fontSize: 13.5,
            }}
          >
            <span>
              {COMPANY.name} · Sinkronisasi Faktur Accurate, Penagihan WhatsApp, Termin Pembayaran & Audit.
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 700,
                background: apiConnected
                  ? "rgba(16,185,129,0.1)"
                  : "rgba(245,158,11,0.12)",
                color: apiConnected ? "#059669" : "#D97706",
                border: `1px solid ${apiConnected ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: apiConnected ? "#10B981" : "#F59E0B",
                  boxShadow: apiConnected
                    ? "0 0 8px #10B981"
                    : "0 0 6px #F59E0B",
                }}
              ></span>
              {apiConnected ? "Tersimpan di Server (MySQL)" : "Mode Cache Lokal"}
            </span>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={undoLast}
            disabled={!undoStack.length}
            title={undoStack[0]?.label || "Belum ada aksi untuk di-undo"}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: undoStack.length ? "rgba(255,115,0,0.12)" : "#F8FAFC",
              color: undoStack.length ? "#FF7300" : "#94A3B8",
              fontWeight: 700,
              fontSize: 13,
              cursor: undoStack.length ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            <i className="fas fa-undo"></i>
            <span>Undo</span>
            {undoStack.length > 0 && (
              <span
                style={{
                  background: "#FF7300",
                  color: "#fff",
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 10,
                }}
              >
                {undoStack.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={downloadCSV}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #CBD5E1",
              background: "#fff",
              color: "#334155",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fas fa-file-csv" style={{ color: "#0284c7" }}></i>
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={printReport}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #CBD5E1",
              background: "#fff",
              color: "#334155",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fas fa-print" style={{ color: "#64748b" }}></i>
            <span>Cetak PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{
              height: 40,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #0056b3, #0284c7)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(0, 86, 179, 0.25)",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fas fa-plus"></i>
            <span>+ Catat Faktur Baru</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 18px",
            borderRadius: 12,
            fontSize: 13.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            background:
              toast.type === "err"
                ? "#FEF2F2"
                : toast.type === "undo"
                  ? "#FFF7ED"
                  : "#F0FDF4",
            border: `1px solid ${
              toast.type === "err"
                ? "#FCA5A5"
                : toast.type === "undo"
                  ? "#FDBA74"
                  : "#86EFAC"
            }`,
            color:
              toast.type === "err"
                ? "#B91C1C"
                : toast.type === "undo"
                  ? "#C2410C"
                  : "#15803D",
          }}
        >
          <i
            className={`fas ${
              toast.type === "err"
                ? "fa-circle-xmark"
                : toast.type === "undo"
                  ? "fa-rotate-left"
                  : "fa-circle-check"
            }`}
          ></i>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 2. TOP 4 EXECUTIVE FINANCIAL KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Omzet / Faktur */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#64748B",
                }}
              >
                Total Nilai Faktur
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#0F172A",
                  marginTop: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                {formatRp(summary.total_nilai)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(0, 86, 179, 0.1)",
                color: "#0056b3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                background: "#F1F5F9",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {summary.count} Dokumen
            </span>
            <span>·</span>
            <span>Semua transaksi tercatat</span>
          </div>
        </div>

        {/* Card 2: Sudah Dibayar (Penerimaan Kas) */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#64748B",
                }}
              >
                Pembayaran Diterima
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#059669",
                  marginTop: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                {formatRp(summary.total_dibayar)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(5, 150, 105, 0.1)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-circle-check"></i>
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                background: "rgba(5,150,105,0.1)",
                color: "#059669",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {summary.lunas} Faktur Lunas
            </span>
            <span>·</span>
            <span>Kas masuk terverifikasi</span>
          </div>
        </div>

        {/* Card 3: Total Piutang (Terutang) */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#64748B",
                }}
              >
                Total Piutang Berjalan
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: summary.total_terutang > 0 ? "#DC2626" : "#059669",
                  marginTop: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                {formatRp(summary.total_terutang)}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(220, 38, 38, 0.1)",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-circle-exclamation"></i>
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                background: "rgba(220,38,38,0.1)",
                color: "#DC2626",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {summary.belumbayar} Belum Bayar
            </span>
            {summary.sebagian > 0 && (
              <>
                <span>·</span>
                <span style={{ color: "#D97706", fontWeight: 600 }}>
                  {summary.sebagian} Sebagian
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Collection Rate */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#64748B",
                }}
              >
                Collection Rate
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#7C3AED",
                  marginTop: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                {summary.collection_rate}%
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(124, 58, 237, 0.1)",
                color: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              <i className="fas fa-chart-pie"></i>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                width: "100%",
                height: 6,
                borderRadius: 3,
                background: "#F1F5F9",
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, summary.collection_rate)}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: "linear-gradient(90deg, #7C3AED, #A855F7)",
                  transition: "width 0.5s ease",
                }}
              ></div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#64748B",
              }}
            >
              <span>Efisiensi Kas</span>
              <strong style={{ color: summary.collection_rate >= 80 ? "#059669" : "#D97706" }}>
                {summary.collection_rate >= 80 ? "Sangat Baik" : "Perlu Penagihan"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEGMENTED NAVIGATION TAB BAR */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 8,
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 8,
        }}
      >
        {[
          {
            key: "tagihan",
            label: "Penagihan WhatsApp",
            sub: `${piutangCustomers.length} Pelanggan Berutang`,
            icon: "fab fa-whatsapp",
            color: "#25D366",
          },
          {
            key: "pelanggan",
            label: "Master Pelanggan",
            sub: `${allCustomersData.length} Pelanggan Terdaftar`,
            icon: "fas fa-users",
            color: "#7C3AED",
          },
          {
            key: "data",
            label: "Buku Besar Faktur",
            sub: `${filtered.length} / ${rows.length} Faktur Penjualan`,
            icon: "fas fa-table-list",
            color: "#0056b3",
          },
        ].map((tab) => {
          const active = financeView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFinanceView(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                border: active ? `2px solid ${tab.color}` : "1px solid transparent",
                background: active ? `${tab.color}10` : "transparent",
                color: active ? tab.color : "#475569",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: active ? tab.color : "#F1F5F9",
                  color: active ? "#fff" : "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                <i className={tab.icon}></i>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: active ? "#0F172A" : "#334155",
                  }}
                >
                  {tab.label}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: active ? tab.color : "#94A3B8",
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {tab.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. VIEW 1: PENAGIHAN WHATSAPP */}
      {financeView === "tagihan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header Card Penagihan */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #E2E8F0",
              padding: "18px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fab fa-whatsapp" style={{ color: "#25D366", fontSize: 20 }}></i>
                Pusat Penagihan Cepat via WhatsApp
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                Kirim pesan tagihan otomatis dengan rincian no faktur, total utang, rekening transfer, dan format pesan sopan.
              </div>
            </div>

            {/* Search + View Switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", width: 260 }}>
                <i
                  className="fas fa-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    fontSize: 13,
                  }}
                ></i>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari toko / pelanggan berutang..."
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 12px 0 34px",
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    fontSize: 12.5,
                    outline: "none",
                  }}
                />
              </div>

              {/* Mode Cards vs Table */}
              <div
                style={{
                  display: "flex",
                  background: "#F1F5F9",
                  borderRadius: 10,
                  padding: 3,
                  border: "1px solid #E2E8F0",
                }}
              >
                <button
                  type="button"
                  onClick={() => setTagihanViewMode("cards")}
                  style={{
                    border: "none",
                    background: tagihanViewMode === "cards" ? "#fff" : "transparent",
                    color: tagihanViewMode === "cards" ? "#0F172A" : "#64748B",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: tagihanViewMode === "cards" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <i className="fas fa-grip"></i> Kartu
                </button>
                <button
                  type="button"
                  onClick={() => setTagihanViewMode("table")}
                  style={{
                    border: "none",
                    background: tagihanViewMode === "table" ? "#fff" : "transparent",
                    color: tagihanViewMode === "table" ? "#0F172A" : "#64748B",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: tagihanViewMode === "table" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <i className="fas fa-table"></i> Tabel
                </button>
              </div>
            </div>
          </div>

          {/* Banner Summary Penagihan */}
          <div
            style={{
              background: "linear-gradient(135deg, #1E293B, #0F172A)",
              borderRadius: 16,
              padding: "18px 24px",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                Total Piutang Berjalan Tertagih
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#F87171", marginTop: 4 }}>
                {formatRp(totalPiutangAll)}
              </div>
              <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>
                Tersebar di {piutangCustomers.length} pelanggan dan {summary.belumbayar + summary.sebagian} faktur tagihan aktif.
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "10px 16px",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ fontSize: 11, color: "#94A3B8" }}>Nomor WA Lengkap</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#34D399", marginTop: 2 }}>
                  {piutangCustomers.filter((c) => getPhone(c.nama)).length} / {piutangCustomers.length}
                </div>
              </div>
            </div>
          </div>

          {/* Render Mode Kartu Visual */}
          {tagihanViewMode === "cards" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {filteredPiutangCustomers.map((c) => {
                const phone = getPhone(c.nama);
                const palette = getAvatarPalette(c.nama);
                const initials = getInitials(c.nama);
                const isExpanded = expandedDebtor === c.nama;
                const sample = c.invoices[0];
                const waLink =
                  phone && sample
                    ? buildWaTagihLink(phone, {
                        ...sample,
                        terutang: c.total,
                        no_faktur: c.invoices.map((x) => x.no_faktur).join(", "),
                        tgl: sample.tgl,
                        nilai: c.invoices.reduce((s, x) => s + Number(x.nilai || 0), 0),
                      })
                    : null;

                return (
                  <div
                    key={c.nama}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div>
                      {/* Top Bar: Avatar & Info */}
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: palette.bg,
                            border: `1px solid ${palette.border}`,
                            color: palette.text,
                            fontWeight: 800,
                            fontSize: 15,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: "#0F172A",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={c.nama}
                          >
                            {c.nama}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", gap: 6 }}>
                            <span>#{c.no_pelanggan}</span>
                            <span>·</span>
                            <span style={{ color: "#DC2626", fontWeight: 700 }}>{c.count} FP Tertunggak</span>
                          </div>
                        </div>
                      </div>

                      {/* Phone / WA section */}
                      <div
                        style={{
                          background: "#F8FAFC",
                          borderRadius: 10,
                          padding: "10px 12px",
                          marginBottom: 14,
                          border: "1px solid #F1F5F9",
                        }}
                      >
                        <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, marginBottom: 4 }}>
                          KONTAK WHATSAPP
                        </div>
                        {phoneEdit?.nama === c.nama ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              autoFocus
                              value={phoneEdit.phone}
                              onChange={(e) => setPhoneEdit({ ...phoneEdit, phone: e.target.value })}
                              placeholder="08xxxxxxxx"
                              style={{
                                flex: 1,
                                height: 32,
                                borderRadius: 8,
                                border: "1px solid #CBD5E1",
                                padding: "0 8px",
                                fontSize: 12,
                                outline: "none",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => savePhone(c.nama, phoneEdit.phone)}
                              style={{
                                height: 32,
                                padding: "0 10px",
                                borderRadius: 8,
                                border: "none",
                                background: "#059669",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhoneEdit(null)}
                              style={{
                                height: 32,
                                padding: "0 8px",
                                borderRadius: 8,
                                border: "1px solid #CBD5E1",
                                background: "#fff",
                                fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <i className="fab fa-whatsapp" style={{ color: phone ? "#25D366" : "#94A3B8" }}></i>
                              <span style={{ fontSize: 12.5, fontWeight: phone ? 700 : 500, color: phone ? "#0F172A" : "#94A3B8" }}>
                                {phone || "Belum ada nomor WA"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPhoneEdit({ nama: c.nama, phone: phone || "" })}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#0056b3",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 6px",
                              }}
                              title="Edit nomor WhatsApp"
                            >
                              <i className="fas fa-pen"></i> Ubah
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tagihan Amount Box */}
                      <div
                        style={{
                          background: "#FEF2F2",
                          borderRadius: 12,
                          padding: "12px 14px",
                          border: "1px solid #FECACA",
                          marginBottom: 14,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase" }}>
                          TOTAL TAGIHAN TERUTANG
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#DC2626", marginTop: 2 }}>
                          {formatRp(c.total)}
                        </div>
                      </div>

                      {/* Breakdown Toggle */}
                      <div style={{ marginBottom: 14 }}>
                        <button
                          type="button"
                          onClick={() => setExpandedDebtor(isExpanded ? null : c.nama)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#0056b3",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <i className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}></i>
                          <span>{isExpanded ? "Sembunyikan Rincian Faktur" : `Lihat ${c.invoices.length} Faktur Tertunggak`}</span>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              marginTop: 10,
                              background: "#F8FAFC",
                              borderRadius: 10,
                              padding: 8,
                              border: "1px solid #E2E8F0",
                              maxHeight: 160,
                              overflowY: "auto",
                            }}
                          >
                            {c.invoices.map((inv) => (
                              <div
                                key={inv.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  borderBottom: "1px solid #F1F5F9",
                                  fontSize: 11.5,
                                }}
                              >
                                <div>
                                  <strong style={{ color: "#0F172A" }}>FP {inv.no_faktur}</strong>
                                  <span style={{ color: "#64748B", marginLeft: 6 }}>{formatDateId(inv.tgl)}</span>
                                </div>
                                <div style={{ fontWeight: 800, color: "#DC2626" }}>
                                  {formatRp(inv.terutang)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 10,
                            background: "linear-gradient(135deg, #25D366, #128C7E)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 12.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            textDecoration: "none",
                            boxShadow: "0 3px 10px rgba(37, 211, 102, 0.25)",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <i className="fab fa-whatsapp" style={{ fontSize: 16 }}></i>
                          <span>Tagih via WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPhoneEdit({ nama: c.nama, phone: "" })}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 10,
                            background: "#F1F5F9",
                            color: "#475569",
                            fontWeight: 700,
                            fontSize: 12,
                            border: "1px solid #CBD5E1",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <i className="fas fa-plus"></i> Isi Nomor WA
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCustomerFilter(c.nama);
                          setStatusQuick("piutang");
                          setFinanceView("data");
                        }}
                        style={{
                          height: 38,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid #CBD5E1",
                          background: "#fff",
                          color: "#334155",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        title="Buka daftar faktur pelanggan ini"
                      >
                        <i className="fas fa-list"></i> Faktur
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Render Mode Tabel Enterprise Penagihan */
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      {["Pelanggan", "Kontak WhatsApp", "Jumlah Faktur", "Total Tagihan", "Aksi Penagihan"].map(
                        (h, idx) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px 16px",
                              textAlign: idx === 3 ? "right" : "left",
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "#64748B",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPiutangCustomers.map((c) => {
                      const phone = getPhone(c.nama);
                      const palette = getAvatarPalette(c.nama);
                      const initials = getInitials(c.nama);
                      const sample = c.invoices[0];
                      const waLink =
                        phone && sample
                          ? buildWaTagihLink(phone, {
                              ...sample,
                              terutang: c.total,
                              no_faktur: c.invoices.map((x) => x.no_faktur).join(", "),
                              tgl: sample.tgl,
                              nilai: c.invoices.reduce((s, x) => s + Number(x.nilai || 0), 0),
                            })
                          : null;

                      return (
                        <tr key={c.nama} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  background: palette.bg,
                                  border: `1px solid ${palette.border}`,
                                  color: palette.text,
                                  fontWeight: 800,
                                  fontSize: 13,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: "#0F172A" }}>{c.nama}</div>
                                <div style={{ fontSize: 11, color: "#64748B" }}>#{c.no_pelanggan}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {phoneEdit?.nama === c.nama ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                <input
                                  value={phoneEdit.phone}
                                  onChange={(e) => setPhoneEdit({ ...phoneEdit, phone: e.target.value })}
                                  style={{ height: 28, width: 110, fontSize: 12, padding: "0 6px" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => savePhone(c.nama, phoneEdit.phone)}
                                  style={{
                                    height: 28,
                                    padding: "0 8px",
                                    background: "#059669",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  OK
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: phone ? 600 : 400, color: phone ? "#0F172A" : "#94A3B8" }}>
                                  {phone || "Belum diisi"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPhoneEdit({ nama: c.nama, phone: phone || "" })}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#0056b3",
                                    cursor: "pointer",
                                    fontSize: 11,
                                  }}
                                >
                                  <i className="fas fa-pen"></i>
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                background: "#F1F5F9",
                                color: "#475569",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 11.5,
                              }}
                            >
                              {c.count} Faktur
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <strong style={{ fontSize: 14, color: "#DC2626" }}>{formatRp(c.total)}</strong>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 8 }}>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    background: "#25D366",
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 11.5,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <i className="fab fa-whatsapp"></i> Tagih WA
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerFilter(c.nama);
                                  setStatusQuick("piutang");
                                  setFinanceView("data");
                                }}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #CBD5E1",
                                  background: "#fff",
                                  color: "#334155",
                                  fontWeight: 600,
                                  fontSize: 11.5,
                                  cursor: "pointer",
                                }}
                              >
                                Rincian
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. VIEW 2: MASTER PELANGGAN */}
      {financeView === "pelanggan" && (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            overflow: "hidden",
          }}
        >
          {/* Header Master Pelanggan */}
          <div
            style={{
              padding: "18px 22px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fas fa-users" style={{ color: "#7C3AED" }}></i>
                Direktori Master Pelanggan Toko
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                Daftar pelanggan dari Accurate dan transaksi toko beserta status akumulasi piutang dan kontak.
              </div>
            </div>
            <span
              style={{
                background: "rgba(124,58,237,0.1)",
                color: "#7C3AED",
                fontWeight: 700,
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 20,
              }}
            >
              {allCustomersData.length} Total Pelanggan
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Pelanggan & ID", "Kontak WhatsApp", "Tipe", "Total Faktur", "Total Piutang", "Aksi"].map(
                    (h, idx) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: idx === 4 ? "right" : "left",
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "#64748B",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {allCustomersData.map((c) => {
                  const phone = getPhone(c.nama);
                  const palette = getAvatarPalette(c.nama);
                  const initials = getInitials(c.nama);
                  const totalPiutang = c.invoices.reduce(
                    (sum, inv) => sum + (inv.terutang || 0),
                    0,
                  );

                  return (
                    <tr key={c.nama} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: palette.bg,
                              border: `1px solid ${palette.border}`,
                              color: palette.text,
                              fontWeight: 800,
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#0F172A" }}>{c.nama}</div>
                            <div style={{ fontSize: 11, color: "#64748B", display: "flex", gap: 6 }}>
                              <span>#{c.no_pelanggan}</span>
                              {c.is_master && (
                                <span style={{ color: "#7C3AED", fontWeight: 700 }}>• Accurate Master</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {phoneEdit?.nama === c.nama ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              value={phoneEdit.phone}
                              onChange={(e) => setPhoneEdit({ ...phoneEdit, phone: e.target.value })}
                              style={{ height: 28, width: 110, fontSize: 12, padding: "0 6px" }}
                            />
                            <button
                              type="button"
                              onClick={() => savePhone(c.nama, phoneEdit.phone)}
                              style={{
                                height: 28,
                                padding: "0 8px",
                                background: "#059669",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: phone ? 600 : 400, color: phone ? "#0F172A" : "#94A3B8" }}>
                              {phone || "Belum diisi"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPhoneEdit({ nama: c.nama, phone: phone || "" })}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#0056b3",
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background: "#F1F5F9",
                            color: "#475569",
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 11.5,
                            textTransform: "capitalize",
                          }}
                        >
                          {c.type || "Retail"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 700, color: "#334155" }}>{c.invoices.length} Faktur</span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <strong style={{ fontSize: 14, color: totalPiutang > 0 ? "#DC2626" : "#059669" }}>
                          {formatRp(totalPiutang)}
                        </strong>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerFilter(c.nama);
                            setStatusQuick("all");
                            setFinanceView("data");
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #CBD5E1",
                            background: "#fff",
                            color: "#0056b3",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Buka Faktur
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VIEW 3: DATA SEMUA KEUANGAN (BUKU BESAR FAKTUR) */}
      {financeView === "data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Unified Filter Card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              padding: "16px 20px",
            }}
          >
            {/* Row 1: Search + Quick Chips */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 14,
              }}
            >
              {/* Search Bar */}
              <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
                <i
                  className="fas fa-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    fontSize: 13,
                  }}
                ></i>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari No. Faktur, nama pelanggan, keterangan rekening, atau nomor WA..."
                  style={{
                    width: "100%",
                    height: 40,
                    padding: "0 12px 0 36px",
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {/* Status Quick Chips */}
              <div
                style={{
                  display: "flex",
                  background: "#F1F5F9",
                  borderRadius: 10,
                  padding: 3,
                  border: "1px solid #E2E8F0",
                }}
              >
                {[
                  { key: "piutang", label: "Masih Ada Tagihan", icon: "fa-clock", color: "#DC2626" },
                  { key: "lunas", label: "Sudah Lunas", icon: "fa-check", color: "#059669" },
                  { key: "all", label: "Semua Faktur", icon: "fa-list", color: "#0056b3" },
                ].map((chip) => {
                  const active = statusQuick === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setStatusQuick(chip.key)}
                      style={{
                        border: "none",
                        background: active ? "#fff" : "transparent",
                        color: active ? chip.color : "#64748B",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <i className={`fas ${chip.icon}`}></i>
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Dropdowns & Date Range */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                fontSize: 12.5,
              }}
            >
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#334155",
                  outline: "none",
                }}
              >
                <option value="all">Status: Semua</option>
                <option value="belum">Belum Bayar</option>
                <option value="sebagian">Sebagian</option>
                <option value="lunas">Lunas</option>
              </select>

              {/* Customer Dropdown */}
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                style={{
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#334155",
                  outline: "none",
                  maxWidth: 200,
                }}
              >
                <option value="all">Pelanggan: Semua</option>
                {customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Date From */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#64748B", fontSize: 12 }}>Dari</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    height: 36,
                    padding: "0 8px",
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Date To */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#64748B", fontSize: 12 }}>s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    height: 36,
                    padding: "0 8px",
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Reset Filter Button */}
              {(statusFilter !== "all" || customerFilter !== "all" || search || statusQuick !== "piutang") && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCustomerFilter("all");
                    setSearch("");
                    setStatusQuick("all");
                  }}
                  style={{
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px dashed #CBD5E1",
                    background: "#F8FAFC",
                    color: "#64748B",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="fas fa-rotate-left"></i> Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Dual Column Layout: Invoices Table + Sidebar Intelligence */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2.3fr) minmax(280px, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Left Column: Tabel Buku Besar Faktur */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
                    Daftar Faktur Penjualan
                  </h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Menampilkan {filtered.length} dari {rows.length} total dokumen faktur
                  </div>
                </div>
                <span
                  style={{
                    background: "#F1F5F9",
                    color: "#475569",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {filtered.length} FP
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                      {[
                        "No. Faktur",
                        "Tanggal",
                        "Pelanggan & Kontak",
                        "Nilai Faktur",
                        "Sisa Terutang",
                        "Status",
                        "Aksi Cepat",
                      ].map((h, idx) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 14px",
                            textAlign: idx === 3 || idx === 4 ? "right" : "left",
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "#64748B",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const st = STATUS_META[r.status] || STATUS_META.belum;
                      const payCount = (r.payments || []).length;
                      const phone = getPhone(r.nama);
                      const waTagih = r.terutang > 0 ? buildWaTagihLink(phone, r) : null;
                      const waLunas = r.terutang <= 0 ? buildWaLunasLink(phone, r) : null;

                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: "1px solid #F1F5F9",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0056b3" }}>
                            {r.no_faktur}
                          </td>
                          <td style={{ padding: "12px 14px", color: "#475569", whiteSpace: "nowrap" }}>
                            {formatDateId(r.tgl)}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 800, color: "#0F172A" }}>{r.nama}</div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>
                              #{r.no_pelanggan} {phone ? `· ${phone}` : "· WA kosong"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#0F172A" }}>
                            {formatRp(r.nilai)}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              textAlign: "right",
                              fontWeight: 800,
                              color: r.terutang > 0 ? "#DC2626" : "#059669",
                            }}
                          >
                            {formatRp(r.terutang)}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "4px 9px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                                background: st.bg,
                                color: st.color,
                                border: `1px solid ${st.border}`,
                              }}
                            >
                              <i className={`fas ${st.icon}`}></i>
                              {st.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {/* Tombol Tagih WA */}
                              {waTagih && (
                                <a
                                  href={waTagih}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: "#25D366",
                                    color: "#fff",
                                    textDecoration: "none",
                                  }}
                                  title="Tagih pelunasan via WA"
                                >
                                  <i className="fab fa-whatsapp"></i> Tagih
                                </a>
                              )}
                              {waLunas && (
                                <a
                                  href={waLunas}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: "#128C7E",
                                    color: "#fff",
                                    textDecoration: "none",
                                  }}
                                  title="Kirim konfirmasi lunas via WA"
                                >
                                  <i className="fab fa-whatsapp"></i> Info Lunas
                                </a>
                              )}

                              {/* Bayar & Lunas jika masih ada utang */}
                              {r.terutang > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayModal(r);
                                      setPayAmount(String(r.terutang));
                                      setPayNote("");
                                    }}
                                    style={{
                                      padding: "4px 9px",
                                      borderRadius: 6,
                                      border: "1px solid #0284c7",
                                      background: "rgba(2,132,199,0.08)",
                                      color: "#0284c7",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Bayar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => markPaid(r)}
                                    style={{
                                      padding: "4px 9px",
                                      borderRadius: 6,
                                      border: "1px solid #059669",
                                      background: "rgba(5,150,105,0.08)",
                                      color: "#059669",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Lunas
                                  </button>
                                </>
                              )}

                              {/* Riwayat History */}
                              <button
                                type="button"
                                onClick={() => setHistoryModal(r)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #CBD5E1",
                                  background: "#fff",
                                  color: "#64748B",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Lihat timeline pembayaran faktur"
                              >
                                <i className="fas fa-history"></i>
                                {payCount > 0 ? ` ${payCount}` : ""}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filtered.length && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 32,
                            textAlign: "center",
                            color: "#64748B",
                            fontSize: 13,
                          }}
                        >
                          Tidak ada faktur yang sesuai dengan filter pencarian ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Financial Intelligence Widgets */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Widget 1: Top Piutang Leaderboard */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="fas fa-trophy" style={{ color: "#F59E0B" }}></i>
                    Top 5 Piutang Terbesar
                  </h3>
                  <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700 }}>Prioritas Tagih</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {piutangCustomers.slice(0, 5).map((c, idx) => {
                    const phone = getPhone(c.nama);
                    const sample = c.invoices[0];
                    const waLink =
                      phone && sample
                        ? buildWaTagihLink(phone, {
                            ...sample,
                            terutang: c.total,
                            no_faktur: c.invoices.map((x) => x.no_faktur).join(", "),
                            tgl: sample.tgl,
                            nilai: c.invoices.reduce((s, x) => s + Number(x.nilai || 0), 0),
                          })
                        : null;

                    return (
                      <div
                        key={c.nama}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: idx === 0 ? "rgba(239,68,68,0.05)" : "#F8FAFC",
                          border: `1px solid ${idx === 0 ? "rgba(239,68,68,0.2)" : "#F1F5F9"}`,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 8,
                            background: idx === 0 ? "#EF4444" : idx === 1 ? "#F59E0B" : "#94A3B8",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 12.5,
                              color: "#0F172A",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.nama}
                          </div>
                          <div style={{ fontSize: 10.5, color: "#64748B" }}>
                            {c.count} FP {phone ? `· ${phone}` : "· no WA -"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: 12, color: "#DC2626" }}>
                            {formatRp(c.total)}
                          </div>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 10,
                                color: "#25D366",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <i className="fab fa-whatsapp"></i> Tagih
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!piutangCustomers.length && (
                    <div style={{ fontSize: 12, color: "#059669", textAlign: "center", padding: 12 }}>
                      🎉 Semua tagihan pelanggan lunas!
                    </div>
                  )}
                </div>
              </div>

              {/* Widget 2: Ringkasan Global */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  padding: "18px 20px",
                }}
              >
                <h3 style={{ margin: "0 0 12px 0", fontSize: 14.5, fontWeight: 800, color: "#0F172A" }}>
                  Ringkasan Buku Besar
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Total Faktur</span>
                    <strong style={{ color: "#0F172A" }}>{allSummary.count} dokumen</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Omzet Akumulasi</span>
                    <strong style={{ color: "#0056b3" }}>{formatRp(allSummary.total_nilai)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Kas Terkumpul</span>
                    <strong style={{ color: "#059669" }}>{formatRp(allSummary.total_dibayar)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748B" }}>Sisa Piutang</span>
                    <strong style={{ color: "#DC2626" }}>{formatRp(allSummary.total_terutang)}</strong>
                  </div>
                  <div
                    style={{
                      borderTop: "1px dashed #CBD5E1",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#64748B", fontWeight: 700 }}>Efisiensi Tagih</span>
                    <strong style={{ color: "#7C3AED" }}>{allSummary.collection_rate}%</strong>
                  </div>
                </div>
              </div>

              {/* Widget 3: Log Riwayat Undo */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "#0F172A" }}>
                    Riwayat Pembayaran Baru
                  </h3>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{undoStack.length} Aksi</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                  {!undoStack.length && (
                    <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: 10 }}>
                      Belum ada pembayaran baru yang tercatat di sesi ini.
                    </div>
                  )}
                  {undoStack.slice(0, 6).map((u, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11.5,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: i === 0 ? "rgba(255,115,0,0.08)" : "#F8FAFC",
                        color: i === 0 ? "#C2410C" : "#64748B",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <i className="fas fa-check" style={{ color: i === 0 ? "#FF7300" : "#94A3B8" }}></i>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL TAMBAH FAKTUR BARU */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="md">
        <form onSubmit={addInvoice}>
          <div className="modal-header">
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 800 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(0,86,179,0.1)",
                  color: "#0056b3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fas fa-file-circle-plus"></i>
              </span>
              Tambah Faktur Penjualan Baru
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="modal-close-btn"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                No. Faktur Penjualan
                <input
                  type="text"
                  placeholder="252xxx (otomatis jika kosong)"
                  value={form.no_faktur}
                  onChange={(e) => setForm({ ...form, no_faktur: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Tanggal Faktur
                <input
                  type="date"
                  required
                  value={form.tgl}
                  onChange={(e) => setForm({ ...form, tgl: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                No. ID Pelanggan
                <input
                  type="text"
                  placeholder="16xx / 17xx"
                  value={form.no_pelanggan}
                  onChange={(e) => setForm({ ...form, no_pelanggan: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Nama Toko / Pelanggan *
                <input
                  type="text"
                  required
                  placeholder="Nama toko / customer"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Nilai Faktur (Rp) *
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1.500.000"
                  value={form.nilai}
                  onChange={(e) => setForm({ ...form, nilai: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Sisa Terutang (Rp)
                <input
                  type="text"
                  placeholder="Kosong = Terutang Penuh"
                  value={form.terutang}
                  onChange={(e) => setForm({ ...form, terutang: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
              Keterangan Rekening / Pembayaran
              <input
                type="text"
                value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                placeholder={COMPANY.bank}
                style={{
                  width: "100%",
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  padding: "0 10px",
                  marginTop: 4,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{
                  height: 40,
                  padding: "0 22px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #0056b3, #0284c7)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,86,179,0.25)",
                }}
              >
                Simpan Faktur
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 8. MODAL CATAT PEMBAYARAN */}
      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} size="sm">
        {payModal && (
          <div>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(5, 150, 105, 0.1)",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="fas fa-money-bill-wave"></i>
                </span>
                Catat Pembayaran Faktur
              </h3>
              <button
                type="button"
                onClick={() => setPayModal(null)}
                className="modal-close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Ringkasan Faktur */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 15, color: "#0F172A" }}>FP {payModal.no_faktur}</strong>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{formatDateId(payModal.tgl)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>
                  {payModal.nama} (#{payModal.no_pelanggan})
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px dashed #E2E8F0",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#64748B" }}>Total Nilai: {formatRp(payModal.nilai)}</span>
                  <span style={{ color: "#DC2626", fontWeight: 800 }}>
                    Sisa: {formatRp(payModal.terutang)}
                  </span>
                </div>
              </div>

              {/* Quick Fill Shortcuts */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>
                  PILIHAN CEPAT JUMLAH BAYAR
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payModal.terutang))}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #A7F3D0",
                      background: "#ECFDF5",
                      color: "#059669",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Pelunasan Penuh (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(Math.round(payModal.terutang * 0.5)))}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      background: "#fff",
                      color: "#334155",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(Math.round(payModal.terutang * 0.25)))}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      background: "#fff",
                      color: "#334155",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    25%
                  </button>
                </div>
              </div>

              {/* Input Jumlah Bayar */}
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Jumlah yang Dibayarkan (Rp) *
                <input
                  type="text"
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Masukkan nominal bayar"
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 12px",
                    marginTop: 4,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#059669",
                    outline: "none",
                  }}
                />
              </label>

              {/* Catatan Pembayaran */}
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Metode / Catatan Pembayaran
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Misal: Transfer BCA, Kas Tunai, Giro"
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    padding: "0 10px",
                    marginTop: 4,
                    fontSize: 12.5,
                    outline: "none",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  style={{
                    height: 40,
                    padding: "0 16px",
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applyPayment}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #059669, #10B981)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
                  }}
                >
                  Simpan Pembayaran
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 9. MODAL RIWAYAT PEMBAYARAN & AUDIT TIMELINE */}
      <Modal isOpen={!!historyRow} onClose={() => setHistoryModal(null)} size="md">
        {historyRow && (
          <div>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.1)",
                    color: "#7C3AED",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="fas fa-history"></i>
                </span>
                Audit Riwayat Pembayaran · FP {historyRow.no_faktur}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModal(null)}
                className="modal-close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 3 Metrik Finansial Faktur */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                    NILAI FAKTUR
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                    {formatRp(historyRow.nilai)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    background: "rgba(5, 150, 105, 0.08)",
                    border: "1px solid rgba(5, 150, 105, 0.2)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase" }}>
                    SUDAH DIBAYAR
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#059669", marginTop: 2 }}>
                    {formatRp(historyRow.dibayar)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: 12,
                    background: historyRow.terutang > 0 ? "rgba(220, 38, 38, 0.08)" : "rgba(5, 150, 105, 0.08)",
                    border: `1px solid ${historyRow.terutang > 0 ? "rgba(220, 38, 38, 0.2)" : "rgba(5, 150, 105, 0.2)"}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: historyRow.terutang > 0 ? "#DC2626" : "#059669", fontWeight: 700, textTransform: "uppercase" }}>
                    SISA TERUTANG
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: historyRow.terutang > 0 ? "#DC2626" : "#059669", marginTop: 2 }}>
                    {historyRow.terutang > 0 ? formatRp(historyRow.terutang) : "LUNAS ✓"}
                  </div>
                </div>
              </div>

              {/* Customer Info Bar */}
              <div style={{ fontSize: 12, color: "#64748B", display: "flex", gap: 8, alignItems: "center" }}>
                <span>Pelanggan: <strong style={{ color: "#0F172A" }}>{historyRow.nama}</strong></span>
                <span>·</span>
                <span>ID: #{historyRow.no_pelanggan}</span>
                <span>·</span>
                <span>Tanggal Terbit: {formatDateId(historyRow.tgl)}</span>
              </div>

              {/* Timeline Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#F8FAFC",
                    border: "1px dashed #CBD5E1",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#334155" }}>📄 Faktur Penjualan Diterbitkan</div>
                  <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>
                    {formatDateId(historyRow.tgl)} · Nilai {formatRp(historyRow.nilai)}
                  </div>
                </div>

                {runningPaid.map((p, i) => (
                  <div
                    key={p.id || i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: p.type === "lunas" ? "rgba(5,150,105,0.06)" : "#fff",
                      border: `1px solid ${p.type === "lunas" ? "rgba(5,150,105,0.2)" : "#E2E8F0"}`,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: p.type === "lunas" ? "#059669" : "#0F172A" }}>
                        {p.type === "lunas" ? "✓ Pelunasan Faktur" : `Pembayaran Termin ke-${i + 1}`}
                      </strong>
                      <span style={{ fontWeight: 800, color: "#059669", fontSize: 13 }}>
                        +{formatRp(p.amount)}
                      </span>
                    </div>
                    <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>
                      {new Date(p.at).toLocaleString("id-ID")} {p.note ? `· ${p.note}` : ""}
                    </div>
                  </div>
                ))}

                {!runningPaid.length && (
                  <div style={{ padding: 16, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                    Belum ada riwayat pembayaran yang tercatat pada faktur ini.
                  </div>
                )}
              </div>

              {/* Action Buttons Timeline */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingTop: 10,
                  borderTop: "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => undoLastPaymentOnInvoice(historyRow.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #FF7300",
                      background: "rgba(255,115,0,0.08)",
                      color: "#FF7300",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fas fa-undo"></i> Batalkan Bayar Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={() => resetInvoicePayments(historyRow.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #DC2626",
                      background: "rgba(220,38,38,0.08)",
                      color: "#DC2626",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fas fa-rotate-left"></i> Reset ke Belum Bayar
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {historyRow.terutang > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryModal(null);
                        setPayModal(historyRow);
                        setPayAmount(String(historyRow.terutang));
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: "#0056b3",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Bayar Lagi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryModal(null)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      background: "#fff",
                      color: "#334155",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
