import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  QrCode,
  Settings,
  Database,
  FileText,
  Search,
  Grid3x3,
  Plus,
  Truck,
  ArrowLeftRight,
  ShoppingCart,
  X,
} from 'lucide-react';
import { CommandPalette } from '../CommandPalette';
import { ToastHost } from '../ui/Toast';
import { createDocument } from '../../store/documentsStore';

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/stock', label: 'Map', icon: Grid3x3 },
  { to: '/scan', label: 'Scan', icon: QrCode },
  { to: '/documents', label: 'Docs', icon: FileText },
  { to: '/inventory', label: 'Stock', icon: Package },
];

const moreItems = [
  { to: '/masters', label: 'Masters', icon: Database },
  { to: '/receive', label: 'Receive', icon: Truck },
  { to: '/pick', label: 'Pick', icon: Package },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const [opsOpen, setOpsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  function startDoc(type: 'purchase' | 'sale' | 'transfer') {
    setOpsOpen(false);
    try {
      const doc = createDocument(type);
      navigate(`/documents/${doc.id}`);
    } catch {
      navigate('/documents');
    }
  }

  return (
    <div className="flex min-h-full flex-col st-page" style={{ background: 'var(--st-bg)' }}>
      <header
        className="sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2.5 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--st-nav) 92%, transparent)',
          borderColor: 'var(--st-border)',
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: 'var(--st-primary)' }}
          >
            <Grid3x3 className="h-4 w-4" />
          </div>
          <span
            className="truncate text-sm font-bold tracking-tight"
            style={{ color: 'var(--st-text)' }}
          >
            ShelfTrack
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('st-open-palette'))}
          className="rounded-xl border p-2"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-muted)' }}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="rounded-xl border px-2.5 py-2 text-xs font-semibold"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-text)' }}
        >
          More
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      <button
        type="button"
        onClick={() => setOpsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95"
        style={{ background: 'var(--st-primary)', boxShadow: 'var(--st-shadow)' }}
        aria-label="Ops menu"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <nav
        className="st-safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t"
        style={{ background: 'var(--st-nav)', borderColor: 'var(--st-border)' }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition"
              style={{ color: 'var(--st-muted)' }}
            >
              {({ isActive }) => (
                <span
                  className="flex flex-col items-center gap-0.5"
                  style={{ color: isActive ? 'var(--st-primary)' : 'var(--st-muted)' }}
                >
                  {isActive && (
                    <span
                      className="absolute -top-0.5 h-0.5 w-6 rounded-full"
                      style={{ background: 'var(--st-primary)' }}
                    />
                  )}
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {opsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'var(--st-overlay)' }}
          onClick={() => setOpsOpen(false)}
        >
          <div
            className="st-enter w-full max-w-lg rounded-t-3xl border-t p-4 pb-8 shadow-xl"
            style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Warehouse ops
              </p>
              <button
                type="button"
                onClick={() => setOpsOpen(false)}
                className="rounded-lg p-2"
                style={{ color: 'var(--st-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Receive',
                  sub: 'Inbound GR',
                  icon: Truck,
                  onClick: () => {
                    setOpsOpen(false);
                    navigate('/receive');
                  },
                },
                {
                  label: 'Purchase',
                  sub: 'New document',
                  icon: Package,
                  onClick: () => startDoc('purchase'),
                },
                {
                  label: 'Transfer',
                  sub: 'Move bins',
                  icon: ArrowLeftRight,
                  onClick: () => startDoc('transfer'),
                },
                {
                  label: 'Sale',
                  sub: 'Outbound',
                  icon: ShoppingCart,
                  onClick: () => startDoc('sale'),
                },
                {
                  label: 'Scan',
                  sub: 'QR camera',
                  icon: QrCode,
                  onClick: () => {
                    setOpsOpen(false);
                    navigate('/scan');
                  },
                },
                {
                  label: 'Stock map',
                  sub: 'Find product',
                  icon: Grid3x3,
                  onClick: () => {
                    setOpsOpen(false);
                    navigate('/stock');
                  },
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98]"
                  style={{
                    borderColor: 'var(--st-border)',
                    background: 'var(--st-surface-2)',
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ background: 'var(--st-primary)' }}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                      {item.label}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--st-muted)' }}>
                      {item.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'var(--st-overlay)' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="st-enter w-full max-w-lg rounded-t-3xl border-t p-4 pb-8"
            style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                More
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                style={{ color: 'var(--st-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(to);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
                  style={{ color: 'var(--st-text)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: 'var(--st-primary)' }} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CommandPalette />
      <ToastHost />
    </div>
  );
}
