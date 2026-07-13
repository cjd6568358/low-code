/**
 * 认证中间件
 *
 * 1. authMiddleware — 校验 JWT Token，将 payload 挂载到 ctx.state.user
 * 2. tenantGuard   — 校验请求中的 tenantId 与 token 中的 tenantId 一致
 *    支持从 URL params、query string、request body 三个位置提取 tenantId
 */

import jwt from 'jsonwebtoken';
import type { Context, Next } from 'koa';
import { JWT_SECRET } from '../config/index.js';

/** JWT payload 结构 */
export interface JwtUserPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

/** 不需要认证的白名单路径 */
const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/health']);

/** authMiddleware — 从 Authorization header 提取并校验 JWT */
export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  // OPTIONS 预检请求直接放行
  if (ctx.method === 'OPTIONS') {
    await next();
    return;
  }

  // 白名单路径跳过认证
  if (PUBLIC_PATHS.has(ctx.path)) {
    await next();
    return;
  }

  const authHeader = ctx.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { success: false, error: '未提供认证凭证' };
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    ctx.state.user = payload;
    await next();
  } catch (err: unknown) {
    const message = err instanceof jwt.TokenExpiredError ? '登录已过期，请重新登录' : '认证凭证无效';
    ctx.status = 401;
    ctx.body = { success: false, error: message };
  }
}

/**
 * 从请求中提取 tenantId（优先级：URL params > query > body）
 */
function extractTenantId(ctx: Context): string | undefined {
  const body = (ctx.request as unknown as Record<string, unknown>).body as Record<string, unknown> | undefined;
  return (ctx.params?.tenantId as string | undefined)
    ?? (ctx.query?.tenantId as string | undefined)
    ?? (body?.tenantId as string | undefined);
}

/** tenantGuard — 校验请求中的 tenantId 与 token 中的 tenantId 一致 */
export async function tenantGuard(ctx: Context, next: Next): Promise<void> {
  const user = ctx.state.user as JwtUserPayload | undefined;
  if (!user) {
    ctx.status = 401;
    ctx.body = { success: false, error: '未认证' };
    return;
  }

  // 平台管理员跳过租户校验
  if (user.role === 'platform_admin') {
    await next();
    return;
  }

  const requestTenantId = extractTenantId(ctx);
  if (requestTenantId && requestTenantId !== user.tenantId) {
    ctx.status = 403;
    ctx.body = { success: false, error: '无权访问该租户资源' };
    return;
  }

  await next();
}
