/**
 * Shared helpers for ShelfTrack D1 Worker
 */
export interface Env {
  DB: D1Database;
}

export type Json = Record<string, unknown>;

export const DEFAULT_TENANT_ID = 'default';
export const DEFAULT_TENANT_NAME = 'Default Store';
export const DEFAULT_PIN_HASH = 'bootstrap';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function uid(): string {
  return crypto.randomUUID();
}

export async function ensureDefaultTenant(db: D1Database): Promise<string> {
  const row = await db
    .prepare('SELECT id FROM tenants WHERE id = ?')
    .bind(DEFAULT_TENANT_ID)
    .first<{ id: string }>();
  if (row?.id) return row.id;

  const t = nowIso();
  await db
    .prepare(
      `INSERT INTO tenants (id, name, pin_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME, DEFAULT_PIN_HASH, t, t)
    .run();
  return DEFAULT_TENANT_ID;
}

export function resolveTenantId(body: Json): string {
  const raw = body.tenantId;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return DEFAULT_TENANT_ID;
}

export function mapProduct(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    barcode: r.barcode ?? undefined,
    customId: r.custom_id ?? undefined,
    category: r.category ?? undefined,
    location: r.location ?? undefined,
    quantity: Number(r.quantity ?? 0),
    reorderPoint: Number(r.reorder_point ?? 0),
    notes: r.notes ?? undefined,
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapLocation(r: Record<string, unknown>) {
  const mapPosition = (r.map_position as string) || '';
  let gridRow: number | undefined;
  let gridCol: number | undefined;
  let shelf: number | undefined;
  if (mapPosition) {
    const parts = mapPosition.split(',');
    if (parts[0]) gridRow = Number(parts[0]) || undefined;
    if (parts[1]) gridCol = Number(parts[1]) || undefined;
    if (parts[2]) shelf = Number(parts[2]) || undefined;
  }
  return {
    id: r.id,
    name: r.name,
    code: r.code ?? undefined,
    notes: r.notes ?? undefined,
    mapPosition: mapPosition || undefined,
    maxQty: r.max_qty != null ? Number(r.max_qty) : undefined,
    gridRow,
    gridCol,
    shelf,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapCategory(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapPartner(r: Record<string, unknown>) {
  let rolesStr = '';
  try {
    const parsed = JSON.parse(String(r.roles || '[]'));
    if (Array.isArray(parsed)) rolesStr = parsed.join(',');
    else rolesStr = String(r.roles || '');
  } catch {
    rolesStr = String(r.roles || '');
  }
  return {
    id: r.id,
    name: r.name,
    code: r.code ?? undefined,
    roles: rolesStr,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapMovement(r: Record<string, unknown>) {
  return {
    id: r.id,
    productId: r.product_id,
    change: Number(r.change),
    reason: r.reason ?? undefined,
    createdAt: r.created_at,
  };
}

export function parseRoles(input: unknown): string {
  if (Array.isArray(input)) return JSON.stringify(input);
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return '[]';
    if (s.startsWith('[')) return s;
    return JSON.stringify(
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    );
  }
  return '[]';
}

export function locationMapPosition(loc: Json): string | null {
  if (typeof loc.mapPosition === 'string') return loc.mapPosition || null;
  const row = loc.gridRow;
  const col = loc.gridCol;
  const shelf = loc.shelf;
  if (row == null || col == null) {
    return shelf != null ? `,,${shelf}` : null;
  }
  const parts = [String(row), String(col)];
  if (shelf != null) parts.push(String(shelf));
  return parts.join(',');
}
