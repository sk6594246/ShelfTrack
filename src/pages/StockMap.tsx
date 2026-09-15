import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid3x3, MapPin, Package, Settings2 } from 'lucide-react';
import { getProducts } from '../store/inventoryStore';
import {
  getLocations,
  getProductsForLocation,
} from '../store/mastersStore';
import { getStoreLayout } from '../store/layoutStore';
import {
  getAvailableQtyAtLocation,
  getBatches,
} from '../store/stockBatchStore';
import type { Location, Product } from '../types/inventory';

function firstGrDate(productId: string, locationId: string): string | null {
  const batches = getBatches()
    .filter(
      (b) =>
        b.productId === productId &&
        b.locationId === locationId &&
        b.remaining > 0
    )
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  return batches[0]?.receivedAt ?? null;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

type CellShelf = {
  location: Location;
  qty: number;
  firstGr: string | null;
  assigned: boolean;
};

export function StockMap() {
  const layout = getStoreLayout();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProducts(), Promise.resolve(getLocations())])
      .then(([p, l]) => {
        setProducts(p);
        setLocations(l);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = products.find((p) => p.id === productId);

  const cellData = useMemo(() => {
    const map = new Map<string, CellShelf[]>();
    if (!productId) return map;

    const assignedIds = new Set(
      locations
        .filter((loc) => getProductsForLocation(loc.id).includes(productId))
        .map((loc) => loc.id)
    );

    for (const loc of locations) {
      if (loc.gridRow == null || loc.gridCol == null) continue;
      if (loc.gridRow < 1 || loc.gridCol < 1) continue;
      if (loc.gridRow > layout.rows || loc.gridCol > layout.cols) continue;

      const key = `${loc.gridRow}-${loc.gridCol}`;
      const qty = getAvailableQtyAtLocation(productId, loc.id);
      const assigned = assignedIds.has(loc.id);
      const firstGr = qty > 0 ? firstGrDate(productId, loc.id) : null;
      const list = map.get(key) || [];
      list.push({
        location: loc,
        qty,
        firstGr,
        assigned,
      });
      map.set(key, list);
    }

    for (const [, list] of map) {
      list.sort(
        (a, b) => (a.location.shelf || 1) - (b.location.shelf || 1)
      );
    }
    return map;
  }, [productId, locations, layout.rows, layout.cols]);

  const maxQty = useMemo(() => {
    let m = 0;
    for (const list of cellData.values()) {
      for (const s of list) m = Math.max(m, s.qty);
    }
    return m || 1;
  }, [cellData]);

  const unmapped = useMemo(() => {
    if (!productId) return [];
    return locations.filter(
      (loc) =>
        loc.gridRow == null ||
        loc.gridCol == null ||
        loc.gridRow < 1 ||
        loc.gridCol < 1 ||
        loc.gridRow > layout.rows ||
        loc.gridCol > layout.cols
    );
  }, [productId, locations, layout]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock map
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Find where a product sits on your store grid
          </p>
        </div>
        <Link
          to="/masters"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Layout in Masters
        </Link>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Package className="h-4 w-4 text-indigo-600" />
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="min-w-[14rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Select product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku}) — stock {p.quantity}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          Grid {layout.rows}×{layout.cols}
        </span>
      </div>

      {loading ? (
        <div className="st-skeleton h-64 rounded-2xl" />
      ) : !productId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <Grid3x3 className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold text-slate-800">
            Pick a product to open the map
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Assign locations to grid cells in Masters → Locations
          </p>
        </div>
      ) : (
        <>
          {selected && (
            <p className="mb-3 text-sm text-slate-600">
              Showing{' '}
              <span className="font-semibold text-slate-900">{selected.name}</span>{' '}
              <span className="text-slate-400">({selected.sku})</span>
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, minmax(4.5rem, 1fr))`,
              }}
            >
              {Array.from({ length: layout.rows }, (_, ri) =>
                Array.from({ length: layout.cols }, (_, ci) => {
                  const row = ri + 1;
                  const col = ci + 1;
                  const key = `${row}-${col}`;
                  const shelves = cellData.get(key) || [];
                  const hasAny = shelves.length > 0;
                  const hasStock = shelves.some((s) => s.qty > 0);
                  const hasAssigned = shelves.some((s) => s.assigned);

                  return (
                    <div
                      key={key}
                      className={`flex min-h-[5.5rem] flex-col rounded-lg border p-1.5 ${
                        hasStock
                          ? 'border-indigo-300 bg-indigo-50/80'
                          : hasAssigned
                            ? 'border-slate-200 bg-white'
                            : hasAny
                              ? 'border-slate-100 bg-slate-50/80'
                              : 'border-dashed border-slate-200 bg-slate-50/40 opacity-50'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className="font-mono text-[9px] font-semibold text-slate-400">
                          R{row}C{col}
                        </span>
                        {hasStock && (
                          <MapPin className="h-3 w-3 text-indigo-500" />
                        )}
                      </div>

                      {shelves.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                          <span className="text-[10px] text-slate-300">—</span>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col justify-end gap-1">
                          {shelves.map((s) => {
                            const fill = Math.min(
                              100,
                              Math.round((s.qty / maxQty) * 100)
                            );
                            const muted = !s.assigned && s.qty <= 0;
                            return (
                              <div
                                key={s.location.id}
                                className={`rounded-md px-1 py-0.5 ${
                                  muted ? 'opacity-40' : ''
                                }`}
                                title={`${s.location.name}${s.location.shelf ? ` · shelf ${s.location.shelf}` : ''}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate text-[10px] font-semibold text-slate-700">
                                    {s.location.code || s.location.name}
                                    {s.location.shelf
                                      ? ` · S${s.location.shelf}`
                                      : ''}
                                  </span>
                                  <span className="st-num shrink-0 text-[10px] font-bold text-slate-900">
                                    {s.qty}
                                  </span>
                                </div>
                                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      s.qty > 0
                                        ? 'bg-indigo-500'
                                        : 'bg-slate-300'
                                    }`}
                                    style={{ width: `${s.qty > 0 ? Math.max(fill, 8) : 0}%` }}
                                  />
                                </div>
                                {s.firstGr && (
                                  <p className="mt-0.5 text-[9px] text-slate-400">
                                    GR {formatDate(s.firstGr)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-indigo-300 bg-indigo-50" />
              Has stock
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-slate-200 bg-white" />
              Assigned, empty
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-dashed border-slate-200 bg-slate-50 opacity-50" />
              Empty cell
            </span>
          </div>

          {unmapped.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">
                Locations not on grid
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {unmapped.map((loc) => {
                  const qty = getAvailableQtyAtLocation(productId, loc.id);
                  const gr = qty > 0 ? firstGrDate(productId, loc.id) : null;
                  return (
                    <li
                      key={loc.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {loc.name}
                        {loc.code ? (
                          <span className="ml-1 text-xs text-slate-400">
                            ({loc.code})
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-slate-500">
                        {qty > 0 ? (
                          <>
                            qty {qty}
                            {gr ? ` · GR ${formatDate(gr)}` : ''}
                          </>
                        ) : (
                          'no stock'
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
