import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useParams } from 'react-router-dom';
import { useBuyerAuth } from './BuyerAuthContext';

function getApiBase() {
  return (
    import.meta.env.VITE_API_BASE ||
    (import.meta.env.DEV
      ? 'http://127.0.0.1:8000/api'
      : 'https://nativeglow.onrender.com/api')
  );
}

async function fetchGoogleProfile(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      return {};
    }
    return await res.json();
  } catch {
    return {};
  }
}

export default function BuyerGoogleLogin({
  vendorSlug: vendorSlugProp,
  className = '',
  showLogout = true,
}) {
  const { vendor_slug: routeVendorSlug } = useParams();
  const vendorSlug = vendorSlugProp || routeVendorSlug;
  const { buyer, isLoggedIn, login, logout } = useBuyerAuth();
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      setError('');
      setIsBusy(true);

      try {
        if (!vendorSlug) {
          throw new Error('Vendor site is missing.');
        }

        const googleToken = tokenResponse?.access_token;
        if (!googleToken) {
          throw new Error('Google token was not returned.');
        }

        const [buyerAuthRes, googleProfile] = await Promise.all([
          fetch(`${getApiBase()}/buyers/google-login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              google_token: googleToken,
              vendor_slug: vendorSlug,
            }),
          }),
          fetchGoogleProfile(googleToken),
        ]);

        const payload = await buyerAuthRes.json().catch(() => ({}));

        if (!buyerAuthRes.ok) {
          throw new Error(payload?.detail || 'Buyer login failed.');
        }

        login({
          accessToken: payload?.access_token,
          buyerName: payload?.buyer_name || googleProfile?.name || '',
          buyerEmail: googleProfile?.email || '',
        });
      } catch (err) {
        setError(err?.message || 'Google login failed.');
      } finally {
        setIsBusy(false);
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
  });

  if (isLoggedIn) {
    return (
      <div className={`flex items-center gap-2 ${className}`.trim()}>
        <span className="text-sm font-semibold" style={{ color: 'var(--site-text)' }}>
          Welcome, {buyer?.buyerName || 'Buyer'}!
        </span>
        {showLogout ? (
          <button
            type="button"
            onClick={logout}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            Logout
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => googleLogin()}
        disabled={isBusy}
        className="rounded-full px-3 py-1.5 text-sm font-semibold"
        style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
      >
        {isBusy ? 'Signing in...' : 'Login with Google'}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
