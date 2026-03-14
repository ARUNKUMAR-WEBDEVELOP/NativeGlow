import { useEffect, useState } from 'react';
import ProductCard from '../../components/ProductCard';
import { api } from '../../api';

function HomePage({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const allProducts = await api.getProducts();
        if (!active) {
          return;
        }
        const brandProducts = allProducts.filter(
          (item) => (item.vendor_name || 'NativeGlow') === 'NativeGlow'
        );
        setProducts(brandProducts.length ? brandProducts : allProducts);
        setError('');
      } catch (err) {
        if (active) {
          const message = err?.message || 'Could not fetch data from backend API.';
          setError(message);
          setProducts([]);
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
        <p className="inline-flex rounded-full bg-sage px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">NativeGlow Brand Store</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">NativeGlow Products</h1>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      ) : null}

      <section className="mt-7">
        <h2 className="font-display text-3xl text-zinc-900">Products</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && !error ? (
            <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-zinc-900">No products available</h3>
              <p className="mt-1 text-sm text-zinc-600">Please add products in backend and refresh this page.</p>
            </article>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
            ))
          )}
        </div>
      </section>
    </>
  );
}

export default HomePage;
