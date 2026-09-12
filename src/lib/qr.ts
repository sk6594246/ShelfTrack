import type { Product, QRMappingConfig } from '../types/inventory';
import { findProductByField } from '../store/inventoryStore';

export interface ScanResult {
  rawValue: string;
  /** Parsed object when payloadParser === 'json' */
  parsed?: Record<string, string>;
}

/**
 * Interpret the raw QR string according to the current mapping config.
 */
export function interpretQR(
  raw: string,
  config: QRMappingConfig
): ScanResult {
  if (config.payloadParser === 'json') {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return { rawValue: raw, parsed };
    } catch {
      // fall through to plain
    }
  }
  return { rawValue: raw.trim() };
}

/**
 * Look up an existing product using the primary lookup field.
 */
export async function lookupProductFromScan(
  result: ScanResult,
  config: QRMappingConfig
): Promise<Product | undefined> {
  const field = config.primaryLookupField;

  if (result.parsed) {
    const value = result.parsed[field] ?? result.parsed[field.toUpperCase()];
    if (value) return findProductByField(field as keyof Product, value);
  }

  // plain string → treat entire value as the primary field
  return findProductByField(field as keyof Product, result.rawValue);
}

/**
 * Build a partial product object that can be used to pre-fill the Add Product form.
 */
export function buildPreFillFromScan(
  result: ScanResult,
  config: QRMappingConfig
): Partial<Product> {
  const prefill: Partial<Product> = {};

  if (result.parsed) {
    for (const field of config.fillFields) {
      const value = result.parsed[field] ?? result.parsed[field.toUpperCase()];
      if (value) {
        (prefill as any)[field] = value;
      }
    }
  } else {
    // plain string: put the value into every selected fill field
    for (const field of config.fillFields) {
      (prefill as any)[field] = result.rawValue;
    }
  }

  return prefill;
}

/**
 * Human-readable summary of the current mapping (shown in UI).
 */
export function mappingSummary(config: QRMappingConfig): string {
  const lookup = config.primaryLookupField.toUpperCase();
  const fills = config.fillFields.map((f) => f.toUpperCase()).join(', ');
  return `Lookup by ${lookup} · Prefill: ${fills || 'none'}`;
}
