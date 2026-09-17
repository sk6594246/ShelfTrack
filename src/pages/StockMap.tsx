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
  getAvailableQtyForProductAtLocation,
  getBatches,
  batchBelongsToProduct,
} from '../store/stockBatchStore';
import type { Location, Product } from '../types/inventory';

const PRODUCT_COLORS = [
  '#4f46e5',
  '#059669',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#7c3aed',
  '#dc2626',
  '#65a30d',
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

type ProductQty = {
  product: Product;
  color: string;
  qty: number;
};

type CellShelf = {
  location: Location;
  productQtys: ProductQty[];
  totalQty: number;
  firstGr: string | null;
  assigned: boolean;
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
    Promise.all([getProducts(), Promise.resolve(getLocations())])
      .then(([p, l]) => {
        setProducts(p);
        setLocations(l);
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

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  function toggleProduct(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      filteredProducts.forEach((p) => set.add(p.id));
      return Array.from(set);
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

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
      let anyAssigned = false;

      for (const product of selectedProducts) {
        const assigned = getProductsForLocation(loc.id).includes(product.id);
        if (assigned) anyAssigned = true;
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

      const list = map.get(key) || [];
      list.push({
        location: loc,
        productQtys,
        totalQty,
        firstGr,
        assigned: anyAssigned,
      });
      map.set(key, list);
    }

    for (const [, list] of map) {
      list.sort((a, b) => (a.location.shelf || 1) - (b.location.shelf || 1));
    }
    return map;
  }, [selectedProducts, locations, layout.rows, layout.cols, colorByProductId]);

  const cellTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const [key, list] of cellData) {
      m.set(key, list.reduce((s, x) => s + x.totalQty, 0));
    }
    return m;
  }, [cellData]);

  const maxCellTotal = useMemo(() => {
    let m = 0;
    for (const v of cellTotals.values()) m = Math.max(m, v);
    return m || 1;
  }, [cellTotals]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock map
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Select one or more products - stacked color bars on the grid
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
            placeholder="Search products..."
            className="mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              Select shown
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setHeatMode((v) => !v)}
              className={`ml-auto rounded-lg px-2 py-1 text-[11px] font-semibold ${
                heatMode
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {heatMode ? 'Heat on' : 'Heat'}
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="p-2 text-xs text-slate-400">No products</p>
            ) : (
              filteredProducts.map((p) => {
                const checked = selectedIds.includes(p.id);
                const color = checked
                  ? colorByProductId.get(p.id) ||
                    colorForIndex(selectedIds.indexOf(p.id))
                  : '#cbd5e1';
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(p.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {p.name}{' '}
                      <span className="text-xs text-slate-400">({p.sku})</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                      {p.quantity}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedProducts.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedProducts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-white"
                  style={{
                    background: colorByProductId.get(p.id) || '#4f46e5',
                  }}
                >
                  {p.name}
                  <span className="opacity-80">qty {p.quantity}</span>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="st-skeleton h-64 rounded-2xl" />
          ) : selectedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <Grid3x3 className="h-7 w-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-800">
                Check one or more products
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Stacked bars use a color per product on each grid cell
              </p>
            </div>
          ) : (
            <>
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
                      const hasStock = shelves.some((s) => s.totalQty > 0);
                      const cellTotal = cellTotals.get(key) || 0;
                      const heatPct = heatMode
                        ? Math.round((cellTotal / maxCellTotal) * 100)
                        : 0;

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
                            {hasStock && (
                              <MapPin className="h-3 w-3 text-indigo-500" />
                            )}
                          </div>

                          {shelves.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                              <span className="text-[10px] text-slate-300">-</span>
                            </div>
                          ) : (
                            <div className="flex flex-1 flex-col justify-end gap-1">
                              {shelves.map((s) => (
                                <div
                                  key={s.location.id}
                                  className="rounded-md px-1 py-0.5"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate text-[10px] font-semibold text-slate-700">
                                      {s.location.code || s.location.name}
                                      {s.location.shelf
                                        ? ` S${s.location.shelf}`
                                        : ''}
                                    </span>
                                    <span className="st-num shrink-0 text-[10px] font-bold text-slate-900">
                                      {s.totalQty}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex h-2 overflow-hidden rounded-full bg-slate-200/80">
                                    {s.productQtys
                                      .filter((pq) => pq.qty > 0)
                                      .map((pq) => {
                                        const pct = Math.max(
                                          8,
                                          Math.round(
                                            (pq.qty / Math.max(s.totalQty, 1)) *
                                              100
                                          )
                                        );
                                        return (
                                          <div
                                            key={pq.product.id}
                                            title={`${pq.product.name}: ${pq.qty}`}
                                            style={{
                                              width: `${pct}%`,
                                              background: pq.color,
                                            }}
                                            className="h-full"
                                          />
                                        );
                                      })}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                                    {s.productQtys
                                      .filter((pq) => pq.qty > 0)
                                      .map((pq) => (
                                        <span
                                          key={pq.product.id}
                                          className="rounded px-1 text-[8px] font-bold text-white"
                                          style={{ background: pq.color }}
                                        >
                                          {pq.qty}
                                        </span>
                                      ))}
                                  </div>
                                  {s.firstGr && (
                                    <p className="mt-0.5 text-[9px] text-slate-400">
                                      GR {formatDate(s.firstGr)}
                                    </p>
                                  )}
                                  {s.location.maxQty != null && (
                                    <p className="text-[9px] text-slate-400">
                                      max {s.location.maxQty}
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
                      className="h-3 w-3 rounded"
                      style={{
                        background: colorByProductId.get(p.id) || '#4f46e5',
                      }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
