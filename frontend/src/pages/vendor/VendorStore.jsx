import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderFormModal from '../../components/vendor/OrderFormModal';
import { resolveImageUrl } from '../../utils/imageUrl';

function formatAttributeLabel(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAttributeValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value);
}

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function normalizeWhatsappNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

function VendorStore() {
  const { vendor_slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const whatsappNumber = useMemo(
    () => normalizeWhatsappNumber(store?.whatsapp_number),
    [store?.whatsapp_number]
  );

  useEffect(() => {
    let mounted = true;

    async function loadStore() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/store/${vendor_slug}/`);
        if (!res.ok) {
          let detail = `Unable to load store (${res.status})`;
          try {
            const payload = await res.json();
            detail = payload.detail || payload.error || JSON.stringify(payload);
          } catch {
            // keep default detail
          }
          throw new Error(detail);
        }

        const data = await res.json();
        if (!mounted) {
          return;
        }
        setStore(data);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err.message || 'Store could not be loaded.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStore();
    return () => {
      mounted = false;
    };
  }, [vendor_slug]);

  const onOrderSuccess = (message) => {
    setSuccess(message);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-sage/20 bg-gradient-to-br from-[#f8f7ef] via-[#edf3e6] to-[#e8dcc9] p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Natural Products Store</span>
        </div>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">
          {store?.business_name || 'Vendor Store'}
        </h1>
        <p className="mt-2 text-sm text-zinc-700">{store?.city || 'City not available'}</p>
      </div>

      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">Loading store...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(store?.products || []).map((product) => (
            <article key={product.id || `${product.name}-${product.price}`} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="h-48 bg-zinc-100">
                {product.image ? (
                  <img src={resolveImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image</div>
                )}
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900">{product.name}</h2>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">100% Natural</span>
                </div>

                <p className="text-sm font-bold text-zinc-800">INR {product.price}</p>
                <p className="text-xs text-zinc-600">Ingredients: {product.ingredients || 'Not provided'}</p>

                {Object.entries(product.product_attributes || {})
                  .filter(([, value]) => formatAttributeValue(value))
                  .slice(0, 2)
                  .length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.product_attributes || {})
                      .filter(([, value]) => formatAttributeValue(value))
                      .slice(0, 2)
                      .map(([key, value]) => (
                        <span key={key} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-700">
                          {formatAttributeLabel(key)}: {formatAttributeValue(value)}
                        </span>
                      ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`I want to order ${product.name}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                  >
                    Buy via WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="rounded-xl bg-sage px-3 py-2 text-xs font-semibold text-white"
                  >
                    Order Now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600 shadow-sm">
        NativeGlow provides platform services only. Payments are made directly to vendors. NativeGlow is not responsible for vendor products.
      </footer>

      <OrderFormModal
        isOpen={Boolean(selectedProduct)}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSuccess={onOrderSuccess}
      />
    </section>
  );
}

export default VendorStore;
