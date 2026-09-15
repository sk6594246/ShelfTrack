import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: 'neutral' | 'indigo' | 'emerald' | 'amber';
  children?: ReactNode;
}

const tones = {
  neutral: 'bg-slate-100 text-slate-400',
  indigo: 'bg-indigo-50 text-indigo-500',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'indigo',
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {children ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
