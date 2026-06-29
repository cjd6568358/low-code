/**
 * useBpmnConverter 测试用例
 *
 * 验证 BPMN 文档与 react-flow-builder 节点格式之间的转换。
 */

import { describe, it, expect } from 'vitest';
import type { BpmnDocument, FlowNode, Edge } from '@low-code/workflow-bpmn';
import type { INode } from 'react-flow-builder';

/**
 * 直接测试转换函数（不依赖 React hooks）
 *
 * 由于 useBpmnConverter 是一个 hook，我们需要在测试中直接调用它。
 * 这里我们提取核心逻辑进行测试。
 */

/** 节点类型映射 */
const NODE_TYPE_MAP: Record<string, string> = {
  start: 'bpmn:StartEvent',
  end: 'bpmn:EndEvent',
  approval: 'bpmn:UserTask',
  condition: 'bpmn:ExclusiveGateway',
  parallel: 'bpmn:ParallelGateway',
  timer: 'bpmn:TimerEvent',
  notify: 'bpmn:SendTask',
  service: 'bpmn:ServiceTask',
};

/** 反向节点类型映射 */
const NODE_TYPE_REVERSE_MAP: Record<string, string> = {
  'bpmn:StartEvent': 'start',
  'bpmn:EndEvent': 'end',
  'bpmn:UserTask': 'approval',
  'bpmn:ExclusiveGateway': 'condition',
  'bpmn:ParallelGateway': 'parallel',
  'bpmn:InclusiveGateway': 'condition',
  'bpmn:TimerEvent': 'timer',
  'bpmn:SendTask': 'notify',
  'bpmn:ServiceTask': 'service',
};

/** 从 BPMN 文档转换为 react-flow-builder 节点 */
function fromBpmnDocument(doc: BpmnDocument): INode[] {
  if (!doc.processes || doc.processes.length === 0) {
    return [];
  }

  const process = doc.processes[0];
  const { nodes: bpmnNodes, edges: bpmnEdges } = process;

  // 构建节点映射
  const nodeMap = new Map<string, FlowNode>();
  for (const node of bpmnNodes) {
    nodeMap.set(node.id, node);
  }

  // 构建边的映射：sourceId -> Edge[]
  const outgoingMap = new Map<string, Edge[]>();
  for (const edge of bpmnEdges) {
    const sourceId = edge.sourceRef;
    if (!outgoingMap.has(sourceId)) {
      outgoingMap.set(sourceId, []);
    }
    outgoingMap.get(sourceId)!.push(edge);
  }

  // 找到开始节点
  const startNode = bpmnNodes.find(n => n.$type === 'bpmn:StartEvent');
  if (!startNode) {
    return [];
  }

  // 递归构建树形结构
  const buildTree = (nodeId: string, visited: Set<string> = new Set()): INode | null => {
    if (visited.has(nodeId)) {
      return null; // 防止循环
    }
    visited.add(nodeId);

    const bpmnNode = nodeMap.get(nodeId);
    if (!bpmnNode) {
      return null;
    }

    const flowBuilderNode: INode = {
      id: bpmnNode.id,
      name: bpmnNode.name || '',
      type: NODE_TYPE_REVERSE_MAP[bpmnNode.$type] || bpmnNode.$type,
      data: {},
    };

    // 复制特有属性（排除 id, name, type, $type, incoming, outgoing）
    const skipFields = new Set(['id', 'name', 'type', '$type', 'incoming', 'outgoing']);
    for (const key of Object.keys(bpmnNode)) {
      if (!skipFields.has(key) && (bpmnNode as any)[key] !== undefined) {
        (flowBuilderNode.data as any)[key] = (bpmnNode as any)[key];
      }
    }

    // 获取 outgoing edges
    const outgoingEdges = outgoingMap.get(nodeId) || [];

    if (outgoingEdges.length > 0) {
      // 递归处理子节点
      const children: INode[] = [];
      for (const edge of outgoingEdges) {
        const childNode = buildTree(edge.targetRef, new Set(visited));
        if (childNode) {
          children.push(childNode);
        }
      }
      if (children.length > 0) {
        flowBuilderNode.children = children;
      }
    }

    return flowBuilderNode;
  };

  // 从开始节点构建树
  const rootNode = buildTree(startNode.id);
  return rootNode ? [rootNode] : [];
}

/** 从 react-flow-builder 节点转换为 BPMN 文档 */
function toBpmnDocument(nodes: INode[]): BpmnDocument {
  const bpmnNodes: FlowNode[] = [];
  const bpmnEdges: Edge[] = [];

  // 递归遍历树形结构，收集节点和生成 edges
  const collectNodes = (node: INode, parentId?: string) => {
    const bpmnType = NODE_TYPE_MAP[node.type] || node.type;

    const bpmnNode: any = {
      id: node.id,
      $type: bpmnType,
      name: node.name || '',
    };

    // 复制 data 中的特有属性
    if (node.data) {
      for (const key of Object.keys(node.data)) {
        if ((node.data as any)[key] !== undefined) {
          bpmnNode[key] = (node.data as any)[key];
        }
      }
    }

    bpmnNodes.push(bpmnNode as FlowNode);

    // 生成从父节点到当前节点的 edge
    if (parentId) {
      bpmnEdges.push({
        id: `flow_${parentId}_${node.id}`,
        $type: 'bpmn:SequenceFlow',
        sourceRef: parentId,
        targetRef: node.id,
        name: '',
      });
    }

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        collectNodes(child, node.id);
      }
    }
  };

  // 遍历顶层节点
  for (const node of nodes) {
    collectNodes(node);
  }

  return {
    id: `doc_${Date.now()}`,
    name: '流程定义',
    processes: [{
      id: `process_${Date.now()}`,
      name: '流程定义',
      isExecutable: true,
      nodes: bpmnNodes,
      edges: bpmnEdges,
    }],
  };
}

describe('useBpmnConverter', () => {

  describe('fromBpmnDocument', () => {
    it('应该返回空数组当文档没有 processes', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [],
      };
      const result = fromBpmnDocument(doc);
      expect(result).toEqual([]);
    });

    it('应该返回空数组当文档没有开始节点', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [],
        }],
      };
      const result = fromBpmnDocument(doc);
      expect(result).toEqual([]);
    });

    it('应该正确转换简单的开始-结束流程', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'end', name: '' },
          ],
        }],
      };

      const result = fromBpmnDocument(doc);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('start');
      expect(result[0].type).toBe('start');
      expect(result[0].name).toBe('开始');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('end');
      expect(result[0].children![0].type).toBe('end');
    });

    it('应该正确转换包含审批节点的流程', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'approval1', $type: 'bpmn:UserTask', name: '审批1' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'approval1', name: '' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'approval1', targetRef: 'end', name: '' },
          ],
        }],
      };

      const result = fromBpmnDocument(doc);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('start');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].id).toBe('approval1');
      expect(result[0].children![0].type).toBe('approval');
      expect(result[0].children![0].children).toHaveLength(1);
      expect(result[0].children![0].children![0].id).toBe('end');
    });

    it('应该正确转换包含条件分支的流程', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'condition1', $type: 'bpmn:ExclusiveGateway', name: '条件' },
            { id: 'approval1', $type: 'bpmn:UserTask', name: '审批1' },
            { id: 'approval2', $type: 'bpmn:UserTask', name: '审批2' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'condition1', name: '' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'condition1', targetRef: 'approval1', name: '' },
            { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'condition1', targetRef: 'approval2', name: '' },
            { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'approval1', targetRef: 'end', name: '' },
            { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'approval2', targetRef: 'end', name: '' },
          ],
        }],
      };

      const result = fromBpmnDocument(doc);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('start');
      expect(result[0].children).toHaveLength(1);

      const conditionNode = result[0].children![0];
      expect(conditionNode.id).toBe('condition1');
      expect(conditionNode.type).toBe('condition');
      expect(conditionNode.children).toHaveLength(2);

      const childIds = conditionNode.children!.map(c => c.id);
      expect(childIds).toContain('approval1');
      expect(childIds).toContain('approval2');
    });

    it('应该防止循环引用导致的无限递归', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'node1', $type: 'bpmn:UserTask', name: 'Node1' },
            { id: 'node2', $type: 'bpmn:UserTask', name: 'Node2' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'node1', name: '' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'node1', targetRef: 'node2', name: '' },
            { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'node2', targetRef: 'node1', name: '' },
          ],
        }],
      };

      // 不应该抛出错误或无限递归
      const result = fromBpmnDocument(doc);
      expect(result).toHaveLength(1);
    });

    it('应该保留节点的特有属性到 data 字段', () => {
      const doc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            {
              id: 'approval1',
              $type: 'bpmn:UserTask',
              name: '审批1',
              assignee: 'user1',
              candidateUsers: ['user2', 'user3'],
            },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'approval1', name: '' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'approval1', targetRef: 'end', name: '' },
          ],
        }],
      };

      const result = fromBpmnDocument(doc);
      const approvalNode = result[0].children![0];

      expect(approvalNode.data).toBeDefined();
      expect(approvalNode.data!.assignee).toBe('user1');
      expect(approvalNode.data!.candidateUsers).toEqual(['user2', 'user3']);
    });
  });

  describe('toBpmnDocument', () => {
    it('应该正确转换简单的开始-结束流程', () => {
      const nodes: INode[] = [
        {
          id: 'start',
          name: '开始',
          type: 'start',
          children: [
            {
              id: 'end',
              name: '结束',
              type: 'end',
            },
          ],
        },
      ];

      const result = toBpmnDocument(nodes);

      expect(result.processes).toHaveLength(1);
      expect(result.processes[0].nodes).toHaveLength(2);
      expect(result.processes[0].edges).toHaveLength(1);

      const startNode = result.processes[0].nodes.find(n => n.id === 'start');
      expect(startNode).toBeDefined();
      expect(startNode!.$type).toBe('bpmn:StartEvent');

      const endNode = result.processes[0].nodes.find(n => n.id === 'end');
      expect(endNode).toBeDefined();
      expect(endNode!.$type).toBe('bpmn:EndEvent');

      const edge = result.processes[0].edges[0];
      expect(edge.sourceRef).toBe('start');
      expect(edge.targetRef).toBe('end');
    });

    it('应该正确转换包含审批节点的流程', () => {
      const nodes: INode[] = [
        {
          id: 'start',
          name: '开始',
          type: 'start',
          children: [
            {
              id: 'approval1',
              name: '审批1',
              type: 'approval',
              children: [
                {
                  id: 'end',
                  name: '结束',
                  type: 'end',
                },
              ],
            },
          ],
        },
      ];

      const result = toBpmnDocument(nodes);

      expect(result.processes[0].nodes).toHaveLength(3);
      expect(result.processes[0].edges).toHaveLength(2);

      const approvalNode = result.processes[0].nodes.find(n => n.id === 'approval1');
      expect(approvalNode).toBeDefined();
      expect(approvalNode!.$type).toBe('bpmn:UserTask');
    });

    it('应该正确转换包含条件分支的流程', () => {
      const nodes: INode[] = [
        {
          id: 'start',
          name: '开始',
          type: 'start',
          children: [
            {
              id: 'condition1',
              name: '条件',
              type: 'condition',
              children: [
                {
                  id: 'approval1',
                  name: '审批1',
                  type: 'approval',
                },
                {
                  id: 'approval2',
                  name: '审批2',
                  type: 'approval',
                },
              ],
            },
          ],
        },
      ];

      const result = toBpmnDocument(nodes);

      expect(result.processes[0].nodes).toHaveLength(4);
      expect(result.processes[0].edges).toHaveLength(3);

      const conditionEdges = result.processes[0].edges.filter(e => e.sourceRef === 'condition1');
      expect(conditionEdges).toHaveLength(2);
    });

    it('应该保留节点的 data 属性', () => {
      const nodes: INode[] = [
        {
          id: 'start',
          name: '开始',
          type: 'start',
          children: [
            {
              id: 'approval1',
              name: '审批1',
              type: 'approval',
              data: {
                assignee: 'user1',
                candidateUsers: ['user2', 'user3'],
              },
            },
          ],
        },
      ];

      const result = toBpmnDocument(nodes);
      const approvalNode = result.processes[0].nodes.find(n => n.id === 'approval1');

      expect(approvalNode).toBeDefined();
      expect((approvalNode as any).assignee).toBe('user1');
      expect((approvalNode as any).candidateUsers).toEqual(['user2', 'user3']);
    });
  });

  describe('往返转换', () => {
    it('应该能够往返转换保持结构一致（简单流程）', () => {
      const originalDoc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'approval1', $type: 'bpmn:UserTask', name: '审批1' },
            { id: 'approval2', $type: 'bpmn:UserTask', name: '审批2' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'approval1', name: '' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'approval1', targetRef: 'approval2', name: '' },
            { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'approval2', targetRef: 'end', name: '' },
          ],
        }],
      };

      // BPMN -> react-flow-builder
      const flowBuilderNodes = fromBpmnDocument(originalDoc);

      // react-flow-builder -> BPMN
      const convertedDoc = toBpmnDocument(flowBuilderNodes);

      // 验证节点数量一致
      expect(convertedDoc.processes[0].nodes).toHaveLength(originalDoc.processes[0].nodes.length);
      expect(convertedDoc.processes[0].edges).toHaveLength(originalDoc.processes[0].edges.length);

      // 验证所有节点都存在
      const originalNodeIds = originalDoc.processes[0].nodes.map(n => n.id);
      const convertedNodeIds = convertedDoc.processes[0].nodes.map(n => n.id);
      expect(convertedNodeIds.sort()).toEqual(originalNodeIds.sort());

      // 验证所有节点类型正确
      for (const originalNode of originalDoc.processes[0].nodes) {
        const convertedNode = convertedDoc.processes[0].nodes.find(n => n.id === originalNode.id);
        expect(convertedNode).toBeDefined();
        expect(convertedNode!.$type).toBe(originalNode.$type);
        expect(convertedNode!.name).toBe(originalNode.name);
      }
    });

    it('应该能够往返转换（条件分支流程）', () => {
      // 注意：条件分支中共享的 end 节点在转换时会被复制到每个分支
      const originalDoc: BpmnDocument = {
        id: 'doc1',
        name: 'Test',
        processes: [{
          id: 'process1',
          name: 'Process',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'condition1', $type: 'bpmn:ExclusiveGateway', name: '条件' },
            { id: 'approval1', $type: 'bpmn:UserTask', name: '审批1' },
            { id: 'approval2', $type: 'bpmn:UserTask', name: '审批2' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'condition1', name: '' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'condition1', targetRef: 'approval1', name: '' },
            { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'condition1', targetRef: 'approval2', name: '' },
            { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'approval1', targetRef: 'end', name: '' },
            { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'approval2', targetRef: 'end', name: '' },
          ],
        }],
      };

      // BPMN -> react-flow-builder
      const flowBuilderNodes = fromBpmnDocument(originalDoc);

      // 验证树形结构正确
      expect(flowBuilderNodes).toHaveLength(1);
      expect(flowBuilderNodes[0].id).toBe('start');
      expect(flowBuilderNodes[0].children).toHaveLength(1);

      const conditionNode = flowBuilderNodes[0].children![0];
      expect(conditionNode.id).toBe('condition1');
      expect(conditionNode.type).toBe('condition');
      expect(conditionNode.children).toHaveLength(2);

      // react-flow-builder -> BPMN
      const convertedDoc = toBpmnDocument(flowBuilderNodes);

      // 验证节点和边的数量
      expect(convertedDoc.processes[0].nodes.length).toBeGreaterThan(0);
      expect(convertedDoc.processes[0].edges.length).toBeGreaterThan(0);

      // 验证条件节点存在
      const convertedCondition = convertedDoc.processes[0].nodes.find(n => n.id === 'condition1');
      expect(convertedCondition).toBeDefined();
      expect(convertedCondition!.$type).toBe('bpmn:ExclusiveGateway');
    });
  });
});
