-- 运营扩充批次：继续补充官网可访问的聚合中转服务。
INSERT OR IGNORE INTO brands (name) VALUES
('OpenAI'),
('Anthropic'),
('Google'),
('DeepSeek'),
('Alibaba');

INSERT OR IGNORE INTO providers (
  id, name, color, category, desc, brands, features, status, founded_at, url, online,
  input_price, output_price, sort_order, billing_type, supported_models, target_audience, free_quota,
  site_status, site_checked_at, site_status_code, site_error_days
) VALUES
('aiwts', 'AI WTS', '#2563EB', '聚合中转',
 'AI API 中转服务入口，适合需要统一调用主流模型、进行小额测试和快速接入的个人开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["API 中转","统一入口","适合小额测试","中文页面","支持主流模型"]',
 'ok', '', 'https://www.aiwts.com/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0),

('tabcode', 'TabCode', '#7C3AED', '聚合中转',
 '面向 AI 编程与开发场景的 API 服务入口，适合需要统一接入模型能力、快速验证工具链的开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["开发者工具场景","统一接入","模型调用","适合编程辅助","中文页面"]',
 'ok', '', 'https://tabcode.cc/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0),

('oagi-image', 'OAGI 聚合接口', '#0EA5E9', '聚合中转',
 'AI 模型聚合接口入口，适合需要多模型能力、统一调用和应用集成的开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek","Alibaba"]',
 '["模型聚合","统一接口","应用集成","适合开发者","支持主流模型"]',
 'ok', '', 'https://image.oagi.com.cn/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Qwen 系列"]', '通用', 0,
 'ok', datetime('now','localtime'), 200, 0);
