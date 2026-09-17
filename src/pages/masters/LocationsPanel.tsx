import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import type { Location, Product } from '../../types/inventory';
import {
  getLocations,
  saveLocation,
  deleteLocation,
  getProductsForLocation,
  getLocationProductLinks,
  setProductsForLocation,
} from '../../store/mastersStore';
import { getStoreLayout, saveStoreLayout } from '../../store/layoutStore';
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
  const [gridRow, setGridRow] = useState('');
  const [gridCol, setGridCol] = useState('');
  const [shelf, setShelf] = useState('1');
  const [maxQty, setMaxQty] = useState('');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [weightageByProduct, setWeightageByProduct] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [printLoc, setPrintLoc] = useState<Location | null>(null);
  const [query, setQuery] = useState('');
  const [layoutRows, setLayoutRows] = useState(() => getStoreLayout().rows);
  const [layoutCols, setLayoutCols] = useState(() => getStoreLayout().cols);

  const reload = useCallback(async () => {
    try {
      const locs = await getLocations();
      setList(locs);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load locations', 'error');
      setList([]);
    }
    getProducts().then(setProducts);
    const layout = getStoreLayout();
    setLayoutRows(layout.rows);
    setLayoutCols(layout.cols);
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
    setGridRow('');
    setGridCol('');
    setShelf('1');
    setMaxQty('');
    setAssignedIds([]);
    setWeightageByProduct({});
    setError(null);
  }

  function openEdit(loc: Location) {
    setEditing(loc);
    setCreating(false);
    setName(loc.name);
    setCode(loc.code || '');
    setNotes(loc.notes || '');
    setGridRow(loc.gridRow != null ? String(loc.gridRow) : '');
    setGridCol(loc.gridCol != null ? String(loc.gridCol) : '');
    setShelf(loc.shelf != null ? String(loc.shelf) : '1');
    setMaxQty(loc.maxQty != null ? String(loc.maxQty) : '');
    const ids = getProductsForLocation(loc.id);
    setAssignedIds(ids);
    const wMap: Record<string, number> = {};
    for (const link of getLocationProductLinks(loc.id)) {
      if (link.weightage != null && link.weightage > 0) {
        wMap[link.productId] = link.weightage;
      }
    }
    setWeightageByProduct(wMap);
    setError(null);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function handleSaveLayout() {
    const next = saveStoreLayout({
      rows: Number(layoutRows) || 5,
      cols: Number(layoutCols) || 8,
    });
    setLayoutRows(next.rows);
    setLayoutCols(next.cols);
    toast(`Layout set to ${next.rows}x${next.cols}`, 'success');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      const parseGrid = (s: string) => {
        const t = s.trim();
        if (!t) return undefined;
        const n = Number(t);
        return Number.isFinite(n) && n >= 1 ? Math.round(n) : undefined;
      };
      const nextRow = parseGrid(gridRow);
      const nextCol = parseGrid(gridCol);
      const nextShelf = parseGrid(shelf);
      const nextMax =
        maxQty.trim() && Number(maxQty) > 0 ? Number(maxQty) : undefined;
      const saved = await saveLocation({
        id: editing?.id,
        name,
        code: code || undefined,
        notes: notes || undefined,
        gridRow: nextRow,
        gridCol: nextCol,
        shelf: nextShelf,
        maxQty: nextMax,
      });
      await setProductsForLocation(saved.id, assignedIds, weightageByProduct);
      const cell =
        saved.gridRow != null && saved.gridCol != null
          ? `R${saved.gridRow}C${saved.gridCol}`
          : 'off-grid';
      toast(
        editing
          ? `Location updated · ${cell}${saved.shelf ? ` · S${saved.shelf}` : ''}`
          : `Location created · ${cell}`,
        'success'
      );
      setEditing(saved);
      setCreating(false);
      setGridRow(saved.gridRow != null ? String(saved.gridRow) : '');
      setGridCol(saved.gridCol != null ? String(saved.gridCol) : '');
      setShelf(saved.shelf != null ? String(saved.shelf) : '1');
      setMaxQty(saved.maxQty != null ? String(saved.maxQty) : '');
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this location and its product assignments?')) return;
    try {
      await deleteLocation(id);
      toast('Location deleted', 'info');
      closeForm();
      await reload();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }

  function toggleProduct(pid: string, checked: boolean) {
    if (!pid) return;
    setAssignedIds((prev) => {
      const set = new Set(prev.filter(Boolean));
      if (checked) set.add(pid);
      else set.delete(pid);
      return Array.from(set);
    });
    if (!checked) {
      setWeightageByProduct((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
    }
  }

  function setWeightage(pid: string, value: string) {
    const n = Number(value);
    setWeightageByProduct((prev) => {
      const next = { ...prev };
      if (value.trim() === '' || !Number.isFinite(n) || n <= 0) {
        delete next[pid];
      } else {
        next[pid] = n;
      }
      return next;
    });
  }

  const formOpen = creating || !!editing;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Store layout grid
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Excel-style map size used on Stock page
          </p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          Rows
          <input
            type="number"
            min={1}
            max={20}
            value={layoutRows}
            onChange={(e) => setLayoutRows(Number(e.target.value) || 1)}
            className="mt-1 block w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Cols
          <input
            type="number"
            min={1}
            max={20}
            value={layoutCols}
            onChange={(e) => setLayoutCols(Number(e.target.value) || 1)}
            className="mt-1 block w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleSaveLayout}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Save layout
        </button>
      </div>

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
                const cell =
                  loc.gridRow != null && loc.gridCol != null
                    ? `R${loc.gridRow}C${loc.gridCol}`
                    : 'off-grid';
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
                            {cell}
                            {loc.shelf ? ` · S${loc.shelf}` : ''}
                            {loc.code ? ` · ${loc.code}` : ''}
                            {loc.maxQty != null ? ` · max ${loc.maxQty}` : ''} ·{' '}
                            {count} prod
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

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-indigo-800">
                    Map position (for Stock grid)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-500">Grid row</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={gridRow}
                        onChange={(e) => setGridRow(e.target.value)}
                        placeholder="1"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-500">Grid col</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={gridCol}
                        onChange={(e) => setGridCol(e.target.value)}
                        placeholder="1"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-500">Shelf #</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={shelf}
                        onChange={(e) => setShelf(e.target.value)}
                        placeholder="1"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Example: row 1, col 1, shelf 2 = 2nd shelf in cell R1C1. Leave row/col empty to keep off the map.
                  </p>
                  <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
                    Preview:{' '}
                    {gridRow.trim() && gridCol.trim()
                      ? `R${gridRow.trim()}C${gridCol.trim()}${
                          shelf.trim() ? ` · S${shelf.trim()}` : ''
                        }`
                      : 'off-grid (set row + col, then Save)'}
                  </p>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">
                    Max qty (location capacity)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    placeholder="Unlimited if empty"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Capacity in effective space (qty × weightage). Receive/transfer-in blocked when exceeded.
                  </p>
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
                  <span className="text-xs font-semibold text-slate-500">Storable products</span>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Weightage (w) = space multiplier. Default 1. Example: 0.5 → 50 qty uses 25 capacity.
                  </p>
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
                              {isChecked ? (
                                <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                                  <span title="Space multiplier: qty × weightage">w</span>
                                  <input
                                    type="number"
                                    min={0.01}
                                    step="any"
                                    placeholder="1"
                                    value={
                                      weightageByProduct[p.id] != null
                                        ? String(weightageByProduct[p.id])
                                        : ''
                                    }
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setWeightage(p.id, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
                                  />
                                </label>
                              ) : null}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 z-10 -mx-5 mt-5 flex flex-wrap gap-2 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save location
                </button>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editing.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
              <div>
                <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Select a location or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Build-safe QRPrintModal props: open, payloadJson, kind */}
      {printLoc ? (
        <QRPrintModal
          open={!!printLoc}
          onClose={() => setPrintLoc(null)}
          payloadJson={payloadToJson(buildLocationQRPayload(printLoc))}
          title={printLoc.name}
          subtitle={printLoc.code}
          kind="Location"
        />
      ) : null}
    </div>
  );
}
