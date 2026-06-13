/**
 * 路由注册入口
 *
 * 集中注册所有路由到 Koa 应用。
 */

import type Koa from 'koa';
import { getDbManager } from '../config/db.js';
import { createAuthRouter } from './auth.js';
import { createHealthRouter } from './health.js';

/** 注册所有路由 */
export function registerRoutes(app: Koa): void {
  const manager = getDbManager();

  // 认证路由
  const authRouter = createAuthRouter(manager);
  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());

  // 健康检查
  const healthRouter = createHealthRouter();
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());
}
