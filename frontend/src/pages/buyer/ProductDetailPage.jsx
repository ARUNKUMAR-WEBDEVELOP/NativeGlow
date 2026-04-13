import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import OrderModal from '../../components/buyer/OrderModal';
import { applyImageFallback, getPrimaryProductImage, getProductImageUrls } from '../../utils/imageUrl';
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
  const storeHomePath = vendorSlug ? `/store/${vendorSlug}` : '/';

  // State management
  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIngredients, setExpandedIngredients] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeInfoTab, setActiveInfoTab] = useState('overview');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

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
          setSelectedVariantIndex(0);
          const initialColors = Array.isArray(data.color_options) ? data.color_options : [];
          const initialSizes = Array.isArray(data.size_options) ? data.size_options : [];
          setSelectedColor(initialColors[0] || '');
          setSelectedSize(initialSizes[0] || '');
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

      const selectedVariant = variantsList[selectedVariantIndex] || null;
      const baseUnitPrice = Number(product?.discounted_price ?? product?.price ?? 0);
      const variantExtraPrice = Number(selectedVariant?.additional_price || 0);
      const unitPrice = baseUnitPrice + variantExtraPrice;
      const selectedOptionParts = [];
      if (selectedColor) {
        selectedOptionParts.push(`Color: ${selectedColor}`);
      }
      if (selectedSize) {
        selectedOptionParts.push(`Size: ${selectedSize}`);
      }
      const selectedVariantLabel = selectedVariant
        ? `${selectedVariant.option_name}: ${selectedVariant.option_value}${selectedOptionParts.length ? ` | ${selectedOptionParts.join(' | ')}` : ''}`
        : selectedOptionParts.join(' | ');
      const existing = current.find((item) =>
        item.id === product.id && String(item.selected_variant_label || '') === selectedVariantLabel
      );
      const next = existing
        ? current.map((item) =>
            item.id === product.id && String(item.selected_variant_label || '') === selectedVariantLabel
              ? {
                  ...item,
                  qty: Math.min((item.qty || 1) + quantity, product.available_quantity || 999),
                  price: unitPrice,
                  selected_variant: selectedVariant || item.selected_variant || null,
                  selected_variant_label: selectedVariantLabel || item.selected_variant_label || '',
                }
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
              selected_variant: selectedVariant,
              selected_variant_label: selectedVariantLabel,
            },
          ];

      localStorage.setItem(storageKey, JSON.stringify(next));
      setActionMessage('Product added to cart.');
    });
  };

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    if (!actionMessage.toLowerCase().includes('added to cart')) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionMessage('');
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [actionMessage]);

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

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariantIndex]);

  useEffect(() => {
    let active = true;

    async function loadRecommendedProducts() {
      if (!vendorSlug || !product?.id) {
        if (active) {
          setRecommendedProducts([]);
        }
        return;
      }

      const currentCategory = String(
        product?.category || product?.category_name || product?.category_type || ''
      ).trim().toLowerCase();

      if (!currentCategory) {
        if (active) {
          setRecommendedProducts([]);
        }
        return;
      }

      if (active) {
        setLoadingRecommendations(true);
      }

      try {
        const storeData = await api.getVendorStore(vendorSlug);
        const storeProducts = Array.isArray(storeData?.products) ? storeData.products : [];

        const related = storeProducts
          .filter((item) => Number(item?.id) !== Number(product.id))
          .filter((item) => {
            const category = String(
              item?.category || item?.category_name || item?.category_type || ''
            ).trim().toLowerCase();
            return category && category === currentCategory;
          })
          .slice(0, 8);

        if (active) {
          setRecommendedProducts(related);
        }
      } catch {
        if (active) {
          setRecommendedProducts([]);
        }
      } finally {
        if (active) {
          setLoadingRecommendations(false);
        }
      }
    }

    loadRecommendedProducts();
    return () => {
      active = false;
    };
  }, [vendorSlug, product?.id, product?.category, product?.category_name, product?.category_type]);

  const productHighlight = useMemo(() => {
    const attrs = product?.product_attributes || {};
    return (
      attrs.garment_type ||
      attrs.product_form ||
      attrs.color ||
      attrs.texture_or_finish ||
      attrs.skin_type ||
      attrs.flavor ||
      attrs.material ||
      product?.category ||
      product?.category_name ||
      'Product'
    );
  }, [product]);

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
            onClick={() => navigate(storeHomePath)}
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
            onClick={() => navigate(storeHomePath)}
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
            onClick={() => navigate(storeHomePath)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const ingredientsList = product.ingredients_list || [];
  const variantsList = Array.isArray(product.variants) ? product.variants : [];
  const selectedVariant = variantsList[selectedVariantIndex] || null;
  const galleryImages = getProductImageUrls(product);
  const selectedVariantImages = Array.isArray(selectedVariant?.image_urls)
    ? selectedVariant.image_urls.filter(Boolean)
    : [];
  const activeGalleryImages = selectedVariantImages.length > 0 ? selectedVariantImages : galleryImages;
  const safeSelectedImageIndex =
    selectedImageIndex < activeGalleryImages.length ? selectedImageIndex : 0;
  const mainImage = activeGalleryImages.length > 0 ? activeGalleryImages[safeSelectedImageIndex] : null;
  const colorOptions = Array.isArray(product.color_options) ? product.color_options : [];
  const sizeOptions = Array.isArray(product.size_options) ? product.size_options : [];
  const attributeEntries = Object.entries(product.product_attributes || {}).filter(([, value]) => {
    const formatted = formatAttributeValue(value);
    return formatted !== '';
  });
  const basePrice = Number(product.price || 0);
  const variantExtraPrice = Number(selectedVariant?.additional_price || 0);
  const discountedPrice = Number(product.discounted_price || 0);
  const hasDiscount = discountedPrice > 0 && discountedPrice < basePrice;
  const currentPrice = (hasDiscount ? discountedPrice : basePrice) + variantExtraPrice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
          <button onClick={() => navigate(`/store/${vendorSlug}`)} className="hover:text-emerald-600">Home</button>
          <span>/</span>
          <button 
            onClick={() => navigate(`/store/${vendorSlug}/products`)}
            className="hover:text-emerald-600"
          >
            Products
          </button>
          <span>/</span>
          <span className="text-gray-800 font-medium line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Left Column - Images */}
          <div>
            <div className="flex gap-3">
              {activeGalleryImages.length > 1 ? (
                <div className="flex max-h-[500px] w-20 flex-shrink-0 flex-col gap-2 overflow-y-auto">
                  {activeGalleryImages.map((imgSrc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`h-20 w-20 overflow-hidden rounded-lg border-2 transition ${
                        safeSelectedImageIndex === idx
                          ? 'border-emerald-600'
                          : 'border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      <img
                        src={imgSrc}
                        alt={`${product.name} ${idx + 1}`}
                        className="h-full w-full object-cover"
                        onError={applyImageFallback}
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Main Image */}
              <div className="group relative flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="w-full h-96 object-cover transition-transform duration-300 group-hover:scale-105 lg:h-[500px]"
                    onError={applyImageFallback}
                  />
                ) : (
                  <div className="w-full h-96 lg:h-[500px] flex items-center justify-center bg-gray-100 text-gray-400">
                    No image available
                  </div>
                )}
              </div>
            </div>
            {activeGalleryImages.length > 1 ? (
              <p className="mt-2 text-xs text-gray-500">Select thumbnails to change the main image.</p>
            ) : null}
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            
            {/* Name & Badges */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {productHighlight}
                </span>
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
                  <p className="text-4xl font-bold text-emerald-600">₹{currentPrice.toFixed(0)}</p>
                  <p className="text-lg text-gray-400 line-through">₹{basePrice.toFixed(0)}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {Number(product.discount_percent || 0)}% OFF
                  </span>
                </div>
              ) : (
                <p className="text-4xl font-bold text-emerald-600 mb-3">₹{currentPrice.toFixed(0)}</p>
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
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Choose Variant</h3>
                  {selectedVariant ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Selected: {selectedVariant.option_name} {selectedVariant.option_value}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variantsList.map((variant, index) => (
                    <button
                      key={variant.id || `${variant.option_name}-${variant.option_value}-${index}`}
                      type="button"
                      onClick={() => setSelectedVariantIndex(index)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        selectedVariantIndex === index
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                    >
                      {variant.option_name}: {variant.option_value}
                      <span className="ml-2 text-xs font-normal opacity-80">
                        {formatVariantPrice(variant.additional_price)}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">Tap a size, color, or flavor to choose the exact item before adding it to cart.</p>
              </div>
            )}

            {colorOptions.length > 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Choose Color</h3>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => {
                    const active = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {sizeOptions.length > 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Choose Size</h3>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const active = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
                    Total: ₹{(currentPrice * quantity).toFixed(0)}
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

            {selectedVariant ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Selected Variant Summary</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Variant</p>
                    <p className="mt-1 text-sm text-gray-800">{selectedVariant.option_name}: {selectedVariant.option_value}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price Impact</p>
                    <p className="mt-1 text-sm text-gray-800">{formatVariantPrice(selectedVariant.additional_price)}</p>
                  </div>
                </div>
                {(selectedColor || selectedSize) ? (
                  <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chosen Options</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {[selectedColor ? `Color: ${selectedColor}` : '', selectedSize ? `Size: ${selectedSize}` : '']
                        .filter(Boolean)
                        .join(' | ')}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

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

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Seller</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.business_name}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                  Verified
                </span>
              </div>
              <button
                onClick={() => navigate(`/store/${vendorSlug}`)}
                className="mt-3 w-full rounded-lg border border-emerald-600 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
              >
                View Full Store
              </button>
            </div>
          </div>
        </div>

        {/* Product Info Section - Click-to-view, Flipkart style */}
        {(product.description || ingredientsList.length > 0 || attributeEntries.length > 0) && (
          <div className="mb-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
              <h2 className="text-xl font-bold text-gray-900">Product Information</h2>
              <p className="mt-1 text-xs text-gray-500">Tap a section to view details</p>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-gray-200 px-3 py-3 sm:px-6">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'ingredients', label: 'Ingredients' },
                { key: 'specs', label: 'Specifications' },
                { key: 'seller', label: 'Seller Info' },
                { key: 'payment', label: 'Payment' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveInfoTab(tab.key)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    activeInfoTab === tab.key
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6">
              {activeInfoTab === 'overview' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">About this product</h3>
                  <p className="text-sm leading-relaxed text-gray-700">{product.description || 'No description available.'}</p>
                </div>
              )}

              {activeInfoTab === 'ingredients' && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Key Ingredients</h3>
                  {ingredientsList.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ingredientsList.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          <span className="mt-0.5 font-bold text-emerald-600">✓</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">Ingredients are not listed for this product.</p>
                  )}
                </div>
              )}

              {activeInfoTab === 'specs' && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Specifications</h3>
                  {attributeEntries.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {attributeEntries.map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatAttributeLabel(key)}</p>
                          <p className="mt-1 text-sm text-gray-800">{formatAttributeValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No specifications available.</p>
                  )}
                </div>
              )}

              {activeInfoTab === 'seller' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Seller Information</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Business</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{vendor.business_name}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{vendor.city || 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/store/${vendorSlug}`)}
                    className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
                  >
                    Visit Seller Store
                  </button>
                </div>
              )}

              {activeInfoTab === 'payment' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {vendor.upi_id ? (
                      <>
                        UPI ID: <code className="rounded bg-white px-2 py-1 text-xs">{vendor.upi_id}</code>
                      </>
                    ) : (
                      <>Contact seller for payment details.</>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Pay directly to the seller and use your payment reference when placing the order.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommended Products - Same Category */}
        {loadingRecommendations || recommendedProducts.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recommended Products</h2>
                <p className="text-sm text-gray-500">Similar items from the same category</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/store/${vendorSlug}/products`)}
                className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                View All
              </button>
            </div>

            {loadingRecommendations ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm animate-pulse">
                    <div className="h-32 w-full rounded-lg bg-gray-200" />
                    <div className="mt-3 h-3 w-3/4 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {recommendedProducts.map((item) => {
                  const itemImage = getPrimaryProductImage(item);
                  const itemName = item?.name || item?.title || 'Product';
                  const itemPrice = Number(item?.discounted_price || item?.price || 0);
                  const itemOriginal = Number(item?.price || 0);
                  const itemHasDiscount = item?.discounted_price && itemPrice < itemOriginal;

                  return (
                    <article
                      key={item.id}
                      onClick={() => navigate(`/store/${vendorSlug}/product/${item.id}`)}
                      className="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative h-32 overflow-hidden rounded-lg bg-gray-100 sm:h-40">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={itemName}
                            className="h-full w-full object-cover"
                            onError={applyImageFallback}
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                        )}
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-gray-900">{itemName}</h3>

                      {itemHasDiscount ? (
                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-sm font-bold text-emerald-600">₹{itemPrice.toFixed(0)}</p>
                          <p className="text-xs text-gray-400 line-through">₹{itemOriginal.toFixed(0)}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-bold text-emerald-600">₹{itemPrice.toFixed(0)}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

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
          selectedVariantLabel={[selectedColor ? `Color: ${selectedColor}` : '', selectedSize ? `Size: ${selectedSize}` : '']
            .filter(Boolean)
            .join(' | ')}
          onClose={() => setShowOrderModal(false)}
          onSuccess={() => setShowOrderModal(false)}
          vendorSlug={vendorSlug}
        />
      )}

    </div>
  );
}

export default ProductDetailPage;
