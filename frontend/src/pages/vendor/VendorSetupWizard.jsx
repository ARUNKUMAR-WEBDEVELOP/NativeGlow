import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  getCategorySizeOptions,
  getCategoryColorOptions,
} from '../../components/vendor/productTemplates';
import { uploadVendorBrandAsset } from '../../utils/vendorBrandAsset';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

const THEME_OPTIONS = [
  {
    value: 'default',
    label: 'Default 🌿',
    preview: 'bg-gradient-to-br from-emerald-50 to-lime-100',
  },
  {
    value: 'minimal',
    label: 'Minimal ◻️',
    preview: 'bg-gradient-to-br from-zinc-100 to-zinc-200',
  },
  {
    value: 'bold',
    label: 'Bold 🔥',
    preview: 'bg-gradient-to-br from-orange-100 to-rose-200',
  },
  {
    value: 'elegant',
    label: 'Elegant ✨',
    preview: 'bg-gradient-to-br from-amber-100 to-yellow-200',
  },
];

function getBaseCandidates() {
  const trimmed = String(API_BASE || '').replace(/\/+$/, '');
  if (!trimmed) {
    return [];
  }

  const candidates = [];
  if (trimmed.endsWith('/api')) {
    candidates.push(trimmed, trimmed.slice(0, -4));
  } else {
    candidates.push(`${trimmed}/api`, trimmed);
  }

  return [...new Set(candidates)].filter(Boolean);
}

function getVendorSession() {
  try {
    const stored = JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    if (stored?.access) {
      return stored;
    }
  } catch {
    // ignore
  }

  const vendorToken = localStorage.getItem('vendor_token');
  if (vendorToken) {
    return { access: vendorToken };
  }

  return null;
}

export default function VendorSetupWizard() {
  const maxImages = 4;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setupSaved, setSetupSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vendorSlug, setVendorSlug] = useState(localStorage.getItem('vendor_slug') || '');

  const [setupData, setSetupData] = useState({
    site_theme: 'default',
    site_logo: '',
    site_banner_image: '',
    about_vendor: '',
    youtube_url: '',
    instagram_url: '',
  });

  const [brandImageFile, setBrandImageFile] = useState(null);

  const [productForm, setProductForm] = useState({
    title: '',
    product_type: 'skincare',
    category_type: 'face_wash',
    price: '',
    ingredients: '',
    available_quantity: 0,
    images: [],
    product_attributes: getEmptyProductAttributes('skincare'),
    variants: getDefaultVariantRows('skincare'),
    color_options: [],
    size_options: getCategorySizeOptions('face_wash'),
  });

  const vendorSession = useMemo(() => getVendorSession(), []);

  const progressPercent = useMemo(() => `${(step / 4) * 100}%`, [step]);
  const storeUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://native-glow.vercel.app';
    return `${origin}/store/${vendorSlug || 'your-store'}`;
  }, [vendorSlug]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (!vendorSession?.access) {
        navigate('/vendor/login', { replace: true });
        return;
      }

      if (localStorage.getItem('setup_complete') === 'true') {
        navigate('/dashboard', { replace: true });
        return;
      }

      setLoading(true);
      setError('');

      try {
        const profile = await authRequest(['/vendor/me/'], { method: 'GET' }, vendorSession.access);
        if (!mounted) {
          return;
        }

        if (profile?.vendor_slug) {
          setVendorSlug(profile.vendor_slug);
          localStorage.setItem('vendor_slug', profile.vendor_slug);
        }

        setSetupData((prev) => ({
          ...prev,
          site_theme: profile?.site_theme || prev.site_theme,
          site_logo: profile?.site_logo || prev.site_logo,
          site_banner_image: profile?.site_banner_image || prev.site_banner_image,
          about_vendor: profile?.about_vendor || prev.about_vendor,
          youtube_url: profile?.youtube_url || prev.youtube_url,
          instagram_url: profile?.instagram_url || prev.instagram_url,
        }));
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err.message || 'Unable to initialize setup wizard.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [navigate, vendorSession?.access]);

  if (!vendorSession?.access) {
    return <Navigate to="/vendor/login" replace />;
  }

  async function authRequest(paths, options, accessToken) {
    const bases = getBaseCandidates();
    let lastError;

    for (const base of bases) {
      for (const path of paths) {
        try {
          const res = await fetch(`${base}${path}`, {
            ...options,
            headers: {
              ...(options?.headers || {}),
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!res.ok) {
            const payload = await res.json().catch(() => null);
            const detail = payload?.detail || payload?.error || `Request failed (${res.status})`;
            const err = new Error(detail);
            err.status = res.status;
            if (res.status === 404) {
              lastError = err;
              continue;
            }
            throw err;
          }

          return res.status === 204 ? null : res.json();
        } catch (err) {
          lastError = err;
        }
      }
    }

    throw lastError || new Error('Request failed.');
  }

  async function handleStep1Next() {
    setSaving(true);
    setError('');
    try {
      const updates = { ...setupData };

      if (brandImageFile) {
        const uploadedUrl = await uploadVendorBrandAsset(brandImageFile, vendorSession.access, 'brand');
        updates.site_logo = uploadedUrl;
        updates.site_banner_image = uploadedUrl;
      }

      setSetupData(updates);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to upload store assets.');
    } finally {
      setSaving(false);
    }
  }

  function handleStep2Next() {
    if (setupData.about_vendor.length > 500) {
      setError('About Your Brand should be 500 characters or less.');
      return;
    }
    setError('');
    setStep(3);
  }

  async function submitFirstProduct() {
    const formData = new FormData();
    const normalizedCategory = productForm.category_type === 'toner' ? 'other' : productForm.category_type;
    const productAttributes = sanitizeProductAttributes(productForm.product_type, productForm.product_attributes);
    const variantsPayload = sanitizeVariantRows(productForm.variants);

    formData.append('title', productForm.title);
    formData.append('name', productForm.title);
    formData.append('product_type', productForm.product_type);
    formData.append('category_type', normalizedCategory);
    formData.append('description', productForm.ingredients || productForm.title);
    formData.append('short_description', (productForm.ingredients || productForm.title).slice(0, 140));
    formData.append('ingredients', productForm.ingredients);
    formData.append('price', String(productForm.price));
    formData.append('available_quantity', String(productForm.available_quantity));
    formData.append('is_natural_certified', 'true');
    formData.append('tags', '');
    formData.append('unit', 'pcs');
    formData.append('product_attributes', JSON.stringify(productAttributes));
    formData.append('variants_payload', JSON.stringify(variantsPayload));
    formData.append('color_options', JSON.stringify(productForm.color_options || []));
    formData.append('size_options', JSON.stringify(productForm.size_options || []));

    if (!productForm.images || productForm.images.length === 0) {
      throw new Error('Please upload at least 1 product image.');
    }

    formData.append('image', productForm.images[0]);
    productForm.images.slice(1, maxImages).forEach((image, index) => {
      formData.append(`image_${index + 1}`, image);
    });

    await authRequest(
      ['/vendor/products/add/'],
      {
        method: 'POST',
        body: formData,
      },
      vendorSession.access
    );
  }

  async function completeWizard({ withProduct }) {
    setSaving(true);
    setError('');
    try {
      if (withProduct) {
        if (!productForm.title || !productForm.price) {
          throw new Error('Product name and price are required to add first product.');
        }
        await submitFirstProduct();
      }

      await authRequest(
        ['/vendor/me/'],
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_theme: setupData.site_theme,
            site_logo: setupData.site_logo,
            site_banner_image: setupData.site_banner_image,
            about_vendor: setupData.about_vendor,
            youtube_url: setupData.youtube_url,
            instagram_url: setupData.instagram_url,
          }),
        },
        vendorSession.access
      );

      localStorage.setItem('setup_complete', 'true');
      setSetupSaved(true);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to complete setup.');
    } finally {
      setSaving(false);
    }
  }

  function copyStoreUrl() {
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openStore() {
    window.open(storeUrl, '_blank', 'noopener,noreferrer');
  }

  function shareOnWhatsApp() {
    const text = encodeURIComponent(`My NativeGlow store is now live: ${storeUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-3 text-sm text-zinc-600">Loading setup wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Store Setup Wizard</h1>
        <p className="mt-1 text-sm text-zinc-600">Complete 4 steps to launch your NativeGlow storefront.</p>

        <div className="mt-4 h-2 w-full rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: progressPercent }} />
        </div>
        <p className="mt-2 text-xs font-medium text-zinc-500">Step {step} of 4</p>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        {step === 1 ? (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-zinc-900">Customize Your Store</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">Upload Brand Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBrandImageFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-zinc-500">This one image will be used in your dashboard avatar and store header.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">Current Brand Image</label>
                <div className="flex h-[92px] w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  {setupData.site_logo ? (
                    <img src={setupData.site_logo} alt="Brand" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-xs text-zinc-500">No image uploaded yet</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-800">Choose Site Theme</p>
              <div className="grid gap-3 md:grid-cols-2">
                {THEME_OPTIONS.map((theme) => {
                  const active = setupData.site_theme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => setSetupData((prev) => ({ ...prev, site_theme: theme.value }))}
                      className={`rounded-xl border p-3 text-left transition ${
                        active ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-zinc-800">{theme.label}</p>
                      <div className={`mt-2 h-20 w-full rounded-lg border border-zinc-200 ${theme.preview}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStep1Next}
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Uploading...' : 'Next →'}
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">Tell Your Story</h2>

            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">About Your Brand</label>
              <textarea
                value={setupData.about_vendor}
                maxLength={500}
                onChange={(e) => setSetupData((prev) => ({ ...prev, about_vendor: e.target.value }))}
                placeholder="Tell customers about your brand,
your natural ingredients story,
why you started..."
                className="h-36 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-right text-xs text-zinc-500">{setupData.about_vendor.length}/500</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">YouTube Channel URL (optional)</label>
                <input
                  type="url"
                  value={setupData.youtube_url}
                  onChange={(e) => setSetupData((prev) => ({ ...prev, youtube_url: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-800">Instagram URL (optional)</label>
                <input
                  type="url"
                  value={setupData.instagram_url}
                  onChange={(e) => setSetupData((prev) => ({ ...prev, instagram_url: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">Add Your First Product</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={productForm.title}
                onChange={(e) => setProductForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Product Name"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <select
                value={productForm.category_type}
                onChange={(e) => {
                  const mappedType = getProductTypeForCategory(e.target.value);
                  setProductForm((prev) => ({
                    ...prev,
                    category_type: e.target.value,
                    product_type: mappedType,
                    product_attributes: {
                      ...getEmptyProductAttributes(mappedType),
                      ...prev.product_attributes,
                    },
                    variants: getDefaultVariantRows(mappedType),
                    size_options: getCategorySizeOptions(e.target.value),
                  }));
                }}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              >
                {CATEGORY_TYPE_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <select
                value={productForm.product_type}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    product_type: e.target.value,
                    product_attributes: {
                      ...getEmptyProductAttributes(e.target.value),
                      ...prev.product_attributes,
                    },
                    variants: getDefaultVariantRows(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              >
                {PRODUCT_TYPE_OPTIONS.map((productType) => (
                  <option key={productType.value} value={productType.value}>
                    {productType.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="Price"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                value={productForm.available_quantity}
                onChange={(e) => setProductForm((prev) => ({ ...prev, available_quantity: e.target.value }))}
                placeholder="Quantity"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <textarea
              value={productForm.ingredients}
              onChange={(e) => setProductForm((prev) => ({ ...prev, ingredients: e.target.value }))}
              placeholder="Ingredients"
              className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />

            <ProductAttributeFields
              productType={productForm.product_type}
              attributes={productForm.product_attributes}
              onChange={(field, nextValue) =>
                setProductForm((prev) => ({
                  ...prev,
                  product_attributes: {
                    ...prev.product_attributes,
                    [field]: nextValue,
                  },
                }))
              }
            />

            <ProductVariantsEditor
              productType={productForm.product_type}
              variants={productForm.variants}
              productAttributes={productForm.product_attributes}
              onChange={(nextVariants) => setProductForm((prev) => ({ ...prev, variants: nextVariants }))}
            />

            <ProductVariantOptionsEditor
              categoryType={productForm.category_type}
              colorOptions={productForm.color_options}
              sizeOptions={productForm.size_options}
              onColorOptionsChange={(colorOptions) =>
                setProductForm((prev) => ({ ...prev, color_options: colorOptions }))
              }
              onSizeOptionsChange={(sizeOptions) =>
                setProductForm((prev) => ({ ...prev, size_options: sizeOptions }))
              }
            />

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const selected = Array.from(e.target.files || []).slice(0, maxImages);
                if (Array.from(e.target.files || []).length > maxImages) {
                  setError(`Only ${maxImages} images are allowed per product.`);
                }
                setProductForm((prev) => ({ ...prev, images: selected }));
              }}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            {Array.isArray(productForm.images) && productForm.images.length > 0 ? (
              <p className="text-xs text-zinc-500">{productForm.images.length}/{maxImages} image(s) selected</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => completeWizard({ withProduct: true })}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Product & Continue →'}
              </button>
              <button
                type="button"
                onClick={() => completeWizard({ withProduct: false })}
                disabled={saving}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white text-2xl leading-10">✓</div>
            </div>
            <h2 className="text-3xl font-bold text-zinc-900">Your NativeGlow store is live! 🎉</h2>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="break-all font-mono text-sm text-zinc-800">{storeUrl}</p>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="mt-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700"
              >
                {copied ? 'Copied' : '📋 Copy'}
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={openStore}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                View My Store
              </button>
              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
              >
                Share on WhatsApp
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Go to Dashboard
              </button>
            </div>

            {!setupSaved ? (
              <p className="text-xs text-zinc-500">Finalizing setup...</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
