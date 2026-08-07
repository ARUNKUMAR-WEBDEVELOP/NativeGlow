import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../../api';
import { getAdminDeviceId } from '../../utils/adminDevice';

function extractLoginErrorMessage(err) {
  const payload = err?.payload;

  const extractText = (value) => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = extractText(item);
        if (text) return text;
      }
      return '';
    }
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) {
        const text = extractText(nested);
        if (text) return text;
      }
    }
    return '';
  };

  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail.trim();
  if (payload?.detail && typeof payload.detail === 'object') {
    const detailText = extractText(payload.detail);
    if (detailText) return detailText;
  }
  if (Array.isArray(payload?.non_field_errors) && payload.non_field_errors.length > 0) {
    const first = payload.non_field_errors[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }
  if (payload && typeof payload === 'object') {
    const payloadText = extractText(payload);
    if (payloadText) return payloadText;
  }
  if (
    typeof err?.message === 'string' &&
    err.message.trim() &&
    err.message.trim().toLowerCase() !== '[object object]'
  ) {
    return err.message.trim();
  }
  return 'Login failed. Please try again.';
}

function storeAdminSession(response, deviceId) {
  localStorage.setItem('admin_token', response.access);
  localStorage.setItem('admin_refresh_token', response.refresh);
  localStorage.setItem('admin_info', JSON.stringify(response.admin));
  localStorage.setItem('nativeglow_admin_device_id', response?.admin?.device_id || deviceId);
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Email / Password login ─────────────────────────────────────────────────
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
      if (!form.email || !form.password) {
        setError('Please enter both email and password');
        return;
      }
      const deviceId = getAdminDeviceId();
      const response = await api.adminLogin({ email: form.email, password: form.password, device_id: deviceId });
      storeAdminSession(response, deviceId);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setError(extractLoginErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Google OAuth2 login (credential / ID token flow) ──────────────────────
  // Called by GoogleLogin component on successful sign-in.
  // credentialResponse.credential is the Google ID token (JWT).
  const handleGoogleCredentialSuccess = async (credentialResponse) => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error('No credential received from Google.');
      const deviceId = getAdminDeviceId();
      const response = await api.adminGoogleLogin(idToken);
      storeAdminSession(response, deviceId);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Google admin login error:', err);
      setError(extractLoginErrorMessage(err) || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
    setIsGoogleLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-12 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login card */}
      <div className="relative w-full max-w-md z-10">
        <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 p-8 shadow-2xl backdrop-blur-sm">

          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/40 mb-4">
              <span className="text-3xl">🌿</span>
            </div>
            <h1 className="font-bold text-3xl text-white tracking-tight mb-1">NativeGlow</h1>
            <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Admin Portal</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-400 leading-snug">{error}</p>
            </div>
          )}

          {/* ── Google Sign-In (Primary) ─────────────────────────────────── */}
          <div className="mb-6">
            <p className="text-center text-xs text-slate-400 mb-3 font-medium tracking-wide uppercase">
              Authorized access only
            </p>

            {/* Custom Google button that wraps GoogleLogin */}
            <div className="relative">
              {isGoogleLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-800/70 z-10">
                  <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              {/* GoogleLogin renders its own button — we style the wrapper */}
              <div
                id="google-signin-wrapper"
                className={`flex justify-center ${isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}
                style={{ filter: 'none' }}
              >
                {/* Dynamically import GoogleLogin to avoid SSR issues */}
                <GoogleLoginButton
                  onSuccess={handleGoogleCredentialSuccess}
                  onError={handleGoogleError}
                />
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 mt-3">
              Sign in with your authorized Google account
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">or use password</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* ── Email / Password (Fallback) ──────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2.5 text-white text-sm placeholder-slate-500 transition focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2.5 text-white text-sm placeholder-slate-500 transition focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              id="admin-password-login-btn"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600/60 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in with Password'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 border-t border-slate-700/60 pt-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure · Single-device session · Authorized personnel only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Google Sign-In button component ───────────────────────────────────────────
function GoogleLoginButton({ onSuccess, onError }) {
  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      theme="filled_black"
      size="large"
      shape="rectangular"
      width="340"
      text="signin_with"
      logo_alignment="left"
    />
  );
}
