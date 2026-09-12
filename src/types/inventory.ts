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

export interface QRMappingConfig {
  /** Field used to look up an existing product */
  primaryLookupField: ProductField;
  /** Fields that will be pre-filled when creating a new product from a scan */
  fillFields: ProductField[];
  /** How to interpret the QR payload */
  payloadParser: 'plain' | 'json';
}

export const DEFAULT_QR_MAPPING: QRMappingConfig = {
  primaryLookupField: 'sku',
  fillFields: ['sku', 'barcode'],
  payloadParser: 'plain',
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
