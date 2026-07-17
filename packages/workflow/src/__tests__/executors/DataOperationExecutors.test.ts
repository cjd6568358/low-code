/**
 * 数据操作执行器测试用例
 *
 * 验证 CreateRecord、UpdateRecord、QueryRecord、DeleteRecord 四种数据操作执行器。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateRecordExecutor } from '../../executors/CreateRecordExecutor.js';
import { UpdateRecordExecutor } from '../../executors/UpdateRecordExecutor.js';
import { QueryRecordExecutor } from '../../executors/QueryRecordExecutor.js';
import { DeleteRecordExecutor } from '../../executors/DeleteRecordExecutor.js';
import type { ExecutionContext } from '../../types/execution.js';

describe('数据操作执行器', () => {
  describe('CreateRecordExecutor', () => {
    let executor: CreateRecordExecutor;

    beforeEach(() => {
      executor = new CreateRecordExecutor(createMockEngine() as any);
    });

    it('应该创建记录', async () => {
      const context = createMockContext({
        node: {
          id: 'create1',
          $type: 'bpmn:CreateTask',
          name: '创建订单',
          collection: 'orders',
          fields: [
            { field: 'name', value: '$workflow.orderData.name' },
            { field: 'amount', value: '$workflow.orderData.amount' },
          ],
        },
        variables: { orderData: { name: '测试订单', amount: 1000 } },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
      expect(result.variableUpdates?.create1_result).toBeDefined();
    });

    it('应该支持默认值', async () => {
      const context = createMockContext({
        node: {
          id: 'create1',
          $type: 'bpmn:CreateTask',
          name: '创建记录',
          collection: 'orders',
          fields: [
            { field: 'name', value: '${name}' },
            { field: 'status', value: 'pending' },
            { field: 'createdAt', value: '$now' },
          ],
        },
        variables: { name: '测试' },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateRecordExecutor', () => {
    let executor: UpdateRecordExecutor;

    beforeEach(() => {
      executor = new UpdateRecordExecutor(createMockEngine() as any);
    });

    it('应该更新记录', async () => {
      const context = createMockContext({
        node: {
          id: 'update1',
          $type: 'bpmn:UpdateTask',
          name: '更新订单状态',
          collection: 'orders',
          recordId: 'order001',
          fields: [
            { field: 'status', value: '$workflow.newStatus' },
          ],
          filter: { id: 'order001' },
        },
        variables: { newStatus: 'confirmed' },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无 filter 的更新（安全校验）', async () => {
      const context = createMockContext({
        node: {
          id: 'update1',
          $type: 'bpmn:UpdateTask',
          name: '危险更新',
          collection: 'orders',
          fields: [
            { field: 'status', value: 'test' },
          ],
          // 缺少 filter
        },
      });

      const result = await executor.execute(context);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('筛选条件');
    });

    it('应该支持条件更新', async () => {
      const context = createMockContext({
        node: {
          id: 'update1',
          $type: 'bpmn:UpdateTask',
          name: '条件更新',
          collection: 'orders',
          filter: { status: 'pending', amount: { $gt: 100 } },
          fields: [
            { field: 'status', value: '$workflow.newStatus' },
          ],
        },
        variables: { newStatus: 'approved' },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('QueryRecordExecutor', () => {
    let executor: QueryRecordExecutor;

    beforeEach(() => {
      executor = new QueryRecordExecutor(createMockEngine() as any);
    });

    it('应该查询记录', async () => {
      const context = createMockContext({
        node: {
          id: 'query1',
          $type: 'bpmn:QueryTask',
          name: '查询订单',
          collection: 'orders',
          filter: { id: 'order001' },
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
      expect(result.variableUpdates?.query1_result).toBeDefined();
    });

    it('应该支持排序', async () => {
      const context = createMockContext({
        node: {
          id: 'query1',
          $type: 'bpmn:QueryTask',
          name: '查询订单',
          collection: 'orders',
          sort: { createdAt: 'desc' },
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该支持分页', async () => {
      const context = createMockContext({
        node: {
          id: 'query1',
          $type: 'bpmn:QueryTask',
          name: '分页查询',
          collection: 'orders',
          pagination: { limit: 10, offset: 0 },
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该支持字段选择', async () => {
      const context = createMockContext({
        node: {
          id: 'query1',
          $type: 'bpmn:QueryTask',
          name: '查询部分字段',
          collection: 'orders',
          select: ['id', 'name', 'amount'],
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('DeleteRecordExecutor', () => {
    let executor: DeleteRecordExecutor;

    beforeEach(() => {
      executor = new DeleteRecordExecutor(createMockEngine() as any);
    });

    it('应该删除记录', async () => {
      const context = createMockContext({
        node: {
          id: 'delete1',
          $type: 'bpmn:DeleteTask',
          name: '删除订单',
          collection: 'orders',
          filter: { id: 'order001' },
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无 filter 的删除（安全校验）', async () => {
      const context = createMockContext({
        node: {
          id: 'delete1',
          $type: 'bpmn:DeleteTask',
          name: '危险删除',
          collection: 'orders',
          // 缺少 filter
        },
      });

      const result = await executor.execute(context);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('筛选条件');
    });

    it('应该支持软删除', async () => {
      const context = createMockContext({
        node: {
          id: 'delete1',
          $type: 'bpmn:DeleteTask',
          name: '软删除',
          collection: 'orders',
          filter: { id: 'order001' },
          softDelete: true,
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('字段映射转换', () => {
    let executor: CreateRecordExecutor;

    beforeEach(() => {
      executor = new CreateRecordExecutor(createMockEngine() as any);
    });

    it('应该支持变量引用', async () => {
      const context = createMockContext({
        node: {
          id: 'create1',
          $type: 'bpmn:CreateTask',
          name: '创建记录',
          collection: 'orders',
          fields: [
            { field: 'name', value: '$workflow.orderData.name' },
            { field: 'amount', value: '$workflow.orderData.amount' },
          ],
        },
        variables: {
          orderData: { name: '测试订单', amount: 1000 },
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该支持模板变量', async () => {
      const context = createMockContext({
        node: {
          id: 'create1',
          $type: 'bpmn:CreateTask',
          name: '创建记录',
          collection: 'orders',
          fields: [
            { field: 'description', value: '订单 ${name}，金额 ${amount}' },
          ],
        },
        variables: { name: '测试订单', amount: 1000 },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该支持常量值', async () => {
      const context = createMockContext({
        node: {
          id: 'create1',
          $type: 'bpmn:CreateTask',
          name: '创建记录',
          collection: 'orders',
          fields: [
            { field: 'status', value: 'pending' },
            { field: 'totalAmount', value: '0' },
          ],
        },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });
  });
});

// ─── 辅助函数 ──────────────────────────────────────────

/** 创建 mock 引擎 */
function createMockEngine() {
  return {
    updateInstance: vi.fn().mockResolvedValue(undefined),
    mergeVariables: vi.fn().mockResolvedValue(undefined),
  };
}

/** 创建 mock 数据库 */
function createMockDb() {
  return {
    create: vi.fn().mockResolvedValue({ id: 'new_record_001' }),
    find: vi.fn().mockResolvedValue([{ id: 'order001', name: '测试订单' }]),
    update: vi.fn().mockResolvedValue(1),
    destroy: vi.fn().mockResolvedValue(1),
  };
}

function createMockContext(overrides: any = {}): ExecutionContext {
  const mockDb = createMockDb();
  return {
    instance: { instanceId: 'inst1', status: 'running' },
    definition: {
      id: 'def1',
      name: '测试流程',
      nodes: [
        { id: 'next1', $type: 'bpmn:EndEvent', name: '结束' },
      ],
      edges: [],
    },
    currentNode: overrides.node || { id: 'node1', $type: 'bpmn:CreateTask' },
    snapshot: { data: {} },
    variables: overrides.variables || {},
    operator: { userId: 'user1', userName: '测试用户' },
    getDatabase: vi.fn().mockReturnValue(mockDb),
    ...overrides,
  } as any;
}
