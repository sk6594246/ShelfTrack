import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Printer, Trash2, X } from 'lucide-react';
import type { Location, Product } from '../../types/inventory';
import {
  getLocations,
  saveLocation,
  deleteLocation,
  getProductsForLocation,
  setProductsForLocation,
} from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import { QRPrintModal } from '../../components/qr/QRPrintModal';
import { buildLocationQRPayload, payloadToJson } from '../../lib/qrPayload';

export function LocationsPanel() {
  const [list, setList] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Location | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [printLoc, setPrintLoc] = useState<Location | null>(null);

  const reload = useCallback(() => {
    setList(getLocations());
    getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setName('');
    setCode('');
    setNotes('');
    setAssignedIds([]);
    setError(null);
  }

  function openEdit(loc: Location) {
    setEditing(loc);
    setCreating(false);
    setName(loc.name);
    setCode(loc.code || '');
    setNotes(loc.notes || '');
    setAssignedIds(getProductsForLocation(loc.id));
    setError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      const saved = saveLocation({
        id: editing?.id,
        name,
        code: code || undefined,
        notes: notes || undefined,
      });
      setProductsForLocation(saved.id, assignedIds);
      closeForm();
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this location and its product assignments?')) return;
    deleteLocation(id);
    closeForm();
    reload();
  }

  function toggleProduct(pid: string) {
    setAssignedIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  }

  const formOpen = creating || !!editing;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {list.length} location{list.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No locations yet
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((loc) => {
              const count = getProductsForLocation(loc.id).length;
              return (
                <li key={loc.id}>
                  <button
                    onClick={() => openEdit(loc)}
                    className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3 text-left shadow-sm transition hover:border-indigo-200 ${
                      editing?.id === loc.id
                        ? 'border-indigo-400 ring-2 ring-indigo-100'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={'truncate font-semibold text-slate-900'}>{loc.name}</p>
                      <p className="text-xs text-slate-500">
                        {loc.code ? `Code ${loc.code} · ` : ''}
                        {count} product{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <MapPin className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="lg:col-span-3">
        {formOpen ? (
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={'font-semibold text-slate-900'}>
                {editing ? 'Edit location' : 'New location'}
              </h2>
              <button type="button" onClick={closeForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <div className={'mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700'}>{error}</div>
            )}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Shelf A1" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Code</span>
                <input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="A1" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Notes</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <div>
                <span className="text-xs font-semibold text-slate-500">Storable products</span>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {products.length === 0 ? (
                    <p className="p-2 text-xs text-slate-400">No products yet</p>
                  ) : (
                    products.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input type="checkbox" checked={assignedIds.includes(p.id)} onChange={() => toggleProduct(p.id)} className="rounded border-slate-300 text-indigo-600" />
                        <span className="min-w-0 flex-1 truncate">
                          {p.name} <span className="text-xs text-slate-400">({p.sku})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
              {editing && (
                <>
                  <button type="button" onClick={() => setPrintLoc(editing)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Printer className="h-4 w-4" /> Print QR
                  </button>
                  <button type="button" onClick={() => handleDelete(editing.id)} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </>
              )}
            </div>
          </form>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Select a location or add a new one
          </div>
        )}
      </div>

      {printLoc && (
        <QRPrintModal
          open={!!printLoc}
          onClose={() => setPrintLoc(null)}
          payloadJson={payloadToJson(buildLocationQRPayload(printLoc))}
          title={printLoc.name}
          subtitle={printLoc.code}
          kind="Location"
        />
      )}
    </div>
  );
}
