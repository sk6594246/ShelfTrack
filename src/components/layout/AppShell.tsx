import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Zap,
} from 'lucide-react';
import { CommandPalette } from '../CommandPalette';
import { ToastHost, toast } from '../ui/Toast';
import { ConfettiHost } from '../ui/ConfettiBurst';
import { QuickReceiveSheet } from '../ops/QuickReceiveSheet';
import { createDocument } from '../../store/documentsStore';
import { hydrateMastersFromGas } from '../../store/mastersStore';
import { isGasEnabled, isD1Enabled } from '../../lib/gasApi';
import { getSession } from '../../lib/syncConfig';
import { shiftLabel } from '../../lib/uiPrefs';

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

const SPLASH_KEY = 'st_shift_splash_shown';

export function AppShell() {
  const [opsOpen, setOpsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickReceive, setQuickReceive] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const locationKey = location.pathname;
  const session = getSession();
  const role = (session?.role || 'worker').toLowerCase();
  const company = session?.tenantName || session?.tenantId || 'ShelfTrack';
  const cloudOn = isD1Enabled() || isGasEnabled();
  const shift = shiftLabel();

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SPLASH_KEY) && session) {
        setShowSplash(true);
        sessionStorage.setItem(SPLASH_KEY, '1');
        const t = window.setTimeout(() => setShowSplash(false), 2800);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
  }, [role]);

  useEffect(() => {
    const main = document.querySelector('main.st-main-scroll');
    if (!main) return;
    function onScroll() {
      setHeaderScrolled((main as HTMLElement).scrollTop > 12);
    }
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isGasEnabled()) return;
    void hydrateMastersFromGas()
      .then((locs) => {
        window.dispatchEvent(
          new CustomEvent('st-masters-hydrated', { detail: { count: locs.length } })
        );
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('masters hydrate failed', e);
        toast(
          msg.includes('Unknown action')
            ? 'Locations API missing — check Worker / redeploy'
            : `Location sync failed: ${msg}`,
          'error'
        );
      });
  }, []);

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
    <div
      className="flex min-h-full flex-col st-page"
      style={{ background: 'var(--st-bg)' }}
      data-role={role}
    >
      {showSplash && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 px-6 text-center"
          style={{ background: 'var(--st-bg)' }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: 'var(--st-primary)' }}
          >
            <Grid3x3 className="h-8 w-8" />
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--st-text)' }}>
            {company}
          </p>
          <p className="text-sm" style={{ color: 'var(--st-muted)' }}>
            Shift start · {session?.displayName || session?.username} · {role}
          </p>
          <p className="text-xs font-semibold" style={{ color: 'var(--st-primary)' }}>
            {shift}
          </p>
        </div>
      )}

      <header
        className="st-header sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2.5 backdrop-blur-md"
        data-scrolled={headerScrolled ? 'true' : 'false'}
        style={{
          background: 'color-mix(in srgb, var(--st-nav) 92%, transparent)',
          borderColor: 'var(--st-border)',
        }}
      >
        <div className="st-header-brand flex min-w-0 flex-1 items-center gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'var(--st-primary)' }}
          >
            <Grid3x3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
              ShelfTrack
            </p>
            <span
              className="inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: 'var(--st-primary-soft)',
                color: 'var(--st-primary)',
              }}
            >
              {company}
              <span style={{ opacity: 0.7 }}>· {role}</span>
            </span>
            <p className="mt-0.5 text-[10px] font-medium" style={{ color: 'var(--st-muted)' }}>
              {shift}
            </p>
          </div>
        </div>
        <span
          className="hidden rounded-full px-2 py-1 text-[10px] font-semibold sm:inline"
          style={{
            background: cloudOn ? 'var(--st-primary-soft)' : 'var(--st-surface-2)',
            color: cloudOn ? 'var(--st-primary)' : 'var(--st-muted)',
          }}
        >
          {cloudOn ? 'Cloud' : 'Device'}
        </span>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('st-open-palette'))}
          className="st-tap rounded-xl border p-2.5"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-muted)' }}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="st-tap rounded-xl border px-3 py-2.5 text-xs font-semibold"
          style={{ borderColor: 'var(--st-border)', color: 'var(--st-text)' }}
        >
          More
        </button>
      </header>

      <main className="st-main-scroll flex-1 overflow-y-auto pb-28">
        <div className="st-page-fluid" key={locationKey}>
          <Outlet />
        </div>
      </main>

      <button
        type="button"
        onClick={() => setOpsOpen(true)}
        className="st-tap fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: 'var(--st-primary)', boxShadow: 'var(--st-shadow)' }}
        aria-label="Ops menu"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <nav
        className="st-safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t"
        style={{ background: 'var(--st-nav)', borderColor: 'var(--st-border)' }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="st-nav-item relative flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-bold"
              style={{ color: 'var(--st-muted)' }}
            >
              {({ isActive }) => (
                <span
                  className="flex flex-col items-center gap-0.5"
                  data-active={isActive ? 'true' : 'false'}
                  style={{ color: isActive ? 'var(--st-primary)' : 'var(--st-muted)' }}
                >
                  {isActive && (
                    <span
                      className="st-nav-indicator absolute top-0 h-1 w-8 rounded-full"
                      style={{ background: 'var(--st-primary)' }}
                    />
                  )}
                  <Icon className="st-nav-icon h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {opsOpen && (
        <div
          className="st-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'var(--st-overlay)' }}
          onClick={() => setOpsOpen(false)}
        >
          <div
            className="st-sheet w-full max-w-lg rounded-t-3xl border-t p-4 pb-8 shadow-xl"
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
                className="st-tap rounded-lg p-2"
                style={{ color: 'var(--st-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Quick receive',
                  sub: 'Qty + bin sheet',
                  icon: Zap,
                  onClick: () => {
                    setOpsOpen(false);
                    setQuickReceive(true);
                  },
                },
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
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="st-tap st-tile-press flex items-center gap-3 rounded-2xl border p-3 text-left"
                  style={{
                    borderColor: 'var(--st-border)',
                    background: 'var(--st-surface-2)',
                  }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
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
          className="st-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'var(--st-overlay)' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="st-sheet w-full max-w-lg rounded-t-3xl border-t p-4 pb-8"
            style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                More
              </p>
              <button type="button" onClick={() => setMoreOpen(false)} style={{ color: 'var(--st-muted)' }}>
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
                  className="st-tap flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left"
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

      <QuickReceiveSheet open={quickReceive} onClose={() => setQuickReceive(false)} />
      <CommandPalette />
      <ToastHost />
      <ConfettiHost />
    </div>
  );
}
