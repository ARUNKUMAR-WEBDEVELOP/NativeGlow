import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../../api';
import useApiRequest from '../../hooks/useApiRequest';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const statsRequest = useApiRequest(
    () => api.request('/admin/dashboard/stats/', {}),
    [],
    {
      immediate: true,
      initialData: null,
      cacheKey: 'admin:dashboard:stats',
      cacheTtlMs: 60 * 1000,
    }
  );

  const salesRequest = useApiRequest(
    () => api.request('/admin/sales/monthly/', {}),
    [],
    {
      immediate: true,
      initialData: [],
      cacheKey: 'admin:dashboard:sales-monthly',
      cacheTtlMs: 60 * 1000,
    }
  );

  const isLoading = statsRequest.loading || salesRequest.loading;
  const stats = statsRequest.data;

  const monthlySales = useMemo(() => {
    const salesResponse = salesRequest.data;
    return Array.isArray(salesResponse?.results)
      ? salesResponse.results
      : Array.isArray(salesResponse)
      ? salesResponse
      : [];
  }, [salesRequest.data]);

  const hasError = Boolean(statsRequest.error || salesRequest.error);

  const handleRetry = async () => {
    await Promise.allSettled([
      statsRequest.execute(),
      salesRequest.execute(),
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin">
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
          </div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-slate-400">Overview of your platform's key metrics</p>
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
          <p className="font-semibold">Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Active Vendors */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Vendors</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {stats.active_vendors || 0}
                </p>
              </div>
              <span className="text-4xl">🏪</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Total approved vendors</p>
          </div>

          {/* Pending Vendor Approvals */}
          <button
            onClick={() => navigate('/admin/vendors?status=pending')}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-[#e8b86d] transition-all text-left hover:shadow-lg hover:shadow-[#e8b86d]/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Pending Approvals</p>
                <p className="mt-2 text-3xl font-bold text-[#e8b86d]">
                  {stats.pending_vendor_approvals || 0}
                </p>
              </div>
              <span className="text-4xl">⏳</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Click to review vendors</p>
          </button>

          {/* Total Products */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Products Listed</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {stats.total_products || 0}
                </p>
              </div>
              <span className="text-4xl">📦</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Across all vendors</p>
          </div>

          {/* Products Awaiting Approval */}
          <button
            onClick={() => navigate('/admin/products?status=pending')}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-[#e8b86d] transition-all text-left hover:shadow-lg hover:shadow-[#e8b86d]/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Pending Products</p>
                <p className="mt-2 text-3xl font-bold text-[#e8b86d]">
                  {stats.pending_product_approvals || 0}
                </p>
              </div>
              <span className="text-4xl">⏳</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Click to review products</p>
          </button>

          {/* Orders This Month */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Orders This Month</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {stats.total_orders_this_month || 0}
                </p>
              </div>
              <span className="text-4xl">🛒</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Current month only</p>
          </div>

          {/* Revenue This Month */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Revenue This Month</p>
                <p className="mt-2 text-2xl font-bold text-green-400">
                  ₹{(stats.revenue_this_month || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <span className="text-4xl">💵</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Total platform revenue</p>
          </div>

          {/* Maintenance Collected */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Maintenance Collected</p>
                <p className="mt-2 text-2xl font-bold text-blue-400">
                  ₹{(stats.maintenance_collected_this_month || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">This month</p>
          </div>

          {/* Maintenance Pending */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Maintenance Pending</p>
                <p className="mt-2 text-3xl font-bold text-orange-400">
                  {stats.maintenance_pending_count || 0}
                </p>
              </div>
              <span className="text-4xl">⚠️</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Unpaid vendor fees</p>
          </div>
        </div>
      )}

      {/* Monthly Revenue Chart */}
      {monthlySales.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
          <h2 className="mb-6 text-xl font-semibold text-white">Monthly Revenue Trend</h2>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                  formatter={(value) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Bar dataKey="total_revenue" fill="#e8b86d" name="Revenue" radius={[8, 8, 0, 0]}>
                  {monthlySales.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={Number(entry.total_revenue || 0) > 150000 ? '#10b981' : '#e8b86d'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            onClick={() => navigate('/admin/vendors')}
            className="rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-3 font-medium text-white hover:border-[#e8b86d] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <span>👥</span>
            Review Pending Vendors
          </button>
          <button
            onClick={() => navigate('/admin/products')}
            className="rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-3 font-medium text-white hover:border-[#e8b86d] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <span>📦</span>
            Review Pending Products
          </button>
          <button
            onClick={() => navigate('/admin/maintenance')}
            className="rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-3 font-medium text-white hover:border-[#e8b86d] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <span>💰</span>
            Generate Monthly Fees
          </button>
        </div>
      </div>
    </div>
  );
}
