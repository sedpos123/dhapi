-- 批量添加商家 + 新增品牌 + 修正分类
-- 日期: 2026-05-28

-- ========= 新增品牌 =========
INSERT OR IGNORE INTO brands (name) VALUES ('Baichuan');
INSERT OR IGNORE INTO brands (name) VALUES ('iFlytek');
INSERT OR IGNORE INTO brands (name) VALUES ('ByteDance');
INSERT OR IGNORE INTO brands (name) VALUES ('MiniMax');
INSERT OR IGNORE INTO brands (name) VALUES ('SiliconFlow');
INSERT OR IGNORE INTO brands (name) VALUES ('Yi');

-- ========= 修正现有商家 =========
-- DeepSeek 是官方平台，应归为"官方直连"
UPDATE providers SET category = '官方直连', desc = 'DeepSeek 官方 API 平台，DeepSeek-V3 / R1 系列模型，性价比极高，推理能力突出。' WHERE id = 'deepseek';

-- New API 是开源项目，不是实际运营商家，下线
UPDATE providers SET online = 0 WHERE id = 'newapi';

-- ========= 官方直连 (5 家) =========
INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('baichuan', '百川智能', 'https://platform.baichuan-ai.com', '官方直连', '#3b82f6',
  '百川智能官方 API 平台，Baichuan 4 / 3 Turbo 系列，搜索增强 + 企业知识库，支持长上下文。',
  '["Baichuan"]',
  '["搜索增强", "企业知识库", "长上下文"]',
  'ok', '2023-04', 'pay_as_you_go', '0.012', '0.012', '企业', 1, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('volcengine', '火山引擎', 'https://www.volcengine.com/product/doubao', '官方直连', '#06b6d4',
  '字节跳动旗下 AI 平台，豆包大模型，经字节 50+ 业务场景验证，每日千亿级 tokens 调用量。',
  '["ByteDance"]',
  '["企业合规", "高并发", "场景丰富"]',
  'ok', '2023-09', 'pay_as_you_go', '0.004', '0.008', '企业', 1, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('ali-bailian', '阿里百炼', 'https://bailian.console.aliyun.com', '官方直连', '#f97316',
  '阿里云大模型服务平台，通义千问 Qwen 系列，一站式模型应用开发，支持 Agent、RAG 等。',
  '["Alibaba"]',
  '["Agent", "RAG", "应用开发平台"]',
  'ok', '2023-09', 'pay_as_you_go', '0.008', '0.024', '通用', 1, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('xfyun', '讯飞开放平台', 'https://www.xfyun.cn', '官方直连', '#8b5cf6',
  '科大讯飞星火大模型 API，Lite 版永久免费，Pro/Max 版本低至 0.021 元/千 tokens，语音技术行业领先。',
  '["iFlytek"]',
  '["语音识别", "Lite免费版", "性价比高"]',
  'ok', '2023-05', 'pay_as_you_go', '0.021', '0.021', '通用', 1, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('minimax', 'MiniMax', 'https://platform.minimaxi.com', '官方直连', '#ec4899',
  'MiniMax 官方 API 平台，abab 系列模型，多模态能力强，语音合成技术领先，支持角色扮演等场景。',
  '["MiniMax"]',
  '["多模态", "语音合成", "角色扮演"]',
  'ok', '2023-06', 'pay_as_you_go', '0.01', '0.01', '个人开发者', 1, 1, 0);

-- ========= 聚合中转 (5 家) =========
INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('302ai', '302.AI', 'https://302.ai', '聚合中转', '#10b981',
  '企业级 AI 资源平台，按用量付费，一站式接入 150+ 模型，提供 Web 应用和管理面板，与硅基流动官方合作。',
  '["OpenAI", "Anthropic", "Google", "DeepSeek", "Baichuan", "SiliconFlow"]',
  '["订阅制", "企业级", "Web面板", "150+模型"]',
  'ok', '2024-01', 'subscription', '', '', '企业', 0, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('siliconflow', '硅基流动', 'https://siliconflow.cn', '聚合中转', '#6366f1',
  '200+ 模型云服务，主打开源模型深度优化和极低成本推理，9B 以下模型免费使用，兼容 OpenAI API 标准。',
  '["DeepSeek", "SiliconFlow", "Baichuan", "Zhipu", "Alibaba"]',
  '["开源模型免费", "深度优化", "200+模型", "低成本"]',
  'ok', '2023-08', 'pay_as_you_go', '', '', '通用', 1, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('aihubmix', 'AiHubMix', 'https://aihubmix.com', '聚合中转', '#f59e0b',
  'AI 模型 API 路由服务，基于统一 OpenAI API 标准，300+ 模型覆盖，接入简单，适合研发阶段快速验证。',
  '["OpenAI", "Anthropic", "Google", "DeepSeek", "Mistral"]',
  '["300+模型", "OpenAI兼容", "开发者友好"]',
  'ok', '2024-06', 'pay_as_you_go', '', '', '个人开发者', 0, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('openrouter', 'OpenRouter', 'https://openrouter.ai', '聚合中转', '#14b8a6',
  '全球最大模型聚合平台之一，300+ 模型，OpenAI 兼容接口，支持加密货币支付，海外延迟低。',
  '["OpenAI", "Anthropic", "Google", "Mistral", "Meta"]',
  '["全球覆盖", "300+模型", "加密货币支付"]',
  'ok', '2023-03', 'pay_as_you_go', '', '', '通用', 0, 1, 0);

INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('lingyaapi', '灵芽API', 'https://api.lingyaai.cn', '聚合中转', '#84cc16',
  '专业大模型 API 中转平台，支持 600+ 模型统一路由，高可用架构，国内直连稳定。',
  '["OpenAI", "Anthropic", "Google", "DeepSeek"]',
  '["600+模型", "统一路由", "高可用"]',
  'ok', '2024-08', 'pay_as_you_go', '', '', '通用', 0, 1, 0);

-- ========= 聚合中转 (1 家) =========
INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('wildcard', 'WildCard', 'https://bewildcard.com', '聚合中转', '#a855f7',
  '专注 OpenAI 系列中转，API 价格与官方一致，充值手续费 3.5%，提供虚拟信用卡开通过 OpenAI Plus。',
  '["OpenAI"]',
  '["OpenAI官方价格", "虚拟信用卡", "3.5%手续费"]',
  'ok', '2023-06', 'pay_as_you_go', '', '', '个人开发者', 0, 1, 0);

-- ========= 聚合中转 (1 家) =========
INSERT INTO providers (id, name, url, category, color, desc, brands, features, status, founded_at, billing_type, input_price, output_price, target_audience, free_quota, online, sort_order)
VALUES ('nonelinear', '非线智能', 'https://nonelinear.com', '聚合中转', '#0ea5e9',
  '全协议覆盖企业级 API 平台，480+ 模型，99.99% SLA，自动故障转移路由，企业级管理和合规，价格为官方 80-95%。',
  '["OpenAI", "Anthropic", "Google", "DeepSeek", "Zhipu"]',
  '["480+模型", "99.99%SLA", "自动故障转移", "企业管理", "全协议"]',
  'ok', '2024-03', 'pay_as_you_go', '', '', '企业', 1, 1, 0);
