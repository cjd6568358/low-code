/**
 * 审批任务路由
 *
 * 提供审批任务的查询和操作功能。
 * 数据存储在 tenants/{tenantId}/apps/{appId}/tasks/*.json
 */

import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { WorkflowError } from '@low-code/workflow';
import { existsAsync, readFile, writeFile, readdir, mkdir } from '../utils/fs-utils.js';

/** 读取任务文件 */
async function readTaskFile(tenantId: string, appId: string, taskId: string): Promise<any | null> {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'tasks',
    'task_' + taskId + '.json'
  );
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描任务 */
async function scanTasks(tenantId: string, appId: string, filters?: {
  instanceId?: string;
  assigneeId?: string;
  status?: string;
}): Promise<any[]> {
  const tasksDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'tasks');
  try {
    if (!await existsAsync(tasksDir)) {
      return [];
    }
    const entries = await readdir(tasksDir, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.startsWith('task_') && e.name.endsWith('.json'))
        .map(async (e) => {
          try {
            return JSON.parse(await readFile(path.join(tasksDir, e.name), 'utf-8'));
          } catch {
            return null;
          }
        })
    );
    let tasks = results.filter((t) => t !== null);

    // 应用过滤器
    if (filters?.instanceId) {
      tasks = tasks.filter((t) => t.instanceId === filters.instanceId);
    }
    if (filters?.assigneeId) {
      tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    }
    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    // 按创建时间倒序
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return tasks;
  } catch {
    return [];
  }
}

/** 写入任务文件 */
async function writeTaskFile(tenantId: string, appId: string, task: any): Promise<void> {
  const tasksDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'tasks');
  if (!await existsAsync(tasksDir)) {
    await mkdir(tasksDir, { recursive: true });
  }
  const fileName = 'task_' + task.id + '.json';
  await writeFile(path.join(tasksDir, fileName), JSON.stringify(task, null, 2), 'utf-8');
}

/** 读取实例文件 */
async function readInstanceFile(tenantId: string, appId: string, instanceId: string): Promise<any | null> {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'instances',
    'instance_' + instanceId + '.json'
  );
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 写入实例文件 */
async function writeInstanceFile(tenantId: string, appId: string, instance: any): Promise<void> {
  const instancesDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'instances');
  if (!await existsAsync(instancesDir)) {
    await mkdir(instancesDir, { recursive: true });
  }
  const fileName = 'instance_' + instance.id + '.json';
  await writeFile(path.join(instancesDir, fileName), JSON.stringify(instance, null, 2), 'utf-8');
}

/** 读取流程定义 */
async function readWorkflowFile(tenantId: string, appId: string, workflowId: string): Promise<any | null> {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'workflows',
    'workflow_' + workflowId + '.json'
  );
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 保存快照 */
async function saveSnapshot(tenantId: string, appId: string, snapshot: any): Promise<void> {
  const snapshotsDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'snapshots');
  if (!await existsAsync(snapshotsDir)) {
    await mkdir(snapshotsDir, { recursive: true });
  }
  const fileName = 'snapshot_' + snapshot.id + '.json';
  await writeFile(path.join(snapshotsDir, fileName), JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * 创建审批任务路由
 */
export function createWorkflowTasksRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/apps' });

  // GET /api/apps/:appId/workflow-tasks/stats - 获取用户任务统计
  router.get('/:appId/workflow-tasks/stats', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;

    const userId = ctx.query.userId as string;

    try {
      const engine = await WorkflowService.getEngine(tenantId, appId);
      if (userId) {
        const stats = await engine.getUserTaskStats(userId);
        ctx.body = { data: stats };
      } else {
        const allStats = await engine.getAllUserTaskStats();
        ctx.body = { data: allStats, total: allStats.length };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: '获取任务统计失败' };
    }
  });

  // GET /api/apps/:appId/workflow-tasks - 获取任务列表
  router.get('/:appId/workflow-tasks', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;

    const filters = {
      instanceId: ctx.query.instanceId as string,
      assigneeId: ctx.query.assigneeId as string,
      status: ctx.query.status as string,
    };

    const tasks = await scanTasks(tenantId, appId, filters);
    ctx.body = { data: tasks, total: tasks.length };
  });

  // GET /api/apps/:appId/workflow-tasks/:id - 获取单个任务
  router.get('/:appId/workflow-tasks/:id', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const taskId = ctx.params.id;
    const task = await readTaskFile(tenantId, appId, taskId);

    if (!task) {
      ctx.status = 404;
      ctx.body = { error: '任务不存在' };
      return;
    }

    ctx.body = { data: task };
  });

  // POST /api/apps/:appId/workflow-tasks/:id/approve - 审批通过
  router.post('/:appId/workflow-tasks/:id/approve', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const taskId = ctx.params.id;
    const body = ctx.request.body as any;
    const { formData, comment, operatorId, operatorName } = body;

    try {
      // 使用 WorkflowService 完成任务
      const instance = await WorkflowService.complete(tenantId, appId, {
        taskId,
        operatorId: operatorId || 'system',
        operatorName: operatorName || '系统',
        formData,
        comment,
      });

      ctx.body = { data: instance };
    } catch (error) {
      if (error instanceof WorkflowError) {
        ctx.status = 400;
        ctx.body = { error: error.message, code: error.code };
      } else {
        ctx.status = 500;
        ctx.body = { error: '审批失败' };
      }
    }
  });

  // POST /api/apps/:appId/workflow-tasks/:id/reject - 审批驳回
  router.post('/:appId/workflow-tasks/:id/reject', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const taskId = ctx.params.id;
    const body = ctx.request.body as any;
    const { comment, operatorId, operatorName, targetNodeId } = body;

    if (!comment) {
      ctx.status = 400;
      ctx.body = { error: '驳回必须填写意见' };
      return;
    }

    try {
      // 使用 WorkflowService 驳回任务
      const instance = await WorkflowService.reject(tenantId, appId, {
        taskId,
        operatorId: operatorId || 'system',
        operatorName: operatorName || '系统',
        comment,
        targetNodeId,
      });

      ctx.body = { data: instance };
    } catch (error) {
      if (error instanceof WorkflowError) {
        ctx.status = 400;
        ctx.body = { error: error.message, code: error.code };
      } else {
        ctx.status = 500;
        ctx.body = { error: '驳回失败' };
      }
    }
  });

  // POST /api/apps/:appId/workflow-tasks/:id/transfer - 转办
  router.post('/:appId/workflow-tasks/:id/transfer', async (ctx) => {
    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { error: '没有找到租户' };
      return;
    }

    const appId = ctx.params.appId;
    const taskId = ctx.params.id;
    const body = ctx.request.body as any;
    const { targetUserId, targetUserName, operatorId, operatorName, reason } = body;

    if (!targetUserId) {
      ctx.status = 400;
      ctx.body = { error: '缺少转办目标人' };
      return;
    }

    try {
      // 使用 WorkflowService 转办任务
      const updatedTask = await WorkflowService.transfer(tenantId, appId, {
        taskId,
        targetUserId,
        targetUserName,
        operatorId: operatorId || 'system',
        operatorName: operatorName || '系统',
        reason,
      });

      ctx.body = { data: updatedTask };
    } catch (error) {
      if (error instanceof WorkflowError) {
        ctx.status = 400;
        ctx.body = { error: error.message, code: error.code };
      } else {
        ctx.status = 500;
        ctx.body = { error: '转办失败' };
      }
    }
  });

  return router;
}
