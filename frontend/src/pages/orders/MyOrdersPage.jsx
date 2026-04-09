import { useEffect, useState } from 'react';
import { api } from '../../api';
import useApiRequest from '../../hooks/useApiRequest';

function getBuyerTokenEntries() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith('buyer_token_'))
    .map((key) => ({
      vendorSlug: key.replace('buyer_token_', ''),
      token: localStorage.getItem(key),
    }))
    .filter((entry) => entry.token && entry.vendorSlug);
}

function isShippedStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return normalized.includes('shipped') || normalized.includes('out_for_delivery') || normalized.includes('in_transit');
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

function MyOrdersPage({ tokens, onTokensUpdate, onAuthExpired }) {
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [submittingConfirm, setSubmittingConfirm] = useState(false);
  const [actionError, setActionError] = useState('');

  const accountOrdersRequest = useApiRequest(
    () => api.getMyOrders(tokens, onTokensUpdate, onAuthExpired),
    [tokens?.access, tokens?.refresh],
    {
      immediate: Boolean(tokens?.access),
      initialData: [],
      cacheKey: tokens?.access ? `orders:account:${tokens.access.slice(-16)}` : '',
      cacheTtlMs: 60 * 1000,
    }
  );

  const buyerTokenEntries = getBuyerTokenEntries();
  const buyerCacheSignature = buyerTokenEntries
    .map((entry) => `${entry.vendorSlug}:${String(entry.token).slice(-8)}`)
    .sort()
    .join('|');

  const buyerOrdersRequest = useApiRequest(
    async () => {
      if (!buyerTokenEntries.length) {
        return [];
      }

      const results = await Promise.all(
        buyerTokenEntries.map(async (entry) => {
          try {
            const list = await api.getBuyerOrders(entry.token);
            return (Array.isArray(list) ? list : []).map((item) => ({
              ...item,
              vendor_slug: entry.vendorSlug,
              _buyerToken: entry.token,
            }));
          } catch {
            return [];
          }
        })
      );

      return results.flat();
    },
    [buyerCacheSignature],
    {
      immediate: true,
      initialData: [],
      cacheKey: `orders:buyer:multi-store:${buyerCacheSignature || 'none'}`,
      cacheTtlMs: 45 * 1000,
    }
  );

  const orders = Array.isArray(accountOrdersRequest.data) ? accountOrdersRequest.data : [];
  const buyerOrders = Array.isArray(buyerOrdersRequest.data) ? buyerOrdersRequest.data : [];
  const loading = accountOrdersRequest.loading;
  const buyerLoading = buyerOrdersRequest.loading;
  const error = accountOrdersRequest.error;
  const buyerError = actionError || buyerOrdersRequest.error;

  async function submitDeliveryConfirmation() {
    if (!confirmingOrder?._buyerToken || !confirmingOrder?.order_code) {
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
        confirmingOrder._buyerToken
      );

      buyerOrdersRequest.setData((prev) =>
        prev.map((item) =>
          item.order_code === confirmingOrder.order_code && item.vendor_slug === confirmingOrder.vendor_slug
            ? { ...item, buyer_confirmed_delivery: true, status: 'delivered' }
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

  return (
    <section className="max-w-5xl">
      <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Account</p>
        <h1 className="mt-2 font-display text-5xl text-zinc-900 max-md:text-4xl">My Orders</h1>
        <p className="mt-2 text-sm text-zinc-600">Track your recent purchases, shipping details, and payment references in one place.</p>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-zinc-600">Loading orders...</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {!loading && !error && orders.length === 0 ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">No orders yet. Start shopping to create your first order.</p>
      ) : null}

      <div className="mt-5 space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Order #{order.id}</p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-900">{order.items?.length || 0} item order</h2>
                <p className="text-sm text-zinc-600">Placed {new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{order.status}</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">Payment {order.payment_status}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-zinc-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subtotal</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">${Number(order.subtotal).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Shipping</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">${Number(order.shipping_fee).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Discount</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">-${Number(order.discount_total).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total</p>
                <p className="mt-1 text-lg font-semibold text-emerald-800">${Number(order.total).toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Shipping</p>
                <p className="mt-1 leading-6">{formatShippingAddress(order)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Payment</p>
                <p className="mt-1">Ref: {order.payment_reference || 'pending-generation'}</p>
                <p className="mt-1">Coupon: {order.coupon_code || 'none'}</p>
              </div>
            </div>

            <ul className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm text-zinc-700">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product_title} x {item.quantity} = ${Number(item.line_total).toFixed(2)}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Buyer</p>
        <h2 className="mt-2 text-3xl font-bold text-zinc-900 max-md:text-2xl">Vendor Store Orders</h2>
        <p className="mt-2 text-sm text-zinc-600">Orders placed from vendor sites using Google buyer login.</p>
      </div>

      {buyerLoading ? <p className="mt-4 text-sm font-semibold text-zinc-600">Loading buyer orders...</p> : null}
      {buyerError ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{buyerError}</p> : null}

      {!buyerLoading && !buyerError && buyerOrders.length === 0 ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">No vendor-site buyer orders yet.</p>
      ) : null}

      <div className="mt-5 space-y-3">
        {buyerOrders.map((order) => (
          <article key={`${order.vendor_slug}-${order.order_code}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900">{order.product}</h3>
                <p className="text-sm text-zinc-600">Order Code: {order.order_code}</p>
                <p className="text-xs text-zinc-500">Store: {order.vendor_slug}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{order.status}</span>
                {order.buyer_confirmed_delivery ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">Delivery Confirmed</span>
                ) : null}
              </div>
            </div>

            {isShippedStatus(order.status) && !order.buyer_confirmed_delivery ? (
              <button
                type="button"
                onClick={() => {
                  setConfirmingOrder(order);
                  setDeliveryRating(5);
                  setDeliveryNote('');
                }}
                className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Confirm Delivery Received
              </button>
            ) : null}
          </article>
        ))}
      </div>

      {confirmingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">Did you receive your order in good condition?</h3>
            <p className="mt-1 text-sm text-zinc-600">Order {confirmingOrder.order_code}</p>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-zinc-800">Rating</p>
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
                placeholder="Share your delivery experience"
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
    </section>
  );
}

export default MyOrdersPage;
