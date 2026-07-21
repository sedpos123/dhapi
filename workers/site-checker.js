import { runProviderSiteChecks } from '../functions/api/_lib/site-check.js';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runProviderSiteChecks(env, { limit: 200 }));
  },

  async fetch() {
    return Response.json({ ok: true, service: 'site-checker' });
  }
};
