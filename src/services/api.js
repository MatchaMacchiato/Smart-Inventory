import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  timeout: 15000,
})

// Token di-set dari AuthContext setelah login
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  users: () => api.get('/auth/users'),
  updateRole: (id, role) => api.put(`/auth/users/${id}/role`, { role }),
}

export const productApi = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  get3DModel: (id) => api.get(`/products/${id}/model`),
  stockHistory: (id) => api.get(`/products/${id}/stock-history`),
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  topProducts: () => api.get('/dashboard/top-products'),
  stockMovement: (params) => api.get('/dashboard/stock-movement', { params }),
  recentSales: () => api.get('/dashboard/recent-sales'),
}

export const stockApi = {
  update: (id, data) => api.put(`/products/${id}/stock`, data),
  lowStock: () => api.get('/stock/low'),
  analytics: () => api.get('/stock/analytics'),
  predictions: () => api.get('/stock/predictions'),
}

export const financeApi = {
  list: () => api.get('/finance/invoices'),
  create: (data) => api.post('/finance/invoices', data),
  pay: (id, amount, note) => api.post(`/finance/invoices/${id}/pay`, { amount, note }),
  markPaid: (id) => api.post(`/finance/invoices/${id}/mark-paid`),
  undoPayment: (id) => api.post(`/finance/invoices/${id}/undo-payment`),
  reset: (id) => api.post(`/finance/invoices/${id}/reset`),
  destroy: (id) => api.delete(`/finance/invoices/${id}`),
}

export const aiApi = {
  scanShelf: (formData) => api.post('/ai/shelf-scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  }),
  detectProduct: (formData) => api.post('/ai/detect-product', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }),
  modelInfo: () => api.get('/ai/models/info'),
  health: () => api.get('/ai/health'),
}

export default api
