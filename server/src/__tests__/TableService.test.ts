/**
 * TableService 集成测试
 *
 * 使用唯一的表名避免测试间冲突。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { KoffiDatabase } from '@low-code/data';
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-svc-'));
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
  return `t${++tableCounter}`;
}

function createSchema(tableId: string, columns?: TableSchema['columns']): TableSchema {
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

describe('TableService', () => {
  describe('executeTableSchema', () => {
    it('应该创建新表', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createSchema(tid));

      const table = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ).get(tid);
      expect(table).toBeDefined();
    });

    it('应该更新已存在的表（添加列）', () => {
      const tid = uniqueTableId();
      const old = createSchema(tid);
      executeTableSchema(db, tid, old);

      insertRecord(db, tid, { name: '张三', age: 25 });

      const updated = createSchema(tid, [
        ...old.columns,
        { id: 'c3', fieldName: 'email', fieldType: 'string', required: false },
      ]);
      executeTableSchema(db, tid, updated, old);

      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('张三');
    });
  });

  describe('CRUD 操作', () => {
    it('插入 → 查询 → 更新 → 软删除 → 恢复', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createSchema(tid));

      // 插入
      const { id } = insertRecord(db, tid, { name: '张三', age: 25 });
      expect(id).toBeGreaterThan(0);

      // 查询
      let rows = queryRecords(db, tid);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('张三');

      // 更新
      updateRecord(db, tid, id, { age: 26 });
      rows = queryRecords(db, tid, { where: 'id = ?', params: [id] });
      expect(rows[0].age).toBe(26);

      // 软删除
      softDeleteRecord(db, tid, id);
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(0);

      // 查询含已删除
      rows = queryRecords(db, tid, { includeDeleted: true });
      expect(rows).toHaveLength(1);
      expect(rows[0]._deleted).toBe(1);

      // 恢复
      restoreRecord(db, tid, id);
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(1);
    });

    it('不应更新已删除的记录', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createSchema(tid));

      const { id } = insertRecord(db, tid, { name: '张三' });
      softDeleteRecord(db, tid, id);

      const changes = updateRecord(db, tid, id, { name: '新名字' });
      expect(changes).toBe(0);

      restoreRecord(db, tid, id);
    });

    it('批量插入', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createSchema(tid));

      for (const name of ['张三', '李四', '王五']) {
        insertRecord(db, tid, { name });
      }

      const rows = queryRecords(db, tid);
      expect(rows).toHaveLength(3);
    });

    it('条件查询', () => {
      const tid = uniqueTableId();
      executeTableSchema(db, tid, createSchema(tid));

      insertRecord(db, tid, { name: '张三', age: 20 });
      insertRecord(db, tid, { name: '李四', age: 30 });

      const rows = queryRecords(db, tid, {
        where: 'age > ?',
        params: [25],
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('李四');
    });
  });

  describe('外键', () => {
    it('应该支持外键字段定义', () => {
      const userTid = uniqueTableId();
      const orderTid = uniqueTableId();

      executeTableSchema(db, userTid, createSchema(userTid, [
        { id: 'c1', fieldName: 'name', fieldType: 'string', required: true },
      ]));

      executeTableSchema(db, orderTid, createSchema(orderTid, [
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
    });
  });

  describe('完整流程', () => {
    it('创建 → 插入 → 查询 → 更新表结构 → 数据保留', () => {
      const tid = uniqueTableId();
      const schema = createSchema(tid);

      // 创建表
      executeTableSchema(db, tid, schema);

      // 插入数据
      insertRecord(db, tid, { name: '张三', age: 25 });
      insertRecord(db, tid, { name: '李四', age: 30 });

      // 查询
      let rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);

      // 更新表结构（添加列）
      const newSchema = createSchema(tid, [
        ...schema.columns,
        { id: 'c3', fieldName: 'phone', fieldType: 'string', required: false },
      ]);
      executeTableSchema(db, tid, newSchema, schema);

      // 验证数据保留
      rows = queryRecords(db, tid);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('张三');
    });
  });
});
