/**
 * Full Push / Pull helpers — replace entire tenant dataset.
 */

import {
  d1PullSnapshot,
  d1PushSnapshot,
  isD1Enabled,
} from './d1Api';
import type {
  Product,
  Location,
  Category,
  BusinessPartner,
  LocationProduct,
  PartnerProduct,
  InventoryDocument,
  DocumentLine,
  StockBatch,
  StockMovement,
  QRMappingConfig,
} from '../types/inventory';
import { DEFAULT_QR_MAPPING } from '../types/inventory';

const KEYS = {
  products: 'inventory_products',
  movements: 'inventory_movements',
  qr: 'inventory_qr_config',
  locations: 'inventory_locations',
  categories: 'inventory_categories',
  partners: 'inventory_partners',
  locationProducts: 'inventory_location_products',
  partnerProducts: 'inventory_partner_products',
  documents: 'inventory_documents',
  lines: 'inventory_document_lines',
  batches: 'inventory_stock_batches',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export type FullSnapshot = {
  products: Product[];
  movements: StockMovement[];
  locations: Location[];
  categories: Category[];
  partners: BusinessPartner[];
  locationProducts: LocationProduct[];
  partnerProducts: PartnerProduct[];
  documents: InventoryDocument[];
  documentLines: DocumentLine[];
  stockBatches: StockBatch[];
  qrMapping: QRMappingConfig;
};

export function collectLocalSnapshot(): FullSnapshot {
  return {
    products: load(KEYS.products, []),
    movements: load(KEYS.movements, []),
    locations: load(KEYS.locations, []),
    categories: load(KEYS.categories, []),
    partners: load(KEYS.partners, []),
    locationProducts: load(KEYS.locationProducts, []),
    partnerProducts: load(KEYS.partnerProducts, []),
    documents: load(KEYS.documents, []),
    documentLines: load(KEYS.lines, []),
    stockBatches: load(KEYS.batches, []),
    qrMapping: load(KEYS.qr, DEFAULT_QR_MAPPING),
  };
}

export function applySnapshotToLocal(snap: Partial<FullSnapshot>): void {
  if (snap.products) save(KEYS.products, snap.products);
  if (snap.movements) save(KEYS.movements, snap.movements);
  if (snap.locations) save(KEYS.locations, snap.locations);
  if (snap.categories) save(KEYS.categories, snap.categories);
  if (snap.partners) save(KEYS.partners, snap.partners);
  if (snap.locationProducts) save(KEYS.locationProducts, snap.locationProducts);
  if (snap.partnerProducts) save(KEYS.partnerProducts, snap.partnerProducts);
  if (snap.documents) save(KEYS.documents, snap.documents);
  if (snap.documentLines) save(KEYS.lines, snap.documentLines);
  if (snap.stockBatches) save(KEYS.batches, snap.stockBatches);
  if (snap.qrMapping) save(KEYS.qr, snap.qrMapping);
}

/** Pull from D1 → replace local. */
export async function pullFromDb(): Promise<void> {
  if (!isD1Enabled()) throw new Error('Configure Tenant ID + PIN and VITE_D1_API_URL first');
  const snap = (await d1PullSnapshot()) as FullSnapshot;
  applySnapshotToLocal(snap);
}

/** Push local → D1 (overwrite remote for this tenant). */
export async function pushToDb(): Promise<void> {
  if (!isD1Enabled()) throw new Error('Configure Tenant ID + PIN and VITE_D1_API_URL first');
  const snap = collectLocalSnapshot();
  await d1PushSnapshot(snap as unknown as Record<string, unknown>);
}
