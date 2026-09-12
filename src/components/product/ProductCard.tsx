import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import type { Product } from '../../types/inventory';
import { StatusBadge } from '../ui/StatusBadge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Package className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900">{product.name}</h3>
            <StatusBadge quantity={product.quantity} reorderPoint={product.reorderPoint} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">SKU: {product.sku}</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              Qty: <span className="text-indigo-600">{product.quantity}</span>
            </span>
            {product.location && (
              <span className="text-slate-500">{product.location}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
