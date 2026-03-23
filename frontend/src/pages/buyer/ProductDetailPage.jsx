import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import OrderModal from '../../components/buyer/OrderModal';

function ProductDetailPage() {
  const { vendor_slug, product_id } = useParams();
  const navigate = useNavigate();

  // State management
  const [product, setProduct] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIngredients, setExpandedIngredients] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch product detail
  useEffect(() => {
    let active = true;

    async function loadProductDetail() {
      try {
        const data = await api.getProductDetail(vendor_slug, product_id);
        if (active) {
          setProduct(data.product);
          setVendor(data.vendor);
          setQuantity(1);
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
  }, [vendor_slug, product_id]);

  // Handle quantity change
  const handleQuantityChange = (value) => {
    if (value > 0 && value <= product.available_quantity) {
      setQuantity(value);
      setOrderData({ ...orderData, quantity: value });
    }
  };

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

  const mainImage = product.images?.length > 0 ? product.images[selectedImageIndex]?.image : null;
  const ingredientsList = product.ingredients_list || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-orange-50 pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
          <button onClick={() => navigate('/')} className="hover:text-emerald-600">Home</button>
          <span>/</span>
          <button 
            onClick={() => navigate(`/store/${vendor_slug}`)}
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
            <div className="mb-4 rounded-lg overflow-hidden bg-white shadow-sm group">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-96 lg:h-[500px] object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-96 lg:h-[500px] flex items-center justify-center bg-gray-100 text-gray-400">
                  No image available
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedImageIndex === idx
                        ? 'border-emerald-600'
                        : 'border-gray-200 hover:border-emerald-400'
                    }`}
                  >
                    <img
                      src={img.image}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
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
                {product.category && (
                  <span className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {product.category}
                  </span>
                )}
              </div>
            </div>

            {/* Price & Availability */}
            <div>
              <p className="text-4xl font-bold text-emerald-600 mb-3">₹{product.price.toFixed(0)}</p>
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
                    Total: ₹{(product.price * quantity).toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            {product.available_quantity > 0 && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  Order Now
                </button>
                <a
                  href={`https://wa.me/${vendor.whatsapp?.replace(/\D/g, '') || ''}?text=Hi%20I%27m%20interested%20in%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 border-2 border-emerald-600 text-emerald-600 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition text-center"
                >
                  Chat on WhatsApp
                </a>
              </div>
            )}

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
                  <p className="font-semibold text-gray-900">📍 {vendor.city}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Status</p>
                  <p className="inline-flex items-center text-green-700 font-semibold">
                    ✅ Verified Seller
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/store/${vendor_slug}`)}
                className="w-full py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition font-medium"
              >
                View Full Store →
              </button>
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        {(product.description || ingredientsList.length > 0) && (
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
        />
      )}
    </div>
  );
}

export default ProductDetailPage;
