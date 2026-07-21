const DEFAULT_TIMEOUT_MS = 10000;
const MAX_ERROR_LENGTH = 180;

function nowIso() {
  return new Date().toISOString();
}

function cleanError(error) {
  const message = error && error.message ? error.message : String(error || '请求失败');
  return message.replace(/\s+/g, ' ').slice(0, MAX_ERROR_LENGTH);
}

function isCheckableUrl(value) {
  if (!value || value === '#') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    return {
      status: response.status < 500 ? 'ok' : 'error',
      statusCode: response.status,
      latencyMs: Date.now() - started,
      error: ''
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkProviderSite(provider, options = {}) {
  const checkedAt = nowIso();
  if (!isCheckableUrl(provider.url)) {
    return {
      provider_id: provider.id,
      site_status: 'unknown',
      site_checked_at: checkedAt,
      site_status_code: 0,
      site_latency_ms: 0,
      site_error: '未配置有效网站链接'
    };
  }

  try {
    const result = await fetchWithTimeout(provider.url, options.timeoutMs || DEFAULT_TIMEOUT_MS);
    return {
      provider_id: provider.id,
      site_status: result.status,
      site_checked_at: checkedAt,
      site_status_code: result.statusCode,
      site_latency_ms: result.latencyMs,
      site_error: result.error
    };
  } catch (error) {
    return {
      provider_id: provider.id,
      site_status: 'error',
      site_checked_at: checkedAt,
      site_status_code: 0,
      site_latency_ms: 0,
      site_error: cleanError(error)
    };
  }
}

export async function saveProviderSiteStatus(db, result) {
  await db.prepare(`
    UPDATE providers
    SET site_status = ?,
        site_checked_at = ?,
        site_status_code = ?,
        site_latency_ms = ?,
        site_error = ?,
        updated_at = datetime('now','localtime')
    WHERE id = ?
  `).bind(
    result.site_status,
    result.site_checked_at,
    result.site_status_code,
    result.site_latency_ms,
    result.site_error,
    result.provider_id
  ).run();
}

export async function runProviderSiteChecks(env, options = {}) {
  const db = env.DB;
  const limit = Math.max(1, Math.min(200, Number(options.limit || 200)));
  const onlyIds = Array.isArray(options.ids) ? options.ids.filter(Boolean).slice(0, limit) : [];

  let rows;
  if (onlyIds.length) {
    const placeholders = onlyIds.map(() => '?').join(',');
    const res = await db.prepare(`SELECT id, name, url FROM providers WHERE online = 1 AND id IN (${placeholders})`).bind(...onlyIds).all();
    rows = res.results || [];
  } else {
    const res = await db.prepare(`
      SELECT id, name, url
      FROM providers
      WHERE online = 1
      ORDER BY
        CASE WHEN site_checked_at = '' OR site_checked_at IS NULL THEN 0 ELSE 1 END,
        site_checked_at ASC,
        id ASC
      LIMIT ?
    `).bind(limit).all();
    rows = res.results || [];
  }

  const results = [];
  for (const provider of rows) {
    const result = await checkProviderSite(provider, options);
    await saveProviderSiteStatus(db, result);
    results.push(result);
  }

  return {
    checked: results.length,
    ok: results.filter(item => item.site_status === 'ok').length,
    error: results.filter(item => item.site_status === 'error').length,
    unknown: results.filter(item => item.site_status === 'unknown').length,
    results
  };
}
