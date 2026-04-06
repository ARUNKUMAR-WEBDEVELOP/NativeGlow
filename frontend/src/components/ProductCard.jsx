import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageUrl';

function ProductCard({ product, onAddToCart, isAuthenticated }) {
  const price = Number(product.price || 0);
  const comparePrice = Number(product.compare_price || 0);
  const hasDiscount = comparePrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;

  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      {product.primary_image ? (
        <img
          src={resolveImageUrl(product.primary_image)}
          alt={product.title}
          className="mb-3 h-44 w-full rounded-xl border border-zinc-200 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="mb-3 h-44 w-full rounded-xl border border-zinc-200 bg-gradient-to-br from-cream via-sand/70 to-white" />
      )}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="rounded-full bg-sage/10 px-2 py-1 font-semibold text-sage">
          {product.category_name || 'Natural Care'}
        </span>
        {hasDiscount ? (
          <span className="rounded-full bg-clay/10 px-2 py-1 font-semibold text-clay">{discountPercent}% off</span>
        ) : product.is_bestseller ? (
          <span className="font-semibold text-clay">Best Seller</span>
        ) : null}
      </div>
      <h3 className="font-display text-2xl leading-tight text-zinc-900">{product.title}</h3>
      <p className="mt-2 text-sm text-zinc-600">{product.short_description || 'Natural product for daily use.'}</p>
      <div className="mt-3 flex items-end gap-2">
        <p className="text-lg font-extrabold text-sage">${product.price}</p>
        {hasDiscount ? <p className="text-sm font-medium text-zinc-400 line-through">${product.compare_price}</p> : null}
      </div>
      <p className="mt-1 text-xs text-zinc-500">Vendor: {product.vendor_name || 'NativeGlow'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/products/${product.slug}`}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-center text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
        >
          View Details
        </Link>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Add to Cart
          </button>
        ) : (
          <Link
            to="/login"
            className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Login to Add Cart
          </Link>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
