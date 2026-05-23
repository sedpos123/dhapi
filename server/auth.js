const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function createToken() {
  return jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

module.exports = { authMiddleware, createToken };
