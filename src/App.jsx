import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Dashboard from '@/components/Dashboard'
import ProductList from '@/components/ProductList'
import ARViewer from '@/components/ARViewer'
import ShelfScanner from '@/components/ShelfScanner'
import StockPage from '@/components/StockPage'
import Reports from '@/components/Reports'
import ScanPage from '@/components/ScanPage'

function MainApp() {
  const [page, setPage] = useState('dashboard')
  const [selectedProduct, setSelectedProduct] = useState(null)

  const navigate = (key) => {
    if (key === 'ar' && !selectedProduct) {
      setPage('produk')
      return
    }
    setPage(key)
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="main-area">
        <Topbar page={page} />
        <main className="content-wrap">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
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
          {page === 'scan' && <ShelfScanner />}
          {page === 'stok' && <StockPage />}
          {page === 'laporan' && <Reports onNavigate={navigate} />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/scan/:id" element={<ScanPage />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  )
}
