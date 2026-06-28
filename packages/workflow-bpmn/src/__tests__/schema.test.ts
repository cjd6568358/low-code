/**
 * BPMN 2.0 Schema 类型测试
 */

import { describe, it, expect } from 'vitest';
import {
  validateBpmnDocument,
  validateProcessDefinition,
  validateCycles,
  serializeBpmnDocument,
  deserializeBpmnDocument,
  createEmptyBpmnDocument,
  cloneBpmnDocument,
  generateId,
  isStartEvent,
  isEndEvent,
  isUserTask,
  isGateway,
  isExclusiveGateway,
  isParallelGateway,
  isSubProcess,
  isSequenceFlow,
  ALWAYS_CONDITION,
  DEFAULT_CONDITION,
} from '../index';
import type {
  BpmnDocument,
  ProcessDefinition,
  FlowNode,
  Edge,
  StartEvent,
  EndEvent,
  UserTask,
  ExclusiveGateway,
  ParallelGateway,
  SequenceFlow,
  SubProcess,
} from '../index';

describe('BPMN Schema 校验器', () => {
  describe('validateBpmnDocument', () => {
    it('应该校验有效文档', () => {
      const doc = createEmptyBpmnDocument('测试流程');
      const result = validateBpmnDocument(doc);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测缺少 ID 的文档', () => {
      const doc = { ...createEmptyBpmnDocument(), id: '' };
      const result = validateBpmnDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('应该检测空流程列表', () => {
      const doc = { ...createEmptyBpmnDocument(), processes: [] };
      const result = validateBpmnDocument(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MIN_LENGTH')).toBe(true);
    });
  });

  describe('validateProcessDefinition', () => {
    it('应该校验有效流程', () => {
      const doc = createEmptyBpmnDocument();
      const process = doc.processes[0];
      const result = validateProcessDefinition(process);
      expect(result.valid).toBe(true);
    });

    it('应该检测缺少开始事件', () => {
      const process: ProcessDefinition = {
        id: 'test',
        nodes: [{
          id: 'end1',
          $type: 'bpmn:EndEvent',
          name: '结束',
        }],
        edges: [],
      };
      const result = validateProcessDefinition(process);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_START_EVENT')).toBe(true);
    });

    it('应该检测重复 ID', () => {
      const process: ProcessDefinition = {
        id: 'test',
        nodes: [
          { id: 'node1', $type: 'bpmn:StartEvent', name: '开始1' },
          { id: 'node1', $type: 'bpmn:EndEvent', name: '结束1' },
        ],
        edges: [],
      };
      const result = validateProcessDefinition(process);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
    });

    it('应该检测无效引用', () => {
      const process: ProcessDefinition = {
        id: 'test',
        nodes: [
          { id: 'start1', $type: 'bpmn:StartEvent', name: '开始', outgoing: ['flow1'] },
        ],
        edges: [{
          id: 'flow1',
          $type: 'bpmn:SequenceFlow',
          sourceRef: 'start1',
          targetRef: 'nonexistent',
        }],
      };
      const result = validateProcessDefinition(process, { validateReferences: true });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });

    it('应该检测审批节点缺少审批人', () => {
      const process: ProcessDefinition = {
        id: 'test',
        nodes: [
          { id: 'start1', $type: 'bpmn:StartEvent', name: '开始' },
          {
            id: 'task1',
            $type: 'bpmn:UserTask',
            name: '审批',
            // 没有 assignee、candidateUsers、candidateGroups
          } as UserTask,
          { id: 'end1', $type: 'bpmn:EndEvent', name: '结束' },
        ],
        edges: [
          { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start1', targetRef: 'task1' },
          { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'task1', targetRef: 'end1' },
        ],
      };
      const result = validateProcessDefinition(process);
      expect(result.warnings.some(w => w.code === 'MISSING_ASSIGNEE')).toBe(true);
    });
  });

  describe('validateCycles', () => {
    it('应该检测循环引用', () => {
      const process: ProcessDefinition = {
        id: 'test',
        nodes: [
          { id: 'node1', $type: 'bpmn:UserTask', name: '节点1', outgoing: ['flow1'] },
          { id: 'node2', $type: 'bpmn:UserTask', name: '节点2', outgoing: ['flow2'] },
        ],
        edges: [
          { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'node1', targetRef: 'node2' },
          { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'node2', targetRef: 'node1' },
        ],
      };
      const cycles = validateCycles(process);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('应该通过无循环流程', () => {
      const doc = createEmptyBpmnDocument();
      const cycles = validateCycles(doc.processes[0]);
      expect(cycles).toHaveLength(0);
    });
  });
});

describe('BPMN 序列化器', () => {
  describe('serializeBpmnDocument / deserializeBpmnDocument', () => {
    it('应该正确序列化和反序列化', () => {
      const original = createEmptyBpmnDocument('测试流程');
      const json = serializeBpmnDocument(original);
      const restored = deserializeBpmnDocument(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.processes).toHaveLength(1);
      expect(restored.processes[0].nodes).toHaveLength(2);
    });

    it('应该保留节点属性', () => {
      const doc = createEmptyBpmnDocument();
      // 添加审批节点
      doc.processes[0].nodes.push({
        id: 'task1',
        $type: 'bpmn:UserTask',
        name: '部门经理审批',
        assignee: '${manager}',
        candidateGroups: ['dept_manager'],
      });

      const json = serializeBpmnDocument(doc);
      const restored = deserializeBpmnDocument(json);
      const task = restored.processes[0].nodes.find(n => n.$type === 'bpmn:UserTask');

      expect(task).toBeDefined();
      expect((task as UserTask).assignee).toBe('${manager}');
      expect((task as UserTask).candidateGroups).toEqual(['dept_manager']);
    });
  });

  describe('createEmptyBpmnDocument', () => {
    it('应该创建包含开始和结束事件的文档', () => {
      const doc = createEmptyBpmnDocument();
      expect(doc.processes).toHaveLength(1);
      expect(doc.processes[0].nodes).toHaveLength(2);
      expect(doc.processes[0].edges).toHaveLength(1);

      const startNode = doc.processes[0].nodes.find(n => n.$type === 'bpmn:StartEvent');
      const endNode = doc.processes[0].nodes.find(n => n.$type === 'bpmn:EndEvent');
      expect(startNode).toBeDefined();
      expect(endNode).toBeDefined();
    });
  });

  describe('cloneBpmnDocument', () => {
    it('应该深拷贝文档', () => {
      const original = createEmptyBpmnDocument();
      const cloned = cloneBpmnDocument(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.processes[0]).not.toBe(original.processes[0]);
    });
  });

  describe('generateId', () => {
    it('应该生成 8 位 ID', () => {
      const id = generateId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[a-z0-9]{8}$/);
    });

    it('应该生成唯一 ID', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });
});

describe('类型守卫', () => {
  const startEvent: StartEvent = {
    id: 'start1',
    $type: 'bpmn:StartEvent',
    name: '开始',
  };

  const endEvent: EndEvent = {
    id: 'end1',
    $type: 'bpmn:EndEvent',
    name: '结束',
  };

  const userTask: UserTask = {
    id: 'task1',
    $type: 'bpmn:UserTask',
    name: '审批',
    assignee: 'user1',
  };

  const exclusiveGateway: ExclusiveGateway = {
    id: 'gw1',
    $type: 'bpmn:ExclusiveGateway',
    name: '条件网关',
  };

  const parallelGateway: ParallelGateway = {
    id: 'gw2',
    $type: 'bpmn:ParallelGateway',
    name: '并行网关',
  };

  const subProcess: SubProcess = {
    id: 'sub1',
    $type: 'bpmn:SubProcess',
    name: '子流程',
    flowElements: [],
  };

  const sequenceFlow: SequenceFlow = {
    id: 'flow1',
    $type: 'bpmn:SequenceFlow',
    sourceRef: 'start1',
    targetRef: 'end1',
  };

  it('isStartEvent', () => {
    expect(isStartEvent(startEvent)).toBe(true);
    expect(isStartEvent(endEvent)).toBe(false);
    expect(isStartEvent(userTask)).toBe(false);
  });

  it('isEndEvent', () => {
    expect(isEndEvent(endEvent)).toBe(true);
    expect(isEndEvent(startEvent)).toBe(false);
  });

  it('isUserTask', () => {
    expect(isUserTask(userTask)).toBe(true);
    expect(isUserTask(startEvent)).toBe(false);
  });

  it('isGateway', () => {
    expect(isGateway(exclusiveGateway)).toBe(true);
    expect(isGateway(parallelGateway)).toBe(true);
    expect(isGateway(userTask)).toBe(false);
  });

  it('isExclusiveGateway', () => {
    expect(isExclusiveGateway(exclusiveGateway)).toBe(true);
    expect(isExclusiveGateway(parallelGateway)).toBe(false);
  });

  it('isParallelGateway', () => {
    expect(isParallelGateway(parallelGateway)).toBe(true);
    expect(isParallelGateway(exclusiveGateway)).toBe(false);
  });

  it('isSubProcess', () => {
    expect(isSubProcess(subProcess)).toBe(true);
    expect(isSubProcess(userTask)).toBe(false);
  });

  it('isSequenceFlow', () => {
    expect(isSequenceFlow(sequenceFlow)).toBe(true);
  });
});

describe('条件常量', () => {
  it('ALWAYS_CONDITION 应该是始终为真', () => {
    expect(ALWAYS_CONDITION.type).toBe('custom');
    expect(ALWAYS_CONDITION.expression).toBe('true');
  });

  it('DEFAULT_CONDITION 应该是默认分支', () => {
    expect(DEFAULT_CONDITION.type).toBe('custom');
    expect(DEFAULT_CONDITION.expression).toBe('default');
  });
});

describe('完整流程示例', () => {
  it('应该支持创建审批流程', () => {
    const doc: BpmnDocument = {
      id: 'approval_flow',
      name: '请假审批流程',
      processes: [{
        id: 'leave_approval',
        name: '请假审批',
        isExecutable: true,
        nodes: [
          {
            id: 'start',
            $type: 'bpmn:StartEvent',
            name: '开始',
            outgoing: ['flow1'],
          },
          {
            id: 'manager_approve',
            $type: 'bpmn:UserTask',
            name: '部门经理审批',
            assignee: '${managerId}',
            incoming: ['flow1'],
            outgoing: ['flow2'],
          },
          {
            id: 'gw1',
            $type: 'bpmn:ExclusiveGateway',
            name: '条件判断',
            incoming: ['flow2'],
            outgoing: ['flow3', 'flow4'],
          },
          {
            id: 'hr_approve',
            $type: 'bpmn:UserTask',
            name: 'HR审批',
            assignee: 'hr_manager',
            incoming: ['flow3'],
            outgoing: ['flow5'],
          },
          {
            id: 'end_approved',
            $type: 'bpmn:EndEvent',
            name: '审批通过',
            incoming: ['flow5'],
          },
          {
            id: 'end_rejected',
            $type: 'bpmn:EndEvent',
            name: '审批驳回',
            incoming: ['flow4'],
          },
        ],
        edges: [
          { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'manager_approve' },
          { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'manager_approve', targetRef: 'gw1' },
          {
            id: 'flow3',
            $type: 'bpmn:SequenceFlow',
            sourceRef: 'gw1',
            targetRef: 'hr_approve',
            conditionExpression: {
              id: 'expr1',
              $type: 'bpmn:FormalExpression',
              body: '${approved == true}',
            },
          },
          {
            id: 'flow4',
            $type: 'bpmn:SequenceFlow',
            sourceRef: 'gw1',
            targetRef: 'end_rejected',
            conditionExpression: {
              id: 'expr2',
              $type: 'bpmn:FormalExpression',
              body: '${approved == false}',
            },
          },
          { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'hr_approve', targetRef: 'end_approved' },
        ],
      }],
    };

    // 校验
    const result = validateBpmnDocument(doc);
    expect(result.valid).toBe(true);

    // 序列化
    const json = serializeBpmnDocument(doc);
    expect(json).toContain('请假审批流程');

    // 反序列化
    const restored = deserializeBpmnDocument(json);
    expect(restored.processes[0].nodes).toHaveLength(6);
    expect(restored.processes[0].edges).toHaveLength(5);
  });

  it('应该支持并行分支流程', () => {
    const doc: BpmnDocument = {
      id: 'parallel_flow',
      name: '并行审批流程',
      processes: [{
        id: 'parallel_approval',
        name: '并行审批',
        isExecutable: true,
        nodes: [
          {
            id: 'start',
            $type: 'bpmn:StartEvent',
            name: '开始',
            outgoing: ['flow1'],
          },
          {
            id: 'parallel_split',
            $type: 'bpmn:ParallelGateway',
            name: '并行分支',
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
            id: 'parallel_join',
            $type: 'bpmn:ParallelGateway',
            name: '并行汇聚',
            incoming: ['flow4', 'flow5'],
            outgoing: ['flow6'],
          },
          {
            id: 'end',
            $type: 'bpmn:EndEvent',
            name: '结束',
            incoming: ['flow6'],
          },
        ],
        edges: [
          { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'parallel_split' },
          { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'parallel_split', targetRef: 'task_a' },
          { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'parallel_split', targetRef: 'task_b' },
          { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'task_a', targetRef: 'parallel_join' },
          { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'task_b', targetRef: 'parallel_join' },
          { id: 'flow6', $type: 'bpmn:SequenceFlow', sourceRef: 'parallel_join', targetRef: 'end' },
        ],
      }],
    };

    const result = validateBpmnDocument(doc);
    expect(result.valid).toBe(true);

    const cycles = validateCycles(doc.processes[0]);
    expect(cycles).toHaveLength(0);
  });
});
