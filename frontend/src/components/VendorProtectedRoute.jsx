import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { api } from '../api';

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenActive(token, graceMs = 0) {
  const payload = parseJwtPayload(token);
  if (!token || !payload?.exp) {
    return false;
  }
  return payload.exp * 1000 > Date.now() + graceMs;
}

function getStoredVendorSession() {
  try {
    return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
  } catch {
    return null;
  }
}

function clearVendorSession() {
  localStorage.removeItem('nativeglow_vendor_tokens');
  localStorage.removeItem('vendor_token');
  localStorage.removeItem('vendor_slug');
}

function getVendorSlugFromSession() {
  try {
    const session = JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    const tokenPayload = parseJwtPayload(session?.access);
    return (
      tokenPayload?.vendor_slug ||
      session?.vendor?.vendor_slug ||
      session?.vendor_slug ||
      localStorage.getItem('vendor_slug') ||
      ''
    );
  } catch {
    return localStorage.getItem('vendor_slug') || '';
  }
}

function VendorProtectedRoute({ children }) {
  const location = useLocation();
  const { vendor_slug: routeVendorSlug } = useParams();
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    async function validateVendorSession() {
      const session = getStoredVendorSession();
      if (!session) {
        if (isMounted) {
          setAuthState('expired');
        }
        return;
      }

      if (isTokenActive(session.access, 10 * 1000)) {
        if (isMounted) {
          setAuthState('valid');
        }
        return;
      }

      if (!session.refresh || !isTokenActive(session.refresh, 10 * 1000)) {
        if (isMounted) {
          setAuthState('expired');
        }
        return;
      }

      try {
        const refreshed = await api.refresh(session.refresh);
        const nextSession = {
          ...session,
          access: refreshed?.access,
          refresh: refreshed?.refresh || session.refresh,
        };
        localStorage.setItem('nativeglow_vendor_tokens', JSON.stringify(nextSession));
        if (nextSession.access) {
          localStorage.setItem('vendor_token', nextSession.access);
        }
        if (isMounted) {
          setAuthState('valid');
        }
      } catch {
        if (isMounted) {
          setAuthState('expired');
        }
      }
    }

    setAuthState('checking');
    validateVendorSession();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (authState === 'checking') {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-violet-200 bg-white/80 px-4 py-3 text-sm text-zinc-700 shadow-sm">
          Verifying your vendor session...
        </div>
      </section>
    );
  }

  if (authState !== 'valid') {
    clearVendorSession();
    return <Navigate to="/vendor/login" state={{ from: location.pathname }} replace />;
  }

  const loggedInVendorSlug = getVendorSlugFromSession();

  if (!routeVendorSlug && loggedInVendorSlug && location.pathname.startsWith('/vendor/dashboard')) {
    return <Navigate to={`/dashboard${location.search || ''}`} replace />;
  }

  return children;
}

export default VendorProtectedRoute;