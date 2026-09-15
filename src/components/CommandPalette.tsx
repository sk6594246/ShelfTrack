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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      hint: `${p.sku} · qty ${p.quantity}`,
      icon: Package,
      group: 'Products',
      run: () => navigate(`/products/${p.id}`),
    }));

    return [...create, ...nav, ...productActions];
  }, [navigate, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.hint?.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function run(action: Action) {
    setOpen(false);
    action.run();
  }

  if (!open) return null;

  const groups = Array.from(new Set(filtered.map((a) => a.group)));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && filtered[active]) {
                e.preventDefault();
                run(filtered[active]);
              }
            }}
            placeholder="Search products, pages, actions…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[min(60vh,22rem)] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">No matches</p>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((a) => a.group === group);
              return (
                <div key={group} className="mb-2">
                  <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group}
                  </p>
                  <ul>
                    {items.map((action) => {
                      const index = filtered.indexOf(action);
                      const Icon = action.icon;
                      const isActive = index === active;
                      return (
                        <li key={action.id}>
                          <button
                            type="button"
                            onMouseEnter={() => setActive(index)}
                            onClick={() => run(action)}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                              isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? 'text-white/90' : 'text-slate-400'
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">{action.label}</span>
                            {action.hint ? (
                              <span className={`truncate text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                {action.hint}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          <span>↑↓ navigate · ↵ open</span>
          <span className="font-medium">⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
