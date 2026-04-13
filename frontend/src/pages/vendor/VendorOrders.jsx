import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { resolveImageUrl } from '../../utils/imageUrl';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

const STATUS_TABS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

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

function formatOrderDate(value) {
  if (!value) {
    return 'N/A';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(amount) {
  const n = Number(amount || 0);
  if (Number.isNaN(n)) {
    return '0.00';
  }
  return n.toFixed(2);
}

function isNewOrder(createdAt) {
  if (!createdAt) {
    return false;
  }
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) {
    return false;
  }
  return now - created <= 24 * 60 * 60 * 1000;
}

function VendorOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const filter = String(searchParams.get('filter') || '').toLowerCase();
    return STATUS_TABS.includes(filter) ? filter : 'all';
  });
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const filter = String(searchParams.get('filter') || '').toLowerCase();
    if (STATUS_TABS.includes(filter)) {
      setActiveTab(filter);
    }
  }, [searchParams]);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorSession?.access || ''}`,
    }),
    [vendorSession?.access]
  );

  useEffect(() => {
    if (!vendorSession?.access || !isTokenValid(vendorSession.access)) {
      localStorage.removeItem('nativeglow_vendor_tokens');
      navigate('/vendor/login', { replace: true });
      return;
    }

    let mounted = true;

    async function loadOrders() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/vendor/orders/`, {
          headers: authHeaders,
        });

        if (!res.ok) {
          let detail = `Failed to fetch orders (${res.status})`;
          try {
            const payload = await res.json();
            detail = payload.detail || payload.error || JSON.stringify(payload);
          } catch {
            // keep default detail
          }
          throw new Error(detail);
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (!mounted) {
          return;
        }

        setOrders(sorted);

        const initialDrafts = {};
        sorted.forEach((order) => {
          initialDrafts[order.id] = {
            status: order.order_status,
            tracking_id: order.tracking_id || '',
            courier_name: order.courier_name || '',
            tracking_info: order.tracking_info || '',
            cancel_reason: order.cancel_reason || '',
            saving: false,
            error: '',
          };
        });
        setDrafts(initialDrafts);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err.message || 'Could not load orders.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, [authHeaders, navigate, vendorSession?.access]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') {
      return orders;
    }
    return orders.filter((order) => String(order.order_status).toLowerCase() === activeTab);
  }, [activeTab, orders]);

  function updateDraft(orderId, patch) {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        ...patch,
      },
    }));
  }

  async function onUpdateStatus(order) {
    const draft = drafts[order.id] || {};
    const status = draft.status || order.order_status;
    const trackingId = (draft.tracking_id || '').trim();
    const courierName = (draft.courier_name || '').trim();
    const trackingInfo = (draft.tracking_info || '').trim();
    const cancelReason = (draft.cancel_reason || '').trim();

    if (status === 'cancelled' && !cancelReason) {
      updateDraft(order.id, { error: 'Cancellation reason is required for cancelled orders.' });
      return;
    }

    updateDraft(order.id, { saving: true, error: '' });
    setSuccess('');
    setError('');

    const body = { order_status: status };
    if (status === 'shipped') {
      if (trackingId) {
        body.tracking_id = trackingId;
      }
      if (courierName) {
        body.courier_name = courierName;
      }
      if (trackingInfo) {
        body.tracking_info = trackingInfo;
      }
    }
    if (status === 'cancelled') {
      body.cancel_reason = cancelReason;
    }

    try {
      const res = await fetch(`${API_BASE}/vendor/orders/${order.id}/status/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let detail = `Status update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      const updated = await res.json();

      setOrders((prev) =>
        prev.map((item) => {
          if (item.id !== order.id) {
            return item;
          }
          return {
            ...item,
            ...updated,
            order_status: updated.order_status || status,
            tracking_id: status === 'shipped' ? trackingId : '',
            courier_name: status === 'shipped' ? courierName : '',
            tracking_info: status === 'shipped' ? (trackingInfo || [
              courierName ? `Courier: ${courierName}` : '',
              trackingId ? `Tracking ID: ${trackingId}` : '',
            ].filter(Boolean).join(' | ')) : '',
            cancel_reason: status === 'cancelled' ? cancelReason : '',
          };
        })
      );

      updateDraft(order.id, {
        saving: false,
        error: '',
        status,
        tracking_id: status === 'shipped' ? trackingId : '',
        courier_name: status === 'shipped' ? courierName : '',
        tracking_info: status === 'shipped' ? (trackingInfo || [
          courierName ? `Courier: ${courierName}` : '',
          trackingId ? `Tracking ID: ${trackingId}` : '',
        ].filter(Boolean).join(' | ')) : '',
        cancel_reason: status === 'cancelled' ? cancelReason : '',
      });

      setSuccess(`Order ${order.order_code || order.id} updated to ${status}.`);
    } catch (err) {
      updateDraft(order.id, {
        saving: false,
        error: err.message || 'Failed to update status.',
      });
    }
  }

  if (!vendorSession?.access || !isTokenValid(vendorSession.access)) {
    return <Navigate to="/vendor/login" replace />;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">My Orders</h2>
        <p className="mt-1 text-sm text-zinc-600">Manage status, shipment details, and buyer updates from one place.</p>
      </div>

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
          Loading orders...
        </div>
      ) : null}

      {!loading && filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
          No orders found for this filter.
        </div>
      ) : null}

      {!loading && filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const draft = drafts[order.id] || {
              status: order.order_status,
              tracking_id: order.tracking_id || '',
              courier_name: order.courier_name || '',
              tracking_info: order.tracking_info || '',
              cancel_reason: order.cancel_reason || '',
              saving: false,
              error: '',
            };

            const buyerPhoneDigits = String(order.buyer_phone || '').replace(/\D/g, '');
            const businessName = vendorSession?.vendor?.business_name || 'NativeGlow Store';
            const chosenOptions = [
              order.selected_color ? `Color: ${order.selected_color}` : '',
              order.selected_size ? `Size: ${order.selected_size}` : '',
            ].filter(Boolean).join(' | ');
            const whatsappMessage = `Hi ${order.buyer_name}, your order ${order.order_code} for ${order.product_name}${chosenOptions ? ` (${chosenOptions})` : ''} has been ${draft.status}. Thank you for shopping with ${businessName}!`;

            return (
              <article key={order.id} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Order Code</p>
                    <p className="text-sm font-bold text-zinc-900">{order.order_code || 'N/A'}</p>
                    <p className="text-xs text-zinc-500">Ordered {formatOrderDate(order.created_at)}</p>
                    {isNewOrder(order.created_at) ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                        <span className="h-2 w-2 rounded-full bg-rose-600" />
                        NEW
                      </span>
                    ) : null}
                  </div>
                  {order.product_image ? (
                    <img
                      src={resolveImageUrl(order.product_image)}
                      alt={order.product_name}
                      className="h-16 w-16 rounded-2xl border border-zinc-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">
                      No Image
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                    <p className="font-semibold text-zinc-900">{order.product_name}</p>
                    <p className="mt-1">Qty {order.quantity} · {String(order.payment_method || 'upi').toUpperCase()} · Ref {order.payment_reference || 'N/A'}</p>
                    {order.selected_color || order.selected_size ? (
                      <p className="mt-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                        {[order.selected_color ? `Color: ${order.selected_color}` : '', order.selected_size ? `Size: ${order.selected_size}` : '']
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}
                    <p className="mt-1">Buyer: <span className="font-semibold text-zinc-900">{order.buyer_name}</span> · {order.buyer_phone}</p>
                    <p className="mt-1 leading-6">Address: {order.buyer_address}{order.buyer_pincode ? ` ${order.buyer_pincode}` : ''}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Amount</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">₹{formatAmount(order.total_amount)}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">{order.order_status}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={draft.status}
                        onChange={(e) => updateDraft(order.id, { status: e.target.value, error: '' })}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sage focus:outline-none"
                        disabled={draft.saving}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(order)}
                        disabled={draft.saving}
                        className="rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                      >
                        {draft.saving ? 'Updating...' : 'Update Status'}
                      </button>
                    </div>

                    {draft.status === 'shipped' ? (
                      <div className="space-y-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Enter tracking ID or courier name (optional)
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={draft.tracking_id || ''}
                            onChange={(e) => updateDraft(order.id, { tracking_id: e.target.value })}
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sage focus:outline-none"
                            placeholder="Tracking ID"
                            disabled={draft.saving}
                          />
                          <input
                            type="text"
                            value={draft.courier_name || ''}
                            onChange={(e) => updateDraft(order.id, { courier_name: e.target.value })}
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sage focus:outline-none"
                            placeholder="Courier Name"
                            disabled={draft.saving}
                          />
                        </div>
                      </div>
                    ) : null}

                    {draft.status === 'cancelled' ? (
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Cancellation reason (required)
                        </label>
                        <input
                          type="text"
                          value={draft.cancel_reason || ''}
                          onChange={(e) => updateDraft(order.id, { cancel_reason: e.target.value, error: '' })}
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                          placeholder="Out of stock"
                          disabled={draft.saving}
                        />
                      </div>
                    ) : null}

                    {draft.error ? (
                      <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                        {draft.error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex justify-start md:justify-end">
                    <a
                      href={
                        buyerPhoneDigits
                          ? `https://wa.me/${buyerPhoneDigits}?text=${encodeURIComponent(whatsappMessage)}`
                          : undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        buyerPhoneDigits
                          ? 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                          : 'cursor-not-allowed border border-zinc-300 bg-zinc-100 text-zinc-500'
                      }`}
                      onClick={(e) => {
                        if (!buyerPhoneDigits) {
                          e.preventDefault();
                        }
                      }}
                    >
                      WhatsApp Buyer
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default VendorOrders;
