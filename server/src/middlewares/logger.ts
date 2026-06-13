/**
 * 请求日志中间件
 *
 * 记录每个请求的方法、路径、状态码和耗时。
 */

import type { Context, Next } from 'koa';

export async function loggerMiddleware(ctx: Context, next: Next): Promise<void> {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`  ${ctx.method} ${ctx.path} → ${ctx.status} (${ms}ms)`);
}
