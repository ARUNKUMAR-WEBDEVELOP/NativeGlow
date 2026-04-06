import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function VendorAddProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_type: 'other',
    ingredients: '',
    price: '',
    available_quantity: 0,
    is_natural_certified: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let tokens;
    try {
      tokens = JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      tokens = null;
    }

    if (!tokens?.access) {
      navigate('/vendor/login', { replace: true });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/vendor/products/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({
          ...form,
          name: form.title,
          short_description: form.description.slice(0, 140),
          tags: '',
          product_type: 'skincare',
          unit: 'pcs',
        }),
      });

      if (!res.ok) {
        let detail = `Add product failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      navigate('/dashboard?tab=products');
    } catch (err) {
      setError(err.message || 'Unable to add product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-3xl">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-zinc-900">Add New Product</h2>
        <p className="mt-1 text-sm text-zinc-600">Create a new product and submit for admin approval.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input name="title" value={form.title} onChange={onChange} placeholder="Product name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          <div className="grid gap-3 md:grid-cols-2">
            <select name="category_type" value={form.category_type} onChange={onChange} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm">
              <option value="face_wash">Face Wash</option>
              <option value="soap">Soap</option>
              <option value="serum">Serum</option>
              <option value="moisturizer">Moisturizer</option>
              <option value="hair_oil">Hair Oil</option>
              <option value="other">Other</option>
            </select>
            <input name="ingredients" value={form.ingredients} onChange={onChange} placeholder="Ingredients" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={onChange} placeholder="Price" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
            <input type="number" min="0" name="available_quantity" value={form.available_quantity} onChange={onChange} placeholder="Quantity" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="is_natural_certified" checked={form.is_natural_certified} onChange={onChange} className="h-4 w-4 rounded border-zinc-300 text-sage" />
            Natural certified
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/dashboard?tab=products')} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Saving...' : 'Add Product'}</button>
          </div>
        </form>
      </div>
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default VendorAddProduct;
