import { v4 as uuidv4 } from 'uuid';
import type { StockBatch, Location } from '../types/inventory';
import { getLocationById, getLocationsForProduct } from './mastersStore';

const BATCHES_KEY = 'inventory_stock_batches';

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getBatches(): StockBatch[] {
  return loadLocal<StockBatch[]>(BATCHES_KEY, []);
}

export function getBatchesForProduct(productId: string): StockBatch[] {
  return getBatches()
    .filter((b) => b.productId === productId && b.remaining > 0)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}

export function getAvailableQtyAtLocation(
  productId: string,
  locationId: string
): number {
  return getBatches()
    .filter(
      (b) =>
        b.productId === productId &&
        b.locationId === locationId &&
        b.remaining > 0
    )
    .reduce((sum, b) => sum + b.remaining, 0);
}

export function getFifoLocationsForProduct(
  productId: string
): { location: Location; available: number; oldestAt: string }[] {
  const batches = getBatchesForProduct(productId);
  const byLoc = new Map<string, { available: number; oldestAt: string }>();

  for (const b of batches) {
    const cur = byLoc.get(b.locationId);
    if (!cur) {
      byLoc.set(b.locationId, {
        available: b.remaining,
        oldestAt: b.receivedAt,
      });
    } else {
      cur.available += b.remaining;
      if (b.receivedAt < cur.oldestAt) cur.oldestAt = b.receivedAt;
    }
  }

  const rows: { location: Location; available: number; oldestAt: string }[] =
    [];
  for (const [locationId, data] of byLoc) {
    const loc = getLocationById(locationId);
    if (!loc) continue;
    rows.push({ location: loc, available: data.available, oldestAt: data.oldestAt });
  }

  rows.sort((a, b) => a.oldestAt.localeCompare(b.oldestAt));
  return rows;
}

export function getAssignedLocationsForProduct(productId: string): Location[] {
  const ids = getLocationsForProduct(productId);
  return ids
    .map((id) => getLocationById(id))
    .filter((l): l is Location => !!l)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getLocatedQtyForProduct(productId: string): number {
  return getBatches()
    .filter((b) => b.productId === productId && b.remaining > 0)
    .reduce((sum, b) => sum + b.remaining, 0);
}

/** Product header qty minus stock already on any location */
export function getUnlocatedQty(productId: string, productQuantity: number): number {
  return Math.max(0, productQuantity - getLocatedQtyForProduct(productId));
}

export function receiveBatch(input: {
  productId: string;
  locationId: string;
  quantity: number;
  documentId?: string;
  documentLineId?: string;
  receivedAt?: string;
  purchaseDate?: string;
  mfgDate?: string;
  expiryDate?: string;
}): StockBatch {
  if (input.quantity <= 0) throw new Error('Batch quantity must be positive');
  const batch: StockBatch = {
    id: uuidv4(),
    productId: input.productId,
    locationId: input.locationId,
    quantity: input.quantity,
    remaining: input.quantity,
    receivedAt: input.receivedAt || new Date().toISOString(),
    documentId: input.documentId,
    documentLineId: input.documentLineId,
    purchaseDate: input.purchaseDate || undefined,
    mfgDate: input.mfgDate || undefined,
    expiryDate: input.expiryDate || undefined,
  };
  const list = getBatches();
  list.push(batch);
  saveLocal(BATCHES_KEY, list);
  return batch;
}

export function issueFromLocation(
  productId: string,
  locationId: string,
  quantity: number
): void {
  if (quantity <= 0) throw new Error('Issue quantity must be positive');
  const available = getAvailableQtyAtLocation(productId, locationId);
  if (available < quantity) {
    throw new Error(
      `Insufficient location stock: have ${available}, need ${quantity}`
    );
  }

  let left = quantity;
  const list = getBatches();
  const ordered = list
    .map((b, idx) => ({ b, idx }))
    .filter(
      ({ b }) =>
        b.productId === productId &&
        b.locationId === locationId &&
        b.remaining > 0
    )
    .sort((a, c) => a.b.receivedAt.localeCompare(c.b.receivedAt));

  for (const { b, idx } of ordered) {
    if (left <= 0) break;
    const take = Math.min(b.remaining, left);
    list[idx] = { ...b, remaining: b.remaining - take };
    left -= take;
  }

  saveLocal(BATCHES_KEY, list);
}

export type ExpiringBatchRow = {
  batchId: string;
  productId: string;
  locationId: string;
  remaining: number;
  expiryDate: string;
  daysLeft: number;
};

/** Batches with expiry within `withinDays` (default 30). Sorted soonest first. */
export function getExpiringBatches(withinDays = 30): ExpiringBatchRow[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const rows: ExpiringBatchRow[] = [];
  for (const b of getBatches()) {
    if (b.remaining <= 0 || !b.expiryDate) continue;
    const exp = new Date(
      b.expiryDate + (b.expiryDate.length === 10 ? 'T00:00:00' : '')
    );
    if (Number.isNaN(exp.getTime())) continue;
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
    if (daysLeft > withinDays) continue;
    rows.push({
      batchId: b.id,
      productId: b.productId,
      locationId: b.locationId,
      remaining: b.remaining,
      expiryDate: b.expiryDate,
      daysLeft,
    });
  }
  rows.sort(
    (a, b) => a.daysLeft - b.daysLeft || a.expiryDate.localeCompare(b.expiryDate)
  );
  return rows;
}

/** FEFO locations: prefer earliest expiry, then FIFO receivedAt */
export function getFefoLocationsForProduct(
  productId: string
): {
  location: Location;
  available: number;
  earliestExpiry: string | null;
  oldestAt: string;
}[] {
  const batches = getBatchesForProduct(productId);
  const byLoc = new Map<
    string,
    { available: number; oldestAt: string; earliestExpiry: string | null }
  >();

  for (const b of batches) {
    const cur = byLoc.get(b.locationId);
    if (!cur) {
      byLoc.set(b.locationId, {
        available: b.remaining,
        oldestAt: b.receivedAt,
        earliestExpiry: b.expiryDate || null,
      });
    } else {
      cur.available += b.remaining;
      if (b.receivedAt < cur.oldestAt) cur.oldestAt = b.receivedAt;
      if (
        b.expiryDate &&
        (!cur.earliestExpiry || b.expiryDate < cur.earliestExpiry)
      ) {
        cur.earliestExpiry = b.expiryDate;
      }
    }
  }

  const rows: {
    location: Location;
    available: number;
    earliestExpiry: string | null;
    oldestAt: string;
  }[] = [];
  for (const [locationId, data] of byLoc) {
    const loc = getLocationById(locationId);
    if (!loc) continue;
    rows.push({ location: loc, ...data });
  }

  rows.sort((a, b) => {
    if (a.earliestExpiry && b.earliestExpiry) {
      const c = a.earliestExpiry.localeCompare(b.earliestExpiry);
      if (c !== 0) return c;
    } else if (a.earliestExpiry) return -1;
    else if (b.earliestExpiry) return 1;
    return a.oldestAt.localeCompare(b.oldestAt);
  });
  return rows;
}
