import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';

function ProductImagePanel({ product }) {
  const gallery = product.images?.length ? product.images : [];
  const primary = gallery[0]?.image_url || null;

  if (!primary) {
    return (
      <div className="relative min-h-80 rounded-3xl border border-zinc-200 bg-gradient-to-br from-sand/70 via-white to-cream p-6 shadow-sm">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-sage/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-clay/20 blur-2xl" />
        <p className="relative text-sm font-semibold text-zinc-700">Modern product visuals are ready.</p>
        <p className="relative mt-2 text-xs text-zinc-500">Add media in admin to replace this hero panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <img src={primary} alt={product.title} className="h-[360px] w-full object-cover sm:h-[420px]" loading="lazy" />
      </div>
      {gallery.length > 1 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.slice(1).map((img) => (
            <img
              key={img.id}
              src={img.image_url}
              alt={img.alt_text || product.title}
              className="h-28 w-full rounded-2xl border border-zinc-200 object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProductDetailPage({ onAddToCart, isAuthenticated }) {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await api.getProductBySlug(slug);
        const allProducts = await api.getProducts();
        if (active) {
          setProduct(data);
          const relatedProducts = allProducts
            .filter((item) => item.slug !== data.slug)
            .filter((item) => item.category_name === data.category?.name)
            .slice(0, 4);
          setRelated(relatedProducts);
        }
      } catch {
        if (active) {
          setError('Could not load product details.');
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>;
  }

  if (!product) {
    return <p className="text-sm text-zinc-600">Loading product...</p>;
  }

  return (
    <section className="pb-20">
      <article className="grid gap-6 lg:grid-cols-2">
        <ProductImagePanel product={product} />

        <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage">{product.category?.name || 'Product'}</p>
          <h1 className="font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">{product.title}</h1>
          <p className="text-sm text-zinc-700">{product.description}</p>
          <p className="text-2xl font-extrabold text-sage">${product.price}</p>
          <p className="text-xs text-zinc-500">SKU: {product.sku} | Vendor: {product.vendor_name || 'NativeGlow'}</p>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="hidden rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 md:inline-flex"
            >
              Add to Cart
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 md:inline-flex"
            >
              Login to Add Cart
            </Link>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-cream p-3">
              <h3 className="font-semibold text-zinc-900">Ingredients / Material</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {(product.ingredient_points || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-cream p-3">
              <h3 className="font-semibold text-zinc-900">How It Works</h3>
              <p className="mt-2 text-sm text-zinc-700">{product.how_it_works}</p>
            </article>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="font-semibold text-zinc-900">Benefits</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {(product.benefits || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="font-semibold text-zinc-900">Usage</h3>
              <ol className="mt-2 space-y-1 text-sm text-zinc-700">
                {(product.usage_steps || []).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          </div>

          <article className="rounded-2xl border border-zinc-200 bg-cream p-3">
            <h3 className="font-semibold text-zinc-900">Shipping & Support</h3>
            <p className="mt-2 text-sm text-zinc-700">{product.shipping_info || 'Processing 1-2 days, delivery 5-8 business days'}</p>
          </article>
        </div>
      </article>

      {related.length ? (
        <section className="mt-8 rounded-3xl border border-zinc-200 bg-white/85 p-5 shadow-sm">
          <h2 className="font-display text-3xl text-zinc-900">Related Premium Picks</h2>
          <p className="mt-1 text-sm text-zinc-600">Products with similar criteria, material profile, and natural-care intent.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                {item.primary_image ? (
                  <img src={item.primary_image} alt={item.title} className="h-28 w-full rounded-xl border border-zinc-200 object-cover" loading="lazy" />
                ) : null}
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-1 text-xs text-zinc-600">{item.short_description}</p>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => onAddToCart(item)}
                    className="mt-2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="mt-2 inline-block rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Login to Add
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-900 p-3 text-white md:hidden">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="w-full rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-white"
          >
            Add to Cart - ${product.price}
          </button>
        ) : (
          <Link
            to="/login"
            className="block w-full rounded-xl bg-sage px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Login to Add Cart
          </Link>
        )}
      </div>
    </section>
  );
}

export default ProductDetailPage;
