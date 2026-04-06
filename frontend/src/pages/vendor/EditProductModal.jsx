import { useEffect, useState } from 'react';
import ProductAttributeFields from '../../components/vendor/ProductAttributeFields';
import ProductVariantsEditor from '../../components/vendor/ProductVariantsEditor';
import {
  CATEGORY_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  getProductTypeForCategory,
  getDefaultVariantRows,
  getEmptyProductAttributes,
  sanitizeVariantRows,
  sanitizeProductAttributes,
} from '../../components/vendor/productTemplates';

function EditProductModal({ product, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    title: '',
    name: '',
    description: '',
    product_type: 'skincare',
    category_type: 'other',
    ingredients: '',
    price: '',
    available_quantity: 0,
    is_natural_certified: false,
    product_attributes: getEmptyProductAttributes('skincare'),
    variants: getDefaultVariantRows('skincare'),
  });

  useEffect(() => {
    if (!product) {
      return;
    }
    setForm({
      title: product.title || '',
      name: product.name || product.title || '',
      description: product.description || '',
      product_type: product.product_type || 'skincare',
      category_type: product.category_type || 'other',
      ingredients: product.ingredients || '',
      price: product.price || '',
      available_quantity: product.available_quantity ?? 0,
      is_natural_certified: Boolean(product.is_natural_certified),
      product_attributes: {
        ...getEmptyProductAttributes(product.product_type || 'skincare'),
        ...(product.product_attributes || {}),
      },
      variants: Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map((variant) => ({
            option_name: variant.option_name || '',
            option_value: variant.option_value || '',
            sku_suffix: variant.sku_suffix || '',
            additional_price: variant.additional_price ?? '',
            stock: variant.stock ?? '',
          }))
        : getDefaultVariantRows(product.product_type || 'skincare'),
    });
  }, [product]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
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

  const onSubmit = (e) => {
    e.preventDefault();
    const productAttributes = sanitizeProductAttributes(form.product_type, form.product_attributes);
    const variantsPayload = sanitizeVariantRows(form.variants);
    onSave({
      ...form,
      price: String(form.price),
      available_quantity: Number(form.available_quantity),
      product_attributes: productAttributes,
      variants_payload: variantsPayload,
    });
  };

  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-2 py-2 sm:items-center sm:px-4">
      <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-zinc-900">Edit Product</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700">Close</button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input name="title" value={form.title} onChange={onChange} placeholder="Title" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required disabled={loading} />
            <input name="name" value={form.name} onChange={onChange} placeholder="Name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" disabled={loading} />
          </div>

          <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required disabled={loading} />

          <div className="grid gap-3 md:grid-cols-2">
            <select name="category_type" value={form.category_type} onChange={onChange} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" disabled={loading}>
              {CATEGORY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select name="product_type" value={form.product_type} onChange={onChange} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" disabled={loading}>
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <input name="ingredients" value={form.ingredients} onChange={onChange} placeholder="Ingredients" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" disabled={loading} />

          <div className="grid gap-3 md:grid-cols-2">
            <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={onChange} placeholder="Price" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required disabled={loading} />
            <input type="number" min="0" name="available_quantity" value={form.available_quantity} onChange={onChange} placeholder="Quantity" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required disabled={loading} />
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
            onChange={(nextVariants) => setForm((prev) => ({ ...prev, variants: nextVariants }))}
          />

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="is_natural_certified" checked={form.is_natural_certified} onChange={onChange} className="h-4 w-4 rounded border-zinc-300 text-sage" />
            Natural certified
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700" disabled={loading}>Cancel</button>
            <button type="submit" className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProductModal;
