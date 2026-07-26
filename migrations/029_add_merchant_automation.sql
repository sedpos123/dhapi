ALTER TABLE providers ADD COLUMN merchant_metrics TEXT DEFAULT '{}';
ALTER TABLE providers ADD COLUMN merchant_metrics_updated_at TEXT DEFAULT '';

ALTER TABLE merchants ADD COLUMN api_token_hash TEXT DEFAULT '';
ALTER TABLE merchants ADD COLUMN api_token_prefix TEXT DEFAULT '';
ALTER TABLE merchants ADD COLUMN api_token_created_at TEXT DEFAULT '';
ALTER TABLE merchants ADD COLUMN last_sync_at TEXT DEFAULT '';
