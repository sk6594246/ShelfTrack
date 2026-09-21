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
  /** Default selling price (document can override) */
  unitPrice?: number;
  /** Default purchase/cost hint (batch carries actual cost) */
  costPrice?: number;
  /** Original backend / GAS id when client id was normalized from SKU */
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  change: number;
  reason?: string;
  createdAt: string;
}

export type QRMappingConfig = {
  primaryLookupField: ProductField;
  fillFields: ProductField[];
  payloadParser: 'plain' | 'json';
};

export const DEFAULT_QR_MAPPING: QRMappingConfig = {
  primaryLookupField: 'sku',
  fillFields: ['sku', 'barcode'],
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

export interface Location {
  id: string;
  name: string;
  code?: string;
  notes?: string;
  gridRow?: number;
  gridCol?: number;
  shelf?: number;
  maxQty?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreLayout {
  rows: number;
  cols: number;
}

export const DEFAULT_STORE_LAYOUT: StoreLayout = {
  rows: 5,
  cols: 8,
};

export type CategorySkuMode = 'manual' | 'auto';

export interface Category {
  id: string;
  name: string;
  notes?: string;
  skuMode?: CategorySkuMode;
  skuPrefix?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartnerRole = 'supplier' | 'customer';

export interface BusinessPartner {
  id: string;
  name: string;
  code?: string;
  roles: PartnerRole[];
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationProduct {
  locationId: string;
  productId: string;
  weightage?: number;
}

export interface PartnerProduct {
  partnerId: string;
  productId: string;
  role: PartnerRole;
}

export type ProductQRPayload = {
  type: 'product';
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  customId?: string;
  category?: string;
};

export type LocationQRPayload = {
  type: 'location';
  id: string;
  name: string;
  code?: string;
};

export type DocumentType = 'purchase' | 'sale' | 'transfer';
export type DocumentStatus = 'draft' | 'posted' | 'reversed';

export interface InventoryDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  partnerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  reversedAt?: string;
  reversesDocumentId?: string;
  reversedByDocumentId?: string;
  reversedFromId?: string;
}

export interface DocumentLine {
  id: string;
  documentId: string;
  productId: string;
  quantity: number;
  locationId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
  /** Selling unit price (sale docs) */
  unitPrice?: number;
  /** Purchase unit cost — flows into batch.unitCost */
  unitCost?: number;
  /** Set at post for sales: total COGS from batches issued */
  cogsTotal?: number;
  purchaseDate?: string;
  mfgDate?: string;
  expiryDate?: string;
}

export const UNLOCATED_LOCATION_ID = '__unlocated__';

export interface StockBatch {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  remaining: number;
  /** Cost per unit for this receipt (rides with stock) */
  unitCost?: number;
  receivedAt: string;
  documentId?: string;
  documentLineId?: string;
  purchaseDate?: string;
  mfgDate?: string;
  expiryDate?: string;
}

/** Daily profit snapshot for trend */
export interface ProfitDay {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
}
