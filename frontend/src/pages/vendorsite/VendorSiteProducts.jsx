import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVendorSite } from './VendorSiteLayout';

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
  const { vendor_slug: vendorSlug } = useParams();
  const { allProducts, categories } = useVendorSite();
  const [activeCategory, setActiveCategory] = useState('All');

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

          return (
            <article key={product.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {product?.primary_image ? (
                  <img src={product.primary_image} alt={name} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm opacity-60">No image</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 text-sm font-semibold">{name}</h2>
                {discounted && discounted < price ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-600">{formatPrice(discounted)}</span>
                    <span className="text-xs line-through opacity-70">{formatPrice(price)}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-semibold">{formatPrice(price)}</p>
                )}

                <Link
                  to={`/store/${vendorSlug}/products/${product.id}`}
                  className="mt-4 inline-flex rounded-full px-4 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
                >
                  Order Now
                </Link>
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
