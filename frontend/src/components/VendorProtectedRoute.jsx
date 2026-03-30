import { Navigate, useLocation } from 'react-router-dom';

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

function VendorProtectedRoute({ children }) {
  const location = useLocation();

  if (!hasValidVendorSession()) {
    localStorage.removeItem('nativeglow_vendor_tokens');
    return <Navigate to="/vendor/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export default VendorProtectedRoute;