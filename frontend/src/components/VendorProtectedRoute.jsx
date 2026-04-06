import { Navigate, useLocation, useParams } from 'react-router-dom';

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

function hasValidVendorSession() {
  try {
    const session = JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    const token = session?.access;
    const payload = parseJwtPayload(token);

    if (!token || !payload?.exp) {
      return false;
    }

    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
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

  if (!hasValidVendorSession()) {
    localStorage.removeItem('nativeglow_vendor_tokens');
    localStorage.removeItem('vendor_slug');
    return <Navigate to="/vendor/login" state={{ from: location.pathname }} replace />;
  }

  const loggedInVendorSlug = getVendorSlugFromSession();

  if (!routeVendorSlug && loggedInVendorSlug && location.pathname.startsWith('/vendor/dashboard')) {
    return <Navigate to={`/dashboard${location.search || ''}`} replace />;
  }

  return children;
}

export default VendorProtectedRoute;