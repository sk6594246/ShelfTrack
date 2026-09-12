import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Minus,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { useProduct, useProducts } from '../hooks/useProducts';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getMovements } from '../store/inventoryStore';
import type { StockMovement } from '../types/inventory';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(id);
  const { changeStock, remove } = useProducts();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    if (!product?.id) return;
    getMovements(product.id).then((list) => setMovements(list.slice(0, 8)));
  }, [product?.id, product?.quantity]); // refresh when qty changes

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Product not found</p>
        <Link to="/inventory" className="mt-2 text-indigo-600 hover:underline">
          Back to inventory
        </Link>
      </div>
    );
  }

  async function handleAdjust(direction: 1 | -1) {
    const change = direction * Math.abs(adjustQty);
    await changeStock(product!.id, change, adjustReason || undefined);
    setShowAdjust(false);
    setAdjustQty(1);
    setAdjustReason('');
  }

  async function handleDelete() {
    await remove(product!.id);
    navigate('/inventory', { replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <Link
            to={`/products/${product.id}/edit`}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Edit2 className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Package className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
            <p className="text-sm text-slate-500">SKU: {product.sku}</p>
            <div className="mt-2">
              <StatusBadge
                quantity={product.quantity}
                reorderPoint={product.reorderPoint}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">Current quantity</p>
            <p className="text-3xl font-bold text-slate-900">{product.quantity}</p>
          </div>
          <button
            onClick={() => setShowAdjust(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Adjust stock
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <DetailRow label="Barcode" value={product.barcode} />
        <DetailRow label="Custom ID" value={product.customId} />
        <DetailRow label="Category" value={product.category} />
        <DetailRow label="Location" value={product.location} />
        <DetailRow label="Reorder point" value={String(product.reorderPoint)} />
        {product.notes && <DetailRow label="Notes" value={product.notes} />}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent activity
        </h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-400">No stock movements yet</p>
        ) : (
          <ul className="space-y-2">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100"
              >
                <div>
                  <span
                    className={
                      m.change > 0 ? 'font-medium text-green-600' : 'font-medium text-red-600'
                    }
                  >
                    {m.change > 0 ? '+' : ''}
                    {m.change}
                  </span>
                  {m.reason && (
                    <span className="ml-2 text-slate-500">{m.reason}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Adjust stock</h3>
            <p className="mt-1 text-sm text-slate-500">Current: {product.quantity}</p>

            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                onClick={() => setAdjustQty((q) => Math.max(1, q - 1))}
                className="rounded-full bg-slate-100 p-2"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                min={1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                className="w-20 rounded-lg border border-slate-200 py-2 text-center text-lg font-semibold"
              />
              <button
                onClick={() => setAdjustQty((q) => q + 1)}
                className="rounded-full bg-slate-100 p-2"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Reason (optional)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAdjust(-1)}
                className="rounded-xl bg-red-50 py-2.5 font-medium text-red-700 hover:bg-red-100"
              >
                Remove
              </button>
              <button
                onClick={() => handleAdjust(1)}
                className="rounded-xl bg-green-50 py-2.5 font-medium text-green-700 hover:bg-green-100"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setShowAdjust(false)}
              className="mt-3 w-full py-2 text-sm text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete product?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <strong>{product.name}</strong> and its history.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl bg-slate-100 py-2.5 font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl bg-red-600 py-2.5 font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
