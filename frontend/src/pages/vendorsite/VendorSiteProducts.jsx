import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useVendorSite } from './VendorSiteLayout';
import { useBuyerAuth } from '../../components/vendorsite/BuyerAuthContext';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value) {
  return `Rs ${toNumber(value).toLocaleString('en-IN')}`;
}

function getProductCategory(product) {
  return String(product?.category || product?.category_type || '').trim();
}

export default function VendorSiteProducts() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useBuyerAuth();
  const { allProducts, categories } = useVendorSite();
  const [activeCategory, setActiveCategory] = useState('All');
  const [actionMessage, setActionMessage] = useState('');

  const requireBuyerLogin = (nextPath) => {
    if (isLoggedIn) {
      return true;
    }
    const fallbackNext = nextPath || location.pathname;
    navigate(`/store/${vendorSlug}/login?next=${encodeURIComponent(fallbackNext)}`);
    return false;
  };

  const addToCart = (product) => {
    const detailPath = `/store/${vendorSlug}/product/${product.id}`;
    if (!requireBuyerLogin(detailPath)) {
      return;
    }

    const storageKey = `vendor_store_cart_${vendorSlug}`;
    let current = [];
    try {
      current = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      current = [];
    }

    const existing = current.find((item) => item.id === product.id);
    const next = existing
      ? current.map((item) => (item.id === product.id ? { ...item, qty: (item.qty || 1) + 1 } : item))
      : [
          ...current,
          {
            id: product.id,
            name: product?.name || product?.title || 'Product',
            price: toNumber(product?.discounted_price ?? product?.price),
            image: product?.primary_image || null,
            qty: 1,
          },
        ];

    localStorage.setItem(storageKey, JSON.stringify(next));
    setActionMessage('Product added to cart.');
  };

  const orderNow = (productId) => {
    const detailPath = `/store/${vendorSlug}/product/${productId}`;
    if (!requireBuyerLogin(detailPath)) {
      return;
    }
    navigate(detailPath, { state: { openOrder: true } });
  };

  const pills = useMemo(() => {
    const categoryList = Array.isArray(categories) && categories.length
      ? categories
      : Array.from(new Set(allProducts.map((p) => getProductCategory(p)).filter(Boolean)));
    return ['All', ...categoryList];
  }, [allProducts, categories]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') {
      return allProducts;
    }
    return allProducts.filter((product) => getProductCategory(product).toLowerCase() === activeCategory.toLowerCase());
  }, [allProducts, activeCategory]);

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--heading-font)' }}>All Products</h1>
        <p className="mt-1 text-sm opacity-80">Browse by category and order directly from the store.</p>
        {actionMessage ? <p className="mt-2 text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {pills.map((pill) => {
          const active = activeCategory === pill;
          return (
            <button
              key={pill}
              type="button"
              onClick={() => setActiveCategory(pill)}
              className="rounded-full px-3 py-1.5 text-sm"
              style={{
                backgroundColor: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--secondary)' : 'var(--site-text)',
                border: `1px solid ${active ? 'var(--primary)' : 'rgba(0,0,0,0.12)'}`,
              }}
            >
              {pill}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => {
          const name = product?.name || product?.title || 'Product';
          const price = toNumber(product?.price);
          const discounted = product?.discounted_price != null ? toNumber(product.discounted_price) : null;
          const hasDiscount = discounted && discounted < price;
          const discountPercent = toNumber(product?.discount_percent);
          const detailPath = `/store/${vendorSlug}/product/${product.id}`;

          return (
            <article key={product.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <Link to={detailPath} className="block aspect-[4/3] overflow-hidden bg-slate-100">
                {product?.primary_image ? (
                  <img src={product.primary_image} alt={name} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm opacity-60">No image</div>
                )}
              </Link>
              <div className="p-4">
                <Link to={detailPath} className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-emerald-700">
                  {name}
                </Link>
                {hasDiscount ? (
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-red-600">{formatPrice(discounted)}</span>
                    <span className="text-xs line-through opacity-70">{formatPrice(price)}</span>
                    {discountPercent > 0 ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-semibold">{formatPrice(price)}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => orderNow(product.id)}
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
                  >
                    Order Now
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">
          No products are live for this category yet.
        </div>
      ) : null}
    </div>
  );
}
