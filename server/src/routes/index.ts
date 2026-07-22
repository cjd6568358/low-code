/**
 * 路由注册入口
 *
 * 集中注册所有路由到 Koa 应用。
 */

import type Koa from 'koa';
import type KoaRouter from '@koa/router';
import { getDbManager } from '../config/db.js';
import { tenantGuard } from '../middlewares/auth.js';
import type { AuditLogService } from '../services/AuditLogService.js';
import { createAuthRouter } from './auth.js';
import { createAppsRouter } from './apps.js';
import { createTenantsRouter } from './tenants.js';
import { createHealthRouter } from './health.js';
import { createWorkflowsRouter } from './workflows.js';
import { createWorkflowInstancesRouter } from './workflow-instances.js';
import { createWorkflowTasksRouter } from './workflow-tasks.js';
import { createAutomationsRouter } from './automations.js';
import { createQueryRouter } from './query.js';
import { createMessagesRouter } from './messages.js';
import { createRolesRouter } from './roles.js';
import { createPermissionsRouter } from './permissions.js';
import { createDictionariesRouter } from './dictionaries.js';
import { createAuditLogsRouter } from './audit-logs.js';

/** 注册单个路由并应用租户守卫 */
function useTenantRouter(app: Koa, router: KoaRouter): void {
  app.use(tenantGuard);
  app.use(router.routes());
  app.use(router.allowedMethods());
}

// Register all routes
export function registerRoutes(app: Koa, auditService?: AuditLogService): void {
  const manager = getDbManager();

  // Auth routes (login — 不需要租户守卫)
  const authRouter = createAuthRouter(manager);
  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());

  // App routes (含运算规则子路由: /api/apps/:appId/computations)
  const appsRouter = createAppsRouter(manager);
  useTenantRouter(app, appsRouter);

  // Tenant routes (data source: tenants/ file system — 平台级管理，不需要租户守卫)
  const tenantsRouter = createTenantsRouter();
  app.use(tenantsRouter.routes());
  app.use(tenantsRouter.allowedMethods());

  // Role routes
  const rolesRouter = createRolesRouter();
  useTenantRouter(app, rolesRouter);

  // Permission routes
  const permissionsRouter = createPermissionsRouter();
  useTenantRouter(app, permissionsRouter);

  // Workflow routes
  const workflowsRouter = createWorkflowsRouter();
  useTenantRouter(app, workflowsRouter);

  const workflowInstancesRouter = createWorkflowInstancesRouter();
  useTenantRouter(app, workflowInstancesRouter);

  const workflowTasksRouter = createWorkflowTasksRouter();
  useTenantRouter(app, workflowTasksRouter);

  // Automation routes
  const automationsRouter = createAutomationsRouter();
  useTenantRouter(app, automationsRouter);

  // Message routes
  const messagesRouter = createMessagesRouter();
  useTenantRouter(app, messagesRouter);

  // Data query routes
  const queryRouter = createQueryRouter(manager);
  useTenantRouter(app, queryRouter);

  // Dictionary routes (支持全局 + 租户字典，需要租户守卫获取 tenantId)
  const dictionariesRouter = createDictionariesRouter();
  useTenantRouter(app, dictionariesRouter);

  // Audit log routes
  if (auditService) {
    const auditLogsRouter = createAuditLogsRouter(auditService);
    useTenantRouter(app, auditLogsRouter);
  }

  // Health check (公开接口)
  const healthRouter = createHealthRouter();
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());
}
