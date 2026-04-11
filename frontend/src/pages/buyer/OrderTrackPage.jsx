import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { resolveImageUrl } from '../../utils/imageUrl';

const TRACK_STEPS = ['Order Placed', 'Confirmed', 'Shipped', 'Delivered'];

function normalizeStatus(orderStatus) {
  const raw = String(orderStatus || '').toLowerCase().trim();

  if (raw.includes('cancel')) return 'cancelled';
  if (['delivered', 'completed'].includes(raw)) return 'delivered';
  if (['shipped', 'in_transit', 'out_for_delivery'].includes(raw)) return 'shipped';
  if (['confirmed', 'accepted', 'processing'].includes(raw)) return 'confirmed';
  return 'placed';
}

function getStepIndex(orderStatus) {
  const normalized = normalizeStatus(orderStatus);
  if (normalized === 'cancelled') return -1;
  if (normalized === 'placed') return 0;
  if (normalized === 'confirmed') return 1;
  if (normalized === 'shipped') return 2;
  if (normalized === 'delivered') return 3;
  return 0;
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toTrackCard(order, detail) {
  return {
    order_code: detail?.order_code || order?.order_code || 'N/A',
    product_name: detail?.product_name || order?.product_name || 'Product',
    product_image: detail?.product_image || detail?.product_image_url || null,
    vendor_name: detail?.vendor_name || order?.vendor_name || 'Vendor',
    vendor_city: detail?.vendor_city || order?.vendor_city || order?.city || '',
    vendor_whatsapp: detail?.vendor_whatsapp || order?.vendor_whatsapp || '',
    quantity: Number(detail?.quantity ?? order?.quantity ?? 0),
    total_amount: Number(detail?.total_amount ?? order?.total_amount ?? 0),
    payment_method: detail?.payment_method || order?.payment_method || 'N/A',
    order_status: detail?.order_status || order?.order_status || 'pending',
    created_at: detail?.created_at || order?.created_at || null,
    confirmed_at: detail?.confirmed_at || order?.confirmed_at || null,
    shipped_at: detail?.shipped_at || order?.shipped_at || null,
    delivered_at: detail?.delivered_at || order?.delivered_at || null,
    cancelled_at: detail?.cancelled_at || order?.cancelled_at || null,
    tracking_id: detail?.tracking_id || order?.tracking_id || '',
    courier_name: detail?.courier_name || order?.courier_name || '',
    cancellation_reason: detail?.cancel_reason || order?.cancel_reason || detail?.cancellation_reason || order?.cancellation_reason || '',
    tracking_info: detail?.tracking_info || order?.tracking_info || '',
  };
}

function OrderTrackPage() {
  const navigate = useNavigate();
  const { order_code: routeOrderCode } = useParams();
  const [searchParams] = useSearchParams();
  const routePhone = (searchParams.get('phone') || '').replace(/\D/g, '').slice(0, 10);

  const [phone, setPhone] = useState(routePhone);
  const [orderCode, setOrderCode] = useState(routeOrderCode || '');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('');

  const title = useMemo(() => {
    if (orders.length === 1 && orderCode) return `Tracking order ${orders[0].order_code}`;
    return 'Track Your Orders';
  }, [orders, orderCode]);

  useEffect(() => {
    setPhone(routePhone);
  }, [routePhone]);

  useEffect(() => {
    if (!routeOrderCode) return;
    const code = String(routeOrderCode).toUpperCase();
    setOrderCode(code);

    const fakeEvent = { preventDefault: () => {} };
    handleTrackByOrderCode(fakeEvent, code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOrderCode]);

  useEffect(() => {
    if (routePhone.length !== 10 || routeOrderCode) return;
    const fakeEvent = { preventDefault: () => {} };
    handleTrackByPhone(fakeEvent, routePhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePhone, routeOrderCode]);

  async function handleTrackByPhone(event, forcedPhone = '') {
    event.preventDefault();
    const digits = (forcedPhone || phone).replace(/\D/g, '');

    if (digits.length !== 10) {
      setError('Phone number must be 10 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setEmptyMessage('');

    try {
      const response = await api.trackOrderByPhone(digits);
      const list = Array.isArray(response?.results) ? response.results : [];

      if (list.length === 0) {
        setOrders([]);
        setEmptyMessage('No orders found for this phone number');
        return;
      }

      const detailPromises = list.map((item) =>
        api.trackOrderByCode(item.order_code).catch(() => null)
      );
      const details = await Promise.all(detailPromises);

      const merged = list.map((item, idx) => toTrackCard(item, details[idx]));
      setOrders(merged);
    } catch (err) {
      setOrders([]);
      setError(err?.message || 'Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrackByOrderCode(event, forcedCode = '') {
    event.preventDefault();
    const code = (forcedCode || orderCode).trim().toUpperCase();

    if (!code) {
      setError('Please enter an order code.');
      return;
    }

    setLoading(true);
    setError('');
    setEmptyMessage('');

    try {
      const detail = await api.trackOrderByCode(code);
      setOrders([toTrackCard(detail, detail)]);
    } catch (err) {
      setOrders([]);
      if (err?.status === 404) {
        setEmptyMessage(`Order ${code} not found.`);
      } else {
        setError(err?.message || 'Failed to fetch order details.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 pt-20 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600">Use phone number or order code to view order status timeline.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900">Track by Phone</h2>
            <form onSubmit={handleTrackByPhone} className="mt-4 space-y-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit phone number"
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? 'Tracking...' : 'Track My Orders'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900">Track by Order Code</h2>
            <form onSubmit={handleTrackByOrderCode} className="mt-4 space-y-3">
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                placeholder="e.g. NG-2025-00123"
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 uppercase focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border border-emerald-600 px-4 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                {loading ? 'Tracking...' : 'Track Order'}
              </button>
            </form>
          </section>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {emptyMessage ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">
            {emptyMessage}
          </div>
        ) : null}

        {orders.length > 0 ? (
          <section className="mt-6 space-y-4">
            {orders.map((order) => {
              const stepIndex = getStepIndex(order.order_status);
              const normalizedStatus = normalizeStatus(order.order_status);
              const vendorWhatsapp = String(order.vendor_whatsapp || '').replace(/\D/g, '');
              const stepDates = [order.created_at, order.confirmed_at, order.shipped_at, order.delivered_at];
              const buyerTrackingMessage = order.tracking_id
                ? `Hi, checking on my order ${order.order_code}, tracking ID ${order.tracking_id}`
                : `Hi, checking on my order ${order.order_code}`;

              return (
                <article key={order.order_code} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[120px_1fr] md:p-5">
                    <div className="h-28 w-full overflow-hidden rounded-lg bg-zinc-100 md:h-24 md:w-[110px]">
                      {order.product_image ? (
                        <img
                          src={resolveImageUrl(order.product_image)}
                          alt={order.product_name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">No Image</div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-sm font-bold text-emerald-700">{order.order_code}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            normalizedStatus === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {String(order.order_status || '').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <h3 className="mt-1 text-lg font-bold text-zinc-900">{order.product_name}</h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                        <span>Vendor: {order.vendor_name}</span>
                        {order.vendor_city ? <span>• {order.vendor_city}</span> : null}
                        {vendorWhatsapp ? (
                          <a
                            href={`https://wa.me/${vendorWhatsapp}?text=${encodeURIComponent(`Hi, tracking my order ${order.order_code}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200 hover:bg-green-100"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-zinc-700 sm:grid-cols-2">
                        <p>Quantity: <strong>{order.quantity}</strong></p>
                        <p>Total Amount: <strong>Rs {Number(order.total_amount || 0).toFixed(2)}</strong></p>
                        <p>Payment Method: <strong>{order.payment_method}</strong></p>
                        <p>Order Date: <strong>{formatDate(order.created_at)}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      {TRACK_STEPS.map((step, idx) => {
                        const active = stepIndex >= idx;
                        return (
                          <div key={step} className="flex flex-1 items-start gap-2">
                            <div className="mt-0.5">
                              <div
                                className={`h-4 w-4 rounded-full ${
                                  normalizedStatus === 'cancelled'
                                    ? 'bg-red-500'
                                    : active
                                      ? 'bg-emerald-600'
                                      : 'bg-zinc-300'
                                }`}
                              />
                            </div>
                            <div>
                              <p className={`text-xs font-medium ${active ? 'text-zinc-900' : 'text-zinc-500'}`}>{step}</p>
                              {active && stepDates[idx] ? (
                                <p className="text-[11px] text-zinc-500">{formatDate(stepDates[idx])}</p>
                              ) : null}
                            </div>
                            {idx < TRACK_STEPS.length - 1 ? (
                              <div className={`hidden h-[2px] flex-1 sm:block ${active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {normalizedStatus === 'cancelled' ? (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Cancelled</span>
                          {order.cancelled_at ? <span className="text-xs text-red-700">{formatDate(order.cancelled_at)}</span> : null}
                        </div>
                        <p className="text-sm font-semibold text-red-700">
                          Reason: {order.cancellation_reason || 'Not provided'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-700">
                          <p>Contact seller for refund.</p>
                          {vendorWhatsapp ? (
                            <a
                              href={`https://wa.me/${vendorWhatsapp}?text=${encodeURIComponent(`Hi, my order ${order.order_code} was cancelled. Please share refund update.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Contact Seller
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {normalizedStatus === 'shipped' ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-zinc-700">
                        <p className="font-semibold text-emerald-800">📦 Your order is on the way!</p>
                        {order.courier_name ? <p className="mt-1">Courier: <strong>{order.courier_name}</strong></p> : null}
                        {order.tracking_id ? <p>Tracking ID: <strong>{order.tracking_id}</strong></p> : null}
                        {order.shipped_at ? <p>Shipped on: <strong>{formatDate(order.shipped_at)}</strong></p> : null}
                        {!order.courier_name && !order.tracking_id && order.tracking_info ? (
                          <p className="mt-1">Details: {order.tracking_info}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {vendorWhatsapp ? (
                            <a
                              href={`https://wa.me/${vendorWhatsapp}?text=${encodeURIComponent(buyerTrackingMessage)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Ask on WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderTrackPage;
