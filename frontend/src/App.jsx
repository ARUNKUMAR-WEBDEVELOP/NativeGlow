import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './layout/SiteLayout';
import AdminLayout from './layout/AdminLayout';
import HomePage from './pages/buyer/HomePage';
import ProductDetailPage from './pages/buyer/ProductDetailPage';
import VendorApplyPage from './pages/vendor/VendorApplyPage';
import VendorRegister from './pages/vendor/VendorRegister';
import VendorLogin from './pages/vendor/VendorLogin';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorMaintenance from './pages/vendor/VendorMaintenance';
import AddProduct from './pages/vendor/AddProduct';
import VendorStorePage from './pages/buyer/VendorStorePage';
import LoginPage from './pages/auth/LoginPage';
import AboutUsPage from './pages/AboutUsPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVendors from './pages/admin/AdminVendors';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import StickyCartBar from './components/StickyCartBar';
import ProtectedRoute from './components/ProtectedRoute';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import OrderTrackPage from './pages/buyer/OrderTrackPage';
import TermsOfServicePage from './pages/terms/TermsOfServicePage';

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function getCartStorageKey(tokens) {
  const payload = parseJwtPayload(tokens?.access);
  const userId = payload?.user_id;
  return userId ? `nativeglow_cart_${userId}` : null;
}

function App() {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedTokens = JSON.parse(localStorage.getItem('nativeglow_tokens')) || null;
      const cartKey = getCartStorageKey(storedTokens);
      if (!cartKey) {
        return [];
      }
      return JSON.parse(localStorage.getItem(cartKey)) || [];
    } catch {
      return [];
    }
  });
  const [latestCartItem, setLatestCartItem] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [tokens, setTokens] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_tokens')) || null;
    } catch {
      return null;
    }
  });

  const totalItems = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.qty, 0),
    [cartItems]
  );

  function onAddToCart(product) {
    if (!tokens?.access) {
      setAuthMessage('Please login to add products to cart.');
      return;
    }

    setLatestCartItem(product);
    setCartItems((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (found) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function onLogin(newTokens) {
    setTokens(newTokens);
    localStorage.setItem('nativeglow_tokens', JSON.stringify(newTokens));
    const cartKey = getCartStorageKey(newTokens);
    if (cartKey) {
      try {
        const savedCart = JSON.parse(localStorage.getItem(cartKey)) || [];
        setCartItems(savedCart);
      } catch {
        setCartItems([]);
      }
    }
    setAuthMessage('');
  }

  function onTokensUpdate(nextTokens) {
    setTokens(nextTokens);
    localStorage.setItem('nativeglow_tokens', JSON.stringify(nextTokens));

    const cartKey = getCartStorageKey(nextTokens);
    if (cartKey) {
      try {
        localStorage.setItem(cartKey, JSON.stringify(cartItems));
      } catch {
        // ignore storage write errors
      }
    }
  }

  function onLogout() {
    setTokens(null);
    localStorage.removeItem('nativeglow_tokens');
    setCartItems([]);
    setLatestCartItem(null);
  }

  function onAuthExpired() {
    onLogout();
    setAuthMessage('Session expired. Login again to continue checkout and orders.');
  }

  function onIncreaseQty(productId) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, qty: item.qty + 1 } : item
      )
    );
  }

  function onDecreaseQty(productId) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(item.qty - 1, 0) } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function onRemoveItem(productId) {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  }

  const cartStorageKey = getCartStorageKey(tokens);

  useEffect(() => {
    if (!cartStorageKey) {
      return;
    }
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
    } catch {
      // ignore storage write errors
    }
  }, [cartItems, cartStorageKey]);

  return (
    <HashRouter>
      <Routes>
        <Route element={<SiteLayout isAuthenticated={Boolean(tokens?.access)} onLogout={onLogout} />}>
          <Route path="/" element={<HomePage onAddToCart={onAddToCart} isAuthenticated={Boolean(tokens?.access)} />} />
          <Route
            path="/products/:slug"
            element={<ProductDetailPage onAddToCart={onAddToCart} isAuthenticated={Boolean(tokens?.access)} />}
          />
          <Route
            path="/store/:vendor_slug/products/:product_id"
            element={<ProductDetailPage />}
          />
          <Route
            path="/store/:vendor_slug/product/:product_id"
            element={<ProductDetailPage />}
          />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute isAuthenticated={Boolean(tokens?.access)}>
                <CartPage
                  cartItems={cartItems}
                  onIncreaseQty={onIncreaseQty}
                  onDecreaseQty={onDecreaseQty}
                  onRemoveItem={onRemoveItem}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute isAuthenticated={Boolean(tokens?.access)}>
                <CheckoutPage
                  cartItems={cartItems}
                  tokens={tokens}
                  onTokensUpdate={onTokensUpdate}
                  onAuthExpired={onAuthExpired}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute isAuthenticated={Boolean(tokens?.access)}>
                <MyOrdersPage
                  tokens={tokens}
                  onTokensUpdate={onTokensUpdate}
                  onAuthExpired={onAuthExpired}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/apply"
            element={
              <VendorApplyPage
                tokens={tokens}
                onTokensUpdate={onTokensUpdate}
                onAuthExpired={onAuthExpired}
              />
            }
          />
          <Route path="/vendor/register" element={<VendorRegister />} />
          <Route path="/vendor/login" element={<VendorLogin />} />
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/dashboard/products" element={<VendorProducts />} />
          <Route path="/vendor/dashboard/orders" element={<VendorOrders />} />
          <Route path="/vendor/dashboard/maintenance" element={<VendorMaintenance />} />
          <Route path="/vendor/dashboard/products/new" element={<AddProduct />} />
          <Route path="/store/:vendor_slug" element={<VendorStorePage />} />
          <Route path="/track" element={<OrderTrackPage />} />
          <Route path="/track/:order_code" element={<OrderTrackPage />} />
          <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <AdminLayout>
              <AdminVendors />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminLayout>
              <AdminProducts />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminLayout>
              <AdminOrders />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/maintenance"
          element={
            <AdminLayout>
              <AdminMaintenance />
            </AdminLayout>
          }
        />
      </Routes>

      {authMessage ? (
        <div className="fixed right-4 top-4 z-[60] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow">
          <div className="flex items-center gap-3">
            <span>{authMessage}</span>
            <button type="button" onClick={() => setAuthMessage('')} className="rounded-md border border-amber-300 px-2 py-1 text-xs">Dismiss</button>
          </div>
        </div>
      ) : null}

      <StickyCartBar totalItems={totalItems} latestCartItem={latestCartItem} />
    </HashRouter>
  );
}

export default App;
