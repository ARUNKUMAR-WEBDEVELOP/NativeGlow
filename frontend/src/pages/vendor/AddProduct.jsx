import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function AddProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    category_type: 'face_wash',
    description: '',
    ingredients: '',
    price: '',
    available_quantity: 0,
    is_natural_certified: false,
    image: null,
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!form.image) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.image);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.image]);

  useEffect(() => {
    if (!vendorSession?.access) {
      navigate('/vendor/login', { replace: true });
    }
  }, [navigate, vendorSession?.access]);

  const onInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm((prev) => ({ ...prev, image: files?.[0] || null }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!vendorSession?.access) {
      navigate('/vendor/login', { replace: true });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      const normalizedCategory = form.category_type === 'toner' ? 'other' : form.category_type;

      formData.append('title', form.title);
      formData.append('name', form.title);
      formData.append('category_type', normalizedCategory);
      formData.append('description', form.description);
      formData.append('short_description', form.description.slice(0, 140));
      formData.append('ingredients', form.ingredients);
      formData.append('price', String(form.price));
      formData.append('available_quantity', String(form.available_quantity));
      formData.append('is_natural_certified', String(form.is_natural_certified));
      formData.append('tags', '');
      formData.append('product_type', 'skincare');
      formData.append('unit', 'pcs');

      if (form.image) {
        formData.append('image', form.image);
      }

      const res = await fetch(`${API_BASE}/vendor/products/add/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vendorSession.access}`,
        },
        body: formData,
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

      setSuccess('Product submitted for admin approval');
      setForm({
        title: '',
        category_type: 'face_wash',
        description: '',
        ingredients: '',
        price: '',
        available_quantity: 0,
        is_natural_certified: false,
        image: null,
      });
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
        <p className="mt-1 text-sm text-zinc-600">Create a product listing and submit it for admin approval.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Product Name</label>
            <input
              name="title"
              value={form.title}
              onChange={onInputChange}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Category</label>
            <select
              name="category_type"
              value={form.category_type}
              onChange={onInputChange}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="face_wash">face_wash</option>
              <option value="soap">soap</option>
              <option value="serum">serum</option>
              <option value="toner">toner</option>
              <option value="moisturizer">moisturizer</option>
              <option value="other">other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onInputChange}
              className="h-28 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Ingredients</label>
            <textarea
              name="ingredients"
              value={form.ingredients}
              onChange={onInputChange}
              className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">Enter comma-separated ingredients</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                value={form.price}
                onChange={onInputChange}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">Available Quantity</label>
              <input
                type="number"
                min="0"
                name="available_quantity"
                value={form.available_quantity}
                onChange={onInputChange}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Product Image</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={onInputChange}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            {previewUrl ? (
              <div className="mt-3">
                <img src={previewUrl} alt="Preview" className="h-36 w-36 rounded-lg border border-zinc-200 object-cover" />
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="is_natural_certified"
              checked={form.is_natural_certified}
              onChange={onInputChange}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sage"
            />
            <span>This product is 100% natural and safe</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/vendor/dashboard/products')}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Submitting...
                </>
              ) : (
                'Submit Product'
              )}
            </button>
          </div>
        </form>
      </div>

      {success ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default AddProduct;
