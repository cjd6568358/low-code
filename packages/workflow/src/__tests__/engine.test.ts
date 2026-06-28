/**
 * 流程引擎单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WorkflowEngine,
  WorkflowError,
  WorkflowErrorCode,
  StateMachine,
  SnapshotEngine,
  RecoveryManager,
  StartEventExecutor,
  EndEventExecutor,
  UserTaskExecutor,
  GatewayExecutor,
} from '../index';
import type {
  WorkflowEngineConfig,
  DatabaseAdapter,
  SnapshotService,
  InstanceRecord,
  TaskRecord,
  DefinitionRecord,
  SnapshotRecord,
} from '../index';
import type { BpmnDocument, ProcessDefinition } from '@low-code/workflow-bpmn';
import { createEmptyBpmnDocument, generateId } from '@low-code/workflow-bpmn';

// Mock 数据库适配器
function createMockDb(): DatabaseAdapter {
  return {
    run: vi.fn(async (sql: string, params?: unknown[]) => {
      return { changes: 1, lastID: 1 };
    }),
    get: vi.fn(async (sql: string, params?: unknown[]) => {
      return undefined;
    }),
    all: vi.fn(async (sql: string, params?: unknown[]) => {
      return [];
    }),
    beginTransaction: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
  };
}

// Mock 快照服务
function createMockSnapshotService(): SnapshotService {
  return {
    capture: vi.fn(async (params) => ({
      id: generateId(),
      instanceId: params.instanceId,
      nodeId: params.nodeId,
      nodeName: params.nodeName,
      sourceId: params.sourceId,
      sourceTable: params.sourceTable,
      data: params.data,
      changedFields: params.changedFields,
      snapshotType: params.snapshotType,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      comment: params.comment,
      createdAt: new Date().toISOString(),
    })),
    getLatest: vi.fn(async () => undefined),
    getChain: vi.fn(async () => []),
    diff: vi.fn(async () => ({
      changedFields: {},
      addedFields: [],
      removedFields: [],
      unchangedCount: 0,
      changedCount: 0,
    })),
    commitToSourceTable: vi.fn(async () => {}),
  };
}

// 创建测试用流程定义
function createTestProcessDefinition(): BpmnDocument {
  return {
    id: 'test_doc',
    name: '测试流程',
    processes: [{
      id: 'test_process',
      name: '测试流程',
      isExecutable: true,
      nodes: [
        {
          id: 'start',
          $type: 'bpmn:StartEvent',
          name: '开始',
          outgoing: ['flow1'],
        },
        {
          id: 'task1',
          $type: 'bpmn:UserTask',
          name: '审批',
          assignee: 'user1',
          incoming: ['flow1'],
          outgoing: ['flow2'],
        },
        {
          id: 'end',
          $type: 'bpmn:EndEvent',
          name: '结束',
          incoming: ['flow2'],
        },
      ],
      edges: [
        { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'task1' },
        { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'task1', targetRef: 'end' },
      ],
    }],
  };
}

// 创建条件分支流程定义
function createConditionalProcessDefinition(): BpmnDocument {
  return {
    id: 'conditional_doc',
    name: '条件分支流程',
    processes: [{
      id: 'conditional_process',
      name: '条件分支流程',
      isExecutable: true,
      nodes: [
        {
          id: 'start',
          $type: 'bpmn:StartEvent',
          name: '开始',
          outgoing: ['flow1'],
        },
        {
          id: 'gw1',
          $type: 'bpmn:ExclusiveGateway',
          name: '条件判断',
          incoming: ['flow1'],
          outgoing: ['flow2', 'flow3'],
        },
        {
          id: 'task_a',
          $type: 'bpmn:UserTask',
          name: '审批A',
          assignee: 'userA',
          incoming: ['flow2'],
          outgoing: ['flow4'],
        },
        {
          id: 'task_b',
          $type: 'bpmn:UserTask',
          name: '审批B',
          assignee: 'userB',
          incoming: ['flow3'],
          outgoing: ['flow5'],
        },
        {
          id: 'end',
          $type: 'bpmn:EndEvent',
          name: '结束',
          incoming: ['flow4', 'flow5'],
        },
      ],
      edges: [
        { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'gw1' },
        {
          id: 'flow2',
          $type: 'bpmn:SequenceFlow',
          sourceRef: 'gw1',
          targetRef: 'task_a',
          conditionExpression: {
            id: 'expr1',
            $type: 'bpmn:FormalExpression',
            body: '${amount > 10000}',
          },
        },
        {
          id: 'flow3',
          $type: 'bpmn:SequenceFlow',
          sourceRef: 'gw1',
          targetRef: 'task_b',
          conditionExpression: {
            id: 'expr2',
            $type: 'bpmn:FormalExpression',
            body: 'default',
          },
        },
        { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'task_a', targetRef: 'end' },
        { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'task_b', targetRef: 'end' },
      ],
    }],
  };
}

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let mockDb: DatabaseAdapter;
  let mockSnapshotService: SnapshotService;

  beforeEach(() => {
    mockDb = createMockDb();
    mockSnapshotService = createMockSnapshotService();

    engine = new WorkflowEngine({
      db: mockDb,
      snapshotService: mockSnapshotService,
    });
  });

  describe('构造函数', () => {
    it('应该创建引擎实例', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });
  });

  describe('getDefinition', () => {
    it('应该查询流程定义', async () => {
      await engine.getDefinition('test_workflow');
      expect(mockDb.get).toHaveBeenCalled();
    });
  });

  describe('getInstance', () => {
    it('应该查询流程实例', async () => {
      await engine.getInstance('test_instance');
      expect(mockDb.get).toHaveBeenCalled();
    });
  });

  describe('getTask', () => {
    it('应该查询任务', async () => {
      await engine.getTask('test_task');
      expect(mockDb.get).toHaveBeenCalled();
    });
  });

  describe('getPendingTasks', () => {
    it('应该查询待办任务', async () => {
      await engine.getPendingTasks('user1');
      expect(mockDb.all).toHaveBeenCalled();
    });
  });
});

describe('StateMachine', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    stateMachine = new StateMachine();
  });

  describe('canTrigger', () => {
    it('应该允许从 created 到 running', () => {
      const instance = { id: 'test', status: 'created' } as unknown as InstanceRecord;
      expect(stateMachine.canTrigger(instance, 'start')).toBe(true);
    });

    it('应该不允许从 completed 到 running', () => {
      const instance = { id: 'test', status: 'completed' } as unknown as InstanceRecord;
      expect(stateMachine.canTrigger(instance, 'start')).toBe(false);
    });
  });

  describe('getAvailableEvents', () => {
    it('应该返回 created 状态的可用事件', () => {
      const instance = { id: 'test', status: 'created' } as unknown as InstanceRecord;
      const events = stateMachine.getAvailableEvents(instance);
      expect(events).toContain('start');
    });

    it('应该返回 running 状态的可用事件', () => {
      const instance = { id: 'test', status: 'running' } as unknown as InstanceRecord;
      const events = stateMachine.getAvailableEvents(instance);
      expect(events).toContain('complete');
      expect(events).toContain('reject');
      expect(events).toContain('terminate');
    });
  });

  describe('isTerminalState', () => {
    it('completed 应该是终态', () => {
      expect(stateMachine.isTerminalState('completed')).toBe(true);
    });

    it('running 不应该是终态', () => {
      expect(stateMachine.isTerminalState('running')).toBe(false);
    });
  });

  describe('isActiveState', () => {
    it('running 应该是活跃状态', () => {
      expect(stateMachine.isActiveState('running')).toBe(true);
    });

    it('waiting 应该是活跃状态', () => {
      expect(stateMachine.isActiveState('waiting')).toBe(true);
    });

    it('completed 不应该是活跃状态', () => {
      expect(stateMachine.isActiveState('completed')).toBe(false);
    });
  });

  describe('getStateLabel', () => {
    it('应该返回正确的状态标签', () => {
      expect(stateMachine.getStateLabel('running')).toBe('运行中');
      expect(stateMachine.getStateLabel('completed')).toBe('已完成');
      expect(stateMachine.getStateLabel('rejected')).toBe('已驳回');
    });
  });
});

describe('SnapshotEngine', () => {
  let snapshotEngine: SnapshotEngine;
  let mockSnapshotService: SnapshotService;

  beforeEach(() => {
    mockSnapshotService = createMockSnapshotService();
    snapshotEngine = new SnapshotEngine(mockSnapshotService);
  });

  describe('capture', () => {
    it('应该捕获快照', async () => {
      const result = await snapshotEngine.capture({
        instanceId: 'test_instance',
        sourceTable: 'orders',
        sourceId: 'order_001',
        data: { amount: 1000 },
        snapshotType: 'INITIAL',
      });

      expect(result).toBeDefined();
      expect(result.instanceId).toBe('test_instance');
      expect(mockSnapshotService.capture).toHaveBeenCalled();
    });
  });

  describe('calculateChanges', () => {
    it('应该检测新增字段', () => {
      const oldData = { a: 1 };
      const newData = { a: 1, b: 2 };
      const changes = snapshotEngine.calculateChanges(oldData, newData);

      expect(changes.b).toBeDefined();
      expect(changes.b.from).toBeUndefined();
      expect(changes.b.to).toBe(2);
    });

    it('应该检测修改字段', () => {
      const oldData = { a: 1 };
      const newData = { a: 2 };
      const changes = snapshotEngine.calculateChanges(oldData, newData);

      expect(changes.a).toBeDefined();
      expect(changes.a.from).toBe(1);
      expect(changes.a.to).toBe(2);
    });

    it('应该检测删除字段', () => {
      const oldData = { a: 1, b: 2 };
      const newData = { a: 1 };
      const changes = snapshotEngine.calculateChanges(oldData, newData);

      expect(changes.b).toBeDefined();
      expect(changes.b.from).toBe(2);
      expect(changes.b.to).toBeUndefined();
    });

    it('应该忽略未变更字段', () => {
      const oldData = { a: 1, b: 2 };
      const newData = { a: 1, b: 2 };
      const changes = snapshotEngine.calculateChanges(oldData, newData);

      expect(Object.keys(changes)).toHaveLength(0);
    });
  });

  describe('mergeSnapshotData', () => {
    it('应该合并变更数据', () => {
      const baseData = { a: 1, b: 2 };
      const changes = {
        b: { from: 2, to: 3 },
        c: { from: undefined, to: 4 },
      };

      const merged = snapshotEngine.mergeSnapshotData(baseData, changes);

      expect(merged.a).toBe(1);
      expect(merged.b).toBe(3);
      expect(merged.c).toBe(4);
    });

    it('应该删除值为 undefined 的字段', () => {
      const baseData = { a: 1, b: 2 };
      const changes = {
        b: { from: 2, to: undefined },
      };

      const merged = snapshotEngine.mergeSnapshotData(baseData, changes);

      expect(merged.a).toBe(1);
      expect(merged.b).toBeUndefined();
    });
  });
});

describe('RecoveryManager', () => {
  let recoveryManager: RecoveryManager;
  let mockDb: DatabaseAdapter;
  let mockEngine: WorkflowEngine;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockSnapshotService = createMockSnapshotService();

    mockEngine = new WorkflowEngine({
      db: mockDb,
      snapshotService: mockSnapshotService,
    });

    recoveryManager = new RecoveryManager(mockDb, mockEngine);
  });

  describe('isRecovering', () => {
    it('应该返回 false 当没有恢复任务时', () => {
      expect(recoveryManager.isRecovering('test_instance')).toBe(false);
    });
  });

  describe('getRecoveryRecord', () => {
    it('应该返回 undefined 当没有恢复记录时', () => {
      expect(recoveryManager.getRecoveryRecord('test_instance')).toBeUndefined();
    });
  });
});

describe('StartEventExecutor', () => {
  let executor: StartEventExecutor;
  let mockEngine: WorkflowEngine;

  beforeEach(() => {
    const mockDb = createMockDb();
    const mockSnapshotService = createMockSnapshotService();

    mockEngine = new WorkflowEngine({
      db: mockDb,
      snapshotService: mockSnapshotService,
    });

    executor = new StartEventExecutor(mockEngine);
  });

  describe('getNodeConfig', () => {
    it('应该返回正确的节点配置', () => {
      const node = {
        id: 'start',
        $type: 'bpmn:StartEvent',
        name: '开始',
      };

      const config = executor.getNodeConfig(node as any);

      expect(config.type).toBe('bpmn:StartEvent');
      expect(config.waitForInput).toBe(false);
    });
  });
});

describe('EndEventExecutor', () => {
  let executor: EndEventExecutor;
  let mockEngine: WorkflowEngine;

  beforeEach(() => {
    const mockDb = createMockDb();
    const mockSnapshotService = createMockSnapshotService();

    mockEngine = new WorkflowEngine({
      db: mockDb,
      snapshotService: mockSnapshotService,
    });

    executor = new EndEventExecutor(mockEngine);
  });

  describe('getNodeConfig', () => {
    it('应该返回正确的节点配置', () => {
      const node = {
        id: 'end',
        $type: 'bpmn:EndEvent',
        name: '结束',
      };

      const config = executor.getNodeConfig(node as any);

      expect(config.type).toBe('bpmn:EndEvent');
      expect(config.waitForInput).toBe(false);
    });
  });
});

describe('UserTaskExecutor', () => {
  let executor: UserTaskExecutor;
  let mockEngine: WorkflowEngine;

  beforeEach(() => {
    const mockDb = createMockDb();
    const mockSnapshotService = createMockSnapshotService();

    mockEngine = new WorkflowEngine({
      db: mockDb,
      snapshotService: mockSnapshotService,
    });

    executor = new UserTaskExecutor(mockEngine);
  });

  describe('getNodeConfig', () => {
    it('应该返回正确的节点配置', () => {
      const node = {
        id: 'task1',
        $type: 'bpmn:UserTask',
        name: '审批',
        assignee: 'user1',
      };

      const config = executor.getNodeConfig(node as any);

      expect(config.type).toBe('bpmn:UserTask');
      expect(config.waitForInput).toBe(true);
    });
  });
});

describe('GatewayExecutor', () => {
  let executor: GatewayExecutor;
  let mockEngine: WorkflowEngine;

  beforeEach(() => {
    const mockDb = createMockDb();
    const mockSnapshotService = createMockSnapshotService();

    mockEngine = new WorkflowEngine({
      db: mockDb,
      snapshotService: mockSnapshotService,
    });

    executor = new GatewayExecutor(mockEngine);
  });

  describe('getNodeConfig', () => {
    it('应该返回排他网关配置', () => {
      const node = {
        id: 'gw1',
        $type: 'bpmn:ExclusiveGateway',
        name: '条件判断',
      };

      const config = executor.getNodeConfig(node as any);

      expect(config.type).toBe('bpmn:ExclusiveGateway');
      expect(config.waitForInput).toBe(false);
    });

    it('应该返回并行网关配置', () => {
      const node = {
        id: 'gw2',
        $type: 'bpmn:ParallelGateway',
        name: '并行分支',
      };

      const config = executor.getNodeConfig(node as any);

      expect(config.type).toBe('bpmn:ParallelGateway');
      expect(config.waitForInput).toBe(false);
    });
  });
});

describe('WorkflowError', () => {
  it('应该创建错误实例', () => {
    const error = new WorkflowError(
      WorkflowErrorCode.DEFINITION_NOT_FOUND,
      '流程定义不存在'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WorkflowError);
    expect(error.code).toBe(WorkflowErrorCode.DEFINITION_NOT_FOUND);
    expect(error.message).toBe('流程定义不存在');
    expect(error.name).toBe('WorkflowError');
  });

  it('应该支持 details', () => {
    const details = { workflowId: 'test' };
    const error = new WorkflowError(
      WorkflowErrorCode.DEFINITION_NOT_FOUND,
      '流程定义不存在',
      details
    );

    expect(error.details).toEqual(details);
  });
});
