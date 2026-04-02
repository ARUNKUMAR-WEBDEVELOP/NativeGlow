import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api';
import NeoCard from '../../components/ui/NeoCard';
import NeoButton from '../../components/ui/NeoButton';
import SkeletonBlock from '../../components/ui/SkeletonBlock';

function decodeGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') {
    return null;
  }

  try {
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return {
      name: decoded?.name || '',
      email: decoded?.email || '',
      picture: decoded?.picture || '',
    };
  } catch {
    return null;
  }
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef(null);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    let mounted = true;

    const initializeGoogle = () => {
      if (!mounted || !window.google?.accounts?.id || !googleBtnRef.current) {
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setError('');
          try {
            const tokens = await api.googleLogin(response.credential);
            const decodedProfile = decodeGoogleCredential(response.credential);
            const profile = {
              name: tokens?.user_name || decodedProfile?.name || '',
              email: tokens?.user_email || decodedProfile?.email || '',
              picture: tokens?.user_picture || decodedProfile?.picture || '',
            };
            onLogin(tokens, profile);
            const savedDestination = sessionStorage.getItem('nativeglow_post_login_redirect');
            if (savedDestination) {
              sessionStorage.removeItem('nativeglow_post_login_redirect');
            }
            const destination = location.state?.from || savedDestination || '/';
            navigate(destination, { replace: true });
          } catch (err) {
            setError(err.message || 'Google login failed.');
          }
        },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
      setGoogleReady(true);
    };

    if (!window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }

    return () => {
      mounted = false;
    };
  }, [googleClientId, location.state, navigate, onLogin]);

  return (
    <motion.section
      className="mx-auto max-w-xl"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <NeoCard className="rounded-3xl border-violet-100 bg-white/80 p-6 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Account Access</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] text-zinc-900 sm:text-5xl">Google Login</h1>
        <p className="mt-2 text-sm text-zinc-600">Securely continue with your Google account to access NativeGlow.</p>

        <div className="mt-5 rounded-2xl border border-violet-100 bg-white/75 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Continue with Google</h2>
          {!googleClientId ? (
            <p className="mt-2 text-xs text-amber-700">Google login is not configured yet. Set VITE_GOOGLE_CLIENT_ID in frontend and GOOGLE_CLIENT_ID in backend environment.</p>
          ) : (
            <div className="mt-3" ref={googleBtnRef} />
          )}
          {googleClientId && !googleReady ? (
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-10 w-full" />
              <p className="text-xs text-zinc-500">Preparing Google sign in...</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <NeoButton type="button" variant="secondary" onClick={() => navigate('/vendor/register')}>
            Sell on NativeGlow
          </NeoButton>
        </div>
      </NeoCard>
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </motion.section>
  );
}

export default LoginPage;
