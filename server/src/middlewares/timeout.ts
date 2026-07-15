/**
 * 请求超时中间件
 *
 * 超过指定毫秒数未完成的请求返回 408。
 */

import type { Context, Next } from 'koa';

/** 默认超时时间 30 秒 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * 创建请求超时中间件
 *
 * @param ms - 超时毫秒数，默认 30000
 */
export function timeoutMiddleware(ms: number = DEFAULT_TIMEOUT_MS) {
  return async (ctx: Context, next: Next): Promise<void> => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`请求超时（${ms}ms）`);
        (err as Error & { status: number }).status = 408;
        reject(err);
      }, ms);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
