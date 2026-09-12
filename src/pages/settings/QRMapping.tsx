import { useState } from 'react';
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
  const { config, update } = useQRMapping();
  const [draft, setDraft] = useState<QRMappingConfig>(config);
  const [saved, setSaved] = useState(false);

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
          <p className="text-sm text-slate-500">Configure how scanned codes map to product fields</p>
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
              <span className="font-medium text-slate-800">
                {PRODUCT_FIELD_LABELS[field]}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Prefill fields */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Fields to pre-fill on new product</h2>
        <p className="mb-3 text-xs text-slate-500">
          If no matching product is found, these fields will be filled from the scanned value.
        </p>
        <div className="space-y-2">
          {ALL_PRODUCT_FIELDS.map((field) => (
            <label
              key={field}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                draft.fillFields.includes(field)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={draft.fillFields.includes(field)}
                onChange={() => toggleFillField(field)}
                className="h-4 w-4 rounded text-indigo-600"
              />
              <span className="font-medium text-slate-800">
                {PRODUCT_FIELD_LABELS[field]}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Payload parser */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">QR payload format</h2>
        <div className="space-y-2">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
              draft.payloadParser === 'plain'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <input
              type="radio"
              name="parser"
              checked={draft.payloadParser === 'plain'}
              onChange={() => {
                setDraft((prev) => ({ ...prev, payloadParser: 'plain' }));
                setSaved(false);
              }}
              className="h-4 w-4 text-indigo-600"
            />
            <div>
              <p className="font-medium text-slate-800">Plain text</p>
              <p className="text-xs text-slate-500">
                Entire QR value is used for the selected fields
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
              draft.payloadParser === 'json'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <input
              type="radio"
              name="parser"
              checked={draft.payloadParser === 'json'}
              onChange={() => {
                setDraft((prev) => ({ ...prev, payloadParser: 'json' }));
                setSaved(false);
              }}
              className="h-4 w-4 text-indigo-600"
            />
            <div>
              <p className="font-medium text-slate-800">JSON object</p>
              <p className="text-xs text-slate-500">
                Expects {'{"sku":"...","name":"..."}'} style payload
              </p>
            </div>
          </label>
        </div>
      </section>

      <button
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          'Save mapping'
        )}
      </button>
    </div>
  );
}
