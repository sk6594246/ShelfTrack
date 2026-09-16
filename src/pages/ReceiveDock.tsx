import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getProducts } from '../store/inventoryStore';
import { getPartners, getLocationsForProduct } from '../store/mastersStore';
import {
  createDocument,
  addLine,
  postDocument,
  updateDocument,
} from '../store/documentsStore';
import type { Product, BusinessPartner, Location } from '../types/inventory';
import { toast } from '../components/ui/Toast';

export function ReceiveDock() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [partnerId, setPartnerId] = useState('');
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [qty, setQty] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(setProducts);
    setPartners(getPartners().filter((p: BusinessPartner) => p.roles.includes('supplier')));
  }, []);

  const locations = useMemo(() => {
    if (!productId) return [] as Location[];
    return getLocationsForProduct(productId);
  }, [productId]);

  useEffect(() => {
    setLocationId('');
  }, [productId]);

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!productId) {
      setError('Select a product');
      return;
    }
    if (!locationId) {
      setError('Select put-away location');
      return;
    }
    if (qty < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    setBusy(true);
    try {
      const doc = createDocument('purchase');
      if (partnerId) updateDocument(doc.id, { partnerId });
      addLine(doc.id, {
        productId,
        quantity: qty,
        locationId,
        purchaseDate: purchaseDate || undefined,
        mfgDate: mfgDate || undefined,
        expiryDate: expiryDate || undefined,
      });
      await postDocument(doc.id);
      toast('Received & put away', 'success');
      setProductId('');
      setLocationId('');
      setQty(1);
      setExpiryDate('');
      setMfgDate('');
      getProducts().then(setProducts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Receive failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
          Warehouse
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Receiving dock
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          GR in one step: product → qty → expiry → put-away → post
        </p>
      </header>

      <form
        onSubmit={handleReceive}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {error && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Supplier (optional)</span>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="mt-1 w-full appearance-auto rounded-xl border border-slate-200 px-3 py-3 text-base"
          >
            <option value="">— None —</option>
            {partners.map((p: BusinessPartner) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Product *</span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-1 w-full appearance-auto rounded-xl border border-slate-200 px-3 py-3 text-base"
            required
          >
            <option value="">Select product…</option>
            {products.map((p: Product) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Quantity *</span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-2xl font-bold tabular-nums"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Purchase</span>
            <input 
              type="date" 
              value={purchaseDate} 
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" 
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Mfg</span>
            <input 
              type="date" 
              value={mfgDate} 
              onChange={(e) => setMfgDate(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" 
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-400">Expiry</span>
            <input 
              type="date" 
              value={expiryDate} 
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" 
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Put-away location *</span>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={!productId}
            className="mt-1 w-full appearance-auto rounded-xl border border-slate-200 px-3 py-3 text-base disabled:bg-slate-100"
            required
          >
            <option value="">{!productId ? 'Select product first…' : 'Choose bin / shelf…'}</option>
            {locations.map((loc: Location) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.code ? ` (${loc.code})` : ''}
                {loc.gridRow != null && loc.gridCol != null
                  ? ` · R${loc.gridRow}C${loc.gridCol}`
                  : ''}
              </option>
            ))}
          </select>
          {productId && locations.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Assign this product in <Link to="/masters" className="underline">Masters</Link>.
            </p>
          )}
        </label>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle2 className="h-5 w-5" />
          {busy ? 'Posting…' : 'Receive & put away'}
        </button>
      </form>

      <div className="mt-4 flex gap-2 text-sm">
        <Link to="/documents" className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-center font-medium text-slate-600 hover:bg-slate-50">
          Full documents
        </Link>
        <Link to="/stock" className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-center font-medium text-slate-600 hover:bg-slate-50">
          <span className="inline-flex items-center justify-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Stock map
          </span>
        </Link>
      </div>
    </div>
  );
}
