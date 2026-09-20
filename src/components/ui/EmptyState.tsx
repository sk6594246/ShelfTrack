import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: 'neutral' | 'indigo' | 'emerald' | 'amber';
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'indigo',
  children,
}: EmptyStateProps) {
  const iconBg =
    tone === 'emerald'
      ? 'color-mix(in srgb, var(--st-success) 15%, transparent)'
      : tone === 'amber'
        ? 'color-mix(in srgb, var(--st-warning) 15%, transparent)'
        : tone === 'neutral'
          ? 'var(--st-surface-2)'
          : 'var(--st-primary-soft)';
  const iconColor =
    tone === 'emerald'
      ? 'var(--st-success)'
      : tone === 'amber'
        ? 'var(--st-warning)'
        : tone === 'neutral'
          ? 'var(--st-muted)'
          : 'var(--st-primary)';

  return (
    <div
      className="rounded-2xl border border-dashed px-6 py-12 text-center shadow-sm"
      style={{
        background: 'var(--st-surface)',
        borderColor: 'var(--st-border)',
      }}
    >
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-base font-semibold" style={{ color: 'var(--st-text)' }}>
        {title}
      </p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm" style={{ color: 'var(--st-muted)' }}>
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
