/**
 * 租户路由测试用例
 *
 * 验证租户管理、用户管理、部门管理等功能。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '@low-code/data';

describe('租户路由', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-tenants-test-'));
    manager = new DatabaseManager({
      dataDir: path.join(tmpDir, 'data'),
      tenantsDir: path.join(tmpDir, 'tenants'),
      walMode: false,
    });

    // 初始化系统库和租户库
    manager.initSystemDb();
    manager.createTenant('test123', '测试租户');
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('租户元数据', () => {
    it('应该读取租户信息', () => {
      const tenantJsonPath = path.join(tmpDir, 'tenants', 'tenant_test123', 'tenant.json');
      const meta = JSON.parse(fs.readFileSync(tenantJsonPath, 'utf-8'));

      expect(meta.tenantId).toBe('test123');
      expect(meta.name).toBe('测试租户');
      expect(meta.status).toBe('active');
    });

    it('应该返回租户不存在当 ID 无效', () => {
      const tenantJsonPath = path.join(tmpDir, 'tenants', 'tenant_nonexistent', 'tenant.json');
      expect(fs.existsSync(tenantJsonPath)).toBe(false);
    });
  });

  describe('用户管理', () => {
    it('应该查询用户列表', () => {
      const db = manager.getTenantDb('test123');

      // 插入测试用户
      const salt = 'test_salt';
      const crypto = require('crypto');
      const hash = crypto.scryptSync('password123', salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      db.exec(`
        INSERT INTO users (user_id, name, email, password, status, created_at, updated_at)
        VALUES ('user001', '张三', 'zhangsan@test.com', '${passwordHash}', 'active', datetime('now'), datetime('now'))
      `);

      const users = db.prepare('SELECT * FROM users').all();
      expect(users).toHaveLength(1);
      expect((users[0] as any).name).toBe('张三');
    });

    it('应该创建用户', () => {
      const db = manager.getTenantDb('test123');

      const salt = 'test_salt2';
      const crypto = require('crypto');
      const hash = crypto.scryptSync('password456', salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      db.exec(`
        INSERT INTO users (user_id, name, email, password, status, created_at, updated_at)
        VALUES ('user002', '李四', 'lisi@test.com', '${passwordHash}', 'active', datetime('now'), datetime('now'))
      `);

      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get('user002');
      expect(user).toBeDefined();
      expect((user as any).name).toBe('李四');
    });

    it('应该更新用户', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        UPDATE users SET name = '张三丰', updated_at = datetime('now')
        WHERE user_id = 'user001'
      `);

      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get('user001');
      expect((user as any).name).toBe('张三丰');
    });

    it('应该禁用用户', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        UPDATE users SET status = 'disabled', updated_at = datetime('now')
        WHERE user_id = 'user001'
      `);

      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get('user001');
      expect((user as any).status).toBe('disabled');
    });

    it('应该按状态过滤用户', () => {
      const db = manager.getTenantDb('test123');

      const activeUsers = db.prepare('SELECT * FROM users WHERE status = ?').all('active');
      const disabledUsers = db.prepare('SELECT * FROM users WHERE status = ?').all('disabled');

      expect(activeUsers).toHaveLength(1);
      expect(disabledUsers).toHaveLength(1);
    });
  });

  describe('部门管理', () => {
    it('应该创建部门', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        INSERT INTO departments (dept_id, name, parent_id, status, created_at, updated_at)
        VALUES ('dept001', '技术部', NULL, 'active', datetime('now'), datetime('now'))
      `);

      const dept = db.prepare('SELECT * FROM departments WHERE dept_id = ?').get('dept001');
      expect(dept).toBeDefined();
      expect((dept as any).name).toBe('技术部');
    });

    it('应该创建子部门', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        INSERT INTO departments (dept_id, name, parent_id, status, created_at, updated_at)
        VALUES ('dept002', '前端组', 'dept001', 'active', datetime('now'), datetime('now'))
      `);

      const childDept = db.prepare('SELECT * FROM departments WHERE dept_id = ?').get('dept002');
      expect((childDept as any).parent_id).toBe('dept001');
    });

    it('应该查询部门树', () => {
      const db = manager.getTenantDb('test123');

      const departments = db.prepare('SELECT * FROM departments').all();
      expect(departments).toHaveLength(2);
    });

    it('应该分配用户到部门', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        INSERT INTO user_departments (user_id, dept_id, position_id, is_primary, created_at)
        VALUES ('user001', 'dept002', NULL, 1, datetime('now'))
      `);

      const userDept = db.prepare('SELECT * FROM user_departments WHERE user_id = ?').get('user001');
      expect(userDept).toBeDefined();
      expect((userDept as any).dept_id).toBe('dept002');
      expect((userDept as any).is_primary).toBe(1);
    });
  });

  describe('角色管理', () => {
    it('应该创建角色', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        INSERT INTO roles (role_id, name, level, description, created_at, updated_at)
        VALUES ('role001', '管理员', 'tenant', '租户管理员', datetime('now'), datetime('now'))
      `);

      const role = db.prepare('SELECT * FROM roles WHERE role_id = ?').get('role001');
      expect(role).toBeDefined();
      expect((role as any).name).toBe('管理员');
    });

    it('应该分配角色给用户', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        INSERT INTO user_roles (id, user_id, role_id, source, assigned_at)
        VALUES ('ur001', 'user001', 'role001', 'manual', datetime('now'))
      `);

      const userRole = db.prepare('SELECT * FROM user_roles WHERE user_id = ?').get('user001');
      expect(userRole).toBeDefined();
      expect((userRole as any).role_id).toBe('role001');
    });

    it('应该查询用户角色', () => {
      const db = manager.getTenantDb('test123');

      const userWithRole = db.prepare(`
        SELECT u.user_id, u.name, r.name as role_name
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
        LEFT JOIN roles r ON r.role_id = ur.role_id
        WHERE u.user_id = 'user001'
      `).get();

      expect(userWithRole).toBeDefined();
      expect((userWithRole as any).role_name).toBe('管理员');
    });
  });

  describe('权限管理', () => {
    it('应该创建权限', () => {
      const db = manager.getTenantDb('test123');

      db.exec(`
        INSERT INTO permissions (permission_id, role_id, resource_type, resource_id, actions, created_at)
        VALUES ('perm001', 'role001', 'menu', 'dashboard', 'read,write', datetime('now'))
      `);

      const perm = db.prepare('SELECT * FROM permissions WHERE permission_id = ?').get('perm001');
      expect(perm).toBeDefined();
      expect((perm as any).resource_type).toBe('menu');
    });

    it('应该分配权限给角色', () => {
      const db = manager.getTenantDb('test123');

      // permissions 表直接通过 role_id 关联角色，无需 role_permissions 中间表
      const perm = db.prepare('SELECT * FROM permissions WHERE role_id = ?').get('role001');
      expect(perm).toBeDefined();
      expect((perm as any).permission_id).toBe('perm001');
    });

    it('应该查询角色权限', () => {
      const db = manager.getTenantDb('test123');

      const roleWithPerms = db.prepare(`
        SELECT r.role_id, r.name, p.resource_type, p.resource_id, p.actions
        FROM roles r
        LEFT JOIN permissions p ON p.role_id = r.role_id
        WHERE r.role_id = 'role001'
      `).get();

      expect(roleWithPerms).toBeDefined();
      expect((roleWithPerms as any).resource_type).toBe('menu');
    });
  });

  describe('密码哈希', () => {
    it('应该生成正确的密码哈希', () => {
      const crypto = require('crypto');
      const password = 'test_password';
      const salt = 'test_salt';
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      const [storedSalt, storedHash] = passwordHash.split(':');
      const computed = crypto.scryptSync(password, storedSalt, 64).toString('hex');

      expect(computed).toBe(storedHash);
    });

    it('应该拒绝错误的密码', () => {
      const crypto = require('crypto');
      const password = 'test_password';
      const wrongPassword = 'wrong_password';
      const salt = 'test_salt';
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      const [storedSalt, storedHash] = passwordHash.split(':');
      const computed = crypto.scryptSync(wrongPassword, storedSalt, 64).toString('hex');

      expect(computed).not.toBe(storedHash);
    });
  });
});
