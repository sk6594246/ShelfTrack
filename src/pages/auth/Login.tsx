import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LogIn, Loader2 } from 'lucide-react';
import { setSession, isLoggedIn, getD1ApiUrl } from '../../lib/syncConfig';

type TenantOption = { id: string; name: string };

/** Used when Worker has no listTenants yet */
const FALLBACK_TENANTS: TenantOption[] = [
  { id: 'sk_enterprise', name: 'SK Enterprise' },
];

export function Login() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantOption[]>(FALLBACK_TENANTS);
  const [tenantId, setTenantId] = useState(FALLBACK_TENANTS[0]?.id ?? '');
  const [username, setUsername] = useState('sk');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiReady = Boolean(getD1ApiUrl());

  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/', { replace: true });
      return;
    }
    void loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTenants() {
    setLoadingTenants(true);
    const base = getD1ApiUrl();
    if (!base) {
      setTenants(FALLBACK_TENANTS);
      setTenantId(FALLBACK_TENANTS[0]?.id ?? '');
      setLoadingTenants(false);
      return;
    }
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listTenants' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        tenants?: { id?: string; name?: string }[];
        error?: string;
      };
      const list = (data.tenants || [])
        .filter((t) => t && t.id)
        .map((t) => ({
          id: String(t.id).toLowerCase(),
          name: String(t.name || t.id),
        }));
      if (list.length > 0) {
        setTenants(list);
        setTenantId((prev) =>
          list.some((t) => t.id === prev) ? prev : list[0].id
        );
      } else {
        setTenants(FALLBACK_TENANTS);
        setTenantId(FALLBACK_TENANTS[0]?.id ?? '');
      }
    } catch {
      setTenants(FALLBACK_TENANTS);
      setTenantId(FALLBACK_TENANTS[0]?.id ?? '');
    } finally {
      setLoadingTenants(false);
    }
  }

  if (isLoggedIn()) {
    return null;
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    if (!tenantId.trim() || !username.trim() || pin.length < 4) {
      setError('Select a company, enter username and PIN (min 4)');
      return;
    }
    if (!apiReady) {
      setError('API URL not configured (VITE_D1_API_URL)');
      return;
    }
    setBusy(true);
    const tid = tenantId.trim().toLowerCase();
    const uname = username.trim().toLowerCase();
    const selectedName =
      tenants.find((t) => t.id === tid)?.name || tid;
    try {
      const base = getD1ApiUrl()!;

      let data: Record<string, unknown> = {};
      let usedLegacy = false;

      const loginRes = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'loginUser',
          tenantId: tid,
          username: uname,
          pin,
        }),
      });
      data = (await loginRes.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      const errMsg = typeof data.error === 'string' ? data.error : '';
      const needsLegacy =
        !loginRes.ok ||
        errMsg.includes('Unknown action') ||
        errMsg.includes('loginUser');

      if (needsLegacy) {
        const authRes = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'authTenant',
            tenantId: tid,
            pin,
          }),
        });
        data = (await authRes.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!authRes.ok || data.error) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : `Login failed (${authRes.status})`
          );
        }
        usedLegacy = true;
      } else if (data.error) {
        throw new Error(String(data.error));
      }

      setSession({
        tenantId: String(data.tenantId || tid),
        pin,
        username: String(data.username || uname),
        userId: String(
          data.userId || (usedLegacy ? `tenant:${tid}:${uname}` : uname)
        ),
        role: String(data.role || 'admin'),
        displayName: String(data.displayName || data.username || uname),
        tenantName:
          typeof data.tenantName === 'string'
            ? data.tenantName
            : selectedName,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
            <Package className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ShelfTrack
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your company workspace
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm"
        >
          <label className="block text-xs font-medium text-slate-600">
            Company
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={loadingTenants || busy}
              required
            >
              {loadingTenants && (
                <option value="">Loading companies…</option>
              )}
              {!loadingTenants && tenants.length === 0 && (
                <option value="">No companies found</option>
              )}
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Username
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sk"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            PIN
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="min 4 characters"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {!apiReady && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Build with VITE_D1_API_URL pointing at your Worker.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !apiReady || !tenantId || loadingTenants}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Multi-company · each tenant has its own users & data
        </p>
      </div>
    </div>
  );
}
