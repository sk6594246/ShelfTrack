interface StatusBadgeProps {
  quantity: number;
  reorderPoint: number;
  compact?: boolean;
}

export function StatusBadge({ quantity, reorderPoint, compact = false }: StatusBadgeProps) {
  if (quantity <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/80 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {compact ? 'Out' : 'Out of stock'}
      </span>
    );
  }
  if (quantity <= reorderPoint) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {compact ? 'Low' : 'Low stock'}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/80 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {compact ? 'OK' : 'In stock'}
    </span>
  );
}
