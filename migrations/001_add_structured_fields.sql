-- Migration: 添加结构化筛选字段
-- 日期: 2026-05-26
-- 影响: providers 表 + pending_submissions 表

-- providers 表新增字段
ALTER TABLE providers ADD COLUMN billing_type TEXT DEFAULT '';
ALTER TABLE providers ADD COLUMN supported_models TEXT DEFAULT '[]';
ALTER TABLE providers ADD COLUMN target_audience TEXT DEFAULT '';
ALTER TABLE providers ADD COLUMN free_quota INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN avg_rating REAL DEFAULT 0;
ALTER TABLE providers ADD COLUMN review_count INTEGER DEFAULT 0;

-- pending_submissions 表新增字段
ALTER TABLE pending_submissions ADD COLUMN billing_type TEXT DEFAULT '';
ALTER TABLE pending_submissions ADD COLUMN supported_models TEXT DEFAULT '[]';
ALTER TABLE pending_submissions ADD COLUMN target_audience TEXT DEFAULT '';
ALTER TABLE pending_submissions ADD COLUMN free_quota INTEGER DEFAULT 0;
