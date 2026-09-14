import { Link } from 'react-router-dom';
import { ArrowRight, Folder, Package, Users } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useLocations } from '../hooks/useLocations';

export function Master() {
  const { products } = useProducts();
  const { locations } = useLocations();

  // Group products by category for category master stats
  const categoryGroups = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = {
        products: [],
        totalQuantity: 0,
      };
    }
    acc[category].products.push(product);
    acc[category].totalQuantity += product.quantity;
    return acc;
  }, {} as Record<string, {
    products: any[];
    totalQuantity: number;
  }>);

  const categories = Object.entries(categoryGroups)
    .map(([category, data]) => ({
      category,
      productCount: data.products.length,
      totalQuantity: data.totalQuantity,
    }))
    .sort((a, b) => b.productCount - a.productCount);

  // Group products by location for location master stats
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
  }, {} as Record<string, {
    products: any[];
    totalQuantity: number;
  }>);

  const locationStats = Object.entries(locationGroups)
    .map(([location, data]) => ({
      location,
      productCount: data.products.length,
      totalQuantity: data.totalQuantity,
    }))
    .sort((a, b) => b.productCount - a.productCount);

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
        <p className="text-slate-500">Manage your core inventory data</p>
        <div className="flex flex-wrap gap-4 mt-4">
          <Link
            to="/products/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            <Package className="mr-2 h-4 w-4" />
            Add Product
          </Link>
          <Link
            to="/location-master"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            <Users className="mr-2 h-4 w-4" />
            Location Master
          </Link>
          <Link
            to="/category-master"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            <Folder className="mr-2 h-4 w-4" />
            Category Master
          </Link>
        </div>
      </header>

      {/* Master statistics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Products</div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Categories</div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Locations</div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {locations.filter(l => l !== '').length}
          </p>
        </div>
      </div>

      {/* Quick stats sections */}
      <div className="grid gap-6">
        {/* Categories section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Categories ({categories.length} total)
          </h2>
          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-slate-600">No categories found</p>
              <Link
                to="/products/new"
                className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add first product to create categories
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.slice(0, 5).map((category) => (
                <div key={category.category} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900">{category.category}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {category.productCount} product{category.productCount !== 1 ? 's' : ''} •
                        {category.totalQuantity} unit{category.totalQuantity !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
                      <Link
                        to={`/categories/${encodeURIComponent(category.category)}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        View Details
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length > 5 && (
                <p className="mt-3 text-center text-sm text-slate-500">
                  and {categories.length - 5} more categories
                </p>
              )}
            </div>
          )}
        </section>

        {/* Locations section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Locations ({locationStats.length} total)
          </h2>
          {locationStats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-slate-600">No locations found</p>
              <p className="text-slate-500 mt-2">
                Products will appear here when assigned to locations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {locationStats.slice(0, 5).map((location) => (
                <div key={location.location} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900">
                        {location.location === 'Unassigned' ? 'Unassigned' : location.location}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {location.productCount} product{location.productCount !== 1 ? 's' : ''} •
                        {location.totalQuantity} unit{location.totalQuantity !== 1 ? 's' : ''} stored
                      </p>
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
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
              {locationStats.length > 5 && (
                <p className="mt-3 text-center text-sm text-slate-500">
                  and {locationStats.length - 5} more locations
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}