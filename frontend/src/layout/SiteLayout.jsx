import { Link, Outlet } from 'react-router-dom';
import ThreeBackground from '../components/ThreeBackground';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
  { to: '/shipping', label: 'Shipping' },
  { to: '/returns', label: 'Returns' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms' },
  { to: '/vendor/apply', label: 'Sell on NativeGlow' },
];

function SiteLayout({ isAuthenticated, onLogout }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#fffef8_0%,_#f5efe6_45%,_#efe2d1_100%)]">
      <ThreeBackground />
      <div className="bg-zinc-900 px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4">
          <span>Today: 12% off on Herbal Skincare with code NATURAL12</span>
          <span>Free shipping for orders above $39</span>
          <span>BOGO active on selected products</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-[94%] max-w-6xl flex-wrap items-center justify-between gap-3 py-4">
          <Link to="/" className="font-display text-3xl text-zinc-900">NativeGlow</Link>
          <nav className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
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
            <Link to="/cart" className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50">Cart</Link>
            {isAuthenticated ? (
              <button type="button" onClick={onLogout} className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">Logout</button>
            ) : (
              <Link to="/login" className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-[94%] max-w-6xl flex-1 py-6">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-zinc-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex w-[94%] max-w-6xl flex-col items-start justify-between gap-3 py-5 text-sm text-zinc-600 md:flex-row md:items-center">
          <p>NativeGlow - Natural skincare and comfort essentials.</p>
          <div className="flex flex-wrap gap-3">
            {navLinks.slice(1, 8).map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-zinc-900">{item.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SiteLayout;
