import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import EditProductModal from '../../pages/vendor/EditProductModal';
import DiscountModal from '../../pages/vendor/DiscountModal';

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

function statusBadgeClasses(status) {
  if (status === 'approved') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'rejected') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function getDiscountPercent(product) {
  return Number(product?.discount_percent ?? product?.discount_percentage ?? 0);
}

function getDiscountedPrice(product) {
  const directValue = Number(product?.discounted_price ?? 0);
  if (directValue > 0) {
    return directValue;
  }
  const price = Number(product?.price ?? 0);
  const percent = getDiscountPercent(product);
  if (!price || percent <= 0) {
    return null;
  }
  return Number((price * (1 - percent / 100)).toFixed(2));
}

function MobileProductCard({
  product,
  operationLoading,
  quantityDraft,
  setQuantityDraft,
  onToggleVisibility,
  onToggleFeatured,
  setDiscountModalProduct,
  setEditingProduct,
  onDelete,
  onUpdateQuantity,
}) {
  const percent = getDiscountPercent(product);
  const discounted = getDiscountedPrice(product);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {product.image ? (
          <img src={product.image} alt={product.title} className="h-16 w-16 rounded-lg border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">No Image</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{product.title}</p>
          <p className="mt-1 text-xs text-zinc-500 capitalize">{String(product.category_type || 'other').replace('_', ' ')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {discounted ? (
              <>
                <span className="text-sm font-bold text-emerald-700">INR {discounted}</span>
                <span className="text-xs text-zinc-400 line-through">INR {product.price}</span>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">{percent}% OFF</span>
              </>
            ) : (
              <span className="text-sm font-bold text-zinc-800">INR {product.price}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={quantityDraft[product.id] ?? product.available_quantity}
          onChange={(e) =>
            setQuantityDraft((prev) => ({
              ...prev,
              [product.id]: e.target.value,
            }))
          }
          className="w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={() => onUpdateQuantity(product.id)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700"
        >
          Update Qty
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggleVisibility(product)}
          disabled={operationLoading[product.id]}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
        >
          {product.is_visible ? 'Hide' : 'Show'}
        </button>
        <button
          type="button"
          onClick={() => onToggleFeatured(product)}
          disabled={operationLoading[product.id]}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
        >
          {product.is_featured ? 'Unfeature' : 'Feature'}
        </button>
        <button
          type="button"
          onClick={() => setDiscountModalProduct(product)}
          className="rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700"
        >
          {percent > 0 ? 'Edit Discount' : 'Set Discount'}
        </button>
        <button
          type="button"
          onClick={() => setEditingProduct(product)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(product.id)}
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

// Sortable row component
function SortableProductRow({
  product,
  operationLoading,
  quantityDraft,
  setQuantityDraft,
  onToggleVisibility,
  onToggleFeatured,
  setDiscountModalProduct,
  setEditingProduct,
  onDelete,
  onUpdateQuantity,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t border-zinc-100 align-top transition ${
        isDragging ? 'bg-sage/10 shadow-md' : ''
      }`}
    >
      <td className="px-3 py-3 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        {product.image ? (
          <img src={product.image} alt={product.title} className="h-14 w-14 rounded-lg border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">No Image</div>
        )}
      </td>
      <td className="px-3 py-3 font-semibold text-zinc-800">
        <div>{product.title}</div>
        {product.status === 'rejected' && product.rejection_reason ? (
          <p className="mt-1 text-xs font-normal text-rose-700">Reason: {product.rejection_reason}</p>
        ) : null}
      </td>
      <td className="px-3 py-3">INR {product.price}</td>
      <td className="px-3 py-3">
        {getDiscountPercent(product) > 0 ? (
          <span className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
            {getDiscountPercent(product)}% OFF
          </span>
        ) : (
          <span className="text-xs text-zinc-500">No discount</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={quantityDraft[product.id] ?? product.available_quantity}
            onChange={(e) =>
              setQuantityDraft((prev) => ({
                ...prev,
                [product.id]: e.target.value,
              }))
            }
            className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => onUpdateQuantity(product.id)}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700"
          >
            Update
          </button>
        </div>
      </td>
      <td className="px-3 py-3 capitalize">{String(product.category_type || 'other').replace('_', ' ')}</td>
      <td className="px-3 py-3">
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClasses(product.status)}`}>
          {product.status}
        </span>
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onToggleVisibility(product)}
          disabled={operationLoading[product.id]}
          className="text-xl transition hover:scale-110 disabled:opacity-50"
          title={product.is_visible ? 'Visible' : 'Hidden'}
        >
          {product.is_visible ? '👁️' : '🚫'}
        </button>
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onToggleFeatured(product)}
          disabled={operationLoading[product.id]}
          className="text-xl transition hover:scale-110 disabled:opacity-50"
          title={product.is_featured ? 'Featured' : 'Not featured'}
        >
          {product.is_featured ? '⭐' : '☆'}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDiscountModalProduct(product)}
            className="rounded-lg border border-orange-300 px-2 py-1 text-xs font-semibold text-orange-700"
          >
            {getDiscountPercent(product) > 0 ? 'Edit Discount' : 'Set Discount'}
          </button>
          <button
            type="button"
            onClick={() => setEditingProduct(product)}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function ProductList() {
  const vendorSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('nativeglow_vendor_tokens') || 'null');
    } catch {
      return null;
    }
  }, []);

  // DnD-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [quantityDraft, setQuantityDraft] = useState({});
  const [discountModalProduct, setDiscountModalProduct] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState({});

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vendorSession?.access || ''}`,
    }),
    [vendorSession?.access]
  );

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/vendor/products/`, { headers: authHeaders });
      if (!res.ok) {
        let detail = `Failed to fetch products (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorSession?.access) {
      fetchProducts();
    }
  }, [vendorSession?.access]);

  const onDelete = async (productId) => {
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/delete/`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (!res.ok && res.status !== 204) {
        let detail = `Delete failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) => prev.filter((item) => item.id !== productId));
      setSuccess('Product deleted successfully.');
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  const onUpdateQuantity = async (productId) => {
    const value = quantityDraft[productId];
    if (value === undefined || value === '') {
      setError('Enter quantity before updating.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const qty = Number(value);
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/quantity/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ available_quantity: qty }),
      });

      if (!res.ok) {
        let detail = `Quantity update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, available_quantity: qty } : item))
      );
      setSuccess('Quantity updated successfully.');
    } catch (err) {
      setError(err.message || 'Could not update quantity.');
    }
  };

  const onSaveEdit = async (payload) => {
    if (!editingProduct) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/vendor/products/${editingProduct.id}/edit/`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = `Update failed (${res.status})`;
        try {
          const data = await res.json();
          detail = data.detail || data.error || JSON.stringify(data);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setEditingProduct(null);
      setSuccess('Product updated successfully.');
      await fetchProducts();
    } catch (err) {
      setError(err.message || 'Could not update product.');
    }
  };

  const onToggleVisibility = async (product) => {
    const productId = product.id;
    setOperationLoading((prev) => ({ ...prev, [productId]: true }));
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/visibility/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_visible: !product.is_visible }),
      });

      if (!res.ok) {
        let detail = `Visibility update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, is_visible: !item.is_visible } : item))
      );
      setSuccess(`Product ${!product.is_visible ? 'shown' : 'hidden'}.`);
    } catch (err) {
      setError(err.message || 'Could not update visibility.');
    } finally {
      setOperationLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const onToggleFeatured = async (product) => {
    const productId = product.id;
    setOperationLoading((prev) => ({ ...prev, [productId]: true }));
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/feature/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ is_featured: !product.is_featured }),
      });

      if (!res.ok) {
        let detail = `Featured update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, is_featured: !item.is_featured } : item))
      );
      setSuccess(`Product ${!product.is_featured ? 'featured' : 'unfeatured'}.`);
    } catch (err) {
      setError(err.message || 'Could not update featured status.');
    } finally {
      setOperationLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const onApplyDiscount = async (discountPercentage) => {
    if (!discountModalProduct) {
      return;
    }

    const productId = discountModalProduct.id;
    setDiscountLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/vendor/products/${productId}/discount/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ discount_percent: discountPercentage }),
      });

      if (!res.ok) {
        let detail = `Discount update failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setProducts((prev) =>
        prev.map((item) => {
          if (item.id !== productId) {
            return item;
          }
          const nextDiscounted = discountPercentage > 0
            ? Number((Number(item.price || 0) * (1 - discountPercentage / 100)).toFixed(2))
            : null;
          return {
            ...item,
            discount_percent: discountPercentage,
            discounted_price: nextDiscounted,
          };
        })
      );

      setDiscountModalProduct(null);
      setSuccess(discountPercentage > 0 ? 'Discount applied successfully.' : 'Discount removed.');
    } catch (err) {
      setError(err.message || 'Could not update discount.');
    } finally {
      setDiscountLoading(false);
    }
  };

  const onReorder = async (event) => {
    const { active, over } = event;

    // If dropped outside a valid zone
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = products.findIndex((item) => item.id === active.id);
    const newIndex = products.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);

    // Send to backend using expected payload key: order
    const newPositions = reordered.map((product, index) => ({
      id: product.id,
      position: index,
    }));

    setError('');
    try {
      const res = await fetch(`${API_BASE}/vendor/products/reorder/`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ order: newPositions }),
      });

      if (!res.ok) {
        let detail = `Reorder failed (${res.status})`;
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || JSON.stringify(payload);
        } catch {
          // keep default detail
        }
        throw new Error(detail);
      }

      setSuccess('Product order updated.');
    } catch (err) {
      setError(err.message || 'Could not reorder products.');
      // Revert to original order on error
      await fetchProducts();
    }
  };

  return (
    <section className="space-y-4">
      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3 md:hidden">
        {loading ? <p className="rounded-xl border border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500">Loading products...</p> : null}
        {!loading && products.length === 0 ? <p className="rounded-xl border border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500">No products found.</p> : null}
        {!loading && products.map((product) => (
          <MobileProductCard
            key={product.id}
            product={product}
            operationLoading={operationLoading}
            quantityDraft={quantityDraft}
            setQuantityDraft={setQuantityDraft}
            onToggleVisibility={onToggleVisibility}
            onToggleFeatured={onToggleFeatured}
            setDiscountModalProduct={setDiscountModalProduct}
            setEditingProduct={setEditingProduct}
            onDelete={onDelete}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorder}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-3">Image</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Discount</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Visibility</th>
                <th className="px-3 py-3">Featured</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <SortableContext
              items={products.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">Loading products...</td>
                  </tr>
                ) : null}

                {!loading && products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">No products found.</td>
                  </tr>
                ) : null}

                {!loading && products.map((product) => (
                  <SortableProductRow
                    key={product.id}
                    product={product}
                    operationLoading={operationLoading}
                    quantityDraft={quantityDraft}
                    setQuantityDraft={setQuantityDraft}
                    onToggleVisibility={onToggleVisibility}
                    onToggleFeatured={onToggleFeatured}
                    setDiscountModalProduct={setDiscountModalProduct}
                    setEditingProduct={setEditingProduct}
                    onDelete={onDelete}
                    onUpdateQuantity={onUpdateQuantity}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      {editingProduct ? (
        <EditProductModal
          product={editingProduct}
          onSave={onSaveEdit}
          onClose={() => setEditingProduct(null)}
        />
      ) : null}

      {discountModalProduct ? (
        <DiscountModal
          product={discountModalProduct}
          loading={discountLoading}
          onApply={onApplyDiscount}
          onClose={() => setDiscountModalProduct(null)}
        />
      ) : null}
    </section>
  );
}

export default ProductList;
