import { useEffect, useState } from 'react';
import { api } from '../../api';

const initialForm = {
  brand_name: '',
  product_types: '',
  why_collaborate: '',
  current_sales_channels: '',
  contact_email: '',
  contact_phone: '',
  otp_code: '',
};

function VendorApplyPage({ tokens, onTokensUpdate, onAuthExpired }) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpHint, setOtpHint] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      if (!tokens?.access) {
        return;
      }
      try {
        const data = await api.getMyVendorApplication(tokens, onTokensUpdate, onAuthExpired);
        if (active) {
          setApplication(data);
        }
      } catch {
        if (active) {
          setApplication(null);
        }
      }
      try {
        const analyticsData = await api.getMyVendorAnalytics(tokens, onTokensUpdate, onAuthExpired);
        if (active) {
          setAnalytics(analyticsData);
        }
      } catch {
        if (active) {
          setAnalytics(null);
        }
      }
    }

    loadStatus();
    return () => {
      active = false;
    };
  }, [tokens, onTokensUpdate, onAuthExpired]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!otpVerified) {
      setError('Verify OTP for contact email before submitting vendor application.');
      return;
    }
    try {
      await api.applyVendor(form, tokens, onTokensUpdate, onAuthExpired);
      setMessage('Vendor application submitted successfully.');
      setForm(initialForm);
      setOtpSent(false);
      setOtpVerified(false);
      setOtpHint('');
    } catch (err) {
      setError(err.message || 'Failed to submit vendor application.');
    }
  };

  const onSendOtp = async () => {
    setError('');
    setMessage('');
    setOtpHint('');
    if (!form.contact_email.trim()) {
      setError('Enter contact email first.');
      return;
    }
    try {
      const res = await api.requestOtp({
        email: form.contact_email,
        purpose: 'vendor_apply',
      });
      setOtpSent(true);
      if (res.otp_debug) {
        setOtpHint(`Dev OTP: ${res.otp_debug}`);
      }
      setMessage('OTP sent to contact email. Verify to continue.');
    } catch (err) {
      setError(err.message || 'Could not send OTP.');
    }
  };

  const onVerifyOtp = async () => {
    setError('');
    setMessage('');
    try {
      await api.verifyOtp({
        email: form.contact_email,
        purpose: 'vendor_apply',
        otp_code: form.otp_code,
      });
      setOtpVerified(true);
      setMessage('OTP verified. You can now submit seller application.');
    } catch (err) {
      setOtpVerified(false);
      setError(err.message || 'OTP verification failed.');
    }
  };

  return (
    <section className="max-w-3xl">
      <div className="rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-sm">
        <h1 className="font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">Sell on NativeGlow</h1>
        <p className="mt-2 text-zinc-700">Apply as a collaborating natural seller. Admin reviews every application before vendor approval.</p>
        <p className="mt-1 text-sm text-zinc-600">Direct admin contact: <a className="font-semibold text-zinc-900 underline" href="mailto:admin@nativeglow.store">admin@nativeglow.store</a></p>
      </div>

      {application ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Current Application Status: {application.status}</p>
          <p className="mt-1">Brand: {application.brand_name} | Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
          <p className="mt-1">After admin verification, your seller profile and product controls are activated automatically.</p>
        </div>
      ) : null}

      {analytics ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Vendor Sales Snapshot</p>
          <p className="mt-1">Commission Rate: {analytics.commission_rate}% | Gross Sales: ${analytics.gross_sales}</p>
          <p className="mt-1">Estimated Service Fee: ${analytics.service_fee} | Estimated Payout: ${analytics.estimated_payout}</p>
          <p className="mt-1">Admin dynamically controls commission terms and verifies natural-product standards.</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-900">Seller Services and Collaboration Terms</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-700">
            <li>NativeGlow provides storefront visibility, checkout infrastructure, and order operations.</li>
            <li>Admin verifies product authenticity and natural-product compliance before publishing.</li>
            <li>Service commission percentage is managed by admin and applied to seller payouts.</li>
          </ul>
        </div>
        <input name="brand_name" value={form.brand_name} onChange={onChange} placeholder="Brand name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        <textarea name="product_types" value={form.product_types} onChange={onChange} placeholder="Types of natural products you sell" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" rows={3} />
        <textarea name="why_collaborate" value={form.why_collaborate} onChange={onChange} placeholder="Why do you want to partner with NativeGlow?" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" rows={3} />
        <textarea name="current_sales_channels" value={form.current_sales_channels} onChange={onChange} placeholder="Current sales channels" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" rows={2} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="contact_email" value={form.contact_email} onChange={onChange} placeholder="Contact email" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
          <input name="contact_phone" value={form.contact_phone} onChange={onChange} placeholder="Contact phone" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input name="otp_code" value={form.otp_code} onChange={onChange} placeholder="Enter email OTP" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
          <button type="button" onClick={onSendOtp} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700">Send OTP</button>
          <button type="button" onClick={onVerifyOtp} disabled={!otpSent} className="rounded-xl border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Verify OTP</button>
        </div>
        {otpHint ? <p className="text-xs text-amber-700">{otpHint}</p> : null}
        {otpVerified ? <p className="text-xs font-semibold text-emerald-700">OTP verified for {form.contact_email}</p> : null}
        <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Submit Application</button>
      </form>
      {message ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default VendorApplyPage;
