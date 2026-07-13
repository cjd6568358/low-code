/**
 * API 服务入口
 *
 * Koa 服务，组装中间件和路由。
 * 启动：yarn server
 */

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { PORT } from './config/index.js';
import { errorMiddleware } from './middlewares/error.js';
import { corsMiddleware } from './middlewares/cors.js';
import { loggerMiddleware } from './middlewares/logger.js';
import { authMiddleware } from './middlewares/auth.js';
import { registerRoutes } from './routes/index.js';
import { CronScheduler } from './services/CronScheduler.js';
import { AutomationExecutor, type WorkflowExecutor } from './services/AutomationExecutor.js';
import { createExpressionEngine } from '@low-code/shared';

/** 全局 Cron 调度器实例 */
let cronScheduler: CronScheduler | null = null;

/** 全局自动化执行引擎实例 */
let automationExecutor: AutomationExecutor | null = null;

/**
 * 获取 Cron 调度器实例
 */
export function getCronScheduler(): CronScheduler {
  if (!cronScheduler) {
    cronScheduler = new CronScheduler('Asia/Shanghai');
  }
  return cronScheduler;
}

/**
 * 获取自动化执行引擎实例
 */
export function getAutomationExecutor(): AutomationExecutor | null {
  return automationExecutor;
}

/**
 * 初始化自动化执行引擎
 */
async function initializeAutomation(): Promise<void> {
  try {
    const scheduler = getCronScheduler();
    const expressionEngine = createExpressionEngine();

    // 工作流执行器（可选，如果没有工作流服务则不配置）
    const workflowExecutor: WorkflowExecutor | undefined = undefined;
    // TODO: 集成工作流服务
    // workflowExecutor = {
    //   startWorkflow: async (workflowId, variables, initiator) => {
    //     const workflowService = getWorkflowService();
    //     return workflowService.startInstance(workflowId, variables, initiator);
    //   },
    // };

    // 获取第一个租户 ID（简化处理，实际应该从请求中获取）
    const fs = await import('fs');
    const path = await import('path');
    const { TENANTS_DIR } = await import('./config/index.js');

    let tenantId: string | null = null;
    try {
      const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
      const tenant = entries.find((e) => e.isDirectory() && e.name.startsWith('tenant_'));
      tenantId = tenant?.name || null;
    } catch {
      // 目录不存在
    }

    if (tenantId) {
      automationExecutor = new AutomationExecutor({
        tenantId,
        scheduler,
        expressionEngine,
        workflowExecutor,
      });

      // 初始化执行引擎（加载并注册定时任务）
      await automationExecutor.initialize();

      // 启动调度器
      scheduler.start();

      console.log('[Server] 自动化执行引擎已初始化');
    } else {
      console.log('[Server] 未找到租户，跳过自动化引擎初始化');
    }
  } catch (error) {
    console.error('[Server] 自动化执行引擎初始化失败:', error);
  }
}

async function main() {
  const app = new Koa();

  // ─── 中间件(顺序 matters) ────────────────────
  app.use(errorMiddleware);
  app.use(corsMiddleware);
  app.use(loggerMiddleware);
  app.use(bodyParser());
  app.use(authMiddleware);

  // ─── 路由 ──────────────────────────────────────
  registerRoutes(app);

  // 404 兜底
  app.use(async (ctx) => {
    ctx.status = 404;
    ctx.body = { success: false, error: 'Not Found' };
  });

  // ─── 启动 ──────────────────────────────────────
  app.listen(PORT, async () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`  🚀 API 服务已启动: http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('  目录结构:');
    console.log('    config/       配置(端口、数据库路径)');
    console.log('    middlewares/  中间件(错误/CORS/日志)');
    console.log('    routes/       路由(auth、health)');
    console.log('    services/     业务服务层');
    console.log('');
    console.log('  接口列表:');
    console.log('    POST /api/auth/login      用户登录');
    console.log('    GET  /api/health          健康检查');
    console.log('    POST /api/automations/trigger  触发自动化事件');
    console.log('');

    // 初始化自动化执行引擎
    await initializeAutomation();
  });
}

main().catch((err) => {
  console.error('API 服务启动失败:', err);
  process.exit(1);
});
