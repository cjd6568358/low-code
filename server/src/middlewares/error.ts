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
    const status = (err as Error & { status?: number }).status ?? 500;
    console.error(`[API Error] ${ctx.method} ${ctx.path} (${status}):`, message);
    ctx.status = status;
    ctx.body = { success: false, error: status === 408 ? '请求超时' : '服务器内部错误' };
  }
}
