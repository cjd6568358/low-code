/**
 * DefinitionIndex 测试用例
 *
 * 验证流程定义索引的构建和查询功能。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefinitionIndex } from '../../engine/DefinitionIndex.js';

describe('DefinitionIndex', () => {
  let index: DefinitionIndex;

  beforeEach(() => {
    // 构造 ProcessDefinition（扁平结构，nodes/edges 在顶层）
    const definition = {
      nodes: [
        { id: 'start', $type: 'bpmn:StartEvent', name: '开始', outgoing: ['flow1'] },
        { id: 'task1', $type: 'bpmn:UserTask', name: '审批1', incoming: ['flow1'], outgoing: ['flow2'] },
        { id: 'gw1', $type: 'bpmn:ExclusiveGateway', name: '条件', incoming: ['flow2'], outgoing: ['flow3', 'flow4'] },
        { id: 'task2', $type: 'bpmn:UserTask', name: '审批2', incoming: ['flow3'], outgoing: ['flow5'] },
        { id: 'task3', $type: 'bpmn:UserTask', name: '审批3', incoming: ['flow4'], outgoing: ['flow6'] },
        { id: 'end', $type: 'bpmn:EndEvent', name: '结束', incoming: ['flow5', 'flow6'] },
      ],
      edges: [
        { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'task1' },
        { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'task1', targetRef: 'gw1' },
        { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'gw1', targetRef: 'task2' },
        { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'gw1', targetRef: 'task3' },
        { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'task2', targetRef: 'end' },
        { id: 'flow6', $type: 'bpmn:SequenceFlow', sourceRef: 'task3', targetRef: 'end' },
      ],
    };

    index = new DefinitionIndex(definition as any);
  });

  describe('构建索引', () => {
    it('应该正确构建节点映射', () => {
      const node = index.getNode('start');
      expect(node).toBeDefined();
      expect(node!.id).toBe('start');
      expect(node!.name).toBe('开始');
    });

    it('应该正确构建连线映射', () => {
      const edge = index.getEdge('flow1');
      expect(edge).toBeDefined();
      expect(edge!.id).toBe('flow1');
      expect(edge!.sourceRef).toBe('start');
      expect(edge!.targetRef).toBe('task1');
    });

    it('应该正确构建出口映射', () => {
      const outgoing = index.getOutgoing('start');
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].id).toBe('flow1');
    });

    it('应该正确构建入口映射', () => {
      const incoming = index.getIncoming('task1');
      expect(incoming).toHaveLength(1);
      expect(incoming[0].id).toBe('flow1');
    });
  });

  describe('O(1) 节点查找', () => {
    it('应该返回存在的节点', () => {
      const node = index.getNode('task1');
      expect(node).toBeDefined();
      expect(node!.id).toBe('task1');
      expect(node!.$type).toBe('bpmn:UserTask');
    });

    it('应该返回 undefined 当节点不存在', () => {
      const node = index.getNode('nonexistent');
      expect(node).toBeUndefined();
    });
  });

  describe('O(1) 连线查找', () => {
    it('应该返回存在的连线', () => {
      const edge = index.getEdge('flow1');
      expect(edge).toBeDefined();
      expect(edge!.sourceRef).toBe('start');
      expect(edge!.targetRef).toBe('task1');
    });

    it('应该返回 undefined 当连线不存在', () => {
      const edge = index.getEdge('nonexistent');
      expect(edge).toBeUndefined();
    });
  });

  describe('出口/入口查询', () => {
    it('应该返回节点的所有出口连线', () => {
      const outgoing = index.getOutgoing('gw1');
      expect(outgoing).toHaveLength(2);
      expect(outgoing.map(e => e.id)).toContain('flow3');
      expect(outgoing.map(e => e.id)).toContain('flow4');
    });

    it('应该返回节点的所有入口连线', () => {
      const incoming = index.getIncoming('end');
      expect(incoming).toHaveLength(2);
      expect(incoming.map(e => e.id)).toContain('flow5');
      expect(incoming.map(e => e.id)).toContain('flow6');
    });

    it('应该返回空数组当节点无出口', () => {
      const outgoing = index.getOutgoing('end');
      expect(outgoing).toEqual([]);
    });

    it('应该返回空数组当节点无入口', () => {
      const incoming = index.getIncoming('start');
      expect(incoming).toEqual([]);
    });
  });

  describe('nodes / edges getter', () => {
    it('应该返回所有节点', () => {
      expect(index.nodes).toHaveLength(6);
    });

    it('应该返回所有连线', () => {
      expect(index.edges).toHaveLength(6);
    });
  });

  describe('统计信息', () => {
    it('应该返回节点数量', () => {
      expect(index.nodeCount).toBe(6);
    });

    it('应该返回连线数量', () => {
      expect(index.edgeCount).toBe(6);
    });
  });
});
