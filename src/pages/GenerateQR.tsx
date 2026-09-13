import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Download, Plus, Printer, QrCode, X } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useLocations } from '../hooks/useLocations';
import { useQRMapping } from '../hooks/useQRMapping';
import type { Product } from '../types/inventory';
import { PRODUCT_FIELD_LABELS } from '../types/inventory';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export function GenerateQR() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isProductPage = Boolean(id);
  const { products } = useProducts();
  const { locations } = useLocations();
  const { config } = useQRMapping();

  const [item, setItem] = useState<Product | null>(null);
  const [itemType, setItemType] = useState<'product' | 'location'>('product');
  const [locationValue, setLocationValue] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPrintReady, setIsPrintReady] = useState(false);

  // Load product if ID is provided
  // In a real implementation, we would fetch the product by ID
  // For now, we'll use the first product as demo or allow selection

  // Initialize with first product or location if none selected
  // In a full implementation, we'd have a proper selection mechanism

  const generateQRPayload = () => {
    if (!item && itemType === 'product') return '';
    if (itemType === 'location' && !locationValue) return '';

    let payload: Record<string, any> = {};

    if (itemType === 'product' && item) {
      // Include all relevant product fields based on QR mapping
      if (config.fillFields.includes('sku')) payload.sku = item.sku;
      if (config.fillFields.includes('name')) payload.name = item.name;
      if (config.fillFields.includes('barcode')) payload.barcode = item.barcode || '';
      if (config.fillFields.includes('customId')) payload.customId = item.customId || '';
      if (config.fillFields.includes('category')) payload.category = item.category || '';
      if (config.fillFields.includes('location')) payload.location = item.location || '';
      if (config.fillFields.includes('notes')) payload.notes = item.notes || '';
      // Always include quantity for completeness
      payload.quantity = item.quantity;
    } else if (itemType === 'location') {
      payload.location = locationValue;
      payload.type = 'location';
    }

    return config.payloadParser === 'json' ? JSON.stringify(payload) : Object.values(payload).join(' ');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const payload = generateQRPayload();
    setQrPayload(payload);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = async () => {
    setIsPrintReady(true);
    // Give time for UI to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = document.getElementById('qr-print-area');
    if (!element) return;

    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', [50, 50]); // 50x50mm label size

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('qr-label.pdf');

    setIsPrintReady(false);
  };

  // Auto-generate when item or location changes
  // useEffect(() => {
  //   if (item || (itemType === 'location' && locationValue)) {
  //     handleGenerate();
  //   }
  // }, [item, itemType, locationValue, config]);

  if (isGenerating) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl p-4 md:p-6">
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
            {itemType === 'product' ? 'Generate Product QR' : 'Generate Location QR'}
          </h1>
          <p className="text-sm text-slate-500">
            Generate QR codes for printing and scanning
          </p>
        </div>
      </header>

      {/* Item Selection */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Select Item Type</h2>
        <div className="flex space-x-4">
          <label
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
              itemType === 'product'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } cursor-pointer`}
          >
            <input
              type="radio"
              name="itemType"
              checked={itemType === 'product'}
              onChange={() => {
                setItemType('product');
                setItem(null); // Reset product when switching types
                setIsCopied(false);
              }}
              className="h-4 w-4 text-indigo-600"
            />
            <span>Product</span>
          </label>
          <label
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
              itemType === 'location'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } cursor-pointer`}
          >
            <input
              type="radio"
              name="itemType"
              checked={itemType === 'location'}
              onChange={() => {
                setItemType('location');
                setLocationValue(''); // Reset location when switching types
                setIsCopied(false);
              }}
              className="h-4 w-4 text-indigo-600"
            />
            <span>Location</span>
          </label>
        </div>
      </section>

      {/* Product Selection */}
      {itemType === 'product' && (
        <>
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Select Product</h2>
            <div className="relative">
              <select
                value={item?.id || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedProduct = products.find(p => p.id === selectedId) || null;
                  setItem(selectedProduct);
                  setIsCopied(false);
                }}
                className="select w-full"
                disabled={products.length === 0}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
              {products.length === 0 && (
                <p className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  No products available
                </p>
              )}
            </div>
          </section>

          {item && (
            <section className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Product Details</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                    {item.category && <p className="text-sm text-slate-500">Category: {item.category}</p>}
                    {item.location && <p className="text-sm text-slate-500">Location: {item.location}</p>}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Location Input */}
      {itemType === 'location' && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Enter Location</h2>
          <div className="relative">
            <input
              type="text"
              value={locationValue}
              onChange={(e) => {
                setLocationValue(e.target.value);
                setIsCopied(false);
              }}
              className="input w-full"
              placeholder="e.g., Shelf A1, Bin 5, Zone B"
              required
            />
          </div>
        </section>
      )}

      {/* QR Code Preview and Actions */}
      {((itemType === 'product' && item) || (itemType === 'location' && locationValue)) && (
        <>
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">QR Code Preview</h2>
            <div className="flex items-center justify-center">
              <div id="qr-print-area" className="text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded border">
                  {!qrPayload ? (
                    <div className="text-xs text-slate-400">Generating...</div>
                  ) : (
                    <>
                      {config.payloadParser === 'json' ? (
                        <div className="text-xs text-slate-600 leading-none text-center">
                          {qrPayload.length > 20
                            ? `${qrPayload.substring(0, 20)}...`
                            : qrPayload}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 leading-none text-center">
                          {qrPayload.length > 15
                            ? `${qrPayload.substring(0, 15)}...`
                            : qrPayload}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {config.payloadParser === 'json' ? 'JSON Payload' : 'Plain Text'}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">QR Payload</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Copy className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 mb-1">{qrPayload || 'Generating...'}</p>
                  <p className="text-xs text-slate-500">
                    {config.payloadParser === 'json' ? 'JSON format' : 'Plain text format'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                  disabled={!qrPayload || isCopied}
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                  disabled={!qrPayload || isPrintReady}
                >
                  {isPrintReady ? 'Printing...' : 'Print Label'}
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Help Section */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">How it works</h2>
        <p className="text-sm text-slate-500 mb-2">
          QR codes are generated based on your current <strong>QR Field Mapping</strong> settings.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-start">
            <span className="flex-shrink-0 h-3 w-3 text-indigo-500">•</span>
            <span className="flex-1">
              Payload format: <strong>{config.payloadParser === 'json' ? 'JSON' : 'Plain Text'}</strong>
            </span>
          </div>
          <div class="flex items-start">
            <span className="flex-shrink-0 h-3 w-3 text-indigo-500">•</span>
            <span className="flex-1">
              Lookup by: <strong>{PRODUCT_FIELD_LABELS[config.primaryLookupField]}</strong>
            </span>
          </div>
          <div class="flex items-start">
            <span className="flex-shrink-0 h-3 w-3 text-indigo-500">•</span>
            <span className="flex-1">
              Pre-filled fields: <strong>
                {config.fillFields.length > 0
                  ? config.fillFields.map(f => PRODUCT_FIELD_LABELS[f]).join(', ')
                  : 'None'}
              </strong>
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          <strong>Tip:</strong> Go to Settings → QR Field Mapping to configure which fields are included in the QR code.
        </p>
      </section>
    </div>
  );
}