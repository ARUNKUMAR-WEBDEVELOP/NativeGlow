import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api';

export default function VendorSiteTrack() {
  const { slug, vendor_slug: legacyVendorSlug, orderCode: routeOrderCode } = useParams();
  const vendorSlug = slug || legacyVendorSlug;
  const [searchParams] = useSearchParams();
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [resultList, setResultList] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fromQueryPhone = (searchParams.get('phone') || '').replace(/\D/g, '').slice(0, 10);
    if (fromQueryPhone) {
      setPhone(fromQueryPhone);
      void handleTrackByPhone(null, fromQueryPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!routeOrderCode) {
      return;
    }
    const normalized = String(routeOrderCode).toUpperCase();
    setOrderCode(normalized);
    void handleTrackByCode(null, normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOrderCode]);

  const onTrackByCode = async (event) => {
    event?.preventDefault();
    const code = orderCode.trim().toUpperCase();
    if (!code) {
      return;
    }
    navigate(`/store/${vendorSlug}/track/${encodeURIComponent(code)}`);
  };

  const onTrackByPhone = async (event) => {
    event?.preventDefault();
    const digits = phone.replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10) {
      return;
    }
    navigate(`/store/${vendorSlug}/track?phone=${digits}`);
  };

  async function handleTrackByCode(event, forcedCode = '') {
    event?.preventDefault();
    const code = (forcedCode || orderCode).trim().toUpperCase();
    if (!code) {
      return;
    }

    setLoading(true);
    setError('');
    setResultList([]);
    try {
      const detail = await api.trackOrderByCode(code);
      setResult(detail);
    } catch (err) {
      setResult(null);
      setError(err?.message || 'Unable to track this order code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrackByPhone(event, forcedPhone = '') {
    event?.preventDefault();
    const digits = (forcedPhone || phone).replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10) {
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.trackOrderByPhone(digits);
      const list = Array.isArray(response?.results) ? response.results : [];
      setResultList(list);
      if (!list.length) {
        setError('No orders found for this phone number.');
      }
    } catch (err) {
      setResultList([]);
      setError(err?.message || 'Unable to track orders for this phone number.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--heading-font)' }}>Track Order</h1>
        <p className="mt-1 text-sm opacity-80">Use your order code or phone number to see latest status.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <form onSubmit={handleTrackByCode} className="rounded-2xl border bg-white/85 p-4" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
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

        <form onSubmit={handleTrackByPhone} className="rounded-2xl border bg-white/85 p-4" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
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
        Tracking stays inside this store page, so your customers remain in your branded experience.
      </p>

      {loading ? <p className="text-sm font-medium opacity-80">Tracking order details...</p> : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border bg-white/85 p-4" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <p className="text-sm font-semibold">Order: {result.order_code || 'N/A'}</p>
          <p className="mt-1 text-sm">Status: <span className="font-semibold">{String(result.order_status || 'pending').replace(/_/g, ' ')}</span></p>
          <p className="mt-1 text-sm">Product: {result.product_name || 'Product'}</p>
        </div>
      ) : null}

      {resultList.length > 0 ? (
        <div className="space-y-2">
          {resultList.map((item) => (
            <button
              key={item.order_code || item.id}
              type="button"
              onClick={() => navigate(`/store/${vendorSlug}/track/${encodeURIComponent(item.order_code || '')}`)}
              className="w-full rounded-2xl border bg-white/85 px-4 py-3 text-left text-sm hover:bg-white"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
            >
              <p className="font-semibold">{item.order_code || 'Order'}</p>
              <p className="mt-1 opacity-80">{item.product_name || 'Product'} • {String(item.order_status || 'pending').replace(/_/g, ' ')}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
