import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cloud, RefreshCw, LogOut, User, UserPlus, Users } from 'lucide-react';
import { ChevronRight, QrCode, Trash2, Moon, Sun, Palette } from 'lucide-react';
import { useQRMapping } from '../../hooks/useQRMapping';
import { mappingSummary } from '../../lib/qr';
import {
  ACCENT_PRESETS,
  getAccent,
  getThemeMode,
  setAccent,
  setThemeMode,
  type ThemeMode,
} from '../../store/themeStore';
import {
  isGasEnabled,
  isD1Enabled,
  getGasWebAppUrl,
  ensureTenant,
} from '../../lib/gasApi';
import { getSession, clearSession } from '../../lib/syncConfig';
import { d1ListUsers, d1RegisterUser } from '../../lib/d1Api';
import { getLocations, getCategories, getPartners } from '../../store/mastersStore';
import { getProducts } from '../../store/inventoryStore';
import { toast } from '../../components/ui/Toast';

export function Settings() {
  const navigate = useNavigate();
  const { config } = useQRMapping();
  const session = getSession();
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());
  const [accent, setAccentState] = useState(() => getAccent());
  const [customHex, setCustomHex] = useState(() => getAccent());
  const gasOn = isGasEnabled();
  const gasUrl = getGasWebAppUrl();
  const [syncing, setSyncing] = useState(false);
  const isAdmin = (session?.role || '').toLowerCase() === 'admin';
  const [people, setPeople] = useState<
    { id: string; username: string; role: string; displayName?: string; active?: boolean }[]
  >([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    pin: '',
    role: 'worker',
    displayName: '',
  });
  const [addingUser, setAddingUser] = useState(false);

  const loadPeople = useCallback(async () => {
    if (!isD1Enabled() || !session) return;
    setPeopleLoading(true);
    setPeopleError(null);
    try {
      const list = await d1ListUsers();
      setPeople(
        (list || []).map((u: any) => ({
          id: String(u.id),
          username: String(u.username || ''),
          role: String(u.role || 'worker'),
          displayName: u.displayName ? String(u.displayName) : undefined,
          active: u.active !== false,
        }))
      );
    } catch (e) {
      setPeopleError(e instanceof Error ? e.message : String(e));
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  async function onAddUser(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!isAdmin) {
      toast('Only admin can add users', 'error');
      return;
    }
    const username = newUser.username.trim().toLowerCase();
    const pin = newUser.pin.trim();
    if (username.length < 2 || pin.length < 4) {
      toast('Username min 2, PIN min 4', 'error');
      return;
    }
    setAddingUser(true);
    try {
      await d1RegisterUser({
        username,
        pin,
        role: newUser.role,
        displayName: newUser.displayName.trim() || username,
      });
      toast(`User @${username} added`, 'success');
      setNewUser({ username: '', pin: '', role: 'worker', displayName: '' });
      await loadPeople();
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setAddingUser(false);
    }
  }

  function clearAllData() {
    if (window.confirm('Delete all products and settings? This cannot be undone.')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  function onMode(next: ThemeMode) {
    setMode(setThemeMode(next));
  }

  function onAccent(hex: string) {
    const v = setAccent(hex);
    setAccentState(v);
    setCustomHex(v);
  }

  return (
    <div className="mx-auto w-full max-w-lg p-4 md:p-6 st-page">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
          Settings
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--st-muted)' }}>
          Company · People · Appearance · Sync · Danger zone
        </p>
      </header>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Company
        </p>
        <div
          className="space-y-3 overflow-hidden rounded-2xl border p-4 shadow-sm"
          style={{
            background: 'var(--st-surface)',
            borderColor: 'var(--st-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'var(--st-primary-soft)', color: 'var(--st-primary)' }}
            >
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold" style={{ color: 'var(--st-text)' }}>
                {session?.displayName || session?.username || '—'}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--st-muted)' }}>
                {session
                  ? `${session.tenantName || session.tenantId} · ${session.role} · @${session.username}`
                  : 'Not signed in'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium"
            style={{
              borderColor: 'var(--st-border)',
              color: 'var(--st-text)',
              background: 'var(--st-surface-2)',
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </section>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          People
        </p>
        <div
          className="space-y-3 overflow-hidden rounded-2xl border p-4 shadow-sm"
          style={{
            background: 'var(--st-surface)',
            borderColor: 'var(--st-border)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: 'var(--st-primary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                Team accounts
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadPeople()}
              className="rounded-lg px-2 py-1 text-xs font-semibold"
              style={{ color: 'var(--st-primary)' }}
            >
              {peopleLoading ? '…' : 'Refresh'}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--st-muted)' }}>
            Admin can add manager / worker logins for the same company. Each person
            signs in with their own username + PIN.
          </p>
          {peopleError && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {peopleError.includes('Unknown action')
                ? 'Worker needs users API — deploy full worker + run users migration.'
                : peopleError}
            </p>
          )}
          {people.length === 0 && !peopleLoading && !peopleError && (
            <p className="text-xs" style={{ color: 'var(--st-muted)' }}>
              No users listed yet. After migration, register people below.
            </p>
          )}
          <ul className="space-y-2">
            {people.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2"
                style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                    {u.displayName || u.username}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--st-muted)' }}>
                    @{u.username} · {u.role}
                    {u.active === false ? ' · inactive' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {isAdmin && (
            <form onSubmit={onAddUser} className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--st-border)' }}>
              <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--st-text)' }}>
                <UserPlus className="h-3.5 w-3.5" /> Add user
              </p>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser((s) => ({ ...s, username: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
                placeholder="Display name (optional)"
                value={newUser.displayName}
                onChange={(e) => setNewUser((s) => ({ ...s, displayName: e.target.value }))}
              />
              <input
                type="password"
                inputMode="numeric"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
                placeholder="PIN (min 4)"
                value={newUser.pin}
                onChange={(e) =>
                  setNewUser((s) => ({ ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 12) }))
                }
              />
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--st-border)', background: 'var(--st-surface-2)', color: 'var(--st-text)' }}
                value={newUser.role}
                onChange={(e) => setNewUser((s) => ({ ...s, role: e.target.value }))}
              >
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={addingUser}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'var(--st-primary)' }}
              >
                {addingUser ? 'Adding…' : 'Create account'}
              </button>
            </form>
          )}
          {!isAdmin && (
            <p className="text-[11px]" style={{ color: 'var(--st-muted)' }}>
              Ask an admin to create accounts for the floor team.
            </p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Appearance
        </p>
        <div
          className="space-y-4 overflow-hidden rounded-2xl border p-4 shadow-sm"
          style={{
            background: 'var(--st-surface)',
            borderColor: 'var(--st-border)',
          }}
        >
          <div>
            <div
              className="mb-2 flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--st-text)' }}
            >
              <Sun className="h-4 w-4" style={{ color: 'var(--st-primary)' }} />
              Day / Night
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onMode('day')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  mode === 'day' ? 'ring-2 ring-offset-0' : ''
                }`}
                style={{
                  borderColor: mode === 'day' ? 'var(--st-primary)' : 'var(--st-border)',
                  background: mode === 'day' ? 'var(--st-primary-soft)' : 'var(--st-surface-2)',
                  color: 'var(--st-text)',
                  boxShadow: mode === 'day' ? '0 0 0 2px var(--st-primary)' : undefined,
                }}
              >
                <Sun className="h-4 w-4" /> Day
              </button>
              <button
                type="button"
                onClick={() => onMode('night')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  mode === 'night' ? 'ring-2 ring-offset-0' : ''
                }`}
                style={{
                  borderColor: mode === 'night' ? 'var(--st-primary)' : 'var(--st-border)',
                  background: mode === 'night' ? 'var(--st-primary-soft)' : 'var(--st-surface-2)',
                  color: 'var(--st-text)',
                  boxShadow: mode === 'night' ? '0 0 0 2px var(--st-primary)' : undefined,
                }}
              >
                <Moon className="h-4 w-4" /> Night
              </button>
            </div>
          </div>
          <div>
            <div
              className="mb-2 flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--st-text)' }}
            >
              <Palette className="h-4 w-4" style={{ color: 'var(--st-primary)' }} />
              Accent
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onAccent(hex)}
                  className="h-9 w-9 rounded-full border-2"
                  style={{
                    background: hex,
                    borderColor: accent === hex ? 'var(--st-text)' : 'transparent',
                  }}
                  aria-label={hex}
                />
              ))}
            </div>
            <input
              type="color"
              value={customHex}
              onChange={(e) => onAccent(e.target.value)}
              className="mt-2 h-10 w-full cursor-pointer rounded-xl"
            />
          </div>
        </div>
      </section>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Scan
        </p>
        <Link
          to="/settings/qr"
          className="flex items-center justify-between rounded-2xl border p-4 shadow-sm"
          style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
        >
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5" style={{ color: 'var(--st-primary)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                QR mapping
              </p>
              <p className="text-xs" style={{ color: 'var(--st-muted)' }}>
                {mappingSummary(config)}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: 'var(--st-muted)' }} />
        </Link>
      </section>

      <section className="mb-6">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Sync
        </p>
        <div
          className="space-y-3 rounded-2xl border p-4 shadow-sm"
          style={{ background: 'var(--st-surface)', borderColor: 'var(--st-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--st-muted)' }}>
            {gasOn ? `Backend: ${gasUrl || 'configured'}` : 'No remote backend configured'}
          </p>
          <button
            type="button"
            disabled={syncing || !gasOn}
            onClick={async () => {
              setSyncing(true);
              try {
                await ensureTenant();
                toast('Synced tenant', 'success');
              } catch (e) {
                toast(e instanceof Error ? e.message : String(e), 'error');
              } finally {
                setSyncing(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--st-primary)' }}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Refresh cloud link'}
          </button>
          <p className="text-[11px]" style={{ color: 'var(--st-muted)' }}>
            Local: {getProducts().length} products · masters load on demand
          </p>
        </div>
      </section>

      <section className="mb-8">
        <p
          className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--st-muted)' }}
        >
          Danger zone
        </p>
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: '#fecaca', background: '#fff1f2' }}
        >
          <button
            type="button"
            onClick={clearAllData}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear device data
          </button>
          <p className="mt-2 text-[11px] text-rose-600/80">
            Removes local cache and session on this device only.
          </p>
        </div>
      </section>
    </div>
  );
}
