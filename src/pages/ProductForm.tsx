import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useProducts, useProduct } from '../hooks/useProducts';
import type { Product } from '../types/inventory';

type FormState = {
  name: string;
  sku: string;
  barcode: string;
  customId: string;
  category: string;
  location: string;
  quantity: number;
  reorderPoint: number;
  notes: string;
};

const emptyForm: FormState = {
  name: '',
  sku: '',
  barcode: '',
  customId: '',
  category: '',
  location: '',
  quantity: 0,
  reorderPoint: 5,
  notes: '',
};

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

  // Prefill from navigation state (coming from Scan) or existing product
  useEffect(() => {
    if (isEdit && product) {
      setForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? '',
        customId: product.customId ?? '',
        category: product.category ?? '',
        location: product.location ?? '',
        quantity: product.quantity,
        reorderPoint: product.reorderPoint,
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

  async function handleSubmit(e: React.FormEvent) {
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
        quantity: Number(form.quantity) || 0,
        reorderPoint: Number(form.reorderPoint) || 0,
        notes: form.notes.trim() || undefined,
      });
      navigate(`/products/${saved.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
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

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <header className="mb-6 flex items-center gap-3">
        <button
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
          {(location.state as any)?.rawQR && (
            <p className="text-xs text-slate-500">
              Prefilling from QR: {(location.state as any).rawQR}
            </p>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
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
            <input
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="input"
              placeholder="e.g. Electronics"
            />
          </Field>
          <Field label="Location">
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="input"
              placeholder="Shelf A1"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => update('quantity', Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Reorder point">
            <input
              type="number"
              min={0}
              value={form.reorderPoint}
              onChange={(e) => update('reorderPoint', Number(e.target.value))}
              className="input"
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
