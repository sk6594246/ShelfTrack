import type { ProfitDay } from '../types/inventory';
import { getInventoryValue } from '../store/stockBatchStore';
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

/** Rebuild sales totals from posted sale documents */
export function getPostedSalesMetrics(): {
  salesValue: number;
  cogsTotal: number;
  profit: number;
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
  return {
    salesValue,
    cogsTotal,
    profit: salesValue - cogsTotal,
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
