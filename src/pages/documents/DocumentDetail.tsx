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
import { getPartners, getLocationById, getLocations } from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import {
  getAssignedLocationsForProduct,
  getFifoLocationsForProduct,
} from '../../store/stockBatchStore';
import type {
  InventoryDocument,
  DocumentLine,
  Product,
  BusinessPartner,
  Location,
} from '../../types/inventory';

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
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

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
    setAllLocations(getLocations());
  }, [reload]);

  const partnerOptions = useMemo(() => {
    if (!doc || doc.type === 'transfer') return [];
    const role = doc.type === 'purchase' ? 'supplier' : 'customer';
    return partners.filter((p) => p.roles.includes(role));
  }, [doc, partners]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const locationOptions = useMemo(() => {
    if (!productId || !doc || doc.type === 'transfer') return [];
    if (doc.type === 'purchase') {
      return getAssignedLocationsForProduct(productId).map((loc) => ({
        id: loc.id,
        label: loc.code ? `${loc.name} (${loc.code})` : loc.name,
      }));
    }
    return getFifoLocationsForProduct(productId).map((row) => ({
      id: row.location.id,
      label: `${row.location.name} — ${row.available} avail (FIFO)`,
    }));
  }, [productId, doc]);

  const fromLocationOptions = useMemo(() => {
    if (!productId || !doc || doc.type !== 'transfer') return [];
    return getFifoLocationsForProduct(productId).map((row) => ({
      id: row.location.id,
      label: `${row.location.name} — ${row.available} avail`,
    }));
  }, [productId, doc]);

  const toLocationOptions = useMemo(() => {
    if (!productId || !doc || doc.type !== 'transfer') return [];
    const assigned = getAssignedLocationsForProduct(productId);
    const pool = assigned.length > 0 ? assigned : allLocations;
    return pool
      .filter((l) => l.id !== fromLocationId)
      .map((loc) => ({
        id: loc.id,
        label: loc.code ? `${loc.name} (${loc.code})` : loc.name,
      }));
  }, [productId, doc, allLocations, fromLocationId]);

  useEffect(() => {
    setLocationId('');
    setFromLocationId('');
    setToLocationId('');
  }, [productId, doc?.type]);

  if (!doc) {
    return (
      <div className={'p-8 text-center'}>
        <p className={'text-slate-600'}>Document not found</p>
        <Link to="/documents" className={'mt-2 text-indigo-600 hover:underline'}>
          Back to documents
        </Link>
      </div>
    );
  }

  const isPosted = doc.status === 'posted';
  const isReversed = doc.status === 'reversed';
  const isDraft = doc.status === 'draft';
  const isPurchase = doc.type === 'purchase';
  const isTransfer = doc.type === 'transfer';
  const canReverse =
    isPosted && !doc.reversedByDocumentId && !doc.reversesDocumentId;

  function handlePartner(partnerId: string) {
    if (!isDraft || !doc) return;
    updateDocument(doc.id, { partnerId: partnerId || undefined });
    reload();
  }

  function handleNotesBlur(value: string) {
    if (!isDraft || !doc) return;
    updateDocument(doc.id, { notes: value.trim() || undefined });
    reload();
  }

  function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || !isDraft) return;
    setError(null);
    try {
      if (!productId) throw new Error('Select a product');
      if (isTransfer) {
        addLine(doc.id, {
          productId,
          quantity: qty,
          fromLocationId,
          toLocationId,
          notes: notes || undefined,
        });
      } else {
        addLine(doc.id, {
          productId,
          quantity: qty,
          locationId,
          notes: notes || undefined,
        });
      }
      setProductId('');
      setLocationId('');
      setFromLocationId('');
      setToLocationId('');
      setQty(1);
      setNotes('');
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add line');
    }
  }

  function handleRemoveLine(lineId: string) {
    if (!isDraft) return;
    try {
      removeLine(lineId);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove line');
    }
  }

  async function handlePost() {
    if (!doc || !isDraft) return;
    setError(null);
    setBusy(true);
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
    if (!doc || !canReverse) return;
    if (
      !window.confirm(
        'Reverse this document? Stock will be offset. This cannot be undone.'
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await reverseDocument(doc.id);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reverse failed');
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!doc || !isDraft) return;
    if (!window.confirm('Delete this draft document?')) return;
    try {
      deleteDocument(doc.id);
      navigate('/documents', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const title = isTransfer ? 'Transfer' : isPurchase ? 'Purchase' : 'Sale';

  return (
    <div className={'mx-auto w-full max-w-2xl p-4 md:p-6'}>
      <header className={'mb-6 flex items-center justify-between print:hidden'}>
        <button type="button" onClick={() => navigate('/documents')} className={'rounded-lg p-2 text-slate-500 hover:bg-slate-100'}>
          <ArrowLeft className={'h-5 w-5'} />
        </button>
        <div className={'flex gap-2'}>
          <button type="button" onClick={() => window.print()} className={'rounded-lg p-2 text-slate-500 hover:bg-slate-100'} title="Print">
            <Printer className={'h-5 w-5'} />
          </button>
          {canReverse && (
            <button type="button" onClick={handleReverse} disabled={busy} className={'rounded-lg p-2 text-amber-600 hover:bg-amber-50'} title="Reverse document">
              <Undo2 className={'h-5 w-5'} />
            </button>
          )}
          {isDraft && (
            <button type="button" onClick={handleDelete} className={'rounded-lg p-2 text-rose-500 hover:bg-rose-50'} title="Delete draft">
              <Trash2 className={'h-5 w-5'} />
            </button>
          )}
        </div>
      </header>

      <div className={'print-doc rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'}>
        <div className={'flex flex-wrap items-start justify-between gap-3'}>
          <div>
            <p className={'text-[10px] font-bold uppercase tracking-widest text-slate-400'}>ShelfTrack</p>
            <h1 className={'text-xl font-bold text-slate-900'}>
              {title} document
            </h1>
            <p className={'font-mono text-xs text-slate-400'}>
              {doc.id}
            </p>
            {doc.reversesDocumentId && (
              <p className={'mt-1 text-xs text-slate-500'}>
                Reverses{' '}
                <Link className={'text-indigo-600 underline'} to={`/documents/${doc.reversesDocumentId}`}>
                  {doc.reversesDocumentId.slice(0, 8)}
                </Link>
              </p>
            )}
            {doc.reversedByDocumentId && (
              <p className={'mt-1 text-xs text-slate-500'}>
                Reversed by{' '}
                <Link className={'text-indigo-600 underline'} to={`/documents/${doc.reversedByDocumentId}`}>
                  {doc.reversedByDocumentId.slice(0, 8)}
                </Link>
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              isPosted
                ? 'bg-emerald-100 text-emerald-700'
                : isReversed
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-amber-100 text-amber-700'
            }`}
          >
            {doc.status}
          </span>
        </div>

        <dl className={'mt-4 grid gap-2 text-sm sm:grid-cols-2'}>
          <div>
            <dt className={'text-xs text-slate-400'}>Created</dt>
            <dd className={'font-medium text-slate-800'}>
              {new Date(doc.createdAt).toLocaleString()}
            </dd>
          </div>
          {doc.postedAt && (
            <div>
              <dt className={'text-xs text-slate-400'}>Posted</dt>
              <dd className={'font-medium text-slate-800'}>
                {new Date(doc.postedAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>

        {!isTransfer && (
          <div className={'mt-4 print:hidden'}>
            <label className={'block text-xs font-semibold text-slate-500'}>
              {isPurchase ? 'Supplier' : 'Customer'} *
            </label>
            <select
              value={doc.partnerId || ''}
              onChange={(e) => handlePartner(e.target.value)}
              disabled={!isDraft}
              className={'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50'}
            >
              <option value="">Select partner…</option>
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={'mt-3 print:hidden'}>
          <label className={'block text-xs font-semibold text-slate-500'}>Notes</label>
          <textarea
            defaultValue={doc.notes || ''}
            onBlur={(e) => handleNotesBlur(e.target.value)}
            disabled={!isDraft}
            rows={2}
            className={'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50'}
          />
        </div>

        <h2 className={'mt-6 text-sm font-semibold text-slate-700'}>Line items</h2>
        <div className={'mt-2 overflow-x-auto'}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-slate-100 text-xs uppercase text-slate-400'}>
                <th className={'py-2 pr-2 font-semibold'}>Product</th>
                <th className={'py-2 pr-2 font-semibold'}>
                  {isTransfer ? 'From → To' : 'Location'}
                </th>
                <th className={'py-2 pr-2 text-right font-semibold'}>Qty</th>
                {isDraft && <th className={'py-2 print:hidden'} />}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className={'py-4 text-center text-slate-400'}>No lines yet</td>
                </tr>
              ) : (
                lines.map((line) => {
                  const p = productMap.get(line.productId);
                  const loc = line.locationId ? getLocationById(line.locationId) : undefined;
                  const from = line.fromLocationId ? getLocationById(line.fromLocationId) : undefined;
                  const to = line.toLocationId ? getLocationById(line.toLocationId) : undefined;
                  return (
                    <tr key={line.id} className={'border-b border-slate-50'}>
                      <td className={'py-2.5 pr-2 font-medium text-slate-900'}>
                        {p?.name || 'Unknown'}
                      </td>
                      <td className={'py-2.5 pr-2 text-slate-600'}>
                        {isTransfer ? `${from?.name || '?'} → ${to?.name || '?'}` : loc?.name || '—'}
                      </td>
                      <td className={'py-2.5 pr-2 text-right font-semibold text-slate-800'}>
                        {line.quantity}
                      </td>
                      {isDraft && (
                        <td className={'py-2.5 text-right print:hidden'}>
                          <button type="button" onClick={() => handleRemoveLine(line.id)} className={'rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600'}>
                            <Trash2 className={'h-4 w-4'} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {isDraft && (
          <form onSubmit={handleAddLine} className={'mt-4 space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 print:hidden'}>
            <p className={'text-xs font-semibold text-slate-500'}>Add line</p>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'}>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock {p.quantity}</option>
              ))}
            </select>

            {isTransfer ? (
              <>
                <select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} disabled={!productId} className={'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100'}>
                  <option value="">From location (FIFO)…</option>
                  {fromLocationOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} disabled={!productId} className={'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100'}>
                  <option value="">To location…</option>
                  {toLocationOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                {productId && fromLocationOptions.length === 0 && (
                  <p className={'text-xs text-amber-600'}>No stock at any location. Post a purchase first.</p>
                )}
              </>
            ) : (
              <>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!productId} className={'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100'}>
                  <option value="">
                    {!productId ? 'Select product first…' : isPurchase ? 'Put-away location…' : 'Pick location (FIFO)…'}
                  </option>
                  {locationOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                {productId && locationOptions.length === 0 && (
                  <p className={'text-xs text-amber-600'}>
                    {isPurchase ? (
                      <>No locations assigned. <Link to="/masters" className={'underline'}>Masters → Locations</Link></>
                    ) : (
                      <>No FIFO stock yet. Post a purchase first.</>
                    )}
                  </p>
                )}
              </>
            )}

            <div className={'flex gap-2'}>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className={'w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'} />
              <input type="text" placeholder="Line note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'} />
              <button type="submit" className={'inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700'}>
                <Plus className={'h-4 w-4'} /> Add
              </button>
            </div>
          </form>
        )}

        {error ? (
          <div className={'mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 print:hidden'}>
            {error}
          </div>
        ) : null}

        {isDraft && (
          <button type="button" onClick={handlePost} disabled={busy} className={'mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 print:hidden'}>
            <CheckCircle2 className={'h-4 w-4'} />
            {busy ? 'Posting…' : 'Post document'}
          </button>
        )}

        {canReverse && (
          <button type="button" onClick={handleReverse} disabled={busy} className={'mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 print:hidden'}>
            <Undo2 className={'h-4 w-4'} />
            {busy ? 'Reversing…' : 'Reverse document'}
          </button>
        )}
      </div>
    </div>
  );
}
