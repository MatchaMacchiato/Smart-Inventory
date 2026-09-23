import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { MasterProvider } from "@/context/MasterContext";
import MasterCategory from "@/components/MasterCategory";
import MasterSupplier from "@/components/MasterSupplier";
import ManajemenStok from "@/components/ManajemenStok";
import AnalisisApriori from "@/components/AnalisisApriori";
import OptimasiEOQ from "@/components/OptimasiEOQ";
import RekomendasiPengadaan from "@/components/RekomendasiPengadaan";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Dashboard from "@/components/Dashboard";
import ProductList from "@/components/ProductList";
import ARViewer from "@/components/ARViewer";
import StockTransaction from "@/components/StockTransaction";
import AIAsisten from "@/components/AIAsisten";
import Reports from "@/components/Reports";
import ScanPage from "@/components/ScanPage";
import LoginPage from "@/components/LoginPage";
import Finance from "@/components/Finance";
import BomAI from "@/components/BomAI";
import AIScan from "@/components/AIScan";
import AIIntelligence from "@/components/AIIntelligence";

// Page transition (UI/UX Pro Max — softer, shorter travel, no bounce)
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
  },
};

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyFilter, setHistoryFilter] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#64748B",
          fontFamily: "'Nunito Sans', sans-serif",
        }}
      >
        <i className="fas fa-spinner fa-spin" style={{ marginRight: 10 }}></i>
        Memuat...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const navigate = (key) => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    setHistoryFilter(null);
    if (key === "ar") {
      if (!selectedProduct) {
        setPage("produk");
        return;
      }
      setPage("ar");
      return;
    }
    if (key === "scan") {
      setPage("ai-asisten");
      return;
    }
    setPage(key);
  };

  const showHistory = (filter) => {
    navigate("laporan");
    setHistoryFilter(filter);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten</a>
      <Sidebar page={page} onNavigate={navigate} open={menuOpen} onClose={closeMenu} />
      <div className="main-area">
        <Topbar
          page={page}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen(open => !open)}
          onNavigate={navigate}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            setPage("ar");
          }}
        />
        <main id="main-content" className="content-wrap" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="page-anim"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {page === "dashboard" && (
                <Dashboard onNavigate={navigate} showHistory={showHistory} />
              )}
              {/* 8 MENU UTAMA (di luar users / transaksi / laporan) */}
              {page === "kategori" && <MasterCategory />}
              {page === "produk" && (
                <ProductList
                  onSelect={(p) => {
                    setSelectedProduct(p);
                    setPage("ar");
                  }}
                />
              )}
              {page === "supplier" && <MasterSupplier />}
              {page === "keuangan" && <Finance />}
              {page === "manajemen-stok" && <ManajemenStok />}
              {page === "apriori" && <AnalisisApriori />}
              {page === "eoq" && <OptimasiEOQ />}
              {page === "rekomendasi" && <RekomendasiPengadaan />}
              {/* Transaksi & penopang (bukan menu utama) */}
              {page === "ar" && selectedProduct && (
                <ARViewer
                  product={selectedProduct}
                  onBack={() => setPage("produk")}
                />
              )}
              {page === "barang-masuk" && <StockTransaction mode="in" />}
              {page === "barang-keluar" && <StockTransaction mode="out" />}
              {page === "ai-asisten" && <AIAsisten onNavigate={navigate} />}
              {page === "laporan" && (
                <Reports onNavigate={navigate} initialFilter={historyFilter} />
              )}
              {page === "bom-ai" && <BomAI onNavigate={navigate} />}
              {page === "ai-scan" && <AIScan />}
              {page === "ai-intel" && <AIIntelligence onNavigate={navigate} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InventoryProvider>
          <MasterProvider>
            <Routes>
              <Route
                path="/scan/:id"
                element={
                  <AuthProvider>
                    <InventoryProvider>
                      <ScanPage />
                    </InventoryProvider>
                  </AuthProvider>
                }
              />
              <Route path="*" element={<MainApp />} />
            </Routes>
          </MasterProvider>
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
