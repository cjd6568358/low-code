/**
 * 认证路由
 *
 * POST /api/auth/login — 邮箱 + 密码登录，后端自动识别租户和角色。
 */

import crypto from 'crypto';
import KoaRouter from '@koa/router';
import { DatabaseManager } from '@low-code/data';

/** 密码哈希(scrypt) */
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/** Strip prefix from ID (e.g., "tenant_90ef6d72" -> "90ef6d72") */
function stripPrefix(id: string): string {
  const idx = id.indexOf('_');
  return idx >= 0 ? id.substring(idx + 1) : id;
}

/** 验证密码 */
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = hashPassword(password, salt);
  return computed === hash;
}

/** 创建认证路由 */
export function createAuthRouter(manager: DatabaseManager): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/auth' });

  /**
   * POST /api/auth/login
   *
   * 请求体：{ email: string, password: string }
   * 响应：{ success, user?, error? }
   */
  router.post('/login', async (ctx) => {
    const { email, password, tenantId } = ctx.request.body as {
      email?: string;
      password?: string;
      tenantId?: string;
    };

    if (!email || !password) {
      ctx.status = 400;
      ctx.body = { success: false, error: '请输入邮箱和密码' };
      return;
    }

    // 无 tenantId → 平台管理员登录（只查 _system.db）
    // 有 tenantId → 租户用户登录（只查对应租户库）
    if (!tenantId) {
      // 平台管理员登录
      const sysDb = manager.getSystemDb();
      const admin = sysDb
        .prepare(
          `SELECT admin_id, name, email, avatar, password, status
           FROM platform_admins WHERE email = ? LIMIT 1`,
        )
        .get(email) as
        | {
            admin_id: string;
            name: string;
            email: string;
            avatar: string | null;
            password: string;
            status: string;
          }
        | undefined;

      if (!admin) {
        ctx.status = 401;
        ctx.body = { success: false, error: '邮箱或密码错误' };
        return;
      }

      if (admin.status !== 'active') {
        ctx.status = 403;
        ctx.body = { success: false, error: admin.status === 'disabled' ? '账号已被禁用' : '账号未激活' };
        return;
      }

      if (!verifyPassword(password, admin.password)) {
        ctx.status = 401;
        ctx.body = { success: false, error: '邮箱或密码错误' };
        return;
      }

      sysDb
        .prepare(`UPDATE platform_admins SET updated_at = datetime('now') WHERE admin_id = ?`)
        .run(admin.admin_id);

      ctx.body = {
        success: true,
        user: {
          id: stripPrefix(admin.admin_id),
          name: admin.name,
          email: admin.email,
          avatar: admin.avatar,
          role: 'platform_admin',
          roleName: '平台管理员',
          tenantId: '',
          tenantName: '平台管理',
        },
      };
      return;
    }

    // 租户用户登录
    const allTenants = manager.scanTenants();
    const tenant = allTenants.find((t) => t.tenantId === tenantId);

    if (!tenant) {
      ctx.status = 404;
      ctx.body = { success: false, error: '租户不存在' };
      return;
    }

    try {
      const tenantDb = manager.getTenantDb(`tenant_${tenant.tenantId}`);
      const user = tenantDb
        .prepare(
          `SELECT user_id, name, email, avatar, password, status
           FROM users WHERE email = ? LIMIT 1`,
        )
        .get(email) as
        | {
            user_id: string;
            name: string;
            email: string;
            avatar: string | null;
            password: string;
            status: string;
          }
        | undefined;

      if (!user) {
        ctx.status = 401;
        ctx.body = { success: false, error: '邮箱或密码错误' };
        return;
      }

      // 账号状态校验
      if (user.status !== 'active') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          error:
            user.status === 'disabled'
              ? '账号已被禁用'
              : user.status === 'locked'
                ? '账号已被锁定'
                : '账号未激活',
        };
        return;
      }

      // 密码校验
      if (!verifyPassword(password, user.password)) {
        ctx.status = 401;
        ctx.body = { success: false, error: '邮箱或密码错误' };
        return;
      }

      // 查询用户角色
      const roleRow = tenantDb
        .prepare(
          `SELECT r.role_id, r.name AS role_name, r.level
           FROM user_roles ur
           JOIN roles r ON r.role_id = ur.role_id
           WHERE ur.user_id = ?
           ORDER BY
             CASE r.level
               WHEN 'tenant' THEN 1
               WHEN 'app' THEN 2
               WHEN 'business' THEN 3
               ELSE 4
             END
           LIMIT 1`,
        )
        .get(user.user_id) as
        | { role_id: string; role_name: string; level: string }
        | undefined;

      // 查询用户部门和岗位
      const deptRow = tenantDb
        .prepare(
          `SELECT d.name AS dept_name, p.name AS pos_name
           FROM user_departments ud
           LEFT JOIN departments d ON d.dept_id = ud.dept_id
           LEFT JOIN positions p ON p.position_id = ud.position_id
           WHERE ud.user_id = ? AND ud.is_primary = 1
           LIMIT 1`,
        )
        .get(user.user_id) as
        | { dept_name: string | null; pos_name: string | null }
        | undefined;

      // 更新最后登录时间
      tenantDb
        .prepare(
          `UPDATE users SET last_login_at = datetime('now') WHERE user_id = ?`,
        )
        .run(user.user_id);

      // Return user info (strip prefixes from IDs)
      ctx.body = {
        success: true,
        user: {
          id: stripPrefix(user.user_id),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: roleRow?.role_id || 'department_default',
          roleName: roleRow?.role_name || '员工',
          tenantId: tenant.tenantId,
          tenantName: tenant.name,
          departmentName: deptRow?.dept_name || '',
          positionName: deptRow?.pos_name || '',
        },
      };
    } catch {
      ctx.status = 500;
      ctx.body = { success: false, error: '登录服务异常' };
    }
  });

  return router;
}
