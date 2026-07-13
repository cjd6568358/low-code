/**
 * 自动化规则路由
 *
 * 提供自动化规则的 CRUD 操作和执行日志查询。
 * 规则数据存储在 tenants/{tenantId}/apps/{appId}/automations/*.json
 * 执行日志存储在 tenant.db 的 automation_execution_logs 表。
 */

import fs from 'fs';
import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';
import { generateHexId } from '@low-code/shared';

/** 从文件名提取裸 ID */
function stripPrefix(id: string): string {
  const idx = id.indexOf('_');
  return idx >= 0 ? id.substring(idx + 1) : id;
}

/** 获取第一个活跃租户 ID */
function getFirstTenantId(): string | null {
  try {
    const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
    const tenant = entries.find((e) => e.isDirectory() && e.name.startsWith('tenant_'));
    return tenant?.name || null;
  } catch {
    return null;
  }
}

/** 自动化规则目录 */
function getAutomationsDir(tenantId: string, appId: string): string {
  return path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'automations');
}

/** 读取规则文件 */
function readRuleFile(tenantId: string, appId: string, ruleId: string): Record<string, unknown> | null {
  const dirName = ruleId.startsWith('automation_') ? ruleId : `automation_${ruleId}`;
  const filePath = path.join(getAutomationsDir(tenantId, appId), `${dirName}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描应用下的所有规则 */
function scanRules(tenantId: string, appId: string): Record<string, unknown>[] {
  const automationsDir = getAutomationsDir(tenantId, appId);
  try {
    if (!fs.existsSync(automationsDir)) {
      return [];
    }
    const entries = fs.readdirSync(automationsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(automationsDir, e.name), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter((meta) => meta !== null && !meta._deleted);
  } catch {
    return [];
  }
}

/** 写入规则文件 */
function writeRuleFile(tenantId: string, appId: string, rule: Record<string, unknown>): void {
  const automationsDir = getAutomationsDir(tenantId, appId);
  if (!fs.existsSync(automationsDir)) {
    fs.mkdirSync(automationsDir, { recursive: true });
  }
  const fileName = `automation_${rule.id}.json`;
  fs.writeFileSync(path.join(automationsDir, fileName), JSON.stringify(rule, null, 2), 'utf-8');
}

/** 删除规则文件 */
function deleteRuleFile(tenantId: string, appId: string, ruleId: string): boolean {
  const dirName = ruleId.startsWith('automation_') ? ruleId : `automation_${ruleId}`;
  const filePath = path.join(getAutomationsDir(tenantId, appId), `${dirName}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 创建自动化规则路由
 */
export function createAutomationsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/automations' });

  // 注意：基本 CRUD 操作已统一到 apps 路由
  // GET    /api/apps/:appId/automations          - 获取列表
  // GET    /api/apps/:appId/automations/:id       - 获取单个
  // POST   /api/apps/:appId/automations          - 创建
  // PUT    /api/apps/:appId/automations/:id       - 更新
  // DELETE /api/apps/:appId/automations/:id       - 删除

  // POST /api/automations/:id/enable - 启用规则
  router.post('/:id/enable', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.query.appId as string;
    if (!appId) {
      ctx.status = 400;
      ctx.body = { error: '缺少 appId 参数' };
      return;
    }

    const ruleId = ctx.params.id;
    const existing = readRuleFile(tenantId, appId, ruleId);

    if (!existing) {
      ctx.status = 404;
      ctx.body = { error: '自动化规则不存在' };
      return;
    }

    const updated = {
      ...existing,
      status: 'enabled',
      updatedAt: new Date().toISOString(),
      version: ((existing.version as number) || 1) + 1,
    };

    writeRuleFile(tenantId, appId, updated);

    ctx.body = { data: updated };
  });

  // POST /api/automations/:id/disable - 禁用规则
  router.post('/:id/disable', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.query.appId as string;
    if (!appId) {
      ctx.status = 400;
      ctx.body = { error: '缺少 appId 参数' };
      return;
    }

    const ruleId = ctx.params.id;
    const existing = readRuleFile(tenantId, appId, ruleId);

    if (!existing) {
      ctx.status = 404;
      ctx.body = { error: '自动化规则不存在' };
      return;
    }

    const updated = {
      ...existing,
      status: 'disabled',
      updatedAt: new Date().toISOString(),
      version: ((existing.version as number) || 1) + 1,
    };

    writeRuleFile(tenantId, appId, updated);

    ctx.body = { data: updated };
  });

  // POST /api/automations/trigger - 手动触发事件
  router.post('/trigger', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const body = ctx.request.body as Record<string, unknown>;
    const { appId, eventType, eventData } = body;

    if (!appId) {
      ctx.status = 400;
      ctx.body = { error: '缺少 appId' };
      return;
    }

    if (!eventType) {
      ctx.status = 400;
      ctx.body = { error: '缺少 eventType' };
      return;
    }

    // 使用自动化执行引擎触发事件
    try {
      const { getAutomationExecutor } = await import('../index.js');
      const executor = getAutomationExecutor();

      if (executor) {
        const results = await executor.triggerEvent(
          eventType as string,
          (eventData as Record<string, unknown>) || {},
          appId as string
        );

        ctx.body = {
          data: {
            matchedRules: results.length,
            results,
          },
        };
      } else {
        // 回退到简单匹配
        const rules = scanRules(tenantId, appId as string)
          .filter(r => r.status === 'enabled');

        const matchedRules = rules.filter(rule => {
          const trigger = rule.trigger as Record<string, unknown>;
          if (!trigger) return false;

          const triggerType = trigger.type as string;

          if (triggerType === 'data_change' && eventType.toString().startsWith('entity.')) {
            return true;
          }
          if (triggerType === 'form_event' && eventType.toString().startsWith('form.')) {
            return true;
          }
          if (triggerType === 'workflow_event' && eventType.toString().startsWith('workflow.')) {
            return true;
          }
          if (triggerType === 'custom_event') {
            const customEvent = trigger.customEvent as Record<string, unknown>;
            if (customEvent && customEvent.eventType === eventType) {
              return true;
            }
          }
          return false;
        });

        ctx.body = {
          data: {
            matchedRules: matchedRules.length,
            rules: matchedRules.map(r => ({ id: r.id, name: r.name })),
          },
        };
      }
    } catch (error) {
      console.error('[Automations] 触发事件失败:', error);
      ctx.status = 500;
      ctx.body = { error: '触发事件失败' };
    }
  });

  // POST /api/automations/:id/execute - 手动执行规则
  router.post('/:id/execute', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const ruleId = ctx.params.id;
    const appId = ctx.query.appId as string;

    if (!appId) {
      ctx.status = 400;
      ctx.body = { error: '缺少 appId 参数' };
      return;
    }

    try {
      const { getAutomationExecutor } = await import('../index.js');
      const executor = getAutomationExecutor();

      if (!executor) {
        ctx.status = 500;
        ctx.body = { error: '自动化执行引擎未初始化' };
        return;
      }

      // 获取规则
      const rule = readRuleFile(tenantId, appId, ruleId);
      if (!rule) {
        ctx.status = 404;
        ctx.body = { error: '规则不存在' };
        return;
      }

      // 手动触发定时任务
      if (rule.trigger && (rule.trigger as Record<string, unknown>).type === 'schedule') {
        await executor.triggerEvent(
          'manual',
          { triggerType: 'manual', timestamp: new Date().toISOString() },
          appId
        );
      } else {
        ctx.status = 400;
        ctx.body = { error: '只有定时触发类型的规则支持手动执行' };
        return;
      }

      ctx.body = { data: { success: true } };
    } catch (error) {
      console.error('[Automations] 手动执行规则失败:', error);
      ctx.status = 500;
      ctx.body = { error: '执行失败' };
    }
  });

  // GET /api/automations/:id/stats - 获取规则执行统计
  router.get('/:id/stats', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const ruleId = ctx.params.id;

    try {
      const { getAutomationExecutor } = await import('../index.js');
      const executor = getAutomationExecutor();

      if (!executor) {
        ctx.status = 500;
        ctx.body = { error: '自动化执行引擎未初始化' };
        return;
      }

      const stats = executor.getExecutionStats(tenantId, ruleId);
      ctx.body = { data: stats };
    } catch (error) {
      console.error('[Automations] 获取执行统计失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取统计失败' };
    }
  });

  // GET /api/automations/:id/logs - 获取规则执行日志
  router.get('/:id/logs', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const ruleId = ctx.params.id;
    const limit = parseInt(ctx.query.limit as string) || 20;
    const offset = parseInt(ctx.query.offset as string) || 0;

    try {
      const manager = getDbManager();
      const db = manager.getTenantDb(tenantId);

      const logs = db.prepare(
        `SELECT * FROM automation_execution_logs
         WHERE rule_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      ).all(ruleId, limit, offset);

      const total = db.prepare(
        'SELECT COUNT(*) as count FROM automation_execution_logs WHERE rule_id = ?',
      ).get(ruleId);

      ctx.body = {
        data: logs,
        total: (total as Record<string, unknown>)?.count || 0,
        limit,
        offset,
      };
    } catch (error) {
      console.error('[Automations] Failed to query logs:', error);
      ctx.body = { data: [], total: 0 };
    }
  });

  // GET /api/automations/logs/:logId - 获取日志详情
  router.get('/logs/:logId', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const logId = ctx.params.logId;

    try {
      const manager = getDbManager();
      const db = manager.getTenantDb(tenantId);

      const log = db.prepare(
        'SELECT * FROM automation_execution_logs WHERE id = ?',
      ).get(logId);

      if (!log) {
        ctx.status = 404;
        ctx.body = { error: '日志不存在' };
        return;
      }

      ctx.body = { data: log };
    } catch (error) {
      console.error('[Automations] Failed to query log:', error);
      ctx.status = 500;
      ctx.body = { error: '查询日志失败' };
    }
  });

  return router;
}
