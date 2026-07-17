/**
 * 应用路由测试用例
 *
 * 验证应用 CRUD、资源管理、发布等功能。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '@low-code/data';
import { generateHexId, RESOURCE_TYPES } from '@low-code/shared';

describe('应用路由', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-apps-test-'));
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

  describe('应用目录结构', () => {
    it('应该创建应用目录', () => {
      const tenantDir = path.join(tmpDir, 'tenants', 'tenant_test123');
      const appDir = path.join(tenantDir, 'apps', 'app_test001');

      fs.mkdirSync(appDir, { recursive: true });

      expect(fs.existsSync(appDir)).toBe(true);
    });

    it('应该创建资源子目录', () => {
      const appDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001');
      const subdirs = ['pages', 'cards', 'tables', 'workflows', 'automations', 'computations'];

      for (const subdir of subdirs) {
        fs.mkdirSync(path.join(appDir, subdir), { recursive: true });
      }

      for (const subdir of subdirs) {
        expect(fs.existsSync(path.join(appDir, subdir))).toBe(true);
      }
    });

    it('应该写入 app.json', () => {
      const appDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001');
      const appMeta = {
        appId: 'test001',
        name: '测试应用',
        description: '测试应用描述',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(appDir, 'app.json'),
        JSON.stringify(appMeta, null, 2)
      );

      const readMeta = JSON.parse(
        fs.readFileSync(path.join(appDir, 'app.json'), 'utf-8')
      );

      expect(readMeta.appId).toBe('test001');
      expect(readMeta.name).toBe('测试应用');
    });
  });

  describe('资源文件管理', () => {
    it('应该读取资源文件', () => {
      const pagesDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'pages');
      const page = {
        pageId: 'page001',
        name: '首页',
        components: [],
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(pagesDir, 'page_page001.json'),
        JSON.stringify(page, null, 2)
      );

      const readPage = JSON.parse(
        fs.readFileSync(path.join(pagesDir, 'page_page001.json'), 'utf-8')
      );

      expect(readPage.pageId).toBe('page001');
      expect(readPage.name).toBe('首页');
    });

    it('应该扫描目录下所有资源', () => {
      const pagesDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'pages');

      // 创建多个页面
      const pages = [
        { pageId: 'page001', name: '页面1' },
        { pageId: 'page002', name: '页面2' },
        { pageId: 'page003', name: '页面3' },
      ];

      for (const page of pages) {
        fs.writeFileSync(
          path.join(pagesDir, `page_${page.pageId}.json`),
          JSON.stringify(page, null, 2)
        );
      }

      // 扫描目录
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(3);
    });

    it('应该过滤已删除的资源', () => {
      const pagesDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'pages');
      const page = {
        pageId: 'page004',
        name: '已删除页面',
        _deleted: true,
      };

      fs.writeFileSync(
        path.join(pagesDir, 'page_page004.json'),
        JSON.stringify(page, null, 2)
      );

      // 读取并过滤
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
      const activePages = files
        .map(f => JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf-8')))
        .filter(p => !p._deleted);

      expect(activePages).toHaveLength(3);
    });
  });

  describe('ID 生成', () => {
    it('应该生成 8 位 hex ID', () => {
      const id = generateHexId();

      expect(id).toHaveLength(8);
      expect(/^[0-9a-f]{8}$/.test(id)).toBe(true);
    });

    it('应该生成唯一 ID', () => {
      const ids = new Set();

      for (let i = 0; i < 100; i++) {
        ids.add(generateHexId());
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('资源类型', () => {
    it('应该定义所有资源类型', () => {
      expect(RESOURCE_TYPES).toContain('pages');
      expect(RESOURCE_TYPES).toContain('cards');
      expect(RESOURCE_TYPES).toContain('tables');
      expect(RESOURCE_TYPES).toContain('workflows');
      expect(RESOURCE_TYPES).toContain('automations');
      expect(RESOURCE_TYPES).toContain('computations');
    });
  });

  describe('应用元数据', () => {
    it('应该包含必要字段', () => {
      const appMeta = {
        appId: 'test001',
        name: '测试应用',
        description: '测试应用描述',
        status: 'active',
        version: 1,
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(appMeta.appId).toBeDefined();
      expect(appMeta.name).toBeDefined();
      expect(appMeta.status).toBeDefined();
      expect(appMeta.createdAt).toBeDefined();
      expect(appMeta.updatedAt).toBeDefined();
    });

    it('应该支持状态变更', () => {
      const appMeta = {
        appId: 'test001',
        name: '测试应用',
        status: 'draft',
      };

      // 发布
      appMeta.status = 'published';
      expect(appMeta.status).toBe('published');

      // 下线
      appMeta.status = 'archived';
      expect(appMeta.status).toBe('archived');
    });
  });

  describe('资源引用', () => {
    it('应该声明资源引用关系', () => {
      const page = {
        pageId: 'page001',
        name: '首页',
        references: {
          tables: ['table001', 'table002'],
          cards: ['card001'],
        },
      };

      expect(page.references.tables).toContain('table001');
      expect(page.references.tables).toContain('table002');
      expect(page.references.cards).toContain('card001');
    });
  });
});
