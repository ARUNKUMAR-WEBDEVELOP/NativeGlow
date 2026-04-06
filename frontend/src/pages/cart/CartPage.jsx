import { Link } from 'react-router-dom';

function CartPage({ cartItems, onIncreaseQty, onDecreaseQty, onRemoveItem }) {
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  if (cartItems.length === 0) {
    return (
      <section className="max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="font-display text-5xl text-zinc-900 max-md:text-4xl">Your Cart</h1>
        <p className="mt-3 text-sm text-zinc-700">Your cart is empty. Add products to continue.</p>
        <Link to="/" className="mt-4 inline-block rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">Back to Shop</Link>
      </section>
    );
  }

  return (
    <section className="max-w-4xl">
      <div className="rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h1 className="font-display text-5xl text-zinc-900 max-md:text-4xl">Your Cart</h1>
        <p className="mt-2 text-sm text-zinc-600">Review quantities, pricing, and head to checkout when ready.</p>
      </div>
      <div className="mt-5 space-y-3">
        {cartItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                <p className="text-sm text-zinc-600">${Number(item.price).toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onDecreaseQty(item.id)} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm">-</button>
                <span className="min-w-8 text-center text-sm font-semibold">{item.qty}</span>
                <button type="button" onClick={() => onIncreaseQty(item.id)} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm">+</button>
                <button type="button" onClick={() => onRemoveItem(item.id)} className="rounded-lg border border-rose-300 px-2 py-1 text-sm text-rose-700">Remove</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{itemCount}</p>
          </div>
          <div className="rounded-2xl bg-zinc-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Subtotal</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">${subtotal.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Checkout</p>
            <p className="mt-1 text-sm font-medium text-emerald-800">Shipping, coupons, and final totals are set on the next step.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">Shipping and discounts are calculated at checkout.</p>
          <Link to="/checkout" className="inline-flex rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700">Proceed to Checkout</Link>
        </div>
      </div>
    </section>
  );
}

export default CartPage;
