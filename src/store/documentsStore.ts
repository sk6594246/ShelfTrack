import { v4 as uuidv4 } from 'uuid';
import type {
  InventoryDocument,
  DocumentLine,
  DocumentType,
} from '../types/inventory';
import { adjustStock, getProductById } from './inventoryStore';

const DOCS_KEY = 'inventory_documents';
const LINES_KEY = 'inventory_document_lines';

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
  patch: Partial<Pick<InventoryDocument, 'partnerId' | 'notes' | 'status' | 'postedAt'>>
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
  if (doc?.status === 'posted') {
    throw new Error('Cannot delete a posted document');
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

export function addLine(
  documentId: string,
  productId: string,
  quantity: number,
  notes?: string
): DocumentLine {
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error('Document not found');
  if (doc.status === 'posted') throw new Error('Document is posted');
  if (quantity <= 0) throw new Error('Quantity must be positive');

  const line: DocumentLine = {
    id: uuidv4(),
    documentId,
    productId,
    quantity,
    notes: notes?.trim() || undefined,
  };
  const lines = loadLocal<DocumentLine[]>(LINES_KEY, []);
  lines.push(line);
  saveLocal(LINES_KEY, lines);
  updateDocument(documentId, {});
  return line;
}

export function updateLine(
  lineId: string,
  patch: Partial<Pick<DocumentLine, 'quantity' | 'notes' | 'productId'>>
): DocumentLine {
  const lines = loadLocal<DocumentLine[]>(LINES_KEY, []);
  const idx = lines.findIndex((l) => l.id === lineId);
  if (idx === -1) throw new Error('Line not found');
  const doc = getDocumentById(lines[idx].documentId);
  if (doc?.status === 'posted') throw new Error('Document is posted');
  if (patch.quantity !== undefined && patch.quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  const updated = { ...lines[idx], ...patch };
  lines[idx] = updated;
  saveLocal(LINES_KEY, lines);
  return updated;
}

export function removeLine(lineId: string): void {
  const lines = loadLocal<DocumentLine[]>(LINES_KEY, []);
  const line = lines.find((l) => l.id === lineId);
  if (!line) return;
  const doc = getDocumentById(line.documentId);
  if (doc?.status === 'posted') throw new Error('Document is posted');
  saveLocal(
    LINES_KEY,
    lines.filter((l) => l.id !== lineId)
  );
}

export async function postDocument(id: string): Promise<InventoryDocument> {
  const doc = getDocumentById(id);
  if (!doc) throw new Error('Document not found');
  if (doc.status === 'posted') throw new Error('Already posted');
  if (!doc.partnerId) throw new Error('Assign a partner before posting');

  const lines = getLines(id);
  if (lines.length === 0) throw new Error('Add at least one line item');

  if (doc.type === 'sale') {
    for (const line of lines) {
      const product = await getProductById(line.productId);
      if (!product) throw new Error('Product missing for line');
      if (product.quantity < line.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}: have ${product.quantity}, need ${line.quantity}`
        );
      }
    }
  }

  for (const line of lines) {
    const change = doc.type === 'purchase' ? line.quantity : -line.quantity;
    const reason =
      doc.type === 'purchase'
        ? `Purchase ${doc.id.slice(0, 8)}`
        : `Sale ${doc.id.slice(0, 8)}`;
    await adjustStock(line.productId, change, reason);
  }

  return updateDocument(id, {
    status: 'posted',
    postedAt: new Date().toISOString(),
  });
}
