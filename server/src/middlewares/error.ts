/**
 * 错误处理中间件
 *
 * 捕获下游中间件的未处理异常，返回统一错误响应。
 */

import type { Context, Next } from 'koa';

export async function errorMiddleware(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[API Error] ${ctx.method} ${ctx.path}:`, message);
    ctx.status = 500;
    ctx.body = { success: false, error: '服务器内部错误' };
  }
}
