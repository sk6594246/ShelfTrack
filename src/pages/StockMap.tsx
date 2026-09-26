import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid3x3, MapPin, Package, Settings2, Layers } from 'lucide-react';
import { getProducts } from '../store/inventoryStore';
import {
  getLocations,
  getProductsForLocation,
  getWeightageForProductAtLocation,
} from '../store/mastersStore';
import { getStoreLayout } from '../store/layoutStore';
import {
  getAvailableQtyForProductAtLocation,
  getBatches,
  batchBelongsToProduct,
  getUnlocatedQty,
} from '../store/stockBatchStore';
import type { Location, Product } from '../types/inventory';

const PRODUCT_COLORS = [
  '#4f46e5', '#059669', '#d97706', '#db2777',
  '#0891b2', '#7c3aed', '#dc2626', '#65a30d',
];

function colorForIndex(i: number) {
  return PRODUCT_COLORS[i % PRODUCT_COLORS.length];
}

function firstGrDate(
  product: Pick<Product, 'id' | 'sku' | 'sourceId'>,
  locationId: string
): string | null {
  const batches = getBatches()
    .filter(
      (b) =>
        batchBelongsToProduct(b.productId, product) &&
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

type ProductQty = { product: Product; color: string; qty: number };

type CellShelf = {
  location: Location;
  productQtys: ProductQty[];
  totalQty: number;
  firstGr: string | null;
  assigned: boolean;
  usedSpace: number;
  capacityPct: number | null;
};

export function StockMap() {
  const layout = getStoreLayout();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [heatMode, setHeatMode] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProducts(), getLocations()])
      .then(([p, l]) => {
        setProducts(p);
        setLocations(l);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedProducts = useMemo(
    () =>
      selectedIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => !!p),
    [selectedIds, products]
  );

  const colorByProductId = useMemo(() => {
    const m = new Map<string, string>();
    selectedProducts.forEach((p, i) => m.set(p.id, colorForIndex(i)));
    return m;
  }, [selectedProducts]);

  function toggleProduct(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  const unlocatedRows = useMemo(() => {
    const source = selectedProducts.length > 0 ? selectedProducts : products;
    return source
      .map((p) => ({
        product: p,
        qty: getUnlocatedQty(p.id, Number(p.quantity) || 0),
      }))
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.qty - a.qty);
  }, [products, selectedProducts]);

  const unlocatedTotal = useMemo(
    () => unlocatedRows.reduce((s, r) => s + r.qty, 0),
    [unlocatedRows]
  );

  const cellData = useMemo(() => {
    const map = new Map<string, CellShelf[]>();
    if (selectedProducts.length === 0) return map;

    for (const loc of locations) {
      if (loc.gridRow == null || loc.gridCol == null) continue;
      if (loc.gridRow < 1 || loc.gridCol < 1) continue;
      if (loc.gridRow > layout.rows || loc.gridCol > layout.cols) continue;

      const key = `${loc.gridRow}-${loc.gridCol}`;
      const productQtys: ProductQty[] = [];
      let totalQty = 0;
      let firstGr: string | null = null;

      for (const product of selectedProducts) {
        const assigned = getProductsForLocation(loc.id).includes(product.id);
        const qty = getAvailableQtyForProductAtLocation(product, loc.id);
        if (qty > 0 || assigned) {
          productQtys.push({
            product,
            color: colorByProductId.get(product.id) || '#4f46e5',
            qty,
          });
          totalQty += qty;
          if (qty > 0) {
            const gr = firstGrDate(product, loc.id);
            if (gr && (!firstGr || gr < firstGr)) firstGr = gr;
          }
        }
      }

      if (productQtys.length === 0) continue;

      let usedSpace = 0;
      for (const pq of productQtys) {
        const w = getWeightageForProductAtLocation(loc.id, pq.product.id);
        usedSpace += pq.qty * (w || 1);
      }
      const capacityPct =
        loc.maxQty && loc.maxQty > 0
          ? Math.min(100, Math.round((usedSpace / loc.maxQty) * 100))
          : null;

      const shelf: CellShelf = {
        location: loc,
        productQtys,
        totalQty,
        firstGr,
        assigned: productQtys.some((pq) =>
          getProductsForLocation(loc.id).includes(pq.product.id)
        ),
        usedSpace,
        capacityPct,
      };

      const list = map.get(key) || [];
      list.push(shelf);
      list.sort((a, b) => (a.location.shelf || 1) - (b.location.shelf || 1));
      map.set(key, list);
    }
    return map;
  }, [selectedProducts, locations, layout.rows, layout.cols, colorByProductId]);

  const cellTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const [key, shelves] of cellData) {
      m.set(key, shelves.reduce((s, sh) => s + sh.totalQty, 0));
    }
    return m;
  }, [cellData]);

  const maxCell = useMemo(() => {
    let max = 1;
    for (const v of cellTotals.values()) if (v > max) max = v;
    return max;
  }, [cellTotals]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock map</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Bins on the grid · unlocated (on floor) listed below
          </p>
        </div>
        <Link
          to="/masters"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Settings2 className="h-3.5 w-3.5" /> Layout in Masters
        </Link>
      </header>

      <div className="mb-5 grid gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Package className="h-3.5 w-3.5" /> Products checklist
            </span>
            <span className="text-[11px] text-slate-400">
              Grid {layout.rows}x{layout.cols}
            </span>
          </div>
          <input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Search products…"
            className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setHeatMode((v) => !v)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                heatMode ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {heatMode ? 'Heat on' : 'Heat'}
            </button>
            {selectedIds.length > 0 && (
              <button type="button" onClick={clearSelection} className="text-xs font-semibold text-slate-500">
                Clear
              </button>
            )}
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {loading ? (
              <p className="p-2 text-xs text-slate-400">Loading…</p>
            ) : filteredProducts.length === 0 ? (
              <p className="p-2 text-xs text-slate-400">No products</p>
            ) : (
              filteredProducts.map((p) => {
                const checked = selectedIds.includes(p.id);
                const color = colorByProductId.get(p.id);
                const floor = getUnlocatedQty(p.id, Number(p.quantity) || 0);
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 ${
                      checked ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(p.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    {color && (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    )}
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {floor > 0 && (
                      <span
                        className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                        title="On floor — no location"
                      >
                        Floor {floor}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">{p.sku}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Grid3x3 className="h-3.5 w-3.5" /> Floor grid
          </div>
          {selectedProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">
              Select one or more products to map stock
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                      const hasStock = shelves.some((s) => s.totalQty > 0);
                      const cellTotal = cellTotals.get(key) || 0;
                      const heatPct = heatMode ? (cellTotal / maxCell) * 100 : 0;

                      return (
                        <div
                          key={key}
                          className={`flex min-h-[5.5rem] flex-col rounded-lg border p-1.5 ${
                            heatMode
                              ? cellTotal > 0
                                ? 'border-orange-200'
                                : 'border-dashed border-slate-200 bg-slate-50/40 opacity-40'
                              : hasStock
                                ? 'border-indigo-300 bg-indigo-50/40'
                                : shelves.length
                                  ? 'border-slate-200 bg-white'
                                  : 'border-dashed border-slate-200 bg-slate-50/40 opacity-50'
                          }`}
                          style={
                            heatMode && cellTotal > 0
                              ? {
                                  background: `rgba(249, 115, 22, ${
                                    0.08 + (heatPct / 100) * 0.45
                                  })`,
                                }
                              : undefined
                          }
                        >
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <span className="font-mono text-[9px] font-semibold text-slate-400">
                              R{row}C{col}
                            </span>
                            {hasStock && <MapPin className="h-3 w-3 text-indigo-500" />}
                          </div>
                          {shelves.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                              <span className="text-[10px] text-slate-300">-</span>
                            </div>
                          ) : (
                            <div className="flex flex-1 flex-col justify-end gap-1">
                              {shelves.map((s) => (
                                <div key={s.location.id} className="rounded-md px-1 py-0.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate text-[10px] font-semibold text-slate-700">
                                      {s.location.code || s.location.name}
                                      {s.location.shelf ? ` · S${s.location.shelf}` : ''}
                                    </span>
                                    <span className="st-num text-[11px] font-bold text-slate-900">
                                      {s.totalQty}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    {s.productQtys
                                      .filter((pq) => pq.qty > 0)
                                      .map((pq) => {
                                        const pct =
                                          (pq.qty / Math.max(s.totalQty, 1)) * 100;
                                        return (
                                          <div
                                            key={pq.product.id}
                                            title={`${pq.product.name}: ${pq.qty}`}
                                            style={{ width: `${pct}%`, background: pq.color }}
                                            className="h-full"
                                          />
                                        );
                                      })}
                                  </div>
                                  {s.capacityPct != null ? (
                                    <p
                                      className={`mt-0.5 text-[9px] font-semibold ${
                                        s.capacityPct >= 90
                                          ? 'text-rose-600'
                                          : s.capacityPct >= 70
                                            ? 'text-amber-600'
                                            : 'text-indigo-600'
                                      }`}
                                    >
                                      {s.capacityPct}% · {s.usedSpace.toFixed(0)}/{s.location.maxQty}
                                    </p>
                                  ) : null}
                                  {s.firstGr && (
                                    <p className="text-[9px] text-slate-400">
                                      GR {formatDate(s.firstGr)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
                {selectedProducts.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: colorByProductId.get(p.id) }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <section
        className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm"
        aria-label="Unlocated stock on floor"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">On floor</p>
              <p className="text-[11px] font-medium text-amber-800/80">
                No location assigned · put away via Transfer
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="st-num text-lg font-bold tabular-nums text-amber-950">
              {unlocatedTotal}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              units
            </p>
          </div>
        </div>
        {unlocatedRows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-amber-800/70">
            {loading
              ? 'Loading…'
              : selectedProducts.length > 0
                ? 'Selected products are fully in bins'
                : 'No unlocated stock — everything is in a location'}
          </p>
        ) : (
          <ul className="divide-y divide-amber-100/80">
            {unlocatedRows.map(({ product: p, qty }) => {
              const color = colorByProductId.get(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color || '#d97706' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {p.sku || '—'} · total {Number(p.quantity) || 0}
                    </p>
                  </div>
                  <span className="st-num rounded-xl bg-white px-2.5 py-1 text-sm font-bold tabular-nums text-amber-900 shadow-sm ring-1 ring-amber-200">
                    {qty}
                  </span>
                  <Link
                    to="/documents"
                    className="hidden text-[11px] font-bold text-amber-800 underline-offset-2 hover:underline sm:inline"
                  >
                    Put away
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
