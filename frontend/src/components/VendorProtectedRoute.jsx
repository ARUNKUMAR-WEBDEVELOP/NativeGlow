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
    return (
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
    return <Navigate to="/vendor/login" state={{ from: location.pathname }} replace />;
  }

  const loggedInVendorSlug = getVendorSlugFromSession();

  if (routeVendorSlug && loggedInVendorSlug && routeVendorSlug !== loggedInVendorSlug) {
    const correctedPath = location.pathname.replace(`/site/${routeVendorSlug}`, `/site/${loggedInVendorSlug}`);
    return <Navigate to={`${correctedPath}${location.search || ''}`} replace />;
  }

  if (!routeVendorSlug && loggedInVendorSlug && location.pathname.startsWith('/vendor/dashboard')) {
    return <Navigate to={`/site/${loggedInVendorSlug}${location.pathname}${location.search || ''}`} replace />;
  }

  return children;
}

export default VendorProtectedRoute;