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
import { createExpressionEngine, type ExpressionEngine } from '@low-code/shared';
import { existsAsync, resolveAppDir, readFile, writeFile, readdir, mkdir, unlink } from '../utils/fs-utils.js';
import path from 'path';

/** 表达式引擎实例 */
const expressionEngine: ExpressionEngine = createExpressionEngine({ defaultTimeout: 100 });

/** 运算规则 Schema */
interface ComputationSchema {
  computationId: string;
  appId: string;
  name: string;
  type: string;
  status: string;
  inputs: Array<{
    key: string;
    label: string;
    fieldType: string;
    required?: boolean;
  }>;
  expression: {
    type: string;
    value: string;
    async?: boolean;
  };
  output: {
    name: string;
    type: string;
    format?: string;
    precision?: number;
  };
}

/** 加载运算规则 */
async function loadComputation(appDir: string, computationId: string): Promise<ComputationSchema | null> {
  const dirName = computationId.startsWith('computation_') ? computationId : `computation_${computationId}`;
  const computationFile = path.join(appDir, 'computations', `${dirName}.json`);

  try {
    if (!await existsAsync(computationFile)) return null;
    const content = await readFile(computationFile, 'utf-8');
    return JSON.parse(content) as ComputationSchema;
  } catch {
    return null;
  }
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

    const tenantId = (ctx.state as { tenantId: string }).tenantId;
    const appDir = tenantId ? await resolveAppDir(tenantId, appId) : null;
    if (!appDir) {
      ctx.status = 404;
      ctx.body = { success: false, error: '应用不存在' };
      return;
    }

    // 将 appDir 挂载到 ctx.state 供后续路由使用
    ctx.state.appDir = appDir;
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
      if (!await existsAsync(computationsDir)) {
        ctx.body = { success: true, data: [] };
        return;
      }

      const allFiles = await readdir(computationsDir);
      const files = allFiles.filter((f) => f.endsWith('.json'));
      const computations = await Promise.all(files.map(async (file) => {
        const content = await readFile(path.join(computationsDir, file), 'utf-8');
        return JSON.parse(content);
      }));

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

    const computation = await loadComputation(appDir, id);
    if (!computation) {
      ctx.status = 404;
      ctx.body = { success: false, error: '运算规则不存在' };
      return;
    }

    ctx.body = { success: true, data: computation };
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
      if (!await existsAsync(computationsDir)) {
        await mkdir(computationsDir, { recursive: true });
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
      await writeFile(filePath, JSON.stringify(computation, null, 2), 'utf-8');

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
      if (!await existsAsync(computationFile)) {
        ctx.status = 404;
        ctx.body = { success: false, error: '运算规则不存在' };
        return;
      }

      const existingContent = await readFile(computationFile, 'utf-8');
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

      await writeFile(computationFile, JSON.stringify(updated, null, 2), 'utf-8');

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
      if (!await existsAsync(computationFile)) {
        ctx.status = 404;
        ctx.body = { success: false, error: '运算规则不存在' };
        return;
      }

      await unlink(computationFile);
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
    const appDir = ctx.state.appDir as string;

    const body = ctx.request.body as Record<string, unknown>;
    const params = (body.params || {}) as Record<string, unknown>;

    // 加载运算规则
    const computation = await loadComputation(appDir, id);
    if (!computation) {
      ctx.status = 404;
      ctx.body = { success: false, error: `运算规则不存在: ${id}` };
      return;
    }

    // 检查状态
    if (computation.status !== 'active') {
      ctx.body = { success: false, error: `运算规则未启用: ${computation.status}` };
      return;
    }

    // 验证必填输入
    for (const input of computation.inputs) {
      if (input.required && (params[input.key] === undefined || params[input.key] === null)) {
        ctx.body = { success: false, error: `缺少必填参数: ${input.label || input.key}` };
        return;
      }
    }

    // 使用表达式引擎执行
    const startTime = Date.now();
    try {
      const result = await expressionEngine.safeEvaluate(
        computation.expression.value,
        params,
        100
      );
      ctx.body = { success: true, result, duration: Date.now() - startTime };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '表达式执行失败',
        duration: Date.now() - startTime,
      };
    }
  });

  /**
   * POST /api/apps/:appId/computations/preview
   * 预览表达式执行结果
   */
  router.post('/preview', async (ctx) => {
    const body = ctx.request.body as {
      expression?: string;
      context?: Record<string, unknown>;
    };

    if (!body.expression) {
      ctx.status = 400;
      ctx.body = { success: false, error: '表达式不能为空' };
      return;
    }

    const startTime = Date.now();
    try {
      const result = await expressionEngine.safeEvaluate(
        body.expression,
        body.context || {},
        100
      );
      ctx.body = { success: true, result, duration: Date.now() - startTime };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : '表达式执行失败',
        duration: Date.now() - startTime,
      };
    }
  });

  return router;
}
