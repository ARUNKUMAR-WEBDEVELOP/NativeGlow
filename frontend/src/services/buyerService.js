import API from '../utils/axiosConfig'

export const googleLogin     = (data)         => API.post('/api/buyers/google-login/', data)
export const getBuyerMe      = ()             => API.get('/api/buyers/me/')
export const updateBuyerMe   = (data)         => API.put('/api/buyers/me/update/', data)
export const getBuyerOrders  = ()             => API.get('/api/buyers/orders/')
export const placeOrder      = (data)         => API.post('/api/order/place/', data)
export const trackByPhone    = (phone)        => API.get(`/api/order/track/?phone=${phone}`)
export const trackByCode     = (code)         => API.get(`/api/order/track/${code}/`)
export const confirmDelivery = (code, data)   => API.patch(`/api/order/${code}/buyer-confirm/`, data)
