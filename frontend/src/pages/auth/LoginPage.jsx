import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';

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
            onLogin(tokens);
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
    <section className="max-w-xl">
      <div className="rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-sm backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wider text-sage">Account Access</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.95] text-zinc-900 max-md:text-4xl">Login</h1>
        <p className="mt-2 text-sm text-zinc-600">Google login is enabled as the primary secure sign-in method for NativeGlow.</p>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-800">Google Login</h2>
          {!googleClientId ? (
            <p className="mt-2 text-xs text-amber-700">Google login is not configured yet. Set VITE_GOOGLE_CLIENT_ID in frontend and GOOGLE_CLIENT_ID in backend environment.</p>
          ) : (
            <div className="mt-3" ref={googleBtnRef} />
          )}
          {googleClientId && !googleReady ? <p className="mt-2 text-xs text-zinc-500">Preparing Google sign in...</p> : null}
        </div>
      </div>
      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

export default LoginPage;
