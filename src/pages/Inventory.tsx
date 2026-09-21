import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Package, Plus, Search } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';
import { EmptyState } from '../components/ui/EmptyState';
import { getCardDensity, setCardDensity, type CardDensity } from '../lib/uiPrefs';

type StockFilter = 'all' | 'in' | 'low' | 'out';

export function Inventory() {
  const { products, loading } = useProducts();
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [density, setDensity] = useState<CardDensity>(() => getCardDensity());

  function toggleDensity() {
    const next: CardDensity = density === 'dense' ? 'comfortable' : 'dense';
    setDensity(next);
    setCardDensity(next);
  }

  const counts = useMemo(() => {
    const inStock = products.filter((p) => p.quantity > p.reorderPoint).length;
    const low = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint).length;
    const out = products.filter((p) => p.quantity <= 0).length;
    return { all: products.length, in: inStock, low, out };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.customId?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q)
      );
    }
    if (stockFilter === 'in') list = list.filter((p) => p.quantity > p.reorderPoint);
    else if (stockFilter === 'low') list = list.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint);
    else if (stockFilter === 'out') list = list.filter((p) => p.quantity <= 0);
    return list;
  }, [products, query, stockFilter]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <div className="st-skeleton h-10 w-48" />
        <div className="st-skeleton h-11 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="st-skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const filters: { value: StockFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'in', label: 'In stock' },
    { value: 'low', label: 'Low' },
    { value: 'out', label: 'Out' },
  ];

  const dense = density === 'dense';

  return (
    <div className="st-page-fluid mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDensity}
            className="st-tap inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700"
          >
            {dense ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {dense ? 'Comfort' : 'Dense'}
          </button>
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add
          </Link>
        </div>
      </header>

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search name, SKU, barcode, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="st-field w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map(({ value, label }) => {
            const active = stockFilter === value;
            const count = counts[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStockFilter(value)}
                className={`st-tap inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={query || stockFilter !== 'all' ? 'No matching products' : 'No products yet'}
          description={
            query || stockFilter !== 'all'
              ? 'Try a different search or filter'
              : 'Add your first product to start tracking stock'
          }
          tone="indigo"
        >
          {!query && stockFilter === 'all' ? (
            <Link
              to="/products/new"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--st-primary)' }}
            >
              <Plus className="h-4 w-4" />
              Add first product
            </Link>
          ) : null}
        </EmptyState>
      ) : dense ? (
        <div className="st-stagger space-y-1.5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} dense />
          ))}
        </div>
      ) : (
        <div className="st-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
