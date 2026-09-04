import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, RotateCcw } from "lucide-react";
import { QrScanner } from "@/components/qr-scanner";
import { ProductQr, qrDataUrl } from "@/components/product-qr";
import { ProductMark } from "@/components/product-mark";
import { StockBadge } from "@/components/stock-badge";
import { StockActions } from "@/components/stock-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductForm } from "@/components/product-form";
import { decodeQrFromDataUrl } from "@/lib/inventory/qr";
import { generateSku, useInventory } from "@/lib/inventory/store";
import { payloadForSku, type Product } from "@/lib/inventory/types";
import { formatQty } from "@/lib/utils";

export const Route = createFileRoute("/_app/scan")({
  component: ScanPage,
});

function ScanPage() {
  const products = useInventory((s) => s.products);
  const identifyByCode = useInventory((s) => s.identifyByCode);
  const addProduct = useInventory((s) => s.addProduct);
  const [identifiedId, setIdentifiedId] = useState<string | null>(null);
  const identified = useInventory((s) => s.products.find((p) => p.id === identifiedId) ?? null);
  const [unknownSku, setUnknownSku] = useState<string | null>(null);
  const [unknownOpen, setUnknownOpen] = useState(false);
  const [lastRaw, setLastRaw] = useState<string | null>(null);

  const samples = useMemo(
    () => products.filter((p) => ["prd_pln_004", "prd_saw_014", "prd_oil_500", "prd_shl_090"].includes(p.id)),
    [products],
  );

  function handleDetect(raw: string) {
    if (raw === lastRaw) return;
    const { product, sku } = identifyByCode(raw);
    setLastRaw(raw);
    if (product) {
      setIdentifiedId(product.id);
      setUnknownSku(null);
      toast.success(`Identified ${product.name}`);
      return;
    }
    setIdentifiedId(null);
    setUnknownSku(sku || raw);
    setUnknownOpen(true);
  }

  async function identifyFromSample(product: Product) {
    try {
      const url = await qrDataUrl(product.sku, 280);
      const decoded = await decodeQrFromDataUrl(url);
      handleDetect(decoded ?? payloadForSku(product.sku));
    } catch {
      handleDetect(payloadForSku(product.sku));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-xl">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Identify</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Scan a Shelfmark code</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Point the camera at a product QR, upload a photo, or type the SKU. Matching records open with pick and receive.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <QrScanner onDetect={handleDetect} paused={Boolean(identified)} />

        <div className="rounded-2xl bg-card p-4 shadow-border">
          {identified ? (
            <IdentifiedCard
              product={identified}
              onAgain={() => {
                setIdentifiedId(null);
                setLastRaw(null);
              }}
            />
          ) : (
            <div className="flex min-h-64 flex-col justify-center gap-2 px-1 py-6 text-center">
              <p className="font-serif text-xl">Waiting for a code</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Each catalog item carries a unique QR encoding <span className="font-mono text-foreground">shelfmark:SKU</span>.
                Sample codes below run through the same reader.
              </p>
            </div>
          )}
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl">Sample codes</h2>
          <p className="text-xs text-muted-foreground">Tap a code to identify it</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {samples.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => void identifyFromSample(product)}
                className="flex w-full flex-col items-center gap-2 rounded-2xl bg-card p-3 text-left shadow-border transition-[box-shadow] duration-150 hover:shadow-border-hover"
              >
                <ProductQr sku={product.sku} size={112} />
                <span className="w-full truncate text-center text-xs text-foreground">{product.name}</span>
                <span className="font-mono text-[0.6875rem] text-muted-foreground">{product.sku}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={unknownOpen} onOpenChange={setUnknownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unknown code</DialogTitle>
            <DialogDescription>
              No catalog item matches{" "}
              <span className="font-mono text-foreground">{unknownSku}</span>. Add it as a new SKU, or try another code.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            initial={{
              sku: unknownSku?.startsWith("SM-")
                ? unknownSku
                : generateSku(unknownSku ?? "NEW", products.map((p) => p.sku)),
              name: "",
              quantity: 0,
              minQuantity: 2,
              unit: "ea",
              unitCost: 0,
              notes: unknownSku ? `Imported from code ${unknownSku}` : "",
            }}
            submitLabel="Add to catalog"
            onCancel={() => setUnknownOpen(false)}
            onSubmit={(draft) => {
              const created = addProduct(draft);
              setUnknownOpen(false);
              setIdentifiedId(created.id);
              toast.success(`Added ${created.name}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IdentifiedCard({ product, onAgain }: { product: Product; onAgain: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <ProductMark category={product.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl">{product.name}</h2>
            <StockBadge product={product} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          <p className="mt-1 text-sm text-muted-foreground">{product.location || "No bin assigned"}</p>
        </div>
        <ProductQr sku={product.sku} size={72} className="hidden sm:block" />
      </div>
      <p className="font-serif text-4xl tabular-nums tracking-tight">
        {formatQty(product.quantity, product.unit)}
      </p>
      <StockActions product={product} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onAgain}>
          <RotateCcw />
          Scan again
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/catalog/$id" params={{ id: product.id }}>
            Open record
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
