import { Link } from 'react-router-dom';
import { useVendorSite } from './VendorSiteLayout';
import { applyImageFallback, getPrimaryProductImage } from '../../utils/imageUrl';

function SectionCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 text-sm text-zinc-600">{children}</div>
    </section>
  );
}

export default function VendorSiteHome() {
  const { vendor, featuredProducts, loading, errorStatus } = useVendorSite();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-lg font-medium text-zinc-700">Loading store...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900">Store unavailable</h1>
          <p className="text-zinc-600">
            This vendor store is not available right now.
          </p>
        </div>
      </div>
    );
  }

  const storeName = vendor?.store_name || vendor?.business_name || vendor?.name || 'Store';
  const aboutText =
    vendor?.about_vendor ||
    'Explore products from this vendor store and browse the full collection in the products page.';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 shadow-sm md:p-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Vendor Store
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-5xl">
            {storeName}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
            {aboutText}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="products"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              View Products
            </Link>
            <Link
              to="about"
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              About Store
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Store Summary">
          <div className="space-y-2">
            <p>
              <span className="font-semibold text-zinc-800">Products:</span>{' '}
              {Array.isArray(featuredProducts) ? featuredProducts.length : 0} featured
            </p>
            {vendor?.city ? (
              <p>
                <span className="font-semibold text-zinc-800">City:</span> {vendor.city}
              </p>
            ) : null}
            {vendor?.member_since ? (
              <p>
                <span className="font-semibold text-zinc-800">Member since:</span> {vendor.member_since}
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Quick Links">
          <div className="flex flex-wrap gap-3">
            <Link to="products" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Shop Products
            </Link>
            <Link to="track" className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
              Track Order
            </Link>
            <Link to="login" className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
              Buyer Login
            </Link>
          </div>
        </SectionCard>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Featured Products</h2>
            <p className="text-sm text-zinc-500">Approved products available for buyers</p>
          </div>
          <Link to="products" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            See all
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product) => {
              const primaryImage = getPrimaryProductImage(product);
              return (
                <article key={product.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={product.title || product.name || 'Product'}
                        className="h-full w-full object-cover"
                        onError={applyImageFallback}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="text-base font-semibold text-zinc-900">
                      {product.title || product.name}
                    </h3>
                    {product.short_description ? (
                      <p className="line-clamp-2 text-sm text-zinc-600">{product.short_description}</p>
                    ) : null}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-semibold text-zinc-900">
                        {product.price ? `Rs. ${product.price}` : 'Price on request'}
                      </span>
                      <span className="text-xs font-medium text-emerald-700">Buyable</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">
            No products are live yet.
          </div>
        )}
      </section>
    </div>
  );
}