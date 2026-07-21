-- Migration: 评价体系
-- 日期: 2026-05-26
-- 影响: 新建 reviews 表

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id  TEXT NOT NULL,
  score        INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  tags         TEXT DEFAULT '[]',
  content      TEXT DEFAULT '',
  email_hash   TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending',
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
