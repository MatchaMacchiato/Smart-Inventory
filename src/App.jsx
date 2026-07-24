import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Dashboard from '@/components/Dashboard'
import ProductList from '@/components/ProductList'
import ARViewer from '@/components/ARViewer'
import ShelfScanner from '@/components/ShelfScanner'
import ScanPage from '@/components/ScanPage'

function MainApp() {
  const [page, setPage] = useState('dashboard')
  const [selectedProduct, setSelectedProduct] = useState(null)

  return (
    <div>
      <Navbar page={page} onNavigate={setPage} />
      <main style={{ padding: '28px', marginTop: '60px' }}>
        {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
        {page === 'produk' && <ProductList onSelect={(p) => { setSelectedProduct(p); setPage('ar') }} />}
        {page === 'ar' && selectedProduct && <ARViewer product={selectedProduct} onBack={() => setPage('produk')} />}
        {page === 'scan' && <ShelfScanner />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Scan page tanpa navbar — full-screen AR buat HP */}
        <Route path="/scan/:id" element={<ScanPage />} />
        {/* Main app dengan navbar */}
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  )
}
