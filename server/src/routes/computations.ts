/**
 * 运算规则路由
 *
 * 提供运算规则的 CRUD 和执行功能：
 * - GET /api/apps/:appId/computations — 列表
 * - GET /api/apps/:appId/computations/:id — 详情
 * - POST /api/apps/:appId/computations — 创建
 * - PUT /api/apps/:appId/computations/:id — 更新
 * - DELETE /api/apps/:appId/computations/:id — 删除
 * - POST /api/apps/:appId/computations/:id/execute — 执行
 * - POST /api/apps/:appId/computations/preview — 预览
 */

import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { computationExecutor } from '../services/ComputationExecutor.js';
import fs from 'fs';
import path from 'path';

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

/** 生成 8 位 hex ID */
function generateHexId(): string {
  return Math.random().toString(16).substring(2, 10);
}

/**
 * 创建运算路由
 *
 * 挂载在 /api/apps/:appId 下，路径为 /api/apps/:appId/computations
 */
export function createComputationsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/computations' });

  // 中间件：从路由参数获取 appId 并验证应用存在
  router.use(async (ctx, next) => {
    const appId = ctx.params.appId;
    if (!appId) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'appId is required' };
      return;
    }

    const result = findAppDir(appId);
    if (!result) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    // 将 appDir 挂载到 ctx.state 供后续路由使用
    ctx.state.appDir = result[1];
    ctx.state.appId = appId;
    await next();
  });

  /**
   * GET /api/apps/:appId/computations
   * 获取运算规则列表
   */
  router.get('/', async (ctx) => {
    const appDir = ctx.state.appDir as string;
    const computationsDir = path.join(appDir, 'computations');

    try {
      if (!fs.existsSync(computationsDir)) {
        ctx.body = { success: true, data: [] };
        return;
      }

      const files = fs.readdirSync(computationsDir).filter((f) => f.endsWith('.json'));
      const computations = files.map((file) => {
        const content = fs.readFileSync(path.join(computationsDir, file), 'utf-8');
        return JSON.parse(content);
      });

      ctx.body = { success: true, data: computations };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '加载运算规则失败' };
    }
  });

  /**
   * GET /api/apps/:appId/computations/:id
   * 获取单个运算规则
   */
  router.get('/:id', async (ctx) => {
    const { id } = ctx.params;
    const appDir = ctx.state.appDir as string;
    const dirName = id.startsWith('computation_') ? id : `computation_${id}`;
    const computationFile = path.join(appDir, 'computations', `${dirName}.json`);

    try {
      if (!fs.existsSync(computationFile)) {
        ctx.status = 404;
        ctx.body = { success: false, error: '运算规则不存在' };
        return;
      }

      const content = fs.readFileSync(computationFile, 'utf-8');
      ctx.body = { success: true, data: JSON.parse(content) };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '加载运算规则失败' };
    }
  });

  /**
   * POST /api/apps/:appId/computations
   * 创建运算规则
   */
  router.post('/', async (ctx) => {
    const appId = ctx.state.appId as string;
    const appDir = ctx.state.appDir as string;
    const computationsDir = path.join(appDir, 'computations');

    try {
      if (!fs.existsSync(computationsDir)) {
        fs.mkdirSync(computationsDir, { recursive: true });
      }

      const body = ctx.request.body as Record<string, unknown>;
      const computationId = generateHexId();

      const computation = {
        schemaVersion: 1,
        version: 1,
        computationId,
        appId,
        name: body.name || '',
        description: body.description || '',
        type: body.type || 'field',
        status: body.status || 'draft',
        inputs: body.inputs || [],
        expression: body.expression || { type: 'expression', value: '', async: false },
        output: body.output || { name: '', type: 'number' },
        tableId: body.tableId,
        references: body.references,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const filePath = path.join(computationsDir, `${computationId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(computation, null, 2), 'utf-8');

      ctx.body = { success: true, data: computation };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '创建运算规则失败' };
    }
  });

  /**
   * PUT /api/apps/:appId/computations/:id
   * 更新运算规则
   */
  router.put('/:id', async (ctx) => {
    const { id } = ctx.params;
    const appId = ctx.state.appId as string;
    const appDir = ctx.state.appDir as string;
    const dirName = id.startsWith('computation_') ? id : `computation_${id}`;
    const computationFile = path.join(appDir, 'computations', `${dirName}.json`);

    try {
      if (!fs.existsSync(computationFile)) {
        ctx.status = 404;
        ctx.body = { success: false, error: '运算规则不存在' };
        return;
      }

      const existingContent = fs.readFileSync(computationFile, 'utf-8');
      const existing = JSON.parse(existingContent);

      const body = ctx.request.body as Record<string, unknown>;
      const updated = {
        ...existing,
        ...body,
        computationId: id,
        appId,
        version: (existing.version || 1) + 1,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(computationFile, JSON.stringify(updated, null, 2), 'utf-8');

      ctx.body = { success: true, data: updated };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '更新运算规则失败' };
    }
  });

  /**
   * DELETE /api/apps/:appId/computations/:id
   * 删除运算规则
   */
  router.delete('/:id', async (ctx) => {
    const { id } = ctx.params;
    const appDir = ctx.state.appDir as string;
    const dirName = id.startsWith('computation_') ? id : `computation_${id}`;
    const computationFile = path.join(appDir, 'computations', `${dirName}.json`);

    try {
      if (!fs.existsSync(computationFile)) {
        ctx.status = 404;
        ctx.body = { success: false, error: '运算规则不存在' };
        return;
      }

      fs.unlinkSync(computationFile);
      ctx.body = { success: true };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '删除运算规则失败' };
    }
  });

  /**
   * POST /api/apps/:appId/computations/:id/execute
   * 执行运算规则
   */
  router.post('/:id/execute', async (ctx) => {
    const { id } = ctx.params;
    const appId = ctx.state.appId as string;

    const body = ctx.request.body as Record<string, unknown>;
    const params = (body.params || {}) as Record<string, unknown>;

    const result = await computationExecutor.execute(appId, id, params);
    ctx.body = result;
  });

  /**
   * POST /api/apps/:appId/computations/preview
   * 预览表达式执行结果
   */
  router.post('/preview', async (ctx) => {
    const appId = ctx.state.appId as string;
    const body = ctx.request.body as {
      expression?: string;
      context?: Record<string, unknown>;
      outputType?: string;
    };

    if (!body.expression) {
      ctx.status = 400;
      ctx.body = { success: false, error: '表达式不能为空' };
      return;
    }

    const result = await computationExecutor.preview(
      body.expression,
      { ...body.context, appId },
      body.outputType || 'string'
    );

    ctx.body = result;
  });

  return router;
}
