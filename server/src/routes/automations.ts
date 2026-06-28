/**
 * 自动化规则路由
 *
 * 提供自动化规则的 CRUD 操作和执行日志查询。
 * 规则数据存储在 tenants/{tenantId}/apps/{appId}/automations/*.json
 * 执行日志存储在 tenant.db 的 automation_execution_logs 表。
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';

/** 生成 8 位 hex UUID */
function generateUuid(): string {
  return crypto.randomBytes(4).toString('hex');
}

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
      .filter((meta) => meta !== null);
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

  // GET /api/automations - 获取规则列表
  router.get('/', async (ctx) => {
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

    const rules = scanRules(tenantId, appId);

    // 支持状态过滤
    const status = ctx.query.status as string;
    const filtered = status ? rules.filter(r => r.status === status) : rules;

    ctx.body = { data: filtered };
  });

  // GET /api/automations/:id - 获取单个规则
  router.get('/:id', async (ctx) => {
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
    const rule = readRuleFile(tenantId, appId, ruleId);

    if (!rule) {
      ctx.status = 404;
      ctx.body = { error: '自动化规则不存在' };
      return;
    }

    ctx.body = { data: rule };
  });

  // POST /api/automations - 创建规则
  router.post('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const body = ctx.request.body as Record<string, unknown>;
    const { appId, name, description, trigger, condition, actions, throttle, effectiveTime } = body;

    if (!appId) {
      ctx.status = 400;
      ctx.body = { error: '缺少 appId' };
      return;
    }

    if (!name) {
      ctx.status = 400;
      ctx.body = { error: '缺少规则名称' };
      return;
    }

    if (!trigger) {
      ctx.status = 400;
      ctx.body = { error: '缺少触发器配置' };
      return;
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '缺少动作配置' };
      return;
    }

    const id = generateUuid();
    const now = new Date().toISOString();

    const rule = {
      id,
      appId,
      name,
      description: description || '',
      status: 'draft',
      trigger,
      condition: condition || null,
      actions,
      throttle: throttle || null,
      effectiveTime: effectiveTime || null,
      createdBy: 'system',
      createdAt: now,
      updatedBy: 'system',
      updatedAt: now,
      schemaVersion: 1,
      version: 1,
    };

    writeRuleFile(tenantId, appId as string, rule);

    ctx.status = 201;
    ctx.body = { data: rule };
  });

  // PUT /api/automations/:id - 更新规则
  router.put('/:id', async (ctx) => {
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

    const body = ctx.request.body as Record<string, unknown>;
    const updated = {
      ...existing,
      ...body,
      id: existing.id, // 保持原有 ID
      appId: existing.appId, // 保持原有 appId
      updatedAt: new Date().toISOString(),
      version: ((existing.version as number) || 1) + 1,
    };

    writeRuleFile(tenantId, appId, updated);

    ctx.body = { data: updated };
  });

  // DELETE /api/automations/:id - 删除规则
  router.delete('/:id', async (ctx) => {
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
    const deleted = deleteRuleFile(tenantId, appId, ruleId);

    if (!deleted) {
      ctx.status = 404;
      ctx.body = { error: '自动化规则不存在' };
      return;
    }

    ctx.body = { success: true };
  });

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

  // POST /api/automations/trigger - 手动触发事件（测试用）
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

    // 获取匹配的规则
    const rules = scanRules(tenantId, appId as string)
      .filter(r => r.status === 'enabled');

    // 简单的触发器匹配
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

      const logs = db.all(
        `SELECT * FROM automation_execution_logs
         WHERE rule_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [ruleId, limit, offset]
      );

      const total = db.get(
        'SELECT COUNT(*) as count FROM automation_execution_logs WHERE rule_id = ?',
        [ruleId]
      );

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

      const log = db.get(
        'SELECT * FROM automation_execution_logs WHERE id = ?',
        [logId]
      );

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
