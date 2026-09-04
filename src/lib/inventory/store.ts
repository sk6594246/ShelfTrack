import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cloneSeedMovements, cloneSeedProducts } from "./seed";
import { parseQrPayload } from "./qr";
import type { Movement, MovementType, Product, ProductDraft } from "./types";

type InventoryState = {
  products: Product[];
  movements: Movement[];
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  addProduct: (draft: ProductDraft) => Product;
  updateProduct: (id: string, patch: Partial<ProductDraft>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number, type: Exclude<MovementType, "create">, note?: string) => Product | null;
  setQuantity: (id: string, quantity: number, note?: string) => Product | null;
  identifyByCode: (raw: string) => { product: Product | null; sku: string };
  resetDemo: () => void;
};

function nowIso() {
  return new Date().toISOString();
}

function sortMovements(items: Movement[]) {
  return [...items].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export const useInventory = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: cloneSeedProducts(),
      movements: cloneSeedMovements(),
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      addProduct: (draft) => {
        const at = nowIso();
        const product: Product = {
          id: crypto.randomUUID(),
          sku: draft.sku.trim().toUpperCase(),
          name: draft.name.trim(),
          category: draft.category,
          location: draft.location.trim(),
          quantity: Math.max(0, Math.round(draft.quantity)),
          minQuantity: Math.max(0, Math.round(draft.minQuantity)),
          unit: draft.unit.trim() || "ea",
          unitCost: Math.max(0, draft.unitCost),
          notes: draft.notes.trim(),
          createdAt: at,
          updatedAt: at,
        };
        const movement: Movement = {
          id: crypto.randomUUID(),
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          type: "create",
          delta: product.quantity,
          quantityAfter: product.quantity,
          at,
        };
        set({
          products: [product, ...get().products],
          movements: [movement, ...get().movements],
        });
        return product;
      },
      updateProduct: (id, patch) => {
        set({
          products: get().products.map((product) => {
            if (product.id !== id) return product;
            return {
              ...product,
              ...("sku" in patch && patch.sku ? { sku: patch.sku.trim().toUpperCase() } : {}),
              ...("name" in patch && patch.name !== undefined ? { name: patch.name.trim() } : {}),
              ...("category" in patch && patch.category ? { category: patch.category } : {}),
              ...("location" in patch && patch.location !== undefined ? { location: patch.location.trim() } : {}),
              ...("minQuantity" in patch && patch.minQuantity !== undefined
                ? { minQuantity: Math.max(0, Math.round(patch.minQuantity)) }
                : {}),
              ...("unit" in patch && patch.unit !== undefined ? { unit: patch.unit.trim() || "ea" } : {}),
              ...("unitCost" in patch && patch.unitCost !== undefined ? { unitCost: Math.max(0, patch.unitCost) } : {}),
              ...("notes" in patch && patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
              updatedAt: nowIso(),
            };
          }),
        });
      },
      deleteProduct: (id) => {
        set({
          products: get().products.filter((p) => p.id !== id),
          movements: get().movements.filter((m) => m.productId !== id),
        });
      },
      adjustStock: (id, delta, type, note) => {
        const product = get().products.find((p) => p.id === id);
        if (!product) return null;
        const next = Math.max(0, product.quantity + delta);
        const actual = next - product.quantity;
        if (actual === 0) return product;
        const at = nowIso();
        const updated: Product = { ...product, quantity: next, updatedAt: at };
        const movement: Movement = {
          id: crypto.randomUUID(),
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          type,
          delta: actual,
          quantityAfter: next,
          note: note?.trim() || undefined,
          at,
        };
        set({
          products: get().products.map((p) => (p.id === id ? updated : p)),
          movements: [movement, ...get().movements],
        });
        return updated;
      },
      setQuantity: (id, quantity, note) => {
        const product = get().products.find((p) => p.id === id);
        if (!product) return null;
        const next = Math.max(0, Math.round(quantity));
        const delta = next - product.quantity;
        if (delta === 0) return product;
        return get().adjustStock(id, delta, "adjust", note);
      },
      identifyByCode: (raw) => {
        const sku = parseQrPayload(raw);
        if (!sku) return { product: null, sku: "" };
        const needle = sku.toLowerCase();
        const product =
          get().products.find((p) => p.sku.toLowerCase() === needle) ??
          get().products.find((p) => p.id.toLowerCase() === needle) ??
          null;
        if (!product) return { product: null, sku };
        const at = nowIso();
        const updated = { ...product, lastIdentifiedAt: at };
        set({
          products: get().products.map((p) => (p.id === product.id ? updated : p)),
        });
        return { product: updated, sku: product.sku };
      },
      resetDemo: () => {
        set({
          products: cloneSeedProducts(),
          movements: cloneSeedMovements(),
        });
      },
    }),
    {
      name: "shelfmark-inventory",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      partialize: (state) => ({
        products: state.products,
        movements: sortMovements(state.movements).slice(0, 200),
      }),
    },
  ),
);

export function generateSku(name: string, existing: string[]) {
  const letters = name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const taken = new Set(existing.map((s) => s.toUpperCase()));
  for (let i = 0; i < 40; i += 1) {
    const n = String(Math.floor(Math.random() * 900) + 100);
    const sku = `SM-${letters}-${n}`;
    if (!taken.has(sku)) return sku;
  }
  return `SM-${letters}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}
