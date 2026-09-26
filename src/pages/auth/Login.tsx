import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LogIn, Loader2, Building2 } from 'lucide-react';
import { setSession, isLoggedIn, getD1ApiUrl } from '../../lib/syncConfig';

type TenantOption = { id: string; name: string };

const FALLBACK_TENANTS: TenantOption[] = [
  { id: 'sk_enterprise', name: 'SK Enterprise' },
];

async function postApi(
  base: string,
  body: Record<string, unknown>,
  retries = 4
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  let lastStatus = 0;
  let lastData: Record<string, unknown> = {};
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      lastStatus = res.status;
      lastData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (
        attempt < retries &&
        (res.status === 403 ||
          res.status === 429 ||
          res.status === 502 ||
          res.status === 503 ||
          res.status === 504)
      ) {
        await new Promise((r) =>
          setTimeout(r, 350 * Math.pow(2, attempt) + Math.floor(Math.random() * 120))
        );
        continue;
      }
      return { ok: res.ok, status: res.status, data: lastData };
    } catch {
      if (attempt >= retries) break;
      await new Promise((r) =>
        setTimeout(r, 350 * Math.pow(2, attempt) + Math.floor(Math.random() * 120))
      );
    }
  }
  return { ok: false, status: lastStatus || 0, data: lastData };
}

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
      const { data } = await postApi(base, { action: 'listTenants' });
      const list = ((data.tenants as { id?: string; name?: string }[]) || [])
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

      const loginAttempt = await postApi(base, {
        action: 'loginUser',
        tenantId: tid,
        username: uname,
        pin,
      });
      data = loginAttempt.data;
      const errMsg = typeof data.error === 'string' ? data.error : '';
      const needsLegacy =
        !loginAttempt.ok ||
        errMsg.includes('Unknown action') ||
        errMsg.includes('loginUser');

      if (needsLegacy) {
        const authAttempt = await postApi(base, {
          action: 'authTenant',
          tenantId: tid,
          pin,
        });
        data = authAttempt.data;
        if (!authAttempt.ok || data.error) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : `Login failed (${authAttempt.status})`
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
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
          <Package className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">ShelfTrack</h1>
        <p className="mt-1 text-sm text-indigo-200/80">Shop-floor login · one company at a time</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-black/40"
      >
        <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Company
        </label>
        <button
          type="button"
          className="mt-1.5 flex w-full items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-3 py-3 text-left"
          disabled={loadingTenants}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">
              {selected?.name || 'Select company'}
            </span>
            <span className="block truncate text-xs text-slate-500">{tenantId}</span>
          </span>
        </button>

        {tenants.length > 1 && (
          <select
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Username
        </label>
        <input
          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          inputMode="text"
        />

        <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> admin</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> manager</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> worker</span>
        </div>

        <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
          PIN
        </label>
        <input
          type="password"
          placeholder="••••"
          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
          inputMode="numeric"
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        {!apiReady && (
          <p className="mt-3 text-xs text-amber-700">
            Build with VITE_D1_API_URL pointing at your Worker.
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !apiReady || !tenantId || loadingTenants}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Sign in · {selected?.name || 'company'}
            </>
          )}
        </button>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Multi-company · data stays inside your firm
        </p>
      </form>
    </div>
  );
}
