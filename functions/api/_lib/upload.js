// Logo 上传到 R2 对象存储的辅助逻辑（LOGOS binding 未配置时返回 500）
const ALLOWED_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' };
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export async function handleLogoUpload(c, keyPrefix) {
  const bucket = c.env.LOGOS;
  if (!bucket) return c.json({ error: '存储服务未配置' }, 500);
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file || !(file instanceof File)) return c.json({ error: '请选择图片文件' }, 400);
  if (!ALLOWED_TYPES[file.type]) return c.json({ error: '仅支持 PNG / JPG / SVG 格式' }, 400);
  if (file.size > MAX_LOGO_SIZE) return c.json({ error: '图片大小不能超过 2MB' }, 400);
  const ext = ALLOWED_TYPES[file.type];
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `${keyPrefix}-${Date.now().toString(36)}-${rand}.${ext}`;
  await bucket.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return c.json({ success: true, logo_url: key });
}
