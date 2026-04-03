import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useVendorSite } from './VendorSiteLayout';
import platformContent from '../../content/platformContent';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value) {
  return `Rs ${toNumber(value).toLocaleString('en-IN')}`;
}

function getPrimaryImage(product) {
  if (product?.primary_image) return product.primary_image;
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0]?.image || product.images[0]?.url || '';
  }
  return '';
}

export default function VendorSiteHome() {
  const { vendor_slug: vendorSlug } = useParams();
  const { vendor, featuredProducts, allProducts } = useVendorSite();
  const { vendor_site: vendorSiteContent } = platformContent;

  const storeName = vendor?.business_name || vendorSlug || 'Store';
  const bannerImage = vendor?.site_banner_image || '';
  const aboutText = vendor?.about_vendor || 'Premium natural products crafted with care.';
  const displayProducts = useMemo(() => {
    if (Array.isArray(featuredProducts) && featuredProducts.length > 0) {
      return featuredProducts.slice(0, 8);
    }
    return (allProducts || []).slice(0, 8);
  }, [featuredProducts, allProducts]);

  return (
    <div className="space-y-10 pb-8">
      <section
        className="relative overflow-hidden rounded-3xl border px-6 py-12 text-white shadow-lg"
        style={{
          borderColor: 'rgba(255,255,255,0.2)',
          background: bannerImage
            ? `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%), url(${bannerImage}) center/cover`
            : 'linear-gradient(135deg, var(--primary), var(--accent))',
        }}
      >
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold">
            {vendorSiteContent.verified_badge}
          </span>
          <h1 className="text-4xl font-bold md:text-5xl" style={{ fontFamily: 'var(--heading-font)' }}>
            {storeName}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-white/90 md:text-base">{aboutText}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/site/${vendorSlug}/products`}
              className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Browse Products
            </Link>
            <Link
              to={`/site/${vendorSlug}/about`}
              className="rounded-full border border-white/30 bg-transparent px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              About Seller
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white/85 p-6 shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
        <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>How To Order</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {vendorSiteContent.order_steps.map((step) => (
            <article key={step.step} className="rounded-2xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                Step {step.step}
              </p>
              <p className="mt-2 text-sm font-semibold">{step.title}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>Featured Products</h2>
          <Link to={`/site/${vendorSlug}/products`} className="text-sm font-semibold underline" style={{ color: 'var(--primary)' }}>
            View all
          </Link>
        </div>

        {displayProducts.length === 0 ? (
          <div className="rounded-2xl border bg-white/85 p-6 text-sm opacity-75" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            Products will appear here after the vendor adds listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayProducts.map((product) => {
              const productName = product?.name || product?.title || 'Product';
              const image = getPrimaryImage(product);

              return (
                <article key={product.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    {image ? (
                      <img src={image} alt={productName} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs opacity-70">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold">{productName}</h3>
                    <p className="mt-1 text-sm font-semibold">{formatPrice(product?.price)}</p>
                    <Link
                      to={`/store/${vendorSlug}/products/${product.id}`}
                      className="mt-3 inline-flex rounded-full px-4 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
                    >
                      Order Now
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border px-5 py-4 text-sm opacity-85" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        <p>{vendorSiteContent.disclaimer}</p>
      </section>
    </div>
  );
}
