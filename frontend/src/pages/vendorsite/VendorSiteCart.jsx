import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useBuyerAuth } from '../../components/vendorsite/BuyerAuthContext';

function getCartKey(vendorSlug) {
  return `vendor_store_cart_${vendorSlug}`;
}

function toPrice(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value) {
  return `Rs ${toPrice(value).toLocaleString('en-IN')}`;
}

export default function VendorSiteCart() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const navigate = useNavigate();
  const { isLoggedIn, ready } = useBuyerAuth();

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!vendorSlug) {
      setItems([]);
      return;
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(getCartKey(vendorSlug)) || '[]');
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [vendorSlug]);

  useEffect(() => {
    if (!vendorSlug) {
      return;
    }
    localStorage.setItem(getCartKey(vendorSlug), JSON.stringify(items));
  }, [items, vendorSlug]);

  const totals = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + toPrice(item.price) * Number(item.qty || 0), 0);
    return { itemCount, subtotal };
  }, [items]);

  function increaseQty(productId) {
    setItems((prev) => prev.map((item) => (
      item.id === productId ? { ...item, qty: Number(item.qty || 0) + 1 } : item
    )));
  }

  function decreaseQty(productId) {
    setItems((prev) => prev
      .map((item) => (item.id === productId ? { ...item, qty: Math.max(1, Number(item.qty || 0) - 1) } : item))
    );
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  }

  function startOrder(productId) {
    if (!ready) {
      return;
    }
    const target = `/store/${vendorSlug}/product/${productId}`;
    if (!isLoggedIn) {
      navigate(`/store/${vendorSlug}/login?next=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target, { state: { openOrder: true } });
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'var(--heading-font)' }}>
          Store Cart
        </h1>
        <p className="mt-1 text-sm opacity-80">Review items added from this store and start order from each product card.</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center">
          <p className="text-sm text-zinc-700">Your store cart is empty.</p>
          <Link
            to={`/store/${vendorSlug}/products`}
            className="mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    {item.image ? (
                      <img src={resolveImageUrl(item.image)} alt={item.name || 'Product'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-zinc-900">{item.name || 'Product'}</p>
                    <p className="mt-1 text-sm text-zinc-600">{formatPrice(item.price)} each</p>
                    <p className="mt-1 text-sm font-medium text-zinc-800">Line total: {formatPrice(toPrice(item.price) * Number(item.qty || 0))}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => decreaseQty(item.id)} className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm">-</button>
                    <span className="min-w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button type="button" onClick={() => increaseQty(item.id)} className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm">+</button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => startOrder(item.id)}
                      disabled={!ready}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
                    >
                      Start Order
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Cart Summary</h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <p>Items: <span className="font-semibold text-zinc-900">{totals.itemCount}</span></p>
              <p>Subtotal: <span className="font-semibold text-zinc-900">{formatPrice(totals.subtotal)}</span></p>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Shipping and payment are finalized inside each product order flow.</p>
            <Link
              to={`/store/${vendorSlug}/products`}
              className="mt-4 inline-flex rounded-lg border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
