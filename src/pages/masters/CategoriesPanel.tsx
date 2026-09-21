import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Category, CategorySkuMode } from '../../types/inventory';
import {
  getCategories,
  saveCategory,
  deleteCategory,
} from '../../store/mastersStore';

export function CategoriesPanel() {
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [skuMode, setSkuMode] = useState<CategorySkuMode>('manual');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setList(getCategories());
  }

  useEffect(() => {
    reload();
  }, []);

  function reset() {
    setName('');
    setNotes('');
    setSkuMode('manual');
    setSkuPrefix('');
    setEditingId(null);
    setError(null);
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setName(c.name);
    setNotes(c.notes || '');
    setSkuMode(c.skuMode === 'auto' ? 'auto' : 'manual');
    setSkuPrefix(c.skuPrefix || '');
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (skuMode === 'auto' && !skuPrefix.trim()) {
      setError('Prefix is required when SKU mode is Auto');
      return;
    }
    try {
      saveCategory({
        id: editingId || undefined,
        name,
        notes: notes || undefined,
        skuMode,
        skuPrefix: skuMode === 'auto' ? skuPrefix : undefined,
      });
      reset();
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this category?')) return;
    deleteCategory(id);
    if (editingId === id) reset();
    reload();
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 font-semibold text-slate-900">
          {editingId ? 'Edit category' : 'Add category'}
        </h2>
        {error && (
          <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="Electronics"
          />
        </label>

        <div className="mt-3">
          <span className="text-xs font-semibold text-slate-500">SKU mode</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSkuMode('manual')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                skuMode === 'manual'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setSkuMode('auto')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                skuMode === 'auto'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              Auto
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Auto generates PREFIX-001, PREFIX-002… when adding a product
          </p>
        </div>

        {skuMode === 'auto' && (
          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-500">SKU prefix *</span>
            <input
              value={skuPrefix}
              onChange={(e) =>
                setSkuPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, ''))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="CEM"
              maxLength={12}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Letters and digits only. Example next SKU: {skuPrefix || 'CEM'}-001
            </p>
          </label>
        )}

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-slate-500">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-2">
        {list.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                SKU:{' '}
                {c.skuMode === 'auto' ? (
                  <span className="font-mono text-indigo-600">
                    Auto · {c.skuPrefix || '—'}-###
                  </span>
                ) : (
                  <span>Manual</span>
                )}
              </p>
              {c.notes && <p className="text-xs text-slate-500">{c.notes}</p>}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => startEdit(c)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No categories yet
          </li>
        )}
      </ul>
    </div>
  );
}
