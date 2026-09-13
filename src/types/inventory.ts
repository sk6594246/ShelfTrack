export type ProductField =
  | 'sku'
  | 'barcode'
  | 'customId'
  | 'name'
  | 'category'
  | 'location'
  | 'notes';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  customId?: string;
  category?: string;
  location?: string;
  quantity: number;
  reorderPoint: number;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  change: number; // positive = in, negative = out
  reason?: string;
  createdAt: string;
}

export type QRMappingConfig = {
  /** Field used to look up an existing product */
  primaryLookupField: ProductField;
  /** Fields that will be pre-filled when creating a new product from a scan */
  fillFields: ProductField[];
  /** How to interpret the QR payload */
  payloadParser: 'plain' | 'json';
};

export const DEFAULT_QR_MAPPING: QRMappingConfig = {
  primaryLookupField: 'sku',
  fillFields: ['sku', 'barcode', 'name', 'category', 'location', 'notes'],
  payloadParser: 'json',
};

export const PRODUCT_FIELD_LABELS: Record<ProductField, string> = {
  sku: 'SKU',
  barcode: 'Barcode',
  customId: 'Custom ID',
  name: 'Name',
  category: 'Category',
  location: 'Location',
  notes: 'Notes',
};

export const ALL_PRODUCT_FIELDS: ProductField[] = [
  'sku',
  'barcode',
  'customId',
  'name',
  'category',
  'location',
  'notes',
];

export const CATEGORIES: string[] = [
  'Electronics',
  'Clothing & Apparel',
  'Books & Media',
  'Food & Beverages',
  'Office Supplies',
  'Hardware & Tools',
  'Home & Garden',
  'Toys & Games',
  'Health & Beauty',
  'Sports & Outdoors',
  'Automotive',
  'Arts & Crafts',
  'Baby & Kids',
  'Pet Supplies',
  'Other'
];

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(product: Pick<Product, "quantity" | "reorderPoint">): StockStatus {
  if (product.quantity <= 0) return "out";
  if (product.quantity <= product.reorderPoint) return "low";
  return "ok";
}

export function payloadForSku(sku: string) {
  return `shelfmark:${sku}`;
}