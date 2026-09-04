import { Badge } from "@/components/ui/badge";
import { stockStatus, type Product } from "@/lib/inventory/types";

const copy: Record<ReturnType<typeof stockStatus>, string> = {
  ok: "In stock",
  low: "Low",
  out: "Out",
};

export function StockBadge({ product }: { product: Pick<Product, "quantity" | "minQuantity"> }) {
  const status = stockStatus(product);
  const variant = status === "ok" ? "ok" : status === "low" ? "warn" : "out";
  return <Badge variant={variant}>{copy[status]}</Badge>;
}
