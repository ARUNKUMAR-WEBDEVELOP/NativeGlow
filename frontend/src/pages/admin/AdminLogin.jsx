import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!form.email || !form.password) {
        setError('Please enter both email and password');
        setIsSubmitting(false);
        return;
      }

      // Call admin login API
      const response = await api.adminLogin({
        email: form.email,
        password: form.password,
      });

      // Store admin token separately
      localStorage.setItem('admin_token', response.access);
      localStorage.setItem('admin_refresh_token', response.refresh);
      localStorage.setItem('admin_info', JSON.stringify(response.admin));

      // Redirect to admin dashboard
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      const detail = err?.payload?.detail || err?.message || 'Login failed. Please try again.';
      setError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-800/30 rounded-full blur-3xl"></div>
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md z-10">
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl backdrop-blur-sm">
          {/* Logo and heading */}
          <div className="mb-8 text-center">
            <div className="mb-4">
              <div className="text-4xl font-bold text-white">🌿</div>
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              NativeGlow
            </h1>
            <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">
              Admin Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@nativeglow.app"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 transition focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 border-t border-slate-700 pt-6">
            <p className="text-center text-xs text-slate-500">
              Admin Portal • NativeGlow Network
            </p>
            <p className="text-center text-xs text-slate-600 mt-1">
              Secure access for authorized administrators only
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Secure connection</span>
        </div>
      </div>
    </div>
  );
}
