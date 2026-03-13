import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './layout/SiteLayout';
import HomePage from './pages/home/HomePage';
import ProductDetailPage from './pages/product/ProductDetailPage';
import VendorApplyPage from './pages/vendor/VendorApplyPage';
import LoginPage from './pages/auth/LoginPage';
import AboutPage from './pages/about/AboutPage';
import ContactPage from './pages/contact/ContactPage';
import FAQPage from './pages/faq/FAQPage';
import ShippingPage from './pages/shipping/ShippingPage';
import ReturnsPage from './pages/returns/ReturnsPage';
import PrivacyPolicyPage from './pages/privacy/PrivacyPolicyPage';
import TermsOfServicePage from './pages/terms/TermsOfServicePage';
import StickyCartBar from './components/StickyCartBar';
import ProtectedRoute from './components/ProtectedRoute';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [latestCartItem, setLatestCartItem] = useState(null);
  const [email, setEmail] = useState('');
  const [isEmailPopupOpen, setEmailPopupOpen] = useState(false);
  const [emailCaptured, setEmailCaptured] = useState(false);
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

  useEffect(() => {
    const popupTimer = setTimeout(() => {
      setEmailPopupOpen(true);
    }, 2200);

    return () => {
      clearTimeout(popupTimer);
    };
  }, []);

  function onAddToCart(product) {
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

  function onCaptureEmail(e) {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }
    setEmailCaptured(true);
    setEmailPopupOpen(false);
    setEmail('');
  }

  function onLogin(newTokens) {
    setTokens(newTokens);
    localStorage.setItem('nativeglow_tokens', JSON.stringify(newTokens));
  }

  function onTokensUpdate(nextTokens) {
    setTokens(nextTokens);
    localStorage.setItem('nativeglow_tokens', JSON.stringify(nextTokens));
  }

  function onLogout() {
    setTokens(null);
    localStorage.removeItem('nativeglow_tokens');
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

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<SiteLayout isAuthenticated={Boolean(tokens?.access)} onLogout={onLogout} />}>
          <Route path="/" element={<HomePage onAddToCart={onAddToCart} />} />
          <Route
            path="/products/:slug"
            element={<ProductDetailPage onAddToCart={onAddToCart} />}
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                onIncreaseQty={onIncreaseQty}
                onDecreaseQty={onDecreaseQty}
                onRemoveItem={onRemoveItem}
              />
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
          <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {authMessage ? (
        <div className="fixed right-4 top-4 z-[60] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow">
          <div className="flex items-center gap-3">
            <span>{authMessage}</span>
            <button type="button" onClick={() => setAuthMessage('')} className="rounded-md border border-amber-300 px-2 py-1 text-xs">Dismiss</button>
          </div>
        </div>
      ) : null}

      {isEmailPopupOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-display text-3xl text-zinc-900">Get Launch Offers</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Subscribe to receive discounts, shipping deals, and new arrivals.
            </p>
            <form onSubmit={onCaptureEmail} className="mt-4 space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  Subscribe
                </button>
                <button
                  type="button"
                  onClick={() => setEmailPopupOpen(false)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>
            </form>
            {emailCaptured ? (
              <p className="mt-2 text-xs text-emerald-700">
                Email captured. Welcome to NativeGlow updates.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <StickyCartBar totalItems={totalItems} latestCartItem={latestCartItem} />
    </BrowserRouter>
  );
}

export default App;
