import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const BuyerAuthContext = createContext({
  buyer: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

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
    if (!token) {
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
    if (!vendorSlug || !payload?.accessToken) {
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
