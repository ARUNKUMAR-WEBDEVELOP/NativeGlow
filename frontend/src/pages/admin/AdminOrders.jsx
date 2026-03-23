import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGES = {
  pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  confirmed: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  processing: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
  shipped: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
  delivered: 'bg-green-500/20 text-green-300 border border-green-500/40',
  cancelled: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
};

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-IN');
}

function OrderDetailModal({ orderId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchDetail() {
      try {
        setLoading(true);
        setError('');
        const response = await api.getAdminOrderDetail(orderId);
        if (mounted) {
          setOrder(response);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.payload?.detail || err?.message || 'Failed to load order details.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      mounted = false;
    };
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <h3 className="text-xl font-semibold text-white">Order Details</h3>
            {order ? <p className="text-sm text-slate-400">#{order.order_id}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        {loading ? <p className="text-slate-400">Loading order details...</p> : null}
        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && order ? (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Buyer Info</h4>
                <div className="space-y-1 text-sm text-slate-200">
                  <p>Name: {order.full_name || order.buyer_name || '-'}</p>
                  <p>Email: {order.email || '-'}</p>
                  <p>Phone: {order.phone || order.buyer_phone || '-'}</p>
                  <p>Address: {order.buyer_address || '-'}</p>
                  <p>City/State: {[order.city, order.state].filter(Boolean).join(', ') || '-'}</p>
                  <p>Pincode: {order.pincode || order.buyer_pincode || '-'}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Vendor Contact</h4>
                <div className="space-y-1 text-sm text-slate-200">
                  <p>Business: {order.vendor?.business_name || '-'}</p>
                  <p>Contact: {order.vendor?.contact_name || '-'}</p>
                  <p>Email: {order.vendor?.email || '-'}</p>
                  <p>Phone: {order.vendor?.phone || '-'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Payment</h4>
              <div className="grid grid-cols-1 gap-2 text-sm text-slate-200 md:grid-cols-3">
                <p>Method: {order.payment_method || '-'}</p>
                <p>Status: {order.payment_status || '-'}</p>
                <p>Reference: {order.payment_reference || '-'}</p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Product Details</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-300">
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Unit Price</th>
                      <th className="px-2 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item) => (
                      <tr key={item.id} className="border-b border-slate-800 text-slate-200">
                        <td className="px-2 py-2">{item.product_title}</td>
                        <td className="px-2 py-2 text-right">{item.quantity}</td>
                        <td className="px-2 py-2 text-right">₹{Number(item.unit_price || 0).toLocaleString('en-IN')}</td>
                        <td className="px-2 py-2 text-right">₹{Number(item.line_total || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-300 md:grid-cols-4">
                <p>Subtotal: ₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</p>
                <p>Shipping: ₹{Number(order.shipping_fee || 0).toLocaleString('en-IN')}</p>
                <p>Discount: ₹{Number(order.discount_total || 0).toLocaleString('en-IN')}</p>
                <p className="font-semibold text-white">Total: ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Order Timeline</h4>
              <ol className="space-y-2">
                {(order.timeline || []).map((entry, index) => (
                  <li key={`${entry.label}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                    <div className="font-medium">{entry.label}</div>
                    <div className="text-xs text-slate-400">{formatDate(entry.timestamp)}</div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-slate-400">
                Admin has view-only access. Order status updates are handled by vendors.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchVendors() {
      try {
        const response = await api.getAdminVendors();
        if (!mounted) {
          return;
        }
        const list = Array.isArray(response) ? response : response?.results || [];
        const mapped = list.map((vendor) => ({ id: vendor.id, business_name: vendor.business_name }));
        setVendors(mapped);
      } catch {
        if (mounted) {
          setVendors([]);
        }
      }
    }

    fetchVendors();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      try {
        setLoading(true);
        setError('');

        const params = {};
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (vendorFilter !== 'all') {
          params.vendor_id = vendorFilter;
        }
        if (monthFilter) {
          params.month = monthFilter;
        }

        const response = await api.getAdminOrders(params);
        if (mounted) {
          const list = Array.isArray(response) ? response : response?.results || [];
          setOrders(list);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.payload?.detail || err?.message || 'Failed to load orders.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, [statusFilter, vendorFilter, monthFilter]);

  const canExportCsv = useMemo(() => Boolean(monthFilter) && orders.length > 0, [monthFilter, orders.length]);

  function handleExportCsv() {
    if (!canExportCsv) {
      return;
    }

    const headers = [
      'Order ID',
      'Buyer Name',
      'Product',
      'Vendor',
      'Qty',
      'Amount',
      'Payment Ref',
      'Status',
      'Date',
    ];

    const lines = [headers.join(',')];
    orders.forEach((order) => {
      lines.push(
        [
          escapeCsv(order.order_id),
          escapeCsv(order.buyer_name),
          escapeCsv(order.product_name),
          escapeCsv(order.vendor_name),
          escapeCsv(order.quantity),
          escapeCsv(order.total_amount),
          escapeCsv(order.payment_reference || ''),
          escapeCsv(order.order_status),
          escapeCsv(formatDate(order.created_at)),
        ].join(',')
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `admin-orders-${monthFilter}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Order Monitoring</h1>
        <p className="mt-2 text-slate-400">Track platform orders across all vendors.</p>
      </div>

      <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
        ℹ️ Orders are managed by vendors. Admin has view-only access.
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-[#e8b86d] text-[#1a1a2e]'
                    : 'border border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Filter by vendor</span>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            >
              <option value="all">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={String(vendor.id)}>
                  {vendor.business_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Filter by month</span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!canExportCsv}
              className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export to CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50">
        <table className="w-full min-w-[1120px]">
          <thead>
            <tr className="border-b border-slate-700 text-left text-sm font-semibold text-slate-300">
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Buyer Name</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Payment Ref</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                  No orders found for selected filters.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="cursor-pointer border-b border-slate-800 text-sm text-slate-200 transition hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-medium">#{order.order_id}</td>
                  <td className="px-4 py-3">{order.buyer_name || '-'}</td>
                  <td className="px-4 py-3">{order.product_name || '-'}</td>
                  <td className="px-4 py-3">{order.vendor_name || '-'}</td>
                  <td className="px-4 py-3 text-right">{order.quantity ?? 0}</td>
                  <td className="px-4 py-3 text-right">₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">{order.payment_reference || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_BADGES[order.order_status] || 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {order.order_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrderId ? (
        <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      ) : null}
    </section>
  );
}
