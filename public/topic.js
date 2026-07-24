const API_BASE = window.API_BASE || '';
const config = window.TOPIC_CONFIG || {};

function esc(value) {
  const node = document.createElement('div');
  node.textContent = value == null ? '' : String(value);
  return node.innerHTML;
}

function safeColor(value) {
  return /^#[0-9a-f]{3,8}$/i.test(value || '') ? value : '#888';
}

function matchesTopic(provider) {
  const haystack = [
    provider.name,
    provider.category,
    provider.desc,
    ...(provider.brands || []),
    ...(provider.supported_models || []),
    ...(provider.features || [])
  ].join(' ').toLowerCase();
  const keywords = (config.keywords || []).map(k => String(k).toLowerCase());
  const keywordMatch = keywords.length ? keywords.some(k => haystack.includes(k)) : true;
  const categoryMatch = config.category ? provider.category === config.category : true;
  const billingMatch = config.billing_type ? provider.billing_type === config.billing_type : true;
  const freeMatch = config.free_quota ? !!provider.free_quota : true;
  return categoryMatch && keywordMatch && billingMatch && freeMatch;
}

function statusLabel(provider) {
  const status = ['ok', 'error', 'unknown'].includes(provider.site_status) ? provider.site_status : 'unknown';
  return { ok: '网站正常', error: '网站异常', unknown: '未检查' }[status];
}

function renderProviders(providers) {
  const grid = document.getElementById('providerGrid');
  const list = providers.filter(matchesTopic).sort((a, b) => {
    if (config.preferAggregator && a.category !== b.category) {
      if (a.category === '聚合中转') return -1;
      if (b.category === '聚合中转') return 1;
    }
    if ((a.site_status || '') !== (b.site_status || '')) {
      if (a.site_status === 'ok') return -1;
      if (b.site_status === 'ok') return 1;
    }
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  document.getElementById('topicCount').textContent = list.length;
  document.getElementById('topicOk').textContent = list.filter(p => p.site_status === 'ok').length;
  if (!list.length) {
    grid.innerHTML = '<div class="empty">暂时没有匹配商家，我会继续补充这一专题的收录。</div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const models = (p.supported_models && p.supported_models.length ? p.supported_models : p.brands || []).slice(0, 5);
    return `<a class="provider-card" href="provider.html?id=${encodeURIComponent(p.id)}">
      <div class="card-top">
        <div class="logo" style="background:${safeColor(p.color)}">${esc((p.name || '?')[0])}</div>
        <div class="name">${esc(p.name)}</div>
        <div class="category">${esc(p.category)}</div>
      </div>
      <p class="desc">${esc(p.desc || '暂无简介')}</p>
      <div class="status">${statusLabel(p)}</div>
      <div class="tags">${models.map(m => `<span class="tag">${esc(m)}</span>`).join('')}${p.free_quota ? '<span class="tag">免费额度</span>' : ''}</div>
    </a>`;
  }).join('');
}

function renderRelatedTopics() {
  const current = config.slug || '';
  const topics = [
    ['api-relay', '聚合中转站总览'],
    ['ai-api-relay', 'AI API 聚合平台'],
    ['openai-relay', 'OpenAI 中转站'],
    ['claude-relay', 'Claude 中转站'],
    ['gemini-relay', 'Gemini 中转站'],
    ['cheap-api-relay', '低成本中转站'],
    ['stable-api-relay', '稳定中转站'],
    ['openai-api', 'OpenAI API 服务商'],
    ['claude-api', 'Claude API 服务商'],
    ['deepseek-api', 'DeepSeek API 服务商'],
    ['free-api', '免费额度 API 服务商'],
    ['pay-as-you-go-api', '按量计费 API 服务商']
  ].filter(([href]) => href !== current);
  document.getElementById('relatedTopics').innerHTML = topics.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
}

(async function init() {
  document.getElementById('topicTitle').textContent = config.title || 'AI API 服务商专题';
  document.getElementById('topicSubtitle').textContent = config.subtitle || '按模型、计费方式和网站状态筛选合适的 AI API 服务商。';
  document.getElementById('topicGuide').textContent = config.guide || '建议优先查看模型覆盖、计费方式、网站状态和用户评价，再决定是否接入。';
  document.getElementById('topicScenario').textContent = config.scenario || '适合需要快速比较多家服务商的开发者和团队。';
  document.getElementById('topicDecision').textContent = config.decision || '如果用于正式项目，建议先小额测试，再扩大调用量。';
  renderRelatedTopics();
  try {
    const res = await fetch(API_BASE + '/api/home');
    const data = await res.json();
    const providers = data.providers || [];
    document.getElementById('totalProviders').textContent = providers.length;
    renderProviders(providers);
  } catch {
    document.getElementById('providerGrid').innerHTML = '<div class="empty">数据加载失败，请稍后刷新。</div>';
  }
})();
