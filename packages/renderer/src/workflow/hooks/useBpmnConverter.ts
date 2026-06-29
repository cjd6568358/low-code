/**
 * BPMN 转换器 Hook
 *
 * 负责 react-flow-builder 节点格式与 BPMN JSON 之间的转换。
 */

import { useCallback } from 'react';
import type { INode } from 'react-flow-builder';
import type { BpmnDocument, ProcessDefinition, FlowNode, Edge } from '@low-code/workflow-bpmn';

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

/**
 * BPMN 转换器 Hook
 */
export function useBpmnConverter() {
  /**
   * 从 BPMN 文档转换为 react-flow-builder 节点
   *
   * react-flow-builder 使用树形结构，通过 children 属性表示连接关系。
   * 需要将 BPMN 的 edges 转换为树形结构。
   */
  const fromBpmnDocument = useCallback((doc: BpmnDocument): INode[] => {
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
  }, []);

  /**
   * 从 react-flow-builder 节点转换为 BPMN 文档
   *
   * react-flow-builder 使用树形结构（children），需要递归遍历收集节点并生成 edges。
   */
  const toBpmnDocument = useCallback((nodes: INode[]): BpmnDocument => {
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
  }, []);

  return {
    fromBpmnDocument,
    toBpmnDocument,
  };
}

export default useBpmnConverter;
