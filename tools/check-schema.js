const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(':memory:');
const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
db.exec(schema);

const requiredColumns = {
  providers: ['id', 'name', 'logo_url', 'supported_models', 'avg_rating', 'review_count', 'sort_order', 'pricing_plans', 'promotion', 'merchant_metrics', 'merchant_metrics_updated_at', 'site_status', 'site_checked_at', 'site_status_code', 'site_latency_ms', 'site_error', 'site_error_days'],
  pending_submissions: ['id', 'name', 'logo_url', 'supported_models', 'status'],
  reviews: ['id', 'provider_id', 'score', 'status', 'merchant_reply'],
  merchants: ['id', 'email', 'password_hash', 'provider_id', 'status', 'api_token_hash', 'api_token_prefix', 'api_token_created_at', 'last_sync_at'],
  sponsor_leads: ['id', 'provider_name', 'contact_email', 'contact_wechat', 'package_code', 'status']
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
  'idx_merchants_provider_status',
  'idx_sponsor_leads_status_created'
];
const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map(row => row.name));
for (const index of requiredIndexes) {
  if (!indexes.has(index)) throw new Error(`${index} is missing from schema.sql`);
}

db.close();
console.log('Database schema check passed');
