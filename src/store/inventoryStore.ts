import { v4 as uuidv4 } from 'uuid';
import type { Product, StockMovement, QRMappingConfig } from '../types/inventory';
import { DEFAULT_QR_MAPPING } from '../types/inventory';
import * as gas from '../lib/gasApi';
import { isGasEnabled } from '../lib/gasApi';

const PRODUCTS_KEY = 'inventory_products';
const MOVEMENTS_KEY = 'inventory_movements';
const QR_CONFIG_KEY = 'inventory_qr_config';

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

/**
 * GAS / Sheets sometimes returns multiple products with the same id.
 * When ids collide or are missing, use a stable unique id from sku (+ index).
 * original backend id is kept as sourceId for GAS write APIs.
 */
export function normalizeProductIds(products: Product[]): Product[] {
  if (!products.length) return products;

  const idCounts = new Map<string, number>();
  for (const p of products) {
    const id = p.id || '';
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  const used = new Set<string>();
  return products.map((p, i) => {
    const raw = (p.id || '').trim();
    const duplicate = !raw || (idCounts.get(raw) || 0) > 1;
    if (!duplicate && !used.has(raw)) {
      used.add(raw);
      return p;
    }

    const sku = (p.sku || '').trim();
    let next = sku || `product-${i}`;
    if (used.has(next)) {
      next = `${next}-${i}`;
    }
    used.add(next);
    return {
      ...p,
      id: next,
      sourceId: raw || p.sourceId || undefined,
    };
  });
}

/** Resolve client productId (may be remapped SKU) to a Product */
export async function resolveProduct(
  productId: string
): Promise<Product | undefined> {
  if (!productId) return undefined;
  const all = await getProducts();
  return (
    all.find((p) => p.id === productId) ||
    all.find((p) => p.sku === productId) ||
    all.find((p) => p.sourceId === productId)
  );
}

/** Id to send to GAS for writes */
function gasWriteId(product: Product): string {
  return product.sourceId || product.id;
}

// ---------- Products ----------
export async function getProducts(): Promise<Product[]> {
  if (isGasEnabled()) {
    const list = await gas.gasGetProducts();
    return normalizeProductIds(list as Product[]);
  }
  return normalizeProductIds(loadLocal<Product[]>(PRODUCTS_KEY, []));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const found = await resolveProduct(id);
  if (found) return found;

  if (isGasEnabled()) {
    const p = await gas.gasGetProduct(id);
    if (!p) return undefined;
    const [normalized] = normalizeProductIds([p as Product]);
    return normalized;
  }
  return loadLocal<Product[]>(PRODUCTS_KEY, []).find((p) => p.id === id);
}

export async function findProductByField(
  field: keyof Product,
  value: string
): Promise<Product | undefined> {
  if (!value) return undefined;
  const products = await getProducts();
  const normalized = value.trim().toLowerCase();
  return products.find((p) => {
    const fieldValue = p[field];
    return typeof fieldValue === 'string' && fieldValue.toLowerCase() === normalized;
  });
}

export async function saveProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Product> {
  if (isGasEnabled()) {
    const resolved = product.id ? await resolveProduct(product.id) : undefined;
    const payload = {
      ...product,
      id: resolved ? gasWriteId(resolved) : product.id,
      sku: product.sku || resolved?.sku,
    };
    const saved = await gas.gasSaveProduct(payload);
    const [normalized] = normalizeProductIds([saved as Product]);
    return normalized;
  }

  const products = loadLocal<Product[]>(PRODUCTS_KEY, []);
  const now = new Date().toISOString();

  if (product.id) {
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx === -1) throw new Error('Product not found');
    const updated: Product = {
      ...products[idx],
      ...product,
      id: product.id,
      updatedAt: now,
    };
    products[idx] = updated;
    saveLocal(PRODUCTS_KEY, products);
    return updated;
  }

  const newProduct: Product = {
    ...product,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  products.push(newProduct);
  saveLocal(PRODUCTS_KEY, products);
  return newProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  if (isGasEnabled()) {
    const resolved = await resolveProduct(id);
    await gas.gasDeleteProduct(resolved ? gasWriteId(resolved) : id);
    return;
  }
  const products = loadLocal<Product[]>(PRODUCTS_KEY, []).filter((p) => p.id !== id);
  saveLocal(PRODUCTS_KEY, products);
  const movements = loadLocal<StockMovement[]>(MOVEMENTS_KEY, []).filter(
    (m) => m.productId !== id
  );
  saveLocal(MOVEMENTS_KEY, movements);
}

export async function getMovements(productId?: string): Promise<StockMovement[]> {
  if (isGasEnabled()) {
    let gasId = productId;
    if (productId) {
      const resolved = await resolveProduct(productId);
      if (resolved) gasId = gasWriteId(resolved);
    }
    return gas.gasGetMovements(gasId);
  }
  const all = loadLocal<StockMovement[]>(MOVEMENTS_KEY, []);
  if (productId) {
    return all
      .filter((m) => m.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function adjustStock(
  productId: string,
  change: number,
  reason?: string
): Promise<Product> {
  const product = await resolveProduct(productId);
  if (!product) {
    throw new Error(
      `Product not found (id: ${productId}). If using Google Sheets, ensure each product has a unique id or SKU.`
    );
  }

  if (isGasEnabled()) {
    try {
      const saved = await gas.gasAdjustStock(
        gasWriteId(product),
        change,
        reason,
        product.sku
      );
      const [normalized] = normalizeProductIds([saved as Product]);
      return normalized;
    } catch (err: unknown) {
      // Retry with SKU if backend can resolve by SKU
      if (product.sku && gasWriteId(product) !== product.sku) {
        try {
          const saved = await gas.gasAdjustStock(
            product.sku,
            change,
            reason,
            product.sku
          );
          const [normalized] = normalizeProductIds([saved as Product]);
          return normalized;
        } catch {
          /* fall through */
        }
      }
      const msg = err instanceof Error ? err.message : 'Stock adjust failed';
      throw new Error(
        msg.includes('not found')
          ? `Product not found in Google Sheets for "${product.name}" (sku: ${product.sku}). Fix duplicate/missing ids in the sheet, or adjust stock from Inventory.`
          : msg
      );
    }
  }

  const newQty = Math.max(0, product.quantity + change);
  const updated = await saveProduct({ ...product, quantity: newQty });

  const movement: StockMovement = {
    id: uuidv4(),
    productId: product.id,
    change,
    reason,
    createdAt: new Date().toISOString(),
  };
  const movements = loadLocal<StockMovement[]>(MOVEMENTS_KEY, []);
  movements.unshift(movement);
  saveLocal(MOVEMENTS_KEY, movements);

  return updated;
}

export async function getQRMapping(): Promise<QRMappingConfig> {
  if (isGasEnabled()) {
    const config = await gas.gasGetQRMapping();
    return config ?? DEFAULT_QR_MAPPING;
  }
  return loadLocal<QRMappingConfig>(QR_CONFIG_KEY, DEFAULT_QR_MAPPING);
}

export async function saveQRMapping(config: QRMappingConfig): Promise<void> {
  if (isGasEnabled()) {
    await gas.gasSaveQRMapping(config);
    return;
  }
  saveLocal(QR_CONFIG_KEY, config);
}

export async function seedDemoData(): Promise<void> {
  if (isGasEnabled()) return;

  const existing = await getProducts();
  if (existing.length > 0) return;

  const demo: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Wireless Mouse',
      sku: 'WM-001',
      barcode: '8901234567890',
      category: 'Electronics',
      location: 'Shelf A1',
      quantity: 42,
      reorderPoint: 10,
      notes: 'Bluetooth 5.0',
    },
    {
      name: 'USB-C Cable 2m',
      sku: 'CABLE-USB-C-2M',
      barcode: '8901234567891',
      category: 'Accessories',
      location: 'Shelf B3',
      quantity: 8,
      reorderPoint: 15,
    },
    {
      name: 'Notebook A5',
      sku: 'NB-A5-BLK',
      category: 'Stationery',
      location: 'Shelf C2',
      quantity: 120,
      reorderPoint: 30,
    },
    {
      name: 'Mechanical Keyboard',
      sku: 'KB-MECH-01',
      barcode: '8901234567892',
      category: 'Electronics',
      location: 'Shelf A2',
      quantity: 3,
      reorderPoint: 5,
      notes: 'Cherry MX Brown',
    },
  ];

  for (const p of demo) {
    await saveProduct(p);
  }
}
