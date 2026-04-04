import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function getBaseCandidates() {
  const candidates = [API_BASE];
  if (API_BASE.endsWith('/api')) {
    candidates.push(API_BASE.slice(0, -4));
  }
  return [...new Set(candidates)].filter(Boolean);
}

export default function VendorActivate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function activate() {
      if (!token) {
        navigate('/vendor/login', { replace: true });
        return;
      }

      const bases = getBaseCandidates();
      let lastError = null;

      for (const base of bases) {
        try {
          const response = await fetch(
            `${base}/vendor/activate/?token=${encodeURIComponent(token)}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const detail = payload?.detail || `Activation failed (${response.status})`;
            lastError = new Error(detail);
            lastError.status = response.status;
            if (response.status !== 404) {
              throw lastError;
            }
            continue;
          }

          const data = await response.json();
          if (!isMounted) {
            return;
          }

          const accessToken = data?.access_token;
          const vendorSlug = data?.vendor_slug || '';
          const isFirstLogin = Boolean(data?.is_first_login);

          if (!accessToken) {
            throw new Error('Activation response missing access token.');
          }

          localStorage.setItem('vendor_token', accessToken);
          localStorage.setItem('vendor_slug', vendorSlug);
          localStorage.setItem(
            'nativeglow_vendor_tokens',
            JSON.stringify({ access: accessToken, vendor_slug: vendorSlug })
          );

          const fallbackPath = isFirstLogin ? '/vendor/dashboard/setup' : '/vendor/dashboard';
          const targetPath = vendorSlug
            ? `/site/${vendorSlug}${fallbackPath}`
            : fallbackPath;

          navigate(targetPath, {
            replace: true,
          });
          return;
        } catch (err) {
          lastError = err;
        }
      }

      if (!isMounted) {
        return;
      }

      setError(lastError?.message || 'Activation failed.');
      setIsLoading(false);
    }

    activate();

    return () => {
      isMounted = false;
    };
  }, [navigate, token]);

  if (isLoading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl font-display font-bold text-zinc-900">NativeGlow</p>
          <div className="mx-auto mt-5 h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm font-medium text-zinc-600">Activating your store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Activation Failed</h1>
        <p className="mt-3 text-sm text-zinc-700">
          This activation link has expired or already been used.
        </p>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
        <button
          type="button"
          onClick={() => navigate('/vendor/login', { replace: true })}
          className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Go to Vendor Login
        </button>
      </div>
    </div>
  );
}
