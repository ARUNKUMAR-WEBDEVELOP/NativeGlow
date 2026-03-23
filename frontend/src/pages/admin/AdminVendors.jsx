import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api';

const STATUS_BADGES = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
  approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
  inactive: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Inactive' },
};

export default function AdminVendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingVendor, setRejectingVendor] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingVendor, setDeactivatingVendor] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const statusFilter = searchParams.get('status') || 'all';

  // Fetch vendors on load
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await api.request('/admin/vendors/', {});
        setVendors(Array.isArray(response) ? response : response.results || []);
      } catch (err) {
        setError(err?.payload?.detail || err?.message || 'Failed to load vendors');
        console.error('Vendors error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = vendors;

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter((v) => v.status === 'pending');
      } else if (statusFilter === 'active') {
        filtered = filtered.filter((v) => v.status === 'approved');
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter((v) => v.status === 'inactive');
      } else if (statusFilter === 'maintenance') {
        filtered = filtered.filter((v) => v.maintenance_due && v.maintenance_due > 0);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.business_name.toLowerCase().includes(query) ||
          v.owner_name.toLowerCase().includes(query) ||
          (v.email && v.email.toLowerCase().includes(query))
      );
    }

    setFilteredVendors(filtered);
  }, [vendors, statusFilter, searchQuery]);

  // Handle approve vendor
  const handleApprove = async (vendorId) => {
    try {
      setActionLoading(`approve-${vendorId}`);
      await api.request(`/admin/vendors/${vendorId}/approve/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      });
      // Refresh vendors list
      const updated = vendors.map((v) =>
        v.id === vendorId ? { ...v, status: 'approved' } : v
      );
      setVendors(updated);
    } catch (err) {
      setError(err?.payload?.detail || 'Failed to approve vendor');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject vendor
  const handleReject = async (vendorId) => {
    try {
      setActionLoading(`reject-${vendorId}`);
      await api.request(`/admin/vendors/${vendorId}/approve/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason }),
      });
      const updated = vendors.map((v) =>
        v.id === vendorId ? { ...v, status: 'rejected' } : v
      );
      setVendors(updated);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err) {
      setError(err?.payload?.detail || 'Failed to reject vendor');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle deactivate vendor
  const handleDeactivate = async (vendorId) => {
    try {
      setActionLoading(`deactivate-${vendorId}`);
      await api.request(`/admin/vendors/${vendorId}/deactivate/`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: deactivateReason }),
      });
      const updated = vendors.map((v) =>
        v.id === vendorId ? { ...v, status: 'inactive' } : v
      );
      setVendors(updated);
      setShowDeactivateModal(false);
      setDeactivateReason('');
    } catch (err) {
      setError(err?.payload?.detail || 'Failed to deactivate vendor');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle mark maintenance paid
  const handleMarkFeePaid = async (vendorId) => {
    try {
      setActionLoading(`maintain-${vendorId}`);
      // This would call a maintenance fee endpoint
      // For now, we'll just update the vendor
      setError('Maintenance fee update not implemented yet');
    } catch (err) {
      setError(err?.payload?.detail || 'Failed to mark fee as paid');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-slate-400">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Vendor Management</h1>
        <p className="mt-2 text-slate-400">Review and manage vendor accounts</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSearchParams({})}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-[#e8b86d] text-[#1a1a2e]'
                : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSearchParams({ status: 'pending' })}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              statusFilter === 'pending'
                ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={() => setSearchParams({ status: 'active' })}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              statusFilter === 'active'
                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setSearchParams({ status: 'inactive' })}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              statusFilter === 'inactive'
                ? 'bg-gray-500/30 text-gray-400 border border-gray-500/50'
                : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => setSearchParams({ status: 'maintenance' })}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              statusFilter === 'maintenance'
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            Maintenance Due
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search by business name, owner, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Vendors Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Business Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Owner</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">City</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                Products
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                Monthly Revenue
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Maintenance
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                  No vendors found
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-white font-medium">{vendor.business_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{vendor.owner_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{vendor.city || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-300">
                    {vendor.total_products || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-400 font-medium">
                    ₹{(vendor.monthly_revenue || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_BADGES[vendor.status]?.bg
                      } ${STATUS_BADGES[vendor.status]?.text}`}
                    >
                      {STATUS_BADGES[vendor.status]?.label || vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {vendor.maintenance_due > 0 ? (
                      <span className="text-orange-400 font-medium">
                        ₹{vendor.maintenance_due.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-green-400">✓ Paid</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setShowDetailModal(true);
                      }}
                      className="rounded px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium"
                    >
                      View
                    </button>
                    {vendor.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(vendor.id)}
                          disabled={actionLoading === `approve-${vendor.id}`}
                          className="rounded px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading === `approve-${vendor.id}` ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            setRejectingVendor(vendor);
                            setShowRejectModal(true);
                          }}
                          className="rounded px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-medium"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {vendor.status === 'approved' && (
                      <button
                        onClick={() => {
                          setDeactivatingVendor(vendor);
                          setShowDeactivateModal(true);
                        }}
                        className="rounded px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                    {vendor.maintenance_due > 0 && (
                      <button
                        onClick={() => handleMarkFeePaid(vendor.id)}
                        disabled={actionLoading === `maintain-${vendor.id}`}
                        className="rounded px-2 py-1 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 text-xs font-medium disabled:opacity-50"
                      >
                        {actionLoading === `maintain-${vendor.id}` ? '...' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vendor Detail Modal */}
      {showDetailModal && selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedVendor(null);
          }}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingVendor && (
        <RejectModal
          vendor={rejectingVendor}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={() => handleReject(rejectingVendor.id)}
          onCancel={() => {
            setShowRejectModal(false);
            setRejectingVendor(null);
            setRejectReason('');
          }}
          isLoading={actionLoading === `reject-${rejectingVendor.id}`}
        />
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && deactivatingVendor && (
        <DeactivateModal
          vendor={deactivatingVendor}
          reason={deactivateReason}
          onReasonChange={setDeactivateReason}
          onConfirm={() => handleDeactivate(deactivatingVendor.id)}
          onCancel={() => {
            setShowDeactivateModal(false);
            setDeactivatingVendor(null);
            setDeactivateReason('');
          }}
          isLoading={actionLoading === `deactivate-${deactivatingVendor.id}`}
        />
      )}
    </div>
  );
}

// Vendor Detail Modal Component
function VendorDetailModal({ vendor, onClose }) {
  const [vendorDetail, setVendorDetail] = useState(vendor);
  const [products, setProducts] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        setIsLoading(true);
        // Fetch vendor products
        const productsRes = await api.request(`/admin/vendors/${vendor.id}/products/`, {});
        setProducts(Array.isArray(productsRes) ? productsRes : productsRes.results || []);

        // Fetch maintenance history
        const maintenanceRes = await api.request(
          `/admin/maintenance/?vendor_id=${vendor.id}`,
          {}
        );
        setMaintenanceHistory(Array.isArray(maintenanceRes) ? maintenanceRes : maintenanceRes.results || []);

        // Fetch sales data for chart
        const salesRes = await api.request(
          `/admin/sales/vendor/${vendor.id}/monthly/`,
          {}
        );
        const formattedSales = Array.isArray(salesRes.results)
          ? salesRes.results
          : Array.isArray(salesRes)
          ? salesRes
          : [];
        setSalesData(formattedSales);
      } catch (err) {
        console.error('Failed to fetch vendor details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorDetails();
  }, [vendor.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-700 pb-4">
          <h2 className="text-2xl font-bold text-white">{vendor.business_name}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mb-4 inline-block animate-spin">
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-slate-400">Loading vendor details...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Vendor Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-xs text-slate-400 mb-1">Owner Name</p>
                <p className="text-white font-semibold">{vendor.owner_name}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-xs text-slate-400 mb-1">Email</p>
                <p className="text-white font-semibold">{vendor.email}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-xs text-slate-400 mb-1">Phone</p>
                <p className="text-white font-semibold">{vendor.phone || '-'}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_BADGES[vendor.status]?.bg
                  } ${STATUS_BADGES[vendor.status]?.text}`}
                >
                  {STATUS_BADGES[vendor.status]?.label || vendor.status}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendor.payment_method === 'upi' ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">UPI ID</p>
                    <p className="text-white font-semibold">{vendor.upi_id || '-'}</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                      <p className="text-xs text-slate-400 mb-1">Bank Account</p>
                      <p className="text-white font-semibold">{vendor.account_number || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                      <p className="text-xs text-slate-400 mb-1">IFSC Code</p>
                      <p className="text-white font-semibold">{vendor.ifsc_code || '-'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Monthly Sales Chart */}
            {salesData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Monthly Sales</h3>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                          }}
                          formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#e8b86d"
                          dot={{ fill: '#e8b86d' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Products List */}
            {products.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Products ({products.length})</h3>
                <div className="space-y-2">
                  {products.slice(0, 10).map((product) => (
                    <div
                      key={product.id}
                      className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 flex items-center justify-between"
                    >
                      <span className="text-white font-medium">{product.name}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.approval_status === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : product.approval_status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {product.approval_status}
                      </span>
                    </div>
                  ))}
                  {products.length > 10 && (
                    <p className="text-slate-400 text-sm">+{products.length - 10} more products</p>
                  )}
                </div>
              </div>
            )}

            {/* Maintenance Fee History */}
            {maintenanceHistory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Maintenance Fee History</h3>
                <div className="space-y-2">
                  {maintenanceHistory.map((fee) => (
                    <div
                      key={fee.id}
                      className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{fee.month}</p>
                        <p className="text-slate-400 text-sm">₹{fee.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          fee.is_paid
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {fee.is_paid ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Reject Modal Component
function RejectModal({ vendor, reason, onReasonChange, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Reject Vendor</h3>
        <p className="text-slate-400 mb-4">Are you sure you want to reject {vendor.business_name}?</p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Reason for rejection (required)..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
          rows={4}
        />
        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || isLoading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Deactivate Modal Component
function DeactivateModal({ vendor, reason, onReasonChange, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Deactivate Vendor</h3>
        <p className="text-slate-400 mb-4">
          Are you sure you want to deactivate {vendor.business_name}? This action will suspend their ability to list and sell products.
        </p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Reason for deactivation (required)..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
          rows={4}
        />
        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || isLoading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}
