-- Store latest website link check result for each provider
-- Date: 2026-07-21

ALTER TABLE providers ADD COLUMN site_status TEXT DEFAULT 'unknown';
ALTER TABLE providers ADD COLUMN site_checked_at TEXT DEFAULT '';
ALTER TABLE providers ADD COLUMN site_status_code INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN site_latency_ms INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN site_error TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_providers_site_status ON providers(site_status);
