-- D1 Schema for llm-nav
CREATE TABLE IF NOT EXISTS providers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#888',
  logo_url     TEXT DEFAULT '',
  category     TEXT NOT NULL,
  desc         TEXT DEFAULT '',
  brands       TEXT DEFAULT '[]',
  features     TEXT DEFAULT '[]',
  status       TEXT DEFAULT 'ok',
  founded_at   TEXT DEFAULT '',
  url          TEXT DEFAULT '#',
  online       INTEGER DEFAULT 1,
  input_price  TEXT DEFAULT '',
  output_price TEXT DEFAULT '',
  sort_order   INTEGER DEFAULT 0,
  click_count    INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  billing_type   TEXT DEFAULT '',
  supported_models TEXT DEFAULT '[]',
  target_audience TEXT DEFAULT '',
  free_quota     INTEGER DEFAULT 0,
  avg_rating     REAL DEFAULT 0,
  review_count   INTEGER DEFAULT 0,
  pricing_plans  TEXT DEFAULT '[]',
  site_status    TEXT DEFAULT 'unknown',
  site_checked_at TEXT DEFAULT '',
  site_status_code INTEGER DEFAULT 0,
  site_latency_ms INTEGER DEFAULT 0,
  site_error     TEXT DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  updated_at   TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS brands (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pending_submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  url            TEXT DEFAULT '',
  category       TEXT DEFAULT '',
  desc           TEXT DEFAULT '',
  brands         TEXT DEFAULT '[]',
  features       TEXT DEFAULT '[]',
  input_price    TEXT DEFAULT '',
  output_price   TEXT DEFAULT '',
  contact_email  TEXT DEFAULT '',
  contact_wechat TEXT DEFAULT '',
  extra_note     TEXT DEFAULT '',
  logo_color     TEXT DEFAULT '#888',
  logo_url       TEXT DEFAULT '',
  billing_type   TEXT DEFAULT '',
  supported_models TEXT DEFAULT '[]',
  target_audience TEXT DEFAULT '',
  free_quota     INTEGER DEFAULT 0,
  submitted_at   TEXT DEFAULT (datetime('now','localtime')),
  status         TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id  TEXT NOT NULL,
  score        INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  tags         TEXT DEFAULT '[]',
  content      TEXT DEFAULT '',
  email_hash   TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending',
  merchant_reply TEXT DEFAULT NULL,
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS merchants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  provider_id   TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  updated_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS provider_monitoring (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id    TEXT NOT NULL,
  family         TEXT DEFAULT '',
  availability   REAL DEFAULT 0,
  latency_recent REAL DEFAULT 0,
  latency_7d     REAL DEFAULT 0,
  cache_hit_rate REAL DEFAULT 0,
  sample_count   INTEGER DEFAULT 0,
  source         TEXT DEFAULT 'manual',
  note           TEXT DEFAULT '',
  checked_at     TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE INDEX IF NOT EXISTS idx_providers_online_sort ON providers(online, sort_order);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_site_status ON providers(site_status);
CREATE INDEX IF NOT EXISTS idx_pending_status_submitted ON pending_submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_status ON reviews(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_merchants_provider_status ON merchants(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_monitoring_provider ON provider_monitoring(provider_id, checked_at);
