import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  getDocumentById,
  getLines,
  updateDocument,
  addLine,
  removeLine,
  postDocument,
  deleteDocument,
} from '../../store/documentsStore';
import { getPartners } from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import type {
  InventoryDocument,
  DocumentLine,
  Product,
  BusinessPartner,
} from '../../types/inventory';

export function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<InventoryDocument | null>(null);
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState('');
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
  }, [reload]);

  const partnerOptions = useMemo(() => {
    if (!doc) return [];
    const role = doc.type === 'purchase' ? 'supplier' : 'customer';
    return partners.filter((p) => p.roles.includes(role));
  }, [doc, partners]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  if (!doc) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Document not found</p>
        <Link to="/documents" className="mt-2 text-indigo-600 hover:underline">
          Back to documents
        </Link>
      </div>
    );
  }

  const isPosted = doc.status === 'posted';
  const isPurchase = doc.type === 'purchase';

  function handlePartner(partnerId: string) {
    if (isPosted || !doc) return;
    updateDocument(doc.id, { partnerId: partnerId || undefined });
    reload();
  }

  function handleNotesBlur(value: string) {
    if (isPosted || !doc) return;
    updateDocument(doc.id, { notes: value.trim() || undefined });
    reload();
  }

  function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || isPosted) return;
    setError(null);
    try {
      if (!productId) throw new Error('Select a product');
      addLine(doc.id, productId, qty, notes || undefined);
      setProductId('');
      setQty(1);
      setNotes('');
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add line');
    }
  }

  function handleRemoveLine(lineId: string) {
    if (isPosted) return;
    try {
      removeLine(lineId);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove line');
    }
  }

  async function handlePost() {
    if (!doc || isPosted) return;
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

  function handleDelete() {
    if (!doc || isPosted) return;
    if (!window.confirm('Delete this draft document?')) return;
    try {
      deleteDocument(doc.id);
      navigate('/documents', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between print:hidden">
        <button type="button" onClick={() => navigate('/documents')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={handlePrint} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Print">
            <Printer className="h-5 w-5" />
          </button>
          {!isPosted && (
            <button type="button" onClick={handleDelete} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Delete draft">
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <div className="print-doc rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ShelfTrack</p>
            <h1 className="text-xl font-bold text-slate-900">
              {isPurchase ? 'Purchase' : 'Sale'} document
            </h1>
            <p className={'font-mono text-xs text-slate-400'}>{doc.id}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              isPosted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {doc.status}
          </span>
        </div>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">Created</dt>
            <dd className={'font-medium text-slate-800'}>
              {new Date(doc.createdAt).toLocaleString()}
            </dd>
          </div>
          {doc.postedAt && (
            <div>
              <dt className="text-xs text-slate-400">Posted</dt>
              <dd className={'font-medium text-slate-800'}>
                {new Date(doc.postedAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-4 print:hidden">
          <label className="block text-xs font-semibold text-slate-500">
            {isPurchase ? 'Supplier' : 'Customer'} *
          </label>
          <select
            value={doc.partnerId || ''}
            onChange={(e) => handlePartner(e.target.value)}
            disabled={isPosted}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          >
            <option value="">Select partner…</option>
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {partnerOptions.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No {isPurchase ? 'suppliers' : 'customers'} in Masters yet.{' '}
              <Link to="/masters" className="underline">Add partner</Link>
            </p>
          )}
        </div>

        <div className="mt-4 hidden print:block">
          <p className="text-xs text-slate-400">
            {isPurchase ? 'Supplier' : 'Customer'}
          </p>
          <p className="font-medium text-slate-900">
            {partners.find((p) => p.id === doc.partnerId)?.name || '—'}
          </p>
        </div>

        <div className="mt-3 print:hidden">
          <label className="block text-xs font-semibold text-slate-500">Notes</label>
          <textarea
            defaultValue={doc.notes || ''}
            onBlur={(e) => handleNotesBlur(e.target.value)}
            disabled={isPosted}
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>
        {doc.notes ? (
          <p className="mt-3 hidden text-sm text-slate-600 print:block">
            {doc.notes}
          </p>
        ) : null}

        <h2 className="mt-6 text-sm font-semibold text-slate-700">Line items</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <th className="py-2 pr-2 font-semibold">Product</th>
                <th className="py-2 pr-2 font-semibold">SKU</th>
                <th className="py-2 pr-2 text-right font-semibold">Qty</th>
                {!isPosted && <th className="py-2 print:hidden" />}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">No lines yet</td>
                </tr>
              ) : (
                lines.map((line) => {
                  const p = productMap.get(line.productId);
                  return (
                    <tr key={line.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-2 font-medium text-slate-900">
                        {p?.name || 'Unknown'}
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-xs text-slate-500">
                        {p?.sku || '—'}
                      </td>
                      <td className="py-2.5 pr-2 text-right font-semibold text-slate-800">
                        {line.quantity}
                      </td>
                      {!isPosted && (
                        <td className="py-2.5 text-right print:hidden">
                          <button type="button" onClick={() => handleRemoveLine(line.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
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

        {!isPosted && (
          <form onSubmit={handleAddLine} className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 print:hidden">
            <p className="text-xs font-semibold text-slate-500">Add line</p>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — stock {p.quantity}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Line note (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </form>
        )}

        {error ? (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 print:hidden">
            {error}
          </div>
        ) : null}

        {!isPosted && (
          <button
            type="button"
            onClick={handlePost}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 print:hidden"
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy ? 'Posting…' : 'Post document'}
          </button>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-doc, .print-doc * { visibility: visible !important; }
          .print-doc {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
