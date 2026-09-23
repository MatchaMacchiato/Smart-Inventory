/**
 * Seed dari sample FP Accurate — PT. KEMILAU ABADI MAKMUR
 * Daftar Faktur Penjualan 01–27 Jul 2026
 * Format nilai: Rupiah (integer)
 */

function parseIdMoney(s) {
  if (typeof s === "number") return Math.round(s);
  if (!s) return 0;
  // "24.777.900,00" or "24777900,00"
  const t = String(s).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Seed rows (mirip export Accurate) */
export const SEED_INVOICES = [
  {
    no_faktur: "252563",
    tgl: "2026-07-14",
    no_pelanggan: "1703",
    nama: "TERANG LABUAN",
    nilai: 24777900,
    terutang: 24777900,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252544",
    tgl: "2026-07-11",
    no_pelanggan: "1702",
    nama: "SINAR TERANG SERANG",
    nilai: 1846908,
    terutang: 1846908,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252516",
    tgl: "2026-07-09",
    no_pelanggan: "1700",
    nama: "EKI JAYA",
    nilai: 1074480,
    terutang: 1074480,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252635",
    tgl: "2026-07-24",
    no_pelanggan: "1699",
    nama: "AMIN ELECTRIC",
    nilai: 13399224,
    terutang: 13399224,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252562",
    tgl: "2026-07-14",
    no_pelanggan: "1699",
    nama: "AMIN ELECTRIC",
    nilai: 18117000,
    terutang: 18117000,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252561",
    tgl: "2026-07-14",
    no_pelanggan: "1699",
    nama: "AMIN ELECTRIC",
    nilai: 1190700,
    terutang: 1190700,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252509",
    tgl: "2026-07-09",
    no_pelanggan: "1699",
    nama: "AMIN ELECTRIC",
    nilai: 8472240,
    terutang: 8472240,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252612",
    tgl: "2026-07-20",
    no_pelanggan: "1697",
    nama: "CAHAYA LISTRIK",
    nilai: 6850000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252497",
    tgl: "2026-07-07",
    no_pelanggan: "1697",
    nama: "CAHAYA LISTRIK",
    nilai: 4979814,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252643",
    tgl: "2026-07-25",
    no_pelanggan: "1696",
    nama: "BERKAH WALANTAKA",
    nilai: 1618568,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252464",
    tgl: "2026-07-04",
    no_pelanggan: "1695",
    nama: "TB. KK JAYA",
    nilai: 2562711,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252658",
    tgl: "2026-07-27",
    no_pelanggan: "1694",
    nama: "DEWI ELEKTRIK",
    nilai: 1240000,
    terutang: 1240000,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252657",
    tgl: "2026-07-27",
    no_pelanggan: "1694",
    nama: "DEWI ELEKTRIK",
    nilai: 1634032,
    terutang: 1634032,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252482",
    tgl: "2026-07-06",
    no_pelanggan: "1694",
    nama: "DEWI ELEKTRIK",
    nilai: 824758,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252618",
    tgl: "2026-07-21",
    no_pelanggan: "1688",
    nama: "Sinar Mitra Sejahtera 2",
    nilai: 129780,
    terutang: 0,
    keterangan: "",
  },
  {
    no_faktur: "252491",
    tgl: "2026-07-06",
    no_pelanggan: "1688",
    nama: "Sinar Mitra Sejahtera 2",
    nilai: 3467648,
    terutang: 3467648,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252512",
    tgl: "2026-07-09",
    no_pelanggan: "1687",
    nama: "Sinar Mitra Sejahtera",
    nilai: 3341000,
    terutang: 3341000,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252500",
    tgl: "2026-07-07",
    no_pelanggan: "1687",
    nama: "Sinar Mitra Sejahtera",
    nilai: 4689116,
    terutang: 4689116,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252614",
    tgl: "2026-07-20",
    no_pelanggan: "1686",
    nama: "MUKSI",
    nilai: 2130000,
    terutang: 2130000,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252640",
    tgl: "2026-07-25",
    no_pelanggan: "1685",
    nama: "CAHAYA TERANG",
    nilai: 10343922,
    terutang: 10343922,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252648",
    tgl: "2026-07-25",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 384000,
    terutang: 0,
    keterangan: "7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252606",
    tgl: "2026-07-18",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 65000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252558",
    tgl: "2026-07-14",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 1228000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252530",
    tgl: "2026-07-10",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 1492000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252505",
    tgl: "2026-07-08",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 725000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252499",
    tgl: "2026-07-07",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 235000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252478",
    tgl: "2026-07-04",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 1012000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252457",
    tgl: "2026-07-03",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 620000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252451",
    tgl: "2026-07-02",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 117000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252441",
    tgl: "2026-07-01",
    no_pelanggan: "1684",
    nama: "CINDY INTERIOR",
    nilai: 660000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252651",
    tgl: "2026-07-25",
    no_pelanggan: "1682",
    nama: "KONDI PUTRA",
    nilai: 1330568,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252603",
    tgl: "2026-07-18",
    no_pelanggan: "1682",
    nama: "KONDI PUTRA",
    nilai: 1860000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252538",
    tgl: "2026-07-11",
    no_pelanggan: "1682",
    nama: "KONDI PUTRA",
    nilai: 1428000,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252537",
    tgl: "2026-07-11",
    no_pelanggan: "1682",
    nama: "KONDI PUTRA",
    nilai: 4994056,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252466",
    tgl: "2026-07-04",
    no_pelanggan: "1682",
    nama: "KONDI PUTRA",
    nilai: 4366330,
    terutang: 0,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252646",
    tgl: "2026-07-25",
    no_pelanggan: "1681",
    nama: "SDP TEKNIK",
    nilai: 9573092,
    terutang: 9573092,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252602",
    tgl: "2026-07-18",
    no_pelanggan: "1681",
    nama: "SDP TEKNIK",
    nilai: 2084544,
    terutang: 2084544,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
  {
    no_faktur: "252536",
    tgl: "2026-07-11",
    no_pelanggan: "1681",
    nama: "SDP TEKNIK",
    nilai: 3792000,
    terutang: 3792000,
    keterangan: "BCA 7001088835 KEMILAU ABADI MAKMUR",
  },
].map((r, i) => ({
  id: i + 1,
  ...r,
  status:
    r.terutang <= 0 ? "lunas" : r.terutang >= r.nilai ? "belum" : "sebagian",
  dibayar: Math.max(0, r.nilai - r.terutang),
}));

export const COMPANY = {
  name: "PT. KEMILAU ABADI MAKMUR",
  bank: "BCA 7001088835",
  reportTitle: "Daftar Faktur Penjualan",
};

export function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

export function formatDateId(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function summarizeInvoices(list) {
  const total_nilai = list.reduce((s, r) => s + Number(r.nilai || 0), 0);
  const total_terutang = list.reduce((s, r) => s + Number(r.terutang || 0), 0);
  const total_dibayar = list.reduce((s, r) => s + Number(r.dibayar || 0), 0);
  const lunas = list.filter((r) => r.status === "lunas").length;
  const belumbayar = list.filter((r) => r.status === "belum").length;
  const sebagian = list.filter((r) => r.status === "sebagian").length;
  const byCustomer = {};
  list.forEach((r) => {
    if (!byCustomer[r.nama]) {
      byCustomer[r.nama] = {
        nama: r.nama,
        no_pelanggan: r.no_pelanggan,
        count: 0,
        nilai: 0,
        terutang: 0,
      };
    }
    byCustomer[r.nama].count += 1;
    byCustomer[r.nama].nilai += Number(r.nilai || 0);
    byCustomer[r.nama].terutang += Number(r.terutang || 0);
  });
  const topCustomers = Object.values(byCustomer).sort(
    (a, b) => b.nilai - a.nilai,
  );
  return {
    total_nilai,
    total_terutang,
    total_dibayar,
    count: list.length,
    lunas,
    belumbayar,
    sebagian,
    collection_rate:
      total_nilai > 0
        ? Math.round((total_dibayar / total_nilai) * 1000) / 10
        : 0,
    topCustomers,
  };
}

export { parseIdMoney };
