# LLM API 导航站 — 免费云部署方案

## 一、架构概览

```
用户浏览器
    │
    ├── https://yoursite.com (静态页面)
    │       ↓
    │   Cloudflare Pages (全球CDN加速)
    │
    └── https://yoursite.com/api/* (API请求)
            ↓
        Cloudflare Workers (反向代理)
            ↓
        Fly.io (Node.js + SQLite持久卷)
```

| 组件 | 服务 | 月费用 |
|------|------|--------|
| 前端CDN | Cloudflare Pages | ¥0 |
| API计算 | Fly.io (1 shared-cpu) | ¥0 |
| SQLite存储 | Fly.io Volume 1GB | ¥0 |
| DNS | Cloudflare | ¥0 |
| API反代 | Cloudflare Workers (10万请求/天) | ¥0 |
| **合计** | | **¥0** |

---

## 二、域名申请

### 付费域名（推荐）

| 注册商 | 推荐后缀 | 年费 | 优势 |
|--------|----------|------|------|
| **Cloudflare** | .xyz / .site / .com | ¥8~65 | 成本价，自动接入DNS，免费隐私保护 |
| Namecheap | .com | ¥40首年 | 界面友好 |
| 阿里云 | .com | ¥55 | 国内支付方便 |

**推荐**：Cloudflare 购买 `.xyz`（¥8/年），域名+DNS+CDN 一站式管理。

### 免费域名

| 平台 | 域名格式 | 说明 |
|------|----------|------|
| eu.org | yourname.eu.org | 审核1-2周，最靠谱的免费方案 |
| Cloudflare Pages | project.pages.dev | 自动分配，开发/临时用 |
| GitHub Pages | username.github.io | 仅限静态站 |

### Cloudflare 接入域名

**域名在 Cloudflare 买的**：无需操作，自动配置。

**域名在其他注册商**：

1. Cloudflare Dashboard → Add Site → 输入域名
2. 选择 Free 计划
3. 获取两个 Nameserver 地址
4. 去注册商后台修改 DNS/Nameserver
5. 等待生效（最长48小时，通常几分钟）
6. Cloudflare 显示 "Active" 即成功

---

## 三、Fly.io 部署 API

### 3.1 安装 CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 3.2 创建持久卷

```bash
fly volumes create data --size 1 --region hkg
# hkg = 香港节点，国内访问延迟低
# 1GB 免费
```

### 3.3 配置文件

项目已包含以下文件：

**Dockerfile** — 构建API镜像：

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY .env.example ./.env.example
RUN mkdir -p /data
ENV DB_PATH=/data/llm-nav.db
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
```

**fly.toml** — Fly.io 部署配置：

```toml
app = "llm-nav-api"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  DB_PATH = "/data/llm-nav.db"
  SERVE_STATIC = "false"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[mounts]
  source = "data"
  destination = "/data"
```

### 3.4 部署

```bash
fly launch          # 首次部署，按提示操作
fly secrets set ADMIN_PASSWORD=你的密码 JWT_SECRET=你的密钥
fly deploy
```

部署完成后 API 地址为 `https://llm-nav-api.fly.dev`

### 3.5 代码改动说明

`server/index.js` 已修改：

- CORS 允许 `yoursite.com` 和 `localhost:3000` 跨域访问
- `SERVE_STATIC=false` 时关闭静态文件服务（生产环境由 Cloudflare Pages 托管）

---

## 四、Cloudflare Pages 部署前端

### 方式一：GitHub 自动部署（推荐）

```bash
# 推送代码到 GitHub
git init && git add . && git commit -m "init"
gh repo create llm-nav --public --push
```

在 Cloudflare Dashboard 操作：

1. Pages → Create project → Connect to Git → 选仓库
2. 构建设置：
   - 构建命令：留空
   - 输出目录：`public`
   - 根目录：`/`

### 方式二：CLI 直接部署

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy public --project-name=llm-nav
```

部署完成后前端地址为 `https://llm-nav.pages.dev`

---

## 五、Cloudflare Workers 反向代理

将 `yoursite.com/api/*` 请求代理到 Fly.io，实现统一域名，无跨域问题。

### 5.1 配置文件

项目已包含 `api-proxy/` 目录：

**api-proxy/worker.js**：

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = 'https://llm-nav-api.fly.dev' + url.pathname + url.search;
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const response = await fetch(proxyRequest);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', 'https://yoursite.com');
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    return newResponse;
  },
};
```

**api-proxy/wrangler.toml**：

```toml
name = "api-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

routes = [
  { pattern = "yoursite.com/api/*", zone_name = "yoursite.com" }
]
```

### 5.2 部署

```bash
cd api-proxy
wrangler deploy
```

### 5.3 DNS 记录配置

在 Cloudflare DNS 面板添加：

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| CNAME | @ | llm-nav.pages.dev | 已代理(橙色云) |
| CNAME | api | llm-nav-api.fly.dev | 仅DNS(灰色云) |

---

## 六、验证清单

```
✅ https://yoursite.com              → 静态页面正常加载
✅ https://yoursite.com/api/health   → 返回 {"ok":true}
✅ https://yoursite.com/api/providers → 返回商家数据
✅ 管理后台登录正常
✅ 提交商家功能正常
✅ 筛选/搜索功能正常
```

---

## 七、注意事项

1. **Fly.io 冷启动**：`min_machines_running = 0` 时无流量会休眠，首次请求 1-2 秒冷启动。改为 `1` 可消除（仍免费）

2. **Fly.io 免费限额**：3个共享CPU VM、160GB出站/月、3个1GB卷

3. **Workers 免费限额**：10万请求/天

4. **SQLite 备份**：
   ```bash
   fly ssh console
   cp /data/llm-nav.db /data/backup-$(date +%Y%m%d).db
   ```
   或使用 Fly.io 快照功能

5. **环境变量**：生产环境通过 `fly secrets set` 管理，不要写在代码里

6. **域名替换**：文档中 `yoursite.com` 为占位符，替换为你自己的域名

---

## 八、备选方案：零域名（纯免费子域名）

如果暂时不购买域名，可用 Cloudflare Pages 和 Fly.io 默认子域名：

| 服务 | 地址 |
|------|------|
| 前端 | https://llm-nav.pages.dev |
| API | https://llm-nav-api.fly.dev |

此方案不需要 Worker 反代，但需前端代码适配跨域 API 地址：

```html
<script>
  const API_BASE = location.hostname.includes('pages.dev')
    ? 'https://llm-nav-api.fly.dev'
    : '';
</script>
```

将所有 `fetch('/api/...')` 改为 `fetch(API_BASE + '/api/...')`。

---

## 九、其他免费云资源

### 计算/VM

| 平台 | 免费额度 | 说明 |
|------|----------|------|
| Oracle Cloud | 4 OCPU ARM + 24GB RAM，永久 | 最强免费VM，可选方案 |
| Google Cloud | e2-micro，美国区域，永久 | 轻量部署 |
| AWS | t2.micro，12个月 | 试用 |
| Render | 750小时/月 | 无持久磁盘 |

### 数据库（如未来需迁移 SQLite）

| 平台 | 免费额度 | 类型 |
|------|----------|------|
| Turso | 9GB，25亿行读/月 | SQLite边缘分布式 |
| PlanetScale | 5GB，10亿行读/月 | MySQL兼容 |
| Supabase | 500MB | PostgreSQL + Auth |
| Cloudflare D1 | 5GB，5M读/天 | SQLite，配合Workers |
| Neon | 3GB，100计算小时/月 | Serverless PostgreSQL |

### 存储/CDN

| 平台 | 免费额度 | 说明 |
|------|----------|------|
| Cloudflare R2 | 10GB，1M读/月，零出站费 | S3兼容，如需文件上传 |
| Backblaze B2 | 10GB，1GB/天下载 | S3兼容 |

### 监控

| 平台 | 免费额度 | 说明 |
|------|----------|------|
| UptimeRobot | 50监控点 | 可用性监控 |
| Sentry | 5K错误/月 | 错误追踪 |
| Grafana Cloud | 3仪表盘 | 指标+日志 |
