-- 运营扩充批次：继续补充官网可访问的聚合中转站。
INSERT OR IGNORE INTO brands (name) VALUES
('OpenAI'),
('Anthropic'),
('Google'),
('DeepSeek'),
('Alibaba'),
('Moonshot');

INSERT OR IGNORE INTO providers (
  id, name, color, category, desc, brands, features, status, founded_at, url, online,
  input_price, output_price, sort_order, billing_type, supported_models, target_audience, free_quota,
  site_status, site_checked_at, site_status_code, site_error_days
) VALUES
('api-shop', 'API.shop', '#0F766E', '聚合中转',
 '多模型 API 聚合中转站，面向开发者提供统一接口入口，适合需要集中比较和调用主流 AI 模型的项目。',
 '["OpenAI","Anthropic","Google","DeepSeek","Alibaba"]',
 '["多模型聚合","统一接口","AI 接口商店","适合开发者接入","支持主流模型"]',
 'ok', '', 'https://api.shop/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Qwen 系列"]', '通用', 0,
 'ok', datetime('now','localtime'), 200, 0),

('api-yi', 'API易', '#2563EB', '聚合中转',
 '聚合国产 AI 大模型的 API 中转站，适合需要中文服务页面、国产模型优先和统一接入的开发者。',
 '["DeepSeek","Alibaba","Moonshot","OpenAI"]',
 '["国产模型聚合","中文页面","统一 API 入口","适合个人开发者","支持多模型测试"]',
 'ok', '', 'https://api.douyuntong.com/', 1, '', '', 0, 'pay_as_you_go',
 '["DeepSeek 系列","Qwen 系列","Kimi 系列","GPT 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0),

('juxingai', '聚星AI', '#7C3AED', '聚合中转',
 'AI 模型中转服务入口，适合个人开发者进行模型调用测试、统一管理和小额接入验证。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["模型中转","统一入口","适合小额测试","中文服务页面","支持主流模型"]',
 'ok', '', 'https://juxingai.top/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0),

('gujibeiwan-api', '国外AI大模型聚合平台', '#EA580C', '聚合中转',
 '国外 AI 大模型 API 聚合平台，适合需要统一访问海外主流模型、对比多模型能力的用户。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["海外模型聚合","统一 API 入口","多模型对比","中文页面","适合开发者测试"]',
 'ok', '', 'https://www.gujibeiwanglu.com/index.html', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0),

('guiji-tiansuan', '硅基天算', '#16A34A', '聚合中转',
 'AI 大模型聚合平台，主打一站式调用多模型能力，适合需要丰富模型覆盖和统一接口管理的团队。',
 '["OpenAI","Anthropic","Google","DeepSeek","Alibaba"]',
 '["一站式调用","多模型聚合","模型覆盖较广","统一接口","适合团队接入"]',
 'ok', '', 'https://ai.guijimedia.com/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Qwen 系列"]', '通用', 0,
 'ok', datetime('now','localtime'), 200, 0),

('summerapi', '夏夏中转站', '#DC2626', '聚合中转',
 'AI 模型接口中转服务，适合需要 OpenAI 兼容调用、多模型试用和小额验证的个人开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["AI 模型接口","中转服务","适合小额测试","多模型调用","中文页面"]',
 'ok', '', 'https://summerapi.com/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0,
 'ok', datetime('now','localtime'), 200, 0),

('ruanjieapi', '阮捷智能 API', '#0EA5E9', '聚合中转',
 '企业级大模型聚合中转平台，适合需要较完整服务说明、统一接口和多模型管理能力的团队。',
 '["OpenAI","Anthropic","Google","DeepSeek","Alibaba"]',
 '["企业级聚合","统一接口","多模型管理","中文服务页面","适合团队"]',
 'ok', '', 'https://ruanjieapi.com/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Qwen 系列"]', '通用', 0,
 'ok', datetime('now','localtime'), 200, 0);
