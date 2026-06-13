/**
 * CORS 中间件
 *
 * 开发环境允许所有来源，生产环境应限制为前端域名。
 */

import type { Context, Next } from 'koa';

export async function corsMiddleware(ctx: Context, next: Next): Promise<void> {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  await next();
}
