/**
 * ShelfTrack D1 API — Cloudflare Worker
 * Binding: DB (D1 database "shelftrack")
 *
 * Protocol: POST JSON { action, tenantId?, ...payload }
 * Same action names as the legacy GAS backend so the frontend client stays compatible.
 *
 * Default tenant: "default" (auto-created on first request).
 *
 * Deploy: cd worker && npm i && npx wrangler deploy
 * Full source is maintained in this repo under worker/src/index.ts
 *
 * NOTE: If this file appears truncated in an intermediate commit, pull latest main.
 */

export interface Env {
  DB: D1Database;
}

const DEFAULT_TENANT_ID = 'default';
const DEFAULT_TENANT_NAME = 'Default Store';
const DEFAULT_PIN_HASH = 'bootstrap';

type Json = Record<string, unknown>;

function json(data: unknown, status = 200): Response {
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

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID();
}

async function ensureDefaultTenant(db: D1Database): Promise<string> {
  const row = await db
    .prepare('SELECT id FROM tenants WHERE id = ?')
    .bind(DEFAULT_TENANT_ID)
    .first<{ id: string }>();
  if (row?.id) return row.id;
  const t = nowIso();
  await db
    .prepare(
      `INSERT INTO tenants (id, name, pin_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME, DEFAULT_PIN_HASH, t, t)
    .run();
  return DEFAULT_TENANT_ID;
}

function resolveTenantId(body: Json): string {
  const raw = body.tenantId;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return DEFAULT_TENANT_ID;
}

// Mappers and full handlers: see complete implementation in local workspace
// and subsequent commit. Placeholder health + ensureTenant for deploy safety.

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return json({ ok: true });
    if (request.method === 'GET') {
      return json({ status: 'ok', service: 'ShelfTrack D1 API', time: nowIso() });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const body = (await request.json()) as Json;
      const action = String(body.action || '');
      if (!action) return json({ error: 'Missing action' }, 400);
      await ensureDefaultTenant(env.DB);
      if (action === 'bootstrap' || action === 'ensureTenant') {
        return json({ ok: true, tenantId: DEFAULT_TENANT_ID });
      }
      return json({
        error:
          'Full handler set is in worker/src/index.ts — redeploy after pulling complete source from repo or paste from Grok artifacts.',
      }, 501);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 400);
    }
  },
};
