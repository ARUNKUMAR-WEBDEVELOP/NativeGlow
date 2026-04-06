import { Navigate, useLocation, useParams } from 'react-router-dom';
import BuyerGoogleLogin from '../../components/vendorsite/BuyerGoogleLogin';
import { useBuyerAuth } from '../../components/vendorsite/BuyerAuthContext';

export default function VendorSiteLogin() {
  const { slug, vendor_slug: legacyVendorSlug } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const location = useLocation();
  const { isLoggedIn, ready } = useBuyerAuth();

  const params = new URLSearchParams(location.search || '');
  const nextPath = params.get('next') || `/store/${vendorSlug}/products`;

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border bg-white/85 p-8 text-center shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--heading-font)' }}>Customer Login with Google</h1>
        <p className="mt-3 text-sm opacity-80">Checking your buyer session...</p>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-3xl border bg-white/85 p-8 text-center shadow-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
      <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--heading-font)' }}>Customer Login with Google</h1>
      <p className="text-sm opacity-80">
        Continue with your Google account to manage buyer profile, orders, and faster checkout.
      </p>

      <div className="flex items-center justify-center">
        <BuyerGoogleLogin showLogout={false} />
      </div>

      <p className="text-xs opacity-70">
        We only use your Google account to securely identify your buyer profile.
      </p>
    </div>
  );
}
