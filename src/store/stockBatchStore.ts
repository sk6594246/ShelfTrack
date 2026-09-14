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

export function receiveBatch(input: {
  productId: string;
  locationId: string;
  quantity: number;
  documentId?: string;
  documentLineId?: string;
  receivedAt?: string;
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
