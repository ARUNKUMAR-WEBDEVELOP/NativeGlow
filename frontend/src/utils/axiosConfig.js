import axios from 'axios'

function normalizeApiBase(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
}

const API_BASE = normalizeApiBase(
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:8000'
    : 'https://nativeglow.onrender.com')
)

const API = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

API.interceptors.request.use(
  (config) => {
    let vendorToken = localStorage.getItem('vendor_token')
    if (!vendorToken) {
      try {
        const vendorSession = JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null')
        vendorToken = vendorSession?.access || ''
      } catch {
        vendorToken = ''
      }
    }
    const buyerToken = localStorage.getItem('buyer_token')
    const adminToken = localStorage.getItem('admin_token')

    const token = vendorToken || buyerToken || adminToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('vendor_token')
      localStorage.removeItem('nativeglow_vendor_tokens')
      localStorage.removeItem('buyer_token')
      localStorage.removeItem('admin_token')
    }

    return Promise.reject(error)
  }
)

export default API
