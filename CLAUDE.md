# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI模型API中转商家导航站 — a directory of LLM API relay providers. Full-stack Node.js app with SQLite backend, JWT admin auth, and three public-facing HTML pages.

## Commands

- `npm run dev` — start dev server with nodemon (auto-restart on changes)
- `npm start` — start production server
- `npx pm2 start ecosystem.config.js` — start with PM2 for production

No test suite exists. Verify changes by starting the server and testing API endpoints with curl or the browser.

## Architecture

### Backend (`server/`)

- **index.js** — Express entry point. Serves `public/` as static files, mounts public routes at `/api` and admin routes at `/api/admin`.
- **db.js** — SQLite via better-sqlite3. Creates 4 tables on startup, seeds sample data on first run (only when providers table is empty). Uses WAL mode. Exports query helpers (`getProviders`, `getBrands`, `getCategories`, `getPending`, etc.).
- **auth.js** — JWT middleware. `authMiddleware` verifies Bearer tokens on all `/api/admin/*` routes except `POST /api/admin/login`. `createToken` signs tokens with `{ role: 'admin' }` payload.
- **routes/public.js** — Unauthenticated: `GET /api/providers` (online only), `GET /api/brands`, `GET /api/categories`, `POST /api/submit`.
- **routes/admin.js** — JWT-protected CRUD for providers/brands/categories/pending, plus data export/import/reset. Brand and category renames cascade to providers in application code (no FK constraints).

### Frontend (`public/`)

Three self-contained HTML pages with inline CSS/JS. No build step.

- **index.html** — Homepage. Fetches `/api/providers`, `/api/brands`, `/api/categories` on load. Client-side filtering, sorting, search, detail modal.
- **submit.html** — Provider submission form. Loads categories from API. POSTs to `/api/submit`.
- **admin.html** — Single-page admin dashboard. Login → JWT stored in `sessionStorage`. Tab-based UI: overview, providers CRUD, brands CRUD, categories CRUD, pending review, data import/export/reset. All operations go through `api()` helper that auto-attaches Bearer token and handles 401 by returning to login.

### Database Schema (SQLite)

- **providers** — `id` (TEXT PK, slug+timestamp), `brands` (JSON array of brand name strings), `features` (JSON array), `online` (INTEGER 0/1), plus standard fields.
- **brands** — `id` (INT AUTO), `name` (UNIQUE).
- **categories** — `id` (INT AUTO), `name` (UNIQUE).
- **pending_submissions** — Same shape as providers plus `contact_email`, `contact_wechat`, `extra_note`, `status` (pending/approved/rejected).

Key: `providers.brands` and `providers.category` are denormalized (JSON text and plain text respectively). Cascade updates on brand/category rename/delete are handled in `routes/admin.js` transactions, not via FK constraints.

### Root HTML files are prototypes

The three HTML files at the project root (`admin.html`, `submit-provider.html`, `llm-api-navigator-2.html`) are pre-refactor static prototypes with hardcoded data. They are **not served by Express**. The active versions are in `public/`.

## Environment Variables (.env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Server port |
| `ADMIN_PASSWORD` | — | Admin login password |
| `JWT_SECRET` | — | JWT signing key |
| `JWT_EXPIRES_IN` | 24h | Token expiry |
| `DB_PATH` | `./data/llm-nav.db` | SQLite file path |

## Deployment

- PM2 config in `ecosystem.config.js` (single instance, 200MB limit)
- Nginx reverse proxy config in `nginx.conf.example` (port 80 → 3000, includes HTTPS template)
- Database stored in `data/` (gitignored)
