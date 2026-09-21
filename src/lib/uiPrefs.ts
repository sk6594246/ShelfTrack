/** Device UI prefs — density, last bin per product */

const DENSITY_KEY = 'st_card_density';
const LAST_BIN_PREFIX = 'st_last_bin_';

export type CardDensity = 'comfortable' | 'dense';

export function getCardDensity(): CardDensity {
  try {
    const v = localStorage.getItem(DENSITY_KEY);
    return v === 'dense' ? 'dense' : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

export function setCardDensity(d: CardDensity) {
  try {
    localStorage.setItem(DENSITY_KEY, d);
  } catch {
    /* ignore */
  }
}

export function getLastBin(productId: string): string {
  if (!productId) return '';
  try {
    return localStorage.getItem(LAST_BIN_PREFIX + productId) || '';
  } catch {
    return '';
  }
}

export function setLastBin(productId: string, locationId: string) {
  if (!productId || !locationId) return;
  try {
    localStorage.setItem(LAST_BIN_PREFIX + productId, locationId);
  } catch {
    /* ignore */
  }
}

/** Morning / Afternoon / Evening based on local clock */
export function shiftLabel(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Morning shift';
  if (h < 17) return 'Afternoon shift';
  return 'Evening shift';
}
