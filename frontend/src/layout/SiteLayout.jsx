import { Link, Outlet } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';
import NeoButton from '../components/ui/NeoButton';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/vendor/register', label: 'Sell on NativeGlow' },
];

const footerLinks = [
  { to: '/about', label: 'About Us' },
  { to: '/vendor/register', label: 'Sell on NativeGlow' },
];

function SiteLayout({ isAuthenticated = false, onLogout }) {
  let googleProfile = null;
  try {
    googleProfile = JSON.parse(localStorage.getItem('nativeglow_google_profile') || 'null');
  } catch {
    googleProfile = null;
  }

  const displayName = googleProfile?.name || googleProfile?.email || 'Account';

  return (
    <div className="relative flex min-h-screen flex-col bg-brand-soft">
      <ThreeBackground />
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex w-[94%] max-w-6xl flex-col gap-3 py-3 md:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="font-display text-2xl text-zinc-900 sm:text-3xl">NativeGlow</Link>
          </div>
          <nav className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1 lg:flex-1 lg:justify-end">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-semibold text-zinc-700 transition duration-300 hover:-translate-y-0.5 hover:bg-white sm:text-sm"
              >
                {item.label}
              </Link>
            ))}

            {!isAuthenticated ? (
              <Link to="/login">
                <NeoButton className="whitespace-nowrap px-4 py-2 text-xs sm:text-sm">Google Login</NeoButton>
              </Link>
            ) : null}

            {isAuthenticated ? (
              <div className="ml-1 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-2 py-1">
                {googleProfile?.picture ? (
                  <img src={googleProfile.picture} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                    {String(displayName).charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[150px] truncate text-xs font-semibold text-zinc-700 sm:text-sm">{displayName}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-xl border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-[94%] max-w-6xl flex-1 py-5 sm:py-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-white/70 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex w-[94%] max-w-6xl flex-col items-start justify-between gap-3 py-5 text-sm text-zinc-600 md:flex-row md:items-center">
          <p>NativeGlow for modern social-commerce sellers.</p>
          <div className="flex flex-wrap gap-3">
            {footerLinks.map((item) => (
              <Link key={item.to} to={item.to} className="rounded-xl px-2 py-1 transition duration-300 hover:bg-white/80 hover:text-zinc-900">{item.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SiteLayout;
