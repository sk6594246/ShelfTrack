/**
 * Cloudflare D1 Worker API client (multi-tenant + user auth).
 * Requires VITE_D1_API_URL + logged-in session in localStorage.
 */

import {
  getD1ApiUrl,
  getSession,
  getTenantConfig,
  isD1Enabled,
  setSession,
  SYNC_FAIL_HINT,
  type UserSession,
} from './syncConfig';

export { isD1Enabled, SYNC_FAIL_HINT };

async function d1Request<
  T
>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const base = getD1ApiUrl();
  if (!base) throw new Error('D1 API URL not configured (VITE_D1_API_URL)');

  const session = getSession();
  const body: Record<string, unknown> = { action, ...payload };

  if (session) {
    if (body.tenantId == null) body.tenantId = session.tenantId;
    if (body.pin == null) body.pin = session.pin;
    if (body.username == null) body.username = session.username;
  } else {
    const tenant = getTenantConfig();
    if (tenant && body.tenantId == null) {
      body.tenantId = tenant.tenantId;
      body.pin = tenant.pin;
    }
  }

  let res: Response | null = null;
  let lastErr: unknown;
  const retries = 4;
  const baseMs = 350;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (
        attempt < retries &&
        (res.status === 403 ||
          res.status === 429 ||
          res.status === 502 ||
          res.status === 503 ||
          res.status === 504)
      ) {
        await new Promise((r) =>
          setTimeout(r, baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120))
        );
        continue;
      }
      break;
    } catch (e) {
      lastErr = e;
      if (attempt >= retries) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`${SYNC_FAIL_HINT} (${msg})`);
      }
      await new Promise((r) =>
        setTimeout(r, baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120))
      );
    }
  }
  if (!res) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr || 'network');
    throw new Error(`${SYNC_FAIL_HINT} (${msg})`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(
      data.error
        ? `${data.error}. ${SYNC_FAIL_HINT}`
        : `D1 request failed (${res.status}). ${SYNC_FAIL_HINT}`
    );
  }
  return data as T;
}

export async function d1LoginUser(
  tenantId: string,
  username: string,
  pin: string
): Promise<UserSession> {
  const data = await d1Request<{
    ok: boolean;
    tenantId: string;
    tenantName?: string;
    userId: string;
    username: string;
    role: string;
    displayName: string;
  }>('loginUser', {
    tenantId: tenantId.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
    pin,
  });

  const session: UserSession = {
    tenantId: data.tenantId,
    pin,
    username: data.username,
    userId: data.userId,
    role: data.role || 'worker',
    displayName: data.displayName || data.username,
    tenantName: data.tenantName,
  };
  setSession(session);
  return session;
}

export async function d1RegisterTenant(
  tenantId: string,
  name: string,
  pin: string,
  adminUsername = 'admin',
  registerSecret?: string
) {
  return d1Request<{
    ok: boolean;
    tenantId: string;
    adminUser?: { id: string; username: string; role: string };
  }>('registerTenant', {
    tenantId,
    name,
    pin,
    adminUsername,
    registerSecret,
  });
}

export async function d1AuthTenant(tenantId: string, pin: string) {
  return d1Request<{ ok: boolean }>('authTenant', { tenantId, pin });
}

export async function d1RegisterUser(payload: {
  username: string;
  pin: string;
  role?: string;
  displayName?: string;
}) {
  return d1Request<{
    ok: boolean;
    user: { id: string; username: string; role: string; displayName: string };
  }>('registerUser', payload);
}

export async function d1ListUsers() {
  const data = await d1Request<{ users: any[] }>('listUsers');
  return data.users ?? [];
}

export async function d1PullSnapshot() {
  const data = await d1Request<{ snapshot: Record<string, unknown> }>('pullSnapshot');
  return data.snapshot;
}

export async function d1PushSnapshot(snapshot: Record<string, unknown>) {
  await d1Request('pushSnapshot', { snapshot });
}

export async function d1GetProducts() {
  const data = await d1Request<{ products: any[] }>('getProducts');
  return data.products ?? [];
}

export async function d1SaveProduct(product: Record<string, unknown>) {
  const data = await d1Request<{ product: any }>('saveProduct', { product });
  return data.product;
}

export async function d1DeleteProduct(id: string) {
  await d1Request('deleteProduct', { id });
}

export async function d1GetLocations() {
  const data = await d1Request<{ locations: any[] }>('getLocations');
  return data.locations ?? [];
}

export async function d1SaveLocation(location: Record<string, unknown>) {
  const data = await d1Request<{ location: any }>('saveLocation', { location });
  return data.location;
}

export async function d1GetCategories() {
  const data = await d1Request<{ categories: any[] }>('getCategories');
  return data.categories ?? [];
}

export async function d1SaveCategory(category: Record<string, unknown>) {
  const data = await d1Request<{ category: any }>('saveCategory', { category });
  return data.category;
}

export async function d1GetPartners() {
  const data = await d1Request<{ partners: any[] }>('getPartners');
  return data.partners ?? [];
}

export async function d1SavePartner(partner: Record<string, unknown>) {
  const data = await d1Request<{ partner: any }>('savePartner', { partner });
  return data.partner;
}
