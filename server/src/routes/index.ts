/**
 * 路由注册入口
 *
 * 集中注册所有路由到 Koa 应用。
 */

import type Koa from 'koa';
import { getDbManager } from '../config/db.js';
import { createAuthRouter } from './auth.js';
import { createAppsRouter } from './apps.js';
import { createTenantsRouter } from './tenants.js';
import { createHealthRouter } from './health.js';

// Register all routes
export function registerRoutes(app: Koa): void {
  const manager = getDbManager();

  // Auth routes
  const authRouter = createAuthRouter(manager);
  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());

  // App routes (data source: tenants/ file system)
  const appsRouter = createAppsRouter();
  app.use(appsRouter.routes());
  app.use(appsRouter.allowedMethods());

  // Tenant routes (data source: tenants/ file system)
  const tenantsRouter = createTenantsRouter();
  app.use(tenantsRouter.routes());
  app.use(tenantsRouter.allowedMethods());

  // Health check
  const healthRouter = createHealthRouter();
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());
}
