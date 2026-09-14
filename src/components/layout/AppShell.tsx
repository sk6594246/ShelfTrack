import { NavLink, Outlet } from 'react-router-dom';
import { Home, Package, QrCode, Settings, Database } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/scan', label: 'Scan', icon: QrCode },
  { to: '/masters', label: 'Masters', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200">
            <Package className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-slate-900">
              ShelfTrack
            </span>
            <span className="text-[11px] font-medium text-slate-400">Inventory</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600" />
                  )}
                  <Icon
                    className={`h-5 w-5 shrink-0 transition ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                    strokeWidth={isActive ? 2.25 : 2}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <p className="text-[11px] font-medium text-slate-400">ShelfTrack · local mode</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav className="st-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md md:hidden">
        <div className="flex h-16 items-center justify-around px-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-semibold transition ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-indigo-600" />
                  )}
                  <Icon
                    className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
