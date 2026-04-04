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
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function getVendorSession() {
  try {
    return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
  } catch {
    return null;
  }
}

function hasValidVendorSession(session) {
  const token = session?.access;
  const payload = parseJwtPayload(token);

  if (!token || !payload?.exp) {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}

function VendorProtectedRoute({ children }) {
  const location = useLocation();
  const { vendor_slug: routeVendorSlug } = useParams();
  const session = getVendorSession();
  const loggedInVendorSlug =
    session?.vendor?.vendor_slug || session?.vendor_slug || localStorage.getItem('vendor_slug') || '';

  if (!hasValidVendorSession(session)) {
    localStorage.removeItem('nativeglow_vendor_tokens');
    localStorage.removeItem('vendor_token');
    return <Navigate to="/vendor/login" state={{ from: location.pathname }} replace />;
  }

  if (routeVendorSlug && loggedInVendorSlug && routeVendorSlug !== loggedInVendorSlug) {
    return <Navigate to={`/site/${loggedInVendorSlug}/vendor/dashboard/products`} replace />;
  }

  if (!routeVendorSlug && loggedInVendorSlug && location.pathname.startsWith('/vendor/dashboard')) {
    return <Navigate to={`/site/${loggedInVendorSlug}${location.pathname}${location.search || ''}`} replace />;
  }

  return children;
}

export default VendorProtectedRoute;