/**
 * UserTaskExecutor 测试用例
 *
 * 验证审批节点的执行逻辑。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserTaskExecutor } from '../../executors/UserTaskExecutor.js';
import type { ExecutionContext } from '../../types/execution.js';

function createMockEngine() {
  return {
    updateInstance: vi.fn().mockResolvedValue(undefined),
    userResolver: {
      findByIds: vi.fn((ids: string[]) => ids.map(id => ({ id, name: `User_${id}` }))),
      findByRoles: vi.fn().mockResolvedValue([]),
      findByDepartments: vi.fn().mockResolvedValue([]),
      findByPositions: vi.fn().mockResolvedValue([]),
    },
    snapshotEngine: {
      capture: vi.fn().mockResolvedValue({ id: 'snap1' }),
    },
    db: {
      run: vi.fn().mockResolvedValue({ changes: 1, lastID: 0 }),
      get: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue([]),
    },
  };
}

function createMockContext(overrides: any = {}): ExecutionContext {
  const node = overrides.node || {
    id: 'task1',
    $type: 'bpmn:UserTask',
    name: '审批节点',
    incoming: ['flow1'],
    outgoing: ['flow2'],
  };

  return {
    instance: {
      id: 'inst1',
      status: 'running',
      workflowDefId: 'def1',
      workflowKey: 'wk',
      version: 1,
      variables: overrides.variables || {},
      startedBy: 'u1',
      startedByName: 'U',
      startedAt: '',
    },
    definition: {
      nodes: [node, { id: 'next', $type: 'bpmn:UserTask', name: '下一节点', incoming: ['flow2'] }],
      edges: [{ id: 'flow1', sourceRef: 'start', targetRef: 'task1' }, { id: 'flow2', sourceRef: 'task1', targetRef: 'next' }],
    },
    definitionIndex: {
      getNode: vi.fn((id: string) => {
        if (id === 'task1') return node;
        if (id === 'next') return { id: 'next', $type: 'bpmn:UserTask', name: '下一节点' };
        return undefined;
      }),
      getEdge: vi.fn(),
      getOutgoing: vi.fn().mockReturnValue([]),
      getIncoming: vi.fn().mockReturnValue([]),
    },
    currentNode: node,
    snapshot: { data: overrides.snapshotData || {} },
    variables: overrides.variables || {},
    operator: { userId: 'user1', userName: '测试用户' },
    ...overrides,
  } as any;
}

describe('UserTaskExecutor', () => {
  let executor: UserTaskExecutor;
  let mockEngine: ReturnType<typeof createMockEngine>;

  beforeEach(() => {
    mockEngine = createMockEngine();
    executor = new UserTaskExecutor(mockEngine as any);
  });

  describe('getNodeConfig', () => {
    it('应该返回正确的节点配置', () => {
      const node = { id: 'task1', $type: 'bpmn:UserTask', name: '审批' };
      const config = executor.getNodeConfig(node as any);
      expect(config.type).toBe('bpmn:UserTask');
      expect(config.waitForInput).toBe(true);
    });
  });

  describe('单人审批模式 (single)', () => {
    it('应该创建单个审批任务', async () => {
      const context = createMockContext({
        node: {
          id: 'task1',
          $type: 'bpmn:UserTask',
          name: '单人审批',
          incoming: ['flow1'],
          outgoing: ['flow2'],
          extensionElements: { approvalConfig: { mode: 'single' } },
          assignee: { type: 'user', userIds: ['user1'] },
        },
      });

      const result = await executor.execute(context);
      expect(result.waiting).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('审批人解析', () => {
    it('应该按用户 ID 解析审批人', async () => {
      const context = createMockContext({
        node: {
          id: 'task1',
          $type: 'bpmn:UserTask',
          name: '审批',
          incoming: ['flow1'],
          outgoing: ['flow2'],
          extensionElements: { approvalConfig: { mode: 'single' } },
          assignee: { type: 'user', userIds: ['user1', 'user2'] },
        },
      });

      await executor.execute(context);

      expect(mockEngine.userResolver.findByIds).toHaveBeenCalledWith(['user1', 'user2']);
    });

    it('应该按角色解析审批人', async () => {
      const context = createMockContext({
        node: {
          id: 'task1',
          $type: 'bpmn:UserTask',
          name: '审批',
          incoming: ['flow1'],
          outgoing: ['flow2'],
          extensionElements: { approvalConfig: { mode: 'single' } },
          assignee: { type: 'role', roleIds: ['admin'] },
        },
      });

      await executor.execute(context);

      expect(mockEngine.userResolver.findByRoles).toHaveBeenCalledWith(['admin']);
    });
  });

  describe('canAdvance', () => {
    it('默认返回 true', async () => {
      const context = createMockContext();
      const result = await executor.canAdvance(context);
      expect(result).toBe(true);
    });
  });
});
