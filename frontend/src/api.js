const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV
    ? 'http://127.0.0.1:8000/api'
    : 'https://nativeglow.onrender.com/api');

function getHeaders(options = {}) {
  return {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    let payload = null;
    let detail = `API request failed: ${res.status}`;
    try {
      payload = await res.json();
      detail = payload.detail || JSON.stringify(payload);
    } catch {
      try {
        const text = await res.text();
        if (text) {
          const condensed = text.replace(/\s+/g, ' ').trim().slice(0, 180);
          detail = `${detail} ${condensed}`;
        }
      } catch {
        // keep default detail
      }
    }
    const error = new Error(detail);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

async function requestByUrl(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: getHeaders(options),
  });
  return handleResponse(res);
}

function getAlternateBase() {
  return API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : null;
}

async function request(path, options = {}) {
  return requestByUrl(`${API_BASE}${path}`, options);
}

async function requestWithBaseFallback(path, options = {}) {
  try {
    return await request(path, options);
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
    const alternateBase = getAlternateBase();
    if (!alternateBase) {
      throw error;
    }
    return requestByUrl(`${alternateBase}${path}`, options);
  }
}

async function requestWithFallback(paths, options = {}) {
  let lastError = null;
  for (const path of paths) {
    try {
      return await requestWithBaseFallback(path, options);
    } catch (error) {
      lastError = error;
      if (error?.status !== 404) {
        throw error;
      }
    }
  }
  throw lastError || new Error('API request failed');
}

export const api = {
  // Backward compatibility for existing admin pages
  request: (path, options = {}) => adminRequest(path, options),

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return request(query ? `/products/?${query}` : '/products/');
  },
  getCategories: () => request('/products/categories/'),
  getFeaturedProducts: () => request('/products/featured/'),
  getBestSellers: () => request('/products/best-sellers/'),
  getNewArrivals: () => request('/products/new-arrivals/'),
  getProductBySlug: (slug) => request(`/products/${slug}/`),

  // Vendors
  getVendors: () => request('/vendors/'),
  applyVendor: async (data, tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/vendors/apply/', {
      method: 'POST',
      body: JSON.stringify(data),
    }, tokens, onTokensUpdate, onAuthExpired);
  },
  getMyVendorApplication: async (tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/vendors/my-application/', {}, tokens, onTokensUpdate, onAuthExpired);
  },
  getMyVendorAnalytics: async (tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/vendors/my-analytics/', {}, tokens, onTokensUpdate, onAuthExpired);
  },
  vendorRegister: (data) =>
    requestWithBaseFallback('/vendor/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  vendorLogin: (data) =>
    requestWithFallback(['/vendor/login/', '/vendors/login/'], {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin
  adminLogin: (data) => request('/admin/login/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAdminProfile: async (tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/admin/me/', {}, tokens, onTokensUpdate, onAuthExpired);
  },
  getAdminDashboardStats: () => adminRequest('/admin/dashboard/stats/'),
  getAdminMonthlySales: () => adminRequest('/admin/sales/monthly/'),
  getAdminVendors: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return adminRequest(query ? `/admin/vendors/?${query}` : '/admin/vendors/');
  },
  getAdminProducts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return adminRequest(query ? `/admin/products/?${query}` : '/admin/products/');
  },
  getAdminProductDetail: (productId) => adminRequest(`/admin/products/${productId}/`),
  approveAdminProduct: (productId, payload) =>
    adminRequest(`/admin/products/${productId}/approve/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getAdminOrders: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return adminRequest(query ? `/admin/orders/?${query}` : '/admin/orders/');
  },
  getAdminOrderDetail: (orderId) => adminRequest(`/admin/orders/${orderId}/`),
  getAdminMaintenanceFees: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return adminRequest(query ? `/admin/maintenance/?${query}` : '/admin/maintenance/');
  },
  getAdminMaintenanceSummary: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return adminRequest(query ? `/admin/maintenance/summary/?${query}` : '/admin/maintenance/summary/');
  },
  generateAdminMaintenanceFees: (payload) =>
    adminRequest('/admin/maintenance/generate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markAdminMaintenancePaid: (feeId, payload) =>
    adminRequest(`/admin/maintenance/${feeId}/mark-paid/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Auth
  register: (data) => request('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  login: (data) => request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  googleLogin: (idToken) => request('/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  }),
  requestOtp: (data) => request('/auth/otp/request/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  verifyOtp: (data) => request('/auth/otp/verify/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  refresh: (refreshToken) => request('/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh: refreshToken }),
  }),
  getProfile: async (tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/auth/profile/', {}, tokens, onTokensUpdate, onAuthExpired);
  },

  // Orders
  createOrder: async (data, tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    }, tokens, onTokensUpdate, onAuthExpired);
  },
  createPaymentIntent: async (orderId, tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/orders/payment-intent/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }, tokens, onTokensUpdate, onAuthExpired);
  },
  getMyOrders: async (tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest('/orders/my-orders/', {}, tokens, onTokensUpdate, onAuthExpired);
  },
  getOrderDetail: async (orderId, tokens, onTokensUpdate, onAuthExpired) => {
    return authRequest(`/orders/my-orders/${orderId}/`, {}, tokens, onTokensUpdate, onAuthExpired);
  },

  // Public Store APIs (no authentication required)
  getStoreCategories: () =>
    requestWithFallback(['/products/categories/', '/products/store/categories/']),
  getStoreFeaturedProducts: () =>
    requestWithFallback(['/products/featured/', '/products/store/featured/']),
  getStoreSearch: (query, category, city) => {
    const qs = new URLSearchParams();
    if (query) qs.set('q', query);
    if (category) qs.set('category', category);
    if (city) qs.set('city', city);
    const queryString = qs.toString();
    return request(queryString ? `/products/store/search/?${queryString}` : '/products/store/search/');
  },
  getVendorStore: (vendorSlug) => request(`/products/store/${vendorSlug}/`),
  getProductDetail: (vendorSlug, productId) => request(`/products/store/${vendorSlug}/products/${productId}/`),

  // Buyer APIs (vendor-store scoped)
  buyerGoogleLogin: (data) => request('/buyers/google-login/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getBuyerProfile: (buyerToken) =>
    request('/buyers/me/', {
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
    }),
  updateBuyerProfile: (buyerToken, data) =>
    request('/buyers/me/update/', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify(data),
    }),
  getBuyerOrders: (buyerToken) =>
    request('/buyers/orders/', {
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
    }),
  confirmBuyerDelivery: (orderCode, payload, buyerToken) =>
    requestWithFallback([
      `/order/${orderCode}/buyer-confirm/`,
      `/orders/${orderCode}/buyer-confirm/`,
    ], {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify(payload || {}),
    }),

  // Public Order APIs (no authentication required)
  placeOrder: (data, buyerToken = null) => requestWithFallback(['/order/place/', '/orders/place/'], {
    method: 'POST',
    headers: buyerToken
      ? {
          Authorization: `Bearer ${buyerToken}`,
        }
      : {},
    body: JSON.stringify(data),
  }),
  trackOrderByPhone: (phone) => request(`/orders/track/?phone=${encodeURIComponent(phone)}`),
  trackOrderByCode: (orderCode) => request(`/orders/track/${orderCode}/`),
};

async function authRequest(path, options, tokens, onTokensUpdate, onAuthExpired) {
  if (!tokens?.access) {
    throw new Error('Authentication required.');
  }

  try {
    return await request(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${tokens.access}`,
      },
    });
  } catch (error) {
    if (error.status !== 401 || !tokens?.refresh) {
      throw error;
    }

    let refreshed;
    try {
      refreshed = await api.refresh(tokens.refresh);
    } catch {
      if (onAuthExpired) {
        onAuthExpired();
      }
      throw new Error('Session expired. Please login again.');
    }
    const nextTokens = {
      ...tokens,
      access: refreshed.access,
      refresh: refreshed.refresh || tokens.refresh,
    };

    if (onTokensUpdate) {
      onTokensUpdate(nextTokens);
    }

    return request(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${nextTokens.access}`,
      },
    });
  }
}

function getAdminTokens() {
  const access = localStorage.getItem('admin_token');
  const refresh = localStorage.getItem('admin_refresh_token');
  if (!access) {
    return null;
  }
  return { access, refresh };
}

async function adminRequest(path, options = {}) {
  const adminTokens = getAdminTokens();
  if (!adminTokens?.access) {
    throw new Error('Admin authentication required.');
  }

  return request(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${adminTokens.access}`,
    },
  });
}

export default api;
