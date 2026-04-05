import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../styles/designSystem';
import Button from '../../components/common/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import platformContent from '../../content/platformContent';
import ProductForm from '../../components/vendor/ProductForm';
import ProductList from '../../components/vendor/ProductList';
import OrderList from '../../components/vendor/OrderList';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

// â”€â”€â”€ SIDEBAR COMPONENT â”€â”€â”€
function Sidebar({ isOpen, onClose, vendorData }) {
  const navigate = useNavigate();
  const navItems = [
    { icon: 'ðŸ“Š', label: 'Dashboard', path: '/vendor/dashboard' },
    { icon: 'ðŸ“¦', label: 'My Products', path: '/vendor/products' },
    { icon: 'âž•', label: 'Add Product', path: '/vendor/add-product' },
    { icon: 'ðŸ›’', label: 'My Orders', path: '/vendor/orders', badge: vendorData?.pending_orders || 0 },
    { icon: 'ðŸ‘¥', label: 'Customers', path: '/vendor/customers' },
    { icon: 'ðŸ’°', label: 'Maintenance Fee', path: '/vendor/maintenance' },
    { icon: 'ðŸª', label: 'View My Store', path: '#', external: true },
    { icon: 'âš™ï¸', label: 'Settings', path: '/vendor/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    navigate('/vendor/login');
  };

  const handleNavigation = (item) => {
    if (item.external) {
      window.open(vendorData?.store_url || '#', '_blank');
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
          âœ•
        </button>

        {/* Logo & Business Name */}
        <div className="space-y-3 border-b" style={{ borderColor: `${theme.colors.primaryGlow}30`, padding: '24px 20px' }}>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: theme.colors.primaryGlow }}
          >
            ðŸŒ¿
          </div>
          <div>
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
              key={item.path}
              onClick={() => handleNavigation(item)}
              className="relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all text-white/90 hover:text-white"
              style={{ hover: { backgroundColor: `${theme.colors.primaryGlow}20` } }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = `${theme.colors.primaryGlow}20`)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <span className="text-lg">{item.icon}</span>
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
            Logout ðŸšª
          </button>
        </div>
      </div>
    </>
  );
}

// â”€â”€â”€ HEADER COMPONENT â”€â”€â”€
function Header({ pageTitle, vendorData, onMenuToggle }) {
  const [searchQuery, setSearchQuery] = useState('');

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
            â˜°
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
          >
            ðŸ””
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
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: theme.colors.primaryGlow }}
            >
              {vendorData?.business_name?.charAt(0).toUpperCase() || 'V'}
            </div>
            <span
              className="text-sm font-semibold hidden sm:inline"
              style={{ color: theme.colors.charcoal }}
            >
              {vendorData?.business_name?.split(' ')[0] || 'Vendor'}
            </span>
            <span className="text-lg">â–¼</span>
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

// â”€â”€â”€ STATS CARD COMPONENT â”€â”€â”€
function StatsCard({ label, value, icon }) {
  return (
    <div
      className="card-3d group rounded-2xl border p-6 transition-all duration-300"
      style={{
        borderColor: `${theme.colors.primary}20`,
        backgroundColor: theme.colors.cream,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: theme.colors.muted }}
          >
            {label}
          </p>
          <p
            className="mt-2 text-4xl font-bold"
            style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
          >
            {value}
          </p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// â”€â”€â”€ MAIN DASHBOARD COMPONENT â”€â”€â”€
export default function VendorDashboard() {
  const navigate = useNavigate();
  const { brand } = platformContent;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendorData, setVendorData] = useState(null);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [maintenanceDue, setMaintenanceDue] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');  const [activeTab, setActiveTab] = useState('dashboard');
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('vendor_token');
        if (!token) {
          navigate('/vendor/login');
          return;
        }

        const response = await fetch(`${API_BASE}/vendor/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('vendor_token');
            navigate('/vendor/login');
          }
          throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        setVendorData(data.vendor);
        setStats(data.stats);
        setChartData(data.chart_data || []);
        setRecentOrders(data.recent_orders || []);
        setLowStockProducts(data.low_stock_products || []);
        setMaintenanceDue(data.maintenance_fee_due || false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

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
  const vendorSlug = vendorData?.vendor_slug || vendorData?.slug || vendorData?.username || 'vendor-store';
  const storeUrl = `https://nativeglow.com/site/${vendorSlug}`;
  const whatsappShareMessage = `Hi! Check out my natural products store on ${brand.name} 🌿\nBrowse and order directly here:\n${storeUrl}`;

  const welcomeLine2 =
    pendingOrders > 0
      ? `You have ${pendingOrders} order(s) waiting for confirmation`
      : totalOrdersToday > 0
      ? `You received ${totalOrdersToday} order(s) today — great work!`
      : 'Share your store link to start receiving orders today';

  const handleCopyStoreLink = async () => {
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
    const waUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareMessage)}`;
    window.open(waUrl, '_blank');
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
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <Header
          pageTitle={activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'products' ? 'My Products' : activeTab === 'add' ? 'Add Product' : 'My Orders'}
          vendorData={vendorData}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Tabs Navigation */}
        <div className="border-b" style={{ borderColor: `${theme.colors.muted}20`, backgroundColor: 'white' }}>
          <div className="flex gap-1 px-4 sm:px-6 lg:px-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'products'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              📦 My Products
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'add'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              ➕ Add Product
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'orders'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-zinc-600 border-transparent hover:text-zinc-900'
              }`}
            >
              🛒 Orders
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
                {timeGreeting()}, {vendorData?.business_name || 'Vendor'}! 🌿
              </h2>
              <p
                className="mt-2 text-sm sm:text-base"
                style={{ color: theme.colors.muted }}
              >
                {welcomeLine2}
              </p>
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
                  📋 Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleShareOnWhatsApp}
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
                >
                  📲 Share on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => window.open(storeUrl, '_blank')}
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
                >
                  ↗ View Store
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label="Total Products"
                value={stats?.total_products || 0}
                icon="ðŸ“¦"
              />
              <StatsCard
                label="This Month Orders"
                value={stats?.orders_this_month || 0}
                icon="ðŸ›’"
              />
              <StatsCard
                label="Pending Orders"
                value={stats?.pending_orders || 0}
                icon="â³"
              />
              <StatsCard
                label="Delivered Orders"
                value={stats?.delivered_orders || 0}
                icon="âœ“"
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
                onClick={() => navigate('/vendor/add-product')}
              >
                + Add Product
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/vendor/orders')}
              >
                View Orders
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => window.open(vendorData?.store_url || '#', '_blank')}
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
                  onClick={() => navigate('/vendor/dashboard/products/new')}
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
                    <span className="text-2xl">âš ï¸</span>
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
                            â€¢ <strong>{product.name}</strong> ({product.quantity} units)
                          </p>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/vendor/products')}
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
                      <span className="text-2xl">ðŸ’³</span>
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
                            â‚¹{order.total_amount || 0}
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
                              {order.status === 'delivered' && 'âœ“'}
                              {order.status === 'pending' && 'â³'}
                              {order.status === 'cancelled' && 'âœ•'}
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
                    onClick={() => navigate('/vendor/orders')}
                  >
                    View All Orders â†’
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
                <p className="text-3xl mb-2">ðŸ“­</p>
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
                  onSuccess={() => setActiveTab('products')}
                  onCancel={() => setActiveTab('products')}
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
