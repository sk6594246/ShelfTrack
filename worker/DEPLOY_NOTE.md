# Deploy the D1 Worker (MU-02 multi-user)

## Status
- `loginUser` / `listUsers` work on live API after your deploy.
- **Bug fixed 2026-09-26:** `registerUser` must use `newUsername` / `newPin` (not the admin auth fields).
- Redeploy Worker from `artifacts/Shelf-Track/ShelfTrack_worker.js` (or `worker/src/index.js`) for create-user to work from Settings.

## 1. Users table (if not done)
Run `worker/migrations/0002_users.sql` in D1 Console.

## 2. Optional seed team accounts
Run `worker/migrations/0003_seed_team_users.sql`:
- `worker1` / PIN `1234` (role worker)
- `manager1` / PIN `5678` (role manager)
- existing `sk` / `787255` (admin)

## 3. Redeploy Worker (registerUser fix)
Cloudflare → Workers → **shelftrackapiworker** → paste full `ShelfTrack_worker.js` → Save & Deploy. Binding: `DB`.

## 4. Frontend
- Settings → People → Add user (admin only)
- Login: company + username + PIN via `loginUser`

## Test
```bash
# List
curl -X POST https://shelftrackapiworker.sk6594246.workers.dev/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"listUsers","tenantId":"sk_enterprise","username":"sk","pin":"787255"}'

# Register (after worker fix)
curl -X POST https://shelftrackapiworker.sk6594246.workers.dev/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"registerUser","tenantId":"sk_enterprise","username":"sk","pin":"787255","newUsername":"worker2","newPin":"9999","role":"worker","displayName":"W2"}'

# Login as worker
curl -X POST https://shelftrackapiworker.sk6594246.workers.dev/ \
  -H 'Content-Type: application/json' \
  -d '{"action":"loginUser","tenantId":"sk_enterprise","username":"worker1","pin":"1234"}'
```
