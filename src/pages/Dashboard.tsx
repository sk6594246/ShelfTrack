import { Link } from 'react-router-dom';
import { AlertTriangle, Package, QrCode, TrendingDown } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/product/ProductCard';

export function Dashboard() {
  const { products, loading } = useProducts();

  const total = products.length;
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint);
  const outOfStock = products.filter((p) => p.quantity <= 0);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overview of your inventory</p>
      </header>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-medium">Low stock</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-800">{lowStock.length}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Out of stock</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-800">{outOfStock.length}</p>
        </div>
        <Link
          to="/scan"
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm transition hover:bg-indigo-100"
        >
          <QrCode className="h-6 w-6 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">Scan QR</span>
        </Link>
      </div>

      {/* Low stock section */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Needs attention</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...outOfStock, ...lowStock].slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recent / all products teaser */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All products</h2>
          <Link to="/inventory" className="text-sm font-medium text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-slate-600">No products yet</p>
            <Link
              to="/products/new"
              className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Add first product
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
