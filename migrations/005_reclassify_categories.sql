-- 分类迁移：旧分类 → 新分类体系
-- 日期: 2026-05-28

-- 1. 更新 providers 表中的分类名称
UPDATE providers SET category = '官方直连' WHERE category = '国产模型';
UPDATE providers SET category = '专注中转' WHERE category IN ('专注 OpenAI', '专注 Anthropic');
UPDATE providers SET category = '聚合平台' WHERE category = '多模型聚合';
UPDATE providers SET category = '综合中转' WHERE category = '开源方案';

-- 2. 更新/插入新分类及描述
UPDATE categories SET name = '综合中转', description = '覆盖多家模型厂商（OpenAI、Claude、Gemini 等），提供统一 API 接口，一个账号用遍所有模型' WHERE id = 1;
UPDATE categories SET name = '专注中转', description = '专注某一模型生态的深度中转，如只做 OpenAI 系或只做 Claude，提供更优价格或更深度优化' WHERE id = 2;
UPDATE categories SET name = '官方直连', description = '模型厂商直接提供 API 服务，如 OpenAI、智谱 AI、百川智能等官方接口' WHERE id = 4;
UPDATE categories SET name = '聚合平台', description = '提供 Web 管理面板、用量统计、多 Key 管理、团队协作等企业级功能，适合规模化使用' WHERE id = 5;

-- 3. 删除不再使用的旧分类（id=3 专注Anthropic, id=6 开源方案）
DELETE FROM categories WHERE id IN (3, 6);
