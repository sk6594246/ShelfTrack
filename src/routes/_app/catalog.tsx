import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from "@/components/product-form";
import { ProductQr } from "@/components/product-qr";
import { StockBadge } from "@/components/stock-badge";
import { generateSku, useInventory } from "@/lib/inventory/store";
import { CATEGORIES, stockStatus, type Category, type Product } from "@/lib/inventory/types";
import { cn, formatQty } from "@/lib/utils";

type StockFilter = "all" | "low" | "out";

export const Route = createFileRoute("/_app/catalog")({
  component: CatalogPage,
});

function CatalogPage() {
  const products = useInventory((s) => s.products);
  const addProduct = useInventory((s) => s.addProduct);
  const resetDemo = useInventory((s) => s.resetDemo);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (category === "all" ? true : p.category === category))
      .filter((p) => {
        const status = stockStatus(p);
        if (stock === "low") return status !== "ok";
        if (stock === "out") return status === "out";
        return true;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
        );
      });
  }, [products, query, category, stock]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Catalog</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Every marked SKU</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Catalog menu">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  resetDemo();
                  toast.success("Demo workshop restored");
                }}
              >
                Restore demo data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setOpen(true)}>Add SKU</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Add SKU
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, or bin"
            className="pl-10"
            aria-label="Search catalog"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <Chip active={stock === "all"} onClick={() => setStock("all")}>
            Any stock
          </Chip>
          <Chip active={stock === "low"} onClick={() => setStock("low")}>
            Needs restock
          </Chip>
          <Chip active={stock === "out"} onClick={() => setStock("out")}>
            Out
          </Chip>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-card px-6 py-16 text-center shadow-border">
          <p className="font-serif text-xl">No SKUs match</p>
          <p className="mt-1 text-sm text-muted-foreground">Clear filters or add a new product to the catalog.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <CatalogCard key={product.id} product={product} />
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New SKU</DialogTitle>
            <DialogDescription>A QR code is generated from the SKU as soon as you save.</DialogDescription>
          </DialogHeader>
          <ProductForm
            initial={{ sku: generateSku("NEW", products.map((p) => p.sku)), quantity: 0, minQuantity: 2, unit: "ea" }}
            submitLabel="Save SKU"
            onCancel={() => setOpen(false)}
            onSubmit={(draft) => {
              const created = addProduct(draft);
              setOpen(false);
              toast.success(`Added ${created.name}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogCard({ product }: { product: Product }) {
  return (
    <li>
      <Link
        to="/catalog/$id"
        params={{ id: product.id }}
        className="flex gap-3 rounded-2xl bg-card p-3 shadow-border transition-[box-shadow] duration-150 hover:shadow-border-hover"
      >
        <ProductQr sku={product.sku} size={84} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-pretty">{product.name}</p>
            <StockBadge product={product} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          <p className="text-xs text-muted-foreground">{product.location || "No bin"}</p>
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-sm tabular-nums">{formatQty(product.quantity, product.unit)}</span>
            <Badge variant="default">{product.category}</Badge>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-medium transition-colors duration-150",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
