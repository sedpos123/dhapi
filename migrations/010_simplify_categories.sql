-- Simplify category taxonomy to two user-facing choices
-- Date: 2026-07-21

-- Keep only official model websites/API platforms as official direct.
UPDATE providers
SET category = '官方直连'
WHERE id IN (
  'deepseek',
  'zhipu',
  'moonshot',
  'baichuan',
  'volcengine',
  'ali-bailian',
  'xfyun',
  'minimax'
);

-- Everything else is a third-party aggregation/relay option.
UPDATE providers
SET category = '聚合中转'
WHERE category <> '官方直连';

-- Replace the visible category list.
DELETE FROM categories;

INSERT INTO categories (name, description) VALUES
('官方直连', '官方模型官网或官方 API 平台，由模型厂商直接提供服务'),
('聚合中转', '所有非官方直连的第三方聚合、中转或统一接入平台');
