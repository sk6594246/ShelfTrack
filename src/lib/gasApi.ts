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

export function isD1Enabled(): boolean {
  return Boolean(D1_URL && D1_URL.startsWith('http'));
}

export function isGasEnabled(): boolean {
  // Prefer D1 when both are configured
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

async function backendRequest<T>(
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
    // Attach user credentials when logged in (Worker requireUser / requireTenant)
    if (session) {
      if (body.username == null) body.username = session.username;
      if (body.pin == null) body.pin = session.pin;
    }
    const res = await fetch(D1_URL!, {
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

  const res = await fetch(GAS_URL, {
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

/** Ensure default tenant exists on D1 (no-op for GAS). */
export async function ensureTenant(): Promise<string> {
  if (!isD1Enabled()) return getTenantId();
  // If logged in, just return session tenant — no anonymous ensure
  const session = getSession();
  if (session?.tenantId) return session.tenantId;
  const data = await backendRequest<{ tenantId?: string }>('ensureTenant');
  if (data.tenantId) setTenantId(data.tenantId);
  return getTenantId();
}

// ---------- Products ----------
export async function gasGetProducts() {
  const data = await backendRequest<{ products: any[] }>('getProducts');
  return data.products ?? [];
}

export async function gasGetProduct(id: string) {
  const data = await backendRequest<{ product: any | null }>('getProduct', {
    id,
  });
  return data.product ?? null;
}

export async function gasSaveProduct(product: Record<string, unknown>) {
  const data = await backendRequest<{ product: any }>('saveProduct', {
    product,
  });
  return data.product;
}

export async function gasDeleteProduct(id: string) {
  await backendRequest('deleteProduct', { id });
}

// ---------- Stock movements ----------
export async function gasGetMovements(productId?: string) {
  const data = await backendRequest<{ movements: any[] }>('getMovements', {
    productId: productId ?? null,
  });
  return data.movements ?? [];
}

export async function gasAdjustStock(
  productId: string,
  change: number,
  reason?: string,
  sku?: string
) {
  const data = await backendRequest<{ product: any }>('adjustStock', {
    productId,
    change,
    reason: reason ?? '',
    sku: sku ?? null,
  });
  return data.product;
}

// ---------- QR Mapping ----------
export async function gasGetQRMapping() {
  const data = await backendRequest<{ config: any }>('getQRMapping');
  return data.config;
}

export async function gasSaveQRMapping(config: Record<string, unknown>) {
  await backendRequest('saveQRMapping', { config });
}

// ---------- Locations ----------
export type GasLocation = {
  id: string;
  name: string;
  code?: string;
  notes?: string;
  gridRow?: number;
  gridCol?: number;
  shelf?: number;
  mapPosition?: string;
  maxQty?: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function gasGetLocations(): Promise<GasLocation[]> {
  const data = await backendRequest<{ locations: GasLocation[] }>(
    'getLocations'
  );
  return data.locations ?? [];
}

export async function gasSaveLocation(
  location: Record<string, unknown>
): Promise<GasLocation> {
  const data = await backendRequest<{ location: GasLocation }>('saveLocation', {
    location,
  });
  return data.location;
}

export async function gasDeleteLocation(id: string): Promise<void> {
  await backendRequest('deleteLocation', { id });
}

export type GasLocationProduct = {
  locationId: string;
  productId: string;
  /** Space multiplier (default 1). effectiveSpace = qty * weightage */
  weightage?: number;
};

export async function gasGetLocationProducts(
  locationId?: string
): Promise<GasLocationProduct[]> {
  const data = await backendRequest<{ links: GasLocationProduct[] }>(
    'getLocationProducts',
    { locationId: locationId ?? null }
  );
  return data.links ?? [];
}

/**
 * Set products assigned to a location.
 * Prefer `links` when weightage is needed; productIds alone is still supported.
 */
export async function gasSetLocationProducts(
  locationId: string,
  productIds: string[],
  links?: GasLocationProduct[]
): Promise<void> {
  await backendRequest('setLocationProducts', {
    locationId,
    productIds,
    links: links ?? null,
  });
}

// ---------- Categories ----------
export type GasCategory = {
  id: string;
  name: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function gasGetCategories(): Promise<GasCategory[]> {
  const data = await backendRequest<{ categories: GasCategory[] }>(
    'getCategories'
  );
  return data.categories ?? [];
}

export async function gasSaveCategory(
  category: Record<string, unknown>
): Promise<GasCategory> {
  const data = await backendRequest<{ category: GasCategory }>('saveCategory', {
    category,
  });
  return data.category;
}

export async function gasDeleteCategory(id: string): Promise<void> {
  await backendRequest('deleteCategory', { id });
}

// ---------- Partners ----------
export type GasPartner = {
  id: string;
  name: string;
  code?: string;
  /** Comma-separated roles e.g. "supplier,customer" */
  roles?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function gasGetPartners(): Promise<GasPartner[]> {
  const data = await backendRequest<{ partners: GasPartner[] }>('getPartners');
  return data.partners ?? [];
}

export async function gasSavePartner(
  partner: Record<string, unknown>
): Promise<GasPartner> {
  const data = await backendRequest<{ partner: GasPartner }>('savePartner', {
    partner,
  });
  return data.partner;
}

export async function gasDeletePartner(id: string): Promise<void> {
  await backendRequest('deletePartner', { id });
}

export type GasPartnerProduct = {
  partnerId: string;
  productId: string;
  role: string;
};

export async function gasGetPartnerProducts(
  partnerId?: string
): Promise<GasPartnerProduct[]> {
  const data = await backendRequest<{ links: GasPartnerProduct[] }>(
    'getPartnerProducts',
    { partnerId: partnerId ?? null }
  );
  return data.links ?? [];
}

export async function gasSetPartnerProducts(
  partnerId: string,
  links: GasPartnerProduct[]
): Promise<void> {
  await backendRequest('setPartnerProducts', { partnerId, links });
}
