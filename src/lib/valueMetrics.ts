import type { Product, ProfitDay } from '../types/inventory';
import {
  getBatches,
  getInventoryValue,
  getExpiringBatches,
} from '../store/stockBatchStore';
import { getDocuments, getLines } from '../store/documentsStore';

const PROFIT_LOG_KEY = 'inventory_profit_log';

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

function dayKey(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Append revenue/cogs from a posted sale into daily profit log */
export function recordSaleProfit(input: {
  documentId: string;
  revenue: number;
  cogs: number;
  postedAt?: string;
}) {
  const date = dayKey(input.postedAt);
  const log = loadLocal<ProfitDay[]>(PROFIT_LOG_KEY, []);
  const idx = log.findIndex((r) => r.date === date);
  const profit = input.revenue - input.cogs;
  if (idx >= 0) {
    log[idx] = {
      date,
      revenue: log[idx].revenue + input.revenue,
      cogs: log[idx].cogs + input.cogs,
      profit: log[idx].profit + profit,
    };
  } else {
    log.push({ date, revenue: input.revenue, cogs: input.cogs, profit });
  }
  log.sort((a, b) => a.date.localeCompare(b.date));
  saveLocal(PROFIT_LOG_KEY, log);
}

export function getProfitLog(): ProfitDay[] {
  return loadLocal<ProfitDay[]>(PROFIT_LOG_KEY, []).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/** Rebuild sales totals from posted sale documents (authoritative for sales value) */
export function getPostedSalesMetrics(): {
  salesValue: number;
  cogsTotal: number;
  profit: number;
  marginPct: number;
} {
  let salesValue = 0;
  let cogsTotal = 0;
  for (const doc of getDocuments()) {
    if (doc.type !== 'sale' || doc.status !== 'posted') continue;
    for (const line of getLines(doc.id)) {
      const price = line.unitPrice ?? 0;
      salesValue += line.quantity * price;
      cogsTotal += line.cogsTotal ?? 0;
    }
  }
  const profit = salesValue - cogsTotal;
  const marginPct = salesValue > 0 ? (profit / salesValue) * 100 : 0;
  return {
    salesValue,
    cogsTotal,
    profit,
    marginPct,
  };
}

export function getValueSnapshot() {
  const inv = getInventoryValue();
  const sales = getPostedSalesMetrics();
  return {
    inventoryValue: inv,
    salesValue: sales.salesValue,
    cogsTotal: sales.cogsTotal,
    profit: sales.profit,
    marginPct: sales.marginPct,
  };
}

/** Last N calendar days of profit (fill zeros) */
export function getProfitTrend(days = 7): ProfitDay[] {
  const log = getProfitLog();
  const byDate = new Map(log.map((r) => [r.date, r]));
  const out: ProfitDay[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = byDate.get(key);
    out.push(row || { date: key, revenue: 0, cogs: 0, profit: 0 });
  }
  return out;
}

export function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatPct(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(v >= 10 || v <= -10 ? 0 : 1)}%`;
}

/** ₹ at risk from batches expiring within N days (includes already expired remaining) */
export function getExpiryRiskValue(withinDays = 30): number {
  const byId = new Map(getBatches().map((b) => [b.id, b]));
  return getExpiringBatches(withinDays).reduce((sum, r) => {
    const b = byId.get(r.batchId);
    return sum + r.remaining * (b?.unitCost ?? 0);
  }, 0);
}

/**
 * Dead stock: products with qty > 0 and no posted sale in the last N days,
 * and newest remaining batch receivedAt older than N days (stale on shelf).
 */
export function getDeadStockProducts(
  products: Product[],
  withinDays = 30
): Product[] {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - withinDays);
  const cutoffIso = cutoff.toISOString();

  const soldRecently = new Set<string>();
  for (const doc of getDocuments()) {
    if (doc.type !== 'sale' || doc.status !== 'posted') continue;
    const when = doc.postedAt || doc.updatedAt || doc.createdAt;
    if (!when || when < cutoffIso) continue;
    for (const line of getLines(doc.id)) {
      soldRecently.add(line.productId);
    }
  }

  const newestBatchByProduct = new Map<string, string>();
  for (const b of getBatches()) {
    if (b.remaining <= 0) continue;
    const prev = newestBatchByProduct.get(b.productId);
    if (!prev || b.receivedAt > prev) {
      newestBatchByProduct.set(b.productId, b.receivedAt);
    }
  }

  return products.filter((p) => {
    if (p.quantity <= 0) return false;
    if (soldRecently.has(p.id)) return false;
    const newest = newestBatchByProduct.get(p.id);
    if (!newest) return true;
    return newest < cutoffIso;
  });
}

/** Inventory value ÷ average daily COGS over lookback (null if no COGS) */
export function getDaysOfCover(lookbackDays = 30): number | null {
  const inv = getInventoryValue();
  if (inv <= 0) return 0;

  const log = getProfitLog();
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (lookbackDays - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  let cogsSum = 0;
  for (const row of log) {
    if (row.date < cutoffKey) continue;
    cogsSum += row.cogs || 0;
  }

  const avgDaily = cogsSum / lookbackDays;
  if (avgDaily <= 0) return null;
  return inv / avgDaily;
}

export type DraftsByType = {
  purchase: number;
  sale: number;
  transfer: number;
  adjust: number;
  total: number;
};

export function getOpenDraftsByType(): DraftsByType {
  const out: DraftsByType = {
    purchase: 0,
    sale: 0,
    transfer: 0,
    adjust: 0,
    total: 0,
  };
  for (const d of getDocuments()) {
    if (d.status !== 'draft') continue;
    out.total += 1;
    if (d.type === 'purchase') out.purchase += 1;
    else if (d.type === 'sale') out.sale += 1;
    else if (d.type === 'transfer') out.transfer += 1;
    else if (d.type === 'adjust') out.adjust += 1;
  }
  return out;
}

export type OpsKpiSnapshot = {
  marginPct: number;
  deadStockCount: number;
  expiryRiskValue: number;
  daysOfCover: number | null;
  drafts: DraftsByType;
};

export function getOpsKpiSnapshot(products: Product[]): OpsKpiSnapshot {
  const sales = getPostedSalesMetrics();
  return {
    marginPct: sales.marginPct,
    deadStockCount: getDeadStockProducts(products, 30).length,
    expiryRiskValue: getExpiryRiskValue(30),
    daysOfCover: getDaysOfCover(30),
    drafts: getOpenDraftsByType(),
  };
}
