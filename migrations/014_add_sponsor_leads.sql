-- 变现冲刺：合作推广线索表
CREATE TABLE IF NOT EXISTS sponsor_leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_name  TEXT NOT NULL,
  website_url    TEXT DEFAULT '',
  contact_name   TEXT DEFAULT '',
  contact_email  TEXT DEFAULT '',
  contact_wechat TEXT DEFAULT '',
  package_code   TEXT DEFAULT '',
  budget         TEXT DEFAULT '',
  message        TEXT DEFAULT '',
  source         TEXT DEFAULT '',
  status         TEXT DEFAULT 'new',
  created_at     TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_sponsor_leads_status_created ON sponsor_leads(status, created_at DESC);
