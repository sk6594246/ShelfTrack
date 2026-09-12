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

// ---------- Products ----------
export async function getProducts(): Promise<Product[]> {
  if (isGasEnabled()) {
    return gas.gasGetProducts();
  }
  return loadLocal<Product[]>(PRODUCTS_KEY, []);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  if (isGasEnabled()) {
    const p = await gas.gasGetProduct(id);
    return p ?? undefined;
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
    return gas.gasSaveProduct(product);
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
    await gas.gasDeleteProduct(id);
    return;
  }
  const products = loadLocal<Product[]>(PRODUCTS_KEY, []).filter((p) => p.id !== id);
  saveLocal(PRODUCTS_KEY, products);
  const movements = loadLocal<StockMovement[]>(MOVEMENTS_KEY, []).filter(
    (m) => m.productId !== id
  );
  saveLocal(MOVEMENTS_KEY, movements);
}

// ---------- Stock movements ----------
export async function getMovements(productId?: string): Promise<StockMovement[]> {
  if (isGasEnabled()) {
    return gas.gasGetMovements(productId);
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
  if (isGasEnabled()) {
    return gas.gasAdjustStock(productId, change, reason);
  }

  const product = await getProductById(productId);
  if (!product) throw new Error('Product not found');

  const newQty = Math.max(0, product.quantity + change);
  const updated = await saveProduct({ ...product, quantity: newQty });

  const movement: StockMovement = {
    id: uuidv4(),
    productId,
    change,
    reason,
    createdAt: new Date().toISOString(),
  };
  const movements = loadLocal<StockMovement[]>(MOVEMENTS_KEY, []);
  movements.unshift(movement);
  saveLocal(MOVEMENTS_KEY, movements);

  return updated;
}

// ---------- QR Mapping Config ----------
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

// ---------- Seed data (local only) ----------
export async function seedDemoData(): Promise<void> {
  if (isGasEnabled()) return; // never seed when using GAS

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
