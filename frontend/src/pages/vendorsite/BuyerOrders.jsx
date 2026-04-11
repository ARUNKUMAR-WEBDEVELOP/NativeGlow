import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useBuyerAuth } from '../../components/vendorsite/BuyerAuthContext';
import OrderStatusTimeline from '../../components/vendorsite/OrderStatusTimeline';
import useApiRequest from '../../hooks/useApiRequest';
import { resolveImageUrl } from '../../utils/imageUrl';

function isShippedStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return normalized.includes('shipped') || normalized.includes('out_for_delivery') || normalized.includes('in_transit');
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

function formatMoney(value) {
  const n = Number(value || 0);
  return `Rs ${n.toLocaleString('en-IN')}`;
}

function formatShippingAddress(order) {
  const parts = [
    order.buyer_address_line1 || order.shipping_address_line1 || order.buyer_address || order.shipping_address,
    order.buyer_address_line2 || order.shipping_address_line2,
    [order.buyer_city || order.shipping_city, order.buyer_state || order.shipping_state, order.buyer_pincode || order.shipping_pincode]
      .filter(Boolean)
      .join(', '),
    order.buyer_country || order.shipping_country,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Shipping details not available';
}

export default function BuyerOrders() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const { buyer, isLoggedIn, ready } = useBuyerAuth();

  const [actionError, setActionError] = useState('');

  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  const buyerOrdersRequest = useApiRequest(
    async () => {
      if (!isLoggedIn || !buyer?.accessToken) {
        return [];
      }
      const data = await api.getBuyerOrders(buyer.accessToken);
      return Array.isArray(data) ? data : [];
    },
    [isLoggedIn, buyer?.accessToken],
    {
      immediate: Boolean(isLoggedIn && buyer?.accessToken),
      initialData: [],
      cacheKey:
        isLoggedIn && buyer?.accessToken
          ? `buyer:orders:${vendorSlug || 'vendor'}:${buyer.accessToken.slice(-16)}`
          : '',
      cacheTtlMs: 60 * 1000,
    }
  );

  const orders = Array.isArray(buyerOrdersRequest.data) ? buyerOrdersRequest.data : [];
  const loading = buyerOrdersRequest.loading;
  const error = actionError || buyerOrdersRequest.error;

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [orders]
  );

  async function submitDeliveryConfirmation() {
    if (!buyer?.accessToken || !confirmingOrder?.order_code) {
      return;
    }

    setSubmittingConfirm(true);
    setActionError('');

    try {
      await api.confirmBuyerDelivery(
        confirmingOrder.order_code,
        {
          rating: deliveryRating,
          note: deliveryNote,
        },
        buyer.accessToken
      );

      buyerOrdersRequest.setData((prev) =>
        prev.map((item) =>
          item.order_code === confirmingOrder.order_code
            ? {
                ...item,
                buyer_confirmed_delivery: true,
                buyer_confirmed_at: new Date().toISOString(),
                delivery_rating: deliveryRating,
                status: 'delivered',
              }
            : item
        )
      );

      setConfirmingOrder(null);
      setDeliveryNote('');
      setDeliveryRating(5);
    } catch (err) {
      setActionError(err.message || 'Failed to confirm delivery.');
    } finally {
      setSubmittingConfirm(false);
    }
  }

  if (!ready) {
    return <p className="text-sm font-semibold text-zinc-600">Checking your buyer session...</p>;
  }

  if (!isLoggedIn) {
    return <Navigate to={`/store/${vendorSlug}/login`} replace />;
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'var(--heading-font)' }}>
          My Orders
        </h1>
        <p className="mt-1 text-sm opacity-80">Track your purchases, delivery status, and shipping address from this store.</p>
      </header>

      {loading ? <p className="text-sm font-semibold text-zinc-600">Loading your orders...</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {!loading && !error && sortedOrders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-6 text-center">
          <p className="text-sm text-zinc-700">No orders yet. Start shopping!</p>
          <Link
            to={`/store/${vendorSlug}/products`}
            className="mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
          >
            Browse Products
          </Link>
        </div>
      ) : null}

      <div className="space-y-4">
        {sortedOrders.map((order) => {
          const highlight = isShippedStatus(order.status) && !order.buyer_confirmed_delivery;

          return (
            <article
              key={order.order_code}
              className={`rounded-3xl border bg-white p-4 shadow-sm ${highlight ? 'ring-2 ring-emerald-300' : ''}`}
              style={{ borderColor: highlight ? '#34d399' : 'rgba(0,0,0,0.12)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order Code</p>
                  <p className="font-mono text-sm font-bold text-emerald-700">{order.order_code}</p>
                  <p className="mt-1 text-sm text-zinc-600">Placed {formatDate(order.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">{order.status}</span>
                  {order.buyer_confirmed_delivery ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Delivered</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[96px_1fr]">
                <div className="h-20 w-full overflow-hidden rounded-lg bg-zinc-100 sm:w-20">
                  {order.product_image ? (
                    <img src={resolveImageUrl(order.product_image)} alt={order.product} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">No Image</div>
                  )}
                </div>

                <div className="text-sm text-zinc-700">
                  <p className="text-base font-semibold text-zinc-900">{order.product || 'Product'}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p>Quantity: <strong>{order.quantity ?? 1}</strong></p>
                    <p>Amount: <strong>{formatMoney(order.total_amount)}</strong></p>
                    <p>Payment Ref: <strong>{order.payment_reference || 'N/A'}</strong></p>
                    <p>Buyer: <strong>{order.buyer_name || 'N/A'}</strong></p>
                  </div>
                  <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{formatShippingAddress(order)}</p>
                </div>
              </div>

              <OrderStatusTimeline status={order.status} />

              {highlight ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingOrder(order);
                    setDeliveryRating(5);
                    setDeliveryNote('');
                  }}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  ✅ Confirm I Received This Order
                </button>
              ) : null}

              {order.buyer_confirmed_delivery ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <p className="font-semibold">Delivered ✅ Confirmed by you on {formatDate(order.buyer_confirmed_at)}</p>
                  <p className="mt-1">Rating: {'★'.repeat(Number(order.delivery_rating || 0)) || 'Not rated'}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {confirmingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">Did you receive your order in good condition?</h3>
            <p className="mt-1 text-sm text-zinc-600">Order {confirmingOrder.order_code}</p>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-zinc-800">Star Rating</p>
              <div className="flex items-center gap-1 text-2xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDeliveryRating(star)}
                    className={star <= deliveryRating ? 'text-amber-400' : 'text-zinc-300'}
                    aria-label={`Rate ${star}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-zinc-800">Note (optional)</label>
              <textarea
                value={deliveryNote}
                onChange={(event) => setDeliveryNote(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Share your feedback"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                disabled={submittingConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeliveryConfirmation}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-zinc-400"
                disabled={submittingConfirm}
              >
                {submittingConfirm ? 'Submitting...' : 'Yes, I received it ✅'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
