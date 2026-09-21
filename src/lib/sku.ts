import type { Category } from '../types/inventory';

const CATEGORIES_KEY = 'inventory_categories';

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeSkuPrefix(raw?: string): string | undefined {
  if (!raw) return undefined;
  const p = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return p || undefined;
}

export function getCategoryByName(name: string): Category | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const list = loadLocal<Category[]>(CATEGORIES_KEY, []);
  return list.find((c) => c.name.trim().toLowerCase() === n);
}

/** Next SKU: PREFIX-NNN (max + 1, 3-digit pad) */
export function nextSkuForPrefix(
  prefix: string,
  products: { sku?: string }[]
): string {
  const p = normalizeSkuPrefix(prefix);
  if (!p) throw new Error('SKU prefix is required for auto mode');
  const re = new RegExp('^' + p + '-([0-9]+)$', 'i');
  let max = 0;
  for (const prod of products) {
    const m = String(prod.sku || '').trim().match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return p + '-' + String(max + 1).padStart(3, '0');
}
