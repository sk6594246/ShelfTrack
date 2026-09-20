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
      className="group block rounded-2xl border p-4 shadow-sm transition-all duration-200 active:scale-[0.99]"
      style={{
        background: 'var(--st-surface)',
        borderColor: 'var(--st-border)',
        boxShadow: 'var(--st-shadow)',
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition"
          style={{
            background: isOut
              ? 'color-mix(in srgb, var(--st-danger) 12%, transparent)'
              : isLow
                ? 'color-mix(in srgb, var(--st-warning) 15%, transparent)'
                : 'var(--st-primary-soft)',
            color: isOut
              ? 'var(--st-danger)'
              : isLow
                ? 'var(--st-warning)'
                : 'var(--st-primary)',
          }}
        >
          <Package className="h-5 w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="truncate text-[15px] font-semibold tracking-tight"
              style={{ color: 'var(--st-text)' }}
            >
              {product.name}
            </h3>
            <StatusBadge
              quantity={product.quantity}
              reorderPoint={product.reorderPoint}
              compact={compact}
            />
          </div>

          <div
            className="mt-1.5 flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[11px]"
            style={{
              background: 'var(--st-surface-2)',
              color: 'var(--st-muted)',
            }}
          >
            <span className="font-semibold tracking-wide">SKU</span>
            <span className="truncate">{product.sku}</span>
            {product.barcode ? (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span className="truncate opacity-80">{product.barcode}</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--st-muted)' }}
              >
                Qty
              </p>
              <p
                className="st-num text-2xl font-bold leading-none tracking-tight"
                style={{
                  color: isOut
                    ? 'var(--st-danger)'
                    : isLow
                      ? 'var(--st-warning)'
                      : 'var(--st-text)',
                }}
              >
                {product.quantity}
              </p>
            </div>

            {product.location && (
              <span
                className="inline-flex max-w-[45%] items-center gap-1 truncate rounded-lg px-2 py-1 text-[11px] font-medium"
                style={{
                  background: 'var(--st-surface-2)',
                  color: 'var(--st-muted)',
                }}
              >
                <MapPin className="h-3 w-3 shrink-0" />
                {product.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
