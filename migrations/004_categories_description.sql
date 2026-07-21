-- Migration: 分类描述字段
-- 日期: 2026-05-28
-- 影响: categories 表新增 description 字段

ALTER TABLE categories ADD COLUMN description TEXT DEFAULT '';
