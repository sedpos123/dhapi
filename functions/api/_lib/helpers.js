// 通用工具：商家行解析、输入清洗、校验、排序常量
// 供 functions/api/_lib/routes/* 各路由模块复用。

// 把数据库行解析为对外的 provider 对象（解码 JSON 文本列、规范布尔与默认值）
export function parseProvider(row) {
  if (!row) return null;
  return {
    ...row,
    brands: JSON.parse(row.brands || '[]'),
    features: JSON.parse(row.features || '[]'),
    supported_models: JSON.parse(row.supported_models || '[]'),
    pricing_plans: JSON.parse(row.pricing_plans || '[]'),
    online: !!row.online,
    click_count: row.click_count || 0,
    favorite_count: row.favorite_count || 0,
    billing_type: row.billing_type || '',
    target_audience: row.target_audience || '',
    free_quota: row.free_quota || 0,
    avg_rating: row.avg_rating || 0,
    review_count: row.review_count || 0,
    site_status: row.site_status || 'unknown',
    site_checked_at: row.site_checked_at || '',
    site_status_code: row.site_status_code || 0,
    site_latency_ms: row.site_latency_ms || 0,
    site_error: row.site_error || '',
    site_error_days: row.site_error_days || 0
  };
}

export function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function cleanStringArray(value, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(item => cleanText(item, maxLength)).filter(Boolean);
}

export function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// 定价套餐：按模型族/分组组织的倍率与分层价（PriceAI 风格）
export function cleanPricingPlans(value, maxItems = 30) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(plan => {
    if (!plan || typeof plan !== 'object') return null;
    return {
      family: cleanText(plan.family, 40),
      group_name: cleanText(plan.group_name, 60),
      multiplier: Math.max(0, Math.min(1000, numOr(plan.multiplier, 0))),
      recharge_multiplier: Math.max(0, Math.min(1000, numOr(plan.recharge_multiplier, 1))),
      input_price: cleanText(plan.input_price, 80),
      output_price: cleanText(plan.output_price, 80),
      cache_write_price: cleanText(plan.cache_write_price, 80),
      cache_read_price: cleanText(plan.cache_read_price, 80),
      cache_hit_rate: Math.max(0, Math.min(100, numOr(plan.cache_hit_rate, 0))),
      availability: Math.max(0, Math.min(100, numOr(plan.availability, 0))),
      latency_recent: Math.max(0, Math.min(600, numOr(plan.latency_recent, 0))),
      latency_7d: Math.max(0, Math.min(600, numOr(plan.latency_7d, 0))),
      fixed_price: cleanText(plan.fixed_price, 80),
      models: cleanStringArray(plan.models, 20, 80),
      note: cleanText(plan.note, 200)
    };
  }).filter(p => p && (p.family || p.group_name || p.input_price || p.fixed_price));
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

// 清洗并规范化 provider 写入输入（admin 与 merchant 写接口共用）
export function cleanProviderInput(body) {
  const brands = cleanStringArray(body.brands);
  const supportedModels = cleanStringArray(body.supported_models);
  const sortOrder = Number(body.sort_order);
  return {
    name: cleanText(body.name, 100), color: /^#[0-9a-f]{3,8}$/i.test(body.color || '') ? body.color : '#888',
    category: cleanText(body.category, 80), desc: cleanText(body.desc, 2000),
    brands, features: cleanStringArray(body.features, 20, 120),
    status: cleanText(body.status, 20) || 'ok', founded_at: cleanText(body.founded_at, 10),
    url: cleanText(body.url, 2048) || '#', online: body.online !== false,
    input_price: cleanText(body.input_price, 80), output_price: cleanText(body.output_price, 80),
    sort_order: Number.isInteger(sortOrder) ? Math.max(-100000, Math.min(100000, sortOrder)) : 0,
    logo_url: cleanText(body.logo_url, 512), billing_type: cleanText(body.billing_type, 40),
    supported_models: supportedModels.length ? supportedModels : brands,
    target_audience: cleanText(body.target_audience, 80), free_quota: !!body.free_quota,
    pricing_plans: cleanPricingPlans(body.pricing_plans)
  };
}

export function providerInputError(value) {
  if (!value.name || !value.category || !value.desc) return '请填写所有必填项';
  if (!value.brands.length) return '请至少选择一个品牌';
  if (value.url !== '#' && !isHttpUrl(value.url)) return '请填写有效的 http 或 https 网址';
  if (value.founded_at && !/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(value.founded_at)) return '成立时间格式不正确';
  return '';
}

// 商家默认排序：sort_order 正数置顶 -> sort_order 升序 -> 有 founded_at 优先 -> founded_at 升序
export const PROVIDERS_ORDER = `CASE WHEN sort_order > 0 THEN 0 ELSE 1 END, sort_order ASC, CASE WHEN founded_at != '' THEN 0 ELSE 1 END, founded_at ASC`;
