import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function VendorSiteTrack() {
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  const onTrackByCode = (event) => {
    event.preventDefault();
    const code = orderCode.trim().toUpperCase();
    if (!code) {
      return;
    }
    navigate(`/track/${encodeURIComponent(code)}`);
  };

  const onTrackByPhone = (event) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10) {
      return;
    }
    navigate(`/track?phone=${digits}`);
  };

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--heading-font)' }}>Track Order</h1>
        <p className="mt-1 text-sm opacity-80">Use your order code or phone number to see latest status.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <form onSubmit={onTrackByCode} className="rounded-2xl border bg-white/85 p-4" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <label className="text-sm font-semibold">Order Code</label>
          <input
            type="text"
            value={orderCode}
            onChange={(event) => setOrderCode(event.target.value.toUpperCase())}
            placeholder="NG-2025-00123"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm uppercase"
            style={{ borderColor: 'rgba(0,0,0,0.2)' }}
          />
          <button type="submit" className="mt-3 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--primary)', color: 'var(--secondary)' }}>
            Track by Code
          </button>
        </form>

        <form onSubmit={onTrackByPhone} className="rounded-2xl border bg-white/85 p-4" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <label className="text-sm font-semibold">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit phone"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'rgba(0,0,0,0.2)' }}
          />
          <button type="submit" className="mt-3 rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            Track by Phone
          </button>
        </form>
      </div>

      <p className="text-xs opacity-70">
        Need full tracking timeline? Use the complete tracker at <Link to="/track" className="underline">Track Orders</Link>.
      </p>
    </div>
  );
}
