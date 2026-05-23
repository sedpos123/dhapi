const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'llm-nav.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──
db.exec(`
CREATE TABLE IF NOT EXISTS providers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#888',
  category     TEXT NOT NULL,
  desc         TEXT DEFAULT '',
  rating       REAL DEFAULT 0,
  reviews      INTEGER DEFAULT 0,
  brands       TEXT DEFAULT '[]',
  features     TEXT DEFAULT '[]',
  status       TEXT DEFAULT 'ok',
  uptime       TEXT DEFAULT '—',
  speed        TEXT DEFAULT '—',
  url          TEXT DEFAULT '#',
  online       INTEGER DEFAULT 1,
  input_price  TEXT DEFAULT '',
  output_price TEXT DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  updated_at   TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS brands (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pending_submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  url            TEXT DEFAULT '',
  category       TEXT DEFAULT '',
  desc           TEXT DEFAULT '',
  brands         TEXT DEFAULT '[]',
  features       TEXT DEFAULT '[]',
  input_price    TEXT DEFAULT '',
  output_price   TEXT DEFAULT '',
  contact_email  TEXT DEFAULT '',
  contact_wechat TEXT DEFAULT '',
  extra_note     TEXT DEFAULT '',
  logo_color     TEXT DEFAULT '#888',
  submitted_at   TEXT DEFAULT (datetime('now','localtime')),
  status         TEXT DEFAULT 'pending'
);
`);

// ── Seed Data ──
const SEED_PROVIDERS = [
  { id:'api2d',name:'API2D',color:'#3B6F8C',category:'综合中转',desc:'老牌中转，支持 OpenAI 全系列 + Claude，国内直连，按量计费，余额不过期。',rating:4.6,reviews:1280,brands:['OpenAI','Anthropic'],features:['国内直连免梯','余额永不过期','多渠道自动切换','支持流式输出','API 兼容 OpenAI 格式'],status:'ok',uptime:'99.7%',speed:'1.2s',url:'#' },
  { id:'closeai',name:'CloseAI',color:'#8C5E3B',category:'综合中转',desc:'主打稳定和速度，企业用户较多。支持 GPT-4 全系列和 Claude，提供 SLA 保障。',rating:4.5,reviews:860,brands:['OpenAI','Anthropic'],features:['企业 SLA 保障','专线加速','支持 Function Calling','7×12 技术支持','并发无上限'],status:'ok',uptime:'99.5%',speed:'1.0s',url:'#' },
  { id:'ohmygpt',name:'OhMyGPT',color:'#6B3B8C',category:'多模型聚合',desc:'聚合平台，一个 Key 调用 OpenAI / Anthropic / Google / Meta 等十余种品牌模型。',rating:4.3,reviews:540,brands:['OpenAI','Anthropic','Google','Meta','Mistral'],features:['一 Key 多模型','按模型分别计价','支持 Embedding','自动负载均衡','免费额度体验'],status:'ok',uptime:'99.2%',speed:'1.5s',url:'#' },
  { id:'siliconflow',name:'硅基流动',color:'#3B8C5E',category:'国产模型',desc:'国产模型 API 平台，自研 SiliconCloud 推理加速，支持 DeepSeek、通义千问等主流国产大模型。',rating:4.4,reviews:920,brands:['DeepSeek','Alibaba','Zhipu','01.AI','InternLM'],features:['国产模型首选','推理加速引擎','价格极低','免费额度充足','支持微调部署'],status:'ok',uptime:'99.6%',speed:'0.8s',url:'#' },
  { id:'deepseek',name:'DeepSeek',color:'#2E5FA1',category:'国产模型',desc:'深度求索官方 API，DeepSeek-V3 / R1 推理模型，性价比极高，代码能力突出。',rating:4.7,reviews:2100,brands:['DeepSeek'],features:['官方直供','推理模型 R1','代码能力顶尖','价格最低档','不限制并发'],status:'ok',uptime:'99.3%',speed:'0.9s',url:'#' },
  { id:'aihub',name:'AIHub',color:'#A16B2E',category:'多模型聚合',desc:'轻量聚合平台，主打简单易用，适合个人开发者和小团队快速接入。',rating:4.1,reviews:320,brands:['OpenAI','Anthropic','Google','Meta'],features:['零门槛接入','文档清晰','个人友好','按量计费无月费','支持 Webhook'],status:'ok',uptime:'98.8%',speed:'1.8s',url:'#' },
  { id:'gptapi',name:'GPT API US',color:'#5A3B8C',category:'专注 OpenAI',desc:'专注 OpenAI 模型中转，GPT-4o / o1 系列价格低于官方，支持直连。',rating:4.2,reviews:470,brands:['OpenAI'],features:['OpenAI 专精','低于官方定价','支持 Assistants API','GPTs 调用','快速到账'],status:'ok',uptime:'99.1%',speed:'1.3s',url:'#' },
  { id:'claudeapi',name:'Claude 中转站',color:'#8C3B4F',category:'专注 Anthropic',desc:'专注 Anthropic Claude 系列中转，提供 Claude 3.5 Sonnet / Opus / Haiku 稳定通道。',rating:4.4,reviews:380,brands:['Anthropic'],features:['Claude 专精','Opus 低延迟','200K 上下文','Vision 支持','企业定制通道'],status:'ok',uptime:'99.4%',speed:'1.1s',url:'#' },
  { id:'zhipu',name:'智谱 AI',color:'#3B5E8C',category:'国产模型',desc:'智谱官方 API 平台，GLM-4 系列模型，支持长文本、代码、多模态，企业级服务。',rating:4.3,reviews:750,brands:['Zhipu'],features:['官方平台','GLM-4 全系列','128K 长文本','多模态理解','企业私有化部署'],status:'ok',uptime:'99.5%',speed:'1.0s',url:'#' },
  { id:'moonshot',name:'月之暗面',color:'#6B5E3B',category:'国产模型',desc:'Kimi 官方 API，超长上下文（200K tokens），文档处理能力强。',rating:4.5,reviews:680,brands:['Moonshot'],features:['200K 超长上下文','文档理解强','官方 API','中文优化','支持文件解析'],status:'ok',uptime:'99.2%',speed:'1.4s',url:'#' },
  { id:'oneapi',name:'One API',color:'#5E8C3B',category:'开源方案',desc:'开源中转管理面板，可自行部署，统一管理多个 API Key 和渠道，社区活跃。',rating:4.6,reviews:1600,brands:['全部品牌（自配置）'],features:['完全开源','自建部署','多渠道管理','令牌分发','用量统计'],status:'ok',uptime:'—',speed:'—',url:'#' },
  { id:'newapi',name:'New API',color:'#3B8C8C',category:'开源方案',desc:'One API 增强分支，新增更多模型支持和 UI 优化，适合二次开发。',rating:4.3,reviews:420,brands:['全部品牌（自配置）'],features:['One API 增强版','更多模型适配','UI 优化','支持 Midjourney','插件系统'],status:'ok',uptime:'—',speed:'—',url:'#' }
];

const SEED_BRANDS = ['OpenAI','Anthropic','Google','DeepSeek','Alibaba','Zhipu','Moonshot','Meta','Mistral','01.AI','InternLM'];
const SEED_CATEGORIES = ['综合中转','专注 OpenAI','专注 Anthropic','国产模型','多模型聚合','开源方案'];

function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM providers').get().c;
  if (count > 0) return;

  const insertProvider = db.prepare(`
    INSERT INTO providers (id, name, color, category, desc, rating, reviews, brands, features, status, uptime, speed, url, online)
    VALUES (@id, @name, @color, @category, @desc, @rating, @reviews, @brands, @features, @status, @uptime, @speed, @url, 1)
  `);
  const insertBrand = db.prepare('INSERT OR IGNORE INTO brands (name) VALUES (?)');
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');

  const tx = db.transaction(() => {
    for (const p of SEED_PROVIDERS) {
      insertProvider.run({
        ...p,
        brands: JSON.stringify(p.brands),
        features: JSON.stringify(p.features)
      });
    }
    for (const b of SEED_BRANDS) insertBrand.run(b);
    for (const c of SEED_CATEGORIES) insertCategory.run(c);
  });
  tx();
}

seed();

// ── Helpers ──
function parseProvider(row) {
  if (!row) return null;
  return {
    ...row,
    brands: JSON.parse(row.brands || '[]'),
    features: JSON.parse(row.features || '[]'),
    online: !!row.online
  };
}

function getProviders(onlineOnly = true) {
  const sql = onlineOnly
    ? 'SELECT * FROM providers WHERE online = 1 ORDER BY rating DESC, reviews DESC'
    : 'SELECT * FROM providers ORDER BY rating DESC, reviews DESC';
  return db.prepare(sql).all().map(parseProvider);
}

function getProviderById(id) {
  return parseProvider(db.prepare('SELECT * FROM providers WHERE id = ?').get(id));
}

function getBrands() {
  return db.prepare('SELECT * FROM brands ORDER BY id').all();
}

function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY id').all();
}

function getPending() {
  return db.prepare("SELECT * FROM pending_submissions WHERE status = 'pending' ORDER BY submitted_at DESC").all()
    .map(r => ({ ...r, brands: JSON.parse(r.brands || '[]'), features: JSON.parse(r.features || '[]') }));
}

function getAllPending() {
  return db.prepare('SELECT * FROM pending_submissions ORDER BY submitted_at DESC').all()
    .map(r => ({ ...r, brands: JSON.parse(r.brands || '[]'), features: JSON.parse(r.features || '[]') }));
}

module.exports = { db, parseProvider, getProviders, getProviderById, getBrands, getCategories, getPending, getAllPending, SEED_PROVIDERS, SEED_BRANDS, SEED_CATEGORIES };
