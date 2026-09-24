import type { Product } from '../types/inventory';
import { getBatches, getExpiringBatches } from '../store/stockBatchStore';
import { getDocuments, getLines } from '../store/documentsStore';

const PROFIT_LOG_KEY = 'st_profit_log_v1';

export type ProfitLogEntry = {
  date: string; // YYYY-MM-DD
  documentId: string;
  revenue: number;
  cogs: number;
  profit: number;
  postedAt: string;
};

function loadLog(): ProfitLogEntry[] {
  try {
    const raw = localStorage.getItem(PROFIT_LOG_KEY);
    return raw ? (JSON.parse(raw) as ProfitLogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: ProfitLogEntry[]) {
  localStorage.setItem(PROFIT_LOG_KEY, JSON.stringify(entries.slice(-500)));
}

export function getProfitLog(): ProfitLogEntry[] {
  return loadLog();
}

export function recordSaleProfit(input: {
  documentId: string;
  revenue: number;
  cogs: number;
  postedAt?: string;
}): void {
  const postedAt = input.postedAt || new Date().toISOString();
  const date = postedAt.slice(0, 10);
  const profit = input.revenue - input.cogs;
  const log = loadLog().filter((e) => e.documentId !== input.documentId);
  log.push({
    date,
    documentId: input.documentId,
    revenue: input.revenue,
    cogs: input.cogs,
    profit,
    postedAt,
  });
  saveLog(log);
}

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted =
    abs >= 100000
      ? `${(abs / 1000).toFixed(abs >= 1000000 ? 0 : 1)}k`
      : abs >= 1000
        ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : abs.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n < 0 ? `-${formatted}` : formatted;
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

/** Σ remaining × unitCost across batches */
export function getInventoryValue(): number {
  return getBatches()
    .filter((b) => b.remaining > 0)
    .reduce((s, b) => s + b.remaining * (b.unitCost || 0), 0);
}

export function getPostedSalesMetrics(): {
  salesValue: number;
  cogs: number;
  profit: number;
  marginPct: number;
} {
  let salesValue = 0;
  let cogs = 0;
  for (const doc of getDocuments()) {
    if (doc.status !== 'posted' || doc.type !== 'sale') continue;
    for (const line of getLines(doc.id)) {
      const price = line.unitPrice || 0;
      salesValue += line.quantity * price;
      if (line.cogsTotal != null) cogs += line.cogsTotal;
    }
  }
  const profit = salesValue - cogs;
  const marginPct = salesValue > 0 ? (profit / salesValue) * 100 : 0;
  return { salesValue, cogs, profit, marginPct };
}

export function getValueSnapshot(): {
  inventoryValue: number;
  salesValue: number;
  profit: number;
} {
  const inv = getInventoryValue();
  const sales = getPostedSalesMetrics();
  return {
    inventoryValue: inv,
    salesValue: sales.salesValue,
    profit: sales.profit,
  };
}

export function getProfitTrend(days = 7): { date: string; profit: number }[] {
  const log = getProfitLog();
  const byDate = new Map<string, number>();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const out: { date: string; profit: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, 0);
    out.push({ date: key, profit: 0 });
  }
  for (const row of log) {
    if (byDate.has(row.date)) {
      byDate.set(row.date, (byDate.get(row.date) || 0) + row.profit);
    }
  }
  return out.map((d) => ({ date: d.date, profit: byDate.get(d.date) || 0 }));
}

export function getDeadStockProducts(
  products: Product[],
  idleDays = 30
): Product[] {
  const cutoff = Date.now() - idleDays * 86400000;
  const moved = new Set<string>();
  for (const b of getBatches()) {
    if (b.remaining <= 0) continue;
    const t = new Date(b.receivedAt || 0).getTime();
    if (t >= cutoff) moved.add(b.productId);
  }
  return products.filter(
    (p) => p.quantity > 0 && !moved.has(p.id)
  );
}

export function getExpiryRiskValue(withinDays = 30): number {
  return getExpiringBatches(withinDays).reduce(
    (s, b) => s + b.remaining * (b.unitCost || 0),
    0
  );
}

/** Inventory value ÷ average daily COGS over lookback (null if no COGS) */
export function getDaysOfCover(lookbackDays = 30): number | null {
  const inv = getInventoryValue();
  // Empty floor → no cover metric (Dashboard shows "—")
  if (inv <= 0) return null;

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
