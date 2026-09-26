-- Optional seed: worker1 + manager1 for multi-user tests
-- PIN worker1=1234, manager1=5678 (SHA-256, empty pepper)
-- Safe to re-run: INSERT OR IGNORE via unique username index fails if exists — use manual check

INSERT INTO users (tenant_id, id, username, pin_hash, role, display_name, active, created_at, updated_at)
SELECT 'sk_enterprise', lower(hex(randomblob(16))), 'worker1',
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  'worker', 'Floor Worker 1', 1, datetime('now'), datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE tenant_id = 'sk_enterprise' AND username = 'worker1'
);

INSERT INTO users (tenant_id, id, username, pin_hash, role, display_name, active, created_at, updated_at)
SELECT 'sk_enterprise', lower(hex(randomblob(16))), 'manager1',
  'f8638b979b2f4f793ddb6dbd197e0ee25a7a6ea32b0ae22f5e3c5d119d839e75',
  'manager', 'Shift Manager', 1, datetime('now'), datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE tenant_id = 'sk_enterprise' AND username = 'manager1'
);
