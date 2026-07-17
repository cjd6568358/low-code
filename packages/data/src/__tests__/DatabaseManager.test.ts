/**
 * DatabaseManager 测试用例
 *
 * 验证数据库管理器的核心功能：系统库初始化、租户库管理、租户扫描。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '../database.js';

describe('DatabaseManager', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-db-test-'));
    manager = new DatabaseManager({
      dataDir: path.join(tmpDir, 'data'),
      tenantsDir: path.join(tmpDir, 'tenants'),
      walMode: false,
    });
  });

  afterEach(async () => {
    // 关闭所有连接
    try {
      manager.close();
    } catch {}

    // 等待文件释放
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('initSystemDb', () => {
    it('应该创建系统数据库', () => {
      const db = manager.initSystemDb();
      expect(db).toBeDefined();

      // 验证数据库文件存在
      const dbPath = path.join(tmpDir, 'data', '_system.db');
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('应该返回同一实例（单例）', () => {
      const db1 = manager.initSystemDb();
      const db2 = manager.initSystemDb();
      expect(db1).toBe(db2);
    });

    it('应该启用 WAL 模式', () => {
      const walManager = new DatabaseManager({
        dataDir: path.join(tmpDir, 'data'),
        tenantsDir: path.join(tmpDir, 'tenants'),
        walMode: true,
      });

      const db = walManager.initSystemDb();
      expect(db).toBeDefined();

      walManager.closeAll();
    });

    it('应该运行系统迁移', () => {
      const db = manager.initSystemDb();

      // 验证系统表已创建
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();

      const tableNames = tables.map((t: any) => t.name);
      expect(tableNames).toContain('platform_admins');
      expect(tableNames).toContain('global_dictionaries');
    });
  });

  describe('getSystemDb', () => {
    it('应该在初始化后返回系统库', () => {
      manager.initSystemDb();
      const db = manager.getSystemDb();
      expect(db).toBeDefined();
    });

    it('应该在未初始化时抛异常', () => {
      expect(() => manager.getSystemDb()).toThrow('not initialized');
    });
  });

  describe('createTenant', () => {
    it('应该创建租户目录结构', () => {
      manager.initSystemDb();
      const db = manager.createTenant('test123', '测试租户');

      expect(db).toBeDefined();

      // 验证目录结构
      const tenantDir = path.join(tmpDir, 'tenants', 'tenant_test123');
      expect(fs.existsSync(tenantDir)).toBe(true);
      expect(fs.existsSync(path.join(tenantDir, 'data'))).toBe(true);
      expect(fs.existsSync(path.join(tenantDir, 'tenant.json'))).toBe(true);
    });

    it('应该创建租户数据库', () => {
      manager.initSystemDb();
      const db = manager.createTenant('test123', '测试租户');

      // 验证数据库文件存在
      const dbPath = path.join(tmpDir, 'tenants', 'tenant_test123', 'data', 'tenant.db');
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('应该写入 tenant.json 元数据', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户', 'pro');

      const metaPath = path.join(tmpDir, 'tenants', 'tenant_test123', 'tenant.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

      expect(meta.tenantId).toBe('test123');
      expect(meta.name).toBe('测试租户');
      expect(meta.plan).toBe('pro');
      expect(meta.status).toBe('active');
    });

    it('应该运行租户迁移', () => {
      manager.initSystemDb();
      const db = manager.createTenant('test123', '测试租户');

      // 验证租户表已创建
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();

      const tableNames = tables.map((t: any) => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('roles');
      expect(tableNames).toContain('departments');
    });

    it('应该拒绝重复创建', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户');

      expect(() => manager.createTenant('test123', '测试租户')).toThrow('already exists');
    });
  });

  describe('getTenantDb', () => {
    it('应该返回租户数据库', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户');

      const db = manager.getTenantDb('test123');
      expect(db).toBeDefined();
    });

    it('应该返回同一实例（连接池）', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户');

      const db1 = manager.getTenantDb('test123');
      const db2 = manager.getTenantDb('test123');
      expect(db1).toBe(db2);
    });
  });

  describe('scanTenants', () => {
    it('应该返回所有活跃租户', () => {
      manager.initSystemDb();
      manager.createTenant('tenant1', '租户1');
      manager.createTenant('tenant2', '租户2');

      const tenants = manager.scanTenants();
      expect(tenants.length).toBe(2);
      expect(tenants.map(t => t.tenantId)).toContain('tenant1');
      expect(tenants.map(t => t.tenantId)).toContain('tenant2');
    });

    it('应该跳过非活跃租户', () => {
      manager.initSystemDb();
      manager.createTenant('tenant1', '租户1');

      // 修改租户状态为非活跃
      const metaPath = path.join(tmpDir, 'tenants', 'tenant_tenant1', 'tenant.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.status = 'disabled';
      fs.writeFileSync(metaPath, JSON.stringify(meta));

      const tenants = manager.scanTenants();
      expect(tenants.length).toBe(0);
    });

    it('应该跳过无效目录', () => {
      manager.initSystemDb();

      // 创建非租户目录
      fs.mkdirSync(path.join(tmpDir, 'tenants', 'other_dir'), { recursive: true });

      const tenants = manager.scanTenants();
      expect(tenants.length).toBe(0);
    });

    it('应该在目录不存在时返回空数组', () => {
      const emptyManager = new DatabaseManager({
        dataDir: path.join(tmpDir, 'data'),
        tenantsDir: path.join(tmpDir, 'nonexistent'),
      });

      const tenants = emptyManager.scanTenants();
      expect(tenants).toEqual([]);
    });
  });

  describe('getTenantInfo', () => {
    it('应该返回租户信息', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户');

      const info = manager.getTenantInfo('test123');
      expect(info).toBeDefined();
      expect(info!.tenantId).toBe('test123');
      expect(info!.name).toBe('测试租户');
    });

    it('应该返回 null 当租户不存在', () => {
      const info = manager.getTenantInfo('nonexistent');
      expect(info).toBeNull();
    });
  });

  describe('deleteTenant', () => {
    // Windows 下 koffi + SQLite 文件句柄释放延迟，EBUSY 无法同步删除
    it.skipIf(process.platform === 'win32')('应该删除租户目录', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户');

      manager.deleteTenant('test123');

      const tenantDir = path.join(tmpDir, 'tenants', 'tenant_test123');
      expect(fs.existsSync(tenantDir)).toBe(false);
    });

    it.skipIf(process.platform === 'win32')('应该关闭租户数据库连接', () => {
      manager.initSystemDb();
      manager.createTenant('test123', '测试租户');

      // 先获取连接
      manager.getTenantDb('test123');

      // 删除租户
      manager.deleteTenant('test123');

      // 再次获取应该创建新库（但目录已不存在，所以会失败）
      expect(() => manager.getTenantDb('test123')).toThrow();
    });
  });
});
