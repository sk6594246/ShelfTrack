import type { StoreLayout } from '../types/inventory';
import { DEFAULT_STORE_LAYOUT } from '../types/inventory';

const LAYOUT_KEY = 'inventory_store_layout';

export function getStoreLayout(): StoreLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_STORE_LAYOUT };
    const parsed = JSON.parse(raw) as StoreLayout;
    const rows = Math.min(20, Math.max(1, Number(parsed.rows) || DEFAULT_STORE_LAYOUT.rows));
    const cols = Math.min(20, Math.max(1, Number(parsed.cols) || DEFAULT_STORE_LAYOUT.cols));
    return { rows, cols };
  } catch {
    return { ...DEFAULT_STORE_LAYOUT };
  }
}

export function saveStoreLayout(layout: StoreLayout): StoreLayout {
  const next: StoreLayout = {
    rows: Math.min(20, Math.max(1, Math.round(layout.rows))),
    cols: Math.min(20, Math.max(1, Math.round(layout.cols))),
  };
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  return next;
}
