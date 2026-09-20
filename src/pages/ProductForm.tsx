import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useProducts, useProduct } from '../hooks/useProducts';
import type { Product, Location, Category } from '../types/inventory';
import {
  getCategories,
  getLocations,
  getLocationsCached,
  seedMastersIfEmpty,
} from '../store/mastersStore';

type FormState = {
  name: string;
  sku: string;
  barcode: string;
  customId: string;
  category: string;
  location: string;
  quantity: string;
  reorderPoint: string;
  notes: string;
};

const emptyForm: FormState = {
  name: '',
  sku: '',
  barcode: '',
  customId: '',
  category: '',
  location: '',
  quantity: '0',
  reorderPoint: '5',
  notes: '',
};

function parseQty(raw: string): number {
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { createOrUpdate } = useProducts();
  const { product, loading } = useProduct(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    seedMastersIfEmpty();
    setCategories(getCategories());
    void (async () => {
      try {
        const locs = await getLocations();
        setLocations(locs);
      } catch {
        setLocations(getLocationsCached());
      }
    })();
  }, []);

  useEffect(() => {
    if (isEdit && product) {
      setForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? '',
        customId: product.customId ?? '',
        category: product.category ?? '',
        location: product.location ?? '',
        quantity: String(product.quantity ?? 0),
        reorderPoint: String(product.reorderPoint ?? 0),
        notes: product.notes ?? '',
      });
      return;
    }

    const prefill = (location.state as { prefill?: Partial<Product> })?.prefill;
    if (prefill) {
      setForm((prev) => ({
        ...prev,
        name: prefill.name ?? prev.name,
        sku: prefill.sku ?? prev.sku,
        barcode: prefill.barcode ?? prev.barcode,
        customId: prefill.customId ?? prev.customId,
        category: prefill.category ?? prev.category,
        location: prefill.location ?? prev.location,
        notes: prefill.notes ?? prev.notes,
      }));
    }
  }, [isEdit, product, location.state]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.sku.trim()) {
      setError('Name and SKU are required');
      return;
    }

    setSaving(true);
    try {
      const saved = await createOrUpdate({
        id: isEdit ? id : undefined,
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        customId: form.customId.trim() || undefined,
        category: form.category.trim() || undefined,
        location: form.location.trim() || undefined,
        quantity: parseQty(form.quantity),
        reorderPoint: parseQty(form.reorderPoint),
        notes: form.notes.trim() || undefined,
      });
      navigate(`/products/${saved.id}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const categoryOptions = (() => {
    const names = categories.map((c) => c.name);
    if (form.category && !names.includes(form.category)) {
      return [form.category, ...names];
    }
    return names;
  })();

  const locationOptions = (() => {
    const names = locations.map((l) => l.name);
    if (form.location && !names.includes(form.location)) {
      return [form.location, ...names];
    }
    return names;
  })();

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit product' : 'Add product'}
          </h1>
          {(location.state as { rawQR?: string })?.rawQR && (
            <p className="text-xs text-slate-500">
              Prefilling from QR: {(location.state as { rawQR?: string }).rawQR}
            </p>
          )}
        </div>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Field label="Name *" required>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="input"
            placeholder="Product name"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU *">
            <input
              value={form.sku}
              onChange={(e) => update('sku', e.target.value)}
              className="input"
              placeholder="SKU-001"
              required
            />
          </Field>
          <Field label="Barcode">
            <input
              value={form.barcode}
              onChange={(e) => update('barcode', e.target.value)}
              className="input"
              placeholder="Optional"
            />
          </Field>
        </div>

        <Field label="Custom ID">
          <input
            value={form.customId}
            onChange={(e) => update('customId', e.target.value)}
            className="input"
            placeholder="Internal ID"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="input"
            >
              <option value="">Select category</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                Add categories under Masters
              </p>
            )}
          </Field>
          <Field label="Location">
            <select
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="input"
            >
              <option value="">Select location</option>
              {locationOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {locations.length === 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                Add locations under Masters
              </p>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form.quantity}
              onChange={(e) =>
                update('quantity', e.target.value.replace(/[^0-9.]/g, ''))
              }
              className="input"
              placeholder="0"
            />
          </Field>
          <Field label="Reorder point">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form.reorderPoint}
              onChange={(e) =>
                update('reorderPoint', e.target.value.replace(/[^0-9.]/g, ''))
              }
              className="input"
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className="input min-h-[80px]"
            placeholder="Optional notes"
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
        </button>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        select.input {
          appearance: auto;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
