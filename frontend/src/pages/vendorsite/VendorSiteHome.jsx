import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { theme } from '../../styles/designSystem';
import ProductCard3D from '../../components/common/ProductCard3D';
import platformContent from '../../content/platformContent';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

// â”€â”€â”€ NAVBAR COMPONENT â”€â”€â”€
function Navbar({ vendorData, scrolled, vendorSiteContent }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBuyerLoggedIn, setIsBuyerLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('buyer_token');
    setIsBuyerLoggedIn(!!token);
  }, []);

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b transition-all"
      style={{
        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
        borderColor: scrolled ? `${theme.colors.muted}20` : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Name */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: theme.colors.primaryGlow }}
            >
              ðŸŒ¿
            </div>
            <div>
              <h2
                className="font-bold text-lg hidden sm:inline"
                style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
              >
                {vendorData?.business_name || 'Store'}
              </h2>
              <div className="mt-1">
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                  style={{
                    borderColor: `${theme.colors.primary}25`,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    color: theme.colors.primary,
                  }}
                >
                  <span style={{ color: '#22c55e' }}>✓</span>
                  {vendorSiteContent.verified_badge}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className="text-sm font-medium hover:text-primary" style={{ color: theme.colors.charcoal }}>
              Home
            </a>
            <a href="#products" className="text-sm font-medium hover:text-primary" style={{ color: theme.colors.charcoal }}>
              Products
            </a>
            <a href="#about" className="text-sm font-medium hover:text-primary" style={{ color: theme.colors.charcoal }}>
              About
            </a>
            <a href="#contact" className="text-sm font-medium hover:text-primary" style={{ color: theme.colors.charcoal }}>
              Contact
            </a>
          </div>

          {/* Right Side: Auth Button or Avatar */}
          <div className="flex items-center gap-4">
            {!isBuyerLoggedIn ? (
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Login
              </button>
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
                style={{ backgroundColor: theme.colors.primaryGlow }}
              >
                B
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-2xl"
            >
              â˜°
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-3">
            <a href="#home" className="block text-sm font-medium py-2" style={{ color: theme.colors.charcoal }}>
              Home
            </a>
            <a href="#products" className="block text-sm font-medium py-2" style={{ color: theme.colors.charcoal }}>
              Products
            </a>
            <a href="#about" className="block text-sm font-medium py-2" style={{ color: theme.colors.charcoal }}>
              About
            </a>
            <a href="#contact" className="block text-sm font-medium py-2" style={{ color: theme.colors.charcoal }}>
              Contact
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}

// â”€â”€â”€ FADE-UP ANIMATION DIRECTIVE â”€â”€â”€
function FadeUpElement({ children }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1 });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {children}
    </div>
  );
}

// â”€â”€â”€ MAIN VENDOR SITE HOME â”€â”€â”€
export default function VendorSiteHome() {
  const { vendor_slug } = useParams();
  const { vendor_site: vendorSiteContent } = platformContent;
  const [vendorData, setVendorData] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const productsRef = useRef(null);

  // Fetch vendor data and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const vendorRes = await fetch(`${API_BASE}/vendor/site/${vendor_slug}/`);
        if (!vendorRes.ok) throw new Error('Vendor not found');
        const vendor = await vendorRes.json();
        setVendorData(vendor);

        // Apply theme to document root
        if (vendor.site_theme) {
          const root = document.documentElement;
          const themeColors = vendor.site_theme;
          Object.entries(themeColors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
          });
        }

        // Fetch products
        const productsRes = await fetch(`${API_BASE}/vendor/${vendor.id}/products/`);
        const products = await productsRes.json();
        setAllProducts(Array.isArray(products) ? products : []);

        // Featured products (first 8)
        setFeaturedProducts(Array.isArray(products) ? products.slice(0, 8) : []);
      } catch (err) {
        console.error('Failed to load vendor data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vendor_slug]);

  // Handle scroll for navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [allProducts]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return allProducts;
    return allProducts.filter(p => p.category === activeCategory);
  }, [allProducts, activeCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-semibold">Loading store...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Navbar */}
      <Navbar vendorData={vendorData} scrolled={scrolled} vendorSiteContent={vendorSiteContent} />

      {/* Hero Section */}
      <section
        id="home"
        className="relative h-screen w-full overflow-hidden flex items-center justify-center text-white"
        style={{
          background: vendorData?.site_banner_image
            ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%), url(${vendorData.site_banner_image}) center/cover`
            : `linear-gradient(135deg, ${theme.colors.primary}99 0%, ${theme.colors.primaryDark}99 100%)`,
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Content */}
        <div className="text-center space-y-6 max-w-2xl px-4">
          <h1
            className="text-5xl sm:text-6xl font-bold leading-tight"
            style={{ fontFamily: theme.fonts.heading }}
          >
            {vendorData?.business_name}
          </h1>

          <div className="space-y-4">
            <p className="text-lg sm:text-xl opacity-90">
              {vendorData?.about_vendor?.slice(0, 150) || 'Premium natural products crafted with care'}
            </p>

            {vendorData?.is_natural_certified && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <span>âœ…</span>
                <span className="text-sm font-semibold">Verified Natural Seller</span>
              </div>
            )}
          </div>

          <button
            onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: theme.colors.primaryGlow }}
          >
            Shop Now
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <span className="text-2xl">â†“</span>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <FadeUpElement>
          <div className="mb-8">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
            >
              Our Best Sellers
            </h2>
            <p style={{ color: theme.colors.muted }}>Hand-picked products</p>
          </div>

          {/* Horizontal Scroll */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-4">
              {featuredProducts.map(product => (
                <div key={product.id} className="min-w-[280px] flex-shrink-0">
                  <ProductCard3D
                    product={product}
                    theme={theme}
                    onOrder={() => console.log('Order:', product.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </FadeUpElement>
      </section>

      {/* All Products Section */}
      <section id="products" ref={productsRef} className="max-w-7xl mx-auto px-4 py-16">
        <FadeUpElement>
          <div className="mb-8">
            <h2
              className="text-3xl font-bold mb-6"
              style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
            >
              Our Products
            </h2>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-8 sticky top-20 bg-white pt-4 z-30">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: activeCategory === cat ? theme.colors.primary : `${theme.colors.muted}10`,
                    color: activeCategory === cat ? 'white' : theme.colors.charcoal,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(product => (
                <FadeUpElement key={product.id}>
                  <ProductCard3D
                    product={product}
                    theme={theme}
                    onOrder={() => console.log('Order:', product.id)}
                  />
                </FadeUpElement>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <FadeUpElement>
                <div className="text-center py-12">
                  <p className="text-lg" style={{ color: theme.colors.muted }}>
                    No products found in this category
                  </p>
                </div>
              </FadeUpElement>
            )}
          </div>
        </FadeUpElement>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 py-16">
        <FadeUpElement>
          <div className="grid gap-8 md:grid-cols-2 items-center">
            {/* Left: Logo & Stats */}
            <div className="space-y-6">
              {vendorData?.site_logo && (
                <img
                  src={vendorData.site_logo}
                  alt={vendorData.business_name}
                  className="h-32 w-32 rounded-2xl object-cover"
                />
              )}

              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}10` }}>
                  <p style={{ color: theme.colors.muted }} className="text-sm">Total Products</p>
                  <p className="text-4xl font-bold" style={{ color: theme.colors.primary }}>
                    {allProducts.length}
                  </p>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: `${theme.colors.primaryGlow}10` }}>
                  <p style={{ color: theme.colors.muted }} className="text-sm">Happy Customers</p>
                  <p className="text-4xl font-bold" style={{ color: theme.colors.primaryGlow }}>
                    500+
                  </p>
                </div>
              </div>
            </div>

            {/* Right: About Text */}
            <div className="space-y-4">
              <h3
                className="text-3xl font-bold"
                style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
              >
                Our Story
              </h3>

              <p style={{ color: theme.colors.charcoal }} className="leading-relaxed">
                {vendorData?.about_vendor || 'We are passionate about creating premium natural products that enhance your daily wellness routine. Every product is carefully crafted with the finest natural ingredients.'}
              </p>

              <button
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Read Our Full Story â†’
              </button>
            </div>
          </div>
        </FadeUpElement>
      </section>

      {/* How to Order */}
      <section className="bg-white py-16">
        <FadeUpElement>
          <div className="max-w-7xl mx-auto px-4">
            <h2
              className="text-3xl font-bold text-center mb-12"
              style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
            >
              How to Order
            </h2>

            <div className="grid gap-8 md:grid-cols-3">
              {vendorSiteContent.order_steps.map((item) => {
                const iconMap = {
                  search: '🔎',
                  phone: '📱',
                  truck: '🚚',
                };
                const iconSymbol = iconMap[item.icon] || '•';

                return (
                <div
                  key={item.step}
                  className="text-center card-3d p-6 rounded-2xl border"
                  style={{
                    borderColor: `${theme.colors.primary}20`,
                    backgroundColor: theme.colors.cream,
                  }}
                >
                  <div className="text-sm font-bold mb-2" style={{ color: theme.colors.primaryGlow }}>
                    {item.step}
                  </div>
                  <div className="text-4xl mb-4">{iconSymbol}</div>
                  <h4
                    className="text-xl font-bold mb-2"
                    style={{ color: theme.colors.charcoal }}
                  >
                    {item.title}
                  </h4>
                </div>
              );
              })}
            </div>
          </div>
        </FadeUpElement>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-12">
        <FadeUpElement>
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-3 mb-8">
              {/* Left */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.colors.primaryGlow }}>
                    ðŸŒ¿
                  </div>
                  <span className="font-bold">{vendorData?.business_name}</span>
                </div>
                <p className="text-sm opacity-80">Premium natural products for your wellness</p>
              </div>

              {/* Center */}
              <div>
                <h4 className="font-semibold mb-3">Quick Links</h4>
                <ul className="space-y-2 text-sm opacity-80">
                  <li><a href="#home" className="hover:opacity-100">Home</a></li>
                  <li><a href="#products" className="hover:opacity-100">Products</a></li>
                  <li><a href="#about" className="hover:opacity-100">About</a></li>
                </ul>
              </div>

              {/* Right: Social */}
              <div>
                <h4 className="font-semibold mb-3">Connect</h4>
                <div className="flex gap-3">
                  {vendorData?.instagram_url && (
                    <a href={vendorData.instagram_url} target="_blank" rel="noreferrer" className="text-lg hover:opacity-80">
                      ðŸ“¸
                    </a>
                  )}
                  {vendorData?.youtube_url && (
                    <a href={vendorData.youtube_url} target="_blank" rel="noreferrer" className="text-lg hover:opacity-80">
                      â–¶ï¸
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-white/20 pt-6 text-center text-sm opacity-60">
              <p>{vendorSiteContent.powered_by}</p>
              <p className="mx-auto mt-2 max-w-[600px] text-[12px] leading-5 opacity-70">
                {vendorSiteContent.disclaimer}
              </p>
            </div>
          </div>
        </FadeUpElement>
      </footer>

      {/* Floating WhatsApp Button */}
      {vendorData?.whatsapp_number && (
        <a
          href={`https://wa.me/${vendorData.whatsapp_number}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center text-3xl rounded-full"
          style={{
            backgroundColor: '#25D366',
            width: '60px',
            height: '60px',
            boxShadow: `0 0 20px ${theme.colors.primaryGlow}40`,
          }}
        >
          ðŸ’¬
        </a>
      )}
    </div>
  );}