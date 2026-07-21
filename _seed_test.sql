-- Test pricing plans + monitoring data for local verification
UPDATE providers SET pricing_plans = '[
  {"family":"GPT","group_name":"GPT-4o / 4o-mini","multiplier":1,"recharge_multiplier":1,"input_price":12,"output_price":36,"cache_write_price":null,"cache_read_price":2.4,"cache_hit_rate":null,"availability":99.5,"latency_recent":320,"latency_7d":340,"fixed_price":null,"models":["gpt-4o","gpt-4o-mini"],"note":"官方 1/3 价，稳定"},
  {"family":"Claude","group_name":"Claude 3.5 Sonnet","multiplier":1,"recharge_multiplier":1,"input_price":18,"output_price":90,"cache_write_price":null,"cache_read_price":1.8,"cache_hit_rate":null,"availability":98.2,"latency_recent":410,"latency_7d":430,"fixed_price":null,"models":["claude-3-5-sonnet"],"note":"支持 200K 上下文"},
  {"family":"Embedding","group_name":"text-embedding-3","multiplier":0.1,"recharge_multiplier":1,"input_price":0.8,"output_price":null,"cache_write_price":null,"cache_read_price":null,"cache_hit_rate":null,"availability":99.9,"latency_recent":120,"latency_7d":130,"fixed_price":null,"models":["text-embedding-3-small"],"note":"低价向量"}
]' WHERE id='api2d';

INSERT INTO provider_monitoring (provider_id, family, availability, latency_recent, latency_7d, cache_hit_rate, sample_count, source, note, checked_at) VALUES
('api2d','GPT',99.5,318,340,0.62,1200,'auto','近 24h 正常','2026-07-17 09:00:00'),
('api2d','GPT',98.9,355,341,0.60,1180,'auto','凌晨小幅抖动','2026-07-16 09:00:00'),
('api2d','Claude',98.2,408,430,0.55,980,'auto','正常','2026-07-17 09:00:00'),
('api2d','Claude',97.5,420,432,0.54,960,'auto','正常','2026-07-16 09:00:00'),
('api2d','Embedding',99.9,118,130,0.0,2100,'auto','正常','2026-07-17 09:00:00');
