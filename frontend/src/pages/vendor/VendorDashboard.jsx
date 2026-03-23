import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

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

function isTokenValid(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 > Date.now();
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) {
    return '0.00';
  }
  return amount.toFixed(2);
}

function VendorDashboard() {
  const navigate = useNavigate();
  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [vendor, setVendor] = useState(null);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    pendingApprovals: 0,
    activeOrders: 0,
    monthSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  if (!vendorSession?.access || !isTokenValid(vendorSession.access)) {
    localStorage.removeItem('nativeglow_vendor_tokens');
    return <Navigate to="/vendor/login" replace />;
  }

  useEffect(() => {
    let mounted = true;

    async function fetchJson(path) {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vendorSession.access}`,
        },
      });

      if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      return res.json();
    }

    async function loadDashboard({ silent = false } = {}) {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      try {
        const [profile, products, orders, pendingOrders] = await Promise.all([
          fetchJson('/vendor/me/'),
          fetchJson('/vendor/products/'),
          fetchJson('/vendor/orders/'),
          fetchJson('/vendor/orders/?status=pending'),
        ]);

        if (!mounted) {
          return;
        }

        const pendingApprovals = products.filter((item) => item.status === 'pending').length;
        const activeOrders = orders.filter((item) => ['pending', 'confirmed', 'shipped'].includes(item.order_status)).length;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthSales = orders
          .filter((item) => {
            if (item.order_status !== 'delivered' || !item.created_at) {
              return false;
            }
            const created = new Date(item.created_at);
            return created.getFullYear() === currentYear && created.getMonth() === currentMonth;
          })
          .reduce((acc, item) => acc + Number(item.total_amount || 0), 0);

        const pendingCount = Array.isArray(pendingOrders)
          ? pendingOrders.filter((item) => String(item.order_status || '').toLowerCase() === 'pending').length
          : 0;

        setVendor(profile);
        setSummary({
          totalProducts: products.length,
          pendingApprovals,
          activeOrders,
          monthSales,
        });
        setPendingOrderCount(pendingCount);
      } catch (err) {
        if (!mounted) {
          return;
        }
        if (String(err.message || '').toLowerCase().includes('authentication')) {
          localStorage.removeItem('nativeglow_vendor_tokens');
          navigate('/vendor/login', { replace: true });
          return;
        }
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        if (mounted && !silent) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    const intervalId = setInterval(() => {
      loadDashboard({ silent: true });
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [navigate, vendorSession.access]);

  const storeUrl = vendor?.vendor_slug
    ? `https://nativeglow.com/store/${vendor.vendor_slug}`
    : 'Not available yet';

  const sidebarLinks = [
    { label: 'My Products', to: '/vendor/dashboard/products' },
    { label: 'Add Product', to: '/vendor/dashboard/products/new' },
    { label: 'My Orders', to: '/vendor/dashboard/orders' },
    { label: 'Maintenance Fees', to: '/vendor/dashboard/maintenance' },
    { label: 'My Store', to: '/vendor/dashboard/store' },
    { label: 'Account Settings', to: '/vendor/dashboard/account' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('nativeglow_vendor_tokens');
    navigate('/vendor/login', { replace: true });
  };

  return (
    <section className="max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage">Vendor Menu</p>
          <nav className="mt-3 space-y-2">
            {sidebarLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-sage/40 hover:bg-[#f2f7eb]"
              >
                <span>{item.label}</span>
                {item.label === 'My Orders' && pendingOrderCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {pendingOrderCount}
                  </span>
                ) : null}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-xl border border-rose-200 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Logout
            </button>
          </nav>

          <div className="mt-4 rounded-xl border border-sage/25 bg-[#edf5e9] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-sage">My Store</p>
            <p className="mt-1 break-all text-xs text-zinc-700">{storeUrl}</p>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-3xl border border-sage/20 bg-gradient-to-br from-[#f8f7ef] via-[#edf3e6] to-[#e8dcc9] p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage">Vendor Dashboard</p>
            <h1 className="mt-2 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">
              Welcome {vendor?.full_name || vendorSession?.vendor?.full_name || 'Vendor'}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Business: {vendor?.business_name || vendorSession?.vendor?.business_name || 'NA'}
            </p>
            <p className="mt-1 text-sm text-zinc-600">City: {vendor?.city || vendorSession?.vendor?.city || 'NA'}</p>
          </div>

          {pendingOrderCount > 0 ? (
            <button
              type="button"
              onClick={() => navigate('/vendor/dashboard/orders?filter=pending')}
              className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
            >
              🔔 You have {pendingOrderCount} new order(s) waiting for confirmation!
            </button>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Total Products</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{loading ? '-' : summary.totalProducts}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Pending Approvals</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{loading ? '-' : summary.pendingApprovals}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Active Orders</p>
              <p className="mt-2 text-3xl font-bold text-sage">{loading ? '-' : summary.activeOrders}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">This Month's Sales</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">INR {loading ? '-' : formatCurrency(summary.monthSales)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Quick Actions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/vendor/dashboard/products/new" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700">Add Product</Link>
              <Link to="/vendor/dashboard/orders" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700">View Orders</Link>
              <Link to="/vendor/dashboard/account" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700">Account Settings</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VendorDashboard;
