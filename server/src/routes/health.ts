/**
 * 健康检查路由
 */

import KoaRouter from '@koa/router';

export function createHealthRouter(): KoaRouter {
  const router = new KoaRouter();

  router.get('/api/health', async (ctx) => {
    ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
  });

  return router;
}
