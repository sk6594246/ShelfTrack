# ShelfTrack D1 API (Cloudflare Worker)

## Setup

1. Schema already applied in D1 Studio (or run):
   ```bash
   npx wrangler d1 execute shelftrack --file=./schema.sql --remote
   ```
2. Set `database_id` in `wrangler.toml` from Cloudflare dashboard if needed.
3. Deploy:
   ```bash
   npm install
   npx wrangler deploy
   ```

## Protocol

- `GET /` → health `{ status, service, time }`
- `POST /` body `{ action, tenantId?, ... }` → same actions as legacy GAS

Default tenant id: `default` (auto-created).

## Frontend

Set `VITE_D1_API_URL` to the Worker URL and rebuild the app.
