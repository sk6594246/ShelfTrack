import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Package, MapPin } from 'lucide-react';
import { getDocumentById, getLines, postDocument } from '../store/documentsStore';
import { getLocationById } from '../store/mastersStore';
import { getProducts } from '../store/inventoryStore';
import type { DocumentLine, InventoryDocument, Product } from '../types/inventory';
import { UNLOCATED_LOCATION_ID } from '../types/inventory';
import { toast } from '../components/ui/Toast';

type PickRow = {
  line: DocumentLine;
  product?: Product;
  locationLabel: string;
  sortKey: string;
  gridLabel: string;
};

export function PickList() {
  const [params] = useSearchParams();
  const docId = params.get('doc') || '';
  const navigate = useNavigate();
  const [doc, setDoc] = useState<InventoryDocument | null>(null);
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    setDoc(getDocumentById(docId) ?? null);
    setLines(getLines(docId));
    getProducts().then(setProducts);
  }, [docId]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const rows: PickRow[] = useMemo(() => {
    return lines
      .map((line) => {
        const locId =
          line.locationId ||
          (line.fromLocationId !== UNLOCATED_LOCATION_ID
            ? line.fromLocationId
            : undefined);
        const loc = locId ? getLocationById(locId) : undefined;
        const row = loc?.gridRow ?? 999;
        const col = loc?.gridCol ?? 999;
        const shelf = loc?.shelf ?? 1;
        return {
          line,
          product: productMap.get(line.productId),
          locationLabel: loc
            ? `${loc.name}${loc.code ? ` (${loc.code})` : ''}`
            : line.fromLocationId === UNLOCATED_LOCATION_ID
              ? 'No location'
              : '—',
          gridLabel:
            loc?.gridRow != null && loc?.gridCol != null
              ? `R${loc.gridRow}C${loc.gridCol}${loc.shelf ? `·S${loc.shelf}` : ''}`
              : 'off-grid',
          sortKey: `${String(row).padStart(3, '0')}-${String(col).padStart(3, '0')}-${String(shelf).padStart(2, '0')}`,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [lines, productMap]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePost() {
    if (!doc || doc.status !== 'draft') return;
    setBusy(true);
    setError(null);
    try {
      await postDocument(doc.id);
      toast('Document posted', 'success');
      setDoc(getDocumentById(doc.id) ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Post failed');
    } finally {
      setBusy(false);
    }
  }

  if (!docId) {
    return (
      <div className="p-8 text-center text-slate-600">
        <p>Open pick list from a sale or transfer document.</p>
        <Link to="/documents" className="mt-2 inline-block text-indigo-600 underline">
          Documents
        </Link>
      </div>
    );
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

  const allPicked = rows.length > 0 && rows.every((r) => done.has(r.line.id));

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <button
        type="button"
        onClick={() => navigate(`/documents/${doc.id}`)}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Document
      </button>

      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
          Warehouse pick
        </p>
        <h1 className="text-2xl font-bold capitalize text-slate-900">
          {doc.type} · walk path
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ordered by grid row → col → shelf (map walk order)
        </p>
        <p className="mt-1 font-mono text-[11px] text-slate-400">{doc.id.slice(0, 8)}…</p>
      </header>

      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>
          {done.size}/{rows.length} picked
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase">{doc.status}</span>
      </div>

      <ul className="space-y-2">
        {rows.map((r, i) => {
          const checked = done.has(r.line.id);
          return (
            <li key={r.line.id}>
              <button
                type="button"
                onClick={() => toggle(r.line.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  checked
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    checked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {checked ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-slate-900 ${checked ? 'line-through opacity-60' : ''}`}>
                    {r.product?.name || 'Product'}
                  </p>
                  <p className="text-xs text-slate-400">{r.product?.sku}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700">
                      <MapPin className="h-3 w-3" />
                      {r.gridLabel}
                    </span>
                    <span className="text-slate-600">{r.locationLabel}</span>
                    <span className="st-num font-bold text-slate-900">× {r.line.quantity}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No lines on this document
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      {doc.status === 'draft' && (
        <button
          type="button"
          onClick={handlePost}
          disabled={busy || rows.length === 0}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white ${
            allPicked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'
          } disabled:opacity-50`}
        >
          <Package className="h-4 w-4" />
          {busy ? 'Posting…' : allPicked ? 'All picked — Post document' : 'Post document'}
        </button>
      )}
    </div>
  );
}
