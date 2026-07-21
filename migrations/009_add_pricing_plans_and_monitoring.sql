-- 009: 定价套餐字段 + 服务状态监测表
-- 支持 PriceAI 风格详情页：按模型族展示倍率/分层价 + 可用率/延迟监测时间线

ALTER TABLE providers ADD COLUMN pricing_plans TEXT DEFAULT '[]';

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

CREATE INDEX IF NOT EXISTS idx_monitoring_provider ON provider_monitoring(provider_id, checked_at);
