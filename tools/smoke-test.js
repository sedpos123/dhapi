const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = 3197;
const base = `http://127.0.0.1:${port}`;
const dbPath = path.join(__dirname, '..', 'data', 'smoke-test.db');
const dbFiles = [dbPath, `${dbPath}-shm`, `${dbPath}-wal`];

function cleanDatabase() {
  for (const file of dbFiles) {
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(child) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server stopped with code ${child.exitCode}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('server did not become ready');
}

async function jsonRequest(url, options) {
  const response = await fetch(base + url, options);
  const body = await response.json();
  return { response, body };
}

async function run() {
  cleanDatabase();
  const child = spawn(process.execPath, ['backend/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: 'file:' + dbPath,
      ADMIN_PASSWORD: 'smoke-test-password',
      JWT_SECRET: 'smoke-test-secret-value',
      SERVE_STATIC: 'false',
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });

  try {
    await waitForServer(child);

    const health = await jsonRequest('/api/health');
    assert(health.response.status === 200 && health.body.ok === true, 'health check failed');

    const providers = await jsonRequest('/api/providers');
    assert(providers.response.status === 200 && providers.body.providers.length > 0, 'provider list failed');

    const invalidSubmit = await jsonRequest('/api/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', url: 'invalid', category: 'Test', desc: 'Test', input_price: '1', brands: ['Test'] })
    });
    assert(invalidSubmit.response.status === 400, 'invalid provider URL was accepted');

    const login = await jsonRequest('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'smoke-test-password' })
    });
    assert(login.response.status === 200 && login.body.token, 'admin login failed');

    const adminProviders = await jsonRequest('/api/admin/providers', {
      headers: { Authorization: `Bearer ${login.body.token}` }
    });
    assert(adminProviders.response.status === 200 && adminProviders.body.providers.length > 0, 'admin provider list failed');

    const providerById = await jsonRequest('/api/providers/api2d');
    assert(providerById.response.status === 200 && providerById.body.provider.id === 'api2d', 'provider detail failed');

    const rankings = await jsonRequest('/api/rankings');
    assert(rankings.response.status === 200 && Array.isArray(rankings.body.top_rated), 'rankings failed');

    const reviews = await jsonRequest('/api/reviews/api2d');
    assert(reviews.response.status === 200 && Array.isArray(reviews.body.reviews), 'reviews list failed');

    const exported = await jsonRequest('/api/admin/export', {
      headers: { Authorization: `Bearer ${login.body.token}` }
    });
    assert(exported.response.status === 200 && Array.isArray(exported.body.providers)
      && Array.isArray(exported.body.monitoring) && Array.isArray(exported.body.reviews),
      'admin export (7 tables) failed');

    const missing = await jsonRequest('/api/does-not-exist');
    assert(missing.response.status === 404 && missing.body.error, 'missing API response failed');

    console.log('API smoke test passed');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    cleanDatabase();
    if (stderr) process.stderr.write(stderr);
  }
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
