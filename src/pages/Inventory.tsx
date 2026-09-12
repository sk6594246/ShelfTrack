import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';

type StockFilter = 'all' | 'in' | 'low' | 'out';

export function Inventory() {
  const { products, loading } = useProducts();
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

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
          p.category?.toLowerCase().includes(q)
      );
    }

    if (stockFilter === 'in') {
      list = list.filter((p) => p.quantity > p.reorderPoint);
    } else if (stockFilter === 'low') {
      list = list.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint);
    } else if (stockFilter === 'out') {
      list = list.filter((p) => p.quantity <= 0);
    }

    return list;
  }, [products, query, stockFilter]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">{products.length} products</p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add
        </Link>
      </header>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search name, SKU, barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ['all', 'All'],
              ['in', 'In stock'],
              ['low', 'Low'],
              ['out', 'Out'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStockFilter(value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                stockFilter === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">
            {query || stockFilter !== 'all' ? 'No matching products' : 'No products yet'}
          </p>
          {!query && stockFilter === 'all' && (
            <Link
              to="/products/new"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Add your first product
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
