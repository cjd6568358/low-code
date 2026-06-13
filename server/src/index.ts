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
import { registerRoutes } from './routes/index.js';

async function main() {
  const app = new Koa();

  // ─── 中间件（顺序 matters） ────────────────────
  app.use(errorMiddleware);
  app.use(corsMiddleware);
  app.use(loggerMiddleware);
  app.use(bodyParser());

  // ─── 路由 ──────────────────────────────────────
  registerRoutes(app);

  // 404 兜底
  app.use(async (ctx) => {
    ctx.status = 404;
    ctx.body = { success: false, error: 'Not Found' };
  });

  // ─── 启动 ──────────────────────────────────────
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`  🚀 API 服务已启动: http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('  目录结构:');
    console.log('    config/       配置（端口、数据库路径）');
    console.log('    middlewares/  中间件（错误/CORS/日志）');
    console.log('    routes/       路由（auth、health）');
    console.log('    services/     业务服务层（待实现）');
    console.log('');
    console.log('  接口列表:');
    console.log('    POST /api/auth/login   用户登录');
    console.log('    GET  /api/health       健康检查');
    console.log('');
  });
}

main().catch((err) => {
  console.error('API 服务启动失败:', err);
  process.exit(1);
});
