import { v4 as uuidv4 } from 'uuid';
import type {
  InventoryDocument,
  DocumentLine,
  DocumentType,
} from '../types/inventory';
import { adjustStock, resolveProduct } from './inventoryStore';
import {
  receiveBatch,
  issueFromLocation,
  getAvailableQtyAtLocation,
} from './stockBatchStore';

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
};

export function addLine(documentId: string, input: AddLineInput): DocumentLine {
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'draft') throw new Error('Document is not editable');
  if (input.quantity <= 0) throw new Error('Quantity must be positive');

  if (doc.type === 'transfer') {
    if (!input.fromLocationId) throw new Error('From location is required');
    if (!input.toLocationId) throw new Error('To location is required');
    if (input.fromLocationId === input.toLocationId) {
      throw new Error('From and to locations must differ');
    }
  } else {
    if (!input.locationId) throw new Error('Location is required');
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
}

async function applyPostEffects(
  doc: InventoryDocument,
  lines: DocumentLine[],
  direction: 1 | -1
) {
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
      if (direction === 1) {
        await adjustStock(product.id, change, reason);
        receiveBatch({
          productId: product.id,
          locationId: line.locationId!,
          quantity: line.quantity,
          documentId: doc.id,
          documentLineId: line.id,
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
      if (direction === 1) {
        issueFromLocation(product.id, line.locationId!, line.quantity);
        await adjustStock(product.id, change, reason);
      } else {
        await adjustStock(product.id, change, reason);
        receiveBatch({
          productId: product.id,
          locationId: line.locationId!,
          quantity: line.quantity,
          documentId: doc.id,
          documentLineId: line.id,
        });
      }
    } else if (doc.type === 'transfer') {
      if (direction === 1) {
        issueFromLocation(product.id, line.fromLocationId!, line.quantity);
        receiveBatch({
          productId: product.id,
          locationId: line.toLocationId!,
          quantity: line.quantity,
          documentId: doc.id,
          documentLineId: line.id,
        });
      } else {
        issueFromLocation(product.id, line.toLocationId!, line.quantity);
        receiveBatch({
          productId: product.id,
          locationId: line.fromLocationId!,
          quantity: line.quantity,
          documentId: doc.id,
          documentLineId: line.id,
        });
      }
    }
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
        throw new Error(
          `Insufficient stock at location for ${product.name}: have ${atLoc}, need ${line.quantity}`
        );
      }
    }
  }

  if (doc.type === 'transfer') {
    for (const line of lines) {
      const product = await resolveProduct(line.productId);
      const pid = product?.id || line.productId;
      const atLoc = getAvailableQtyAtLocation(pid, line.fromLocationId!);
      if (atLoc < line.quantity) {
        throw new Error(
          `Insufficient stock at source for ${product?.name || 'product'}: have ${atLoc}, need ${line.quantity}`
        );
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

  if (doc.type !== 'transfer' && !doc.partnerId) {
    throw new Error('Assign a partner before posting');
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
        throw new Error(
          `Cannot reverse: not enough stock at location for ${product?.name || 'product'} (have ${atLoc}, need ${line.quantity}). Stock may have been sold or transferred.`
        );
      }
    }
  }

  if (doc.type === 'transfer') {
    for (const line of lines) {
      const product = await resolveProduct(line.productId);
      const pid = product?.id || line.productId;
      const atLoc = getAvailableQtyAtLocation(pid, line.toLocationId!);
      if (atLoc < line.quantity) {
        throw new Error(
          `Cannot reverse transfer: not enough stock at destination for ${product?.name || 'product'} (have ${atLoc}, need ${line.quantity})`
        );
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
