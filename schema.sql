-- D1 Schema for llm-nav
CREATE TABLE IF NOT EXISTS providers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#888',
  category     TEXT NOT NULL,
  desc         TEXT DEFAULT '',
  rating       REAL DEFAULT 0,
  reviews      INTEGER DEFAULT 0,
  brands       TEXT DEFAULT '[]',
  features     TEXT DEFAULT '[]',
  status       TEXT DEFAULT 'ok',
  uptime       TEXT DEFAULT '—',
  speed        TEXT DEFAULT '—',
  url          TEXT DEFAULT '#',
  online       INTEGER DEFAULT 1,
  input_price  TEXT DEFAULT '',
  output_price TEXT DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  updated_at   TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS brands (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
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
  submitted_at   TEXT DEFAULT (datetime('now','localtime')),
  status         TEXT DEFAULT 'pending'
);
