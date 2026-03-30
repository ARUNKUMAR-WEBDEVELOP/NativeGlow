import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const BuyerAuthContext = createContext({
  buyer: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

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

function isValidBuyerToken(token, vendorSlug) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp || payload?.role !== 'buyer') {
    return false;
  }
  if (vendorSlug && payload?.vendor_slug && payload.vendor_slug !== vendorSlug) {
    return false;
  }
  return payload.exp * 1000 > Date.now();
}

function getTokenKey(vendorSlug) {
  return `buyer_token_${vendorSlug}`;
}

function getProfileKey(vendorSlug) {
  return `buyer_profile_${vendorSlug}`;
}

export function BuyerAuthProvider({ vendorSlug, children }) {
  const [buyer, setBuyer] = useState(null);

  useEffect(() => {
    if (!vendorSlug) {
      setBuyer(null);
      return;
    }

    const token = localStorage.getItem(getTokenKey(vendorSlug));
    if (!token || !isValidBuyerToken(token, vendorSlug)) {
      localStorage.removeItem(getTokenKey(vendorSlug));
      localStorage.removeItem(getProfileKey(vendorSlug));
      setBuyer(null);
      return;
    }

    let profile = {};
    try {
      profile = JSON.parse(localStorage.getItem(getProfileKey(vendorSlug)) || '{}');
    } catch {
      profile = {};
    }

    setBuyer({
      vendorSlug,
      accessToken: token,
      buyerName: profile?.buyerName || '',
      buyerEmail: profile?.buyerEmail || '',
    });
  }, [vendorSlug]);

  function login(payload) {
    if (!vendorSlug || !payload?.accessToken || !isValidBuyerToken(payload.accessToken, vendorSlug)) {
      return;
    }

    const nextBuyer = {
      vendorSlug,
      accessToken: payload.accessToken,
      buyerName: payload.buyerName || '',
      buyerEmail: payload.buyerEmail || '',
    };

    localStorage.setItem(getTokenKey(vendorSlug), nextBuyer.accessToken);
    localStorage.setItem(
      getProfileKey(vendorSlug),
      JSON.stringify({
        buyerName: nextBuyer.buyerName,
        buyerEmail: nextBuyer.buyerEmail,
      })
    );

    setBuyer(nextBuyer);
  }

  function logout() {
    if (!vendorSlug) {
      setBuyer(null);
      return;
    }

    localStorage.removeItem(getTokenKey(vendorSlug));
    localStorage.removeItem(getProfileKey(vendorSlug));
    setBuyer(null);
  }

  const value = useMemo(
    () => ({
      buyer,
      isLoggedIn: Boolean(buyer?.accessToken),
      login,
      logout,
    }),
    [buyer]
  );

  return <BuyerAuthContext.Provider value={value}>{children}</BuyerAuthContext.Provider>;
}

export function useBuyerAuth() {
  return useContext(BuyerAuthContext);
}
