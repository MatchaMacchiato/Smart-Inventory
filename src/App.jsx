import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { InventoryProvider } from '@/context/InventoryContext'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Dashboard from '@/components/Dashboard'
import ProductList from '@/components/ProductList'
import ARViewer from '@/components/ARViewer'
import StockTransaction from '@/components/StockTransaction'
import AIAsisten from '@/components/AIAsisten'
import Reports from '@/components/Reports'
import ScanPage from '@/components/ScanPage'
import LoginPage from '@/components/LoginPage'
import Finance from '@/components/Finance'
import BomAI from '@/components/BomAI'
import AIScan from '@/components/AIScan'
import AIIntelligence from '@/components/AIIntelligence'

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
}

function MainApp() {
  const { user, loading: authLoading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [historyFilter, setHistoryFilter] = useState(null)

  if (authLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748B', fontFamily: "'Nunito Sans', sans-serif" }}>
      <i className="fas fa-spinner fa-spin" style={{ marginRight: 10 }}></i>Memuat...
    </div>
  }

  if (!user) return <LoginPage />

  const navigate = (key) => {
    setHistoryFilter(null)
    if (key === 'ar') {
      if (!selectedProduct) {
        setPage('produk')
        return
      }
      setPage('ar')
      return
    }
    if (key === 'scan' || key === 'stok') {
      setPage(key === 'scan' ? 'ai-asisten' : 'barang-masuk')
      return
    }
    setPage(key)
  }

  const showHistory = (filter) => {
    setHistoryFilter(filter)
    navigate('laporan')
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="main-area">
        <Topbar page={page} />
        <main className="content-wrap">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="page-anim"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {page === 'dashboard' && <Dashboard onNavigate={navigate} showHistory={showHistory} />}
              {page === 'produk' && (
                <ProductList
                  onSelect={(p) => { setSelectedProduct(p); setPage('ar') }}
                />
              )}
              {page === 'ar' && selectedProduct && (
                <ARViewer product={selectedProduct} onBack={() => setPage('produk')} />
              )}
              {page === 'barang-masuk' && <StockTransaction mode="in" />}
              {page === 'barang-keluar' && <StockTransaction mode="out" />}
              {page === 'ai-asisten' && <AIAsisten onNavigate={navigate} />}
              {page === 'laporan' && <Reports onNavigate={navigate} initialFilter={historyFilter} />}
              {page === 'keuangan' && <Finance />}
              {page === 'bom-ai' && <BomAI onNavigate={navigate} />}
              {page === 'ai-scan' && <AIScan />}
              {page === 'ai-intel' && <AIIntelligence onNavigate={navigate} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InventoryProvider>
          <Routes>
            <Route path="/scan/:id" element={<AuthProvider><InventoryProvider><ScanPage /></InventoryProvider></AuthProvider>} />
            <Route path="*" element={<MainApp />} />
          </Routes>
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
