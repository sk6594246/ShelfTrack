import { Link } from 'react-router-dom';
import { MapPin, Package } from 'lucide-react';
import type { Product } from '../../types/inventory';
import { StatusBadge } from '../ui/StatusBadge';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const isOut = product.quantity <= 0;
  const isLow = product.quantity > 0 && product.quantity <= product.reorderPoint;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50"
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${
            isOut
              ? 'bg-rose-50 text-rose-500'
              : isLow
                ? 'bg-amber-50 text-amber-600'
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
          }`}
        >
          <Package className="h-5 w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {product.name}
            </h3>
            <StatusBadge
              quantity={product.quantity}
              reorderPoint={product.reorderPoint}
              compact={compact}
            />
          </div>

          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            SKU · {product.sku}
          </p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Qty
              </p>
              <p
                className={`st-num text-xl font-bold leading-none tracking-tight ${
                  isOut
                    ? 'text-rose-600'
                    : isLow
                      ? 'text-amber-600'
                      : 'text-slate-900'
                }`}
              >
                {product.quantity}
              </p>
            </div>

            {product.location && (
              <span className="inline-flex max-w-[45%] items-center gap-1 truncate rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                {product.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
