import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function StickyCartBar({ totalItems, latestCartItem }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!latestCartItem || totalItems <= 0) {
      return;
    }

    setIsVisible(true);
    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [latestCartItem, totalItems]);

  if (totalItems <= 0 || !latestCartItem || !isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="pointer-events-auto rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-2xl backdrop-blur transition-all duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sage">Added to cart</p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-900">
              {latestCartItem.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Cart now has {totalItems} item{totalItems === 1 ? '' : 's'}.
            </p>
          </div>
          <Link to="/cart" className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700">
            View cart
          </Link>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full w-full origin-left animate-[shrink_2.2s_linear_forwards] rounded-full bg-sage" />
        </div>
      </div>
    </div>
  );
}

export default StickyCartBar;
