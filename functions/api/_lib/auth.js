// 鉴权与加密：手写 JWT（HS256，Web Crypto）、admin/merchant 中间件、商家密码 PBKDF2 哈希
// 生产运行在 Cloudflare Pages Functions（Workers 运行时），不能用 jsonwebtoken，故用 Web Crypto 手写。

// ── JWT ──
// 解析过期时间：支持 "3600"/3600（秒）、"30m"、"24h"、"7d"；无法解析时回退 24h
function resolveExpiry(expiresIn, now) {
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) return now + expiresIn;
  const m = /^(\d+)\s*([smhd])$/i.exec(String(expiresIn).trim());
  if (m) {
    const n = parseInt(m[1], 10);
    const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2].toLowerCase()];
    return now + n * mult;
  }
  return now + 86400;
}

export async function signJWT(payload, secret, expiresIn = '24h') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = resolveExpiry(expiresIn, now);
  const body = { ...payload, iat: now, exp };
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const h = btoa(JSON.stringify(header)).replace(/=+$/, '');
  const p = btoa(JSON.stringify(body)).replace(/=+$/, '');
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${h}.${p}`));
  const s = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${s}`;
}

export async function verifyJWT(token, secret) {
  const [h, p, s] = token.split('.');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(`${h}.${p}`));
  if (!valid) throw new Error('Invalid signature');
  const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// ── 中间件 ──
export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未登录或登录已过期' }, 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('admin', payload);
    await next();
  } catch {
    return c.json({ error: '登录已过期，请重新登录' }, 401);
  }
}

export async function merchantAuthMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未登录或登录已过期' }, 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload.role !== 'merchant') return c.json({ error: '权限不足' }, 403);
    c.set('merchant', payload);
    await next();
  } catch {
    return c.json({ error: '登录已过期，请重新登录' }, 401);
  }
}

// ── 密码哈希（PBKDF2-SHA-256）──
function bufToHex(buf) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); }

export async function generateSalt() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  return bufToHex(bits);
}

export async function verifyPassword(password, salt, expectedHash) {
  const hash = await hashPassword(password, salt);
  return hash === expectedHash;
}
