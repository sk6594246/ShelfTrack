import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Minus,
  Package,
  Plus,
  QrCode,
  Trash2,
} from 'lucide-react';
import { useProduct, useProducts } from '../hooks/useProducts';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getMovements } from '../store/inventoryStore';
import type { StockMovement } from '../types/inventory';
import { useLocations } from '../hooks/useLocations';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { product, loading } = useProduct(id);
  const { changeStock, remove } = useProducts();
  const { locations } = useLocations();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [transactionType, setTransactionType] = useState<'purchase' | 'sale' | null>(null);
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [saleLocation, setSaleLocation] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [saleQty, setSaleQty] = useState(1);

  // Initialize state from location
  useEffect(() => {
    if (location.state) {
      if (location.state.showAdjust) {
        setShowAdjust(true);
      }
      if (location.state.purchase) {
        setTransactionType('purchase');
      }
      if (location.state.sale) {
        setTransactionType('sale');
      }
    }
  }, [location.state]);

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

  async function handlePurchase() {
    if (!purchaseLocation) {
      alert('Please select a location');
      return;
    }
    const change = purchaseQty;
    await changeStock(product!.id, change, `Purchase - Location: ${purchaseLocation}`);
    setTransactionType(null);
    setPurchaseLocation('');
    setPurchaseQty(1);
  }

  async function handleSale() {
    if (!saleLocation) {
      alert('Please select a location');
      return;
    }
    const change = -saleQty; // Negative for removal
    await changeStock(product!.id, change, `Sale - Location: ${saleLocation}`);
    setTransactionType(null);
    setSaleLocation('');
    setSaleQty(1);
  }

  async function handleDelete() {
    await remove(product!.id);
    navigate('/inventory', { replace: true });
  }

  // Get stock by location for FIFO logic (simplified - just shows total by location)
  const stockByLocation = locations
    .map(loc => ({
      location: loc,
      quantity: 0 // In a real app, we'd track this per location
    }))
    .filter(loc => loc.location === product.location || product.location === '')
    .reduce((acc, loc) => {
      acc[loc.location] = (acc[loc.location] || 0) + product.quantity;
      return acc;
    }, {} as Record<string, number>);

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
          <Link
            to={`/products/${product.id}/qr`}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <QrCode className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {transactionType === 'purchase' && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Purchase Stock</h2>
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Package className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
                <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                <p className="text-sm text-slate-500">Category: {product.category || 'Not assigned'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
              <select
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                className="select w-full"
                required
              >
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>
                    {loc || 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity to Add</label>
              <input
                type="number"
                min={1}
                value={purchaseQty}
                onChange={(e) => setPurchaseQty(Math.max(1, Number(e.target.value)))}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
              <input
                type="text"
                placeholder="e.g., Received from supplier"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setTransactionType(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {transactionType === 'sale' && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Sale Stock</h2>
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Package className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                {product.name}
                <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                <p className="text-sm text-slate-500">Category: {product.category || 'Not assigned'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
              <select
                value={saleLocation}
                onChange={(e) => setSaleLocation(e.target.value)}
                className="select w-full"
                required
              >
                <option value="">Select location</option>
                {locations.map(loc => {
                  const qtyInLoc = stockByLocation[loc] || 0;
                  return (
                    <option key={loc} value={loc} disabled={qtyInLoc <= 0}>
                      {loc || 'Unassigned'} {qtyInLoc > 0 ? `(${qtyInLoc} available)` : '(Out of stock)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity to Remove</label>
              <input
                type="number"
                min={1}
                max={product.quantity}
                value={saleQty}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setSaleQty(Math.min(val, product.quantity));
                }}
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
              <input
                type="text"
                placeholder="e.g., Sold to customer"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setTransactionType(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSale}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {!transactionType && (
        <>
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
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAdjust(true)}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Adjust stock
                </button>
                <button
                  onClick={() => setTransactionType('purchase')}
                  className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  Purchase
                </button>
                <button
                  onClick={() => setTransactionType('sale')}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Sale
                </button>
                <button
                  onClick={() => navigate(`/products/${product.id}/qr`)}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  QR Code
                </button>
              </div>
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
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slice-100"
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
        </>
      )}

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