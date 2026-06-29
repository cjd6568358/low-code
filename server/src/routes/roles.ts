/**
 * 角色管理路由
 *
 * 提供租户角色的 CRUD 操作。
 * 数据存储在 tenant SQLite 数据库的 roles/user_roles 表。
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

/**
 * 创建角色管理路由
 */
export function createRolesRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/roles' });

  // GET /api/roles - 查询角色列表
  router.get('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);

    try {
      const rows = db.prepare(`
        SELECT r.role_id, r.name, r.description, r.level, r.is_builtin, r.app_id, r.created_at,
               (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.role_id) AS user_count
        FROM roles r
        ORDER BY
          CASE r.level
            WHEN 'tenant' THEN 1
            WHEN 'app' THEN 2
            WHEN 'business' THEN 3
            ELSE 4
          END,
          r.created_at ASC
      `).all() as Array<{
        role_id: string;
        name: string;
        description: string | null;
        level: string;
        is_builtin: number;
        app_id: string | null;
        created_at: string;
        user_count: number;
      }>;

      const roles = rows.map((r) => ({
        id: r.role_id,
        name: r.name,
        description: r.description || '',
        level: r.level,
        isBuiltin: r.is_builtin === 1,
        appId: r.app_id,
        userCount: r.user_count,
        createdAt: r.created_at,
      }));

      ctx.body = { success: true, roles, total: roles.length };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询角色失败' };
    }
  });

  // POST /api/roles - 创建角色
  router.post('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const body = ctx.request.body as {
      name?: string;
      description?: string;
      level?: string;
    };

    if (!body.name) {
      ctx.status = 400;
      ctx.body = { success: false, error: '角色名称必填' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const roleId = 'role-' + generateUuid();

    try {
      db.prepare(`
        INSERT INTO roles (role_id, name, description, level, is_builtin)
        VALUES (?, ?, ?, ?, 0)
      `).run(roleId, body.name, body.description || '', body.level || 'business');

      ctx.body = { success: true, role: { id: roleId, name: body.name } };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '创建角色失败' };
    }
  });

  // PUT /api/roles/:id - 更新角色
  router.put('/:id', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const roleId = ctx.params.id;
    const body = ctx.request.body as {
      name?: string;
      description?: string;
    };

    try {
      // 检查是否内置角色
      const existing = db.prepare('SELECT is_builtin FROM roles WHERE role_id = ?').get(roleId) as { is_builtin: number } | undefined;
      if (!existing) {
        ctx.status = 404;
        ctx.body = { success: false, error: '角色不存在' };
        return;
      }

      if (existing.is_builtin === 1) {
        ctx.status = 403;
        ctx.body = { success: false, error: '内置角色不可修改' };
        return;
      }

      const updates: string[] = [];
      const params: string[] = [];

      if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
      if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description); }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(roleId);
        db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE role_id = ?`).run(...params);
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '更新角色失败' };
    }
  });

  // DELETE /api/roles/:id - 删除角色
  router.delete('/:id', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const roleId = ctx.params.id;

    try {
      const existing = db.prepare('SELECT is_builtin FROM roles WHERE role_id = ?').get(roleId) as { is_builtin: number } | undefined;
      if (!existing) {
        ctx.status = 404;
        ctx.body = { success: false, error: '角色不存在' };
        return;
      }

      if (existing.is_builtin === 1) {
        ctx.status = 403;
        ctx.body = { success: false, error: '内置角色不可删除' };
        return;
      }

      // 删除关联数据
      db.prepare('DELETE FROM user_roles WHERE role_id = ?').run(roleId);
      db.prepare('DELETE FROM permissions WHERE role_id = ?').run(roleId);
      db.prepare('DELETE FROM roles WHERE role_id = ?').run(roleId);

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '删除角色失败' };
    }
  });

  return router;
}
