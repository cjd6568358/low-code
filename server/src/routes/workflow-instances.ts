/**
 * 流程实例路由
 *
 * 提供流程实例的查询和管理功能。
 * 数据存储在 tenants/{tenantId}/apps/{appId}/instances/*.json
 */

import fs from 'fs';
import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { WorkflowError } from '@low-code/workflow';

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

/** 读取实例文件 */
function readInstanceFile(tenantId: string, appId: string, instanceId: string): any | null {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'instances',
    `instance_${instanceId}.json`
  );
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描应用下的所有实例 */
function scanInstances(tenantId: string, appId: string, filters?: {
  status?: string;
  workflowId?: string;
  startedBy?: string;
}): any[] {
  const instancesDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'instances');
  try {
    if (!fs.existsSync(instancesDir)) {
      return [];
    }
    const entries = fs.readdirSync(instancesDir, { withFileTypes: true });
    let instances = entries
      .filter((e) => e.isFile() && e.name.startsWith('instance_') && e.name.endsWith('.json'))
      .map((e) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(instancesDir, e.name), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter((meta) => meta !== null);

    // 应用过滤器
    if (filters?.status) {
      instances = instances.filter((i) => i.status === filters.status);
    }
    if (filters?.workflowId) {
      instances = instances.filter((i) => i.workflowDefId === filters.workflowId);
    }
    if (filters?.startedBy) {
      instances = instances.filter((i) => i.startedBy === filters.startedBy);
    }

    // 按开始时间倒序
    instances.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return instances;
  } catch {
    return [];
  }
}

/** 写入实例文件 */
function writeInstanceFile(tenantId: string, appId: string, instance: any): void {
  const instancesDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'instances');
  if (!fs.existsSync(instancesDir)) {
    fs.mkdirSync(instancesDir, { recursive: true });
  }
  const fileName = `instance_${instance.id}.json`;
  fs.writeFileSync(path.join(instancesDir, fileName), JSON.stringify(instance, null, 2), 'utf-8');
}

/**
 * 创建流程实例路由
 */
export function createWorkflowInstancesRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/workflow-instances' });

  // GET /api/workflow-instances - 获取实例列表
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

    const filters = {
      status: ctx.query.status as string,
      workflowId: ctx.query.workflowId as string,
      startedBy: ctx.query.startedBy as string,
    };

    const instances = scanInstances(tenantId, appId, filters);
    ctx.body = { data: instances, total: instances.length };
  });

  // GET /api/workflow-instances/:id - 获取单个实例
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

    const instanceId = ctx.params.id;
    const instance = readInstanceFile(tenantId, appId, instanceId);

    if (!instance) {
      ctx.status = 404;
      ctx.body = { error: '流程实例不存在' };
      return;
    }

    ctx.body = { data: instance };
  });

  // POST /api/workflow-instances/:id/terminate - 终止流程
  router.post('/:id/terminate', async (ctx) => {
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

    const instanceId = ctx.params.id;
    const body = ctx.request.body as any;

    try {
      // 使用 WorkflowService 终止流程
      const instance = await WorkflowService.terminate(tenantId, appId, {
        instanceId,
        operatorId: body?.operatorId || 'system',
        operatorName: body?.operatorName || '系统',
        reason: body?.reason,
      });

      ctx.body = { data: instance };
    } catch (error) {
      if (error instanceof WorkflowError) {
        ctx.status = 400;
        ctx.body = { error: error.message, code: error.code };
      } else {
        ctx.status = 500;
        ctx.body = { error: '终止流程失败' };
      }
    }
  });

  // GET /api/workflow-instances/:id/history - 获取实例审批历史
  router.get('/:id/history', async (ctx) => {
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

    const instanceId = ctx.params.id;
    const instance = readInstanceFile(tenantId, appId, instanceId);

    if (!instance) {
      ctx.status = 404;
      ctx.body = { error: '流程实例不存在' };
      return;
    }

    // 读取快照历史
    const snapshotsDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'snapshots');
    let snapshots: any[] = [];
    try {
      if (fs.existsSync(snapshotsDir)) {
        const entries = fs.readdirSync(snapshotsDir, { withFileTypes: true });
        snapshots = entries
          .filter((e) => e.isFile() && e.name.includes(instanceId))
          .map((e) => {
            try {
              return JSON.parse(fs.readFileSync(path.join(snapshotsDir, e.name), 'utf-8'));
            } catch {
              return null;
            }
          })
          .filter((s) => s !== null)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    } catch {
      // ignore
    }

    ctx.body = { data: { instance, snapshots } };
  });

  return router;
}
