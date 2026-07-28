import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function MainApp() {
  const [page, setPage] = useState('dashboard')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [historyFilter, setHistoryFilter] = useState(null)

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

  /** KPI dashboard → history detail */
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
          {page === 'dashboard' && <Dashboard onNavigate={navigate} showHistory={showHistory} />}
          {page === 'produk' && (
            <ProductList
              onSelect={(p) => {
                setSelectedProduct(p)
                setPage('ar')
              }}
            />
          )}
          {page === 'ar' && selectedProduct && (
            <ARViewer product={selectedProduct} onBack={() => setPage('produk')} />
          )}
          {page === 'barang-masuk' && <StockTransaction mode="in" />}
          {page === 'barang-keluar' && <StockTransaction mode="out" />}
          {page === 'ai-asisten' && <AIAsisten onNavigate={navigate} />}
          {page === 'laporan' && <Reports onNavigate={navigate} initialFilter={historyFilter} />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <InventoryProvider>
        <Routes>
          <Route path="/scan/:id" element={<ScanPage />} />
          <Route path="*" element={<MainApp />} />
        </Routes>
      </InventoryProvider>
    </BrowserRouter>
  )
}
