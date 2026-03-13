const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let payload = null;
    let detail = `API request failed: ${res.status}`;
    try {
      payload = await res.json();
      detail = payload.detail || JSON.stringify(payload);
    } catch {
      // use fallback detail
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

export const api = {
  // Products
  getProducts: () => request('/products/'),
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
