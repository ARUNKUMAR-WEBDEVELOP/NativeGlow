import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductAttributeFields from '../../components/vendor/ProductAttributeFields';
import ProductVariantsEditor from '../../components/vendor/ProductVariantsEditor';
import ProductVariantOptionsEditor from '../../components/vendor/ProductVariantOptionsEditor';
import {
  CATEGORY_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  getProductTypeForCategory,
  getDefaultVariantRows,
  getEmptyProductAttributes,
  sanitizeVariantRows,
  sanitizeProductAttributes,
} from '../../components/vendor/productTemplates';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function AddProduct() {
  const maxImages = 4;
  const navigate = useNavigate();
  const vendorSlug = useMemo(() => {
    try {
      const session = JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
      return session?.vendor?.vendor_slug || session?.vendor_slug || localStorage.getItem('vendor_slug') || '';
    } catch {
      return localStorage.getItem('vendor_slug') || '';
    }
  }, []);

  const productsPath = vendorSlug
    ? '/dashboard?tab=products'
    : '/dashboard?tab=products';
  const [form, setForm] = useState({
    title: '',
    product_type: 'skincare',
    category_type: 'face_wash',
    description: '',
    ingredients: '',
    price: '',
    available_quantity: 0,
    is_natural_certified: false,
    images: [],
    product_attributes: getEmptyProductAttributes('skincare'),
    variants: getDefaultVariantRows('skincare'),
    color_options: [],
  });
  const [previewUrls, setPreviewUrls] = useState([]);
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
    if (!form.images || form.images.length === 0) {
      setPreviewUrls([]);
      return undefined;
    }
    const urls = form.images.map((img) => URL.createObjectURL(img));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [form.images]);

  useEffect(() => {
    if (!vendorSession?.access) {
      navigate('/vendor/login', { replace: true });
    }
  }, [navigate, vendorSession?.access]);

  const onInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      const selected = Array.from(files || []).slice(0, maxImages);
      if (Array.from(files || []).length > maxImages) {
        setError(`Only ${maxImages} images are allowed per product.`);
      }
      setForm((prev) => ({ ...prev, images: selected }));
      return;
    }
    if (name === 'category_type') {
      const mappedType = getProductTypeForCategory(value);
      setForm((prev) => ({
        ...prev,
        category_type: value,
        product_type: mappedType,
        product_attributes: {
          ...getEmptyProductAttributes(mappedType),
          ...prev.product_attributes,
        },
        variants: getDefaultVariantRows(mappedType),
      }));
      return;
    }
    if (name === 'product_type') {
      setForm((prev) => ({
        ...prev,
        product_type: value,
        product_attributes: {
          ...getEmptyProductAttributes(value),
          ...prev.product_attributes,
        },
        variants: getDefaultVariantRows(value),
      }));
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

    if (!form.images || form.images.length < 1) {
      setError('Please upload at least 1 image.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      const normalizedCategory = form.category_type === 'toner' ? 'other' : form.category_type;
      const productAttributes = sanitizeProductAttributes(form.product_type, form.product_attributes);
      const variantsPayload = sanitizeVariantRows(form.variants);

      formData.append('title', form.title);
      formData.append('name', form.title);
      formData.append('product_type', form.product_type);
      formData.append('category_type', normalizedCategory);
      formData.append('description', form.description);
      formData.append('short_description', form.description.slice(0, 140));
      formData.append('ingredients', form.ingredients);
      formData.append('price', String(form.price));
      formData.append('available_quantity', String(form.available_quantity));
      formData.append('is_natural_certified', String(form.is_natural_certified));
      formData.append('tags', '');
      formData.append('unit', 'pcs');
      formData.append('product_attributes', JSON.stringify(productAttributes));
      formData.append('variants_payload', JSON.stringify(variantsPayload));
      formData.append('color_options', JSON.stringify(form.color_options || []));

      formData.append('image', form.images[0]);
      form.images.slice(1, maxImages).forEach((image, index) => {
        formData.append(`image_${index + 1}`, image);
      });

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

      setSuccess('Product created successfully and is now live in your store.');
      setForm({
        title: '',
        product_type: 'skincare',
        category_type: 'face_wash',
        description: '',
        ingredients: '',
        price: '',
        available_quantity: 0,
        is_natural_certified: false,
        images: [],
        product_attributes: getEmptyProductAttributes('skincare'),
        variants: getDefaultVariantRows('skincare'),
        color_options: [],
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
              {CATEGORY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Product Type</label>
            <select
              name="product_type"
              value={form.product_type}
              onChange={onInputChange}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            >
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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

          <ProductAttributeFields
            productType={form.product_type}
            attributes={form.product_attributes}
            onChange={(field, nextValue) =>
              setForm((prev) => ({
                ...prev,
                product_attributes: {
                  ...prev.product_attributes,
                  [field]: nextValue,
                },
              }))
            }
          />

          <ProductVariantsEditor
            productType={form.product_type}
            variants={form.variants}
            productAttributes={form.product_attributes}
            onChange={(nextVariants) => setForm((prev) => ({ ...prev, variants: nextVariants }))}
          />

          <ProductVariantOptionsEditor
            categoryType={form.category_type}
            colorOptions={form.color_options}
            onColorOptionsChange={(colorOptions) => setForm((prev) => ({ ...prev, color_options: colorOptions }))}
            showSizeOptions={false}
          />

          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-800">Product Images (minimum 1, maximum 4)</label>
            <input
              type="file"
              name="images"
              accept="image/*"
              multiple
              onChange={onInputChange}
              required={form.images.length === 0}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            {previewUrls.length > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-xs text-zinc-600">{previewUrls.length}/{maxImages} image(s) selected</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {previewUrls.map((url, idx) => (
                    <img key={`${url}-${idx}`} src={url} alt={`Preview ${idx + 1}`} className="h-24 w-24 rounded-lg border border-zinc-200 object-cover" />
                  ))}
                </div>
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
              onClick={() => navigate(productsPath)}
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
