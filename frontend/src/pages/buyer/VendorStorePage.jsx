import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import OrderModal from '../../components/buyer/OrderModal';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import { applyImageFallback, getPrimaryProductImage } from '../../utils/imageUrl';

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
  return String(value);
}

function getEffectivePrice(product) {
  const discounted = Number(product?.discounted_price || 0);
  if (discounted > 0) {
    return discounted;
  }
  return Number(product?.price || 0);
}

function VendorStorePage() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const navigate = useNavigate();
  
  // State management
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter and sort
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price-low', 'price-high'
  const [categories, setCategories] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  
  // Order modal state
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch vendor store data
  useEffect(() => {
    let active = true;
    
    async function loadVendorStore() {
      try {
        const data = await api.getVendorStore(vendorSlug);
        if (active) {
          setVendor({
            ...data,
            whatsapp: data.whatsapp || data.whatsapp_number || '',
          });
          setProducts(Array.isArray(data.products) ? data.products : []);
          
          // Extract unique categories
          const cats = [...new Set((data.products || []).map((p) => p.category || p.category_name || p.category_type).filter(Boolean))];
          setCategories(cats);
        }
      } catch (err) {
        if (active) {
          if (err.response?.status === 404) {
            setError('404');
          } else if (err.response?.status === 403) {
            setError('403');
          } else {
            setError('error');
          }
          console.error('Failed to load vendor store:', err);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    
    loadVendorStore();
    return () => { active = false; };
  }, [vendorSlug]);

  // Filter and sort products
  useEffect(() => {
    let filtered = products;
    
    if (selectedCategory) {
      filtered = filtered.filter((p) => (p.category || p.category_name || p.category_type) === selectedCategory);
    }
    
    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case 'newest':
      default:
        filtered = [...filtered].reverse();
        break;
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedCategory, sortBy]);

  useEffect(() => {
    setVisibleCount(12);
  }, [selectedCategory, sortBy, vendorSlug]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const canLoadMore = visibleProducts.length < filteredProducts.length;



  // Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 rounded-lg bg-white p-8 shadow-sm">
            <SkeletonBlock className="mb-4 h-12 w-96 max-w-full" />
            <SkeletonBlock className="mb-4 h-4 w-64 max-w-full" />
            <div className="mb-4 flex gap-2">
              <SkeletonBlock className="h-6 w-32 rounded-full" />
              <SkeletonBlock className="h-6 w-32 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow">
                <SkeletonBlock className="h-48 w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-4 w-1/2" />
                  <SkeletonBlock className="h-8 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error === '404') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Store Not Found</h1>
          <p className="text-gray-600 mb-8">The store you're looking for doesn't exist or has been removed.</p>
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
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Store Unavailable</h1>
          <p className="text-gray-600 mb-8">This store is currently unavailable. Please check back later.</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Error Loading Store</h1>
          <p className="text-gray-600 mb-8">Something went wrong while loading this store.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Store Header */}
        <div className="mb-12 bg-white rounded-lg shadow-sm p-8">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{vendor?.business_name}</h1>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="inline-flex items-center bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                  📍 {vendor?.city}
                </span>
                <span className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  ✓ Verified Natural Seller
                </span>
                <span className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  ✅ Admin Verified
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-emerald-50 p-3 rounded-lg">
              <p className="text-gray-600 text-sm">Member Since</p>
              <p className="text-xl font-semibold text-emerald-700">{vendor?.member_since}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-xl font-semibold text-amber-700">{vendor?.total_products}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-gray-600 text-sm">WhatsApp</p>
              <p className="text-sm font-mono text-orange-700">{vendor?.whatsapp}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-600 text-sm">Contact</p>
              <a
                href={`https://wa.me/${(vendor?.whatsapp || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Message →
              </a>
            </div>
          </div>
        </div>

        {/* Filter Bar - Sticky */}
        <div className="sticky top-20 bg-white shadow-sm rounded-lg p-4 mb-8 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Category filters */}
            <div className="w-full sm:w-auto flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === ''
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {visibleProducts.map((product, index) => {
              const primaryImage = getPrimaryProductImage(product);
              const productName = product.name || product.title || 'Product';
              const productKey = product?.id || product?.slug || `${productName}-${index}`;
              return (
              <div
                key={productKey}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden group">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={productName}
                      className="w-full h-full object-cover group-hover:scale-105 transition cursor-pointer"
                      onError={applyImageFallback}
                      loading="lazy"
                      decoding="async"
                      onClick={() => navigate(`/store/${vendorSlug}/product/${product.id}`)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image available
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {Number(product.discount_percent || 0) > 0 && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        {Number(product.discount_percent || 0)}% OFF
                      </span>
                    )}
                    {product.is_natural_certified && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        100% Natural 🌿
                      </span>
                    )}
                    {product.available_quantity < 5 && product.available_quantity > 0 && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        Only {product.available_quantity} left!
                      </span>
                    )}
                    {product.available_quantity === 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3
                    className="font-semibold text-gray-800 mb-2 line-clamp-2 cursor-pointer hover:text-emerald-600"
                    onClick={() => navigate(`/store/${vendorSlug}/product/${product.id}`)}
                  >
                    {product.name || product.title}
                  </h3>
                  
                  {/* Category badge */}
                  {(product.category || product.category_name || product.category_type) && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-2">
                      {product.category || product.category_name || product.category_type}
                    </span>
                  )}

                  {Object.entries(product.product_attributes || {})
                    .filter(([, value]) => formatAttributeValue(value))
                    .slice(0, 2)
                    .length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {Object.entries(product.product_attributes || {})
                        .filter(([, value]) => formatAttributeValue(value))
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
                          >
                            {formatAttributeLabel(key)}: {formatAttributeValue(value)}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Price */}
                  {Number(product.discount_percent || 0) > 0 && Number(product.discounted_price || 0) > 0 ? (
                    <div className="mb-4 flex items-center gap-2">
                      <p className="text-2xl font-bold text-emerald-600">₹{Number(product.discounted_price).toFixed(0)}</p>
                      <p className="text-sm text-zinc-400 line-through">₹{Number(product.price || 0).toFixed(0)}</p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-emerald-600 mb-4">₹{Number(product.price || 0).toFixed(0)}</p>
                  )}

                  {/* Quantity info */}
                  {product.available_quantity > 0 && (
                    <p className="text-xs text-gray-500 mb-4">
                      Available: {product.available_quantity} items
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      disabled={product.available_quantity === 0}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Buy Now
                    </button>
                    <a
                      href={`https://wa.me/${(vendor?.whatsapp || '').replace(/\D/g, '')}?text=Hi%20I%27m%20interested%20in%20${encodeURIComponent(product.name || product.title || 'this product')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition text-center"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {canLoadMore ? (
            <div className="mb-12 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Load More Products
              </button>
            </div>
          ) : null}
        )}

        {/* Disclaimer */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <p className="text-blue-900 font-medium">
            💳 Payments go directly to <strong>{vendor?.business_name}</strong>.
            <br />
            NativeGlow is a platform service provider and is not responsible for third-party products, services, or transactions.
          </p>
        </div>
      </div>

      {/* Order Modal */}
      {selectedProduct && (
        <OrderModal
          product={selectedProduct}
          vendor={vendor}
          quantity={1}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

export default VendorStorePage;
