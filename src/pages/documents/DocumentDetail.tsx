import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
  Undo2,
} from 'lucide-react';
import {
  getDocumentById,
  getLines,
  updateDocument,
  addLine,
  removeLine,
  postDocument,
  deleteDocument,
  reverseDocument,
} from '../../store/documentsStore';
import {
  getPartners,
  getLocationById,
  getLocations,
  getProductsForPartner,
} from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import {
  getAssignedLocationsForProduct,
  getFifoLocationsForProduct,
  getFefoLocationsForProduct,
} from '../../store/stockBatchStore';
import type {
  InventoryDocument,
  DocumentLine,
  Product,
  BusinessPartner,
  Location,
} from '../../types/inventory';
import { UNLOCATED_LOCATION_ID } from '../../types/inventory';

export function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<InventoryDocument | null>(null);
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const reload = useCallback(() => {
    if (!id) return;
    const d = getDocumentById(id);
    setDoc(d ?? null);
    setLines(d ? getLines(d.id) : []);
  }, [id]);

  useEffect(() => {
    reload();
    getProducts().then(setProducts);
    setPartners(getPartners());
    void getLocations()
      .then(setAllLocations)
      .catch(() => setAllLocations([]));
  }, [reload]);

  const isDraft = doc?.status === 'draft';

  const partnerOptions = useMemo(() => {
    if (!doc || doc.type === 'transfer') return [];
    const role = doc.type === 'purchase' ? 'supplier' : 'customer';
    return partners.filter((p) => p.roles.includes(role));
  }, [doc, partners]);

  const productOptions = useMemo(() => {
    if (!doc) return products;
    if (doc.partnerId) {
      const linked = getProductsForPartner(doc.partnerId).map((pp) => pp.productId);
      if (linked.length) {
        return products.filter((p) => linked.includes(p.id));
      }
    }
    return products;
  }, [doc, products]);

  const locationOptions = useMemo((): Location[] => {
    if (!doc || !productId) return [];
    if (doc.type === 'purchase') {
      return getAssignedLocationsForProduct(productId);
    }
    if (doc.type === 'sale') {
      const fefo = getFefoLocationsForProduct(productId);
      if (fefo.length) return fefo.map((r) => r.location);
      return getFifoLocationsForProduct(productId).map((r) => r.location);
    }
    return allLocations;
  }, [doc, productId, allLocations]);

  async function handlePost() {
    if (!doc || !isDraft) return;
    setBusy(true);
    setError(null);
    try {
      await postDocument(doc.id);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Post failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReverse() {
    if (!doc || doc.status !== 'posted') return;
    if (!window.confirm('Reverse this document?')) return;
    setBusy(true);
    setError(null);
    try {
      await reverseDocument(doc.id);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reverse failed');
    } finally {
      setBusy(false);
    }
  }

  function handleAddLine(e: { preventDefault: () => void }) {
    e.preventDefault();
    const qtyNum = Number(qty);
    if (!doc || !isDraft || !productId || !Number.isFinite(qtyNum) || qtyNum < 1) return;
    setError(null);
    try {
      if (doc.type === 'transfer') {
        addLine(doc.id, {
          productId,
          quantity: qtyNum,
          fromLocationId: fromLocationId || UNLOCATED_LOCATION_ID,
          toLocationId: toLocationId || undefined,
          notes: notes || undefined,
        });
      } else {
        addLine(doc.id, {
          productId,
          quantity: qtyNum,
          locationId: locationId || undefined,
          notes: notes || undefined,
          purchaseDate: purchaseDate || undefined,
          mfgDate: mfgDate || undefined,
          expiryDate: expiryDate || undefined,
        });
      }
      setProductId('');
      setLocationId('');
      setFromLocationId('');
      setToLocationId('');
      setQty('1');
      setNotes('');
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add line');
    }
  }

  if (!doc) {
    return (
      <div className="p-8 text-center text-slate-600">
        Document not found.{' '}
        <Link to="/documents" className="text-indigo-600 underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <button
        type="button"
        onClick={() => navigate('/documents')}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" /> Documents
      </button>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">{doc.type}</p>
          <h1 className="text-2xl font-bold capitalize text-slate-900">{doc.type} document</h1>
          <p className="mt-1 font-mono text-[11px] text-slate-400">{doc.id}</p>
          <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
            {doc.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.status === 'posted' && (
            <button type="button" onClick={handleReverse} disabled={busy} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              <Undo2 className="h-3.5 w-3.5" /> Reverse
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          {isDraft && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete draft?')) {
                  deleteDocument(doc.id);
                  navigate('/documents');
                }
              }}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        {doc.type !== 'transfer' && isDraft && (
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              {doc.type === 'purchase' ? 'Supplier' : 'Customer'}
            </span>
            <select
              value={doc.partnerId || ''}
              onChange={(e) => {
                updateDocument(doc.id, { partnerId: e.target.value || undefined });
                reload();
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— Select —</option>
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Lines ({lines.length})</h2>
          {lines.length === 0 ? (
            <p className="text-sm text-slate-400">No lines yet</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lines.map((line) => {
                const prod = products.find((p) => p.id === line.productId);
                const loc = line.locationId
                  ? getLocationById(line.locationId)
                  : line.fromLocationId
                    ? getLocationById(line.fromLocationId)
                    : undefined;
                return (
                  <li key={line.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{prod?.name || line.productId}</p>
                      <p className="text-xs text-slate-400">
                        qty {line.quantity}{loc ? ` · ${loc.name}` : ''}
                      </p>
                    </div>
                    {isDraft && (
                      <button type="button" onClick={() => { removeLine(line.id); reload(); }} className="text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isDraft && (
          <form onSubmit={handleAddLine} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Add line</p>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">Product…</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>

            {doc.type === 'transfer' ? (
              <div className="grid grid-cols-2 gap-2">
                <select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">From (no location)</option>
                  {allLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">To location…</option>
                  {allLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                <option value="">Location…</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>
                ))}
              </select>
            )}

            {doc.type === 'purchase' && (
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input type="date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Qty</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={qty}
                    onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    placeholder="1"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Note</span>
                  <input type="text" placeholder="Line note" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
                </label>
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" /> Add line
              </button>
            </div>
          </form>
        )}

        {isDraft && error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        {isDraft && (doc.type === 'sale' || doc.type === 'transfer') && lines.length > 0 && (
          <Link to={`/pick?doc=${doc.id}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
            Open pick list (walk path)
          </Link>
        )}

        {isDraft && (
          <div className="st-safe-bottom sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 py-3 backdrop-blur">
            <button type="button" onClick={handlePost} disabled={busy || lines.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60">
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Posting…' : 'Post document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
