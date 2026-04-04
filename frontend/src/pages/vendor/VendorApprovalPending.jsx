import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';

function parseSession() {
  try {
    return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
  } catch {
    return null;
  }
}

export default function VendorApprovalPending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [businessName, setBusinessName] = useState(searchParams.get('business') || 'Your store');
  const [lastChecked, setLastChecked] = useState(null);

  const email = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams]);
  const session = useMemo(() => parseSession(), []);

  useEffect(() => {
    let mounted = true;
    let intervalId = null;

    async function checkStatus() {
      if (!email) {
        return;
      }

      try {
        const response = await api.getVendorApprovalStatus(email);
        if (!mounted) {
          return;
        }

        setStatus(response?.approval_status || 'pending');
        setBusinessName(response?.business_name || businessName);
        setLastChecked(new Date());
        setError('');

        if (response?.is_approved) {
          const approvedVendorSlug = response?.vendor_slug || response?.vendor?.vendor_slug || '';

          if (response?.vendor_token) {
            const vendorSession = {
              access: response.vendor_token,
              refresh: response.refresh || '',
              id: response.vendor_id,
              vendor_slug: approvedVendorSlug,
              email: response.email || email,
              full_name: response.full_name,
            };
            localStorage.setItem('nativeglow_vendor_tokens', JSON.stringify(vendorSession));
          }

          if (approvedVendorSlug) {
            localStorage.setItem('vendor_slug', approvedVendorSlug);
          }

          const fallbackPath = approvedVendorSlug
            ? `/site/${approvedVendorSlug}/vendor/dashboard/products`
            : '/vendor/dashboard/products';

          navigate(response?.management_url || fallbackPath, { replace: true });
          return;
        }
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err?.message || 'Unable to check approval status right now.');
      }
    }

    checkStatus();
    intervalId = setInterval(checkStatus, 15000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [email, navigate]);

  if (!email) {
    return <Navigate to="/vendor/login" replace />;
  }

  return (
    <section className="max-w-2xl">
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Vendor Approval</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-zinc-900">Your Application Is Under Review</h1>
        <p className="mt-2 text-sm text-zinc-700">
          Thanks for registering {businessName}. Your details are saved and visible in Admin Vendor Management.
          We are waiting for admin approval to activate your public store.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-amber-500" />
          <p className="text-sm font-semibold text-zinc-800">
            Current Status: {status === 'approved' ? 'Approved' : 'Pending Approval'}
          </p>
        </div>

        <p className="mt-3 text-sm text-zinc-600">
          We automatically check every 15 seconds. Once approved, you will be redirected directly to your product management page.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
          >
            Check Now
          </button>
          <Link
            to="/vendor/login"
            className="rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white"
          >
            Go To Vendor Login
          </Link>
        </div>

        {lastChecked ? (
          <p className="mt-3 text-xs text-zinc-500">Last checked: {lastChecked.toLocaleTimeString()}</p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {session?.access ? (
          <p className="mt-3 text-xs text-zinc-500">
            You are logged in. If your account is approved now, the website opens automatically.
          </p>
        ) : null}
      </div>
    </section>
  );
}
