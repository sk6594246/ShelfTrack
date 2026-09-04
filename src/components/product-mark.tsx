import { Axe, Droplets, Layers, Grip, Nut, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/inventory/types";

const icons: Record<Category, typeof Package> = {
  Cutting: Axe,
  Finish: Droplets,
  Hardware: Nut,
  Abrasives: Layers,
  Workholding: Grip,
  Consumables: Package,
};

export function ProductMark({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  const Icon = icons[category] ?? Package;
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-steel shadow-border",
        className,
      )}
      aria-hidden
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </div>
  );
}
