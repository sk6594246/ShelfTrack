import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart2, MapPin, Package, QrCode, TrendingDown, Users } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useLocations } from '../hooks/useLocations';
import { useState, useMemo } from 'react';
import { ProductCard } from '../components/product/ProductCard';

export function Dashboard() {
  const { products, loading: productsLoading } = useProducts();
  const { locations, loading: locationsLoading } = useLocations();
  const [locationFilter, setLocationFilter] = useState('all');

  // Filter products by location
  const filteredProducts = useMemo(() => {
    if (locationFilter === 'all') return products;
    return products.filter(product => product.location === locationFilter);
  }, [products, locationFilter]);

  // Calculate metrics based on filtered products
  const total = filteredProducts.length;
  const lowStock = filteredProducts.filter((p) => p.quantity > 0 && p.quantity <= p.reorderPoint);
  const outOfStock = filteredProducts.filter((p) => p.quantity <= 0);
  const inStock = filteredProducts.filter((p) => p.quantity > p.reorderPoint);

  // Calculate total units in stock
  const totalUnits = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);

  // Calculate average units per product
  const avgUnits = total > 0 ? Math.round(totalUnits / total) : 0;

  // Calculate inventory health percentage (products with adequate stock)
  const healthPercentage = total > 0
    ? Math.round(((inStock.length) / total) * 100)
    : 100;

  // Calculate stock distribution by category
  const categoryDistribution = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + product.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Get top 3 categories by stock value
  const topCategories = Object.entries(categoryDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category, quantity]) => ({ category, quantity }));

  // Calculate stock distribution by location
  const locationDistribution = filteredProducts.reduce((acc, product) => {
    const location = product.location || 'Unassigned';
    acc[location] = (acc[location] || 0) + product.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Get top 3 locations by stock value
  const topLocations = Object.entries(locationDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([location, quantity]) => ({ location, quantity }));

  // Calculate additional metrics
  const locationsInUse = Object.keys(locationDistribution).filter(loc => locationDistribution[loc] > 0).length;
  const totalLocatedStock = Object.values(locationDistribution).reduce((sum, qty) => sum + qty, 0);
  const topLocationStock = topLocations.length > 0 ? topLocations[0].quantity : 0;
  const stockConcentration = totalLocatedStock > 0 ? Math.round((topLocationStock / totalLocatedStock) * 100) : 0;

  if (productsLoading || locationsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-slate-700">Location:</label>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="select w-48"
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location} value={location}>
                {location || 'Unassigned'}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
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
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Avg Stock</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-800">{avgUnits}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-700">
            <BarChart2 className="h-4 w-4" />
            <span className="text-xs font-medium">Health</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-green-800">{healthPercentage}%</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-700">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium">Locations</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-indigo-800">
            {locationsInUse} active
          </p>
          <p className="mt-0.5 text-xs text-indigo-600">
            {stockConcentration}% in top location
          </p>
        </div>
        <Link
          to="/scan"
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm transition hover:bg-indigo-100"
        >
          <QrCode className="h-6 w-6 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">Scan QR</span>
        </Link>
      </div>

      {/* Category distribution section */}
      {topCategories.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Stock by Category</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {topCategories.map(({ category, quantity }) => (
              <div key={category} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-700">{category}</span>
                  <span className="text-sm font-medium text-slate-900">{quantity} units</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((quantity / Math.max(1, Math.max(...Object.values(categoryDistribution))) * 100)))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Location distribution section */}
      {topLocations.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Stock by Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {topLocations.map(({ location, quantity }) => (
              <div key={location} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {location || 'Unassigned'}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{quantity} units</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((quantity / Math.max(1, Math.max(...Object.values(locationDistribution))) * 100)))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
        {filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-slate-600">
              {locationFilter === 'all' ? 'No products yet' : 'No products in this location'}
            </p>
            {!locationFilter || locationFilter === 'all' && (
              <Link
                to="/products/new"
                className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add first product
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}