import { Link } from 'react-router-dom';
import { ArrowRight, Folder, Package, Search } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { CATEGORIES, type Product } from '../types/inventory';

export function CategoryMaster() {
  const { products, loading } = useProducts();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Group products by category
  const categoryGroups = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = {
        products: [],
        totalQuantity: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      };
    }
    acc[category].products.push(product);
    acc[category].totalQuantity += product.quantity;
    if (product.quantity > 0 && product.quantity <= product.reorderPoint) {
      acc[category].lowStockCount++;
    }
    if (product.quantity <= 0) {
      acc[category].outOfStockCount++;
    }
    return acc;
  }, {} as Record<string, {
    products: Product[];
    totalQuantity: number;
    lowStockCount: number;
    outOfStockCount: number;
  }>);

  // Convert to array for sorting
  const categories = Object.entries(categoryGroups)
    .map(([category, data]) => ({
      category,
      productCount: data.products.length,
      totalQuantity: data.totalQuantity,
      lowStockCount: data.lowStockCount,
      outOfStockCount: data.outOfStockCount,
      products: data.products
    }))
    .sort((a, b) => b.productCount - a.productCount); // Sort by product count descending

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Category Master</h1>
        <p className="text-slate-500">Manage and view product categories</p>
        <Link
          to="/products/new"
          className="ml-auto inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
        >
          <Package className="mr-2 h-4 w-4" />
          Add Product
        </Link>
      </header>

      {/* Category statistics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Categories</div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Products</div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Units</div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {products.reduce((sum, p) => sum + p.quantity, 0)}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            className="input w-64"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              // Reset to default categories view
            }}
            className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-500 border border-indigo-300 rounded hover:bg-indigo-50"
          >
            Show All
          </button>
        </div>
      </div>

      {/* Categories list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Categories ({categories.length} total)
        </h2>
        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Folder className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-slate-600">No categories found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.category} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">{category.category}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {category.productCount} product{category.productCount !== 1 ? 's' : ''} •
                      {category.totalQuantity} unit{category.totalQuantity !== 1 ? 's' : ''} •
                      {category.lowStockCount} low stock •
                      {category.outOfStockCount} out of stock
                    </p>
                  </div>
                  <div className="ml-4 flex items-center space-x-3">
                    <div className="flex space-x-2">
                      {category.lowStockCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                          Low Stock
                        </span>
                      )}
                      {category.outOfStockCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
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
          </div>
        )}
      </section>

      {/* Predefined categories info */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Predefined Categories</h2>
        <p className="text-sm text-slate-500 mb-4">
          The system comes with these predefined categories:
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat: string) => (
            <span key={cat} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-800 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}