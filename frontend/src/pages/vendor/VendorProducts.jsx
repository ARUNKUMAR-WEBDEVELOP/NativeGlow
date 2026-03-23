import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditProductModal from './EditProductModal';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function statusBadgeClasses(status) {
  if (status === 'approved') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'rejected') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function VendorProducts() {
  const navigate = useNavigate();
  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [quantityDraft, setQuantityDraft] = useState({});

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorSession?.access || ''}`,
    }),
    [vendorSession?.access]
  );

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/vendor/products/`, { headers: authHeaders });
      if (!res.ok) {
        let detail = `Failed to fetch products (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorSession?.access) {
      navigate('/vendor/login', { replace: true });
      return;
    }
    fetchProducts();
  }, [navigate, vendorSession?.access]);

  const onDelete = async (productId) => {
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/delete/`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (!res.ok && res.status !== 204) {
        let detail = `Delete failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) => prev.filter((item) => item.id !== productId));
      setSuccess('Product deleted successfully.');
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  const onToggleAvailable = async (product) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/vendor/products/${product.id}/status/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_available: !product.is_active }),
      });

      if (!res.ok) {
        let detail = `Status update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, is_active: !item.is_active } : item))
      );
      setSuccess('Availability updated.');
    } catch (err) {
      setError(err.message || 'Could not update availability.');
    }
  };

  const onUpdateQuantity = async (productId) => {
    const value = quantityDraft[productId];
    if (value === undefined || value === '') {
      setError('Enter quantity before updating.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const qty = Number(value);
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/quantity/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ available_quantity: qty }),
      });

      if (!res.ok) {
        let detail = `Quantity update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, available_quantity: qty } : item))
      );
      setSuccess('Quantity updated successfully.');
    } catch (err) {
      setError(err.message || 'Could not update quantity.');
    }
  };

  const onSaveEdit = async (payload) => {
    if (!editingProduct) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/vendor/products/${editingProduct.id}/edit/`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = `Update failed (${res.status})`;
        try {
          const data = await res.json();
          detail = data.detail || data.error || JSON.stringify(data);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setEditingProduct(null);
      setSuccess('Product updated successfully.');
      await fetchProducts();
    } catch (err) {
      setError(err.message || 'Could not update product.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">My Products</h2>
          <p className="text-sm text-zinc-600">Manage your product catalog and stock availability.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/vendor/dashboard/products/new')}
          className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white"
        >
          Add New Product
        </button>
      </div>

      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Quantity</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Available</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">Loading products...</td>
              </tr>
            ) : null}

            {!loading && products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">No products found.</td>
              </tr>
            ) : null}

            {!loading && products.map((product) => (
              <tr key={product.id} className="border-t border-zinc-100 align-top">
                <td className="px-3 py-3">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="h-14 w-14 rounded-lg border border-zinc-200 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">No Image</div>
                  )}
                </td>
                <td className="px-3 py-3 font-semibold text-zinc-800">
                  <div>{product.title}</div>
                  {product.status === 'rejected' && product.rejection_reason ? (
                    <p className="mt-1 text-xs font-normal text-rose-700">Reason: {product.rejection_reason}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">INR {product.price}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={quantityDraft[product.id] ?? product.available_quantity}
                      onChange={(e) =>
                        setQuantityDraft((prev) => ({
                          ...prev,
                          [product.id]: e.target.value,
                        }))
                      }
                      className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(product.id)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700"
                    >
                      Update
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3 capitalize">{String(product.category_type || 'other').replace('_', ' ')}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClasses(product.status)}`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(product.is_active)}
                    onClick={() => onToggleAvailable(product)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${product.is_active ? 'bg-sage' : 'bg-zinc-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${product.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(product)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(product.id)}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={onSaveEdit}
      />
    </section>
  );
}

export default VendorProducts;
