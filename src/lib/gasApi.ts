/**
 * Google Apps Script (GAS) API client
 * Talks to a deployed Web App that uses Google Sheets as the database.
 *
 * Set VITE_GAS_WEB_APP_URL in .env (or fall back to empty = use localStorage only)
 */

const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL as string | undefined;

export function isGasEnabled(): boolean {
  return Boolean(GAS_URL && GAS_URL.startsWith('http'));
}

async function gasRequest<T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  if (!GAS_URL) {
    throw new Error('GAS Web App URL is not configured (VITE_GAS_WEB_APP_URL)');
  }

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight issues with GAS
    body: JSON.stringify({ action, ...payload }),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`GAS request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data as T;
}

// ---------- Products ----------
export async function gasGetProducts() {
  const data = await gasRequest<{ products: any[] }>('getProducts');
  return data.products ?? [];
}

export async function gasGetProduct(id: string) {
  const data = await gasRequest<{ product: any | null }>('getProduct', { id });
  return data.product ?? null;
}

export async function gasSaveProduct(product: Record<string, unknown>) {
  const data = await gasRequest<{ product: any }>('saveProduct', { product });
  return data.product;
}

export async function gasDeleteProduct(id: string) {
  await gasRequest('deleteProduct', { id });
}

// ---------- Stock movements ----------
export async function gasGetMovements(productId?: string) {
  const data = await gasRequest<{ movements: any[] }>('getMovements', {
    productId: productId ?? null,
  });
  return data.movements ?? [];
}

export async function gasAdjustStock(
  productId: string,
  change: number,
  reason?: string
) {
  const data = await gasRequest<{ product: any }>('adjustStock', {
    productId,
    change,
    reason: reason ?? '',
  });
  return data.product;
}

// ---------- QR Mapping ----------
export async function gasGetQRMapping() {
  const data = await gasRequest<{ config: any }>('getQRMapping');
  return data.config;
}

export async function gasSaveQRMapping(config: Record<string, unknown>) {
  await gasRequest('saveQRMapping', { config });
}
