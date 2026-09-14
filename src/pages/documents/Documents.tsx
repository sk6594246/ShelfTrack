import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, FileText, Plus, ShoppingCart, Truck } from 'lucide-react';
import {
  createDocument,
  getDocuments,
} from '../../store/documentsStore';
import { getPartnerById } from '../../store/mastersStore';
import type { DocumentType, InventoryDocument } from '../../types/inventory';

type Filter = 'all' | DocumentType;

export function Documents() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [tick, setTick] = useState(0);

  const docs = useMemo(() => {
    void tick;
    const all = getDocuments();
    if (filter === 'all') return all;
    return all.filter((d) => d.type === filter);
  }, [filter, tick]);

  function handleCreate(type: DocumentType) {
    const doc = createDocument(type);
    setTick((t) => t + 1);
    navigate(`/documents/${doc.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Documents
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Purchase, sales, and location transfers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCreate('purchase')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Truck className="h-4 w-4" />
            Purchase
          </button>
          <button
            type="button"
            onClick={() => handleCreate('sale')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Sale
          </button>
          <button
            type="button"
            onClick={() => handleCreate('transfer')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </button>
        </div>
      </header>

      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(
          [
            { id: 'all' as const, label: 'All' },
            { id: 'purchase' as const, label: 'Purchase' },
            { id: 'sale' as const, label: 'Sales' },
            { id: 'transfer' as const, label: 'Transfer' },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
              filter === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No documents yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Create a purchase, sale, or transfer
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => handleCreate('purchase')}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
            >
              <Plus className="h-4 w-4" /> Purchase
            </button>
            <button
              type="button"
              onClick={() => handleCreate('sale')}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"
            >
              <Plus className="h-4 w-4" /> Sale
            </button>
            <button
              type="button"
              onClick={() => handleCreate('transfer')}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
            >
              <Plus className="h-4 w-4" /> Transfer
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({ doc }: { doc: InventoryDocument }) {
  const partner = doc.partnerId ? getPartnerById(doc.partnerId) : undefined;
  const isPurchase = doc.type === 'purchase';
  const isTransfer = doc.type === 'transfer';

  const iconBg = isTransfer
    ? 'bg-amber-50 text-amber-600'
    : isPurchase
      ? 'bg-emerald-50 text-emerald-600'
      : 'bg-indigo-50 text-indigo-600';

  const title = isTransfer ? 'Transfer' : isPurchase ? 'Purchase' : 'Sale';

  return (
    <li>
      <Link
        to={`/documents/${doc.id}`}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-200 hover:shadow"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          {isTransfer ? (
            <ArrowLeftRight className="h-5 w-5" />
          ) : isPurchase ? (
            <Truck className="h-5 w-5" />
          ) : (
            <ShoppingCart className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{title}</span>
            <StatusChip status={doc.status} />
            {doc.reversesDocumentId && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                Reversal
              </span>
            )}
          </div>
          <p className="truncate text-sm text-slate-500">
            {isTransfer
              ? 'Location move'
              : partner?.name || 'No partner'}{' '}
            · {new Date(doc.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="font-mono text-[10px] text-slate-300">
          {doc.id.slice(0, 8)}
        </span>
      </Link>
    </li>
  );
}

function StatusChip({ status }: { status: string }) {
  const styles =
    status === 'posted'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'reversed'
        ? 'bg-slate-200 text-slate-600'
        : 'bg-amber-100 text-amber-700';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}
    >
      {status}
    </span>
  );
}
