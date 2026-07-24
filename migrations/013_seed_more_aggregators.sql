-- 第一批运营扩充：新增聚合中转类服务商候选，均已做官网可访问性基础核验。
INSERT OR IGNORE INTO brands (name) VALUES
('xAI'),
('Mistral'),
('Moonshot'),
('OpenClaw');

INSERT OR IGNORE INTO providers (
  id, name, color, category, desc, brands, features, status, founded_at, url, online,
  input_price, output_price, sort_order, billing_type, supported_models, target_audience, free_quota
) VALUES
('datapipe', 'DataPipe', '#2563EB', '聚合中转',
 '多模型 API 聚合平台，面向个人开发者和团队提供统一接入入口，适合需要集中管理多品牌模型的项目。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["多模型统一入口","适合开发者接入","支持主流模型品牌","中文页面友好","可用于应用集成"]',
 'ok', '', 'https://datapipe.app/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0),

('greatrouter', 'GreatRouter', '#7C3AED', '聚合中转',
 '聚合多品牌模型的统一 API 入口，适合需要 OpenAI 兼容调用、多模型切换和成本弹性管理的开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek","xAI"]',
 '["OpenAI 兼容格式","多模型切换","聚合计费入口","面向开发者","支持常见模型调用"]',
 'ok', '', 'https://www.greatrouter.com/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Grok 系列"]', '个人开发者', 0),

('sunapi', 'SunAPI', '#F97316', '聚合中转',
 'AI 模型聚合与分发平台，主打稳定高效的统一 API 接入，适合需要多模型能力的应用和团队。',
 '["OpenAI","Anthropic","Google","DeepSeek","Alibaba"]',
 '["多模型聚合","统一 API 接入","面向应用开发","支持国产与海外模型","中文服务页面"]',
 'ok', '', 'https://sunapi.ai/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Qwen 系列"]', '通用', 0),

('quickrouter', 'QuickRouter', '#0EA5E9', '聚合中转',
 '大模型 API 聚合服务，提供模型列表与统一接入能力，适合快速测试和切换不同模型。',
 '["OpenAI","Anthropic","Google","DeepSeek","Mistral"]',
 '["模型列表清晰","统一接入入口","适合快速测试","支持多品牌模型","按需选择模型"]',
 'ok', '', 'https://quickrouter.ai/models', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列","Mistral 系列"]', '个人开发者', 0),

('chipcloud', 'ChipCloud AI', '#16A34A', '聚合中转',
 'AI 大模型聚合平台，面向开发者提供多模型调用入口，适合需要统一管理不同模型服务的场景。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["大模型聚合","统一调用入口","中文页面","适合开发者","支持多类应用场景"]',
 'ok', '', 'https://www.chipcloud.cc/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '通用', 0),

('openclaw-api', 'OpenClaw API', '#9333EA', '聚合中转',
 '提供文档化的多模型 API 服务入口，适合需要按文档快速接入、测试和集成模型能力的开发者。',
 '["OpenAI","Anthropic","Google","OpenClaw"]',
 '["文档入口清晰","多模型接入","面向开发集成","支持常见模型能力","适合测试评估"]',
 'ok', '', 'https://docs.openclaw-api.com/about/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列"]', '个人开发者', 0),

('nx-ai', 'NX AI', '#111827', '聚合中转',
 '多模型聚合服务入口，适合希望通过统一平台体验和调用不同 AI 模型能力的个人与团队。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["多模型聚合","统一体验入口","中文服务页面","适合个人与团队","支持主流模型"]',
 'ok', '', 'https://nxaiapp.com/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '通用', 0),

('llmapi-pro', 'LLM API', '#DC2626', '聚合中转',
 '多模型 API 服务入口，覆盖 Claude、GPT、Gemini 等模型，适合需要一个 Key 管理多模型调用的开发者。',
 '["OpenAI","Anthropic","Google","DeepSeek"]',
 '["一 Key 多模型","覆盖主流模型","适合开发者接入","多协议支持","有公开说明页面"]',
 'ok', '', 'https://llmapi.pro/', 1, '', '', 0, 'pay_as_you_go',
 '["GPT 系列","Claude 系列","Gemini 系列","DeepSeek 系列"]', '个人开发者', 0);
