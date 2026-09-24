/**
 * ShelfTrack backend API client
 *
 * Prefer Cloudflare D1 Worker when VITE_D1_API_URL is set.
 * Fall back to Google Apps Script when VITE_GAS_WEB_APP_URL is set.
 * If neither is set, callers should use localStorage only.
 *
 * D1 Worker: POST { action, tenantId, username?, pin?, ...payload }
 * After login, session credentials are attached automatically.
 */

import { getSession } from './syncConfig';

const D1_URL = import.meta.env.VITE_D1_API_URL as string | undefined;
const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL as string | undefined;

const DEFAULT_TENANT_ID = 'default';
const TENANT_KEY = 'shelftrack_tenant_id';

/** Retry transient Cloudflare / network failures (403 rate, 429, 5xx, network). */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { retries?: number; baseMs?: number }
): Promise<Response> {
  const retries = opts?.retries ?? 4;
  const baseMs = opts?.baseMs ?? 350;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (
        attempt < retries &&
        (res.status === 403 ||
          res.status === 429 ||
          res.status === 502 ||
          res.status === 503 ||
          res.status === 504)
      ) {
        const delay = baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt >= retries) break;
      const delay = baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error('Network request failed after retries');
}

export function isD1Enabled(): boolean {
  return Boolean(D1_URL && D1_URL.startsWith('http'));
}

export function isGasEnabled(): boolean {
  if (isD1Enabled()) return true;
  return Boolean(GAS_URL && GAS_URL.startsWith('http'));
}

export function getBackendUrl(): string {
  if (isD1Enabled()) return D1_URL!;
  if (GAS_URL && GAS_URL.startsWith('http')) return GAS_URL;
  return '';
}

/** @deprecated use getBackendUrl — kept for Settings UI compatibility */
export function getGasWebAppUrl(): string {
  return getBackendUrl();
}

export function getTenantId(): string {
  try {
    const session = getSession();
    if (session?.tenantId) return session.tenantId;
    const stored = localStorage.getItem(TENANT_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    /* ignore */
  }
  return DEFAULT_TENANT_ID;
}

export function setTenantId(id: string): void {
  try {
    localStorage.setItem(TENANT_KEY, id);
  } catch {
    /* ignore */
  }
}

async function backendRequest<
  T
>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  if (isD1Enabled()) {
    const session = getSession();
    const body: Record<string, unknown> = {
      action,
      tenantId: session?.tenantId || getTenantId(),
      ...payload,
    };
    if (session) {
      if (body.username == null) body.username = session.username;
      if (body.pin == null) body.pin = session.pin;
    }
    const res = await fetchWithRetry(D1_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`D1 API failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data as T;
  }

  if (!GAS_URL) {
    throw new Error(
      'No backend configured. Set VITE_D1_API_URL or VITE_GAS_WEB_APP_URL.'
    );
  }

  const res = await fetchWithRetry(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`GAS request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as T;
}

export async function ensureTenant(): Promise<string> {
  if (!isD1Enabled()) return getTenantId();
  const session = getSession();
  if (session?.tenantId) return session.tenantId;
  const data = await backendRequest<{ tenantId?: string }>('ensureTenant');
  if (data.tenantId) setTenantId(data.tenantId);
  return getTenantId();
}

export async function gasGetProducts() {
  const data = await backendRequest<{ products?: unknown[] }>('getProducts');
  return data.products || [];
}

export async function gasGetProduct(id: string) {
  const data = await backendRequest<{ product?: unknown }>('getProduct', { id });
  return data.product;
}

export async function gasSaveProduct(product: Record<string, unknown>) {
  return backendRequest('saveProduct', { product });
}

export async function gasDeleteProduct(id: string) {
  return backendRequest('deleteProduct', { id });
}

export async function gasGetMovements(productId?: string) {
  const data = await backendRequest<{ movements?: unknown[] }>('getMovements', {
    productId,
  });
  return data.movements || [];
}

export async function gasAdjustStock(
  productId: string,
  change: number,
  reason?: string
) {
  return backendRequest('adjustStock', { productId, change, reason });
}

export async function gasGetQRMapping() {
  return backendRequest('getQRMapping');
}

export async function gasSaveQRMapping(config: Record<string, unknown>) {
  return backendRequest('saveQRMapping', { config });
}

export type GasLocation = {
  id: string;
  name: string;
  code?: string;
  mapPosition?: string;
  gridRow?: number;
  gridCol?: number;
  shelf?: number;
  maxQty?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function gasGetLocations(): Promise<GasLocation[]> {
  const data = await backendRequest<{ locations?: GasLocation[] }>('getLocations');
  return data.locations || [];
}

export async function gasSaveLocation(
  location: Record<string, unknown>
): Promise<GasLocation> {
  const data = await backendRequest<{ location?: GasLocation }>('saveLocation', {
    location,
  });
  return data.location as GasLocation;
}

export async function gasDeleteLocation(id: string): Promise<void> {
  await backendRequest('deleteLocation', { id });
}

export type GasLocationProduct = {
  locationId: string;
  productId: string;
  weightage?: number;
};

export async function gasGetLocationProducts(
  locationId?: string
): Promise<GasLocationProduct[]> {
  const data = await backendRequest<{ links?: GasLocationProduct[] }>(
    'getLocationProducts',
    { locationId }
  );
  return data.links || [];
}

export async function gasSetLocationProducts(
  locationId: string,
  links: { productId: string; weightage?: number }[]
): Promise<void> {
  await backendRequest('setLocationProducts', { locationId, links });
}

export type GasCategory = {
  id: string;
  name: string;
  notes?: string;
  skuMode?: string;
  skuPrefix?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function gasGetCategories(): Promise<GasCategory[]> {
  const data = await backendRequest<{ categories?: GasCategory[] }>('getCategories');
  return data.categories || [];
}

export async function gasSaveCategory(
  category: Record<string, unknown>
): Promise<GasCategory> {
  const data = await backendRequest<{ category?: GasCategory }>('saveCategory', {
    category,
  });
  return data.category as GasCategory;
}

export async function gasDeleteCategory(id: string): Promise<void> {
  await backendRequest('deleteCategory', { id });
}

export type GasPartner = {
  id: string;
  name: string;
  code?: string;
  roles?: string[];
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function gasGetPartners(): Promise<GasPartner[]> {
  const data = await backendRequest<{ partners?: GasPartner[] }>('getPartners');
  return data.partners || [];
}

export async function gasSavePartner(
  partner: Record<string, unknown>
): Promise<GasPartner> {
  const data = await backendRequest<{ partner?: GasPartner }>('savePartner', {
    partner,
  });
  return data.partner as GasPartner;
}

export async function gasDeletePartner(id: string): Promise<void> {
  await backendRequest('deletePartner', { id });
}

export type GasPartnerProduct = {
  partnerId: string;
  productId: string;
};

export async function gasGetPartnerProducts(
  partnerId?: string
): Promise<GasPartnerProduct[]> {
  const data = await backendRequest<{ links?: GasPartnerProduct[] }>(
    'getPartnerProducts',
    { partnerId }
  );
  return data.links || [];
}

export async function gasSetPartnerProducts(
  partnerId: string,
  productIds: string[]
): Promise<void> {
  await backendRequest('setPartnerProducts', { partnerId, productIds });
}
