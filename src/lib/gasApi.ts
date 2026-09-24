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
    // Attach user credentials when logged in (Worker requireUser / requireTenant)
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
