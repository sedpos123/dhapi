-- Seed data for llm-nav
INSERT INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online) VALUES
('api2d', 'API2D', '#3B6F8C', '综合中转', '老牌中转，支持 OpenAI 全系列 + Claude，国内直连，按量计费，余额不过期。', 4.6, 1280, '["OpenAI","Anthropic"]', '["国内直连免梯","余额永不过期","多渠道自动切换","支持流式输出","API 兼容 OpenAI 格式"]', 'ok', '99.7%', '1.2s', '#', 1),
('closeai', 'CloseAI', '#8C5E3B', '综合中转', '主打稳定和速度，企业用户较多。支持 GPT-4 全系列和 Claude，提供 SLA 保障。', 4.5, 860, '["OpenAI","Anthropic"]', '["企业 SLA 保障","专线加速","支持 Function Calling","7×12 技术支持","并发无上限"]', 'ok', '99.5%', '1.0s', '#', 1),
('ohmygpt', 'OhMyGPT', '#6B3B8C', '多模型聚合', '聚合平台，一个 Key 调用 OpenAI / Anthropic / Google / Meta 等十余种品牌模型。', 4.3, 540, '["OpenAI","Anthropic","Google","Meta","Mistral"]', '["一 Key 多模型","按模型分别计价","支持 Embedding","自动负载均衡","免费额度体验"]', 'ok', '99.2%', '1.5s', '#', 1),
('siliconflow', '硅基流动', '#3B8C5E', '国产模型', '国产模型 API 平台，自研 SiliconCloud 推理加速，支持 DeepSeek、通义千问等主流国产大模型。', 4.4, 920, '["DeepSeek","Alibaba","Zhipu","01.AI","InternLM"]', '["国产模型首选","推理加速引擎","价格极低","免费额度充足","支持微调部署"]', 'ok', '99.6%', '0.8s', '#', 1),
('deepseek', 'DeepSeek', '#2E5FA1', '国产模型', '深度求索官方 API，DeepSeek-V3 / R1 推理模型，性价比极高，代码能力突出。', 4.7, 2100, '["DeepSeek"]', '["官方直供","推理模型 R1","代码能力顶尖","价格最低档","不限制并发"]', 'ok', '99.3%', '0.9s', '#', 1),
('aihub', 'AIHub', '#A16B2E', '多模型聚合', '轻量聚合平台，主打简单易用，适合个人开发者和小团队快速接入。', 4.1, 320, '["OpenAI","Anthropic","Google","Meta"]', '["零门槛接入","文档清晰","个人友好","按量计费无月费","支持 Webhook"]', 'ok', '98.8%', '1.8s', '#', 1),
('gptapi', 'GPT API US', '#5A3B8C', '专注 OpenAI', '专注 OpenAI 模型中转，GPT-4o / o1 系列价格低于官方，支持直连。', 4.2, 470, '["OpenAI"]', '["OpenAI 专精","低于官方定价","支持 Assistants API","GPTs 调用","快速到账"]', 'ok', '99.1%', '1.3s', '#', 1),
('claudeapi', 'Claude 中转站', '#8C3B4F', '专注 Anthropic', '专注 Anthropic Claude 系列中转，提供 Claude 3.5 Sonnet / Opus / Haiku 稳定通道。', 4.4, 380, '["Anthropic"]', '["Claude 专精","Opus 低延迟","200K 上下文","Vision 支持","企业定制通道"]', 'ok', '99.4%', '1.1s', '#', 1),
('zhipu', '智谱 AI', '#3B5E8C', '国产模型', '智谱官方 API 平台，GLM-4 系列模型，支持长文本、代码、多模态，企业级服务。', 4.3, 750, '["Zhipu"]', '["官方平台","GLM-4 全系列","128K 长文本","多模态理解","企业私有化部署"]', 'ok', '99.5%', '1.0s', '#', 1),
('moonshot', '月之暗面', '#6B5E3B', '国产模型', 'Kimi 官方 API，超长上下文（200K tokens），文档处理能力强。', 4.5, 680, '["Moonshot"]', '["200K 超长上下文","文档理解强","官方 API","中文优化","支持文件解析"]', 'ok', '99.2%', '1.4s', '#', 1),
('oneapi', 'One API', '#5E8C3B', '开源方案', '开源中转管理面板，可自行部署，统一管理多个 API Key 和渠道，社区活跃。', 4.6, 1600, '["全部品牌（自配置）"]', '["完全开源","自建部署","多渠道管理","令牌分发","用量统计"]', 'ok', '—', '—', '#', 1),
('newapi', 'New API', '#3B8C8C', '开源方案', 'One API 增强分支，新增更多模型支持和 UI 优化，适合二次开发。', 4.3, 420, '["全部品牌（自配置）"]', '["One API 增强版","更多模型适配","UI 优化","支持 Midjourney","插件系统"]', 'ok', '—', '—', '#', 1);

INSERT OR IGNORE INTO brands (name) VALUES ('OpenAI'), ('Anthropic'), ('Google'), ('DeepSeek'), ('Alibaba'), ('Zhipu'), ('Moonshot'), ('Meta'), ('Mistral'), ('01.AI'), ('InternLM');

INSERT OR IGNORE INTO categories (name) VALUES ('综合中转'), ('专注 OpenAI'), ('专注 Anthropic'), ('国产模型'), ('多模型聚合'), ('开源方案');
