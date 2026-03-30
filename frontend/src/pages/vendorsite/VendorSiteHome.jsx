import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVendorSite } from './VendorSiteLayout';

function getDisplayName(product) {
  return product?.name || product?.title || 'Product';
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value) {
  const n = toNumber(value);
  return `Rs ${n.toLocaleString('en-IN')}`;
}

function getTag(product) {
  const raw = String(product?.product_tag || '').trim().toLowerCase();
  if (!raw) {
    return '';
  }
  if (raw === 'new' || raw === 'new arrival') {
    return 'NEW';
  }
  if (raw === 'sale') {
    return 'SALE';
  }
  if (raw === 'bestseller' || raw === 'best seller') {
    return 'BESTSELLER';
  }
  return raw.toUpperCase();
}

function ProductPrice({ product }) {
  const price = toNumber(product?.price);
  const discountPercent = toNumber(product?.discount_percent);
  const discounted = product?.discounted_price != null
    ? toNumber(product.discounted_price)
    : Math.max(price - (price * discountPercent) / 100, 0);

  const hasDiscount = discountPercent > 0 && discounted > 0 && discounted < price;

  if (!hasDiscount) {
    return <p className="mt-1 text-sm font-semibold">{formatPrice(price)}</p>;
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="text-sm font-semibold text-red-600">{formatPrice(discounted)}</span>
      <span className="text-xs opacity-70 line-through">{formatPrice(price)}</span>
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        {discountPercent}% OFF
      </span>
    </div>
  );
}

function ProductCard({ product, vendorSlug }) {
  const name = getDisplayName(product);
  const tag = getTag(product);
  const image = product?.primary_image;

  return (
    <article className="group overflow-hidden rounded-2xl border bg-white/90 shadow-sm transition hover:shadow-md" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm opacity-60">No Image</div>
        )}

        {tag ? (
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
          >
            {tag}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold" title={name}>{name}</h3>
        <ProductPrice product={product} />

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled
            className="rounded-full border px-3 py-1.5 text-xs font-semibold opacity-60"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            title="Cart integration coming soon"
          >
            Add to Cart
          </button>
          <Link
            to={`/store/${vendorSlug}/products/${product.id}`}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
          >
            Order Now
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function VendorSiteHome() {
  const { vendor_slug: vendorSlug } = useParams();
  const { vendor, featuredProducts, allProducts, categories } = useVendorSite();
  const [activeCategory, setActiveCategory] = useState('All');
  const productSectionRef = useRef(null);

  const storeName = vendor?.business_name || vendorSlug;
  const aboutText = String(vendor?.about_vendor || '').trim();
  const aboutPreview = aboutText ? aboutText.slice(0, 100) : 'Clean beauty and natural care crafted with intention.';
  const heroBackground = vendor?.site_banner_image
    ? `url(${vendor.site_banner_image}) center/cover no-repeat`
    : 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 85%, #000 15%), color-mix(in srgb, var(--secondary) 80%, #fff 20%))';

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') {
      return allProducts;
    }
    return allProducts.filter(
      (product) => String(product?.category || '').toLowerCase() === activeCategory.toLowerCase()
    );
  }, [allProducts, activeCategory]);

  const pills = useMemo(() => {
    const base = ['All'];
    const fromContext = Array.isArray(categories) ? categories : [];
    const dynamic = fromContext.length
      ? fromContext
      : Array.from(new Set(allProducts.map((p) => p?.category).filter(Boolean)));
    return [...base, ...dynamic];
  }, [categories, allProducts]);

  const onShopNow = () => {
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-10 pb-8">
      <section
        className="relative overflow-hidden rounded-3xl"
        style={{
          minHeight: 360,
          background: heroBackground,
        }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative flex min-h-[360px] items-end px-6 py-8 md:px-10">
          <div className="max-w-2xl text-white">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl" style={{ fontFamily: 'var(--heading-font)' }}>
              {storeName}
            </h1>
            <p className="mt-3 text-sm md:text-base" style={{ fontFamily: 'var(--body-font)' }}>
              {aboutPreview}
              {aboutText.length > 100 ? '...' : ''}
            </p>
            <button
              type="button"
              onClick={onShopNow}
              className="mt-6 rounded-full px-5 py-2 text-sm font-semibold"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
            >
              Shop Now
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--heading-font)' }}>Our Best Sellers</h2>
          <Link to={`/site/${vendorSlug}/products`} className="text-sm font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--primary)' }}>
            View All
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {(featuredProducts.length ? featuredProducts : allProducts.slice(0, 8)).map((product) => (
            <div key={product.id} className="min-w-[260px] max-w-[260px] flex-shrink-0">
              <ProductCard product={product} vendorSlug={vendorSlug} />
            </div>
          ))}
        </div>
      </section>

      <section ref={productSectionRef}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {pills.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className="rounded-full px-3 py-1.5 text-sm"
                style={{
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'var(--secondary)' : 'var(--site-text)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'rgba(0,0,0,0.12)'}`,
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} vendorSlug={vendorSlug} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border px-5 py-6" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {vendor?.site_logo ? (
            <img src={vendor.site_logo} alt={storeName} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}>
              {String(storeName).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="line-clamp-2 text-sm opacity-85">{aboutText || 'We build products inspired by tradition and crafted for modern daily care.'}</p>
          </div>
          <Link to={`/site/${vendorSlug}/about`} className="rounded-full border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            Read More
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border px-5 py-6" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>Connect With Us</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {vendor?.youtube_url ? (
            <a
              href={vendor.youtube_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: '#ff0000', color: '#ffffff' }}
            >
              ▶ Watch Us On YouTube
            </a>
          ) : null}

          {vendor?.instagram_url ? (
            <a
              href={vendor.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              Instagram
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border px-5 py-6" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">Powered by NativeGlow 🌿</p>
          <div className="flex flex-wrap items-center gap-3">
            {vendor?.instagram_url ? (
              <a href={vendor.instagram_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                Instagram
              </a>
            ) : null}
            {vendor?.youtube_url ? (
              <a href={vendor.youtube_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                YouTube
              </a>
            ) : null}
            {vendor?.whatsapp_number ? (
              <a
                href={`https://wa.me/${String(vendor.whatsapp_number).replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-3 py-1.5 font-semibold"
                style={{ backgroundColor: '#25D366', color: '#ffffff' }}
              >
                WhatsApp
              </a>
            ) : null}
            <Link to={`/site/${vendorSlug}/track`} className="underline-offset-2 hover:underline" style={{ color: 'var(--primary)' }}>
              Track Order
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
