-- Migration: 商家自助服务
-- 日期: 2026-05-27
-- 影响: 新建 merchants 表, reviews 新增 merchant_reply 字段

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

CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_provider ON merchants(provider_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

ALTER TABLE reviews ADD COLUMN merchant_reply TEXT DEFAULT NULL;
