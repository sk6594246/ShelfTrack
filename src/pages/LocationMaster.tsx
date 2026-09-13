import { Link } from 'react-router-dom';
import { MapPin, Package, Users, BarChart2, Search, QrCode, AlertTriangle } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';

export function LocationMaster() {
  const { products, loading } = useProducts();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Group products by location
  const locationGroups = products.reduce((acc, product) => {
    const location = product.location || 'Unassigned';
    if (!acc[location]) {
      acc[location] = {
        products: [],
        totalQuantity: 0,
      };
    }
    acc[location].products.push(product);
    acc[location].totalQuantity += product.quantity;
    return acc;
  }, {} as Record<string, { products: Product[]; totalQuantity: number }>);

  // Convert to array for sorting
  const locations = Object.entries(locationGroups)
    .map(([location, data]) => ({
      location,
      productCount: data.products.length,
      totalQuantity: data.totalQuantity,
      products: data.products
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity); // Sort by total quantity descending

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Location Master</h1>
        <p className="text-slate-500">Manage and view product storage locations</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/products/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            <Package className="mr-2 h-4 w-4" />
            Add Product
          </Link>
          <Link
            to="/location-master/qr"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            <QrCode className="mr-2 h-4 w-4" />
            Generate Location QR
          </Link>
        </div>
      </header>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search locations..."
            className="input w-64"
          />
        </div>
      </div>

      {/* Location statistics */}
      {locations.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total Locations</div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{locations.filter(l => l.location !== 'Unassigned').length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Products in Locations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {locations.reduce((sum, loc) => sum + loc.productCount, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Total Units Stored</div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {locations.reduce((sum, loc) => sum + loc.totalQuantity, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Locations list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Locations ({locations.length} total)
        </h2>
        {locations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-slate-600">No locations found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {locations.map((location) => (
              <div key={location.location} className="px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {location.location === 'Unassigned' ? 'Unassigned' : location.location}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {location.productCount} product{location.productCount !== 1 ? 's' : ''} •
                      {location.totalQuantity} unit{location.totalQuantity !== 1 ? 's' : ''} stored
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    <Link
                      to={`/locations/${encodeURIComponent(location.location)}`}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      View Details
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unassigned products warning */}
      {locations.some(l => l.location === 'Unassigned') && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Attention Needed</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start">
              <AlertTriangle className="mt-1 h-5 w-5 text-amber-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {locations.find(l => l.location === 'Unassigned')?.productCount} product{
                    locations.find(l => l.location === 'Unassigned')?.productCount !== 1 ? 's' : ''
                  } not assigned to any location
                </p>
                <Link
                  to="/products"
                  className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-500 text-sm"
                >
                  Assign locations
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        >
      )}
    </div>
  );
}