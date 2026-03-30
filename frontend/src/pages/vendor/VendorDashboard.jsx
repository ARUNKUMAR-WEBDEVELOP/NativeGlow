import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  (import.meta.env.DEV ? 'ws://127.0.0.1:8000' : 'wss://nativeglow.onrender.com');

// Create soft notification sound using Web Audio API
function createNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  
  // Create two short beeps at different frequencies
  const beep = (freq, duration) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = freq;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
  };
  
  // First beep at 800Hz for 0.15s
  beep(800, 0.15);
  // Second beep at 1000Hz for 0.1s, 0.1s later
  beep(1000, 0.1);
}

// Toast notification component
function Toast({ order, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed right-4 top-4 z-50 w-96 gap-4 rounded-lg border border-sage/30 bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 font-semibold text-zinc-900">
            <span className="text-lg">🛍️</span>
            New Order Received!
          </p>
          <div className="mt-2 space-y-1 text-sm text-zinc-700">
            <p><span className="font-medium">{order.product_name}</span> × {order.quantity}</p>
            <p>Amount: <span className="font-medium text-sage">₹{(order.total_amount || 0).toFixed(2)}</span></p>
            <p>Buyer: <span className="font-medium">{order.buyer_name || 'Guest'}</span></p>
          </div>
          <a
            href={`/vendor/dashboard/orders?code=${order.order_code}`}
            className="mt-3 inline-block rounded-lg bg-sage px-3 py-1 text-xs font-semibold text-white transition hover:bg-sage/90"
          >
            View Order →
          </a>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 transition hover:text-zinc-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
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
  const [toast, setToast] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  if (!vendorSession?.access || !isTokenValid(vendorSession.access)) {
    localStorage.removeItem('nativeglow_vendor_tokens');
    return <Navigate to="/vendor/login" replace />;
  }

  useEffect(() => {
    let mounted = true;
    let ws = null;
    let pollingInterval = null;
    let wsConnectTimeout = null;

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

    // Connect to WebSocket for real-time notifications
    function connectWebSocket() {
      if (!vendor?.id) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${WS_BASE}/ws/vendor/${vendor.id}/`;
      
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!mounted) return;
          setWsConnected(true);
          console.log('WebSocket connected');
          // Clear polling interval if WebSocket connects
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        };

        ws.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_order') {
              // Play notification sound
              try {
                createNotificationSound();
              } catch (err) {
                console.log('Could not play notification sound:', err);
              }

              // Show toast notification
              setToast(data.order);

              // Increment unread badge
              setPendingOrderCount((prev) => prev + 1);

              // Refresh dashboard silently
              loadDashboard({ silent: true });
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (err) => {
          if (!mounted) return;
          console.log('WebSocket error, falling back to polling:', err);
          setWsConnected(false);
          // Start polling fallback
          startPollingFallback();
        };

        ws.onclose = () => {
          if (!mounted) return;
          setWsConnected(false);
          console.log('WebSocket closed');
          // Start polling fallback if not already started
          if (!pollingInterval) {
            startPollingFallback();
          }
        };
      } catch (err) {
        console.log('WebSocket connection failed, using polling fallback:', err);
        startPollingFallback();
      }
    }

    // Polling fallback (silent, no errors shown to vendor)
    function startPollingFallback() {
      if (pollingInterval) return; // Already polling

      pollingInterval = setInterval(async () => {
        if (!mounted) return;
        try {
          const pendingOrders = await fetchJson('/vendor/orders/?status=pending');
          if (!mounted) return;
          
          const pendingCount = Array.isArray(pendingOrders)
            ? pendingOrders.filter((item) => String(item.order_status || '').toLowerCase() === 'pending').length
            : 0;

          setPendingOrderCount(pendingCount);
        } catch (err) {
          console.log('Polling fetch error (silent):', err);
        }
      }, 30000); // Poll every 30 seconds
    }

    // Initial load
    loadDashboard();

    // Wait a bit for vendor info to load, then connect WebSocket
    const vendorId = vendor?.id || vendorSession?.vendor?.id;
    if (vendorId) {
      connectWebSocket();
    } else {
      // Try again after vendor loads
      wsConnectTimeout = setTimeout(() => {
        if (mounted) {
          connectWebSocket();
        }
      }, 1000);
    }

    // Also refresh every 60 seconds (if polling, this adds to it)
    const intervalId = setInterval(() => {
      loadDashboard({ silent: true });
    }, 60000);

    return () => {
      mounted = false;
      if (ws) {
        ws.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (wsConnectTimeout) {
        clearTimeout(wsConnectTimeout);
      }
      clearInterval(intervalId);
    };
  }, [navigate, vendorSession.access, vendor?.id]);

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
      {toast ? (
        <Toast order={toast} onClose={() => setToast(null)} />
      ) : null}
      
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage">Vendor Menu</p>
            <div className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-sage' : 'bg-amber-500'}`}></span>
              <span className="text-[10px] font-semibold text-zinc-500">
                {wsConnected ? 'Live' : 'Polling'}
              </span>
            </div>
          </div>
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
