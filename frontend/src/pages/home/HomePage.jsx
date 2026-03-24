import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';

function HomePage() {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch categories
  useEffect(() => {
    let active = true;
    
    async function loadCategories() {
      try {
        const data = await api.getStoreCategories();
        if (active) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
        if (active) setCategories([]);
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }
    
    loadCategories();
    return () => { active = false; };
  }, []);

  // Fetch featured products
  useEffect(() => {
    let active = true;
    
    async function loadFeatured() {
      try {
        const data = await api.getStoreFeaturedProducts();
        if (active) {
          setFeaturedProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load featured products:', err);
        if (active) setFeaturedProducts([]);
      } finally {
        if (active) setProductsLoading(false);
      }
    }
    
    loadFeatured();
    return () => { active = false; };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    navigate(`/search?${params.toString()}`);
  };

  const handleCategoryClick = (categoryName) => {
    navigate(`/search?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-amber-50 to-orange-50 px-4 py-16 sm:px-8 sm:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-10 w-64 h-64 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-10 w-64 h-64 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight text-center">
            Pure Natural. 100% Yours.
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-zinc-700 text-center">
            Discover handcrafted natural cosmetics from verified sellers
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="mt-16 px-4 sm:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-6">Browse by Category</h2>
        
        {categoriesLoading ? (
          <div className="flex gap-2 overflow-x-auto pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-28 rounded-full bg-zinc-200 animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => handleCategoryClick(cat.category)}
                className="flex-shrink-0 px-4 py-2 rounded-full border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-colors font-semibold snap-start whitespace-nowrap"
              >
                {cat.category} ({cat.count})
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="mt-16 px-4 sm:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-6">Featured Products</h2>
        
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm animate-pulse">
                <div className="h-48 w-full rounded-lg bg-zinc-100 mb-3" />
                <div className="h-4 w-3/4 rounded bg-zinc-100 mb-2" />
                <div className="h-4 w-1/2 rounded bg-zinc-100 mb-3" />
                <div className="h-5 w-1/3 rounded bg-zinc-200" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-600">No featured products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/store/${product.vendor_slug}/products/${product.id}`)}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Product Image */}
                <div className="relative mb-3 overflow-hidden rounded-lg bg-zinc-100 h-48">
                  {product.primary_image ? (
                    <img
                      src={product.primary_image}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      No image
                    </div>
                  )}
                  {product.is_natural_certified && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      Natural
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <h3 className="font-semibold text-zinc-900 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-zinc-600 mt-1">{product.vendor_slug}</p>
                <p className="text-lg font-bold text-emerald-600 mt-2">₹{product.price}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="mt-16 px-4 sm:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-10 text-center">How It Works</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-emerald-600">1</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Browse Verified Products</h3>
            <p className="text-zinc-600">
              Explore handcrafted natural products from our verified sellers community
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-amber-600">2</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Pay Directly to Seller</h3>
            <p className="text-zinc-600">
              Send payment via UPI or bank transfer directly to the seller
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-orange-600">3</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Get Shipped to You</h3>
            <p className="text-zinc-600">
              Seller packages and ships your order directly to your doorstep
            </p>
          </div>
        </div>
      </section>

      {/* Platform Disclaimer Banner */}
      <section className="mt-16 px-4 sm:px-8 mb-12">
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 sm:p-8">
          <p className="text-sm sm:text-base text-zinc-700 leading-relaxed text-center">
            <strong>Platform Disclaimer:</strong> NativeGlow is a platform service provider. All payments are made directly to individual sellers. NativeGlow is not responsible for third-party products, their quality, authenticity, or delivery. Please verify seller information and product details before placing your order.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 px-4 sm:px-8 py-12 mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Logo */}
            <div>
              <h3 className="text-lg font-bold text-emerald-600 mb-2">NativeGlow</h3>
              <p className="text-sm text-zinc-600">
                Pure natural cosmetics from verified sellers
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-3">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="text-sm text-zinc-600 hover:text-emerald-600 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/vendor/register" className="text-sm text-zinc-600 hover:text-emerald-600 transition-colors">
                    Register as Seller
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-sm text-zinc-600 hover:text-emerald-600 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600">
            <p>&copy; 2025 NativeGlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


export default HomePage;
