// D1 兼容层：用 better-sqlite3 模拟 Cloudflare D1 的 API
// 供本地开发使用（_dev_server.mjs 与 backend/server.js），让生产路由处理器
// functions/api/[[route]].js 无需 wrangler 即可在本地运行。
//
// D1 约定：
//   prepare(sql).bind(...params).all()  -> { results: [...] }
//   prepare(sql).bind(...params).run()  -> { success, meta: { changes, lastRowId } }
//   prepare(sql).bind(...params).first()-> 行对象 | undefined
//   batch([stmt, ...])                  -> 每条返回 { results } 或 { success, meta }
'use strict';

module.exports = function createD1(sqlite) {
  // 把 better-sqlite3 的同步 stmt 包装成 D1 的异步形态
  function wrapStmt(sql, stmt) {
    const runUnbound = () => {
      const r = stmt.run();
      return { success: true, meta: { changes: r.changes, lastRowId: Number(r.lastInsertRowid) } };
    };
    const bound = (...params) => ({
      all: async () => ({ results: stmt.all(...params) }),
      run: async () => { const r = stmt.run(...params); return { success: true, meta: { changes: r.changes, lastRowId: Number(r.lastInsertRowid) } }; },
      first: async () => stmt.get(...params),
      raw: async () => stmt.raw(...params),
    });
    return {
      _sql: sql,            // 供 batch 判断语句类型使用
      bind: bound,
      all: async () => ({ results: stmt.all() }),
      run: async () => runUnbound(),
      first: async () => stmt.get(),
      raw: async () => stmt.raw(),
    };
  }

  return {
    prepare: (sql) => wrapStmt(sql, sqlite.prepare(sql)),
    exec: async (sql) => { sqlite.exec(sql); },
    // D1 batch：顺序执行每条已 prepare 的语句，SELECT/WITH/RETURNING 返回 { results }，其余返回 { success, meta }
    batch: async (stmts) => {
      const out = [];
      for (const s of stmts) {
        const sql = (s._sql || '').trim().toUpperCase();
        const isRead = sql.startsWith('SELECT') || sql.startsWith('WITH') || sql.includes('RETURNING');
        out.push(isRead ? await s.all() : await s.run());
      }
      return out;
    },
  };
};
