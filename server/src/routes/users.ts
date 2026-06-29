/**
 * 用户管理路由
 *
 * 提供租户用户的 CRUD 操作。
 * 数据存储在 tenant SQLite 数据库的 users/user_departments/departments/positions 表。
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

/** 密码哈希(scrypt) */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 创建用户管理路由
 */
export function createUsersRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/users' });

  // GET /api/users - 查询用户列表
  router.get('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const status = ctx.query.status as string | undefined;

    try {
      let sql = `
        SELECT u.user_id, u.name, u.email, u.phone, u.status, u.last_login_at, u.created_at,
               d.name AS department, p.name AS position,
               (SELECT r.name FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
                WHERE ur.user_id = u.user_id LIMIT 1) AS role_name,
               (SELECT r.role_id FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
                WHERE ur.user_id = u.user_id LIMIT 1) AS role_id
        FROM users u
        LEFT JOIN user_departments ud ON ud.user_id = u.user_id AND ud.is_primary = 1
        LEFT JOIN departments d ON d.dept_id = ud.dept_id
        LEFT JOIN positions p ON p.position_id = ud.position_id
      `;
      const params: string[] = [];

      if (status) {
        sql += ' WHERE u.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY u.created_at DESC';

      const rows = db.prepare(sql).all(...params) as Array<{
        user_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        status: string;
        last_login_at: string | null;
        created_at: string;
        department: string | null;
        position: string | null;
        role_name: string | null;
        role_id: string | null;
      }>;

      const users = rows.map((r) => ({
        id: r.user_id,
        name: r.name,
        email: r.email || '',
        phone: r.phone || '',
        department: r.department || '',
        position: r.position || '',
        role: r.role_id || '',
        roleName: r.role_name || '',
        status: r.status,
        lastLoginAt: r.last_login_at || '',
        createdAt: r.created_at,
      }));

      ctx.body = { success: true, users, total: users.length };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询用户失败' };
    }
  });

  // POST /api/users - 创建用户
  router.post('/', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const body = ctx.request.body as {
      name?: string;
      email?: string;
      phone?: string;
      department?: string;
      role?: string;
      password?: string;
    };

    if (!body.name || !body.email) {
      ctx.status = 400;
      ctx.body = { success: false, error: '姓名和邮箱必填' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const userId = 'user-' + generateUuid();

    try {
      // 检查邮箱唯一性
      const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(body.email) as { user_id: string } | undefined;
      if (existing) {
        ctx.status = 409;
        ctx.body = { success: false, error: '邮箱已存在' };
        return;
      }

      const password = body.password ? hashPassword(body.password) : hashPassword('123456');

      db.prepare(`
        INSERT INTO users (user_id, name, email, phone, password, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(userId, body.name, body.email, body.phone || null, password);

      // 如果指定了部门，创建关联
      if (body.department) {
        const dept = db.prepare('SELECT dept_id FROM departments WHERE name = ?').get(body.department) as { dept_id: string } | undefined;
        if (dept) {
          const udId = 'ud-' + generateUuid();
          db.prepare(`
            INSERT INTO user_departments (id, user_id, dept_id, is_primary)
            VALUES (?, ?, ?, 1)
          `).run(udId, userId, dept.dept_id);
        }
      }

      // 如果指定了角色，创建关联
      if (body.role) {
        const urId = 'ur-' + generateUuid();
        db.prepare(`
          INSERT INTO user_roles (id, user_id, role_id, source)
          VALUES (?, ?, ?, 'manual')
        `).run(urId, userId, body.role);
      }

      ctx.body = { success: true, user: { id: userId, name: body.name, email: body.email } };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '创建用户失败' };
    }
  });

  // PUT /api/users/:id - 更新用户
  router.put('/:id', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const userId = ctx.params.id;
    const body = ctx.request.body as {
      name?: string;
      email?: string;
      phone?: string;
      department?: string;
      role?: string;
    };

    try {
      const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId) as { user_id: string } | undefined;
      if (!existing) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      const updates: string[] = [];
      const params: (string | null)[] = [];

      if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
      if (body.email !== undefined) { updates.push('email = ?'); params.push(body.email); }
      if (body.phone !== undefined) { updates.push('phone = ?'); params.push(body.phone); }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(userId);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
      }

      // 更新部门关联
      if (body.department !== undefined) {
        db.prepare('DELETE FROM user_departments WHERE user_id = ? AND is_primary = 1').run(userId);
        const dept = db.prepare('SELECT dept_id FROM departments WHERE name = ?').get(body.department) as { dept_id: string } | undefined;
        if (dept) {
          const udId = 'ud-' + generateUuid();
          db.prepare(`
            INSERT INTO user_departments (id, user_id, dept_id, is_primary)
            VALUES (?, ?, ?, 1)
          `).run(udId, userId, dept.dept_id);
        }
      }

      // 更新角色关联
      if (body.role !== undefined) {
        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
        const urId = 'ur-' + generateUuid();
        db.prepare(`
          INSERT INTO user_roles (id, user_id, role_id, source)
          VALUES (?, ?, ?, 'manual')
        `).run(urId, userId, body.role);
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '更新用户失败' };
    }
  });

  // PUT /api/users/:id/status - 启用/禁用用户
  router.put('/:id/status', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const userId = ctx.params.id;
    const body = ctx.request.body as { status?: string };

    if (!body.status || !['active', 'disabled'].includes(body.status)) {
      ctx.status = 400;
      ctx.body = { success: false, error: '状态值无效' };
      return;
    }

    try {
      const result = db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(body.status, userId);

      if (result.changes === 0) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '更新状态失败' };
    }
  });

  // DELETE /api/users/:id - 删除用户
  router.delete('/:id', async (ctx) => {
    const tenantId = getFirstTenantId();
    if (!tenantId) {
      ctx.status = 404;
      ctx.body = { success: false, error: '没有找到租户' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(tenantId);
    const userId = ctx.params.id;

    try {
      // 删除关联数据
      db.prepare('DELETE FROM user_departments WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
      const result = db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);

      if (result.changes === 0) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      ctx.body = { success: true };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '删除用户失败' };
    }
  });

  return router;
}
