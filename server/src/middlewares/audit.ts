/**
 * 审计日志中间件
 *
 * 自动记录写操作（POST/PUT/PATCH/DELETE）到审计日志。
 * 跳过 GET/OPTIONS 请求和公开路径（登录、健康检查）。
 */

import type { Context, Middleware, Next } from 'koa';
import { generateHexId } from '@low-code/shared';
import type { AuditLogService, AuditLogEntry } from '../services/AuditLogService.js';
import type { JwtUserPayload } from './auth.js';

/** 不记录审计日志的公开路径 */
const AUDIT_SKIP_PATHS = new Set(['/api/auth/login', '/api/health']);

/** 不记录审计日志的路径前缀 */
const AUDIT_SKIP_PREFIXES = ['/api/audit-logs'];

/**
 * 从 URL 路径提取资源类型
 *
 * 例：/api/apps/xxx/automations → automation
 *     /api/workflows/xxx       → workflow
 *     /api/tenants/xxx         → tenant
 */
function extractResourceType(pathStr: string): string {
  const segments = pathStr.split('/').filter(Boolean);
  // /api/{resource} 或 /api/{resource}/{id}
  if (segments.length >= 2) {
    const resource = segments[1];
    // 去掉复数形式的 s
    if (resource.endsWith('s') && resource.length > 1) {
      return resource.slice(0, -1);
    }
    return resource;
  }
  return 'unknown';
}

/**
 * 从路径中提取资源 ID
 */
function extractResourceId(pathStr: string): string | undefined {
  const segments = pathStr.split('/').filter(Boolean);
  // /api/{resource}/{id} 或更深层路径
  if (segments.length >= 3) {
    return segments[2];
  }
  return undefined;
}

/**
 * 创建审计日志中间件
 *
 * @param auditService 审计日志服务实例
 */
export function createAuditMiddleware(auditService: AuditLogService): Middleware {
  return async (ctx: Context, next: Next) => {
    // 仅记录写操作
    if (ctx.method === 'GET' || ctx.method === 'OPTIONS' || ctx.method === 'HEAD') {
      await next();
      return;
    }

    // 跳过公开路径和审计日志自身的查询路径
    if (AUDIT_SKIP_PATHS.has(ctx.path) || AUDIT_SKIP_PREFIXES.some((p) => ctx.path.startsWith(p))) {
      await next();
      return;
    }

    const startTime = Date.now();

    await next();

    // 请求完成后记录审计日志
    const user = ctx.state.user as JwtUserPayload | undefined;
    const tenantId = ctx.state.tenantId as string | undefined;

    if (!tenantId || !user) {
      return;
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = ctx.status >= 200 && ctx.status < 400;

    const entry: AuditLogEntry = {
      id: generateHexId(),
      actorId: user.userId,
      actorName: user.email,
      actorIp: ctx.ip,
      actorUa: ctx.get('User-Agent') || undefined,
      action: `${ctx.method} ${ctx.path}`,
      resourceType: extractResourceType(ctx.path),
      resourceId: extractResourceId(ctx.path),
      result: isSuccess ? 'success' : 'failure',
      errorMsg: !isSuccess ? ((ctx.body as Record<string, unknown>)?.error as string) : undefined,
      requestId: ctx.get('X-Request-Id') || undefined,
      durationMs,
      createdAt: new Date().toISOString(),
    };

    // 异步写入，不阻塞响应
    auditService.save(tenantId, entry).catch(() => {
      // 审计日志写入失败不影响业务
    });
  };
}
