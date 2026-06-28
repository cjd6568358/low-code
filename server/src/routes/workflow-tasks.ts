/**
 * 审批任务路由
 *
 * 提供审批任务的查询和操作功能。
 * 数据存储在 tenants/{tenantId}/apps/{appId}/tasks/*.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { WorkflowError } from '@low-code/workflow';

/** 生成 8 位 hex UUID */
function generateUuid(): string {
  return crypto.randomBytes(4).toString('hex');
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

/** 读取任务文件 */
function readTaskFile(tenantId: string, appId: string, taskId: string): any | null {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'tasks',
    'task_' + taskId + '.json'
  );
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描任务 */
function scanTasks(tenantId: string, appId: string, filters?: {
  instanceId?: string;
  assigneeId?: string;
  status?: string;
}): any[] {
  const tasksDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'tasks');
  try {
    if (!fs.existsSync(tasksDir)) {
      return [];
    }
    const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
    let tasks = entries
      .filter((e) => e.isFile() && e.name.startsWith('task_') && e.name.endsWith('.json'))
      .map((e) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(tasksDir, e.name), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter((t) => t !== null);

    // 应用过滤器
    if (filters?.instanceId) {
      tasks = tasks.filter((t) => t.instanceId === filters.instanceId);
    }
    if (filters?.assigneeId) {
      tasks = tasks.filter((t) =>
        t.assigneeId === filters.assigneeId ||
        (t.candidateUsers && t.candidateUsers.includes(filters.assigneeId))
      );
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
function writeTaskFile(tenantId: string, appId: string, task: any): void {
  const tasksDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  const fileName = 'task_' + task.id + '.json';
  fs.writeFileSync(path.join(tasksDir, fileName), JSON.stringify(task, null, 2), 'utf-8');
}

/** 读取实例文件 */
function readInstanceFile(tenantId: string, appId: string, instanceId: string): any | null {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'instances',
    'instance_' + instanceId + '.json'
  );
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 写入实例文件 */
function writeInstanceFile(tenantId: string, appId: string, instance: any): void {
  const instancesDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'instances');
  if (!fs.existsSync(instancesDir)) {
    fs.mkdirSync(instancesDir, { recursive: true });
  }
  const fileName = 'instance_' + instance.id + '.json';
  fs.writeFileSync(path.join(instancesDir, fileName), JSON.stringify(instance, null, 2), 'utf-8');
}

/** 读取流程定义 */
function readWorkflowFile(tenantId: string, appId: string, workflowId: string): any | null {
  const filePath = path.join(
    TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'workflows',
    'workflow_' + workflowId + '.json'
  );
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 保存快照 */
function saveSnapshot(tenantId: string, appId: string, snapshot: any): void {
  const snapshotsDir = path.join(TENANTS_DIR, tenantId, 'apps', 'app_' + appId, 'snapshots');
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }
  const fileName = 'snapshot_' + snapshot.id + '.json';
  fs.writeFileSync(path.join(snapshotsDir, fileName), JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * 创建审批任务路由
 */
export function createWorkflowTasksRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/workflow-tasks' });

  // GET /api/workflow-tasks - 获取任务列表
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
      instanceId: ctx.query.instanceId as string,
      assigneeId: ctx.query.assigneeId as string,
      status: ctx.query.status as string,
    };

    const tasks = scanTasks(tenantId, appId, filters);
    ctx.body = { data: tasks, total: tasks.length };
  });

  // GET /api/workflow-tasks/:id - 获取单个任务
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

    const taskId = ctx.params.id;
    const task = readTaskFile(tenantId, appId, taskId);

    if (!task) {
      ctx.status = 404;
      ctx.body = { error: '任务不存在' };
      return;
    }

    ctx.body = { data: task };
  });

  // POST /api/workflow-tasks/:id/approve - 审批通过
  router.post('/:id/approve', async (ctx) => {
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

  // POST /api/workflow-tasks/:id/reject - 审批驳回
  router.post('/:id/reject', async (ctx) => {
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

  // POST /api/workflow-tasks/:id/transfer - 转办
  router.post('/:id/transfer', async (ctx) => {
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
