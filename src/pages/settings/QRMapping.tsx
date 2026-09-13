import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Info, Square, ChevronDown } from 'lucide-react';
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
  const [isPayloadParserOpen, setIsPayloadParserOpen] = useState(false);

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

  function togglePayloadParser() {
    setIsPayloadParserOpen(!isPayloadParserOpen);
    setSaved(false);
  }

  function handlePayloadParserChange() {
    setDraft((prev) => ({
      ...prev,
      payloadParser: prev.payloadParser === 'plain' ? 'json' : 'plain',
    }));
    setIsPayloadParserOpen(false);
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
              <span className="flex-1">{PRODUCT_FIELD_LABELS[field]}</span>
              {draft.primaryLookupField === field && (
                <Check className="h-4 w-4 text-indigo-600" />
              )}
            </label>
          ))}
        </div>
      </section>

      {/* Fields to pre-fill */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Fields to pre-fill</h2>
        <p className="mb-3 text-xs text-slate-500">
          When no product is found, these form fields receive the scanned value.
          <br />
          <span className="text-xs text-indigo-500">
            Mandatory fields for new products: Name, SKU
          </span>
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
                onChange={() => {
                  toggleFillField(field);
                }}
                className="h-4 w-4 text-indigo-600"
              />
              <span className="flex-1">{PRODUCT_FIELD_LABELS[field]}</span>
              {draft.fillFields.includes(field) && (
                <Check className="h-4 w-4 text-indigo-600" />
              )}
            </label>
          ))}
        </div>
      </section>

      {/* Payload format */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Payload format</h2>
        <p className="mb-3 text-xs text-slate-500">
          How to interpret the QR payload when scanning.
        </p>
        <div className="relative">
          <button
            onClick={togglePayloadParser}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
              isPayloadParserOpen
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex-1">
              <span className="text-sm font-medium">
                {draft.payloadParser === 'json' ? 'JSON (Recommended)' : 'Plain Text'}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {draft.payloadParser === 'json'
                  ? 'Expects object like {"sku":"ABC-123","name":"Widget"}'
                  : 'Entire QR string is written into selected fill fields'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-indigo-600 transition-transform duration-200 ${
              isPayloadParserOpen ? 'rotate-180' : ''
            }" />
          </button>

          {isPayloadParserOpen && (
            <div className="mt-2 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-indigo-100">Current format:</label>
                <p className="text-xs text-indigo-50">
                  {draft.payloadParser === 'json'
                    ? '{"sku":"SKU123","name":"Product","category":"Electronics","location":"Shelf A1"}'
                    : 'SKU123 Product Electronics Shelf A1'}
                </p>
              </div>
              <button
                onClick={handlePayloadParserChange}
                className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-indigo-100 bg-indigo-100 hover:bg-indigo-200"
              >
                Switch to {draft.payloadParser === 'json' ? 'Plain Text' : 'JSON'}
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end space-x-3">
        <button
          onClick={() => navigate('/settings')}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${
            loading ? 'opacity-50' : ''
          }`}
        >
          {saving ? 'Saving…' : 'Save Mapping'}
        </button>
      </div>

      {saved && (
        <p className="mt-4 text-xs text-green-600 text-center">
          Mapping saved successfully!
        </p>
      )}
    </div>
  );
}