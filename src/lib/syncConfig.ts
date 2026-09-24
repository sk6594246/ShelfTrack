/**
 * Session + D1 API config.
 * After login: tenant + user credentials in localStorage.
 */

const TENANT_KEY = 'shelftrack_tenant';
const PIN_KEY = 'shelftrack_pin';
const USER_KEY = 'shelftrack_user';
const TENANT_ID_KEY = 'shelftrack_tenant_id'; // used by gasApi getTenantId

export type UserSession = {
  tenantId: string;
  pin: string;
  username: string;
  userId: string;
  role: string;
  displayName: string;
  tenantName?: string;
};

export function getSession(): UserSession | null {
  try {
    const tenantId = localStorage.getItem(TENANT_KEY)?.trim() || '';
    const pin = localStorage.getItem(PIN_KEY) || '';
    const raw = localStorage.getItem(USER_KEY);
    if (!tenantId || !pin || !raw) return null;
    const user = JSON.parse(raw) as {
      userId: string;
      username: string;
      role: string;
      displayName: string;
      tenantName?: string;
    };
    if (!user.username || !user.userId) return null;
    return {
      tenantId,
      pin,
      username: user.username,
      userId: user.userId,
      role: user.role || 'worker',
      displayName: user.displayName || user.username,
      tenantName: user.tenantName,
    };
  } catch {
    return null;
  }
}

export function setSession(session: UserSession): void {
  localStorage.setItem(TENANT_KEY, session.tenantId.trim().toLowerCase());
  localStorage.setItem(PIN_KEY, session.pin);
  localStorage.setItem(TENANT_ID_KEY, session.tenantId.trim().toLowerCase());
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: session.userId,
      username: session.username,
      role: session.role,
      displayName: session.displayName,
      tenantName: session.tenantName,
    })
  );
}

export function clearSession(): void {
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TENANT_ID_KEY);
}

export function getD1ApiUrl(): string | undefined {
  const u = import.meta.env.VITE_D1_API_URL as string | undefined;
  if (u && u.startsWith('http')) return u.replace(/\/+$/, '');
  return undefined;
}

export function isLoggedIn(): boolean {
  return Boolean(getSession());
}

export function isD1Enabled(): boolean {
  return Boolean(getD1ApiUrl());
}

export const SYNC_FAIL_HINT =
  'Check Worker URL, D1 binding, and network. Retry in a moment if rate-limited.';

/** Legacy tenant-only config (pre user-session). */
export function getTenantConfig(): { tenantId: string; pin: string } | null {
  try {
    const tenantId =
      localStorage.getItem(TENANT_ID_KEY)?.trim() ||
      localStorage.getItem(TENANT_KEY)?.trim() ||
      '';
    const pin = localStorage.getItem(PIN_KEY) || '';
    if (!tenantId || !pin) return null;
    return { tenantId, pin };
  } catch {
    return null;
  }
}
