import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SiteLayout from './layout/SiteLayout';
import AdminLayout from './layout/AdminLayout';
import HomePage from './pages/buyer/HomePage';
import ProductDetailPage from './pages/buyer/ProductDetailPage';
import VendorApplyPage from './pages/vendor/VendorApplyPage';
import VendorRegister from './pages/vendor/VendorRegister';
import VendorLogin from './pages/vendor/VendorLogin';
import VendorActivate from './pages/vendor/VendorActivate';
import VendorSetupWizard from './pages/vendor/VendorSetupWizard';
import VendorApprovalPending from './pages/vendor/VendorApprovalPending';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorMaintenance from './pages/vendor/VendorMaintenance';
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
import VendorProtectedRoute from './components/VendorProtectedRoute';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import OrderTrackPage from './pages/buyer/OrderTrackPage';
import TermsOfServicePage from './pages/terms/TermsOfServicePage';
import VendorSiteLayout from './pages/vendorsite/VendorSiteLayout';
import VendorSiteHome from './pages/vendorsite/VendorSiteHome';
import VendorSiteProducts from './pages/vendorsite/VendorSiteProducts';
import VendorSiteAbout from './pages/vendorsite/VendorSiteAbout';
import VendorSiteTrack from './pages/vendorsite/VendorSiteTrack';
import VendorSiteLogin from './pages/vendorsite/VendorSiteLogin';
import BuyerOrders from './pages/vendorsite/BuyerOrders';

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

function VendorDashboardTabRedirect({ tab }) {
  const target = `/dashboard?tab=${tab}`;
  return <Navigate to={target} replace />;
}

function LegacySiteRedirect() {
  const { vendor_slug: vendorSlug, '*': rest = '' } = useParams();
  const suffix = rest ? `/${rest}` : '';
  return <Navigate to={`/store/${vendorSlug}${suffix}`} replace />;
}

function LegacyProductRedirect() {
  const {
    slug,
    vendor_slug: vendorSlug,
    productId,
    product_id: productIdLegacy,
  } = useParams();

  const resolvedSlug = slug || vendorSlug;
  const resolvedProductId = productId || productIdLegacy;

  if (!resolvedSlug || !resolvedProductId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/store/${resolvedSlug}/product/${resolvedProductId}`} replace />;
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

  function onLogin(newTokens, profile = null) {
    setTokens(newTokens);
    localStorage.setItem('nativeglow_tokens', JSON.stringify(newTokens));
    if (profile) {
      localStorage.setItem('nativeglow_google_profile', JSON.stringify(profile));
    }
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
    localStorage.removeItem('nativeglow_google_profile');
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
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/store/:slug/*" element={<VendorSiteLayout />}>
          <Route index element={<VendorSiteHome />} />
          <Route path="products" element={<VendorSiteProducts />} />
          <Route path="about" element={<VendorSiteAbout />} />
          <Route path="track" element={<VendorSiteTrack />} />
          <Route path="login" element={<VendorSiteLogin />} />
          <Route path="my-orders" element={<BuyerOrders />} />
        </Route>
        <Route path="/site/:vendor_slug/vendor/dashboard/setup" element={<Navigate to="/dashboard/setup" replace />} />
        <Route path="/site/:vendor_slug/vendor/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/site/:vendor_slug/vendor/dashboard/products" element={<Navigate to="/dashboard?tab=products" replace />} />
        <Route path="/site/:vendor_slug/vendor/dashboard/orders" element={<Navigate to="/dashboard?tab=orders" replace />} />
        <Route path="/site/:vendor_slug/vendor/dashboard/maintenance" element={<Navigate to="/dashboard/maintenance" replace />} />
        <Route path="/site/:vendor_slug/vendor/dashboard/products/new" element={<Navigate to="/dashboard?tab=add" replace />} />
        <Route path="/site/:vendor_slug/*" element={<LegacySiteRedirect />} />
        <Route element={<SiteLayout isAuthenticated={Boolean(tokens?.access)} onLogout={onLogout} />}>
          <Route path="/" element={<HomePage onAddToCart={onAddToCart} isAuthenticated={Boolean(tokens?.access)} />} />
          <Route
            path="/products/:slug"
            element={<ProductDetailPage onAddToCart={onAddToCart} isAuthenticated={Boolean(tokens?.access)} />}
          />
          <Route
            path="/store/:slug/products/:productId"
            element={<LegacyProductRedirect />}
          />
          <Route
            path="/store/:slug/product/:productId"
            element={<ProductDetailPage />}
          />
          <Route
            path="/store/:vendor_slug/products/:product_id"
            element={<LegacyProductRedirect />}
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
          <Route path="/vendor/activate" element={<VendorActivate />} />
          <Route path="/vendor/pending-approval" element={<VendorApprovalPending />} />
          <Route
            path="/dashboard/setup"
            element={
              <VendorProtectedRoute>
                <VendorSetupWizard />
              </VendorProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <VendorProtectedRoute>
                <VendorDashboard />
              </VendorProtectedRoute>
            }
          />
          <Route
            path="/dashboard/products"
            element={
              <VendorProtectedRoute>
                <VendorDashboardTabRedirect tab="products" />
              </VendorProtectedRoute>
            }
          />
          <Route
            path="/dashboard/orders"
            element={
              <VendorProtectedRoute>
                <VendorDashboardTabRedirect tab="orders" />
              </VendorProtectedRoute>
            }
          />
          <Route
            path="/dashboard/maintenance"
            element={
              <VendorProtectedRoute>
                <VendorMaintenance />
              </VendorProtectedRoute>
            }
          />
          <Route
            path="/dashboard/products/new"
            element={
              <VendorProtectedRoute>
                <VendorDashboardTabRedirect tab="add" />
              </VendorProtectedRoute>
            }
          />
          <Route
            path="/vendor/dashboard/setup"
            element={<Navigate to="/dashboard/setup" replace />}
          />
          <Route path="/vendor/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/vendor/dashboard/products" element={<Navigate to="/dashboard?tab=products" replace />} />
          <Route path="/vendor/dashboard/orders" element={<Navigate to="/dashboard?tab=orders" replace />} />
          <Route path="/vendor/dashboard/maintenance" element={<Navigate to="/dashboard/maintenance" replace />} />
          <Route path="/vendor/dashboard/products/new" element={<Navigate to="/dashboard?tab=add" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/store/:slug" element={<VendorStorePage />} />
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
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
