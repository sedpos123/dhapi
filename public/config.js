// API 后端地址配置
// Cloudflare Pages + Functions 同域部署，API_BASE 为空
// 本地开发时也保持为空（Express 同源服务）
window.API_BASE = window.API_BASE || '';

// 评价标签体系
window.REVIEW_TAGS = {
  positive: ['稳定可靠', '价格实惠', '模型全面', '文档详细', '客服响应快', '充值便捷', '速度快', '免费额度多'],
  negative: ['偶有断流', '价格偏高', '客服慢', '充值门槛高', '文档不全', '速度慢', '模型少', '限制多']
};
