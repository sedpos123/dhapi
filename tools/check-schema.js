const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(':memory:');
const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
db.exec(schema);

const requiredColumns = {
  providers: ['id', 'name', 'logo_url', 'supported_models', 'avg_rating', 'review_count', 'sort_order', 'site_status', 'site_checked_at', 'site_status_code', 'site_latency_ms', 'site_error'],
  pending_submissions: ['id', 'name', 'logo_url', 'supported_models', 'status'],
  reviews: ['id', 'provider_id', 'score', 'status', 'merchant_reply'],
  merchants: ['id', 'email', 'password_hash', 'provider_id', 'status']
};

for (const [table, columns] of Object.entries(requiredColumns)) {
  const actual = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name));
  for (const column of columns) {
    if (!actual.has(column)) throw new Error(`${table}.${column} is missing from schema.sql`);
  }
}

const requiredIndexes = [
  'idx_providers_online_sort',
  'idx_providers_category',
  'idx_providers_site_status',
  'idx_pending_status_submitted',
  'idx_reviews_provider_status',
  'idx_merchants_provider_status'
];
const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map(row => row.name));
for (const index of requiredIndexes) {
  if (!indexes.has(index)) throw new Error(`${index} is missing from schema.sql`);
}

db.close();
console.log('Database schema check passed');
