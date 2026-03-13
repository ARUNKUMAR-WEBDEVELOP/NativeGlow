import { Link } from 'react-router-dom';

function CartPage({ cartItems, onIncreaseQty, onDecreaseQty, onRemoveItem }) {
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

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
        <p className="mt-2 text-sm text-zinc-600">Review quantities and head to checkout when ready.</p>
      </div>
      <div className="mt-5 space-y-3">
        {cartItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                <p className="text-sm text-zinc-600">${item.price} each</p>
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
      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-lg font-bold text-zinc-900">Subtotal: ${subtotal.toFixed(2)}</p>
        <p className="mt-1 text-sm text-zinc-600">Shipping and discounts are calculated at checkout.</p>
        <Link to="/checkout" className="mt-4 inline-block rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">Proceed to Checkout</Link>
      </div>
    </section>
  );
}

export default CartPage;
