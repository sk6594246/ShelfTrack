# Deploy the D1 Worker

## Option A — Monolithic (recommended)

1. Open Cloudflare Workers → your `shelftrack` worker → Edit code
2. Replace with the full source from the Grok project artifact:
   - `ShelfTrack_WORKER_index.ts` (complete single-file Worker)
   OR from local path after pull: ask Grok for the full file if missing on GitHub
3. Ensure D1 binding name is `DB`
4. Save & Deploy

## Option B — Wrangler (modular)

Repo has `worker/src/helpers.ts`, `actions.ts`, `index.ts`.
You still need `productActions.ts` and `masterActions.ts` (generated in the same session).
Until those are on GitHub, use Option A.

## Frontend

```
VITE_D1_API_URL=https://shelftrack.sk6594246.workers.dev
```

Rebuild the app (Netlify/Vercel).

## Test

```bash
curl https://shelftrack.sk6594246.workers.dev/
curl -X POST https://shelftrack.sk6594246.workers.dev/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"ensureTenant"}'
curl -X POST https://shelftrack.sk6594246.workers.dev/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"getProducts","tenantId":"default"}'
```
