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
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  notes?: string;
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

export type DocumentType = 'purchase' | 'sale';
export type DocumentStatus = 'draft' | 'posted';

export interface InventoryDocument {
  id: string;
  type: DocumentType;
  partnerId?: string;
  status: DocumentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
}

export interface DocumentLine {
  id: string;
  documentId: string;
  productId: string;
  quantity: number;
  locationId?: string;
  notes?: string;
}
