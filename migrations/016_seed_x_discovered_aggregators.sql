-- X 运营发现批次：从相关讨论和公开资料中确认官网可访问后补充。
INSERT OR IGNORE INTO brands (name) VALUES
('OpenAI'),
('Anthropic'),
('Google'),
('DeepSeek'),
('xAI');

INSERT OR IGNORE INTO providers (
  id, name, color, category, desc, brands, features, status, founded_at, url, online,
  input_price, output_price, sort_order, billing_type, supported_models, target_audience, free_quota,
  site_status, site_checked_at, site_status_code, site_error_days
) VALUES
('worldrouter', 'WorldRouter', '#2563EB', '聚合中转',
 'WorldClaw 旗下多模型 API 聚合入口，主打一个 API Key 调用多品牌模型，适合开发者测试和应用接入。',
 '["OpenAI","Anthropic","Google","DeepSeek","xAI"]',
 '["多模型聚合","统一 API Key","开发者计划","模型覆盖较广","适合应用原型"]',
 'ok', '', 'https://router.worldclaw.ai/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Grok 系列"]', '个人开发者', 1,
 'ok', datetime('now','localtime'), 200, 0),

('aicoming', 'AIComing', '#7C3AED', '聚合中转',
 '平台型 AI API 聚合服务，强调统一接入、商家分站、计费结算和多模型管理，适合开发者与服务商共同使用。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["平台型中转","商家分站","统一接入","计费管理","多模型路由"]',
 'ok', '', 'https://aicoming.top/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '通用', 0,
 'ok', datetime('now','localtime'), 200, 0),

('aitongdao', 'AI通道', '#0EA5E9', '聚合中转',
 'AI API 聚合服务文档入口，面向需要统一调用主流模型、快速接入和评估多模型能力的开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["文档入口清晰","多模型支持","统一调用","中文说明","适合开发集成"]',
 'ok', '', 'https://docs.aitongdao.com/guide/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0);
