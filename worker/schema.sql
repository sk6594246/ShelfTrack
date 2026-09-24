-- ShelfTrack D1 schema (multi-tenant)
-- Every business row is scoped by tenant_id.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  custom_id TEXT,
  category TEXT,
  location TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  reorder_point REAL NOT NULL DEFAULT 0,
  notes TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

CREATE TABLE IF NOT EXISTS movements (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  change REAL NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_movements_tenant ON movements(tenant_id);

CREATE TABLE IF NOT EXISTS locations (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  map_position TEXT,
  max_qty REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);

CREATE TABLE IF NOT EXISTS location_products (
  tenant_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  weightage REAL,
  PRIMARY KEY (tenant_id, location_id, product_id)
);

CREATE TABLE IF NOT EXISTS categories (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS partners (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  roles TEXT NOT NULL DEFAULT '[]',
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

-- users (multi-role per tenant)
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
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
