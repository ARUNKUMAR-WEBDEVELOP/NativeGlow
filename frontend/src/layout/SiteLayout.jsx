import { Link, Outlet } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/vendor/register', label: 'Sell on NativeGlow' },
];

const footerLinks = [
  { to: '/about', label: 'About Us' },
  { to: '/vendor/register', label: 'Register as Seller' },
  { to: '/terms', label: 'Terms of Service' },
];

function SiteLayout({ isAuthenticated, onLogout }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#fffef8_0%,_#f5efe6_45%,_#efe2d1_100%)]">
      <ThreeBackground />
      <div className="border-b border-zinc-200/70 bg-white/70 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>Verified herbal care</span>
          <span>Breathable natural fabrics</span>
          <span>Secure checkout</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-[94%] max-w-6xl flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="font-display text-3xl text-zinc-900">NativeGlow</Link>
            <div className="flex items-center gap-2 lg:hidden">
              <Link to="/cart" className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">Cart</Link>
              {isAuthenticated ? (
                <button type="button" onClick={onLogout} className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">Logout</button>
              ) : (
                <Link to="/login" className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">Login</Link>
              )}
            </div>
          </div>
          <nav className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1 lg:flex-1 lg:justify-end">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link to="/my-orders" className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50">My Orders</Link>
            ) : null}
            <Link to="/cart" className="hidden whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 lg:inline-flex">Cart</Link>
            {isAuthenticated ? (
              <button type="button" onClick={onLogout} className="hidden whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white lg:inline-flex">Logout</button>
            ) : (
              <Link to="/login" className="hidden whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white lg:inline-flex">Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-[94%] max-w-6xl flex-1 py-5 sm:py-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-zinc-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex w-[94%] max-w-6xl flex-col items-start justify-between gap-3 py-5 text-sm text-zinc-600 md:flex-row md:items-center">
          <p>NativeGlow - Natural skincare and comfort essentials.</p>
          <div className="flex flex-wrap gap-3">
            {footerLinks.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-zinc-900">{item.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SiteLayout;
