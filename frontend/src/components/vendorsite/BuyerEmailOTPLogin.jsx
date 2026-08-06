import { useState } from 'react';
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

export default function BuyerEmailOTPLogin({ className = '' }) {
  const { slug, vendor_slug: routeVendorSlugLegacy } = useParams();
  const vendorSlug = slug || routeVendorSlugLegacy;
  const { login } = useBuyerAuth();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setIsBusy(true);

    try {
      const res = await fetch(`${getApiBase()}/buyers/otp-request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          vendor_slug: vendorSlug,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.detail || 'Failed to send OTP.');
      }

      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Failed to request OTP. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setError('');
    setIsBusy(true);

    try {
      const res = await fetch(`${getApiBase()}/buyers/otp-verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          vendor_slug: vendorSlug,
          otp_code: otp,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.detail || 'Invalid or expired OTP.');
      }

      login({
        accessToken: payload?.access_token,
        buyerName: payload?.buyer_name || '',
        buyerEmail: payload?.buyer_email || '',
        buyerPicture: payload?.buyer_picture || '',
      });
    } catch (err) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 w-full ${className}`.trim()}>
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      {step === 'email' && (
        <form onSubmit={handleRequestOTP} className="flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--site-text)' }}>Login with Email</p>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isBusy}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isBusy || !email}
            className="w-full rounded-full px-4 py-2 text-sm font-semibold border transition disabled:opacity-50"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            {isBusy ? 'Sending Code...' : 'Send Login Code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP} className="flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--site-text)' }}>
            Enter 6-digit code sent to {email}
          </p>
          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isBusy}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isBusy || otp.length !== 6}
            className="w-full rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}
          >
            {isBusy ? 'Verifying...' : 'Verify & Login'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setOtp('');
              setError('');
            }}
            className="text-xs text-slate-500 hover:underline"
            disabled={isBusy}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
