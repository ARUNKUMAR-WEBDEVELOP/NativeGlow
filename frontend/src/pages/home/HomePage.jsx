import { useEffect, useState } from 'react';
import ProductCard from '../../components/ProductCard';
import { api } from '../../api';

function HomePage({ onAddToCart }) {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState('');

  const trustSignals = [
    'Natural Ingredient Focus',
    'Skin-Friendly Care',
    'Breathable Cotton and Linen',
    'Secure Checkout',
  ];

  const discountStrategies = [
    { title: 'Percentage Off', text: '10% to 15% collection-level seasonal discounts.' },
    { title: 'Fixed Discount', text: '$5 or $10 off once customer crosses order threshold.' },
    { title: 'Free Shipping', text: 'Auto free shipping above selected cart value.' },
    { title: 'BOGO', text: 'Buy One Get One offers for selected bundles and pairings.' },
  ];

  const appSetup = [
    'Judge.me Reviews',
    'Shopify Search & Discovery',
    'Shopify Bundles',
    'Shopify Marketplace Connect',
    'Shopify Subscriptions',
    'Labeler - Product Labels',
  ];

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [c, f, b, n, v] = await Promise.all([
          api.getCategories(),
          api.getFeaturedProducts(),
          api.getBestSellers(),
          api.getNewArrivals(),
          api.getVendors(),
        ]);
        if (!active) {
          return;
        }
        setCategories(c);
        setFeatured(f);
        setBestSellers(b);
        setNewArrivals(n);
        setVendors(v);
      } catch {
        if (active) {
          setError('Could not connect to backend API. Start Django server on port 8000.');
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-[#e5f0d6] via-[#fbf7ec] to-[#f2e4d0] p-7 shadow-sm">
        <p className="inline-flex rounded-full bg-sage px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">NativeGlow Premium Marketplace</p>
        <h1 className="mt-3 font-display text-6xl leading-[0.9] text-zinc-900 max-md:text-4xl">Luxury Ayurvedic Care.<br />Premium Everyday Comfort.</h1>
        <p className="mt-3 max-w-3xl text-zinc-700">
          Curated skincare and clothing collections built around high-quality natural ingredients, trusted craftsmanship, and verified seller standards.
        </p>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      ) : null}

      <section className="mt-6">
        <h2 className="font-display text-3xl text-zinc-900">Trust Signals</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustSignals.map((signal) => (
            <article key={signal} className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-700 shadow-sm">
              {signal}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Featured Collections</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <article key={cat.id} className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
              <h3 className="font-display text-2xl text-zinc-900">{cat.name}</h3>
              <p className="mt-2 text-sm text-zinc-600">{cat.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Premium Signature Products</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Best Sellers</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">New Arrivals</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Discount Strategies</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {discountStrategies.map((discount) => (
            <article key={discount.title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-zinc-900">{discount.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{discount.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Essential App Setup</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {appSetup.map((app) => (
            <article key={app} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-zinc-900">{app}</h3>
              <p className="mt-1 text-sm text-zinc-600">Enable widgets, align design to brand, and test functionality.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Collaborating Natural Sellers</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.length === 0 ? (
            <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-zinc-900">Vendor onboarding is live</h3>
              <p className="mt-1 text-sm text-zinc-600">No approved public vendor profiles yet. Admin can approve from backend review queue.</p>
            </article>
          ) : (
            vendors.map((vendor) => (
              <article key={vendor.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-zinc-900">{vendor.brand_name}</h3>
                <p className="mt-1 text-sm text-zinc-600">{vendor.description}</p>
                <p className="mt-2 text-xs text-zinc-500">{vendor.city}, {vendor.state}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}

export default HomePage;
