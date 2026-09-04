import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/lib/inventory/store";
import { formatQty } from "@/lib/utils";
import type { Product } from "@/lib/inventory/types";

export function StockActions({ product, compact = false }: { product: Product; compact?: boolean }) {
  const adjustStock = useInventory((s) => s.adjustStock);
  const [amount, setAmount] = useState(1);
  const qty = Math.max(1, Math.round(amount) || 1);

  function receive() {
    const next = adjustStock(product.id, qty, "receive");
    if (next) toast.success(`Received ${formatQty(qty, product.unit)}`);
  }

  function pick() {
    if (product.quantity <= 0) {
      toast.error("Nothing on the floor.");
      return;
    }
    const next = adjustStock(product.id, -Math.min(qty, product.quantity), "pick");
    if (next) toast.success(`Picked ${formatQty(Math.min(qty, product.quantity), product.unit)}`);
  }

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={pick} className="flex-1">
          <Minus />
          Pick
        </Button>
        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="Quantity"
          className="h-11 w-16 px-2 text-center tabular-nums"
        />
        <Button type="button" size={compact ? "sm" : "default"} onClick={receive} className="flex-1">
          <Plus />
          Receive
        </Button>
      </div>
    </div>
  );
}
