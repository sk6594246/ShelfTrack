import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { useQRMapping } from '../../hooks/useQRMapping';
import {
  ALL_PRODUCT_FIELDS,
  PRODUCT_FIELD_LABELS,
  type ProductField,
  type QRMappingConfig,
} from '../../types/inventory';
import { mappingSummary } from '../../lib/qr';

export function QRMapping() {
  const navigate = useNavigate();
  const { config, update, loading } = useQRMapping();
  const [draft, setDraft] = useState<QRMappingConfig>(config);
  const [saved, setSaved] = useState(false);

  // Sync draft when real config loads from Google Sheets
  useEffect(() => {
    if (!loading) {
      setDraft(config);
    }
  }, [config, loading]);

  function toggleFillField(field: ProductField) {
    setDraft((prev) => {
      const exists = prev.fillFields.includes(field);
      return {
        ...prev,
        fillFields: exists
          ? prev.fillFields.filter((f) => f !== field)
          : [...prev.fillFields, field],
      };
    });
    setSaved(false);
  }

  async function handleSave() {
    await update(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">QR Field Mapping</h1>
          <p className="text-sm text-slate-500">
            Configure how scanned codes map to product fields
          </p>
        </div>
      </header>

      {/* Live summary */}
      <div className="mb-6 flex items-start gap-3 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{mappingSummary(draft)}</p>
      </div>

      {/* Primary lookup field */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Primary lookup field</h2>
        <p className="mb-3 text-xs text-slate-500">
          When a QR is scanned, the app searches for an existing product using this field.
        </p>
        <div className="space-y-2">
          {ALL_PRODUCT_FIELDS.filter((f) =>
            ['sku', 'barcode', 'customId', 'name'].includes(f)
          ).map((field) => (
            <label
              key={field}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                draft.primaryLookupField === field
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="lookup"
                checked={draft.primaryLookupField === field}
                onChange={() => {
                  setDraft((prev) => ({ ...prev, primaryLookupField: field }));
                  setSaved(false);
                }}
                className="h-4 w-4 text-indigo-600"
              />
              <span
