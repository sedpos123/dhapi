-- Add indexes used by public listing, moderation, reviews, and merchant lookup.
CREATE INDEX IF NOT EXISTS idx_providers_online_sort ON providers(online, sort_order);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category);
CREATE INDEX IF NOT EXISTS idx_pending_status_submitted ON pending_submissions(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_status ON reviews(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_merchants_provider_status ON merchants(provider_id, status);
