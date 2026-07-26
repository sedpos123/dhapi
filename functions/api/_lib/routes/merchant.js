// 商家自助路由：注册/登录（公开）+ 仪表盘/资料/logo/评价管理（需 merchant 鉴权）
import { handleLogoUpload } from '../upload.js';
import { merchantAuthMiddleware, merchantApiTokenMiddleware, signJWT, generateSalt, hashPassword, verifyPassword, randomToken, sha256Hex } from '../auth.js';
import { parseProvider, cleanProviderInput, providerInputError, cleanText, isEmail, cleanStringArray, cleanPricingPlans, cleanPromotion, cleanMerchantMetrics, isHttpUrl } from '../helpers.js';

function automationSpec(origin = '') {
  const base = origin ? origin.replace(/\/$/, '') : '';
  return {
    name: 'DHAPI Merchant Automation',
    version: '2026-07-26',
    auth: {
      type: 'bearer',
      header: 'Authorization: Bearer <merchant_api_token>',
      token_prefix: 'dhapi_live_'
    },
    endpoints: {
      read_provider: `${base}/api/merchant/sync/provider`,
      update_provider: `${base}/api/merchant/sync/provider`
    },
    payload: {
      profile: {
        name: 'Provider display name',
        desc: 'Short service description',
        url: 'https://example.com',
        brands: ['OpenAI', 'Claude', 'Gemini'],
        supported_models: ['gpt-4.1', 'claude-3.5-sonnet'],
        features: ['pay as you go', 'fast support'],
        billing_type: 'pay_as_you_go',
        target_audience: 'developers',
        free_quota: false
      },
      promotion: {
        enabled: true,
        badge: 'Limited offer',
        title: 'New user bonus',
        summary: 'Short benefit description',
        code: 'DHAPI20',
        link: 'https://example.com/promo',
        starts_at: '2026-07-26',
        ends_at: '2026-08-31'
      },
      pricing_plans: [
        {
          family: 'OpenAI',
          group_name: 'GPT-4.1',
          multiplier: 1,
          input_price: '$2/M tokens',
          output_price: '$8/M tokens',
          availability: 99.5,
          latency_recent: 1.8,
          models: ['gpt-4.1'],
          note: 'Example plan'
        }
      ],
      metrics: {
        user_count: 1000,
        paid_user_count: 200,
        request_count_24h: 500000,
        success_rate_24h: 99.2,
        avg_latency_ms: 1200,
        model_count: 20,
        note: 'Data provided by merchant',
        updated_at: '2026-07-26T10:00:00+08:00'
      },
      monitoring: [
        {
          family: 'OpenAI',
          availability: 99.5,
          latency_recent: 1.8,
          latency_7d: 2.1,
          cache_hit_rate: 45,
          sample_count: 1000,
          note: 'Merchant reported status'
        }
      ]
    }
  };
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function cleanAutomationPayload(body) {
  const profile = body && typeof body.profile === 'object' ? body.profile : {};
  const source = { ...profile };
  const patch = {};

  for (const key of ['name', 'desc', 'category', 'input_price', 'output_price', 'billing_type', 'target_audience', 'founded_at', 'logo_url']) {
    if (hasOwn(source, key)) patch[key] = cleanText(source[key], key === 'desc' ? 2000 : 120);
  }
  if (hasOwn(source, 'url')) {
    const url = cleanText(source.url, 2048);
    if (url && url !== '#' && !isHttpUrl(url)) throw new Error('Invalid url');
    patch.url = url || '#';
  }
  if (hasOwn(source, 'color')) patch.color = /^#[0-9a-f]{3,8}$/i.test(source.color || '') ? source.color : '#888';
  if (hasOwn(source, 'free_quota')) patch.free_quota = source.free_quota ? 1 : 0;
  if (hasOwn(source, 'brands')) patch.brands = JSON.stringify(cleanStringArray(source.brands));
  if (hasOwn(source, 'features')) patch.features = JSON.stringify(cleanStringArray(source.features, 30, 120));
  if (hasOwn(source, 'supported_models')) patch.supported_models = JSON.stringify(cleanStringArray(source.supported_models, 80, 100));

  const pricing = hasOwn(body, 'pricing_plans') ? body.pricing_plans : source.pricing_plans;
  if (pricing !== undefined) patch.pricing_plans = JSON.stringify(cleanPricingPlans(pricing, 80));
  if (hasOwn(body, 'promotion')) patch.promotion = JSON.stringify(cleanPromotion(body.promotion));
  if (hasOwn(source, 'promotion')) patch.promotion = JSON.stringify(cleanPromotion(source.promotion));
  if (hasOwn(body, 'metrics')) {
    const metrics = cleanMerchantMetrics(body.metrics);
    patch.merchant_metrics = JSON.stringify(metrics);
    patch.merchant_metrics_updated_at = metrics.updated_at || new Date().toISOString();
  }

  const monitoring = Array.isArray(body?.monitoring) ? body.monitoring.slice(0, 30).map(item => ({
    family: cleanText(item?.family, 40),
    availability: Math.max(0, Math.min(100, Number(item?.availability) || 0)),
    latency_recent: Math.max(0, Math.min(600, Number(item?.latency_recent) || 0)),
    latency_7d: Math.max(0, Math.min(600, Number(item?.latency_7d) || 0)),
    cache_hit_rate: Math.max(0, Math.min(100, Number(item?.cache_hit_rate) || 0)),
    sample_count: Math.max(0, Math.min(100000000, Math.floor(Number(item?.sample_count) || 0))),
    note: cleanText(item?.note, 200)
  })).filter(item => item.family || item.availability || item.latency_recent || item.sample_count) : [];

  return { patch, monitoring };
}

async function handleProviderSync(c) {
  const db = c.env.DB;
  const merchant = c.get('merchant');
  const body = await c.req.json().catch(() => ({}));
  let payload;
  try {
    payload = cleanAutomationPayload(body || {});
  } catch (error) {
    return c.json({ error: error.message || 'Invalid sync payload' }, 400);
  }
  const assignments = [];
  const params = [];
  for (const [key, value] of Object.entries(payload.patch)) {
    assignments.push(`${key} = ?`);
    params.push(value);
  }
  if (assignments.length) {
    assignments.push("updated_at = datetime('now','localtime')");
    params.push(merchant.provider_id);
    await db.prepare(`UPDATE providers SET ${assignments.join(', ')} WHERE id = ?`).bind(...params).run();
  }
  for (const item of payload.monitoring) {
    await db.prepare(`INSERT INTO provider_monitoring (provider_id, family, availability, latency_recent, latency_7d, cache_hit_rate, sample_count, source, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(merchant.provider_id, item.family, item.availability, item.latency_recent, item.latency_7d, item.cache_hit_rate, item.sample_count, 'merchant_api', item.note).run();
  }
  await db.prepare("UPDATE merchants SET last_sync_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?").bind(merchant.merchant_id).run();
  const row = await db.prepare('SELECT * FROM providers WHERE id = ?').bind(merchant.provider_id).first();
  return c.json({ success: true, updated_fields: Object.keys(payload.patch), monitoring_rows: payload.monitoring.length, provider: parseProvider(row) });
}

export function applyMerchantRoutes(app) {
  // ── MERCHANT: Public Auth ──
  app.post('/merchant/register', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const provider_id = cleanText(body.provider_id, 160);
    if (!isEmail(email)) return c.json({ error: '请填写有效邮箱' }, 400);
    if (password.length < 8 || password.length > 128) return c.json({ error: '密码长度应为 8-128 位' }, 400);
    if (!provider_id) return c.json({ error: '请选择要认领的商家' }, 400);
    const provider = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(provider_id).first();
    if (!provider) return c.json({ error: '商家不存在' }, 404);
    const existing = await db.prepare('SELECT id FROM merchants WHERE email = ?').bind(email.toLowerCase().trim()).first();
    if (existing) return c.json({ error: '该邮箱已注册' }, 409);
    const approved = await db.prepare("SELECT id FROM merchants WHERE provider_id = ? AND status = 'approved'").bind(provider_id).first();
    if (approved) return c.json({ error: '该商家已被认领' }, 409);
    const salt = await generateSalt();
    const passwordHash = await hashPassword(password, salt);
    await db.prepare('INSERT INTO merchants (email, password_hash, salt, provider_id) VALUES (?, ?, ?, ?)').bind(email.toLowerCase().trim(), passwordHash, salt, provider_id).run();
    return c.json({ success: true, message: '注册成功，请等待管理员审核' });
  });

  app.post('/merchant/login', async (c) => {
    const db = c.env.DB;
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) return c.json({ error: '请填写邮箱和密码' }, 400);
    const merchant = await db.prepare('SELECT * FROM merchants WHERE email = ?').bind(email.toLowerCase().trim()).first();
    if (!merchant) return c.json({ error: '账号不存在' }, 404);
    const valid = await verifyPassword(password, merchant.salt, merchant.password_hash);
    if (!valid) return c.json({ error: '密码错误' }, 401);
    if (merchant.status === 'pending') return c.json({ error: '账号审核中，请耐心等待' }, 403);
    if (merchant.status === 'rejected') return c.json({ error: '账号审核未通过' }, 403);
    const token = await signJWT({ role: 'merchant', merchant_id: merchant.id, provider_id: merchant.provider_id }, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN || '24h');
    return c.json({ token, provider_id: merchant.provider_id, merchant_id: merchant.id });
  });

  app.get('/merchant/automation-spec', (c) => {
    return c.json(automationSpec(new URL(c.req.url).origin));
  });

  // ── MERCHANT: Protected Routes ──
  app.use('/merchant/dashboard', merchantAuthMiddleware);
  app.use('/merchant/provider', merchantAuthMiddleware);
  app.use('/merchant/automation', merchantAuthMiddleware);
  app.use('/merchant/automation/*', merchantAuthMiddleware);
  app.use('/merchant/sync/provider', merchantApiTokenMiddleware);
  app.use('/merchant/upload-logo', merchantAuthMiddleware);
  app.use('/merchant/reviews', merchantAuthMiddleware);
  app.use('/merchant/reviews/*', merchantAuthMiddleware);

  app.get('/merchant/automation', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const row = await db.prepare('SELECT api_token_prefix, api_token_created_at, last_sync_at FROM merchants WHERE id = ?').bind(merchant.merchant_id).first();
    return c.json({
      provider_id: merchant.provider_id,
      token: {
        configured: !!row?.api_token_prefix,
        prefix: row?.api_token_prefix || '',
        created_at: row?.api_token_created_at || '',
        last_sync_at: row?.last_sync_at || ''
      },
      spec: automationSpec(new URL(c.req.url).origin),
      agent_prompt: [
        'You are helping a DHAPI merchant keep its directory profile fresh.',
        'Read the merchant website for official service details, then send a PATCH request to /api/merchant/sync/provider.',
        'Update only confirmed fields: profile, promotion, pricing_plans, metrics, and monitoring.',
        'Use Authorization: Bearer <merchant_api_token>.'
      ].join('\n')
    });
  });

  app.post('/merchant/automation/token', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const prefix = token.slice(0, 18);
    await db.prepare("UPDATE merchants SET api_token_hash = ?, api_token_prefix = ?, api_token_created_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?")
      .bind(tokenHash, prefix, merchant.merchant_id).run();
    return c.json({ token, prefix, warning: 'Store this token now. It is shown only once.' });
  });

  app.delete('/merchant/automation/token', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    await db.prepare("UPDATE merchants SET api_token_hash = '', api_token_prefix = '', api_token_created_at = '', updated_at = datetime('now','localtime') WHERE id = ?")
      .bind(merchant.merchant_id).run();
    return c.json({ success: true });
  });

  app.get('/merchant/sync/provider', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const row = await db.prepare('SELECT * FROM providers WHERE id = ?').bind(merchant.provider_id).first();
    if (!row) return c.json({ error: 'Provider not found' }, 404);
    return c.json({ provider: parseProvider(row), spec: automationSpec(new URL(c.req.url).origin) });
  });

  app.patch('/merchant/sync/provider', handleProviderSync);
  app.put('/merchant/sync/provider', handleProviderSync);

  app.get('/merchant/dashboard', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const provider = await db.prepare('SELECT id, name, online, status, click_count, favorite_count, avg_rating, review_count FROM providers WHERE id = ?').bind(merchant.provider_id).first();
    if (!provider) return c.json({ error: '商家不存在' }, 404);
    const pendingReviews = await db.prepare("SELECT COUNT(*) as cnt FROM reviews WHERE provider_id = ? AND status = 'pending'").bind(merchant.provider_id).first();
    return c.json({
      provider,
      stats: {
        click_count: provider.click_count || 0,
        favorite_count: provider.favorite_count || 0,
        avg_rating: provider.avg_rating || 0,
        review_count: provider.review_count || 0,
        pending_review_count: pendingReviews ? pendingReviews.cnt : 0
      }
    });
  });

  app.get('/merchant/provider', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const row = await db.prepare('SELECT * FROM providers WHERE id = ?').bind(merchant.provider_id).first();
    if (!row) return c.json({ error: '商家不存在' }, 404);
    return c.json({ provider: parseProvider(row) });
  });

  app.put('/merchant/provider', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const value = cleanProviderInput(await c.req.json());
    const error = providerInputError(value);
    if (error) return c.json({ error }, 400);
    const { name, desc, url, category, color, logo_url, input_price, output_price, billing_type, target_audience, free_quota, founded_at, brands, features, supported_models, promotion } = value;
    const modelsArr = Array.isArray(supported_models) ? supported_models : (Array.isArray(brands) ? brands : []);
    const bucket = c.env.LOGOS;
    if (bucket && logo_url) {
      const old = await db.prepare('SELECT logo_url FROM providers WHERE id = ?').bind(merchant.provider_id).first();
      if (old && old.logo_url && old.logo_url !== logo_url) { await bucket.delete(old.logo_url).catch(() => {}); }
    }
    await db.prepare(`UPDATE providers SET name=?, desc=?, url=?, category=?, color=?, logo_url=?, input_price=?, output_price=?, billing_type=?, target_audience=?, free_quota=?, founded_at=?, brands=?, features=?, supported_models=?, promotion=?, updated_at=datetime('now','localtime') WHERE id=?`).bind(name, desc, url || '#', category, color || '#888', logo_url || '', input_price || '', output_price || '', billing_type || '', target_audience || '', free_quota ? 1 : 0, founded_at || '', JSON.stringify(Array.isArray(brands) ? brands : []), JSON.stringify(Array.isArray(features) ? features : []), JSON.stringify(modelsArr), JSON.stringify(promotion || {}), merchant.provider_id).run();
    return c.json({ success: true });
  });

  app.post('/merchant/upload-logo', async (c) => {
    const merchant = c.get('merchant');
    return handleLogoUpload(c, 'logos/' + merchant.provider_id);
  });

  app.get('/merchant/reviews', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const status = c.req.query('status');
    let sql = 'SELECT * FROM reviews WHERE provider_id = ?';
    const params = [merchant.provider_id];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const { results } = await db.prepare(sql).bind(...params).all();
    const reviews = (results || []).map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
    return c.json({ reviews });
  });

  app.post('/merchant/reviews/:id/reply', async (c) => {
    const db = c.env.DB;
    const merchant = c.get('merchant');
    const reviewId = c.req.param('id');
    const review = await db.prepare('SELECT id, provider_id, merchant_reply FROM reviews WHERE id = ? AND provider_id = ?').bind(reviewId, merchant.provider_id).first();
    if (!review) return c.json({ error: '评价不存在' }, 404);
    if (review.merchant_reply) return c.json({ error: '已回复过该评价' }, 400);
    const body = await c.req.json();
    const reply = (body.reply || '').slice(0, 500);
    if (!reply) return c.json({ error: '回复内容不能为空' }, 400);
    await db.prepare('UPDATE reviews SET merchant_reply = ? WHERE id = ?').bind(reply, reviewId).run();
    return c.json({ success: true });
  });
}
