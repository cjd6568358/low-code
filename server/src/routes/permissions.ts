/**
 * 权限管理路由
 *
 * 提供权限条目的 CRUD 及权限矩阵查询。
 * 数据存储在 tenant SQLite 数据库的 permissions 表。
 */

import crypto from 'crypto';
import KoaRouter from '@koa/router';
import { getDbManager } from '../config/db.js';
import { TENANTS_DIR } from '../config/index.js';
import fs from 'fs';

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

/** 默认权限矩阵 — 定义系统资源与默认权限 */
const DEFAULT_RESOURCES = [
  { resource: '工作台', type: 'menu', resourceId: 'workspace' },
  { resource: '应用中心', type: 'menu', resourceId: 'app_center' },
  { resource: '流程中心', type: 'menu', resourceId: 'workflow_center' },
  { resource: '配置中心', type: 'menu', resourceId: 'config_center' },
  { resource: '新建应用', type: 'button', resourceId: 'app_create' },
  { resource: '编辑应用', type: 'button', resourceId: 'app_edit' },
  { resource: '删除应用', type: 'button', resourceId: 'app_delete' },
  { resource: '审批流程', type: 'button', resourceId: 'workflow_approve' },
  { resource: '发起流程', type: 'button', resourceId: 'workflow_start' },
  { resource: '查看流程', type: 'button', resourceId: 'workflow_view' },
  { resource: '用户管理', type: 'data', resourceId: 'user_manage' },
  { resource: '角色管理', type: 'data', resourceId: 'role_manage' },
];

/**
 * 创建权限管理路由
 */
export function createPermissionsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/permissions' });

  // GET /api/permissions - 查询权限列表
  router.get('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const roleId = ctx.query.roleId as string | undefined;

    try {
      let sql = `
        SELECT p.permission_id, p.role_id, p.resource_type, p.resource_id, p.actions, p.scope, p.conditions,
               r.name AS role_name
        FROM permissions p
        LEFT JOIN roles r ON r.role_id = p.role_id
      `;
      const params: string[] = [];

      if (roleId) {
        sql += ' WHERE p.role_id = ?';
        params.push(roleId);
      }

      sql += ' ORDER BY p.resource_type, p.resource_id';

      const rows = db.prepare(sql).all(...params) as Array<{
        permission_id: string;
        role_id: string;
        resource_type: string;
        resource_id: string;
        actions: string;
        scope: string | null;
        conditions: string | null;
        role_name: string | null;
      }>;

      const permissions = rows.map((r) => ({
        id: r.permission_id,
        roleId: r.role_id,
        roleName: r.role_name || '',
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        actions: r.actions,
        scope: r.scope,
        conditions: r.conditions,
      }));

      ctx.body = { success: true, permissions, total: permissions.length };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询权限失败' };
    }
  });

  // GET /api/permissions/matrix - 权限矩阵数据
  router.get('/matrix', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);

    try {
      // 获取所有角色
      const roles = db.prepare(`
        SELECT role_id, name, level, is_builtin
        FROM roles
        ORDER BY
          CASE level
            WHEN 'tenant' THEN 1
            WHEN 'app' THEN 2
            WHEN 'business' THEN 3
            ELSE 4
          END
      `).all() as Array<{
        role_id: string;
        name: string;
        level: string;
        is_builtin: number;
      }>;

      // 获取所有权限条目
      const allPerms = db.prepare(`
        SELECT role_id, resource_type, resource_id, actions
        FROM permissions
      `).all() as Array<{
        role_id: string;
        resource_type: string;
        resource_id: string;
        actions: string;
      }>;

      // 构建权限矩阵：每个资源 × 每个角色 → 是否允许
      const matrix = DEFAULT_RESOURCES.map((res) => {
        const rolePerms: Record<string, boolean> = {};
        for (const role of roles) {
          const perm = allPerms.find(
            (p) => p.role_id === role.role_id && p.resource_id === res.resourceId,
          );
          // 内置租户管理员默认拥有所有权限
          if (role.level === 'tenant' && role.is_builtin === 1) {
            rolePerms[role.role_id] = true;
          } else {
            rolePerms[role.role_id] = perm ? perm.actions.includes('read') || perm.actions.includes('execute') : false;
          }
        }
        return {
          resource: res.resource,
          type: res.type,
          resourceId: res.resourceId,
          ...rolePerms,
        };
      });

      ctx.body = {
        success: true,
        matrix,
        roles: roles.map((r) => ({
          id: r.role_id,
          name: r.name,
          level: r.level,
          isBuiltin: r.is_builtin === 1,
        })),
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询权限矩阵失败' };
    }
  });

  // POST /api/permissions - 创建权限条目
  router.post('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const body = ctx.request.body as {
      roleId?: string;
      resourceType?: string;
      resourceId?: string;
      actions?: string;
    };

    if (!body.roleId || !body.resourceType || !body.resourceId || !body.actions) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少必填字段' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const permId = 'perm-' + generateUuid();

    try {
      db.prepare(`
        INSERT INTO permissions (permission_id, role_id, resource_type, resource_id, actions)
        VALUES (?, ?, ?, ?, ?)
      `).run(permId, body.roleId, body.resourceType, body.resourceId, body.actions);

      ctx.body = { success: true, permission: { id: permId } };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '创建权限失败' };
    }
  });

  // PUT /api/permissions/:id - 更新权限条目
  router.put('/:id', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const permId = ctx.params.id;
    const body = ctx.request.body as { actions?: string };

    try {
      const updates: string[] = [];
      const params: string[] = [];

      if (body.actions !== undefined) { updates.push('actions = ?'); params.push(body.actions); }

      if (updates.length === 0) {
        ctx.status = 400;
        ctx.body = { success: false, error: '没有要更新的字段' };
        return;
      }

      params.push(permId);
      const result = db.prepare(`UPDATE permissions SET ${updates.join(', ')} WHERE permission_id = ?`).run(...params);

      if (result.changes === 0) {
        ctx.status = 404;
        ctx.body = { success: false, error: '权限不存在' };
        return;
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '更新权限失败' };
    }
  });

  // PUT /api/permissions/batch - 批量更新角色权限（矩阵编辑）
  router.put('/batch', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const body = ctx.request.body as {
      roleId?: string;
      permissions?: Array<{
        resourceId: string;
        resourceType: string;
        allowed: boolean;
      }>;
    };

    if (!body.roleId || !body.permissions) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少必填字段' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);

    try {
      // 检查角色是否存在
      const role = db.prepare('SELECT is_builtin FROM roles WHERE role_id = ?').get(body.roleId) as { is_builtin: number } | undefined;
      if (!role) {
        ctx.status = 404;
        ctx.body = { success: false, error: '角色不存在' };
        return;
      }

      if (role.is_builtin === 1) {
        ctx.status = 403;
        ctx.body = { success: false, error: '内置角色权限不可修改' };
        return;
      }

      // 删除该角色的旧权限
      db.prepare('DELETE FROM permissions WHERE role_id = ?').run(body.roleId);

      // 插入新权限
      const insertStmt = db.prepare(`
        INSERT INTO permissions (permission_id, role_id, resource_type, resource_id, actions)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const perm of body.permissions) {
        if (perm.allowed) {
          const permId = 'perm-' + generateUuid();
          insertStmt.run(permId, body.roleId, perm.resourceType, perm.resourceId, 'read,execute');
        }
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '批量更新权限失败' };
    }
  });

  // DELETE /api/permissions/:id - 删除权限条目
  router.delete('/:id', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const permId = ctx.params.id;

    try {
      const result = db.prepare('DELETE FROM permissions WHERE permission_id = ?').run(permId);

      if (result.changes === 0) {
        ctx.status = 404;
        ctx.body = { success: false, error: '权限不存在' };
        return;
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '删除权限失败' };
    }
  });

  return router;
}
