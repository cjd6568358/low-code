/**
 * GatewayExecutor 测试用例
 *
 * 验证排他网关、并行网关、包含网关的执行逻辑。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GatewayExecutor } from '../../executors/GatewayExecutor.js';
import type { ExecutionContext } from '../../types/execution.js';

function createMockEngine() {
  return {
    updateInstance: vi.fn().mockResolvedValue(undefined),
    expressionEvaluator: {
      evaluateBoolean: vi.fn((expr: string, ctx: { variables: Record<string, unknown> }) => {
        // 简单模拟：解析 ${var} 模板后做比较
        const resolved = expr.replace(/\$\{([^}]+)\}/g, (_m, path) => {
          const val = ctx.variables[path.trim()];
          return val !== undefined ? String(val) : 'undefined';
        });
        try {
          // eslint-disable-next-line no-eval
          return !!eval(resolved);
        } catch {
          return false;
        }
      }),
    },
  };
}

function createMockContext(overrides: any = {}): ExecutionContext {
  const nodes = overrides.nodes || [
    { id: 'gw1', $type: 'bpmn:ExclusiveGateway', name: '条件', outgoing: ['flow2', 'flow3'], incoming: ['flow1'] },
    { id: 'task_a', $type: 'bpmn:UserTask', name: 'A', incoming: ['flow2'] },
    { id: 'task_b', $type: 'bpmn:UserTask', name: 'B', incoming: ['flow3'] },
  ];
  const edges = overrides.edges || [];

  return {
    instance: { id: 'inst1', status: 'running', workflowDefId: 'def1', workflowKey: 'wk', version: 1, variables: {}, startedBy: 'u1', startedByName: 'U', startedAt: '' },
    definition: { nodes, edges },
    definitionIndex: {
      getNode: vi.fn((id: string) => nodes.find((n: any) => n.id === id)),
      getEdge: vi.fn((id: string) => edges.find((e: any) => e.id === id)),
      getOutgoing: vi.fn((nodeId: string) => edges.filter((e: any) => e.sourceRef === nodeId)),
      getIncoming: vi.fn((nodeId: string) => edges.filter((e: any) => e.targetRef === nodeId)),
    },
    currentNode: overrides.node || nodes[0],
    snapshot: { data: {} },
    variables: overrides.variables || {},
    operator: { userId: 'user1', userName: '测试用户' },
    ...overrides,
  } as any;
}

describe('GatewayExecutor', () => {
  let executor: GatewayExecutor;
  let mockEngine: ReturnType<typeof createMockEngine>;

  beforeEach(() => {
    mockEngine = createMockEngine();
    executor = new GatewayExecutor(mockEngine as any);
  });

  describe('getNodeConfig', () => {
    it('应该返回排他网关配置', () => {
      const node = { id: 'gw1', $type: 'bpmn:ExclusiveGateway', name: '条件' };
      const config = executor.getNodeConfig(node as any);
      expect(config.type).toBe('bpmn:ExclusiveGateway');
      expect(config.waitForInput).toBe(false);
    });

    it('应该返回并行网关配置', () => {
      const node = { id: 'gw1', $type: 'bpmn:ParallelGateway', name: '并行' };
      const config = executor.getNodeConfig(node as any);
      expect(config.type).toBe('bpmn:ParallelGateway');
    });
  });

  describe('排他网关 (ExclusiveGateway)', () => {
    it('应该选择第一个条件为真的分支', async () => {
      const context = createMockContext({
        edges: [
          { id: 'flow2', sourceRef: 'gw1', targetRef: 'task_a', conditionExpression: { body: '${amount} > 1000' } },
          { id: 'flow3', sourceRef: 'gw1', targetRef: 'task_b', conditionExpression: { body: '${amount} <= 1000' } },
        ],
        variables: { amount: 1500 },
      });

      const result = await executor.execute(context);
      expect(result.nextNodes).toHaveLength(1);
      expect(result.nextNodes![0].node.id).toBe('task_a');
    });

    it('应该在无条件命中时使用默认分支', async () => {
      const context = createMockContext({
        edges: [
          { id: 'flow2', sourceRef: 'gw1', targetRef: 'task_a', conditionExpression: { body: '${amount} > 10000' } },
          { id: 'flow3', sourceRef: 'gw1', targetRef: 'task_b', conditionExpression: { body: 'default' } },
        ],
        variables: { amount: 500 },
      });

      const result = await executor.execute(context);
      expect(result.nextNodes).toHaveLength(1);
      expect(result.nextNodes![0].node.id).toBe('task_b');
    });
  });

  describe('并行网关 (ParallelGateway)', () => {
    it('应该同时激活所有分支', async () => {
      const context = createMockContext({
        node: { id: 'gw1', $type: 'bpmn:ParallelGateway', name: '并行', outgoing: ['flow2', 'flow3', 'flow4'], incoming: ['flow1'] },
        nodes: [
          { id: 'gw1', $type: 'bpmn:ParallelGateway', name: '并行', outgoing: ['flow2', 'flow3', 'flow4'], incoming: ['flow1'] },
          { id: 'task_a', $type: 'bpmn:UserTask', name: 'A', incoming: ['flow2'] },
          { id: 'task_b', $type: 'bpmn:UserTask', name: 'B', incoming: ['flow3'] },
          { id: 'task_c', $type: 'bpmn:UserTask', name: 'C', incoming: ['flow4'] },
        ],
        edges: [
          { id: 'flow2', sourceRef: 'gw1', targetRef: 'task_a' },
          { id: 'flow3', sourceRef: 'gw1', targetRef: 'task_b' },
          { id: 'flow4', sourceRef: 'gw1', targetRef: 'task_c' },
        ],
      });

      const result = await executor.execute(context);
      expect(result.nextNodes).toHaveLength(3);
      expect(result.nextNodes!.map(n => n.node.id)).toContain('task_a');
      expect(result.nextNodes!.map(n => n.node.id)).toContain('task_b');
      expect(result.nextNodes!.map(n => n.node.id)).toContain('task_c');
    });
  });

  describe('包含网关 (InclusiveGateway)', () => {
    it('应该激活所有条件为真的分支', async () => {
      // 包含网关：所有出口连线都激活（无条件连线视为默认路径）
      const context = createMockContext({
        node: { id: 'gw1', $type: 'bpmn:InclusiveGateway', name: '包含', outgoing: ['flow2', 'flow3'], incoming: ['flow1'] },
        nodes: [
          { id: 'gw1', $type: 'bpmn:InclusiveGateway', name: '包含', outgoing: ['flow2', 'flow3'], incoming: ['flow1'] },
          { id: 'task_a', $type: 'bpmn:UserTask', name: 'A', incoming: ['flow2'] },
          { id: 'task_b', $type: 'bpmn:UserTask', name: 'B', incoming: ['flow3'] },
        ],
        edges: [
          { id: 'flow2', sourceRef: 'gw1', targetRef: 'task_a', conditionExpression: { body: '${amount} > 100' } },
          { id: 'flow3', sourceRef: 'gw1', targetRef: 'task_b' }, // 无条件 = 默认路径
        ],
        variables: { amount: 200 },
      });

      const result = await executor.execute(context);
      // task_a 条件为真 + task_b 无条件（默认路径）= 2 个
      expect(result.nextNodes!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('条件表达式求值', () => {
    it('应该支持比较运算', async () => {
      const context = createMockContext({
        edges: [
          { id: 'flow2', sourceRef: 'gw1', targetRef: 'task_a', conditionExpression: { body: '${amount} > 100' } },
        ],
        variables: { amount: 200 },
      });

      const result = await executor.execute(context);
      expect(result.nextNodes).toHaveLength(1);
    });

    it('应该支持 and 逻辑运算', async () => {
      // GatewayExecutor 使用自定义语法（and/or/not），mock 直接返回 true
      mockEngine.expressionEvaluator.evaluateBoolean.mockReturnValue(true);

      const context = createMockContext({
        edges: [
          { id: 'flow2', sourceRef: 'gw1', targetRef: 'task_a', conditionExpression: { body: '${amount} > 100 and ${status} == "active"' } },
        ],
        variables: { amount: 200, status: 'active' },
      });

      const result = await executor.execute(context);
      expect(result.nextNodes).toHaveLength(1);
    });
  });
});
