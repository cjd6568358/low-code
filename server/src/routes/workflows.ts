/**
 * 流程定义路由
 *
 * 提供流程定义的 CRUD 操作。
 * 数据存储在 tenants/{tenantId}/apps/{appId}/workflows/*.json
 */

import fs from 'fs';
import path from 'path';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { WorkflowError } from '@low-code/workflow';
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

/** 读取流程定义文件 */
function readWorkflowFile(tenantId: string, appId: string, workflowId: string): any | null {
  const dirName = workflowId.startsWith('workflow_') ? workflowId : `workflow_${workflowId}`;
  const filePath = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'workflows', `${dirName}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** 扫描应用下的所有流程定义 */
function scanWorkflows(tenantId: string, appId: string): any[] {
  const workflowsDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'workflows');
  try {
    if (!fs.existsSync(workflowsDir)) {
      return [];
    }
    const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(workflowsDir, e.name), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter((meta) => meta !== null && !meta._deleted);
  } catch {
    return [];
  }
}

/** 写入流程定义文件 */
function writeWorkflowFile(tenantId: string, appId: string, workflow: any): void {
  const workflowsDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'workflows');
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  const fileName = `workflow_${workflow.id}.json`;
  fs.writeFileSync(path.join(workflowsDir, fileName), JSON.stringify(workflow, null, 2), 'utf-8');
}

/**
 * 创建流程定义路由
 */
export function createWorkflowsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/workflows' });

  // 注意：基本 CRUD 操作已统一到 apps 路由
  // GET    /api/apps/:appId/workflows          - 获取列表
  // GET    /api/apps/:appId/workflows/:id       - 获取单个
  // POST   /api/apps/:appId/workflows          - 创建
  // PUT    /api/apps/:appId/workflows/:id       - 更新
  // DELETE /api/apps/:appId/workflows/:id       - 删除

  // POST /api/workflows/:id/publish - 发布流程定义
  router.post('/:id/publish', async (ctx) => {
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

    const workflowId = ctx.params.id;
    const existing = readWorkflowFile(tenantId, appId, workflowId);

    if (!existing) {
      ctx.status = 404;
      ctx.body = { error: '流程定义不存在' };
      return;
    }

    const updated = {
      ...existing,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    writeWorkflowFile(tenantId, appId, updated);

    ctx.body = { data: updated };
  });

  // POST /api/workflows/:id/trigger - 触发流程实例
  router.post('/:id/trigger', async (ctx) => {
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

    const workflowId = ctx.params.id;
    const workflow = readWorkflowFile(tenantId, appId, workflowId);

    if (!workflow) {
      ctx.status = 404;
      ctx.body = { error: '流程定义不存在' };
      return;
    }

    if (workflow.status !== 'PUBLISHED') {
      ctx.status = 400;
      ctx.body = { error: '流程定义未发布，无法触发' };
      return;
    }

    const body = ctx.request.body as any;
    const { sourceTable, sourceId, variables, startedBy, startedByName } = body;

    try {
      // 使用 WorkflowService 启动流程
      const instance = await WorkflowService.start(tenantId, appId, {
        workflowId: workflowId,
        version: workflow.version,
        sourceTable,
        sourceId,
        variables: variables || {},
        startedBy: startedBy || 'system',
        startedByName: startedByName || '系统',
      });

      ctx.status = 201;
      ctx.body = { data: instance };
    } catch (error) {
      if (error instanceof WorkflowError) {
        ctx.status = 400;
        ctx.body = { error: error.message, code: error.code };
      } else {
        ctx.status = 500;
        ctx.body = { error: '启动流程失败' };
      }
    }
  });

  return router;
}
