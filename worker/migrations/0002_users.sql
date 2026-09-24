-- users table (multi-company + roles)
-- Apply via GUI or: npx wrangler d1 migrations apply shelftrack --remote

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username
  ON users (tenant_id, username);

CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON users (tenant_id);
