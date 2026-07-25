-- 第一批展示名称精修：只处理品牌感较明确的域名，避免把不明确站点乱起名。
WITH renamed(id, old_name, new_name) AS (
  VALUES
  ('api-yuboar-com', 'api.yuboar.com', 'Yuboar'),
  ('seesaw2ai-com', 'seesaw2ai.com', 'Seesaw2AI'),
  ('tenzen-ai', 'tenzen.ai', 'Tenzen AI'),
  ('api-code-relay-com', 'api.code-relay.com', 'Code Relay'),
  ('tokenharbor-ai', 'tokenharbor.ai', 'TokenHarbor'),
  ('nexaxis-ai', 'nexaxis.ai', 'NexAxis'),
  ('apiclaude-cc', 'apiclaude.cc', 'API Claude'),
  ('kjapi-botsmart-net', 'kjapi.botsmart.net', 'KJAPI'),
  ('timicc-com', 'timicc.com', 'Timicc'),
  ('dmxapi-cn', 'dmxapi.cn', 'DMXAPI'),
  ('ai-tsapi-fun', 'ai.tsapi.fun', 'TSAPI'),
  ('api-llm-token-cn', 'api.llm-token.cn', 'LLM Token'),
  ('hboom-ai', 'hboom.ai', 'HBoom AI'),
  ('happycode-vip', 'happycode.vip', 'HappyCode'),
  ('easyrouter-io', 'easyrouter.io', 'EasyRouter'),
  ('poloapi-top', 'poloapi.top', 'PoloAPI'),
  ('api-haimaker-ai', 'api.haimaker.ai', 'HAI Maker'),
  ('sudocode-us', 'sudocode.us', 'SudoCode'),
  ('ai-shi-guang-me', 'ai.shi-guang.me', 'Shi Guang'),
  ('apinebula-com', 'apinebula.com', 'APINebula'),
  ('api-gateway-cersoft-com', 'api-gateway.cersoft.com', 'Cersoft Gateway'),
  ('snap2fast-com', 'snap2fast.com', 'Snap2Fast'),
  ('api-tokendun-com', 'api.tokendun.com', 'TokenDun'),
  ('llm-api-net', 'llm-api.net', 'LLM API'),
  ('api-winfull-cloud-ip-cc', 'api.winfull.cloud-ip.cc', 'Winfull'),
  ('api-chatanywhere-tech', 'api.chatanywhere.tech', 'ChatAnywhere'),
  ('passion8-cc', 'passion8.cc', 'Passion8'),
  ('wawapi-top', 'wawapi.top', 'WawAPI'),
  ('dasuapi-com', 'dasuapi.com', 'DasuAPI'),
  ('gwlink-cc', 'gwlink.cc', 'GWLink'),
  ('api-loomcode-cn', 'api.loomcode.cn', 'LoomCode'),
  ('zivv-pro', 'zivv.pro', 'Zivv'),
  ('officesai-top', 'officesai.top', 'OfficesAI'),
  ('api-touken-pro', 'api.touken.pro', 'Touken'),
  ('linkai-shop', 'linkai.shop', 'LinkAI'),
  ('api-fluxnode-org', 'api.fluxnode.org', 'FluxNode'),
  ('daodunapi-com', 'daodunapi.com', 'DaodunAPI'),
  ('apishop-org', 'apishop.org', 'APIShop'),
  ('max20-cn', 'max20.cn', 'Max20'),
  ('sub2api-closeapi-top', 'sub2api.closeapi.top', 'CloseAPI'),
  ('api-zetatechs-com', 'api.zetatechs.com', 'ZetaTechs'),
  ('liantongapi-com', 'liantongapi.com', 'LiantongAPI'),
  ('aheapi-com', 'aheapi.com', 'AheAPI'),
  ('multiai-store', 'multiai.store', 'MultiAI'),
  ('heyroute-ai', 'heyroute.ai', 'HeyRoute'),
  ('sub-callai-one', 'sub.callai.one', 'CallAI'),
  ('koalaapi-com', 'koalaapi.com', 'KoalaAPI'),
  ('api-apiyi-com', 'api.apiyi.com', 'APIYi'),
  ('llm-mathmodel-tech', 'llm.mathmodel.tech', 'MathModel'),
  ('nikoapi-xyz', 'nikoapi.xyz', 'NikoAPI'),
  ('yunwu-ai', 'yunwu.ai', 'Yunwu AI'),
  ('zenmux-ai', 'zenmux.ai', 'ZenMux'),
  ('sparkcode-top', 'sparkcode.top', 'SparkCode'),
  ('suapi-cc', 'suapi.cc', 'SuAPI'),
  ('nekocode-ai', 'nekocode.ai', 'NekoCode'),
  ('kelaiapi-cc', 'kelaiapi.cc', 'KelaiAPI'),
  ('api-portunex-gewulabs-group', 'api.portunex.gewulabs.group', 'Portunex'),
  ('code-wearekna-com', 'code.wearekna.com', 'WeAreKNA'),
  ('poloai-top', 'poloai.top', 'PoloAI'),
  ('openrouter-my', 'openrouter.my', 'OpenRouter MY')
)
UPDATE providers
SET name = (
  SELECT new_name
  FROM renamed
  WHERE renamed.id = providers.id
)
WHERE id IN (SELECT id FROM renamed)
  AND name = (
    SELECT old_name
    FROM renamed
    WHERE renamed.id = providers.id
  );
