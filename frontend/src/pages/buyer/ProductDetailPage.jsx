import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import OrderModal from '../../components/buyer/OrderModal';
import { getPrimaryProductImage, getProductImageUrls } from '../../utils/imageUrl';
import { useBuyerAuth } from '../../components/vendorsite/BuyerAuthContext';

function getNextPath(vendorSlug, productId) {
  return `/store/${vendorSlug}/product/${productId}`;
}

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
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatVariantPrice(value) {
  const amount = Number(value || 0);
  if (!amount) {
    return 'No extra charge';
  }
  return `+₹${amount.toFixed(0)}`;
}

function ProductDetailPage() {
  const {
    slug,
    vendor_slug: legacyVendorSlug,
    productId,
    product_id: legacyProductId,
  } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const resolvedProductId = productId || legacyProductId;
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn: loggedIn, ready: buyerAuthReady } = useBuyerAuth();

  // State management
  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIngredients, setExpandedIngredients] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Fetch product detail
  useEffect(() => {
    let active = true;

    async function loadProductDetail() {
      try {
        const data = await api.getProductDetail(vendorSlug, resolvedProductId);
        if (active) {
          setProduct(data);
          setVendor({
            business_name: data.vendor_business_name,
            whatsapp_number: data.vendor_whatsapp,
            upi_id: data.vendor_upi,
            city: data.vendor_city || '',
          });
          setQuantity(1);
          setActionMessage('');
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load product detail:', err);
          if (err.response?.status === 404) {
            setError('404');
          } else if (err.response?.status === 403) {
            setError('403');
          } else {
            setError('error');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProductDetail();
    return () => { active = false; };
  }, [vendorSlug, resolvedProductId]);

  // Handle quantity change
  const handleQuantityChange = (value) => {
    if (value > 0 && value <= product.available_quantity) {
      setQuantity(value);
    }
  };

  const redirectToLogin = () => {
    const nextPath = getNextPath(vendorSlug, resolvedProductId);
    navigate(`/store/${vendorSlug}/login?next=${encodeURIComponent(nextPath)}`);
  };

  const handleRequireLoginAction = (callback) => {
    if (!buyerAuthReady) {
      setActionMessage('Checking your login session...');
      return;
    }
    if (!loggedIn) {
      redirectToLogin();
      return;
    }
    callback();
  };

  const handleAddToCart = () => {
    handleRequireLoginAction(() => {
      const storageKey = `vendor_store_cart_${vendorSlug}`;
      let current = [];
      try {
        current = JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch {
        current = [];
      }

      const unitPrice = Number(product?.discounted_price ?? product?.price ?? 0);
      const existing = current.find((item) => item.id === product.id);
      const next = existing
        ? current.map((item) =>
            item.id === product.id
              ? { ...item, qty: Math.min((item.qty || 1) + quantity, product.available_quantity || 999) }
              : item
          )
        : [
            ...current,
            {
              id: product.id,
              name: product?.name || 'Product',
              image: getPrimaryProductImage(product),
              price: unitPrice,
              qty: quantity,
            },
          ];

      localStorage.setItem(storageKey, JSON.stringify(next));
      setActionMessage('Product added to cart.');
    });
  };

  useEffect(() => {
    if (!buyerAuthReady) {
      return;
    }

    if (location.state?.openOrder) {
      if (loggedIn) {
        setShowOrderModal(true);
      } else {
        redirectToLogin();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, loggedIn, buyerAuthReady]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
            {/* Image skeleton */}
            <div className="h-96 lg:h-[500px] bg-gray-200 rounded-lg"></div>
            
            {/* Info skeleton */}
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (error === '404') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (error === '403') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Product Unavailable</h1>
          <p className="text-gray-600 mb-8">This product is currently unavailable.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (error || !product || !vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Error Loading Product</h1>
          <p className="text-gray-600 mb-8">Something went wrong while loading this product.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const galleryImages = getProductImageUrls(product);
  const safeSelectedImageIndex =
    selectedImageIndex < galleryImages.length ? selectedImageIndex : 0;
  const mainImage = galleryImages.length > 0 ? galleryImages[safeSelectedImageIndex] : null;
  const activeLightboxImage =
    lightboxImageIndex !== null && galleryImages[lightboxImageIndex]
      ? galleryImages[lightboxImageIndex]
      : null;
  const ingredientsList = product.ingredients_list || [];
  const variantsList = Array.isArray(product.variants) ? product.variants : [];
  const attributeEntries = Object.entries(product.product_attributes || {}).filter(([, value]) => {
    const formatted = formatAttributeValue(value);
    return formatted !== '';
  });
  const basePrice = Number(product.price || 0);
  const discountedPrice = Number(product.discounted_price || 0);
  const hasDiscount = discountedPrice > 0 && discountedPrice < basePrice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
          <button onClick={() => navigate('/')} className="hover:text-emerald-600">Home</button>
          <span>/</span>
          <button 
            onClick={() => navigate(`/store/${vendorSlug}`)}
            className="hover:text-emerald-600"
          >
            {vendor.business_name}
          </button>
          <span>/</span>
          <span className="text-gray-800 font-medium line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Left Column - Images */}
          <div>
            {/* Main Image */}
            <button
              type="button"
              onClick={() => setLightboxImageIndex(selectedImageIndex)}
              className="group relative mb-4 block w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-96 object-cover transition-transform duration-300 group-hover:scale-105 lg:h-[500px]"
                />
              ) : (
                <div className="w-full h-96 lg:h-[500px] flex items-center justify-center bg-gray-100 text-gray-400">
                  No image available
                </div>
              )}
              <span className="pointer-events-none absolute m-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                Click to zoom
              </span>
            </button>

            {/* Thumbnail Gallery */}
            {galleryImages.length > 1 && (
              <>
                <div className="flex gap-2 overflow-x-auto">
                  {galleryImages.map((imgSrc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setLightboxImageIndex(idx);
                      }}
                      className={`flex-shrink-0 h-20 w-20 overflow-hidden rounded-lg border-2 transition ${
                        selectedImageIndex === idx
                          ? 'border-emerald-600'
                          : 'border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      <img
                        src={imgSrc}
                        alt={`${product.name} ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">Click an image to view it full size, like a standard ecommerce gallery.</p>
              </>
            )}
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            
            {/* Name & Badges */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>
              <div className="flex flex-wrap gap-2">
                {product.is_natural_certified && (
                  <span className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    100% Natural 🌿
                  </span>
                )}
                {(product.category || product.category_name) && (
                  <span className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {product.category || product.category_name}
                  </span>
                )}
              </div>
            </div>

            {/* Price & Availability */}
            <div>
              {hasDiscount ? (
                <div className="mb-3 flex items-center gap-3">
                  <p className="text-4xl font-bold text-emerald-600">₹{discountedPrice.toFixed(0)}</p>
                  <p className="text-lg text-gray-400 line-through">₹{basePrice.toFixed(0)}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {Number(product.discount_percent || 0)}% OFF
                  </span>
                </div>
              ) : (
                <p className="text-4xl font-bold text-emerald-600 mb-3">₹{basePrice.toFixed(0)}</p>
              )}
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${
                  product.available_quantity > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.available_quantity > 0
                    ? `${product.available_quantity} items available`
                    : 'Out of Stock'}
                </span>
                {product.available_quantity > 0 && product.available_quantity < 5 && (
                  <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    Only {product.available_quantity} left!
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Ingredients */}
            {ingredientsList.length > 0 && (
              <div>
                <button
                  onClick={() => setExpandedIngredients(!expandedIngredients)}
                  className="flex items-center justify-between w-full pb-3 border-b border-gray-200 hover:text-emerald-600 transition"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
                  <span className="text-xl">{expandedIngredients ? '−' : '+'}</span>
                </button>
                {expandedIngredients && (
                  <ul className="mt-3 space-y-2">
                    {ingredientsList.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold mt-1">•</span>
                        <span className="text-gray-700">{ing}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {attributeEntries.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {attributeEntries.map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-gray-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {formatAttributeLabel(key)}
                      </p>
                      <p className="mt-1 text-sm text-gray-800">{formatAttributeValue(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {variantsList.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Variants</h3>
                <div className="space-y-2">
                  {variantsList.map((variant, index) => (
                    <div key={variant.id || `${variant.option_name}-${variant.option_value}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {variant.option_name}: {variant.option_value}
                        </p>
                        <p className="text-xs text-gray-500">Stock: {variant.stock ?? 0}</p>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">
                        {formatVariantPrice(variant.additional_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {product.available_quantity > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    min="1"
                    max={product.available_quantity}
                  />
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 ml-4">
                    Total: ₹{((hasDiscount ? discountedPrice : basePrice) * quantity).toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            {product.available_quantity > 0 && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleRequireLoginAction(() => setShowOrderModal(true))}
                  disabled={!buyerAuthReady}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  Order Now
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={!buyerAuthReady}
                  className="flex-1 border-2 border-emerald-600 text-emerald-600 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition text-center"
                >
                  Add to Cart
                </button>
              </div>
            )}

            {actionMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{actionMessage}</span>
                  {actionMessage.toLowerCase().includes('added to cart') ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/store/${vendorSlug}/cart`)}
                      className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700"
                    >
                      View Store Cart
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {product.available_quantity === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-700 font-medium">Currently out of stock</p>
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="text-amber-900">
                <strong>💳 Pay Directly to Seller</strong>
                <br />
                {vendor.upi_id ? (
                  <>UPI ID: <code className="bg-white px-2 py-1 rounded text-xs">{vendor.upi_id}</code></>
                ) : (
                  <>Contact seller for payment details</>
                )}
                <br />
                <span className="text-sm">Pay first via UPI/PhonePe/Bank Transfer, then place order with payment reference.</span>
              </p>
            </div>

            {/* Seller Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Business</p>
                  <p className="font-semibold text-gray-900">{vendor.business_name}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Location</p>
                  <p className="font-semibold text-gray-900">📍 {vendor.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Status</p>
                  <p className="inline-flex items-center text-green-700 font-semibold">
                    ✅ Verified Seller
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/store/${vendorSlug}`)}
                className="w-full py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition font-medium"
              >
                View Full Store →
              </button>
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        {(product.description || ingredientsList.length > 0 || attributeEntries.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this product</h3>
                  <p className="text-gray-700 leading-relaxed">{product.description}</p>
                </div>
              )}
              {ingredientsList.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Ingredients</h3>
                  <ul className="space-y-2">
                    {ingredientsList.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="text-gray-700">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {attributeEntries.length > 0 && (
                <div className={product.description ? '' : 'md:col-span-2'}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {attributeEntries.map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {formatAttributeLabel(key)}
                        </p>
                        <p className="mt-1 text-sm text-gray-800">{formatAttributeValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <p className="text-blue-900 font-medium">
            💳 Payments go directly to <strong>{vendor.business_name}</strong>.
            <br />
            NativeGlow is a platform service provider and is not responsible for third-party products, services, or transactions.
          </p>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          product={product}
          vendor={vendor}
          quantity={quantity}
          onClose={() => setShowOrderModal(false)}
          onSuccess={() => setShowOrderModal(false)}
          vendorSlug={vendorSlug}
        />
      )}

      {lightboxImageIndex !== null && activeLightboxImage ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxImageIndex(null)}
        >
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxImageIndex(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur hover:bg-white/25"
            >
              Close
            </button>
            <img
              src={activeLightboxImage}
              alt={product.name}
              className="max-h-[92vh] w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
              <p className="text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-white/70">Image {lightboxImageIndex + 1} of {galleryImages.length}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProductDetailPage;
