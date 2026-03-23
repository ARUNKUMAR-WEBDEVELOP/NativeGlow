import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

function currentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function Toast({ message }) {
  if (!message) {
    return null;
  }
  return (
    <div className="fixed right-5 top-5 z-[60] rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-200 shadow-lg">
      {message}
    </div>
  );
}

function GenerateFeesModal({ onClose, onSubmit, submitting, initialMonth }) {
  const [month, setMonth] = useState(initialMonth || '');
  const [amount, setAmount] = useState('499');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="text-xl font-semibold text-white">Generate Monthly Fees</h3>
        <p className="mt-1 text-sm text-slate-400">Create fee records for all active vendors.</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Fee Amount</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!month || !amount || Number(amount) <= 0 || submitting}
            onClick={() => onSubmit({ month, amount: Number(amount) })}
            className="rounded-lg border border-[#e8b86d]/40 bg-[#e8b86d]/20 px-4 py-2 text-sm font-semibold text-[#f2d7a8] hover:bg-[#e8b86d]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkPaidModal({ fee, onClose, onSubmit, submitting }) {
  const [paymentReference, setPaymentReference] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));

  if (!fee) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="text-xl font-semibold text-white">Mark as Paid</h3>
        <p className="mt-1 text-sm text-slate-400">
          {fee.vendor_name} • {fee.month} • {money(fee.amount)}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Payment Reference</span>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="UTR / transaction reference"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-[#e8b86d] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Paid On</span>
            <input
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!paymentReference.trim() || !paidOn || submitting}
            onClick={() => onSubmit({ payment_reference: paymentReference.trim(), paid_on: paidOn })}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageLightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-slate-300 text-2xl font-bold"
        >
          ×
        </button>
        <img src={imageUrl} alt="Payment Screenshot" className="max-h-[85vh] max-w-4xl object-contain rounded-lg" />
      </div>
    </div>
  );
}

function RejectReasonModal({ fee, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="text-xl font-semibold text-white">Reject Payment</h3>
        <p className="mt-1 text-sm text-slate-400">
          {fee?.vendor_name} • {fee?.month}
        </p>

        <div className="mt-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Rejection Reason (will be sent to vendor)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Screenshot unclear, transaction ID not visible, please resubmit..."
              maxLength={500}
              rows={4}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-[#e8b86d] focus:outline-none resize-none"
            />
            <p className="mt-1 text-xs text-slate-500">{reason.length}/500</p>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim() || submitting}
            onClick={() => onSubmit(reason.trim())}
            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Rejecting...' : 'Reject Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMaintenance() {
  const [activeTab, setActiveTab] = useState('all');
  const [fees, setFees] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [monthFilter, setMonthFilter] = useState(currentMonthValue());
  const [vendorFilter, setVendorFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadVendors() {
    try {
      const response = await api.getAdminVendors();
      const list = Array.isArray(response) ? response : response?.results || [];
      setVendors(list.map((v) => ({ id: v.id, business_name: v.business_name })));
    } catch {
      setVendors([]);
    }
  }

  async function loadMaintenance() {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (monthFilter) {
        params.month = monthFilter;
      }
      if (vendorFilter !== 'all') {
        params.vendor_id = vendorFilter;
      }
      if (paidFilter !== 'all') {
        params.is_paid = paidFilter === 'paid';
      }

      const [feesRes, summaryRes] = await Promise.all([
        api.getAdminMaintenanceFees(params),
        api.getAdminMaintenanceSummary({ month: monthFilter || undefined }),
      ]);

      const feeRows = Array.isArray(feesRes) ? feesRes : feesRes?.results || [];
      const summaryRows = Array.isArray(summaryRes) ? summaryRes : summaryRes?.results || [];
      setFees(feeRows);
      setSummary(summaryRows[0] || null);
    } catch (err) {
      setError(err?.payload?.detail || err?.message || 'Failed to load maintenance data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingVerifications() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'}/admin/maintenance/pending-verification/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingVerifications(Array.isArray(data.results) ? data.results : []);
      } else {
        setPendingVerifications([]);
      }
    } catch {
      setPendingVerifications([]);
    }
  }

  useEffect(() => {
    loadVendors();
    loadPendingVerifications();
  }, []);

  useEffect(() => {
    loadMaintenance();
  }, [monthFilter, vendorFilter, paidFilter]);

  const overdueVendorCount = useMemo(() => {
    const pending = fees.filter((fee) => !fee.is_paid);
    return new Set(pending.map((fee) => fee.vendor)).size;
  }, [fees]);

  async function handleGenerateFees(payload) {
    try {
      setSubmitting(true);
      const result = await api.generateAdminMaintenanceFees(payload);
      setShowGenerateModal(false);
      setToast(`Fee records created for ${result.created || 0} vendors`);
      if (payload.month) {
        setMonthFilter(payload.month);
      }
      await loadMaintenance();
    } catch (err) {
      setError(err?.payload?.detail || err?.message || 'Failed to generate maintenance fees.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkAsPaid(payload) {
    if (!selectedFee) {
      return;
    }

    try {
      setSubmitting(true);
      await api.markAdminMaintenancePaid(selectedFee.id, payload);
      setShowMarkPaidModal(false);
      setSelectedFee(null);
      setToast('Maintenance fee marked as paid');
      await loadMaintenance();
    } catch (err) {
      setError(err?.payload?.detail || err?.message || 'Failed to mark fee as paid.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSendReminder(fee) {
    setToast(`Reminder sent to ${fee.vendor_name}`);
  }

  async function handleVerifyPayment(fee) {
    if (!window.confirm(`Confirm payment verified for ${fee.vendor_name} - ${fee.month}?`)) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('admin_token') || '';
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'}/admin/maintenance/${fee.id}/verify/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ verified: true }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to verify payment');
      }

      setToast('Payment verified ✅');
      setPendingVerifications((prev) => prev.filter((p) => p.id !== fee.id));
      await loadMaintenance();
    } catch (err) {
      setError(err.message || 'Failed to verify payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectPayment(reason) {
    if (!selectedFee) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('admin_token') || '';
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'}/admin/maintenance/${selectedFee.id}/verify/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ verified: false, note: reason }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reject payment');
      }

      setToast('Rejection sent to vendor');
      setPendingVerifications((prev) => prev.filter((p) => p.id !== selectedFee.id));
      setShowRejectModal(false);
      setSelectedFee(null);
      await loadMaintenance();
    } catch (err) {
      setError(err.message || 'Failed to reject payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <Toast message={toast} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Maintenance Fees</h1>
          <p className="mt-2 text-slate-400">Track monthly fee collection and pending dues.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerateModal(true)}
          className="rounded-lg border border-[#e8b86d]/40 bg-[#e8b86d]/20 px-4 py-2.5 text-sm font-semibold text-[#f2d7a8] hover:bg-[#e8b86d]/30"
        >
          Generate Monthly Fees
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'border-b-2 border-[#e8b86d] text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          All Fees
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-b-2 border-[#e8b86d] text-white'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Pending Verification
          {pendingVerifications.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold">
              {pendingVerifications.length}
            </span>
          )}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {activeTab === 'all' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">This Month Expected Total</p>
              <p className="mt-2 text-2xl font-bold text-white">{money(summary?.total_expected)}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">This Month Collected</p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">{money(summary?.total_collected)}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">This Month Pending</p>
              <p className="mt-2 text-2xl font-bold text-rose-300">{money(summary?.total_pending)}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Vendors with Overdue Fees</p>
              <p className="mt-2 text-2xl font-bold text-amber-300">{overdueVendorCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-400">Filter by month</span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
                />
              </label>
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
                <span className="mb-1 block text-sm text-slate-400">Filter by payment status</span>
                <select
                  value={paidFilter}
                  onChange={(e) => setPaidFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-slate-700 text-left text-sm font-semibold text-slate-300">
                  <th className="px-4 py-3">Vendor Name</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid On</th>
                  <th className="px-4 py-3">Payment Ref</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                      Loading maintenance fees...
                    </td>
                  </tr>
                ) : fees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                      No maintenance records found for selected filters.
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr key={fee.id} className="border-b border-slate-800 text-sm text-slate-200">
                      <td className="px-4 py-3">{fee.vendor_name}</td>
                      <td className="px-4 py-3">{fee.month}</td>
                      <td className="px-4 py-3 text-right">{money(fee.amount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            fee.is_paid
                              ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                              : 'border border-rose-500/40 bg-rose-500/20 text-rose-200'
                          }`}
                        >
                          {fee.is_paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{fee.paid_on || '-'}</td>
                      <td className="px-4 py-3">{fee.payment_reference || '-'}</td>
                      <td className="px-4 py-3">
                        {!fee.is_paid ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFee(fee);
                                setShowMarkPaidModal(true);
                              }}
                              className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                            >
                              Mark as Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendReminder(fee)}
                              className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                            >
                              Send Reminder
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingVerifications.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">No payments pending verification</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingVerifications.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 space-y-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">Vendor</p>
                    <p className="font-semibold text-white">{payment.vendor_name}</p>

      {showRejectModal ? (
        <RejectReasonModal
          fee={selectedFee}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedFee(null);
          }}
          onSubmit={handleRejectPayment}
          submitting={submitting}
        />
      ) : null}

      {lightboxImage ? <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} /> : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Month</p>
                      <p className="font-semibold text-white">{payment.month}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Amount</p>
                      <p className="font-semibold text-white">{money(payment.amount)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Payment Mode</p>
                    <p className="text-sm font-medium text-slate-200">{payment.payment_mode.toUpperCase()}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Transaction ID</p>
                    <p className="text-sm font-mono text-slate-300 break-all">{payment.transaction_id}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Submitted</p>
                    <p className="text-sm text-slate-300">
                      {new Date(payment.submitted_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {payment.payment_screenshot_url && (
                    <button
                      onClick={() => setLightboxImage(payment.payment_screenshot_url)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800/50 p-2 text-center text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                    >
                      📸 View Screenshot
                    </button>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleVerifyPayment(payment)}
                      className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      ✅ Verify
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setSelectedFee(payment);
                        setShowRejectModal(true);
                      }}
                      className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showGenerateModal ? (
        <GenerateFeesModal
          onClose={() => setShowGenerateModal(false)}
          onSubmit={handleGenerateFees}
          submitting={submitting}
          initialMonth={monthFilter || currentMonthValue()}
        />
      ) : null}

      {showMarkPaidModal ? (
        <MarkPaidModal
          fee={selectedFee}
          onClose={() => {
            setShowMarkPaidModal(false);
            setSelectedFee(null);
          }}
          onSubmit={handleMarkAsPaid}
          submitting={submitting}
        />
      ) : null}

      {showRejectModal ? (
        <RejectReasonModal
          onClose={() => {
            setShowRejectModal(false);
            setSelectedFee(null);
          }}
          onSubmit={handleRejectPayment}
          submitting={submitting}
        />
      ) : null}

      {lightboxImage ? (
        <ImageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      ) : null}
    </section>
  );
}
