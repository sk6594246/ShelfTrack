import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, type Category, type Product, type ProductDraft } from "@/lib/inventory/types";

type ProductFormProps = {
  initial?: Partial<Product>;
  skuLocked?: boolean;
  submitLabel: string;
  onSubmit: (draft: ProductDraft) => void;
  onCancel?: () => void;
};

export function ProductForm({ initial, skuLocked, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>({
    sku: initial?.sku ?? "",
    name: initial?.name ?? "",
    category: (initial?.category as Category) ?? "Consumables",
    location: initial?.location ?? "",
    quantity: initial?.quantity ?? 0,
    minQuantity: initial?.minQuantity ?? 2,
    unit: initial?.unit ?? "ea",
    unitCost: initial?.unitCost ?? 0,
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim() || !draft.sku.trim()) return;
        onSubmit(draft);
      }}
    >
      <Field label="Name">
        <Input
          required
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Japanese Ryoba Saw 240mm"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU">
          <Input
            required
            value={draft.sku}
            onChange={(e) => set("sku", e.target.value.toUpperCase())}
            placeholder="SM-SAW-014"
            className="font-mono uppercase"
            readOnly={skuLocked}
          />
        </Field>
        <Field label="Category">
          <NativeSelect value={draft.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Location">
        <Input
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="Bay A · Bin 04"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="On hand">
          <Input
            type="number"
            min={0}
            step={1}
            value={draft.quantity}
            onChange={(e) => set("quantity", Number(e.target.value))}
          />
        </Field>
        <Field label="Minimum">
          <Input
            type="number"
            min={0}
            step={1}
            value={draft.minQuantity}
            onChange={(e) => set("minQuantity", Number(e.target.value))}
          />
        </Field>
        <Field label="Unit">
          <Input value={draft.unit} onChange={(e) => set("unit", e.target.value)} placeholder="ea" />
        </Field>
        <Field label="Unit cost">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={draft.unitCost}
            onChange={(e) => set("unitCost", Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Care, supplier, or bin notes"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
