/**
 * FileDatabaseAdapter 集成测试
 *
 * 使用真实文件系统测试数据库适配器
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileDatabaseAdapter } from '../services/FileDatabaseAdapter.js';

describe('FileDatabaseAdapter 集成测试', () => {
  let adapter: FileDatabaseAdapter;
  let tempDir: string;

  beforeEach(() => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
    adapter = new FileDatabaseAdapter(tempDir);
  });

  afterEach(() => {
    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('INSERT 操作', () => {
    it('应该插入记录到文件', async () => {
      const result = await adapter.run(
        'INSERT INTO workflow_instances (id, status, variables) VALUES (?, ?, ?)',
        ['inst_001', 'running', '{"amount": 1000}']
      );

      expect(result.changes).toBe(1);

      // 验证文件存在
      const filePath = path.join(tempDir, 'instances', 'inst_001.json');
      expect(fs.existsSync(filePath)).toBe(true);

      // 验证文件内容
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.id).toBe('inst_001');
      expect(content.status).toBe('running');
      expect(content.variables).toEqual({ amount: 1000 });
    });

    it('应该插入任务记录', async () => {
      await adapter.run(
        'INSERT INTO workflow_tasks (id, instance_id, node_id, status) VALUES (?, ?, ?, ?)',
        ['task_001', 'inst_001', 'node_approval', 'pending']
      );

      const filePath = path.join(tempDir, 'tasks', 'task_001.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('SELECT 操作', () => {
    beforeEach(async () => {
      // 准备测试数据
      await adapter.run(
        'INSERT INTO workflow_instances (id, status, started_by) VALUES (?, ?, ?)',
        ['inst_001', 'running', 'user1']
      );
      await adapter.run(
        'INSERT INTO workflow_instances (id, status, started_by) VALUES (?, ?, ?)',
        ['inst_002', 'completed', 'user1']
      );
      await adapter.run(
        'INSERT INTO workflow_instances (id, status, started_by) VALUES (?, ?, ?)',
        ['inst_003', 'running', 'user2']
      );
    });

    it('应该查询所有记录', async () => {
      const results = await adapter.all('SELECT * FROM workflow_instances');
      expect(results).toHaveLength(3);
    });

    it('应该按单条件查询', async () => {
      const results = await adapter.all(
        "SELECT * FROM workflow_instances WHERE status = 'running'"
      );
      expect(results).toHaveLength(2);
      expect(results.every((r: any) => r.status === 'running')).toBe(true);
    });

    it('应该按参数化条件查询', async () => {
      const results = await adapter.all(
        'SELECT * FROM workflow_instances WHERE status = ?',
        ['running']
      );
      expect(results).toHaveLength(2);
    });

    it('应该按多条件查询', async () => {
      const results = await adapter.all(
        "SELECT * FROM workflow_instances WHERE status = 'running' AND started_by = 'user1'"
      );
      expect(results).toHaveLength(1);
      expect((results[0] as any).id).toBe('inst_001');
    });

    it('应该查询单条记录', async () => {
      const result = await adapter.get(
        'SELECT * FROM workflow_instances WHERE id = ?',
        ['inst_001']
      );
      expect(result).toBeDefined();
      expect((result as any).id).toBe('inst_001');
    });

    it('应该返回 undefined 当记录不存在', async () => {
      const result = await adapter.get(
        'SELECT * FROM workflow_instances WHERE id = ?',
        ['nonexistent']
      );
      expect(result).toBeUndefined();
    });
  });

  describe('UPDATE 操作', () => {
    beforeEach(async () => {
      await adapter.run(
        'INSERT INTO workflow_instances (id, status, variables) VALUES (?, ?, ?)',
        ['inst_001', 'running', '{}']
      );
    });

    it('应该更新记录', async () => {
      const result = await adapter.run(
        'UPDATE workflow_instances SET status = ? WHERE id = ?',
        ['completed', 'inst_001']
      );

      expect(result.changes).toBe(1);

      // 验证更新后的数据
      const record = await adapter.get(
        'SELECT * FROM workflow_instances WHERE id = ?',
        ['inst_001']
      );
      expect((record as any).status).toBe('completed');
    });

    it('应该更新多个字段', async () => {
      await adapter.run(
        'UPDATE workflow_instances SET status = ?, variables = ? WHERE id = ?',
        ['completed', '{"result": "approved"}', 'inst_001']
      );

      const record = await adapter.get(
        'SELECT * FROM workflow_instances WHERE id = ?',
        ['inst_001']
      );
      expect((record as any).status).toBe('completed');
      expect((record as any).variables).toEqual({ result: 'approved' });
    });
  });

  describe('DELETE 操作', () => {
    beforeEach(async () => {
      await adapter.run(
        'INSERT INTO workflow_instances (id, status) VALUES (?, ?)',
        ['inst_001', 'running']
      );
    });

    it('应该删除记录', async () => {
      const result = await adapter.run(
        'DELETE FROM workflow_instances WHERE id = ?',
        ['inst_001']
      );

      expect(result.changes).toBe(1);

      // 验证文件已删除
      const filePath = path.join(tempDir, 'instances', 'inst_001.json');
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('应该返回 0 当记录不存在', async () => {
      const result = await adapter.run(
        'DELETE FROM workflow_instances WHERE id = ?',
        ['nonexistent']
      );
      expect(result.changes).toBe(0);
    });
  });

  describe('复杂查询场景', () => {
    beforeEach(async () => {
      // 准备任务数据
      await adapter.run(
        'INSERT INTO workflow_tasks (id, instance_id, node_id, assignee_id, status) VALUES (?, ?, ?, ?, ?)',
        ['task_001', 'inst_001', 'node1', 'user1', 'pending']
      );
      await adapter.run(
        'INSERT INTO workflow_tasks (id, instance_id, node_id, assignee_id, status) VALUES (?, ?, ?, ?, ?)',
        ['task_002', 'inst_001', 'node1', 'user2', 'completed']
      );
      await adapter.run(
        'INSERT INTO workflow_tasks (id, instance_id, node_id, assignee_id, status) VALUES (?, ?, ?, ?, ?)',
        ['task_003', 'inst_002', 'node1', 'user1', 'pending']
      );
    });

    it('应该按 assignee_id 和 status 查询待办任务', async () => {
      const results = await adapter.all(
        "SELECT * FROM workflow_tasks WHERE assignee_id = 'user1' AND status = 'pending'"
      );
      expect(results).toHaveLength(2);
    });

    it('应该按 instance_id 查询任务', async () => {
      const results = await adapter.all(
        "SELECT * FROM workflow_tasks WHERE instance_id = 'inst_001'"
      );
      expect(results).toHaveLength(2);
    });

    it('应该按 instance_id 和 status 查询', async () => {
      const results = await adapter.all(
        "SELECT * FROM workflow_tasks WHERE instance_id = 'inst_001' AND status = 'pending'"
      );
      expect(results).toHaveLength(1);
      expect((results[0] as any).id).toBe('task_001');
    });
  });
});
