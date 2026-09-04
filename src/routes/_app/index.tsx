import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/stock-badge";
import { ProductMark } from "@/components/product-mark";
import { MovementList } from "@/components/movement-list";
import { useInventory } from "@/lib/inventory/store";
import { CATEGORIES, stockStatus } from "@/lib/inventory/types";
import { formatMoney, formatQty } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  component: FloorPage,
});

function FloorPage() {
  const products = useInventory((s) => s.products);
  const movements = useInventory((s) => s.movements);

  const skuCount = products.length;
  const units = products.reduce((sum, p) => sum + p.quantity, 0);
  const value = products.reduce((sum, p) => sum + p.quantity * p.unitCost, 0);
  const low = products.filter((p) => stockStatus(p) !== "ok").sort((a, b) => a.quantity - b.quantity);
  const lowCount = low.length;

  const byCategory = CATEGORIES.map((category) => {
    const items = products.filter((p) => p.category === category);
    const qty = items.reduce((sum, p) => sum + p.quantity, 0);
    return { category, qty, count: items.length };
  }).filter((row) => row.count > 0);
  const maxQty = Math.max(1, ...byCategory.map((r) => r.qty));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Floor check</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">What is on the floor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Identify any marked product with a QR scan, then pick or receive against the live count.
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/scan">
            <ScanLine />
            Identify product
          </Link>
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="SKUs" value={String(skuCount)} />
        <Stat label="Units on hand" value={new Intl.NumberFormat("en-US").format(units)} />
        <Stat label="On-hand value" value={formatMoney(value)} />
        <Stat
          label="Need attention"
          value={String(lowCount)}
          hint={lowCount ? "Below minimum or empty" : "All above minimum"}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-2xl bg-card p-4 shadow-border lg:col-span-3">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl">Needs restock</h2>
            <Link to="/catalog" className="text-sm text-steel hover:text-foreground">
              View catalog
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">Every SKU is at or above its minimum.</p>
          ) : (
            <ul className="divide-y divide-border">
              {low.slice(0, 6).map((product) => (
                <li key={product.id}>
                  <Link
                    to="/catalog/$id"
                    params={{ id: product.id }}
                    className="flex items-center gap-3 py-3 transition-colors hover:text-steel"
                  >
                    <ProductMark category={product.category} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{formatQty(product.quantity, product.unit)}</p>
                      <StockBadge product={product} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-border lg:col-span-2">
          <h2 className="mb-4 text-xl">By category</h2>
          <ul className="flex flex-col gap-3">
            {byCategory.map((row) => (
              <li key={row.category} className="grid gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{row.category}</span>
                  <span className="tabular-nums text-muted-foreground">{row.qty}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-steel/80"
                    style={{ width: `${Math.max(8, (row.qty / maxQty) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl">Recent ledger</h2>
          <Link to="/activity" className="inline-flex items-center gap-1 text-sm text-steel hover:text-foreground">
            Full log
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <MovementList items={movements.slice(0, 6)} />
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-border">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
