import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import BuyerGoogleLogin from '../../components/vendorsite/BuyerGoogleLogin';
import { BuyerAuthProvider } from '../../components/vendorsite/BuyerAuthContext';

export const VendorSiteContext = createContext({
  vendor: null,
  featuredProducts: [],
  allProducts: [],
  categories: [],
  loading: true,
  errorStatus: null,
});

const THEMES = {
  default: {
    primary: '#2d5a27',
    secondary: '#f5f0e8',
    accent: '#3f7d37',
    text: '#17201a',
    headingFont: '"Poppins", "Segoe UI", sans-serif',
    bodyFont: '"Inter", "Segoe UI", sans-serif',
  },
  minimal: {
    primary: '#111111',
    secondary: '#ffffff',
    accent: '#2f2f2f',
    text: '#111111',
    headingFont: '"Helvetica Neue", "Arial", sans-serif',
    bodyFont: '"Helvetica Neue", "Arial", sans-serif',
  },
  bold: {
    primary: '#c14d00',
    secondary: '#27272a',
    accent: '#ff8c42',
    text: '#f8f8f8',
    headingFont: '"Oswald", "Arial Black", sans-serif',
    bodyFont: '"Archivo", "Segoe UI", sans-serif',
  },
  elegant: {
    primary: '#e8b86d',
    secondary: '#111d3a',
    accent: '#b08a46',
    text: '#f8f0df',
    headingFont: '"Playfair Display", "Times New Roman", serif',
    bodyFont: '"Lora", "Georgia", serif',
  },
};

function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE ||
    (import.meta.env.DEV
      ? 'http://127.0.0.1:8000/api'
      : 'https://nativeglow.onrender.com/api')
  );
}

function getTheme(themeName) {
  return THEMES[themeName] || THEMES.default;
}

function StatePage({ title, message }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--heading-font)' }}>
        {title}
      </h1>
      <p className="mt-4 text-base opacity-80" style={{ fontFamily: 'var(--body-font)' }}>
        {message}
      </p>
    </div>
  );
}

export function useVendorSite() {
  return useContext(VendorSiteContext);
}

export default function VendorSiteLayout() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const [vendor, setVendor] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVendor() {
      setLoading(true);
      setErrorStatus(null);

      try {
        const res = await fetch(`${getApiBase()}/site/${vendorSlug}/`);

        if (!res.ok) {
          if (!cancelled) {
            setErrorStatus(res.status);
            setVendor(null);
            setFeaturedProducts([]);
            setAllProducts([]);
            setCategories([]);
          }
          return;
        }

        const data = await res.json();
        const normalizedVendor = data?.vendor || data || null;
        const normalizedProducts = Array.isArray(data?.all_products)
          ? data.all_products
          : Array.isArray(data?.products)
            ? data.products
            : [];
        const normalizedFeatured = Array.isArray(data?.featured_products)
          ? data.featured_products
          : normalizedProducts.filter((p) => p?.is_featured);
        const normalizedCategories = Array.isArray(data?.categories) && data.categories.length
          ? data.categories
          : Array.from(
            new Set(
              normalizedProducts
                .map((p) => p?.category || p?.category_type)
                .filter(Boolean)
            )
          );

        if (!cancelled) {
          setVendor(normalizedVendor);
          setFeaturedProducts(normalizedFeatured);
          setAllProducts(normalizedProducts);
          setCategories(normalizedCategories);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorStatus(err?.status || 500);
          setVendor(null);
          setFeaturedProducts([]);
          setAllProducts([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (vendorSlug) {
      loadVendor();
    } else {
      setLoading(false);
      setErrorStatus(404);
      setVendor(null);
      setFeaturedProducts([]);
      setAllProducts([]);
      setCategories([]);
    }

    return () => {
      cancelled = true;
    };
  }, [vendorSlug]);

  const theme = useMemo(() => getTheme(vendor?.site_theme), [vendor?.site_theme]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = {
      primary: root.style.getPropertyValue('--primary'),
      secondary: root.style.getPropertyValue('--secondary'),
      accent: root.style.getPropertyValue('--accent'),
      siteText: root.style.getPropertyValue('--site-text'),
      headingFont: root.style.getPropertyValue('--heading-font'),
      bodyFont: root.style.getPropertyValue('--body-font'),
    };

    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--site-text', theme.text);
    root.style.setProperty('--heading-font', theme.headingFont);
    root.style.setProperty('--body-font', theme.bodyFont);

    return () => {
      root.style.setProperty('--primary', previous.primary);
      root.style.setProperty('--secondary', previous.secondary);
      root.style.setProperty('--accent', previous.accent);
      root.style.setProperty('--site-text', previous.siteText);
      root.style.setProperty('--heading-font', previous.headingFont);
      root.style.setProperty('--body-font', previous.bodyFont);
    };
  }, [theme]);

  const contextValue = useMemo(
    () => ({ vendor, featuredProducts, allProducts, categories, loading, errorStatus }),
    [vendor, featuredProducts, allProducts, categories, loading, errorStatus]
  );

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--secondary)', color: 'var(--site-text)' }}>
        <StatePage title="Loading Store" message="Fetching store details..." />
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--secondary)', color: 'var(--site-text)' }}>
        <StatePage
          title="Store Coming Soon"
          message="This store has not gone live yet. Please check back shortly."
        />
      </div>
    );
  }

  if (errorStatus === 404) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--secondary)', color: 'var(--site-text)' }}>
        <StatePage
          title="Store Not Found"
          message="We could not find this store. Verify the URL and try again."
        />
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--secondary)', color: 'var(--site-text)' }}>
        <StatePage
          title="Unable To Load Store"
          message="Something went wrong while loading this store. Please try again."
        />
      </div>
    );
  }

  const storeName =
    vendor?.store_name ||
    vendor?.business_name ||
    vendor?.name ||
    vendorSlug;

  const logoUrl = vendor?.logo_url || vendor?.site_logo_url || vendor?.site_logo || vendor?.logo;

  const navLinks = [
    { label: 'Home', to: `/store/${vendorSlug}` },
    { label: 'Products', to: `/store/${vendorSlug}/products` },
    { label: 'About', to: `/store/${vendorSlug}/about` },
    { label: 'Track Order', to: `/store/${vendorSlug}/track` },
    { label: 'My Orders', to: `/store/${vendorSlug}/my-orders` },
  ];

  return (
    <VendorSiteContext.Provider value={contextValue}>
      <BuyerAuthProvider vendorSlug={vendorSlug}>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--secondary)', color: 'var(--site-text)' }}>
        <header className="border-b" style={{ borderColor: 'var(--primary)' }}>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <Link to={`/store/${vendorSlug}`} className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-10 w-10 rounded-full border object-cover"
                  style={{ borderColor: 'var(--primary)' }}
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
                >
                  {String(storeName).slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-lg font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>
                {storeName}
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-2 md:gap-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.label === 'Home'}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1.5 text-sm transition ${
                      isActive ? 'font-semibold' : 'opacity-80 hover:opacity-100'
                    }`
                  }
                  style={({ isActive }) => ({
                    border: `1px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    color: 'var(--site-text)',
                  })}
                >
                  {link.label}
                </NavLink>
              ))}
              <Link
                to={`/store/${vendorSlug}/cart`}
                className="rounded-full px-3 py-1.5 text-sm transition opacity-80 hover:opacity-100"
                style={{ border: '1px solid transparent', color: 'var(--site-text)' }}
              >
                Cart
              </Link>
              <BuyerGoogleLogin vendorSlug={vendorSlug} />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      </BuyerAuthProvider>
    </VendorSiteContext.Provider>
  );
}
