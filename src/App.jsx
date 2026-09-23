import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { MasterProvider } from "@/context/MasterContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Dashboard from "@/components/Dashboard";
import MasterCategory from "@/components/MasterCategory";
import ProductList from "@/components/ProductList";
import MasterSupplier from "@/components/MasterSupplier";
import Finance from "@/components/Finance";
import ManajemenStok from "@/components/ManajemenStok";
import PurchaseOrder from "@/components/PurchaseOrder";
import ReturBarang from "@/components/ReturBarang";
import StockOpname from "@/components/StockOpname";
import StockTransaction from "@/components/StockTransaction";
import Reports from "@/components/Reports";
import ARViewer from "@/components/ARViewer";
import AIAsisten from "@/components/AIAsisten";
import AIIntelligence from "@/components/AIIntelligence";
import BomAI from "@/components/BomAI";
import AIScan from "@/components/AIScan";
import ScanPage from "@/components/ScanPage";
import LoginPage from "@/components/LoginPage";

// Page transition: subtle, crisp, no cheesy bouncing
const pageVariants = {
  initial: { opacity: 0, y: 5 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -3,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
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
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
        }}
      >
        <span style={{ marginRight: 10 }}>Memuat Ruang Kerja KDM...</span>
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
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <Sidebar
        page={page}
        onNavigate={navigate}
        open={menuOpen}
        onClose={closeMenu}
      />
      <div className="main-area">
        <Topbar
          page={page}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((open) => !open)}
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
              {/* OPERASIONAL UTAMA */}
              {page === "dashboard" && (
                <Dashboard onNavigate={navigate} showHistory={showHistory} />
              )}

              {/* 8 MENU UTAMA */}
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

              {/* MENU 6, 7, 8 PENGGANTI BARU (DILENGKAPI FALLBACK ALIAS) */}
              {(page === "purchase-order" || page === "apriori") && (
                <PurchaseOrder />
              )}
              {(page === "retur-barang" || page === "eoq") && <ReturBarang />}
              {(page === "stock-opname" || page === "rekomendasi") && (
                <StockOpname />
              )}

              {/* TRANSAKSI OPERASIONAL & MUTASI */}
              {page === "barang-masuk" && <StockTransaction mode="in" />}
              {page === "barang-keluar" && <StockTransaction mode="out" />}
              {page === "laporan" && (
                <Reports onNavigate={navigate} initialFilter={historyFilter} />
              )}

              {/* ALAT BANTU / UTILITAS */}
              {page === "ar" && selectedProduct && (
                <ARViewer
                  product={selectedProduct}
                  onBack={() => setPage("produk")}
                />
              )}
              {page === "ai-asisten" && <AIAsisten onNavigate={navigate} />}
              {page === "ai-intel" && <AIIntelligence onNavigate={navigate} />}
              {page === "bom-ai" && <BomAI onNavigate={navigate} />}
              {page === "ai-scan" && <AIScan />}
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
