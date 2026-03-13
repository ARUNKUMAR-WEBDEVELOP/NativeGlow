import { useEffect, useState } from 'react';
import { api } from '../../api';

function MyOrdersPage({ tokens, onTokensUpdate, onAuthExpired }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getMyOrders(tokens, onTokensUpdate, onAuthExpired);
        if (!mounted) {
          return;
        }
        setOrders(data);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Could not load your orders.');
        }
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
  }, [tokens, onTokensUpdate, onAuthExpired]);

  return (
    <section className="max-w-5xl">
      <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Account</p>
        <h1 className="mt-2 font-display text-5xl text-zinc-900 max-md:text-4xl">My Orders</h1>
        <p className="mt-2 text-sm text-zinc-600">Track your recent purchases and payment references in one place.</p>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-zinc-600">Loading orders...</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {!loading && !error && orders.length === 0 ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">No orders yet. Start shopping to create your first order.</p>
      ) : null}

      <div className="mt-5 space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-zinc-900">Order #{order.id}</h2>
                <p className="text-sm text-zinc-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{order.status}</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">Payment {order.payment_status}</span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              <p><span className="font-semibold text-zinc-800">Subtotal:</span> ${Number(order.subtotal).toFixed(2)}</p>
              <p><span className="font-semibold text-zinc-800">Shipping:</span> ${Number(order.shipping_fee).toFixed(2)}</p>
              <p><span className="font-semibold text-zinc-800">Discount:</span> -${Number(order.discount_total).toFixed(2)}</p>
              <p className="font-semibold text-zinc-900"><span className="font-semibold text-zinc-800">Total:</span> ${Number(order.total).toFixed(2)}</p>
            </div>

            <p className="mt-3 text-xs text-zinc-600">Payment ref: {order.payment_reference || 'pending-generation'} | Coupon: {order.coupon_code || 'none'}</p>

            <ul className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-sm text-zinc-700">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product_title} x {item.quantity} = ${Number(item.line_total).toFixed(2)}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default MyOrdersPage;
