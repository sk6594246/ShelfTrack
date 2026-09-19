import {
  type Env,
  type Json,
  json,
  nowIso,
  ensureDefaultTenant,
  resolveTenantId,
} from './helpers';
import { handleAction } from './actions';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return json({ ok: true });
    }

    if (request.method === 'GET') {
      return json({
        status: 'ok',
        service: 'ShelfTrack D1 API',
        time: nowIso(),
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    try {
      const body = (await request.json()) as Json;
      const action = String(body.action || '');
      if (!action) return json({ error: 'Missing action' }, 400);

      await ensureDefaultTenant(env.DB);
      const tenantId = resolveTenantId(body);

      const result = await handleAction(env.DB, tenantId, action, body);
      return json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 400);
    }
  },
};
