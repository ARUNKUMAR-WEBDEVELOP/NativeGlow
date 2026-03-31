import API from '../utils/axiosConfig'

// Auth
export const registerVendor  = (data)      => API.post('/api/vendor/register/', data)
export const loginVendor     = (data)      => API.post('/api/vendor/login/', data)
export const activateVendor  = (token)     => API.get(`/api/vendor/activate/?token=${token}`)
export const getVendorMe     = ()          => API.get('/api/vendor/me/')
export const updateVendorMe  = (data)      => API.put('/api/vendor/me/update/', data)

// Products
export const getMyProducts   = ()          => API.get('/api/vendor/products/')
export const addProduct      = (formData)  => API.post('/api/vendor/products/add/', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const editProduct     = (id, data)  => API.put(`/api/vendor/products/${id}/edit/`, data)
export const deleteProduct   = (id)        => API.delete(`/api/vendor/products/${id}/delete/`)
export const toggleVisibility = (id, data) => API.patch(`/api/vendor/products/${id}/visibility/`, data)
export const setDiscount     = (id, data)  => API.patch(`/api/vendor/products/${id}/discount/`, data)
export const toggleFeatured  = (id, data)  => API.patch(`/api/vendor/products/${id}/feature/`, data)
export const reorderProducts = (data)      => API.patch('/api/vendor/products/reorder/', data)

// Orders
export const getMyOrders     = (status)    => API.get(`/api/vendor/orders/?status=${status || ''}`)
export const updateOrderStatus = (id, data)=> API.patch(`/api/vendor/orders/${id}/status/`, data)

// Maintenance
export const getMyFees       = ()          => API.get('/api/vendor/maintenance/')
export const submitFeePay    = (id, formData) => API.post(
  `/api/vendor/maintenance/${id}/pay/`, formData,
  { headers: { 'Content-Type': 'multipart/form-data' } }
)

// Public store data (no auth)
export const getStoreSite    = (slug)      => API.get(`/api/site/${slug}/`)
export const getStoreProducts = (slug, params) => API.get(`/api/site/${slug}/products/`, { params })
export const getStoreAbout   = (slug)      => API.get(`/api/site/${slug}/about/`)
