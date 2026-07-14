// Tenant routes
// Data source: tenants/{tenantId}/tenant.json
// 租户级资源：用户、部门、岗位、角色、权限

import { readFile } from '../utils/fs-utils.js';
import path from 'path';
import crypto from 'crypto';
import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';
import { generateHexId } from '@low-code/shared';

// Read tenant.json (shortId -> directory: tenant_{shortId})
async function readTenantMeta(shortId: string): Promise<any | null> {
  const dirName = shortId.startsWith('tenant_') ? shortId : `tenant_${shortId}`;
  const filePath = path.join(TENANTS_DIR, dirName, 'tenant.json');
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
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

// Create tenant routes
export function createTenantsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/tenants' });

  // GET /api/tenants/:tenantId
  router.get('/:tenantId', async (ctx) => {
    const { tenantId } = ctx.params;
    const meta = await readTenantMeta(tenantId);

    if (!meta) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Tenant not found' };
      return;
    }

    ctx.body = {
      success: true,
      tenant: {
        tenantId: meta.tenantId,
        name: meta.name,
        icon: meta.icon || '🏢',
        plan: meta.plan,
        status: meta.status,
      },
    };
  });

  // ==================== 用户管理 ====================

  // GET /api/tenants/:tenantId/users - 查询用户列表
  router.get('/:tenantId/users', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);
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

  // GET /api/tenants/:tenantId/users/selectable - 选人组件专用接口
  router.get('/:tenantId/users/selectable', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

    const keyword = ctx.query.keyword as string | undefined;
    const deptId = ctx.query.deptId as string | undefined;
    const positionIds = ctx.query.positionIds as string | undefined;
    const roleIds = ctx.query.roleIds as string | undefined;

    try {
      let sql = `
        SELECT DISTINCT u.user_id, u.name, u.email, u.phone, u.avatar
        FROM users u
        LEFT JOIN user_departments ud ON ud.user_id = u.user_id
        LEFT JOIN departments d ON d.dept_id = ud.dept_id
        LEFT JOIN positions p ON p.position_id = ud.position_id
        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
        WHERE u.status = 'active'
      `;
      const params: string[] = [];

      if (keyword) {
        sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
        const likeKeyword = `%${keyword}%`;
        params.push(likeKeyword, likeKeyword, likeKeyword);
      }

      if (deptId) {
        sql += ' AND (ud.dept_id = ? OR d.parent_id = ?)';
        params.push(deptId, deptId);
      }

      if (positionIds) {
        const ids = positionIds.split(',');
        sql += ` AND ud.position_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }

      if (roleIds) {
        const ids = roleIds.split(',');
        sql += ` AND ur.role_id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }

      sql += ' ORDER BY u.name';

      const rows = db.prepare(sql).all(...params) as Array<{
        user_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatar: string | null;
      }>;

      // 获取每个用户的部门岗位信息
      const users = rows.map((r) => {
        const depts = db.prepare(`
          SELECT d.dept_id, d.name AS dept_name, p.position_id, p.name AS position_name, ud.is_primary
          FROM user_departments ud
          JOIN departments d ON d.dept_id = ud.dept_id
          LEFT JOIN positions p ON p.position_id = ud.position_id
          WHERE ud.user_id = ?
          ORDER BY ud.is_primary DESC
        `).all(r.user_id) as Array<{
          dept_id: string;
          dept_name: string;
          position_id: string | null;
          position_name: string | null;
          is_primary: number;
        }>;

        return {
          userId: r.user_id,
          name: r.name,
          email: r.email || '',
          phone: r.phone || '',
          avatar: r.avatar || '',
          departments: depts.map((d) => ({
            deptId: d.dept_id,
            deptName: d.dept_name,
            positionId: d.position_id || undefined,
            positionName: d.position_name || undefined,
            isPrimary: d.is_primary === 1,
          })),
        };
      });

      ctx.body = { success: true, data: users };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询用户失败' };
    }
  });

  // GET /api/tenants/:tenantId/users/batch - 批量获取用户信息
  router.get('/:tenantId/users/batch', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const ids = ctx.query.ids as string | undefined;
    if (!ids) {
      ctx.status = 400;
      ctx.body = { success: false, error: '缺少 ids 参数' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

    try {
      const userIds = ids.split(',');
      const placeholders = userIds.map(() => '?').join(',');

      const rows = db.prepare(`
        SELECT user_id, name, email, phone, avatar
        FROM users
        WHERE user_id IN (${placeholders})
      `).all(...userIds) as Array<{
        user_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        avatar: string | null;
      }>;

      const users = rows.map((r) => {
        const depts = db.prepare(`
          SELECT d.dept_id, d.name AS dept_name, p.position_id, p.name AS position_name, ud.is_primary
          FROM user_departments ud
          JOIN departments d ON d.dept_id = ud.dept_id
          LEFT JOIN positions p ON p.position_id = ud.position_id
          WHERE ud.user_id = ?
          ORDER BY ud.is_primary DESC
        `).all(r.user_id) as Array<{
          dept_id: string;
          dept_name: string;
          position_id: string | null;
          position_name: string | null;
          is_primary: number;
        }>;

        return {
          userId: r.user_id,
          name: r.name,
          email: r.email || '',
          phone: r.phone || '',
          avatar: r.avatar || '',
          departments: depts.map((d) => ({
            deptId: d.dept_id,
            deptName: d.dept_name,
            positionId: d.position_id || undefined,
            positionName: d.position_name || undefined,
            isPrimary: d.is_primary === 1,
          })),
        };
      });

      ctx.body = { success: true, data: users };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询用户失败' };
    }
  });

  // POST /api/tenants/:tenantId/users - 创建用户
  router.post('/:tenantId/users', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

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
    const db = manager.getTenantDb(dirName);
    const userId = 'user-' + generateHexId();

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
        INSERT INTO users (user_id, name, email, phone, password, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      `).run(userId, body.name, body.email, body.phone || null, password);

      // 关联部门
      if (body.department) {
        const dept = db.prepare('SELECT dept_id FROM departments WHERE name = ?').get(body.department) as { dept_id: string } | undefined;
        if (dept) {
          const udId = 'ud-' + generateHexId();
          db.prepare(`
            INSERT INTO user_departments (id, user_id, dept_id, is_primary)
            VALUES (?, ?, ?, 1)
          `).run(udId, userId, dept.dept_id);
        }
      }

      // 关联角色
      if (body.role) {
        const urId = 'ur-' + generateHexId();
        db.prepare(`
          INSERT INTO user_roles (id, user_id, role_id, source)
          VALUES (?, ?, ?, 'manual')
        `).run(urId, userId, body.role);
      }

      ctx.body = { success: true, userId };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '创建用户失败' };
    }
  });

  // PUT /api/tenants/:tenantId/users/:userId - 更新用户
  router.put('/:tenantId/users/:userId', async (ctx) => {
    const { tenantId, userId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const body = ctx.request.body as {
      name?: string;
      email?: string;
      phone?: string;
      department?: string;
      role?: string;
    };

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

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
          const udId = 'ud-' + generateHexId();
          db.prepare(`
            INSERT INTO user_departments (id, user_id, dept_id, is_primary)
            VALUES (?, ?, ?, 1)
          `).run(udId, userId, dept.dept_id);
        }
      }

      // 更新角色关联
      if (body.role !== undefined) {
        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
        const urId = 'ur-' + generateHexId();
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

  // PUT /api/tenants/:tenantId/users/:userId/status - 启用/禁用用户
  router.put('/:tenantId/users/:userId/status', async (ctx) => {
    const { tenantId, userId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const body = ctx.request.body as { status?: string };
    if (!body.status || !['active', 'disabled'].includes(body.status)) {
      ctx.status = 400;
      ctx.body = { success: false, error: '状态值无效' };
      return;
    }

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

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

  // DELETE /api/tenants/:tenantId/users/:userId - 删除用户
  router.delete('/:tenantId/users/:userId', async (ctx) => {
    const { tenantId, userId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

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

  // ==================== 部门管理 ====================

  // GET /api/tenants/:tenantId/departments - 获取部门树
  router.get('/:tenantId/departments', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

    try {
      const rows = db.prepare(`
        SELECT d.dept_id, d.name, d.parent_id,
               (SELECT COUNT(*) FROM user_departments ud WHERE ud.dept_id = d.dept_id) AS user_count
        FROM departments d
        WHERE d.status = 'active'
        ORDER BY d.sort, d.name
      `).all() as Array<{
        dept_id: string;
        name: string;
        parent_id: string | null;
        user_count: number;
      }>;

      // 构建树形结构
      const deptMap = new Map<string, any>();
      const rootDepts: any[] = [];

      rows.forEach((r) => {
        deptMap.set(r.dept_id, {
          deptId: r.dept_id,
          name: r.name,
          parentId: r.parent_id,
          userCount: r.user_count,
          children: [],
        });
      });

      deptMap.forEach((dept) => {
        if (dept.parentId && deptMap.has(dept.parentId)) {
          deptMap.get(dept.parentId).children.push(dept);
        } else {
          rootDepts.push(dept);
        }
      });

      ctx.body = { success: true, data: rootDepts };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询部门失败' };
    }
  });

  // ==================== 岗位管理 ====================

  // GET /api/tenants/:tenantId/positions - 获取岗位列表
  router.get('/:tenantId/positions', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

    try {
      const rows = db.prepare(`
        SELECT position_id, name, code, category, level, description
        FROM positions
        WHERE status = 'active'
        ORDER BY category, level, name
      `).all() as Array<{
        position_id: string;
        name: string;
        code: string | null;
        category: string;
        level: number;
        description: string | null;
      }>;

      const positions = rows.map((r) => ({
        positionId: r.position_id,
        name: r.name,
        code: r.code || '',
        category: r.category,
        level: r.level,
        description: r.description || '',
      }));

      ctx.body = { success: true, data: positions };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询岗位失败' };
    }
  });

  // ==================== 角色管理 ====================

  // GET /api/tenants/:tenantId/roles - 获取角色列表
  router.get('/:tenantId/roles', async (ctx) => {
    const { tenantId } = ctx.params;
    const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;

    const manager = getDbManager();
    const db = manager.getTenantDb(dirName);

    try {
      const rows = db.prepare(`
        SELECT role_id, name, description, level, is_builtin
        FROM roles
        ORDER BY level, name
      `).all() as Array<{
        role_id: string;
        name: string;
        description: string | null;
        level: string;
        is_builtin: number;
      }>;

      const roles = rows.map((r) => ({
        roleId: r.role_id,
        name: r.name,
        description: r.description || '',
        level: r.level,
        isBuiltin: r.is_builtin === 1,
      }));

      ctx.body = { success: true, data: roles };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { success: false, error: '查询角色失败' };
    }
  });

  return router;
}
