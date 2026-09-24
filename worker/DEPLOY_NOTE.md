# Deploy the D1 Worker (MU-02 multi-user)

## 1. Apply users migration (D1)

In Cloudflare Dashboard → D1 → your database → Console, run:

```sql
CREATE TABLE IF NOT EXISTS users (
  tenant_id    TEXT NOT NULL,
  id           TEXT NOT NULL,
  username     TEXT NOT NULL,
  pin_hash     TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'worker',
  display_name TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username ON users (tenant_id, username);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
```

Or: `npx wrangler d1 execute <DB_NAME> --remote --file=worker/migrations/0002_users.sql`

## 2. Deploy full worker with user actions

Source of truth for the **complete** Worker (products + masters + loginUser/listUsers/registerUser):

- Artifact: `artifacts/ShelfTrack_worker.js` or `worker/src/index.js` in this project
- Cloudflare → Workers → `shelftrackapiworker` (or your API worker) → Edit code → paste full file → Save & Deploy
- Binding name must be `DB`

## 3. Seed first admin user (SQL)

After migration, insert admin matching your PIN hash, **or** use `registerTenant` / Settings People after deploy.

Quick path if you already login with legacy `authTenant`:
1. Deploy worker with loginUser
2. Register user via Settings → People (admin form)
3. Sign out and sign in with new username + PIN

## 4. Frontend

Already on main:
- `src/lib/d1Api.ts` — listUsers / registerUser / loginUser (+ retry)
- `src/pages/settings/Settings.tsx` — People panel
- Login still falls back to `authTenant` until `loginUser` exists on Worker

## Test

```bash
curl -X POST https://shelftrackapiworker.sk6594246.workers.dev/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"listUsers","tenantId":"sk_enterprise","username":"sk","pin":"787255"}'
```
