/**
 * 审计日志路由
 *
 * 提供审计日志的查询接口。
 * 日志存储在 tenants/{tenantId}/log/audit/{id}.json
 */

import KoaRouter from '@koa/router';
import type { AuditLogService, AuditLogFilters } from '../services/AuditLogService.js';

/**
 * 创建审计日志路由
 */
export function createAuditLogsRouter(auditService: AuditLogService): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/audit-logs' });

  // GET /api/audit-logs - 查询审计日志（分页）
  router.get('/', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const limit = parseInt(ctx.query.limit as string) || 20;
    const offset = parseInt(ctx.query.offset as string) || 0;

    const filters: AuditLogFilters = {};
    if (ctx.query.action) filters.action = ctx.query.action as string;
    if (ctx.query.resourceType) filters.resourceType = ctx.query.resourceType as string;
    if (ctx.query.actorId) filters.actorId = ctx.query.actorId as string;
    if (ctx.query.result) filters.result = ctx.query.result as 'success' | 'failure';
    if (ctx.query.appId) filters.appId = ctx.query.appId as string;
    if (ctx.query.startTime) filters.startTime = ctx.query.startTime as string;
    if (ctx.query.endTime) filters.endTime = ctx.query.endTime as string;

    try {
      const result = await auditService.query(tenantId, filters, limit, offset);

      ctx.body = {
        data: result.logs,
        total: result.total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('[AuditLogs] 查询审计日志失败:', error);
      ctx.body = { data: [], total: 0 };
    }
  });

  // GET /api/audit-logs/:id - 获取单条审计日志详情
  router.get('/:id', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const logId = ctx.params.id;

    try {
      const log = await auditService.getById(tenantId, logId);

      if (!log) {
        ctx.status = 404;
        ctx.body = { error: '审计日志不存在' };
        return;
      }

      ctx.body = { data: log };
    } catch (error) {
      console.error('[AuditLogs] 查询审计日志失败:', error);
      ctx.status = 500;
      ctx.body = { error: '查询失败' };
    }
  });

  return router;
}
