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

CREATE TABLE IF NOT EXISTS partner_products (
  tenant_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (tenant_id, partner_id, product_id, role)
);

CREATE TABLE IF NOT EXISTS documents (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  partner_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  posted_at TEXT,
  reversed_at TEXT,
  reverses_document_id TEXT,
  reversed_by_document_id TEXT,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);

CREATE TABLE IF NOT EXISTS document_lines (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  location_id TEXT,
  from_location_id TEXT,
  to_location_id TEXT,
  notes TEXT,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_doc_lines_doc ON document_lines(tenant_id, document_id);

CREATE TABLE IF NOT EXISTS stock_batches (
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  remaining REAL NOT NULL,
  received_at TEXT NOT NULL,
  document_id TEXT,
  document_line_id TEXT,
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_batches_tenant ON stock_batches(tenant_id);

CREATE TABLE IF NOT EXISTS config (
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (tenant_id, key)
);
