import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Package,
  Plus,
  QrCode,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Database,
  Home,
} from 'lucide-react';
import { getProducts } from '../store/inventoryStore';
import { createDocument } from '../store/documentsStore';
import type { Product } from '../types/inventory';
import { toast } from './ui/Toast';

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  group: string;
  run: () => void;
};

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('st-open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('st-open-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    getProducts().then(setProducts).catch(() => setProducts([]));
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const nav: Action[] = [
      { id: 'nav-home', label: 'Go to Dashboard', icon: Home, group: 'Navigate', run: () => navigate('/') },
      { id: 'nav-inv', label: 'Go to Inventory', icon: Package, group: 'Navigate', run: () => navigate('/inventory') },
      { id: 'nav-docs', label: 'Go to Documents', icon: FileText, group: 'Navigate', run: () => navigate('/documents') },
      { id: 'nav-scan', label: 'Open Scan', icon: QrCode, group: 'Navigate', run: () => navigate('/scan') },
      { id: 'nav-masters', label: 'Open Masters', icon: Database, group: 'Navigate', run: () => navigate('/masters') },
      { id: 'nav-settings', label: 'Open Settings', icon: Settings, group: 'Navigate', run: () => navigate('/settings') },
      { id: 'nav-stock', label: 'Open Stock map', icon: Package, group: 'Navigate', run: () => navigate('/stock') },
      { id: 'nav-receive', label: 'Open Receive dock', icon: Truck, group: 'Navigate', run: () => navigate('/receive') },
    ];

    const create: Action[] = [
      { id: 'new-product', label: 'New product', icon: Plus, group: 'Create', run: () => navigate('/products/new') },
      {
        id: 'new-purchase',
        label: 'New purchase document',
        icon: Truck,
        group: 'Create',
        run: () => {
          const doc = createDocument('purchase');
          toast('Purchase draft created', 'success');
          navigate(`/documents/${doc.id}`);
        },
      },
      {
        id: 'new-sale',
        label: 'New sale document',
        icon: ShoppingCart,
        group: 'Create',
        run: () => {
          const doc = createDocument('sale');
          toast('Sale draft created', 'success');
          navigate(`/documents/${doc.id}`);
        },
      },
      {
        id: 'new-transfer',
        label: 'New transfer document',
        icon: ArrowLeftRight,
        group: 'Create',
        run: () => {
          const doc = createDocument('transfer');
          toast('Transfer draft created', 'success');
          navigate(`/documents/${doc.id}`);
        },
      },
    ];

    const productActions: Action[] = products.slice(0, 40).map((p) => ({
      id: `p-${p.id}`,
      label: p.name,
      hint: p.sku,
      icon: Package,
      group: 'Products',
      run: () => navigate(`/products/${p.id}`),
    }));

    return [...nav, ...create, ...productActions];
  }, [navigate, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.hint || '').toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function run(i: number) {
    const a = filtered[i];
    if (!a) return;
    setOpen(false);
    a.run();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh]">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((v) => Math.min(v + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((v) => Math.max(v - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(active);
              }
            }}
            placeholder="Search actions, products…"
            className="flex-1 border-0 bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No matches</p>
          ) : (
            filtered.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => run(i)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  i === active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700'
                }`}
              >
                <a.icon className="h-4 w-4 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1 truncate font-medium">{a.label}</span>
                {a.hint ? (
                  <span className="truncate text-xs text-slate-400">{a.hint}</span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {a.group}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span className="font-medium">⌘K / Ctrl+K</span> to toggle
        </div>
      </div>
    </div>
  );
}
