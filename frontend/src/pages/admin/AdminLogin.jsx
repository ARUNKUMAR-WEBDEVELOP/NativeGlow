import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../../api';
import { getAdminDeviceId } from '../../utils/adminDevice';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractError(err) {
  const payload = err?.payload;
  const dig = (v) => {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v)) { for (const i of v) { const t = dig(i); if (t) return t; } }
    if (v && typeof v === 'object') { for (const i of Object.values(v)) { const t = dig(i); if (t) return t; } }
    return '';
  };
  if (typeof payload?.detail === 'string') return payload.detail.trim();
  const fromPayload = dig(payload);
  if (fromPayload) return fromPayload;
  if (typeof err?.message === 'string' && err.message.toLowerCase() !== '[object object]') return err.message.trim();
  return 'Login failed. Please try again.';
}

function storeSession(res, deviceId) {
  localStorage.setItem('admin_token', res.access);
  localStorage.setItem('admin_refresh_token', res.refresh);
  localStorage.setItem('admin_info', JSON.stringify(res.admin));
  localStorage.setItem('nativeglow_admin_device_id', res?.admin?.device_id || deviceId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Google OAuth2 ──────────────────────────────────────────────────────────
  // We use useGoogleLogin with implicit flow so we get an access_token directly
  // in the browser without a popup. Then we exchange it for user info + ID via
  // Google's userinfo endpoint and send the access_token to our backend.
  //
  // NOTE: Our backend uses `id_token.verify_oauth2_token` which requires an
  // ID token (JWT). So we use the tokeninfo endpoint to get the id_token.
  // Alternatively, the backend can be updated to accept access_token and fetch
  // userinfo itself. We do the latter here for reliability.
  const googleLogin = useGoogleLogin({
    // 'implicit' flow — avoids popup blocker entirely (uses redirect within iframe).
    flow: 'implicit',
    onSuccess: useCallback(async (tokenResponse) => {
      setIsGoogleLoading(true);
      setError('');
      try {
        const accessToken = tokenResponse.access_token;
        if (!accessToken) throw new Error('No access token from Google.');

        // Fetch user info to get the ID token / user details
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) throw new Error('Failed to fetch Google user info.');
        const userInfo = await userInfoRes.json();

        // Send the access_token to our backend for verification
        const deviceId = getAdminDeviceId();
        const response = await api.adminGoogleLogin(accessToken);
        storeSession(response, deviceId);
        navigate('/admin/dashboard', { replace: true });
      } catch (err) {
        console.error('Google admin login error:', err);
        setError(extractError(err) || 'Google sign-in failed. Please try again.');
      } finally {
        setIsGoogleLoading(false);
      }
    }, [navigate]),
    onError: useCallback((err) => {
      console.error('Google OAuth error:', err);
      setError('Google sign-in failed. Please try again or use password login.');
      setIsGoogleLoading(false);
    }, []),
    onNonOAuthError: useCallback((err) => {
      console.error('Google non-OAuth error:', err);
      if (err?.type === 'popup_closed') {
        setError('Google sign-in window was closed. Please try again.');
      } else if (err?.type === 'popup_failed_to_open') {
        setError('Could not open Google sign-in. Please allow popups for this site, or use password login below.');
      } else {
        setError('Google sign-in was cancelled. Please try again.');
      }
      setIsGoogleLoading(false);
    }, []),
    scope: 'openid email profile',
  });

  const handleGoogleClick = () => {
    if (isGoogleLoading || isSubmitting) return;
    setError('');
    setIsGoogleLoading(true);
    googleLogin();
  };

  // ── Email / Password ───────────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter both email and password.'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const deviceId = getAdminDeviceId();
      const response = await api.adminLogin({ email: form.email, password: form.password, device_id: deviceId });
      storeSession(response, deviceId);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setError(extractError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isGoogleLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-12 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 p-8 shadow-2xl backdrop-blur-sm">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/40 mb-4">
              <span className="text-3xl">🌿</span>
            </div>
            <h1 className="font-bold text-3xl text-white tracking-tight mb-1">NativeGlow</h1>
            <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Super Admin Portal</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3 animate-pulse-once">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-400 leading-snug">{error}</p>
            </div>
          )}

          {/* ── Google Sign-In ──────────────────────────────────────────── */}
          <div className="mb-6">
            <p className="text-center text-xs text-slate-400 mb-4 font-medium tracking-widest uppercase">
              Sign in with Google
            </p>

            <button
              id="admin-google-login-btn"
              type="button"
              onClick={handleGoogleClick}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-600/60 bg-white hover:bg-gray-50 active:bg-gray-100 px-5 py-3 text-sm font-semibold text-slate-800 transition-all duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed select-none"
            >
              {isGoogleLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-slate-600">Signing in with Google...</span>
                </>
              ) : (
                <>
                  {/* Google G logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 mt-2.5">
              Only authorized accounts can access this portal
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">or use password</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* ── Password Fallback ───────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                disabled={busy}
                autoComplete="email"
                className="w-full rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2.5 text-white text-sm placeholder-slate-500 transition focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={busy}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-600/60 bg-slate-800/60 px-4 py-2.5 text-white text-sm placeholder-slate-500 transition focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              id="admin-password-login-btn"
              disabled={busy}
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
              ) : 'Sign in with Password'}
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
