-- Track consecutive website check errors and hide long-failing providers
-- Date: 2026-07-23

ALTER TABLE providers ADD COLUMN site_error_days INTEGER DEFAULT 0;
