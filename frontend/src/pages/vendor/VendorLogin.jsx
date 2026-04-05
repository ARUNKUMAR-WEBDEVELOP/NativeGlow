import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import NeoCard from '../../components/ui/NeoCard';
import NeoButton from '../../components/ui/NeoButton';
import NeoInput from '../../components/ui/NeoInput';

function getErrorMessage(err) {
  const payload = err?.payload;
  if (!payload) {
    return err?.message || 'Login failed. Please try again.';
  }

  if (typeof payload.detail === 'string') {
    return payload.detail;
  }

  if (Array.isArray(payload.non_field_errors) && payload.non_field_errors.length > 0) {
    return payload.non_field_errors[0];
  }

  const firstKey = Object.keys(payload)[0];
  if (firstKey && Array.isArray(payload[firstKey]) && payload[firstKey].length > 0) {
    return payload[firstKey][0];
  }

  if (typeof payload[firstKey] === 'string') {
    return payload[firstKey];
  }

  return err?.message || 'Login failed. Please try again.';
}

function VendorLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const canSubmit = useMemo(() => form.email.trim() && form.password.trim(), [form]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setWarning('');

    if (!canSubmit) {
      setError('Please enter email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tokens = await api.vendorLogin({
        email: form.email,
        password: form.password,
      });

      localStorage.setItem('nativeglow_vendor_tokens', JSON.stringify(tokens));
      if (tokens?.access) {
        localStorage.setItem('vendor_token', tokens.access);
      }

      const vendorSlug =
        tokens?.vendor?.vendor_slug ||
        tokens?.vendor_slug ||
        tokens?.vendor?.slug ||
        '';
      const isApproved = Boolean(tokens?.vendor?.is_approved);

      if (vendorSlug) {
        localStorage.setItem('vendor_slug', vendorSlug);
      }

      if (isApproved && vendorSlug) {
        navigate(`/site/${vendorSlug}/vendor/dashboard/products`, {
          replace: true,
          state: {
            loginSuccess: true,
            storeUrl: vendorSlug ? `/site/${vendorSlug}` : null,
          },
        });
      } else {
        navigate('/vendor/dashboard/products', { replace: true });
      }
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('pending admin approval')) {
        setWarning(message);
        const pendingEmail = err?.payload?.vendor?.email || form.email;
        const pendingBusiness = err?.payload?.vendor?.business_name || '';
        navigate(
          `/vendor/pending-approval?email=${encodeURIComponent(pendingEmail)}&business=${encodeURIComponent(pendingBusiness)}`,
          { replace: true }
        );
      } else {
        setError(message || 'Wrong credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-xl">
      <NeoCard className="rounded-3xl bg-gradient-to-br from-violet-100/80 via-fuchsia-100/70 to-sky-100/80 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Vendor Portal</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">Vendor Login</h1>
        <p className="mt-2 text-sm text-zinc-700">Access your private vendor portal first. You can open your public client store anytime after login.</p>
      </NeoCard>

      <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-sm backdrop-blur">
        <NeoInput
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          placeholder="Email"
        />
        <NeoInput
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="Password"
        />

        <NeoButton
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Signing in...' : 'Vendor Sign In'}
        </NeoButton>

        <p className="text-sm text-zinc-600">
          New seller?{' '}
          <Link to="/vendor/register" className="font-semibold text-violet-700 underline">
            Register as Vendor
          </Link>
        </p>
      </form>

      {warning ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default VendorLogin;
