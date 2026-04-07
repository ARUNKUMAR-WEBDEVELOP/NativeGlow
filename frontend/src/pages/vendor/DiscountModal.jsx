import { useEffect, useState } from 'react';

function DiscountModal({ product, onClose, onApply, loading }) {
  const [discount, setDiscount] = useState(product?.discount_percent ?? product?.discount_percentage ?? 0);

  useEffect(() => {
    setDiscount(product?.discount_percent ?? product?.discount_percentage ?? 0);
  }, [product]);

  if (!product) return null;

  const originalPrice = Number(product.price || 0);
  const discountedPrice = originalPrice * (1 - discount / 100);
  const hasExistingDiscount = (product?.discount_percent ?? product?.discount_percentage ?? 0) > 0;

  const handleApply = () => {
    onApply(discount);
  };

  const handleRemove = () => {
    onApply(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg sm:p-6">
        <h2 className="text-xl font-bold text-zinc-900">Set Discount</h2>
        <p className="mt-1 text-sm text-zinc-600">{product.title || product.name || 'Product'}</p>

        <div className="mt-4 space-y-4">
          {/* Slider */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700">Discount Percentage</label>
              <span className="text-2xl font-bold text-orange-600">{discount}%</span>
            </div>
            <input
              type="number"
              min="0"
              max="90"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Math.min(90, Number(e.target.value || 0))))}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Enter discount percent"
            />
            <input
              type="range"
              min="0"
              max="90"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-zinc-500">
              <span>0%</span>
              <span>90%</span>
            </div>
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border border-sage/20 bg-sage/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage">Price Preview</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xs text-zinc-500 line-through">₹{originalPrice.toFixed(2)}</span>
              <span className="text-2xl font-bold text-zinc-900">₹{discountedPrice.toFixed(2)}</span>
              {discount > 0 ? (
                <span className="ml-auto inline-block rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                  {discount}% OFF
                </span>
              ) : null}
            </div>
            {discount > 0 ? (
              <p className="mt-1 text-xs text-zinc-600">
                You save: <span className="font-semibold">₹{(originalPrice - discountedPrice).toFixed(2)}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {hasExistingDiscount ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading}
              className="flex-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {loading ? 'Removing...' : 'Remove Discount'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleApply}
            disabled={loading}
            className="flex-1 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Discount'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscountModal;
