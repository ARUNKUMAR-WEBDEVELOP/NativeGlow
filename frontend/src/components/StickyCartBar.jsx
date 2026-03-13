import { Link } from 'react-router-dom';

function StickyCartBar({ totalItems, latestCartItem }) {
  if (totalItems <= 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-900 text-white">
      <div className="mx-auto flex w-[94%] max-w-6xl items-center justify-between gap-3 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-300">Sticky Add-to-Cart</p>
          <p className="text-sm font-semibold">
            {latestCartItem?.title} added - Cart items: {totalItems}
          </p>
        </div>
        <Link to="/cart" className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-[#557a4f]">
          Go to Cart
        </Link>
      </div>
    </div>
  );
}

export default StickyCartBar;
