import { v4 as uuidv4 } from 'uuid';
import type {
  InventoryDocument,
  DocumentLine,
  DocumentType,
} from '../types/inventory';
import { UNLOCATED_LOCATION_ID } from '../types/inventory';
import { adjustStock, resolveProduct } from './inventoryStore';
import {
  receiveBatch,
  issueFromLocation,
  getAvailableQtyAtLocation,
  getUnlocatedQty,
  getBatches,
} from './stockBatchStore';
import { getLocationById, getWeightageForProductAtLocation } from './mastersStore';
import { recordSaleProfit } from '../lib/valueMetrics';

const DOCS_KEY = 'inventory_documents';
const LINES_KEY = 'inventory_document_lines';

const postingIds = new Set<string>();

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

export function getDocuments(): InventoryDocument[] {
  return loadLocal<InventoryDocument[]>(DOCS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getDocumentById(id: string): InventoryDocument | undefined {
  return getDocuments().find((d) => d.id === id);
}

export function createDocument(type: DocumentType): InventoryDocument {
  const now = new Date().toISOString();
  const doc: InventoryDocument = {
    id: uuidv4(),
    type,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  const list = loadLocal<InventoryDocument[]>(DOCS_KEY, []);
  list.unshift(doc);
  saveLocal(DOCS_KEY, list);
  return doc;
}

export function updateDocument(
  id: string,
  patch: Partial<
    Pick<
      InventoryDocument,
      | 'partnerId'
      | 'notes'
      | 'status'
      | 'postedAt'
      | 'reversedAt'
      | 'reversesDocumentId'
      | 'reversedByDocumentId'
    >
  >
): InventoryDocument {
  const list = loadLocal<InventoryDocument[]>(DOCS_KEY, []);
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Document not found');
  const updated: InventoryDocument = {
    ...list[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  saveLocal(DOCS_KEY, list);
  return updated;
}

export function deleteDocument(id: string): void {
  const doc = getDocumentById(id);
  if (doc?.status === 'posted' || doc?.status === 'reversed') {
    throw new Error('Cannot delete a posted or reversed document');
  }
  saveLocal(
    DOCS_KEY,
    loadLocal<InventoryDocument[]>(DOCS_KEY, []).filter((d) => d.id !== id)
  );
  saveLocal(
    LINES_KEY,
    loadLocal<DocumentLine[]>(LINES_KEY, []).filter((l) => l.documentId !== id)
  );
}

export function getLines(documentId: string): DocumentLine[] {
  return loadLocal<DocumentLine[]>(LINES_KEY, []).filter(
    (l) => l.documentId === documentId
  );
}

export type AddLineInput = {
  productId: string;
  quantity: number;
  locationId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
  unitPrice?: number;
  unitCost?: number;
  purchaseDate?: string;
  mfgDate?: string;
  expiryDate?: string;
};

export function addLine(documentId: string, input: AddLineInput): DocumentLine {
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'draft') throw new Error('Document is not editable');
  if (input.quantity <= 0) throw new Error('Quantity must be positive');

  if (doc.type === 'transfer') {
    if (!input.fromLocationId) throw new Error('From location is required');
    if (!input.toLocationId) throw new Error('To location is required');
    if (
      input.fromLocationId !== UNLOCATED_LOCATION_ID &&
      input.fromLocationId === input.toLocationId
    ) {
      throw new Error('From and to locations must differ');
    }
  } else {
    if (!input.locationId) throw new Error('Location is required');
  }

  if (doc.type === 'sale' && input.locationId) {
    const available = getAvailableQtyAtLocation(input.productId, input.locationId);
    const existing = getLines(documentId)
      .filter((l) => l.productId === input.productId && l.locationId === input.locationId)
      .reduce((s, l) => s + l.quantity, 0);
    const remaining = Math.max(0, available - existing);
    if (existing + input.quantity > available) {
      throw new Error(`Only ${remaining} available`);
    }
  }
  if (
    doc.type === 'transfer' &&
    input.fromLocationId &&
    input.fromLocationId !== UNLOCATED_LOCATION_ID
  ) {
    const available = getAvailableQtyAtLocation(input.productId, input.fromLocationId);
    const existing = getLines(documentId)
      .filter(
        (l) =>
          l.productId === input.productId &&
          l.fromLocationId === input.fromLocationId
      )
      .reduce((s, l) => s + l.quantity, 0);
    const remaining = Math.max(0, available - existing);
    if (existing + input.quantity > available) {
      throw new Error(`Only ${remaining} available`);
    }
  }

  // Purchase / transfer-to: bin capacity with weightage + existing batches + draft lines
  if (doc.type === 'purchase' && input.locationId && input.locationId !== UNLOCATED_LOCATION_ID) {
    const fit = maxFitQty(input.locationId, input.productId);
    if (fit != null && input.quantity > fit) {
      throw new Error(`Only ${fit} can fit`);
    }
  }
  if (
    doc.type === 'transfer' &&
    input.toLocationId &&
    input.toLocationId !== UNLOCATED_LOCATION_ID
  ) {
    const fit = maxFitQty(input.toLocationId, input.productId);
    if (fit != null && input.quantity > fit) {
      throw new Error(`Only ${fit} can fit`);
    }
  }

  const line: DocumentLine = {
    id: uuidv4(),
    documentId,
    productId: input.productId,
    quantity: input.quantity,
    locationId: input.locationId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.toLocationId,
    notes: input.notes?.trim() || undefined,
    unitPrice:
      input.unitPrice != null && Number.isFinite(input.unitPrice)
        ? Math.max(0, input.unitPrice)
        : undefined,
    unitCost:
      input.unitCost != null && Number.isFinite(input.unitCost)
        ? Math.max(0, input.unitCost)
        : undefined,
    purchaseDate: input.purchaseDate || undefined,
    mfgDate: input.mfgDate || undefined,
    expiryDate: input.expiryDate || undefined,
  };
  const lines = loadLocal<DocumentLine[]>(LINES_KEY, []);
  lines.push(line);
  saveLocal(LINES_KEY, lines);
  updateDocument(documentId, {});
  return line;
}

export function removeLine(lineId: string): void {
  const lines = loadLocal<DocumentLine[]>(LINES_KEY, []);
  const line = lines.find((l) => l.id === lineId);
  if (!line) return;
  const doc = getDocumentById(line.documentId);
  if (doc?.status !== 'draft') throw new Error('Document is not editable');
  saveLocal(
    LINES_KEY,
    lines.filter((l) => l.id !== lineId)
  );
}

/** Effective space from posted batches: Σ remaining × weightage */
function totalEffectiveSpaceAtLocation(locationId: string): number {
  return getBatches()
    .filter((b) => b.locationId === locationId && b.remaining > 0)
    .reduce(
      (s, b) =>
        s + b.remaining * getWeightageForProductAtLocation(locationId, b.productId),
      0
    );
}

/** Effective space reserved by draft lines targeting this location (all products) */
function draftInboundEffectiveAtLocation(
  locationId: string,
  opts?: { excludeDocumentId?: string; excludeLineId?: string }
): number {
  const allLines = loadLocal<DocumentLine[]>(LINES_KEY, []);
  let sum = 0;
  for (const line of allLines) {
    if (opts?.excludeLineId && line.id === opts.excludeLineId) continue;
    const doc = getDocumentById(line.documentId);
    if (!doc || doc.status !== 'draft') continue;
    if (opts?.excludeDocumentId && doc.id === opts.excludeDocumentId) continue;
    if (doc.type !== 'purchase' && doc.type !== 'transfer') continue;
    const toId =
      doc.type === 'purchase' ? line.locationId : line.toLocationId;
    if (toId !== locationId) continue;
    const w = getWeightageForProductAtLocation(locationId, line.productId);
    sum += line.quantity * w;
  }
  return sum;
}

/** Remaining bin capacity after batches + all draft inbound (weightage applied) */
function remainingCapacityEffective(locationId: string): number | null {
  const loc = getLocationById(locationId);
  if (!loc?.maxQty || loc.maxQty <= 0) return null;
  const used =
    totalEffectiveSpaceAtLocation(locationId) +
    draftInboundEffectiveAtLocation(locationId);
  return Math.max(0, loc.maxQty - used);
}

/** Max product units that still fit at location given product weightage */
function maxFitQty(locationId: string, productId: string): number | null {
  const room = remainingCapacityEffective(locationId);
  if (room == null) return null;
  const w = getWeightageForProductAtLocation(locationId, productId);
  if (w <= 0) return null;
  return Math.floor((room + 1e-9) / w);
}

function validateLinesForPost(doc: InventoryDocument, lines: DocumentLine[]) {
  if (lines.length === 0) throw new Error('Add at least one line item');

  for (const line of lines) {
    if (doc.type === 'transfer') {
      if (!line.fromLocationId || !line.toLocationId) {
        throw new Error('Every transfer line needs from and to locations');
      }
    } else if (!line.locationId) {
      throw new Error('Every line must have a location');
    }
  }

  if (doc.type === 'sale' || doc.type === 'transfer') {
    const needed = new Map<
      string,
      { productId: string; locationId: string; qty: number }
    >();
    for (const line of lines) {
      const locId =
        doc.type === 'sale' ? line.locationId! : line.fromLocationId!;
      if (!locId || locId === UNLOCATED_LOCATION_ID) continue;
      const key = `${line.productId}::${locId}`;
      const cur = needed.get(key);
      if (cur) cur.qty += line.quantity;
      else
        needed.set(key, {
          productId: line.productId,
          locationId: locId,
          qty: line.quantity,
        });
    }
    for (const row of needed.values()) {
      const available = getAvailableQtyAtLocation(
        row.productId,
        row.locationId
      );
      if (row.qty > available) {
        throw new Error(`Only ${available} available`);
      }
    }
  }

  if (doc.type === 'purchase' || doc.type === 'transfer') {
    const byLoc = new Map<string, { add: number; productId: string }>();
    for (const line of lines) {
      const toId =
        doc.type === 'purchase' ? line.locationId! : line.toLocationId!;
      if (!toId || toId === UNLOCATED_LOCATION_ID) continue;
      const w = getWeightageForProductAtLocation(toId, line.productId);
      const cur = byLoc.get(toId);
      if (cur) cur.add += line.quantity * w;
      else byLoc.set(toId, { add: line.quantity * w, productId: line.productId });
    }
    for (const [locId, row] of byLoc) {
      const loc = getLocationById(locId);
      if (!loc?.maxQty || loc.maxQty <= 0) continue;
      const batchUsed = totalEffectiveSpaceAtLocation(locId);
      const otherDrafts = draftInboundEffectiveAtLocation(locId, {
        excludeDocumentId: doc.id,
      });
      const used = batchUsed + otherDrafts;
      if (used + row.add > loc.maxQty + 1e-9) {
        const room = Math.max(0, loc.maxQty - used);
        const w = getWeightageForProductAtLocation(locId, row.productId);
        const fit = w > 0 ? Math.floor((room + 1e-9) / w) : 0;
        throw new Error(`Only ${fit} can fit`);
      }
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function applyPostEffects(
  doc: InventoryDocument,
  lines: DocumentLine[],
  direction: 1 | -1
) {
  let saleRevenue = 0;
  let saleCogs = 0;

  for (const line of lines) {
    const product = await resolveProduct(line.productId);
    if (!product) {
      throw new Error(
        `Product not found for line (id: ${line.productId}). Re-add the line after refreshing products.`
      );
    }

    if (doc.type === 'purchase') {
      const change = direction * line.quantity;
      const reason =
        direction === 1
          ? `Purchase ${doc.id.slice(0, 8)}`
          : `Reverse purchase ${doc.id.slice(0, 8)}`;
      const unitCost = line.unitCost ?? product.costPrice ?? 0;
      if (direction === 1) {
        await adjustStock(product.id, change, reason);
        receiveBatch({
          productId: product.id,
          locationId: line.locationId!,
          quantity: line.quantity,
          unitCost,
          documentId: doc.id,
          documentLineId: line.id,
          purchaseDate: line.purchaseDate,
          mfgDate: line.mfgDate,
          expiryDate: line.expiryDate,
        });
      } else {
        issueFromLocation(product.id, line.locationId!, line.quantity);
        await adjustStock(product.id, change, reason);
      }
    } else if (doc.type === 'sale') {
      const change = direction * -line.quantity;
      const reason =
        direction === 1
          ? `Sale ${doc.id.slice(0, 8)}`
          : `Reverse sale ${doc.id.slice(0, 8)}`;
      const unitPrice = line.unitPrice ?? product.unitPrice ?? 0;
      if (direction === 1) {
        const { cogs } = issueFromLocation(
          product.id,
          line.locationId!,
          line.quantity
        );
        await adjustStock(product.id, change, reason);
        saleRevenue += line.quantity * unitPrice;
        saleCogs += cogs;
        const allLines = loadLocal<DocumentLine[]>(LINES_KEY, []);
        const li = allLines.findIndex((l) => l.id === line.id);
        if (li >= 0) {
          allLines[li] = { ...allLines[li], cogsTotal: cogs, unitPrice };
          saveLocal(LINES_KEY, allLines);
        }
      } else {
        await adjustStock(product.id, change, reason);
        receiveBatch({
          productId: product.id,
          locationId: line.locationId!,
          quantity: line.quantity,
          unitCost:
            line.cogsTotal != null && line.quantity > 0
              ? line.cogsTotal / line.quantity
              : line.unitCost ?? product.costPrice ?? 0,
          documentId: doc.id,
          documentLineId: line.id,
        });
      }
    } else if (doc.type === 'transfer') {
      const fromUnlocated = line.fromLocationId === UNLOCATED_LOCATION_ID;
      if (direction === 1) {
        let unitCost = line.unitCost ?? product.costPrice ?? 0;
        if (!fromUnlocated) {
          const { cogs } = issueFromLocation(
            product.id,
            line.fromLocationId!,
            line.quantity
          );
          unitCost = line.quantity > 0 ? cogs / line.quantity : 0;
        }
        receiveBatch({
          productId: product.id,
          locationId: line.toLocationId!,
          quantity: line.quantity,
          unitCost,
          documentId: doc.id,
          documentLineId: line.id,
          purchaseDate: line.purchaseDate,
          mfgDate: line.mfgDate,
          expiryDate: line.expiryDate,
        });
      } else {
        const { cogs } = issueFromLocation(
          product.id,
          line.toLocationId!,
          line.quantity
        );
        if (!fromUnlocated) {
          receiveBatch({
            productId: product.id,
            locationId: line.fromLocationId!,
            quantity: line.quantity,
            unitCost: line.quantity > 0 ? cogs / line.quantity : 0,
            documentId: doc.id,
            documentLineId: line.id,
            purchaseDate: line.purchaseDate,
            mfgDate: line.mfgDate,
            expiryDate: line.expiryDate,
          });
        }
      }
    }
  }

  if (doc.type === 'sale' && direction === 1 && (saleRevenue > 0 || saleCogs > 0)) {
    recordSaleProfit({
      documentId: doc.id,
      revenue: saleRevenue,
      cogs: saleCogs,
      postedAt: new Date().toISOString(),
    });
  }
}

async function validateStockForPost(
  doc: InventoryDocument,
  lines: DocumentLine[]
) {
  if (doc.type === 'sale') {
    for (const line of lines) {
      const product = await resolveProduct(line.productId);
      if (!product) {
        throw new Error(`Product not found for line (id: ${line.productId})`);
      }
      if (product.quantity < line.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}: have ${product.quantity}, need ${line.quantity}`
        );
      }
      const atLoc = getAvailableQtyAtLocation(product.id, line.locationId!);
      if (atLoc < line.quantity) {
        throw new Error(`Only ${atLoc} available`);
      }
    }
  }

  if (doc.type === 'transfer') {
    for (const line of lines) {
      const product = await resolveProduct(line.productId);
      if (!product) {
        throw new Error(`Product not found for line (id: ${line.productId})`);
      }
      if (line.fromLocationId === UNLOCATED_LOCATION_ID) {
        const unloc = getUnlocatedQty(product.id, product.quantity);
        if (unloc < line.quantity) {
          throw new Error(`Only ${unloc} available`);
        }
      } else {
        const atLoc = getAvailableQtyAtLocation(
          product.id,
          line.fromLocationId!
        );
        if (atLoc < line.quantity) {
          throw new Error(`Only ${atLoc} available`);
        }
      }
    }
  }
}

export async function postDocument(id: string): Promise<InventoryDocument> {
  if (postingIds.has(id)) {
    throw new Error('Document is already being posted');
  }

  const doc = getDocumentById(id);
  if (!doc) throw new Error('Document not found');
  if (doc.status === 'posted') throw new Error('Already posted');
  if (doc.status === 'reversed') throw new Error('Document was reversed');
  if (doc.status !== 'draft') throw new Error('Only drafts can be posted');

  if (doc.type === 'sale' && !doc.partnerId) {
    throw new Error('Assign a customer before posting');
  }

  const lines = getLines(id);
  validateLinesForPost(doc, lines);
  await validateStockForPost(doc, lines);

  postingIds.add(id);
  try {
    const fresh = getDocumentById(id);
    if (!fresh || fresh.status !== 'draft') {
      throw new Error('Document state changed — post aborted');
    }

    await applyPostEffects(doc, lines, 1);

    return updateDocument(id, {
      status: 'posted',
      postedAt: new Date().toISOString(),
    });
  } finally {
    postingIds.delete(id);
  }
}

export async function reverseDocument(id: string): Promise<InventoryDocument> {
  if (postingIds.has(id)) {
    throw new Error('Document is busy — try again');
  }

  const doc = getDocumentById(id);
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'posted') {
    throw new Error('Only posted documents can be reversed');
  }
  if (doc.reversedByDocumentId) {
    throw new Error('Document was already reversed');
  }

  const lines = getLines(id);
  if (lines.length === 0) throw new Error('No lines to reverse');

  if (doc.type === 'purchase') {
    for (const line of lines) {
      const product = await resolveProduct(line.productId);
      const pid = product?.id || line.productId;
      const atLoc = getAvailableQtyAtLocation(pid, line.locationId!);
      if (atLoc < line.quantity) {
        throw new Error(`Only ${atLoc} available`);
      }
    }
  }

  if (doc.type === 'transfer') {
    for (const line of lines) {
      const product = await resolveProduct(line.productId);
      const pid = product?.id || line.productId;
      const atLoc = getAvailableQtyAtLocation(pid, line.toLocationId!);
      if (atLoc < line.quantity) {
        throw new Error(`Only ${atLoc} available`);
      }
    }
  }

  postingIds.add(id);
  try {
    const fresh = getDocumentById(id);
    if (!fresh || fresh.status !== 'posted') {
      throw new Error('Document state changed — reverse aborted');
    }

    await applyPostEffects(doc, lines, -1);

    const now = new Date().toISOString();
    const reverseDoc: InventoryDocument = {
      id: uuidv4(),
      type: doc.type,
      partnerId: doc.partnerId,
      status: 'posted',
      notes: `Reversal of ${doc.id.slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
      postedAt: now,
      reversesDocumentId: doc.id,
    };
    const list = loadLocal<InventoryDocument[]>(DOCS_KEY, []);
    list.unshift(reverseDoc);
    saveLocal(DOCS_KEY, list);

    const revLines: DocumentLine[] = lines.map((l) => ({
      ...l,
      id: uuidv4(),
      documentId: reverseDoc.id,
    }));
    const allLines = loadLocal<DocumentLine[]>(LINES_KEY, []);
    saveLocal(LINES_KEY, [...allLines, ...revLines]);

    return updateDocument(id, {
      status: 'reversed',
      reversedAt: now,
      reversedByDocumentId: reverseDoc.id,
    });
  } finally {
    postingIds.delete(id);
  }
}
