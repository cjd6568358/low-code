/**
 * 流程实例路由
 *
 * 提供流程实例的查询和管理功能。
 * 数据存储在 tenants/{tenantId}/apps/{appId}/instances/*.json
 */

import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { WorkflowError } from '@low-code/workflow';
import { existsAsync, readFile, writeFile, readdir, mkdir } from '../utils/fs-utils.js';

/** 读取实例文件 */
async function readInstanceFile(tenantId: string, appId: string, instanceId: string): Promise<any | null> {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'instances',
    `instance_${instanceId}.json`
  );
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描应用下的所有实例 */
async function scanInstances(tenantId: string, appId: string, filters?: {
  status?: string;
  workflowId?: string;
  startedBy?: string;
}): Promise<any[]> {
  const instancesDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'instances');
  try {
    if (!await existsAsync(instancesDir)) {
      return [];
    }
    const entries = await readdir(instancesDir, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.startsWith('instance_') && e.name.endsWith('.json'))
        .map(async (e) => {
          try {
            return JSON.parse(await readFile(path.join(instancesDir, e.name), 'utf-8'));
          } catch {
            return null;
          }
        })
    );
    let instances = results.filter((meta) => meta !== null);

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
async function writeInstanceFile(tenantId: string, appId: string, instance: any): Promise<void> {
  const instancesDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'instances');
  if (!await existsAsync(instancesDir)) {
    await mkdir(instancesDir, { recursive: true });
  }
  const fileName = `instance_${instance.id}.json`;
  await writeFile(path.join(instancesDir, fileName), JSON.stringify(instance, null, 2), 'utf-8');
}

/**
 * 创建流程实例路由
 */
export function createWorkflowInstancesRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/apps' });

  // GET /api/apps/:appId/workflow-instances - 获取实例列表
  router.get('/:appId/workflow-instances', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;

    const filters = {
      status: ctx.query.status as string,
      workflowId: ctx.query.workflowId as string,
      startedBy: ctx.query.startedBy as string,
    };

    const instances = await scanInstances(tenantId, appId, filters);
    ctx.body = { data: instances, total: instances.length };
  });

  // GET /api/apps/:appId/workflow-instances/:id - 获取单个实例
  router.get('/:appId/workflow-instances/:id', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const instanceId = ctx.params.id;
    const instance = await readInstanceFile(tenantId, appId, instanceId);

    if (!instance) {
      ctx.status = 404;
      ctx.body = { error: '流程实例不存在' };
      return;
    }

    ctx.body = { data: instance };
  });

  // POST /api/apps/:appId/workflow-instances/:id/terminate - 终止流程
  router.post('/:appId/workflow-instances/:id/terminate', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
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

  // GET /api/apps/:appId/workflow-instances/:id/jobs - 获取实例的节点执行记录
  router.get('/:appId/workflow-instances/:id/jobs', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const instanceId = ctx.params.id;

    try {
      const jobs = await WorkflowService.getJobs(tenantId, appId, instanceId);
      ctx.body = { data: jobs, total: jobs.length };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: '获取节点执行记录失败' };
    }
  });

  // GET /api/apps/:appId/workflow-instances/:id/history - 获取实例审批历史
  router.get('/:appId/workflow-instances/:id/history', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const instanceId = ctx.params.id;
    const instance = await readInstanceFile(tenantId, appId, instanceId);

    if (!instance) {
      ctx.status = 404;
      ctx.body = { error: '流程实例不存在' };
      return;
    }

    // 读取快照历史
    const snapshotsDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'snapshots');
    let snapshots: any[] = [];
    try {
      if (await existsAsync(snapshotsDir)) {
        const entries = await readdir(snapshotsDir, { withFileTypes: true });
        const results = await Promise.all(
          entries
            .filter((e) => e.isFile() && e.name.includes(instanceId))
            .map(async (e) => {
              try {
                return JSON.parse(await readFile(path.join(snapshotsDir, e.name), 'utf-8'));
              } catch {
                return null;
              }
            })
        );
        snapshots = results
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
