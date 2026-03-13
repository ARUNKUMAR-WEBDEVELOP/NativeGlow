import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

function CheckoutPage({ cartItems, tokens, onTokensUpdate, onAuthExpired }) {
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const [placing, setPlacing] = useState(false);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    coupon_code: '',
    notes: '',
  });

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!cartItems.length) {
      setError('Your cart is empty. Add products before checkout.');
      return;
    }

    const payload = {
      ...form,
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
      })),
    };

    setPlacing(true);
    try {
      const order = await api.createOrder(payload, tokens, onTokensUpdate, onAuthExpired);
      setPlacedOrder(order);
      setSuccess(`Order placed successfully. Order ID: #${order.id}`);
    } catch (err) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const onCreatePaymentIntent = async () => {
    if (!placedOrder?.id) {
      setError('Place your order first to generate a payment intent.');
      return;
    }
    setError('');
    setCreatingIntent(true);
    try {
      const intent = await api.createPaymentIntent(
        placedOrder.id,
        tokens,
        onTokensUpdate,
        onAuthExpired
      );
      setPaymentIntent(intent);
    } catch (err) {
      setError(err.message || 'Failed to create payment intent.');
    } finally {
      setCreatingIntent(false);
    }
  };

  return (
    <section className="max-w-5xl">
      <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h1 className="font-display text-5xl text-zinc-900 max-md:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-zinc-700">Place your order, apply coupons, and generate a payment intent for gateway integration.</p>
      </div>

      <form onSubmit={onSubmitOrder} className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Shipping and Contact</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="full_name" value={form.full_name} onChange={onChange} placeholder="Full name" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="email" value={form.email} onChange={onChange} placeholder="Email" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="address_line1" value={form.address_line1} onChange={onChange} placeholder="Address line 1" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="address_line2" value={form.address_line2} onChange={onChange} placeholder="Address line 2" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" />
          <input name="city" value={form.city} onChange={onChange} placeholder="City" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="state" value={form.state} onChange={onChange} placeholder="State" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="pincode" value={form.pincode} onChange={onChange} placeholder="Pincode" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="country" value={form.country} onChange={onChange} placeholder="Country" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" required />
          <input name="coupon_code" value={form.coupon_code} onChange={onChange} placeholder="Coupon code (e.g. NATURAL12)" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage sm:col-span-2" />
        </div>
        <textarea name="notes" value={form.notes} onChange={onChange} placeholder="Order notes (optional)" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-sage" rows={2} />

        <button type="submit" disabled={placing} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50">
          {placing ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Order Summary</h2>
        {cartItems.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No items in cart. <Link to="/" className="font-semibold text-zinc-900 underline">Shop now</Link></p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {cartItems.map((item) => (
              <li key={item.id}>{item.title} x {item.qty} = ${(Number(item.price) * item.qty).toFixed(2)}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-lg font-bold text-zinc-900">Total: ${subtotal.toFixed(2)}</p>

        {placedOrder ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Order #{placedOrder.id} created.</p>
            <button
              type="button"
              onClick={onCreatePaymentIntent}
              disabled={creatingIntent}
              className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {creatingIntent ? 'Creating payment intent...' : 'Generate Payment Intent'}
            </button>
            {paymentIntent ? (
              <p className="mt-2 text-xs text-zinc-700">
                Stub ready: {paymentIntent.provider} | Ref: {paymentIntent.reference}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {success ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default CheckoutPage;
