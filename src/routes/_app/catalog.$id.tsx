import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/product-form";
import { ProductQr, qrDataUrl } from "@/components/product-qr";
import { StockActions } from "@/components/stock-actions";
import { StockBadge } from "@/components/stock-badge";
import { Badge } from "@/components/ui/badge";
import { MovementList } from "@/components/movement-list";
import { useInventory } from "@/lib/inventory/store";
import { formatMoney, formatQty } from "@/lib/utils";

export const Route = createFileRoute("/_app/catalog/$id")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const product = useInventory((s) => s.products.find((p) => p.id === id));
  const movements = useInventory((s) => s.movements.filter((m) => m.productId === id));
  const updateProduct = useInventory((s) => s.updateProduct);
  const deleteProduct = useInventory((s) => s.deleteProduct);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!product) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-3xl">SKU not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed from the catalog.</p>
        <Button asChild className="mt-6">
          <Link to="/catalog">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  const sku = product.sku;
  const record = product;

  async function downloadQr() {
    const url = await qrDataUrl(sku, 720);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sku}.png`;
    a.click();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          to="/catalog"
          className="inline-flex h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Catalog
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{record.category}</Badge>
              <StockBadge product={record} />
            </div>
            <h1 className="text-3xl sm:text-4xl">{record.name}</h1>
            <p className="font-mono text-sm text-muted-foreground">{sku}</p>
            <p className="text-sm text-muted-foreground">{record.location || "No bin assigned"}</p>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-card p-4 shadow-border">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">On hand</p>
              <p className="mt-2 font-serif text-3xl tabular-nums">{formatQty(record.quantity, record.unit)}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-border">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Minimum</p>
              <p className="mt-2 font-serif text-3xl tabular-nums">{record.minQuantity}</p>
            </div>
            <div className="col-span-2 rounded-2xl bg-card p-4 shadow-border sm:col-span-1">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Line value</p>
              <p className="mt-2 font-serif text-3xl tabular-nums">
                {formatMoney(record.quantity * record.unitCost)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-border">
            <h2 className="mb-3 text-xl">Pick or receive</h2>
            <StockActions product={record} />
          </div>

          {record.notes ? (
            <div className="rounded-2xl bg-card p-4 shadow-border">
              <h2 className="mb-2 text-xl">Notes</h2>
              <p className="text-sm text-pretty text-muted-foreground">{record.notes}</p>
            </div>
          ) : null}

          <div>
            <h2 className="mb-3 text-xl">Ledger</h2>
            <MovementList items={movements.slice(0, 12)} />
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-border">
          <div className="flex justify-center rounded-xl bg-paper p-3">
            <ProductQr sku={sku} size={220} />
          </div>
          <p className="text-center font-mono text-xs text-muted-foreground">shelfmark:{sku}</p>
          {record.lastIdentifiedAt ? (
            <p className="text-center text-xs text-muted-foreground">
              Last identified {formatDistanceToNow(new Date(record.lastIdentifiedAt), { addSuffix: true })}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">Not yet identified by scan</p>
          )}
          <Button variant="outline" onClick={() => void downloadQr()}>
            <Download />
            Download QR
          </Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil />
            Edit
          </Button>
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Remove SKU
          </Button>
        </aside>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SKU</DialogTitle>
            <DialogDescription>The QR payload stays tied to this SKU.</DialogDescription>
          </DialogHeader>
          <ProductForm
            initial={record}
            skuLocked
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={(draft) => {
              updateProduct(record.id, draft);
              setEditing(false);
              toast.success("Record updated");
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this SKU?</DialogTitle>
            <DialogDescription>
              {record.name} and its ledger entries will be deleted from this device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteProduct(record.id);
                toast.success("SKU removed");
                void navigate({ to: "/catalog" });
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
