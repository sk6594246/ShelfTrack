import type { Product, Location, ProductQRPayload, LocationQRPayload } from '../types/inventory';

export function buildProductQRPayload(product: Product): ProductQRPayload {
  const payload: ProductQRPayload = {
    type: 'product',
    id: product.id,
    sku: product.sku,
    name: product.name,
  };
  if (product.barcode) payload.barcode = product.barcode;
  if (product.customId) payload.customId = product.customId;
  if (product.category) payload.category = product.category;
  return payload;
}

export function buildLocationQRPayload(location: Location): LocationQRPayload {
  const payload: LocationQRPayload = {
    type: 'location',
    id: location.id,
    name: location.name,
  };
  if (location.code) payload.code = location.code;
  return payload;
}

export function payloadToJson(payload: ProductQRPayload | LocationQRPayload): string {
  return JSON.stringify(payload);
}

/** URL for QR image (client-side friendly, no extra dependency) */
export function qrImageUrl(data: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}
