/**
 * 数据查询路由
 *
 * POST /api/apps/:appId/query
 * Body: ServerVariableQuery + { memoryFilter?: string }
 *
 * 支持 $table 表达式产生的结构化查询：
 * - select: 字段选择
 * - where: MongoDB 风格过滤条件
 * - orderBy: 排序
 * - limit / offset: 分页
 * - aggregate: 聚合（count/sum/avg/min/max）
 */

import fs from 'fs';
import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import type { DatabaseManager } from '@low-code/data';
import { queryRecordsAdvanced } from '@low-code/data';
import type { TableSchema } from '@low-code/shared';

/** 查找应用目录和租户 ID */
function findAppDir(appId: string): [string, string] | null {
  const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
  try {
    const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;
      const appDir = path.join(TENANTS_DIR, entry.name, 'apps', dirName);
      if (fs.existsSync(path.join(appDir, 'app.json'))) {
        return [entry.name, appDir];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** 加载表 Schema */
function loadTableSchema(appDir: string, tableId: string): TableSchema | null {
  const tablesDir = path.join(appDir, 'tables');
  const fileName = tableId.startsWith('table_') ? `${tableId}.json` : `table_${tableId}.json`;
  const filePath = path.join(tablesDir, fileName);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 创建查询路由 */
export function createQueryRouter(manager?: DatabaseManager): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/apps' });

  /**
   * POST /api/apps/:appId/query
   * 执行数据表查询
   */
  router.post('/:appId/query', async (ctx) => {
    const { appId } = ctx.params;
    const body = ctx.request.body as Record<string, any>;

    if (!body || !body.table) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing required field: table' };
      return;
    }

    // 查找应用所属租户
    const found = findAppDir(appId);
    if (!found) {
      ctx.status = 404;
      ctx.body = { success: false, error: `App not found: ${appId}` };
      return;
    }
    const [tenantDirName, appDir] = found;
    const tenantId = tenantDirName.replace('tenant_', '');

    // 加载表 Schema
    const tableId = body.table;
    const schema = loadTableSchema(appDir, tableId);
    if (!schema) {
      ctx.status = 404;
      ctx.body = { success: false, error: `Table not found: ${tableId}` };
      return;
    }

    // 构建允许的列名白名单（系统列 + 用户列）
    const allowedColumns = [
      'id', '_deleted', '_created_at', '_updated_at',
      ...schema.columns.map(col => col.fieldName),
    ];

    // 解析内存过滤函数
    let memoryFilter: ((record: any) => boolean) | undefined;
    if (body.memoryFilter && typeof body.memoryFilter === 'string') {
      try {
        // 安全包装：将 filter 表达式转为函数
        // eslint-disable-next-line no-new-func
        memoryFilter = new Function('record', `return (${body.memoryFilter})(record)`) as (record: any) => boolean;
      } catch {
        ctx.status = 400;
        ctx.body = { success: false, error: 'Invalid memoryFilter expression' };
        return;
      }
    }

    // 获取数据库连接
    if (!manager) {
      ctx.status = 500;
      ctx.body = { success: false, error: 'Database manager not available' };
      return;
    }
    const db = manager.getTenantDb(tenantId);

    try {
      const results = queryRecordsAdvanced(db, tableId, {
        select: body.select,
        where: body.where,
        orderBy: body.orderBy,
        limit: body.limit,
        offset: body.offset,
        aggregate: body.aggregate,
        allowedColumns,
        memoryFilter,
      });

      // 聚合查询返回单个结果
      if (body.aggregate) {
        ctx.body = { success: true, data: results[0]?.result ?? 0 };
      } else {
        ctx.body = { success: true, data: results };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.status = 400;
      ctx.body = { success: false, error: message };
    }
  });

  return router;
}
