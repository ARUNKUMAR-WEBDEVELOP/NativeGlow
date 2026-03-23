import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://nativeglow.onrender.com/api');

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }
  return payload.exp * 1000 > Date.now();
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) {
    return '₹0.00';
  }
  return `₹${amount.toFixed(2)}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';

  return (
    <div className={`fixed bottom-5 right-5 rounded-xl border ${bgColor} ${textColor} px-4 py-3 shadow-lg z-50`}>
      {message}
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center gap-1 rounded-lg bg-sage/10 px-3 py-1.5 text-xs font-semibold text-sage hover:bg-sage/20 transition"
    >
      {copied ? '✓ Copied' : `📋 ${label}`}
    </button>
  );
}

function PayNowModal({ fee, onClose, onSuccess }) {
  const [mode, setMode] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [fieldError, setFieldError] = useState('');

  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFieldError('File size must be less than 2MB');
      return;
    }

    setScreenshot(file);
    setFieldError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFieldError('');

    // Validate
    const newErrors = {};
    if (!screenshot) {
      newErrors.screenshot = 'Payment screenshot is required';
    }
    if (mode === 'upi' && !upiId.trim()) {
      newErrors.upiId = 'UPI Transaction ID is required';
    }
    if (mode === 'net_banking' && !bankRef.trim()) {
      newErrors.bankRef = 'Bank Reference Number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('payment_mode', mode);
      if (mode === 'upi') {
        formData.append('upi_transaction_id', upiId.trim());
      } else {
        formData.append('bank_reference_number', bankRef.trim());
      }
      formData.append('payment_screenshot', screenshot);

      const res = await fetch(`${API_BASE}/vendor/maintenance/${fee.id}/pay/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vendorSession?.access || ''}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let detail = `Submission failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.message || JSON.stringify(payload);
        } catch {
          // keep default
        }
        throw new Error(detail);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setFieldError(err.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-2xl font-bold text-zinc-900">Submit Payment Proof</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-4 rounded-xl bg-zinc-50 p-4">
          <p className="text-sm text-zinc-700">
            <strong>Month:</strong> {fee.month}
          </p>
          <p className="text-sm text-zinc-700">
            <strong>Amount Due:</strong> {formatCurrency(fee.amount)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Payment Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-3">
              Payment Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="upi"
                  checked={mode === 'upi'}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-zinc-700">UPI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="net_banking"
                  checked={mode === 'net_banking'}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-zinc-700">Net Banking</span>
              </label>
            </div>
          </div>

          {/* Conditional Inputs */}
          {mode === 'upi' ? (
            <div>
              <label className="block text-sm font-semibold text-zinc-900 mb-2">
                UPI Transaction ID <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g., UPI123456789"
                className={`w-full rounded-xl border px-3 py-2 text-sm transition ${
                  errors.upiId
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-zinc-300 bg-white'
                }`}
              />
              <p className="mt-1 text-xs text-zinc-600">
                Find this in your UPI app payment history
              </p>
              {errors.upiId && <p className="mt-1 text-xs text-rose-600">{errors.upiId}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-zinc-900 mb-2">
                Bank Reference Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="e.g., UTR20260320ABC123"
                className={`w-full rounded-xl border px-3 py-2 text-sm transition ${
                  errors.bankRef
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-zinc-300 bg-white'
                }`}
              />
              <p className="mt-1 text-xs text-zinc-600">
                Find this in your bank transaction receipt (UTR/Reference number)
              </p>
              {errors.bankRef && <p className="mt-1 text-xs text-rose-600">{errors.bankRef}</p>}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-zinc-900 mb-2">
              Payment Screenshot <span className="text-rose-600">*</span>
            </label>
            <div className={`rounded-xl border-2 border-dashed p-4 text-center transition ${
              errors.screenshot
                ? 'border-rose-300 bg-rose-50'
                : 'border-zinc-300 bg-zinc-50 hover:border-sage/50'
            }`}>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
                id="screenshot-input"
              />
              <label htmlFor="screenshot-input" className="cursor-pointer block">
                {screenshot ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-900">
                      ✓ {screenshot.name}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-3xl">📸</p>
                    <p className="text-sm font-medium text-zinc-900">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-zinc-600">
                      PNG or JPG (max 2MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
            {errors.screenshot && (
              <p className="mt-1 text-xs text-rose-600">{errors.screenshot}</p>
            )}
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 p-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 w-full object-contain"
              />
            </div>
          )}

          {fieldError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{fieldError}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-sage px-4 py-2.5 font-semibold text-white hover:bg-sage/90 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Payment Proof'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VendorMaintenance() {
  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  const [fees, setFees] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!vendorSession?.access || !isTokenValid(vendorSession.access)) {
    localStorage.removeItem('nativeglow_vendor_tokens');
    return <Navigate to="/vendor/login" replace />;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${vendorSession.access}`,
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [feesRes, detailsRes] = await Promise.all([
          fetch(`${API_BASE}/vendor/maintenance/`, { headers: authHeaders }),
          fetch(`${API_BASE}/admin/payment-details/`),
        ]);

        if (!feesRes.ok) {
          let detail = `Failed to fetch fees (${feesRes.status})`;
          try {
            const payload = await feesRes.json();
            detail = payload.detail || payload.error || JSON.stringify(payload);
          } catch {
            // keep default
          }
          throw new Error(detail);
        }

        const feesData = await feesRes.json();
        const allFees = [
          ...(feesData.unpaid || []),
          ...(feesData.paid || []),
        ];

        let paymentDetailsData = null;
        if (detailsRes.ok) {
          paymentDetailsData = await detailsRes.json();
        }

        if (!mounted) return;

        setFees(allFees);
        setPaymentDetails(paymentDetailsData);
      } catch (err) {
        if (!mounted) return;
        if (String(err.message || '').toLowerCase().includes('authentication')) {
          localStorage.removeItem('nativeglow_vendor_tokens');
          return;
        }
        setError(err.message || 'Failed to load maintenance data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const handlePayNow = (fee) => {
    setSelectedFee(fee);
    setShowModal(true);
  };

  const handlePaymentSuccess = () => {
    setToast({ message: 'Payment submitted! Admin will verify within 24 hours.', type: 'success' });
    
    // Update the fee in the list to show "Submitted" status
    setFees((prev) =>
      prev.map((f) =>
        f.id === selectedFee?.id
          ? { ...f, is_paid: true, submitted_at: new Date().toISOString() }
          : f
      )
    );
    setShowModal(false);
    setSelectedFee(null);
  };

  const getStatusBadge = (fee) => {
    if (fee.verified_by_admin) {
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
          ✓ Verified
        </div>
      );
    }
    if (fee.is_paid) {
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
          ⏳ Submitted
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
        ❌ Not Paid
      </div>
    );
  };

  const getActionButton = (fee) => {
    if (fee.verified_by_admin) {
      return (
        <button disabled className="rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-800 cursor-default">
          ✓ Paid & Verified
        </button>
      );
    }
    if (fee.is_paid) {
      return (
        <button disabled className="rounded-lg bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800 cursor-default">
          Awaiting Verification
        </button>
      );
    }
    return (
      <button
        onClick={() => handlePayNow(fee)}
        className="rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white hover:bg-sage/90 transition"
      >
        Pay Now
      </button>
    );
  };

  return (
    <section className="max-w-5xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* SECTION 1: Payment Instructions */}
      {paymentDetails && (
        <div className="mb-6 rounded-2xl border-2 border-sage/30 bg-[#f2f7eb] p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-sage">How to Pay Your Maintenance Fee</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-xl bg-white p-4 border border-sage/20">
              <p className="text-sm font-bold uppercase tracking-wider text-sage">
                Step 1 — Pay to NativeGlow
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-600 mb-2">
                    Via UPI:
                  </p>
                  <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2.5 border border-zinc-200">
                    <span className="text-sm font-bold text-zinc-900">
                      {paymentDetails.upi_id}
                    </span>
                    <CopyButton text={paymentDetails.upi_id} label="Copy" />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {paymentDetails.upi_name}
                  </p>
                </div>

                <div className="text-center text-xs font-semibold text-zinc-500">
                  OR
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-zinc-600 mb-2">
                    Via Bank Transfer:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-200">
                      <div>
                        <p className="text-xs text-zinc-600">Account Number</p>
                        <p className="font-mono font-bold text-zinc-900">
                          {paymentDetails.bank_account_number}
                        </p>
                      </div>
                      <CopyButton
                        text={paymentDetails.bank_account_number}
                        label="Copy"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-200">
                      <div>
                        <p className="text-xs text-zinc-600">IFSC Code</p>
                        <p className="font-mono font-bold text-zinc-900">
                          {paymentDetails.bank_ifsc}
                        </p>
                      </div>
                      <CopyButton
                        text={paymentDetails.bank_ifsc}
                        label="Copy"
                      />
                    </div>
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-200">
                      <p className="text-xs text-zinc-600">Bank Name</p>
                      <p className="font-bold text-zinc-900">
                        {paymentDetails.bank_name}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-200">
                      <p className="text-xs text-zinc-600">Account Holder</p>
                      <p className="font-bold text-zinc-900">
                        {paymentDetails.account_holder_name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 & 3 */}
            <div className="rounded-xl bg-white p-4 border border-sage/20">
              <p className="text-sm font-bold uppercase tracking-wider text-sage">
                Step 2 — Submit Proof
              </p>
              <p className="mt-4 text-sm text-zinc-700">
                After paying, submit your payment proof (screenshot) using the "Pay Now" button in the table below.
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 border border-sage/20">
              <p className="text-sm font-bold uppercase tracking-wider text-sage">
                Step 3 — Verification
              </p>
              <p className="mt-4 text-sm text-zinc-700">
                Our admin team will verify your payment within 24 hours. You'll receive a confirmation email once verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Fee Records Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-zinc-900">Maintenance Fees</h2>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-600">Loading...</p>
        ) : error ? (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : fees.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">No maintenance fees found.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 font-semibold text-zinc-700">Month</th>
                  <th className="text-left py-3 px-4 font-semibold text-zinc-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-zinc-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-zinc-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 px-4 text-zinc-900">{fee.month}</td>
                    <td className="py-3 px-4 text-zinc-900 font-semibold">
                      {formatCurrency(fee.amount)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(fee)}
                      {!fee.verified_by_admin && fee.is_paid && fee.submitted_at && (
                        <p className="text-xs text-zinc-600 mt-2">
                          Submitted: {formatDate(fee.submitted_at)}
                        </p>
                      )}
                      {!fee.is_paid && !fee.verified_by_admin && fee.verification_note && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          {fee.verification_note}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getActionButton(fee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedFee && (
        <PayNowModal
          fee={selectedFee}
          onClose={() => {
            setShowModal(false);
            setSelectedFee(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </section>
  );
}

export default VendorMaintenance;
