/**
 * queryRecords 高级查询测试用例
 *
 * 验证高级查询功能：条件过滤、聚合、分页、排序。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { KoffiDatabase } from '../sqlite-koffi.js';
import {
  generateCreateTableSQL,
  executeTableSchema,
  insertRecord,
  queryRecords,
  queryRecordsAdvanced,
} from '../schema-builder.js';
import type { TableSchema } from '@low-code/shared';

// ─── 测试辅助函数 ──────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTempDb(): { db: KoffiDatabase; tmpDir: string; dbPath: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const db = new KoffiDatabase(dbPath);
  db.pragma('foreign_keys', 'ON');
  return { db, tmpDir, dbPath };
}

function createTestSchema(): TableSchema {
  return {
    tableId: 'orders',
    name: '订单表',
    schemaVersion: 1,
    version: 1,
    columns: [
      { id: 'col_name', fieldName: 'name', fieldType: 'string', required: true },
      { id: 'col_amount', fieldName: 'amount', fieldType: 'number', required: true },
      { id: 'col_status', fieldName: 'status', fieldType: 'string', required: true },
      { id: 'col_category', fieldName: 'category', fieldType: 'string', required: false },
      { id: 'col_date', fieldName: 'order_date', fieldType: 'date', required: false },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── 测试数据 ──────────────────────────────────────────

const testOrders = [
  { name: '订单A', amount: 100, status: 'active', category: 'electronics', order_date: '2024-01-15' },
  { name: '订单B', amount: 200, status: 'active', category: 'clothing', order_date: '2024-02-20' },
  { name: '订单C', amount: 150, status: 'completed', category: 'electronics', order_date: '2024-03-10' },
  { name: '订单D', amount: 300, status: 'active', category: 'food', order_date: '2024-04-05' },
  { name: '订单E', amount: 50, status: 'cancelled', category: 'clothing', order_date: '2024-05-01' },
];

// ─── 测试用例 ──────────────────────────────────────────

describe('queryRecords', () => {
  let db: KoffiDatabase;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(async () => {
    const env = createTempDb();
    db = env.db;
    tmpDir = env.tmpDir;
    dbPath = env.dbPath;

    // 创建表
    const schema = createTestSchema();
    const createSQL = generateCreateTableSQL('orders', schema);
    db.exec(createSQL);

    // 插入测试数据
    for (const order of testOrders) {
      await insertRecord(db, 'orders', order);
    }
  });

  afterEach(async () => {
    db.close();
    await sleep(100);
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('基础查询', () => {
    it('应该返回所有记录', () => {
      const result = queryRecords(db, 'orders');
      expect(result.length).toBe(5);
    });

    it('应该排除软删除记录', () => {
      // 软删除一条记录
      db.exec('UPDATE orders SET _deleted = 1 WHERE name = \'订单A\'');

      const result = queryRecords(db, 'orders');
      expect(result.length).toBe(4);
    });
  });

  describe('条件查询 - 比较操作符', () => {
    it('$eq - 等于', () => {
      const result = queryRecords(db, 'orders', { status: 'active' });
      expect(result.length).toBe(3);
      expect(result.every(r => r.status === 'active')).toBe(true);
    });

    it('$ne - 不等于', () => {
      const result = queryRecords(db, 'orders', { status: { $ne: 'active' } });
      expect(result.length).toBe(2);
    });

    it('$gt - 大于', () => {
      const result = queryRecords(db, 'orders', { amount: { $gt: 150 } });
      expect(result.length).toBe(2);
      expect(result.every(r => r.amount > 150)).toBe(true);
    });

    it('$gte - 大于等于', () => {
      const result = queryRecords(db, 'orders', { amount: { $gte: 150 } });
      expect(result.length).toBe(3);
    });

    it('$lt - 小于', () => {
      const result = queryRecords(db, 'orders', { amount: { $lt: 150 } });
      expect(result.length).toBe(2);
      expect(result.every(r => r.amount < 150)).toBe(true);
    });

    it('$lte - 小于等于', () => {
      const result = queryRecords(db, 'orders', { amount: { $lte: 150 } });
      expect(result.length).toBe(3);
    });
  });

  describe('条件查询 - 集合操作符', () => {
    it('$in - 在列表中', () => {
      const result = queryRecords(db, 'orders', {
        status: { $in: ['active', 'completed'] },
      });
      expect(result.length).toBe(4);
    });

    it('$not_in - 不在列表中', () => {
      const result = queryRecords(db, 'orders', {
        status: { $not_in: ['cancelled'] },
      });
      expect(result.length).toBe(4);
    });
  });

  describe('条件查询 - 字符串操作符', () => {
    it('$like - 模糊匹配', () => {
      const result = queryRecords(db, 'orders', {
        name: { $like: '%单%' },
      });
      expect(result.length).toBe(5);
    });

    it('$like - 开头匹配', () => {
      const result = queryRecords(db, 'orders', {
        name: { $like: '订单%' },
      });
      expect(result.length).toBe(5);
    });

    it('$not_like - 不匹配', () => {
      const result = queryRecords(db, 'orders', {
        name: { $not_like: '%A%' },
      });
      expect(result.length).toBe(4);
    });
  });

  describe('条件查询 - 范围操作符', () => {
    it('$between - 在范围内', () => {
      const result = queryRecords(db, 'orders', {
        amount: { $between: [100, 200] },
      });
      expect(result.length).toBe(3);
      expect(result.every(r => r.amount >= 100 && r.amount <= 200)).toBe(true);
    });
  });

  describe('条件查询 - 空值操作符', () => {
    it('$is_null - 为空', () => {
      // 先插入一条 category 为 null 的记录
      insertRecord(db, 'orders', {
        name: '订单F',
        amount: 100,
        status: 'active',
        category: null,
      });

      const result = queryRecords(db, 'orders', {
        category: { $is_null: true },
      });
      expect(result.length).toBe(1);
    });

    it('$is_not_null - 不为空', () => {
      const result = queryRecords(db, 'orders', {
        category: { $is_not_null: true },
      });
      expect(result.length).toBe(5);
    });
  });

  describe('条件查询 - 逻辑操作符', () => {
    it('$and - 且条件', () => {
      const result = queryRecords(db, 'orders', {
        $and: [
          { status: 'active' },
          { amount: { $gt: 150 } },
        ],
      });
      // 订单B (200, active) 和 订单D (300, active) 都满足
      expect(result.length).toBe(2);
      expect(result.every((r: any) => r.status === 'active' && r.amount > 150)).toBe(true);
    });

    it('$or - 或条件', () => {
      const result = queryRecords(db, 'orders', {
        $or: [
          { status: 'completed' },
          { amount: { $gt: 250 } },
        ],
      });
      expect(result.length).toBe(2);
    });
  });

  describe('高级查询 - 分页', () => {
    it('应该支持分页查询', () => {
      const page1 = queryRecordsAdvanced(db, 'orders', {
        where: {},
        page: 1,
        pageSize: 2,
      });
      expect(page1.length).toBe(2);

      const page2 = queryRecordsAdvanced(db, 'orders', {
        where: {},
        page: 2,
        pageSize: 2,
      });
      expect(page2.length).toBe(2);

      const page3 = queryRecordsAdvanced(db, 'orders', {
        where: {},
        page: 3,
        pageSize: 2,
      });
      expect(page3.length).toBe(1);
    });
  });

  describe('高级查询 - 排序', () => {
    it('应该支持升序排序', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        orderBy: { field: 'amount', direction: 'asc' },
      });
      expect(result.length).toBe(5);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].amount).toBeGreaterThanOrEqual(result[i - 1].amount);
      }
    });

    it('应该支持降序排序', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        orderBy: { field: 'amount', direction: 'desc' },
      });
      expect(result.length).toBe(5);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].amount).toBeLessThanOrEqual(result[i - 1].amount);
      }
    });
  });

  describe('高级查询 - 聚合', () => {
    it('应该支持 count 聚合', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        aggregate: { field: '*', fn: 'count' },
      });
      expect(result.count).toBe(5);
    });

    it('应该支持 sum 聚合', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        aggregate: { field: 'amount', fn: 'sum' },
      });
      expect(result.sum).toBe(800);
    });

    it('应该支持 avg 聚合', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        aggregate: { field: 'amount', fn: 'avg' },
      });
      expect(result.avg).toBe(160);
    });

    it('应该支持 min 聚合', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        aggregate: { field: 'amount', fn: 'min' },
      });
      expect(result.min).toBe(50);
    });

    it('应该支持 max 聚合', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: {},
        aggregate: { field: 'amount', fn: 'max' },
      });
      expect(result.max).toBe(300);
    });

    it('应该支持带条件的聚合', () => {
      const result = queryRecordsAdvanced(db, 'orders', {
        where: { status: 'active' },
        aggregate: { field: 'amount', fn: 'sum' },
      });
      expect(result.sum).toBe(600);
    });
  });
});
