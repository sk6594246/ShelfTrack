import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Printer, Search, Trash2, X } from 'lucide-react';
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
import { toast } from '../../components/ui/Toast';

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
  const [query, setQuery] = useState('');

  const reload = useCallback(() => {
    setList(getLocations());
    getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.code || '').toLowerCase().includes(q)
    );
  }, [list, query]);

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
      toast(editing ? 'Location updated' : 'Location created', 'success');
      closeForm();
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this location and its product assignments?')) return;
    deleteLocation(id);
    toast('Location deleted', 'info');
    closeForm();
    reload();
  }

  function toggleProduct(pid: string, checked: boolean) {
    if (!pid) return;
    setAssignedIds((prev) => {
      const set = new Set(prev.filter(Boolean));
      if (checked) set.add(pid);
      else set.delete(pid);
      return Array.from(set);
    });
  }

  const formOpen = creating || !!editing;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Locations{' '}
            <span className="font-normal text-slate-400">({list.length})</span>
          </h2>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
            {list.length === 0 ? 'No locations yet' : 'No matches'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((loc) => {
              const count = getProductsForLocation(loc.id).length;
              return (
                <li key={loc.id}>
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition ${
                      editing?.id === loc.id
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(loc)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-1 py-1 text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {loc.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {loc.code ? `${loc.code} · ` : ''}
                          {count} product{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintLoc(loc)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                      title="Print QR"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="lg:col-span-3">
        {formOpen ? (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm st-enter"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? 'Edit location' : 'New location'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error ? (
              <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Name *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. A1"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <div>
                <span className="text-xs font-semibold text-slate-500">
                  Storable products
                </span>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {products.length === 0 ? (
                    <p className="p-2 text-xs text-slate-400">No products yet</p>
                  ) : (
                    products
                      .filter((p) => !!p.id)
                      .map((p) => {
                        const inputId = `loc-assign-${p.id}`;
                        const isChecked = assignedIds.includes(p.id);
                        return (
                          <div
                            key={`${p.id}::${p.sku || p.name}`}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                          >
                            <input
                              id={inputId}
                              name={inputId}
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleProduct(p.id, e.target.checked);
                              }}
                              className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label
                              htmlFor={inputId}
                              className="min-w-0 flex-1 cursor-pointer truncate"
                            >
                              {p.name}{' '}
                              <span className="text-xs text-slate-400">({p.sku})</span>
                            </label>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Save
              </button>
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintLoc(editing)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" /> Print QR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(editing.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
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
