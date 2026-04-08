import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { theme } from '../../styles/designSystem';
import Button from '../../components/common/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import platformContent from '../../content/platformContent';
import ProductForm from '../../components/vendor/ProductForm';
import ProductList from '../../components/vendor/ProductList';
import OrderList from '../../components/vendor/OrderList';
import { resolveImageUrl } from '../../utils/imageUrl';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function getApiBaseCandidates() {
  const candidates = [API_BASE];
  if (API_BASE.endsWith('/api')) {
    candidates.push(API_BASE.slice(0, -4));
  }
  return [...new Set(candidates)].filter(Boolean);
}

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
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function buildLast7DayChart(orders) {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      orders: 0,
    });
  }

  const indexByKey = new Map(days.map((item, idx) => [item.key, idx]));
  orders.forEach((order) => {
    const key = String(order?.created_at || '').slice(0, 10);
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      days[idx].orders += 1;
    }
  });

  return days.map(({ day, orders }) => ({ day, orders }));
}

function resolveVendorSlug({ routeVendorSlug, vendorData, tokenPayload, vendorSession, storedVendorSlug }) {
  return (
    routeVendorSlug ||
    vendorData?.vendor_slug ||
    tokenPayload?.vendor_slug ||
    tokenPayload?.vendor?.vendor_slug ||
    vendorSession?.vendor?.vendor_slug ||
    vendorSession?.vendor_slug ||
    storedVendorSlug ||
    ''
  );
}

function getBrandInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

async function uploadBrandAssetThroughBackend(token, file, folder) {
  const bases = getApiBaseCandidates();
  let lastError = null;

  for (const base of bases) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch(`${base}/vendor/brand-assets/upload/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          return data.url;
        }
        throw new Error('Upload succeeded but no URL was returned.');
      }

      let detail = `Upload failed (${res.status})`;
      try {
        const data = await res.json();
        detail = data?.detail || data?.error || JSON.stringify(data);
      } catch {
        // keep fallback detail
      }

      throw new Error(detail);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not upload brand asset.');
}

async function updateVendorProfileWithFallback(token, payload) {
  const bases = getApiBaseCandidates();
  let lastError = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}/vendor/me/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return res.json();
      }

      let detail = `Failed to save brand profile (${res.status})`;
      try {
        const data = await res.json();
        detail = data?.detail || data?.error || JSON.stringify(data);
      } catch {
        // keep fallback detail
      }

      throw new Error(detail);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not update vendor profile.');
}

// Sidebar component
function Sidebar({ isOpen, onClose, vendorData, activeTab, onSelectTab, onOpenStore, onOpenStoreAbout }) {
  const navigate = useNavigate();
  const logoUrl = resolveImageUrl(vendorData?.site_logo);
  const brandInitials = getBrandInitials(vendorData?.business_name);
  const navItems = [
    { label: 'Dashboard', tab: 'dashboard' },
    { label: 'Brand Profile', tab: 'brand' },
    { label: 'My Products', tab: 'products' },
    { label: 'Add Product', tab: 'add' },
    { label: 'My Orders', tab: 'orders', badge: vendorData?.pending_orders || 0 },
    { label: 'View My Store', path: '#', external: true },
    { label: 'Store About Page', path: '#', externalAbout: true },
  ];

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    navigate('/vendor/login');
  };

  const handleNavigation = (item) => {
    if (item.external) {
      onOpenStore();
    } else if (item.externalAbout) {
      onOpenStoreAbout();
    } else if (item.tab) {
      onSelectTab(item.tab);
      onClose();
    } else {
      navigate(item.path);
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-40 h-screen w-64 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%)`,
        }}
      >
        {/* Close button (mobile only) */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl text-white lg:hidden"
        >
          x
        </button>

        {/* Logo & Business Name */}
        <div className="space-y-3 border-b" style={{ borderColor: `${theme.colors.primaryGlow}30`, padding: '24px 20px' }}>
          <div
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl"
            style={{ backgroundColor: theme.colors.primaryGlow }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={vendorData?.business_name || 'Brand'} className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold text-white">{brandInitials}</span>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Brand</p>
            <h2 className="font-semibold text-white" style={{ fontFamily: theme.fonts.heading }}>
              {vendorData?.business_name || 'Your Store'}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: '#10b981' }}
              />
              <span className="text-xs text-white/90">Active Store</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-4 py-6">
          {navItems.map((item) => (
            <button
              key={item.path || item.tab}
              onClick={() => handleNavigation(item)}
              className={`relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                activeTab === item.tab
                  ? 'bg-white/20 text-white'
                  : 'text-white/90 hover:text-white'
              }`}
              style={{ hover: { backgroundColor: `${theme.colors.primaryGlow}20` } }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = `${theme.colors.primaryGlow}20`)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span
                  className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: theme.colors.danger }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-6 left-4 right-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-2.5 font-semibold text-white transition-all"
            style={{
              backgroundColor: `${theme.colors.primaryGlow}40`,
              border: `2px solid ${theme.colors.primaryGlow}`,
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = `${theme.colors.primaryGlow}60`)}
            onMouseLeave={(e) => (e.target.style.backgroundColor = `${theme.colors.primaryGlow}40`)}
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

// Header component
function Header({ pageTitle, vendorData, onMenuToggle, onOpenStoreAbout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const logoUrl = resolveImageUrl(vendorData?.site_logo);
  const brandInitials = getBrandInitials(vendorData?.business_name);

  return (
    <div
      className="sticky top-0 z-20 border-b px-4 py-4 sm:px-6 lg:px-8 bg-white"
      style={{ borderColor: `${theme.colors.muted}20` }}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Menu toggle & title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden text-2xl"
          >
            ☰
          </button>
          <h1
            className="text-2xl font-bold"
            style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
          >
            {pageTitle}
          </h1>
        </div>

        {/* Right side: Notification + Avatar */}
        <div className="flex items-center gap-4">
          <button
            className="relative p-2 rounded-lg transition-all text-xl"
            style={{ backgroundColor: `${theme.colors.muted}10` }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = `${theme.colors.muted}20`)}
            onMouseLeave={(e) => (e.target.style.backgroundColor = `${theme.colors.muted}10`)}
            aria-label="Notifications"
          >
            N
            <span
              className="absolute top-1 right-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.colors.danger }}
            />
          </button>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
            style={{ backgroundColor: `${theme.colors.primary}10` }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = `${theme.colors.primary}20`)}
            onMouseLeave={(e) => (e.target.style.backgroundColor = `${theme.colors.primary}10`)}
            onClick={onOpenStoreAbout}
            title="Open Store About Page"
          >
            <div
              className="h-8 w-8 overflow-hidden rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: theme.colors.primaryGlow }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={vendorData?.business_name || 'Brand'} className="h-full w-full object-cover" />
              ) : (
                brandInitials
              )}
            </div>
            <span
              className="text-sm font-semibold hidden sm:inline"
              style={{ color: theme.colors.charcoal }}
            >
              {vendorData?.business_name || 'Vendor'}
            </span>
            <span className="text-lg">▼</span>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search products, orders, customers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded-lg border-2 transition-all focus:outline-none"
        style={{
          borderColor: `${theme.colors.muted}20`,
          color: theme.colors.charcoal,
        }}
        onFocus={(e) => (e.target.style.borderColor = theme.colors.primaryGlow)}
        onBlur={(e) => (e.target.style.borderColor = `${theme.colors.muted}20`)}
      />
    </div>
  );
}

// Stats card component
function StatsCard({ label, value }) {
  return (
    <div
      className="card-3d group rounded-2xl border p-6 transition-all duration-300"
      style={{
        borderColor: `${theme.colors.primary}20`,
        backgroundColor: theme.colors.cream,
      }}
    >
      <div className="space-y-2">
        <p
          className="text-sm font-semibold"
          style={{ color: theme.colors.muted }}
        >
          {label}
        </p>
        <p
          className="text-4xl font-bold"
          style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// Main dashboard component
export default function VendorDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vendor_slug: routeVendorSlug } = useParams();
  const { brand } = platformContent;
  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);
  const tokenPayload = useMemo(() => parseJwtPayload(vendorSession?.access), [vendorSession?.access]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendorData, setVendorData] = useState(() => ({
    business_name:
      vendorSession?.vendor?.business_name ||
      vendorSession?.business_name ||
      vendorSession?.vendor?.name ||
      'Your Store',
    vendor_slug:
      routeVendorSlug ||
      tokenPayload?.vendor_slug ||
      vendorSession?.vendor?.vendor_slug ||
      vendorSession?.vendor_slug ||
      '',
    site_logo: '',
    about_vendor: '',
  }));
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [maintenanceDue, setMaintenanceDue] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [brandForm, setBrandForm] = useState({
    about_vendor: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [brandSaving, setBrandSaving] = useState(false);

  const storedVendorSlug = localStorage.getItem('vendor_slug') || '';
  const resolvedVendorSlug = resolveVendorSlug({
    routeVendorSlug,
    vendorData,
    tokenPayload,
    vendorSession,
    storedVendorSlug,
  });

  const setTabAndUrl = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search || '');
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const tabFromQuery = params.get('tab');
    if (tabFromQuery && ['dashboard', 'brand', 'products', 'add', 'orders'].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [location.search]);

  useEffect(() => {
    setBrandForm({
      about_vendor: vendorData?.about_vendor || '',
    });
    setLogoFile(null);
  }, [
    vendorData?.about_vendor,
  ]);

  // Keep vendor data scoped to logged-in session.
  useEffect(() => {
    if (!routeVendorSlug || !resolvedVendorSlug) {
      return;
    }
    if (routeVendorSlug !== resolvedVendorSlug) {
      navigate('/dashboard', { replace: true });
    }
  }, [routeVendorSlug, resolvedVendorSlug, navigate]);
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = vendorSession?.access || localStorage.getItem('vendor_token');
        if (!token) {
          navigate('/vendor/login');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const [productsRes, ordersRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/vendor/products/`, { headers }),
          fetch(`${API_BASE}/vendor/orders/`, { headers }),
          fetch(`${API_BASE}/vendor/me/`, { headers }),
        ]);

        if (productsRes.status === 401 || ordersRes.status === 401 || profileRes.status === 401) {
          localStorage.removeItem('vendor_token');
          localStorage.removeItem('nativeglow_vendor_tokens');
          navigate('/vendor/login');
          return;
        }

        const products = productsRes.ok ? await productsRes.json() : [];
        const orders = ordersRes.ok ? await ordersRes.json() : [];
        const profile = profileRes.ok ? await profileRes.json() : null;
        const productList = Array.isArray(products) ? products : [];
        const orderList = Array.isArray(orders) ? orders : [];

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const todayKey = now.toISOString().slice(0, 10);

        const ordersThisMonth = orderList.filter((o) => {
          const d = new Date(o?.created_at);
          return !Number.isNaN(d.getTime()) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });

        const pendingOrders = orderList.filter((o) => String(o?.order_status || '').toLowerCase() === 'pending').length;
        const deliveredOrders = orderList.filter((o) => String(o?.order_status || '').toLowerCase() === 'delivered').length;
        const totalOrdersToday = orderList.filter((o) => String(o?.created_at || '').slice(0, 10) === todayKey).length;

        const sortedRecentOrders = [...orderList]
          .sort((a, b) => new Date(b?.created_at).getTime() - new Date(a?.created_at).getTime())
          .slice(0, 8);

        const lowStock = productList
          .filter((p) => Number(p?.available_quantity || 0) < 5)
          .slice(0, 6)
          .map((p) => ({
            name: p?.title || p?.name || 'Product',
            quantity: Number(p?.available_quantity || 0),
          }));

        setVendorData((prev) => ({
          ...prev,
          business_name:
            profile?.business_name ||
            vendorSession?.vendor?.business_name ||
            vendorSession?.business_name ||
            prev?.business_name ||
            'Your Store',
          vendor_slug:
            profile?.vendor_slug ||
            routeVendorSlug ||
            tokenPayload?.vendor_slug ||
            vendorSession?.vendor?.vendor_slug ||
            vendorSession?.vendor_slug ||
            prev?.vendor_slug ||
            '',
          site_theme: profile?.site_theme || prev?.site_theme || 'default',
          site_logo: profile?.site_logo || prev?.site_logo || '',
          site_banner_image: profile?.site_banner_image || prev?.site_banner_image || '',
          about_vendor: profile?.about_vendor || prev?.about_vendor || '',
          youtube_url: profile?.youtube_url || prev?.youtube_url || '',
          instagram_url: profile?.instagram_url || prev?.instagram_url || '',
          whatsapp_display: profile?.whatsapp_display !== false,
        }));

        setStats({
          total_products: productList.length,
          orders_this_month: ordersThisMonth.length,
          pending_orders: pendingOrders,
          delivered_orders: deliveredOrders,
          total_orders_today: totalOrdersToday,
        });
        setChartData(buildLast7DayChart(orderList));
        setRecentOrders(sortedRecentOrders);
        setLowStockProducts(lowStock);
        setMaintenanceDue(false);
        setError('');
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate, routeVendorSlug, tokenPayload?.vendor_slug, vendorSession?.access, vendorSession?.business_name, vendorSession?.vendor?.business_name, vendorSession?.vendor?.vendor_slug, vendorSession?.vendor_slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Loading dashboard...</p>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="rounded-lg border p-6 max-w-md text-center"
          style={{
            borderColor: theme.colors.danger,
            backgroundColor: `${theme.colors.danger}10`,
          }}
        >
          <p
            className="font-semibold text-lg"
            style={{ color: theme.colors.danger }}
          >
            Error
          </p>
          <p style={{ color: theme.colors.charcoal }} className="mt-2">
            {error}
          </p>
        </div>
      </div>
    );
  }

  const timeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingOrders = Number(stats?.pending_orders || 0);
  const totalOrdersToday = Number(stats?.total_orders_today || stats?.orders_today || 0);
  const vendorSlug = resolvedVendorSlug;
  const hasStoreSlug = Boolean(vendorSlug);
  const storePath = hasStoreSlug ? `/store/${vendorSlug}` : '';
  const storeUrl = hasStoreSlug ? `${window.location.origin}${storePath}` : '';
  const whatsappShareMessage = `Hi! Check out my natural products store on ${brand.name}.\nBrowse and order directly here:\n${storeUrl}`;

  const welcomeLine2 =
    pendingOrders > 0
      ? `You have ${pendingOrders} order(s) waiting for confirmation`
      : totalOrdersToday > 0
      ? `You received ${totalOrdersToday} order(s) today — great work!`
      : 'Share your store link to start receiving orders today';

  const handleCopyStoreLink = async () => {
    if (!hasStoreSlug || !storeUrl) {
      setToastMessage('Store link not ready yet. Please login again.');
      window.setTimeout(() => setToastMessage(''), 2400);
      return;
    }
    try {
      await navigator.clipboard.writeText(storeUrl);
      setToastMessage('Link copied! Share it on WhatsApp and Instagram');
      window.setTimeout(() => setToastMessage(''), 2400);
    } catch {
      setToastMessage('Could not copy the link. Please copy manually.');
      window.setTimeout(() => setToastMessage(''), 2400);
    }
  };

  const handleShareOnWhatsApp = () => {
    if (!hasStoreSlug) {
      setToastMessage('Store link not ready yet. Please login again.');
      window.setTimeout(() => setToastMessage(''), 2400);
      return;
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenStore = async () => {
    if (!hasStoreSlug) {
      setToastMessage('Store link not ready yet. Please login again.');
      window.setTimeout(() => setToastMessage(''), 2400);
      return;
    }

    try {
      const checkRes = await fetch(`${API_BASE}/site/${vendorSlug}/`);
      if (!checkRes.ok) {
        setToastMessage(`Store is not available yet (status ${checkRes.status}). Please complete vendor setup.`);
        window.setTimeout(() => setToastMessage(''), 3000);
        return;
      }
    } catch {
      setToastMessage('Could not connect to store service. Please try again.');
      window.setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    navigate(storePath, { replace: false });
  };

  const handleOpenStoreAbout = () => {
    if (!hasStoreSlug) {
      setToastMessage('Store link not ready yet. Please login again.');
      window.setTimeout(() => setToastMessage(''), 2400);
      return;
    }
    navigate(`/store/${vendorSlug}/about`, { replace: false });
  };

  const handleSaveBrandProfile = async () => {
    const token = vendorSession?.access || localStorage.getItem('vendor_token');
    if (!token) {
      navigate('/vendor/login');
      return;
    }

    if (String(brandForm.about_vendor || '').length > 500) {
      setToastMessage('Our Story must be 500 characters or less.');
      window.setTimeout(() => setToastMessage(''), 2600);
      return;
    }

    setBrandSaving(true);
    try {
      let nextLogo = vendorData?.site_logo || '';
      const uploadWarnings = [];

      if (logoFile) {
        try {
          nextLogo = await uploadBrandAssetThroughBackend(token, logoFile, 'logos');
        } catch (uploadErr) {
          uploadWarnings.push('Logo upload skipped');
        }
      }

      const payload = {
        site_logo: nextLogo,
        about_vendor: brandForm.about_vendor,
      };

      const updated = await updateVendorProfileWithFallback(token, payload);
      setVendorData((prev) => ({ ...prev, ...updated }));
      setLogoFile(null);
      setToastMessage(
        uploadWarnings.length > 0
          ? `Story saved. ${uploadWarnings.join(' and ')} due to upload configuration.`
          : 'Brand profile saved. Store About page updated.'
      );
      window.setTimeout(() => setToastMessage(''), 2600);
    } catch (err) {
      setToastMessage(err?.message || 'Could not save brand profile.');
      window.setTimeout(() => setToastMessage(''), 2800);
    } finally {
      setBrandSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: `${theme.colors.muted}05` }}>
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow">
          {toastMessage}
        </div>
      ) : null}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        vendorData={vendorData}
        activeTab={activeTab}
        onSelectTab={setTabAndUrl}
        onOpenStore={handleOpenStore}
        onOpenStoreAbout={handleOpenStoreAbout}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <Header
          pageTitle={
            activeTab === 'dashboard'
              ? 'Dashboard'
              : activeTab === 'brand'
              ? 'Brand Profile'
              : activeTab === 'products'
              ? 'My Products'
              : activeTab === 'add'
              ? 'Add Product'
              : 'My Orders'
          }
          vendorData={vendorData}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onOpenStoreAbout={handleOpenStoreAbout}
        />

        {/* Tabs Navigation */}
        <div className="border-b" style={{ borderColor: `${theme.colors.muted}20`, backgroundColor: 'white' }}>
          <div className="flex gap-1 px-4 sm:px-6 lg:px-8 overflow-x-auto">
            <button
              onClick={() => setTabAndUrl('dashboard')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setTabAndUrl('brand')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'brand'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              Brand Profile
            </button>
            <button
              onClick={() => setTabAndUrl('products')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'products'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              My Products
            </button>
            <button
              onClick={() => setTabAndUrl('add')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'add'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              Add Product
            </button>
            <button
              onClick={() => setTabAndUrl('orders')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'orders'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              Orders
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
            {/* Welcome Banner */}
            <div
              className="rounded-2xl border p-6 sm:p-8"
              style={{
                borderColor: `${theme.colors.primaryGlow}30`,
                background: `linear-gradient(135deg, ${theme.colors.primary}05, ${theme.colors.primaryGlow}05)`,
              }}
            >
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
              >
                {timeGreeting()}, {vendorData?.business_name || 'Vendor'}!
              </h2>
              <p
                className="mt-2 text-sm sm:text-base"
                style={{ color: theme.colors.muted }}
              >
                {welcomeLine2}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div
                className="rounded-2xl border p-6"
                style={{ borderColor: `${theme.colors.primaryGlow}25`, backgroundColor: 'white' }}
              >
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full" style={{ backgroundColor: `${theme.colors.primaryGlow}20` }}>
                  {resolveImageUrl(vendorData?.site_logo) ? (
                    <img src={resolveImageUrl(vendorData?.site_logo)} alt={vendorData?.business_name || 'Brand'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold" style={{ color: theme.colors.primary }}>
                      {getBrandInitials(vendorData?.business_name)}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.colors.muted }}>
                  Brand Identity
                </p>
                <h3 className="mt-1 text-center text-lg font-bold" style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}>
                  {vendorData?.business_name || 'Your Brand'}
                </h3>
              </div>

              <div
                className="rounded-2xl border p-6"
                style={{ borderColor: `${theme.colors.muted}20`, backgroundColor: 'white' }}
              >
                <h3 className="text-lg font-bold" style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}>
                  Brand Summary
                </h3>
                <p className="mt-2 text-sm" style={{ color: theme.colors.muted }}>
                  {vendorData?.about_vendor || 'Add your brand story so buyers can understand your mission and trust your products.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm" onClick={() => setTabAndUrl('brand')}>
                    Edit Brand Profile
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleOpenStoreAbout}>
                    Open Store About Page
                  </Button>
                </div>
              </div>
            </div>

            {/* Store Link Card */}
            <div
              className="rounded-2xl border p-6 text-white"
              style={{
                borderColor: `${theme.colors.primaryGlow}40`,
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight})`,
              }}
            >
              <h3 className="text-xl font-bold" style={{ fontFamily: theme.fonts.heading }}>
                Your Store Link
              </h3>
              <div className="mt-3 rounded-lg border border-white/30 bg-black/20 px-4 py-3 font-mono text-sm break-all">
                {storeUrl}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleShareOnWhatsApp}
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
                >
                  Share on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleOpenStore}
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
                >
                  View My Store
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label="Total Products"
                value={stats?.total_products || 0}
              />
              <StatsCard
                label="This Month Orders"
                value={stats?.orders_this_month || 0}
              />
              <StatsCard
                label="Pending Orders"
                value={stats?.pending_orders || 0}
              />
              <StatsCard
                label="Delivered Orders"
                value={stats?.delivered_orders || 0}
              />
            </div>

            {/* Chart Section */}
            {chartData.length > 0 && (
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: `${theme.colors.muted}20`,
                  backgroundColor: 'white',
                }}
              >
                <h3
                  className="text-lg font-bold mb-4"
                  style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
                >
                  Orders This Month
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={`${theme.colors.muted}20`}
                    />
                    <XAxis
                      dataKey="day"
                      stroke={theme.colors.muted}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke={theme.colors.muted}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.colors.cream,
                        borderColor: theme.colors.primary,
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="orders"
                      fill={theme.colors.primary}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => setTabAndUrl('add')}
              >
                + Add Product
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setTabAndUrl('orders')}
              >
                View Orders
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={handleOpenStore}
              >
                View My Store
              </Button>
            </div>

            {/* No Products Empty State */}
            {Number(stats?.total_products || 0) === 0 && (
              <div
                className="rounded-2xl border p-10 text-center"
                style={{
                  borderColor: `${theme.colors.primaryGlow}35`,
                  backgroundColor: `${theme.colors.primaryGlow}08`,
                }}
              >
                <svg width="64" height="64" viewBox="0 0 24 24" className="mx-auto" fill="none" aria-hidden="true">
                  <path d="M12 3c-3 2-5 5-5 8 0 3 2 5 5 6 3-1 5-3 5-6 0-3-2-6-5-8zm0 0v18" stroke={theme.colors.primary} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="mt-4 text-xl font-semibold" style={{ color: theme.colors.charcoal }}>
                  Your store is ready — add your first product!
                </p>
                <p className="mt-2 text-sm" style={{ color: theme.colors.muted }}>
                  Products you add will appear on your public store
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setTabAndUrl('add')}
                  className="mt-5"
                >
                  + Add Product
                </Button>
              </div>
            )}

            {/* Alerts Section */}
            <div className="space-y-4">
              {/* Low Stock Alert */}
              {lowStockProducts.length > 0 && (
                <div
                  className="rounded-2xl border p-6"
                  style={{
                    borderColor: theme.colors.warning,
                    backgroundColor: `${theme.colors.warning}10`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">!</span>
                    <div className="flex-1">
                      <h4
                        className="font-bold"
                        style={{ color: theme.colors.warning }}
                      >
                        Low Stock Alert
                      </h4>
                      <p
                        className="text-sm mt-1"
                        style={{ color: theme.colors.charcoal }}
                      >
                        {lowStockProducts.length} product(s) have less than 5 units remaining
                      </p>
                      <div className="mt-3 space-y-1">
                        {lowStockProducts.map((product, idx) => (
                          <p
                            key={idx}
                            className="text-sm"
                            style={{ color: theme.colors.charcoal }}
                          >
                            • <strong>{product.name}</strong> ({product.quantity} units)
                          </p>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setTabAndUrl('products')}
                        className="mt-4"
                      >
                        Update Inventory
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Fee Alert */}
              {maintenanceDue && (
                <div
                  className="rounded-2xl border p-6"
                  style={{
                    borderColor: theme.colors.danger,
                    backgroundColor: `${theme.colors.danger}10`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">$</span>
                      <div>
                        <h4
                          className="font-bold"
                          style={{ color: theme.colors.danger }}
                        >
                          Maintenance Fee Due
                        </h4>
                        <p
                          className="text-sm mt-1"
                          style={{ color: theme.colors.charcoal }}
                        >
                          Your monthly maintenance fee for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} is pending
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/vendor/maintenance')}
                    >
                      Pay Now
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Orders Table */}
            {recentOrders.length > 0 && (
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: `${theme.colors.muted}20`,
                  backgroundColor: 'white',
                }}
              >
                <div className="px-6 py-4 border-b" style={{ borderColor: `${theme.colors.muted}20` }}>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
                  >
                    Recent Orders
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: `${theme.colors.muted}05` }}>
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: theme.colors.charcoal }}>
                          Order Code
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: theme.colors.charcoal }}>
                          Product
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: theme.colors.charcoal }}>
                          Buyer
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: theme.colors.charcoal }}>
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left font-semibold" style={{ color: theme.colors.charcoal }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order, idx) => (
                        <tr
                          key={idx}
                          className="border-t hover:bg-opacity-50 transition-all"
                          style={{
                            borderColor: `${theme.colors.muted}20`,
                            backgroundColor: idx % 2 === 0 ? 'white' : `${theme.colors.muted}02`,
                          }}
                        >
                          <td className="px-6 py-3 font-mono text-xs" style={{ color: theme.colors.charcoal }}>
                            {order.order_code || order.id}
                          </td>
                          <td className="px-6 py-3" style={{ color: theme.colors.charcoal }}>
                            {order.product_name || 'Product'}
                          </td>
                          <td className="px-6 py-3" style={{ color: theme.colors.charcoal }}>
                            {order.buyer_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-3 font-semibold" style={{ color: theme.colors.primary }}>
                            Rs. {order.total_amount || 0}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                              style={{
                                backgroundColor:
                                  order.status === 'delivered'
                                    ? `${theme.colors.success}20`
                                    : order.status === 'pending'
                                    ? `${theme.colors.warning}20`
                                    : `${theme.colors.info}20`,
                                color:
                                  order.status === 'delivered'
                                    ? theme.colors.success
                                    : order.status === 'pending'
                                    ? theme.colors.warning
                                    : theme.colors.info,
                              }}
                            >
                              {order.status?.replace('_', ' ').charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t text-center" style={{ borderColor: `${theme.colors.muted}20` }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTabAndUrl('orders')}
                  >
                    View All Orders
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {recentOrders.length === 0 && (
              <div
                className="rounded-2xl border p-12 text-center"
                style={{
                  borderColor: `${theme.colors.muted}20`,
                  backgroundColor: `${theme.colors.muted}05`,
                }}
              >
                <p className="font-semibold" style={{ color: theme.colors.charcoal }}>
                  No orders yet
                </p>
                <p className="text-sm mt-1" style={{ color: theme.colors.muted }}>
                  Share your store link on Instagram, YouTube, or WhatsApp to reach your customers
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCopyStoreLink}
                  className="mt-4"
                >
                  Share My Store
                </Button>
              </div>
            )}
            </div>
            )}

            {/* Brand Profile Tab */}
            {activeTab === 'brand' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold text-zinc-900">Brand Profile</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    These values power your store home and About page with predefined styles.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-zinc-800">Brand Logo (Upload)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Upload one logo or brand image. If none is selected, the existing image stays in place.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-zinc-800">Story Summary</label>
                      <textarea
                        rows={6}
                        value={brandForm.about_vendor}
                        onChange={(event) => setBrandForm((prev) => ({ ...prev, about_vendor: event.target.value }))}
                        placeholder="Write your brand story summary. This appears on store Home and About pages."
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-right text-xs text-zinc-500">{String(brandForm.about_vendor || '').length}/500</p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button variant="primary" size="md" onClick={handleSaveBrandProfile} disabled={brandSaving}>
                        {brandSaving ? 'Uploading & Saving...' : 'Save Brand Profile'}
                      </Button>
                      <Button variant="ghost" size="md" onClick={handleOpenStoreAbout}>
                        Preview About Page
                      </Button>
                      <Button variant="secondary" size="md" onClick={handleOpenStore}>
                        Preview Store Home
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Live Preview</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-full bg-zinc-100">
                        {resolveImageUrl(vendorData?.site_logo) ? (
                          <img src={resolveImageUrl(vendorData?.site_logo)} alt="Brand logo" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-600">
                            {getBrandInitials(vendorData?.business_name)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{vendorData?.business_name || 'Your Brand'}</p>
                        <p className="text-xs text-zinc-500">Story appears on Home and About pages</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-zinc-600 line-clamp-6">
                      {brandForm.about_vendor || 'Your story preview will appear here.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 mb-4">My Products</h2>
                <p className="text-sm text-zinc-600 mb-6">Manage products, pricing, stock, and storefront visibility from one place.</p>
                <ProductList />
              </div>
            )}

            {/* Add Product Tab */}
            {activeTab === 'add' && (
              <div>
                <ProductForm 
                  onSuccess={() => setTabAndUrl('products')}
                  onCancel={() => setTabAndUrl('products')}
                />
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 mb-4">My Orders</h2>
                <p className="text-sm text-zinc-600 mb-6">Manage order status and keep buyers updated.</p>
                <OrderList />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


