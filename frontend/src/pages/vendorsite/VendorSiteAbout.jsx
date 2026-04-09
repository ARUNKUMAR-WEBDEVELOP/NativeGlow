import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVendorSite } from './VendorSiteLayout';
import { resolveImageUrl } from '../../utils/imageUrl';

function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE ||
    (import.meta.env.DEV
      ? 'http://127.0.0.1:8000/api'
      : 'https://nativeglow.onrender.com/api')
  );
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border bg-white/85 p-5 text-center shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
      <p className="text-3xl font-extrabold" style={{ fontFamily: 'var(--heading-font)', color: 'var(--primary)' }}>
        {value}
      </p>
      <p className="mt-1 text-sm opacity-80">{label}</p>
    </article>
  );
}

export default function VendorSiteAbout() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const { vendor: vendorFromContext } = useVendorSite();
  const [aboutData, setAboutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadAbout() {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`${getApiBase()}/site/${vendorSlug}/about/`);
        if (!res.ok) {
          throw new Error(`Unable to load about page (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setAboutData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load about page right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (vendorSlug) {
      loadAbout();
    } else {
      setError('Store not found.');
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [vendorSlug]);

  const businessName = aboutData?.business_name || vendorFromContext?.business_name || vendorSlug;
  const memberSince = aboutData?.member_since || vendorFromContext?.member_since || 'N/A';
  const logo = resolveImageUrl(
    aboutData?.site_logo ||
    aboutData?.site_banner_image ||
    vendorFromContext?.site_logo ||
    vendorFromContext?.site_banner_image ||
    ''
  );
  const story = aboutData?.about_vendor || vendorFromContext?.about_vendor || 'Our story is being written with every carefully made product.';
  const youtubeUrl = aboutData?.youtube_url || vendorFromContext?.youtube_url;
  const instagramUrl = aboutData?.instagram_url || vendorFromContext?.instagram_url;
  const whatsappNumber = vendorFromContext?.whatsapp_number;

  const numbers = useMemo(
    () => [
      { label: 'Products', value: aboutData?.product_count ?? 0 },
      { label: 'Orders', value: aboutData?.total_orders_delivered ?? 0 },
      { label: 'Member Since', value: memberSince },
    ],
    [aboutData, memberSince]
  );

  if (loading) {
    return <div className="py-16 text-center text-sm opacity-75">Loading brand story...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-10 pb-8">
      <section className="rounded-3xl border bg-white/85 p-8 text-center shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
        <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border bg-slate-100" style={{ borderColor: 'var(--primary)' }}>
          {logo ? (
            <img src={logo} alt={businessName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold" style={{ color: 'var(--primary)' }}>
              {String(businessName).slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold md:text-4xl" style={{ fontFamily: 'var(--heading-font)' }}>
          {businessName}
        </h1>

        <div className="mt-3 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
          Verified Natural Seller on NativeGlow ✅
        </div>

        <p className="mt-3 text-sm opacity-75">Member since {memberSince}</p>
      </section>

      <section className="relative overflow-hidden rounded-3xl border bg-white/85 p-6 md:p-8" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
        <div className="pointer-events-none absolute -right-12 top-1/2 hidden -translate-y-1/2 opacity-20 md:block" aria-hidden="true">
          <svg width="170" height="170" viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M26 138C26 79 67 31 126 22C118 82 84 129 26 138Z" fill="var(--primary)"/>
            <path d="M46 128C54 99 82 71 112 60" stroke="white" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        </div>

        <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>Our Story</h2>
        <blockquote className="mt-4 max-w-3xl border-l-4 pl-4 text-lg leading-8" style={{ borderColor: 'var(--primary)', fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
          {story}
        </blockquote>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>By The Numbers</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {numbers.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-white/80 p-6" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
        <h2 className="text-2xl font-semibold" style={{ fontFamily: 'var(--heading-font)' }}>Connect With Us</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {youtubeUrl ? (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border p-4 transition hover:shadow-md"
              style={{ borderColor: '#ff0000' }}
            >
              <p className="text-sm font-semibold text-red-600">YouTube Channel</p>
              <p className="mt-1 text-xs opacity-70">Watch tutorials, rituals, and behind-the-scenes stories.</p>
            </a>
          ) : null}

          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border p-4 transition hover:shadow-md"
              style={{ borderColor: 'var(--primary)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Instagram</p>
              <p className="mt-1 text-xs opacity-70">Daily product highlights and customer moments.</p>
            </a>
          ) : null}
        </div>

        {whatsappNumber ? (
          <a
            href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: '#25D366', color: '#ffffff' }}
          >
            Contact on WhatsApp
          </a>
        ) : null}
      </section>

      <section className="rounded-2xl border px-5 py-4 text-sm opacity-85" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        <p>
          This store operates on NativeGlow platform. All products are independently managed by {businessName}.
        </p>
        <Link to="/about" className="mt-2 inline-flex font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--primary)' }}>
          Learn about NativeGlow →
        </Link>
      </section>
    </div>
  );
}
