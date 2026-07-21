-- 补充商家 supported_models 字段（实际模型名称）
-- 日期: 2026-05-28

-- 官方直连
UPDATE providers SET supported_models = '["DeepSeek-V3","DeepSeek-R1","DeepSeek-R1-0528","DeepSeek-Coder-V2"]' WHERE id = 'deepseek';

UPDATE providers SET supported_models = '["Baichuan-4","Baichuan-4-Air","Baichuan-3-Turbo","Baichuan-3-Turbo-128k"]' WHERE id = 'baichuan';

UPDATE providers SET supported_models = '["Doubao-pro-32k","Doubao-lite-32k","Doubao-pro-128k","Doubao-pro-256k","Doubao-1.5-pro"]' WHERE id = 'volcengine';

UPDATE providers SET supported_models = '["qwen-turbo","qwen-plus","qwen-max","qwen-long","qwen-vl-max","qwen-coder-turbo","qwen2.5-72b-instruct"]' WHERE id = 'ali-bailian';

UPDATE providers SET supported_models = '["Spark-Lite","Spark-Pro","Spark-Pro-128K","Spark-Max","Spark-4.0-Ultra"]' WHERE id = 'xfyun';

UPDATE providers SET supported_models = '["abab6.5s-chat","abab6.5-chat","abab6.5t-chat","abab5.5-chat","speech-02-hd"]' WHERE id = 'minimax';

-- 综合中转
UPDATE providers SET supported_models = '["GPT-4o","GPT-4o-mini","o1-pro","o3","Claude-3.5-Sonnet","Claude-3-Opus","DeepSeek-V3","Gemini-2.0-Flash"]' WHERE id = '302ai';

UPDATE providers SET supported_models = '["DeepSeek-V3","DeepSeek-R1","Qwen2.5-72B-Instruct","GLM-4-9B-Chat","Yi-Lightning","Qwen2-72B","internlm2.5-20b-chat","Llama-3.1-70B"]' WHERE id = 'siliconflow';

UPDATE providers SET supported_models = '["GPT-4o","GPT-4o-mini","o3","Claude-3.5-Sonnet","Claude-3-Opus","Gemini-2.0-Flash","DeepSeek-V3","DeepSeek-R1"]' WHERE id = 'aihubmix';

UPDATE providers SET supported_models = '["GPT-4o","GPT-4o-mini","o1","o3","Claude-3.5-Sonnet","Claude-3-Haiku","Gemini-2.0-Flash","Gemini-1.5-Pro","Mistral-Large","Llama-3.1-405B"]' WHERE id = 'openrouter';

UPDATE providers SET supported_models = '["GPT-4o","GPT-4o-mini","o3","Claude-3.5-Sonnet","Claude-3-Opus","Gemini-2.0-Flash","DeepSeek-V3","DeepSeek-R1","GLM-4"]' WHERE id = 'lingyaapi';

-- 专注中转
UPDATE providers SET supported_models = '["GPT-4o","GPT-4o-mini","o1","o1-mini","o3","o3-mini","GPT-4-Turbo"]' WHERE id = 'wildcard';

-- 聚合平台
UPDATE providers SET supported_models = '["GPT-4o","GPT-4o-mini","o3","Claude-3.5-Sonnet","Claude-3-Opus","Gemini-2.0-Flash","DeepSeek-V3","GLM-4"]' WHERE id = 'nonelinear';
