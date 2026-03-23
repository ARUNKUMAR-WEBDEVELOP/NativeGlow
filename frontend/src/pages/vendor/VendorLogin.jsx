import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';

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
      navigate('/vendor/dashboard', { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('pending admin approval')) {
        setWarning(message);
      } else {
        setError(message || 'Wrong credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-xl">
      <div className="rounded-3xl border border-sage/20 bg-gradient-to-br from-[#f8f7ef] via-[#edf3e6] to-[#e8dcc9] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage">Vendor Portal</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">Vendor Login</h1>
        <p className="mt-2 text-sm text-zinc-700">Access your vendor dashboard to manage products and orders.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={onChange}
          placeholder="Email"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          placeholder="Password"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Vendor Sign In'}
        </button>

        <p className="text-sm text-zinc-600">
          New seller?{' '}
          <Link to="/vendor/register" className="font-semibold text-sage underline">
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
