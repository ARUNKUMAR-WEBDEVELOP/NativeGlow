import { useMemo, useState } from 'react';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function OrderFormModal({ isOpen, product, onClose, onSuccess }) {
  const [form, setForm] = useState({
    buyer_name: '',
    buyer_phone: '',
    buyer_address: '',
    buyer_address_line2: '',
    buyer_city: '',
    buyer_state: '',
    buyer_country: 'India',
    quantity: 1,
    payment_method: 'upi',
    payment_reference: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const payableAmount = useMemo(() => {
    if (!product) {
      return 0;
    }
    const unitPrice = Number(product.discounted_price ?? product.price ?? 0);
    return unitPrice * Number(form.quantity || 0);
  }, [form.quantity, product]);

  if (!isOpen || !product) {
    return null;
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/order/place/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          buyer_name: form.buyer_name,
          buyer_phone: form.buyer_phone,
          buyer_address: form.buyer_address,
            buyer_address_line2: form.buyer_address_line2,
            buyer_city: form.buyer_city,
            buyer_state: form.buyer_state,
            buyer_country: form.buyer_country,
          quantity: Number(form.quantity),
          payment_method: form.payment_method,
          payment_reference: form.payment_reference,
        }),
      });

      if (!res.ok) {
        let detail = `Order failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      onSuccess('Order placed! Vendor will confirm shortly.');
      onClose();
      setForm({
        buyer_name: '',
        buyer_phone: '',
        buyer_address: '',
        buyer_address_line2: '',
        buyer_city: '',
        buyer_state: '',
        buyer_country: 'India',
        quantity: 1,
        payment_method: 'upi',
        payment_reference: '',
      });
    } catch (err) {
      setError(err.message || 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sage">Order Now</p>
            <h3 className="text-xl font-semibold text-zinc-900">{product.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700">Close</button>
        </div>

        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p className="font-semibold">Pay to: {product.vendor_upi_id || 'UPI not available'}</p>
          <p className="mt-1 text-xs">Complete payment first, then submit UTR in payment reference.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input name="buyer_name" value={form.buyer_name} onChange={onChange} placeholder="Buyer name" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          <input name="buyer_phone" value={form.buyer_phone} onChange={onChange} placeholder="Buyer phone" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          <textarea name="buyer_address" value={form.buyer_address} onChange={onChange} placeholder="Address line 1" className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          <input name="buyer_address_line2" value={form.buyer_address_line2} onChange={onChange} placeholder="Address line 2 / Landmark" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
          <div className="grid gap-3 md:grid-cols-2">
            <input name="buyer_city" value={form.buyer_city} onChange={onChange} placeholder="City" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
            <input name="buyer_state" value={form.buyer_state} onChange={onChange} placeholder="State" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
          </div>
          <input name="buyer_country" value={form.buyer_country} onChange={onChange} placeholder="Country" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />

          <div className="grid gap-3 md:grid-cols-2">
            <input type="number" min="1" max={Number(product.available_quantity || 1)} name="quantity" value={form.quantity} onChange={onChange} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" required />
            <select name="payment_method" value={form.payment_method} onChange={onChange} className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm">
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <input
            name="payment_reference"
            value={form.payment_reference}
            onChange={onChange}
            placeholder="Payment reference (UTR)"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            required
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            Payable amount: INR {Number.isFinite(payableAmount) ? payableAmount.toFixed(2) : '0.00'}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700" disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Placing...
                </>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}

export default OrderFormModal;
