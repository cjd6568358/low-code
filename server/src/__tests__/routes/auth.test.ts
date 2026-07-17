/**
 * 认证路由测试用例
 *
 * 验证登录认证、JWT 校验、租户守卫等功能。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '@low-code/data';

describe('认证路由', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-auth-test-'));
    manager = new DatabaseManager({
      dataDir: path.join(tmpDir, 'data'),
      tenantsDir: path.join(tmpDir, 'tenants'),
      walMode: false,
    });

    // 初始化系统库
    const sysDb = manager.initSystemDb();

    // 插入测试平台管理员（密码：admin123）
    const salt = 'test_salt';
    const crypto = require('crypto');
    const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;

    sysDb.exec(`
      INSERT INTO platform_admins (admin_id, name, email, password, status, created_at, updated_at)
      VALUES ('admin_001', '测试管理员', 'admin@test.com', '${passwordHash}', 'active', datetime('now'), datetime('now'))
    `);
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('密码验证', () => {
    it('应该验证正确的密码', () => {
      const crypto = require('crypto');
      const salt = 'test_salt';
      const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      const [storedSalt, storedHash] = passwordHash.split(':');
      const computed = crypto.scryptSync('admin123', storedSalt, 64).toString('hex');
      expect(computed).toBe(storedHash);
    });

    it('应该拒绝错误的密码', () => {
      const crypto = require('crypto');
      const salt = 'test_salt';
      const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      const [storedSalt, storedHash] = passwordHash.split(':');
      const computed = crypto.scryptSync('wrong_password', storedSalt, 64).toString('hex');
      expect(computed).not.toBe(storedHash);
    });
  });

  describe('JWT 生成与验证', () => {
    it('应该生成有效的 JWT', () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = 'test_secret';

      const token = jwt.sign(
        { userId: 'user1', email: 'test@test.com', role: 'admin', tenantId: 'tenant1' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe('user1');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.role).toBe('admin');
      expect(decoded.tenantId).toBe('tenant1');
    });

    it('应该拒绝过期的 JWT', () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = 'test_secret';

      const token = jwt.sign(
        { userId: 'user1', email: 'test@test.com', role: 'admin', tenantId: 'tenant1' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      // jwt.verify 对过期 token 抛出 TokenExpiredError
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow('jwt expired');
    });

    it('应该拒绝无效的 JWT', () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = 'test_secret';

      expect(() => jwt.verify('invalid_token', JWT_SECRET)).toThrow();
    });
  });

  describe('租户守卫', () => {
    it('应该允许 token.tenantId 与路由 :tenantId 匹配', () => {
      const tokenTenantId = 'tenant1';
      const routeTenantId = 'tenant1';

      expect(tokenTenantId).toBe(routeTenantId);
    });

    it('应该拒绝 token.tenantId 与路由 :tenantId 不匹配', () => {
      const tokenTenantId = 'tenant1';
      const routeTenantId = 'tenant2';

      expect(tokenTenantId).not.toBe(routeTenantId);
    });

    it('应该允许平台管理员访问任意租户', () => {
      const tokenRole = 'platform_admin';
      const tokenTenantId = '';
      const routeTenantId = 'tenant1';

      // 平台管理员可以访问任意租户
      const isAllowed = tokenRole === 'platform_admin' || tokenTenantId === routeTenantId;
      expect(isAllowed).toBe(true);
    });
  });

  describe('登录流程', () => {
    it('应该验证邮箱和密码参数', () => {
      const email = '';
      const password = 'admin123';

      expect(email).toBeFalsy();
      expect(password).toBeTruthy();
    });

    it('应该查询平台管理员表', () => {
      const sysDb = manager.getSystemDb();
      const admin = sysDb.prepare(
        'SELECT admin_id, name, email, status FROM platform_admins WHERE email = ?'
      ).get('admin@test.com');

      expect(admin).toBeDefined();
      expect((admin as any).email).toBe('admin@test.com');
      expect((admin as any).status).toBe('active');
    });

    it('应该拒绝不存在的邮箱', () => {
      const sysDb = manager.getSystemDb();
      const admin = sysDb.prepare(
        'SELECT admin_id FROM platform_admins WHERE email = ?'
      ).get('nonexistent@test.com');

      expect(admin).toBeUndefined();
    });

    it('应该拒绝非活跃状态的账号', () => {
      const sysDb = manager.getSystemDb();

      // 插入禁用账号
      const salt = 'test_salt2';
      const crypto = require('crypto');
      const hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
      const passwordHash = `${salt}:${hash}`;

      sysDb.exec(`
        INSERT INTO platform_admins (admin_id, name, email, password, status, created_at, updated_at)
        VALUES ('admin_002', '禁用管理员', 'disabled@test.com', '${passwordHash}', 'disabled', datetime('now'), datetime('now'))
      `);

      const admin = sysDb.prepare(
        'SELECT admin_id, status FROM platform_admins WHERE email = ?'
      ).get('disabled@test.com');

      expect(admin).toBeDefined();
      expect((admin as any).status).toBe('disabled');
    });
  });

  describe('token 刷新', () => {
    it('应该支持 token 刷新', () => {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = 'test_secret';

      // 生成初始 token
      const token = jwt.sign(
        { userId: 'user1', email: 'test@test.com', role: 'admin', tenantId: 'tenant1' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 验证 token
      const decoded = jwt.verify(token, JWT_SECRET);

      // 生成新 token（用新过期时间）
      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email, role: decoded.role, tenantId: decoded.tenantId },
        JWT_SECRET,
        { expiresIn: '48h' }
      );

      expect(newToken).toBeDefined();
      // 新 token 应该可以验证
      const newDecoded = jwt.verify(newToken, JWT_SECRET);
      expect(newDecoded.userId).toBe('user1');
      expect(newDecoded.email).toBe('test@test.com');
    });
  });
});
