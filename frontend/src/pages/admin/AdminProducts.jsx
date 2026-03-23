import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_BADGE_STYLES = {
  pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  approved: 'bg-green-500/20 text-green-300 border border-green-500/40',
  rejected: 'bg-red-500/20 text-red-300 border border-red-500/40',
};

function normalizeIngredients(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function ProductCard({
  product,
  ingredients,
  ingredientsLoading,
  expanded,
  onToggleIngredients,
  onApprove,
  onReject,
  actionLoading,
}) {
  const showPendingActions = product.status === 'pending';

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 shadow-sm transition hover:border-slate-600">
      <div className="relative mb-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-800/40">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title || product.name || 'Product'}
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-44 items-center justify-center text-slate-500">
            No image
          </div>
        )}
        {product.is_natural_certified ? (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2 py-1 text-xs font-semibold text-white">
            100% Natural
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold text-white">
            {product.title || product.name}
          </h3>
          <p className="text-sm text-slate-400">{product.vendor_name || 'Unknown Vendor'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-indigo-200 border border-indigo-500/40">
            {product.category_name || product.category_type || 'Uncategorized'}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300 border border-slate-700">
            ₹{Number(product.price || 0).toLocaleString('en-IN')}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300 border border-slate-700">
            Qty: {product.available_quantity ?? '-'}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              STATUS_BADGE_STYLES[product.status] || 'bg-slate-700 text-slate-200'
            }`}
          >
            {product.status}
          </span>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-2.5">
          <button
            type="button"
            onClick={onToggleIngredients}
            className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-200"
          >
            <span>Ingredients</span>
            <span className="text-xs text-slate-400">{expanded ? 'Hide' : 'Show'}</span>
          </button>

          {expanded ? (
            <div className="mt-2 text-sm text-slate-300">
              {ingredientsLoading ? (
                <p className="text-slate-400">Loading ingredients...</p>
              ) : ingredients.length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {ingredients.map((item, idx) => (
                    <li key={`${product.id}-ingredient-${idx}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">No ingredients listed.</p>
              )}
            </div>
          ) : null}
        </div>

        {showPendingActions ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onApprove}
              disabled={actionLoading}
              className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? 'Working...' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={actionLoading}
              className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RejectProductModal({ product, reason, onReasonChange, onClose, onConfirm, submitting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="text-xl font-semibold text-white">Reject Product</h3>
        <p className="mt-1 text-sm text-slate-400">
          Provide a rejection reason for {product.title || product.name}.
        </p>

        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={5}
          placeholder="Add rejection reason..."
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-[#e8b86d] focus:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim() || submitting}
            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Rejecting...' : 'Reject Product'}
          </button>
        </div>
      </div>
    </div>
  );
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

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [expandedIngredients, setExpandedIngredients] = useState({});
  const [ingredientsByProduct, setIngredientsByProduct] = useState({});
  const [ingredientsLoadingByProduct, setIngredientsLoadingByProduct] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectingProduct, setRejectingProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const statusFilter = searchParams.get('status') || 'all';

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError('');
        const params = {};
        if (statusFilter !== 'all') {
          params.approval_status = statusFilter;
        }
        const response = await api.getAdminProducts(params);
        if (isMounted) {
          const list = Array.isArray(response) ? response : response?.results || [];
          setProducts(list);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.payload?.detail || err?.message || 'Failed to load products.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeout = setTimeout(() => setToastMessage(''), 2200);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const categoryOptions = useMemo(() => {
    const unique = new Map();
    products.forEach((product) => {
      const key = product.category_type || product.category_name;
      const label = product.category_name || product.category_type;
      if (key && label && !unique.has(key)) {
        unique.set(key, label);
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [products]);

  const vendorOptions = useMemo(() => {
    const unique = new Map();
    products.forEach((product) => {
      if (product.vendor && product.vendor_name && !unique.has(product.vendor)) {
        unique.set(product.vendor, product.vendor_name);
      }
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (categoryFilter !== 'all') {
        const productCategoryKey = product.category_type || product.category_name;
        if (productCategoryKey !== categoryFilter) {
          return false;
        }
      }
      if (vendorFilter !== 'all' && String(product.vendor) !== vendorFilter) {
        return false;
      }
      return true;
    });
  }, [products, categoryFilter, vendorFilter]);

  async function ensureIngredientsLoaded(productId) {
    if (ingredientsByProduct[productId]) {
      return;
    }

    setIngredientsLoadingByProduct((prev) => ({ ...prev, [productId]: true }));
    try {
      const detail = await api.getAdminProductDetail(productId);
      const parsed = normalizeIngredients(detail?.ingredients);
      setIngredientsByProduct((prev) => ({ ...prev, [productId]: parsed }));
    } catch {
      setIngredientsByProduct((prev) => ({ ...prev, [productId]: [] }));
    } finally {
      setIngredientsLoadingByProduct((prev) => ({ ...prev, [productId]: false }));
    }
  }

  function handleToggleIngredients(productId) {
    setExpandedIngredients((prev) => ({ ...prev, [productId]: !prev[productId] }));
    if (!expandedIngredients[productId]) {
      ensureIngredientsLoaded(productId);
    }
  }

  async function handleApprove(productId) {
    const snapshot = products;
    setActionLoadingId(productId);
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, status: 'approved', approval_status: 'approved' } : product
      )
    );

    try {
      await api.approveAdminProduct(productId, { status: 'approved' });
      setToastMessage('Product approved');
    } catch (err) {
      setProducts(snapshot);
      setError(err?.payload?.detail || err?.message || 'Failed to approve product.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleConfirmReject() {
    if (!rejectingProduct) {
      return;
    }

    const productId = rejectingProduct.id;
    const reason = rejectionReason.trim();
    if (!reason) {
      return;
    }

    const snapshot = products;
    setActionLoadingId(productId);
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, status: 'rejected', approval_status: 'rejected' } : product
      )
    );

    try {
      await api.approveAdminProduct(productId, { status: 'rejected', reason });
      setToastMessage('Product rejected');
      setRejectingProduct(null);
      setRejectionReason('');
    } catch (err) {
      setProducts(snapshot);
      setError(err?.payload?.detail || err?.message || 'Failed to reject product.');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <Toast message={toastMessage} />

      <div>
        <h1 className="text-3xl font-bold text-white">Product Approvals</h1>
        <p className="mt-2 text-slate-400">Review and moderate all listed products.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => {
            const active = statusFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  if (option.key === 'all') {
                    setSearchParams({});
                  } else {
                    setSearchParams({ status: option.key });
                  }
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-[#e8b86d] text-[#1a1a2e]'
                    : 'border border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Filter by category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-400">Filter by vendor</span>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-[#e8b86d] focus:outline-none"
            >
              <option value="all">All vendors</option>
              {vendorOptions.map((option) => (
                <option key={option.value} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center text-slate-400">
          No products found for the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              ingredients={ingredientsByProduct[product.id] || []}
              ingredientsLoading={Boolean(ingredientsLoadingByProduct[product.id])}
              expanded={Boolean(expandedIngredients[product.id])}
              onToggleIngredients={() => handleToggleIngredients(product.id)}
              onApprove={() => handleApprove(product.id)}
              onReject={() => {
                setRejectingProduct(product);
                setRejectionReason('');
              }}
              actionLoading={actionLoadingId === product.id}
            />
          ))}
        </div>
      )}

      {rejectingProduct ? (
        <RejectProductModal
          product={rejectingProduct}
          reason={rejectionReason}
          onReasonChange={setRejectionReason}
          onClose={() => {
            setRejectingProduct(null);
            setRejectionReason('');
          }}
          onConfirm={handleConfirmReject}
          submitting={actionLoadingId === rejectingProduct.id}
        />
      ) : null}
    </section>
  );
}
