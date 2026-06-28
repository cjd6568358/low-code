/**
 * 动态建表 E2E 测试
 *
 * 覆盖完整流程：
 * - 创建数据表 Schema
 * - 保存 Schema → 物理表同步
 * - CRUD 操作
 * - 表结构变更
 * - 软删除
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager, KoffiDatabase } from '@low-code/data';
import {
  executeTableSchema,
  insertRecord,
  queryRecords,
  updateRecord,
  softDeleteRecord,
  restoreRecord,
} from '@low-code/data';
import type { TableSchema } from '@low-code/shared';

// ─── 测试环境 ──────────────────────────────────────────

let db: KoffiDatabase;
let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-e2e-'));
  const dbPath = path.join(tmpDir, 'test.db');
  db = new KoffiDatabase(dbPath);
  db.pragma('foreign_keys', 'ON');
});

afterAll(() => {
  db.close();
  // 不删除目录，避免 Windows 文件锁定问题
});

// ─── 辅助函数 ──────────────────────────────────────────

let tableCounter = 0;
function uniqueTableId() {
  return `t${++tableCounter}_${Date.now().toString(36)}`;
}

function createTestSchema(tableId: string, columns?: TableSchema['columns']): TableSchema {
  return {
    tableId,
    name: `表_${tableId}`,
    schemaVersion: 1,
    version: 1,
    columns: columns || [
      { id: 'c1', fieldName: 'name', fieldType: 'string', required: true },
      { id: 'c2', fieldName: 'age', fieldType: 'number', required: false, defaultValue: '0' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── 测试用例 ──────────────────────────────────────────

describe('动态建表 E2E', () => {
  describe('基本 CRUD 流程', () => {
    it('创建表 → 插入数据 → 查询 → 更新 → 软删除 → 恢复', () => {
      const tid = uniqueTableId();
      const schema = createTestSchema(tid);

      // 1. 创建表
      executeTableSchema(db, tid, schema);

      // 2. 插入数据
      const { id: id1 } = insertRecord(db, tid, { name: '张三', age: 25 });
      const { id: id2 } = insertRecord(db, tid, { name: '李四', age: 30 });
      expect(id1).toBeGreaterThan(0);
      expect(id2).toBeGreaterThan(id1);

      // 3. 查询数据
      let rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('张三');
      expect(rows[1].name).toBe('李四');

      // 4. 更新数据
      updateRecord(db, tid, id1, { age: 26 });
      rows = queryRecords(db, tid, { where: 'id = ?', params: [id1] });
      expect(rows[0].age).toBe(26);

      // 5. 软删除数据
      softDeleteRecord(db, tid, id1);
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(id2);

      // 6. 查询含已删除
      rows = queryRecords(db, tid, { includeDeleted: true });
      expect(rows).toHaveLength(2);

      // 7. 恢复数据
      restoreRecord(db, tid, id1);
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);
    });
  });

  describe('外键约束流程', () => {
    it('应该支持外键字段定义', () => {
      const userTid = uniqueTableId();
      const orderTid = uniqueTableId();

      // 创建用户表
      executeTableSchema(db, userTid, createTestSchema(userTid, [
        { id: 'c1', fieldName: 'name', fieldType: 'string', required: true },
      ]));

      // 创建订单表（外键引用用户表）
      executeTableSchema(db, orderTid, createTestSchema(orderTid, [
        {
          id: 'c1', fieldName: 'user_id', fieldType: 'number', required: true,
          foreignKey: { targetTableId: userTid, targetFieldName: 'id', onDelete: 'RESTRICT' },
        },
        { id: 'c2', fieldName: 'product', fieldType: 'string', required: true },
      ]));

      // 两张表都应该存在
      const userTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ).get(userTid);
      const orderTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ).get(orderTid);
      expect(userTable).toBeDefined();
      expect(orderTable).toBeDefined();

      // 插入用户和订单
      const { id: userId } = insertRecord(db, userTid, { name: '张三' });
      const { id: orderId } = insertRecord(db, orderTid, {
        user_id: userId,
        product: '手机',
      });
      expect(orderId).toBeGreaterThan(0);

      // 查询订单
      const orders = queryRecords(db, orderTid);
      expect(orders).toHaveLength(1);
      expect(orders[0].product).toBe('手机');
    });
  });

  describe('表结构变更流程', () => {
    it('应该支持添加列并保留数据', () => {
      const tid = uniqueTableId();
      const oldSchema = createTestSchema(tid);

      // 创建表
      executeTableSchema(db, tid, oldSchema);

      // 插入数据
      insertRecord(db, tid, { name: '张三', age: 25 });
      insertRecord(db, tid, { name: '李四', age: 30 });

      // 更新表结构（添加 phone 列）
      const newSchema = createTestSchema(tid, [
        ...oldSchema.columns,
        { id: 'c3', fieldName: 'phone', fieldType: 'string', required: false },
      ]);
      executeTableSchema(db, tid, newSchema, oldSchema);

      // 验证数据保留
      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('张三');
      expect(rows[0].age).toBe(25);
      expect(rows[0].phone).toBeNull(); // 新列默认为 null

      // 使用新列插入数据
      insertRecord(db, tid, { name: '王五', age: 28, phone: '13800138000' });

      // 查询验证
      const allRows = queryRecords(db, tid);
      expect(allRows).toHaveLength(3);
      expect(allRows[2].phone).toBe('13800138000');
    });

    it('应该支持删除列并保留数据', () => {
      const tid = uniqueTableId();
      const oldSchema = createTestSchema(tid, [
        { id: 'c1', fieldName: 'name', fieldType: 'string', required: true },
        { id: 'c2', fieldName: 'age', fieldType: 'number', required: false },
        { id: 'c3', fieldName: 'phone', fieldType: 'string', required: false },
      ]);

      // 创建表
      executeTableSchema(db, tid, oldSchema);

      // 插入数据
      insertRecord(db, tid, { name: '张三', age: 25, phone: '13800138000' });

      // 更新表结构（删除 phone 列）
      const newSchema = createTestSchema(tid, [
        { id: 'c1', fieldName: 'name', fieldType: 'string', required: true },
        { id: 'c2', fieldName: 'age', fieldType: 'number', required: false },
      ]);
      executeTableSchema(db, tid, newSchema, oldSchema);

      // 验证数据保留（phone 列已删除）
      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('张三');
      expect(rows[0].age).toBe(25);
      expect(rows[0].phone).toBeUndefined(); // 列已删除
    });
  });

  describe('边界情况', () => {
    it('应该处理空表查询', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createTestSchema(tid));

      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(0);
    });

    it('应该处理特殊字符', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createTestSchema(tid));

      // 插入包含特殊字符的数据
      insertRecord(db, tid, { name: "O'Reilly", age: 30 });

      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("O'Reilly");
    });

    it('应该处理大量数据', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createTestSchema(tid));

      // 插入 100 条记录
      for (let i = 0; i < 100; i++) {
        insertRecord(db, tid, { name: `用户${i}`, age: 20 + i });
      }

      // 查询验证
      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(100);
    });
  });

  describe('完整流程', () => {
    it('创建 → 插入 → 查询 → 更新表结构 → 数据保留', () => {
      const tid = uniqueTableId();
      const schema = createTestSchema(tid);

      // 1. 创建表
      executeTableSchema(db, tid, schema);

      // 2. 插入数据
      insertRecord(db, tid, { name: '张三', age: 25 });
      insertRecord(db, tid, { name: '李四', age: 30 });

      // 3. 查询
      let rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);

      // 4. 更新表结构（添加列）
      const newSchema = createTestSchema(tid, [
        ...schema.columns,
        { id: 'c3', fieldName: 'email', fieldType: 'string', required: false },
      ]);
      executeTableSchema(db, tid, newSchema, schema);

      // 5. 验证数据保留
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('张三');
      expect(rows[0].age).toBe(25);

      // 6. 使用新列插入数据
      insertRecord(db, tid, { name: '王五', age: 28, email: 'wangwu@example.com' });

      // 7. 最终验证
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(3);
      expect(rows[2].email).toBe('wangwu@example.com');
    });
  });
});
