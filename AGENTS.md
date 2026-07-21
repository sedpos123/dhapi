# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

AI模型API中转商家导航站。生产主线是 **Cloudflare Pages + Pages Functions（Hono）+ D1**。本地与旧部署兼容入口 `backend/server.js` 直接复用生产路由处理器（经 better-sqlite3 D1 兼容层），不再有独立的手写 Express 路由，单一数据源。前端为 `public/` 下若干自带内联 CSS/JS 的 HTML 页面，无构建步骤。

## 常用命令

- `npm run dev` - 用 nodemon 启动 **backend/server.js**（端口 3000）。它动态 import 生产路由 `functions/api/[[route]].js`，用 better-sqlite3 + D1 shim 运行，功能与生产完全一致。读 `.env`（需 `ADMIN_PASSWORD`/`JWT_SECRET`），持久库 `data/llm-nav.db`。
- `node _dev_server.mjs` - 本地快速开发入口（端口 8788）。无需 wrangler，每次启动重建 `_dev_local.db`（执行 schema.sql + seed.sql + _seed_test.sql），凭据固定 `ADMIN_PASSWORD=dev123`/`JWT_SECRET=dev-secret`，带定价/监测测试数据。也直接 import 生产路由。可用 `DEV_DB` 自定义 db 路径、`PORT` 改端口。
- `npm run verify` - 跑全部检查（语法 + 前端内联脚本解析 + schema 校验 + smoke 测试）。
- `npm run check` - `check:js`（`node --check` backend/server.js + functions/api/[[route]].js + _lib/*.js + tools/d1-shim.cjs）+ `check:html`（抽取每个 public HTML 的内联 `<script>` 用 `new Function()` 解析，因无构建步骤，借此捕捉语法错误）+ `check:schema`（把 schema.sql 载入内存 SQLite，断言关键列和索引存在）。
- `npm run test:smoke` - 用临时数据库拉起 backend/server.js，验证 health/providers/详情/排行榜/评价/admin 登录/admin 列表/导出/404。现在测的就是生产路由。
- 无测试框架。验证改动靠上述命令 + 浏览器/curl。

## 架构

### 单一生产路由，两个本地入口都复用它

- **生产路由 `functions/api/[[route]].js`**：Hono 应用，`basePath('/api')`，部署为 Cloudflare Pages Function，通过 `DB`（D1）和可选 `LOGOS`（R2）binding 访问数据。这是功能最全、最权威的代码。
- **两个本地入口都复用生产路由**，靠 `tools/d1-shim.cjs` 用 better-sqlite3 模拟 D1 API：
  - `backend/server.js`（CJS + async IIFE 动态 import）- `npm run dev` / PM2 / Render 入口，持久库，读 `.env`。
  - `_dev_server.mjs`（ESM）- 快速开发入口，临时库重建 + 测试数据。
- 改接口只需改 `functions/api/` 下文件，两个本地入口自动跟进，永不漂移。不要再在 `backend/` 下另写路由。

### 路由处理器模块拆分（functions/api/_lib/）

`_` 前缀目录不会被 Pages Functions 当作路由。`[[route]].js` 仅组装 app + 挂 CORS + 挂子模块 + `export onRequest`。
- `_lib/helpers.js` - `parseProvider` / `cleanText` / `cleanStringArray` / `cleanPricingPlans` / `numOr` / `isHttpUrl` / `isEmail` / `cleanProviderInput` / `providerInputError` / `PROVIDERS_ORDER`。
- `_lib/auth.js` - 手写 JWT（HS256，Web Crypto，`signJWT` 支持 `Nh/Nd/Nm/纯秒`）/ `authMiddleware` / `merchantAuthMiddleware` / PBKDF2 密码哈希。Workers 运行时不用 jsonwebtoken。
- `_lib/upload.js` - `handleLogoUpload`（R2）。
- `_lib/routes/{public,admin,merchant}.js` - 各自 `applyXxxRoutes(app)` 注册路由。

### D1 兼容层（tools/d1-shim.cjs）

better-sqlite3 包成 D1 形态：`prepare(sql).bind(...).all() -> {results}`、`.run() -> {success, meta:{changes,lastRowId}}`、`.first() -> 行|undefined`、`batch([...])` 顺序执行（SELECT/WITH/RETURNING 返回 `{results}`，其余 `{success,meta}`）。本地入口用它把 `env.DB` 注入生产路由。注意 `.bind(...).run()` 必须把参数透传给 `stmt.run`。

### 三层鉴权

1. **管理员**：单一共享密码 `ADMIN_PASSWORD`，签发 `{role:'admin'}` JWT，`authMiddleware` 保护 `/admin/*`（login 除外）。
2. **商家**：邮箱 + PBKDF2 密码注册，需管理员审核；签发 `{role:'merchant', merchant_id, provider_id}` JWT，`merchantAuthMiddleware` 保护 `/merchant/*`。一个 provider 只能有一个 `approved` 商家。
3. **匿名**：`/submit` 进 pending；`/reviews/:providerId` 用邮箱 SHA-256 哈希防重复。

### 数据库 schema 与迁移

- **`schema.sql` 是 D1 权威建表语句**（全部表 + 索引，`CREATE TABLE IF NOT EXISTS`），当前累积状态。
- **`migrations/`（001–009）** 增量变更。无自动迁移脚本，D1 上靠 `wrangler d1 execute` 手动应用。新增列：写新迁移 + 同步更新 `schema.sql`，否则 `check:schema` 与本地 dev 不一致。
- 表：`providers`、`brands`、`categories`、`pending_submissions`、`reviews`、`merchants`、`provider_monitoring`。`reviews`/`merchants`/`provider_monitoring` 有真实外键（D1 默认 foreign_keys ON）。
- **反范式 JSON**：`providers.brands`/`features`/`supported_models`/`pricing_plans` 是 JSON 文本列，`parseProvider()` 解码。品牌/分类重命名删除在应用代码里遍历 providers 重写 JSON（无 FK 级联）。
- **FK 安全**：`/admin/reset` 与 `/admin/import` 按子表先(父表后)顺序删/插，避免外键约束失败。`/admin/export`+`/admin/import` 覆盖全部 7 张业务表，`providers`/`pending` 导入补全所有列（不丢字段）。
- 种子数据：`seed.sql`（生产/D1，幂等 `INSERT OR IGNORE`）、`_seed_test.sql`（仅 _dev_server 用的定价/监测测试数据，需提交，勿忽略）。

### 前端 `public/`

自带内联 CSS/JS 的 HTML，无构建。`config.js` 设 `window.API_BASE`（空=同源）和 `window.REVIEW_TAGS`；`_headers` 对 `/config.js` 禁缓存。主要页面：`index.html`、`submit.html`、`admin.html`、`provider.html`、`merchant.html`。所有前端请求经 `api()` 助手自动带 Bearer token、401 回登录页。

### 项目根的 HTML 是原型

根目录的 `admin.html`、`submit-provider.html`、`llm-api-navigator-2.html` 是重构前的静态原型（硬编码数据），**不被服务**。生效版本在 `public/`。

## 环境变量

本地入口（`.env`，参考 `.env.example`）：`PORT`、`ADMIN_PASSWORD`（必填）、`JWT_SECRET`（必填）、`JWT_EXPIRES_IN`、`DATABASE_URL`（`file:...`）/`DB_PATH`、`SERVE_STATIC`、`ALLOWED_ORIGINS`。

生产（Cloudflare）：`wrangler.toml` 的 `[vars]` 放 `JWT_EXPIRES_IN`、`ALLOWED_ORIGINS`；`ADMIN_PASSWORD` 和 `JWT_SECRET` 必须作为加密部署 secret，**绝不**写进 wrangler.toml 或提交。D1 binding 名 `DB`，R2 binding 名 `LOGOS`（目前在 wrangler.toml 中被注释，未启用）。

## 配置纪律

- 永不提交真实 `ADMIN_PASSWORD` / `JWT_SECRET`。
- `.env.example` 只放占位符。
- `data/`、`.env`、`.wrangler/`、`.claude/`、`_dev_local*.db*` 已在 `.gitignore`。
