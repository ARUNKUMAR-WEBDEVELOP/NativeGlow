import { useEffect, useState } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'face_wash', label: 'Face Wash' },
  { value: 'soap', label: 'Soap' },
  { value: 'serum', label: 'Serum' },
  { value: 'moisturizer', label: 'Moisturizer' },
  { value: 'hair_oil', label: 'Hair Oil' },
  { value: 'other', label: 'Other' },
];

function EditProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    name: '',
    description: '',
    category_type: 'other',
    ingredients: '',
    price: '',
    available_quantity: 0,
    is_natural_certified: false,
  });

  useEffect(() => {
    if (!product) {
      return;
    }
    setForm({
      title: product.title || '',
      name: product.name || product.title || '',
      description: product.description || '',
      category_type: product.category_type || 'other',
      ingredients: product.ingredients || '',
      price: product.price || '',
      available_quantity: product.available_quantity ?? 0,
      is_natural_certified: Boolean(product.is_natural_certified),
    });
  }, [product]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      price: String(form.price),
      available_quantity: Number(form.available_quantity),
    });
  };

  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-zinc-900">Edit Product</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700">Close</button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input name="title" value={form.title} onChange={onChange} placeholder="Title" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
            <input name="name" value={form.name} onChange={onChange} placeholder="Name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
          </div>

          <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />

          <div className="grid gap-3 md:grid-cols-2">
            <select name="category_type" value={form.category_type} onChange={onChange} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm">
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700">Cancel</button>
            <button type="submit" className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProductModal;
