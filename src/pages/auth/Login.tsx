import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LogIn, Loader2, Building2 } from 'lucide-react';
import { setSession, isLoggedIn, getD1ApiUrl } from '../../lib/syncConfig';

type TenantOption = { id: string; name: string };

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
  const selected = tenants.find((t) => t.id === tenantId);

  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/', { replace: true });
      return;
    }
    void loadTenants();
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
      };
      const list = (data.tenants || [])
        .filter((t) => t && t.id)
        .map((t) => ({
          id: String(t.id).toLowerCase(),
          name: String(t.name || t.id),
        }));
      if (list.length > 0) {
        setTenants(list);
        setTenantId((prev) => (list.some((t) => t.id === prev) ? prev : list[0].id));
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

  if (isLoggedIn()) return null;

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
    const selectedName = tenants.find((t) => t.id === tid)?.name || tid;
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
      data = (await loginRes.json().catch(() => ({}))) as Record<string, unknown>;
      const errMsg = typeof data.error === 'string' ? data.error : '';
      const needsLegacy =
        !loginRes.ok ||
        errMsg.includes('Unknown action') ||
        errMsg.includes('loginUser');

      if (needsLegacy) {
        const authRes = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'authTenant', tenantId: tid, pin }),
        });
        data = (await authRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (!authRes.ok || data.error) {
          throw new Error(
            typeof data.error === 'string' ? data.error : `Login failed (${authRes.status})`
          );
        }
        usedLegacy = true;
      } else if (data.error) {
        throw new Error(String(data.error));
      }

      try {
        sessionStorage.removeItem('st_shift_splash_shown');
      } catch {
        /* ignore */
      }

      setSession({
        tenantId: String(data.tenantId || tid),
        pin,
        username: String(data.username || uname),
        userId: String(data.userId || (usedLegacy ? `tenant:${tid}:${uname}` : uname)),
        role: String(data.role || 'admin'),
        displayName: String(data.displayName || data.username || uname),
        tenantName:
          typeof data.tenantName === 'string' ? data.tenantName : selectedName,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-900/40">
            <Package className="h-8 w-8" strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ShelfTrack</h1>
          <p className="mt-1 text-sm text-indigo-200/80">Shop-floor login · one company at a time</p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl"
        >
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Company
            </p>
            <div className="space-y-2">
              {loadingTenants && (
                <p className="text-sm text-slate-400">Loading companies…</p>
              )}
              {!loadingTenants &&
                tenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTenantId(t.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition ${
                      tenantId === t.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        tenantId === t.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-400'
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="truncate font-mono text-[11px] text-slate-400">{t.id}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            Username
            <input
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            PIN
            <input
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
          )}

          {!apiReady && (
            <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Build with VITE_D1_API_URL pointing at your Worker.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !apiReady || !tenantId || loadingTenants}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign in{selected ? ` · ${selected.name}` : ''}
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-indigo-200/50">
          Multi-company · data stays inside your firm
        </p>
      </div>
    </div>
  );
}
