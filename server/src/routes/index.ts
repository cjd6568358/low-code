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
import { createWorkflowsRouter } from './workflows.js';
import { createWorkflowInstancesRouter } from './workflow-instances.js';
import { createWorkflowTasksRouter } from './workflow-tasks.js';
import { createAutomationsRouter } from './automations.js';
import { createComputationsRouter } from './computations.js';
import { createQueryRouter } from './query.js';
import { createUsersRouter } from './users.js';
import { createRolesRouter } from './roles.js';
import { createPermissionsRouter } from './permissions.js';
import { createMessagesRouter } from './messages.js';

// Register all routes
export function registerRoutes(app: Koa): void {
  const manager = getDbManager();

  // Auth routes
  const authRouter = createAuthRouter(manager);
  app.use(authRouter.routes());
  app.use(authRouter.allowedMethods());

  // App routes (data source: tenants/ file system)
  const appsRouter = createAppsRouter(manager);
  app.use(appsRouter.routes());
  app.use(appsRouter.allowedMethods());

  // Tenant routes (data source: tenants/ file system)
  const tenantsRouter = createTenantsRouter();
  app.use(tenantsRouter.routes());
  app.use(tenantsRouter.allowedMethods());

  // Workflow routes
  const workflowsRouter = createWorkflowsRouter();
  app.use(workflowsRouter.routes());
  app.use(workflowsRouter.allowedMethods());

  const workflowInstancesRouter = createWorkflowInstancesRouter();
  app.use(workflowInstancesRouter.routes());
  app.use(workflowInstancesRouter.allowedMethods());

  const workflowTasksRouter = createWorkflowTasksRouter();
  app.use(workflowTasksRouter.routes());
  app.use(workflowTasksRouter.allowedMethods());

  // Automation routes
  const automationsRouter = createAutomationsRouter();
  app.use(automationsRouter.routes());
  app.use(automationsRouter.allowedMethods());

  // Computation routes
  const computationsRouter = createComputationsRouter();
  app.use(computationsRouter.routes());
  app.use(computationsRouter.allowedMethods());

  // User management routes
  const usersRouter = createUsersRouter();
  app.use(usersRouter.routes());
  app.use(usersRouter.allowedMethods());

  // Role management routes
  const rolesRouter = createRolesRouter();
  app.use(rolesRouter.routes());
  app.use(rolesRouter.allowedMethods());

  // Permission management routes
  const permissionsRouter = createPermissionsRouter();
  app.use(permissionsRouter.routes());
  app.use(permissionsRouter.allowedMethods());

  // Message routes
  const messagesRouter = createMessagesRouter();
  app.use(messagesRouter.routes());
  app.use(messagesRouter.allowedMethods());

  // Data query routes
  const queryRouter = createQueryRouter(manager);
  app.use(queryRouter.routes());
  app.use(queryRouter.allowedMethods());

  // Health check
  const healthRouter = createHealthRouter();
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());
}
