import { createFileRoute } from "@tanstack/react-router";
import { MovementList } from "@/components/movement-list";
import { useInventory } from "@/lib/inventory/store";

export const Route = createFileRoute("/_app/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const movements = useInventory((s) => s.movements);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Ledger</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Stock movements</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Receives, picks, counts, and new SKUs. Oldest entries drop off after two hundred rows on this device.
        </p>
      </header>
      <MovementList items={movements} />
    </div>
  );
}
