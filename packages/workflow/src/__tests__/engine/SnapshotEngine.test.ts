/**
 * SnapshotEngine 测试用例
 *
 * 验证快照引擎的捕获、查询、对比、回写功能。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnapshotEngine } from '../../snapshot/SnapshotEngine.js';
import type { SnapshotService } from '../../types/engine.js';

describe('SnapshotEngine', () => {
  let engine: SnapshotEngine;
  let mockService: SnapshotService;

  beforeEach(() => {
    mockService = {
      capture: vi.fn().mockResolvedValue({ id: 'snap1' }),
      getLatest: vi.fn().mockResolvedValue(null),
      getChain: vi.fn().mockResolvedValue([]),
      diff: vi.fn().mockResolvedValue({ changedFields: {} }),
      commitToSourceTable: vi.fn().mockResolvedValue(undefined),
    };
    engine = new SnapshotEngine(mockService);
  });

  describe('capture', () => {
    it('应该捕获初始快照', async () => {
      const params = {
        instanceId: 'inst1',
        nodeId: 'start',
        nodeName: '开始',
        sourceId: 'record001',
        sourceTable: 'orders',
        data: { name: '测试订单', amount: 1000 },
        snapshotType: 'INITIAL' as const,
        operatorId: 'user1',
        operatorName: '测试用户',
      };

      const snapshot = await engine.capture(params);

      expect(mockService.capture).toHaveBeenCalledWith(expect.objectContaining({
        instanceId: 'inst1',
        snapshotType: 'INITIAL',
      }));
      expect(snapshot.id).toBe('snap1');
    });

    it('应该捕获节点完成快照', async () => {
      const params = {
        instanceId: 'inst1',
        nodeId: 'task1',
        nodeName: '审批节点',
        sourceId: 'record001',
        sourceTable: 'orders',
        data: { name: '测试订单', amount: 1000, status: 'approved' },
        snapshotType: 'NODE_COMPLETE' as const,
        operatorId: 'user1',
        operatorName: '测试用户',
      };

      await engine.capture(params);

      expect(mockService.capture).toHaveBeenCalledWith(expect.objectContaining({
        snapshotType: 'NODE_COMPLETE',
      }));
    });

    it('应该捕获驳回快照', async () => {
      const params = {
        instanceId: 'inst1',
        nodeId: 'task1',
        nodeName: '审批节点',
        sourceId: 'record001',
        sourceTable: 'orders',
        data: { name: '测试订单', amount: 1000, status: 'rejected' },
        snapshotType: 'NODE_REJECT' as const,
        operatorId: 'user1',
        operatorName: '测试用户',
        comment: '金额超限',
      };

      await engine.capture(params);

      expect(mockService.capture).toHaveBeenCalledWith(expect.objectContaining({
        snapshotType: 'NODE_REJECT',
        comment: '金额超限',
      }));
    });
  });

  describe('getChain', () => {
    it('应该返回完整快照链', async () => {
      const chain = [
        { id: 'snap1', snapshotType: 'INITIAL', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'snap2', snapshotType: 'NODE_COMPLETE', createdAt: '2024-01-01T01:00:00Z' },
        { id: 'snap3', snapshotType: 'FINAL', createdAt: '2024-01-01T02:00:00Z' },
      ];

      mockService.getChain = vi.fn().mockResolvedValue(chain);

      const result = await engine.getChain('inst1');

      expect(result).toHaveLength(3);
      expect(result[0].snapshotType).toBe('INITIAL');
      expect(result[2].snapshotType).toBe('FINAL');
    });
  });

  describe('getLatest', () => {
    it('应该返回最新快照', async () => {
      const latest = { id: 'snap3', snapshotType: 'NODE_COMPLETE' };
      mockService.getLatest = vi.fn().mockResolvedValue(latest);

      const result = await engine.getLatest('inst1');

      expect(result).toEqual(latest);
    });

    it('应该返回 undefined 当无快照', async () => {
      mockService.getLatest = vi.fn().mockResolvedValue(undefined);

      const result = await engine.getLatest('inst1');

      expect(result).toBeUndefined();
    });
  });

  describe('diff', () => {
    it('应该对比两个快照的差异', async () => {
      const diffResult = {
        changedFields: {
          status: { from: 'pending', to: 'approved' },
          amount: { from: 1000, to: 1200 },
        },
        changedCount: 2,
      };

      mockService.diff = vi.fn().mockResolvedValue(diffResult);

      const result = await engine.diff('snap1', 'snap2');

      expect(result.changedFields).toHaveProperty('status');
      expect(result.changedFields).toHaveProperty('amount');
    });
  });

  describe('commitToSourceTable', () => {
    it('应该回写终态快照数据到业务表', async () => {
      await engine.commitToSourceTable('inst1');

      expect(mockService.commitToSourceTable).toHaveBeenCalledWith('inst1');
    });
  });

  describe('calculateChanges', () => {
    it('应该计算字段变更', () => {
      const oldData = { name: '旧订单', amount: 1000, status: 'pending' };
      const newData = { name: '新订单', amount: 1200, status: 'approved' };

      const changes = engine.calculateChanges(oldData, newData);

      expect(changes.name).toEqual({ from: '旧订单', to: '新订单' });
      expect(changes.amount).toEqual({ from: 1000, to: 1200 });
      expect(changes.status).toEqual({ from: 'pending', to: 'approved' });
    });

    it('应该只返回变更的字段', () => {
      const oldData = { name: '订单', amount: 1000, status: 'pending' };
      const newData = { name: '订单', amount: 1200, status: 'pending' };

      const changes = engine.calculateChanges(oldData, newData);

      expect(changes).toHaveProperty('amount');
      expect(changes).not.toHaveProperty('name');
      expect(changes).not.toHaveProperty('status');
    });

    it('应该处理新增字段', () => {
      const oldData = { name: '订单' };
      const newData = { name: '订单', amount: 1000 };

      const changes = engine.calculateChanges(oldData, newData);

      expect(changes.amount).toEqual({ from: undefined, to: 1000 });
    });

    it('应该处理删除字段', () => {
      const oldData = { name: '订单', amount: 1000 };
      const newData = { name: '订单' };

      const changes = engine.calculateChanges(oldData, newData);

      expect(changes.amount).toEqual({ from: 1000, to: undefined });
    });
  });

  describe('mergeSnapshotData', () => {
    it('应该合并快照数据', () => {
      const base = { name: '订单', amount: 1000, status: 'pending' };
      const changes = { status: { from: 'pending', to: 'approved' } };

      const merged = engine.mergeSnapshotData(base, changes as any);

      expect(merged.status).toBe('approved');
      expect(merged.name).toBe('订单');
      expect(merged.amount).toBe(1000);
    });

    it('应该删除 to 为 undefined 的字段', () => {
      const base = { name: '订单', amount: 1000 };
      const changes = { amount: { from: 1000, to: undefined } };

      const merged = engine.mergeSnapshotData(base, changes as any);

      expect(merged).not.toHaveProperty('amount');
      expect(merged.name).toBe('订单');
    });
  });

  describe('calculateSubFormChanges', () => {
    it('应该检测新增行', () => {
      const oldItems: unknown[] = [];
      const newItems: unknown[] = [{ name: '新商品' }];

      const changes = engine.calculateSubFormChanges(oldItems, newItems);

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe('add');
      expect(changes[0].index).toBe(0);
    });

    it('应该检测删除行', () => {
      const oldItems: unknown[] = [{ name: '旧商品' }];
      const newItems: unknown[] = [];

      const changes = engine.calculateSubFormChanges(oldItems, newItems);

      expect(changes).toHaveLength(1);
      expect(changes[0].action).toBe('delete');
    });

    it('应该检测字段变更', () => {
      const oldItems = [{ amount: 100 }];
      const newItems = [{ amount: 200 }];

      const changes = engine.calculateSubFormChanges(oldItems, newItems);

      expect(changes.length).toBeGreaterThanOrEqual(1);
      expect(changes[0].action).toBe('update');
    });
  });
});
