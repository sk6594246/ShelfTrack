import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, LayoutGrid, ScanLine, Rows3 } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { useInventory } from "@/lib/inventory/store";

const nav = [
  { to: "/", label: "Floor", icon: Rows3 },
  { to: "/catalog", label: "Catalog", icon: LayoutGrid },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/activity", label: "Ledger", icon: ClipboardList },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useInventory.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          className:
            "!bg-popover !text-popover-foreground !border-0 !shadow-[0_0_0_1px_rgb(232_230_223_/_10%)]",
        }}
      />
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Brand />
          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
          </nav>
          <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
            Scan a Shelfmark code to pull the record, then pick or receive without leaving the aisle.
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <Brand compact />
            <Link
              to="/scan"
              className="inline-flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-label="Scan a code"
            >
              <ScanLine className="size-5" />
            </Link>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-4">
          {nav.map((item) => (
            <NavLink key={item.to} {...item} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-baseline gap-2">
      <span className="font-serif text-2xl tracking-tight text-foreground">Shelfmark</span>
      {compact ? null : (
        <span className="text-xs tracking-widest text-muted-foreground uppercase">Workshop</span>
      )}
    </Link>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  mobile = false,
}: {
  to: (typeof nav)[number]["to"];
  label: string;
  icon: typeof ScanLine;
  mobile?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  if (mobile) {
    return (
      <Link
        to={to}
        className={cn(
          "flex h-14 flex-col items-center justify-center gap-1 text-xs tracking-wide",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className={cn("size-4", to === "/scan" && "size-5")} strokeWidth={active ? 2.2 : 1.75} />
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
