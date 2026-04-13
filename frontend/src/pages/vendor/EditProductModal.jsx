import { useEffect, useState } from 'react';
import ProductAttributeFields from '../../components/vendor/ProductAttributeFields';
import ProductVariantsEditor from '../../components/vendor/ProductVariantsEditor';
import ProductVariantOptionsEditor from '../../components/vendor/ProductVariantOptionsEditor';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  CATEGORY_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  getProductTypeForCategory,
  getDefaultVariantRows,
  getEmptyProductAttributes,
  getCategorySizeOptions,
  sanitizeVariantRows,
  sanitizeProductAttributes,
} from '../../components/vendor/productTemplates';

function EditProductModal({ product, onClose, onSave, loading }) {
  const maxImages = 4;
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
    color_options: [],
    size_options: getCategorySizeOptions('other'),
  });
  const [newImages, setNewImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [imageError, setImageError] = useState('');
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [publishError, setPublishError] = useState('');

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
      color_options: Array.isArray(product.color_options) ? product.color_options : [],
      size_options: Array.isArray(product.size_options)
        ? product.size_options
        : getCategorySizeOptions(product.category_type || 'other'),
    });
    setNewImages([]);
    setImageError('');
    setPublishConfirmed(false);
    setPublishError('');
  }, [product]);

  useEffect(() => {
    if (!newImages.length) {
      setPreviewUrls([]);
      return undefined;
    }

    const urls = newImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImages]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'file') {
      const selected = Array.from(e.target.files || []).slice(0, maxImages);
      if ((e.target.files || []).length > maxImages) {
        setImageError(`Only ${maxImages} images are allowed.`);
      } else {
        setImageError('');
      }
      setNewImages(selected);
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
        size_options: getCategorySizeOptions(value),
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
    const hasExistingImage = Boolean(product?.image || product?.primary_image);
    if (!hasExistingImage && newImages.length < 1) {
      setImageError('At least 1 product image is required.');
      return;
    }

    if (!publishConfirmed) {
      setPublishError('Please confirm publish before submitting changes.');
      return;
    }

    setImageError('');
    setPublishError('');
    const productAttributes = sanitizeProductAttributes(form.product_type, form.product_attributes);
    const variantsPayload = sanitizeVariantRows(form.variants);
    onSave({
      ...form,
      price: String(form.price),
      available_quantity: Number(form.available_quantity),
      product_attributes: productAttributes,
      variants_payload: variantsPayload,
      color_options: form.color_options || [],
      size_options: form.size_options || [],
    }, newImages);
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

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-zinc-800">Product Images (minimum 1, maximum 4)</label>
            {(product?.image || product?.primary_image) && !previewUrls.length ? (
              <img
                src={resolveImageUrl(product.image || product.primary_image)}
                alt={form.title || 'Current product image'}
                className="h-24 w-24 rounded-lg border border-zinc-200 object-cover"
              />
            ) : null}
            <input
              type="file"
              name="images"
              accept="image/*"
              multiple
              onChange={onChange}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              disabled={loading}
            />
            {previewUrls.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {previewUrls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    src={url}
                    alt={`New image ${index + 1}`}
                    className="h-20 w-20 rounded-lg border border-zinc-200 object-cover"
                  />
                ))}
              </div>
            ) : null}
            {imageError ? <p className="text-xs text-rose-600">{imageError}</p> : null}
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
            sizeOptions={form.size_options}
            onColorOptionsChange={(colorOptions) => setForm((prev) => ({ ...prev, color_options: colorOptions }))}
            onSizeOptionsChange={(sizeOptions) => setForm((prev) => ({ ...prev, size_options: sizeOptions }))}
          />

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="is_natural_certified" checked={form.is_natural_certified} onChange={onChange} className="h-4 w-4 rounded border-zinc-300 text-sage" />
            Natural certified
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <input
              type="checkbox"
              checked={publishConfirmed}
              onChange={(e) => {
                setPublishConfirmed(e.target.checked);
                if (e.target.checked) {
                  setPublishError('');
                }
              }}
              className="h-4 w-4 rounded border-zinc-300 text-sage"
              disabled={loading}
            />
            Confirm publish to store
          </label>
          {publishError ? <p className="text-xs text-rose-600">{publishError}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700" disabled={loading}>Cancel</button>
            <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" disabled={loading || !publishConfirmed}>{loading ? 'Submitting...' : 'Submit & Publish'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProductModal;
