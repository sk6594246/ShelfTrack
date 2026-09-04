export const CATEGORIES = [
  "Cutting",
  "Finish",
  "Hardware",
  "Abrasives",
  "Workholding",
  "Consumables",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MOVEMENT_TYPES = ["receive", "pick", "adjust", "create"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export type StockStatus = "ok" | "low" | "out";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: Category;
  location: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  unitCost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastIdentifiedAt?: string;
};

export type Movement = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: MovementType;
  delta: number;
  quantityAfter: number;
  note?: string;
  at: string;
};

export type ProductDraft = {
  sku: string;
  name: string;
  category: Category;
  location: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  unitCost: number;
  notes: string;
};

export function stockStatus(product: Pick<Product, "quantity" | "minQuantity">): StockStatus {
  if (product.quantity <= 0) return "out";
  if (product.quantity <= product.minQuantity) return "low";
  return "ok";
}

export function payloadForSku(sku: string) {
  return `shelfmark:${sku}`;
}
