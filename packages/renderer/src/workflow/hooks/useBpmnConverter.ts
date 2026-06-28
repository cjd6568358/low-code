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
   */
  const fromBpmnDocument = useCallback((doc: BpmnDocument): INode[] => {
    if (!doc.processes || doc.processes.length === 0) {
      return [];
    }

    const process = doc.processes[0];
    const nodes: INode[] = [];

    // 转换节点
    for (const node of process.nodes) {
      const flowBuilderNode: INode = {
        id: node.id,
        name: node.name || '',
        type: NODE_TYPE_REVERSE_MAP[node.$type] || node.$type,
        ...(node as any),
      };

      // 处理 incoming/outgoing
      if (node.incoming) {
        flowBuilderNode.incoming = node.incoming;
      }
      if (node.outgoing) {
        flowBuilderNode.outgoing = node.outgoing;
      }

      nodes.push(flowBuilderNode);
    }

    return nodes;
  }, []);

  /**
   * 从 react-flow-builder 节点转换为 BPMN 文档
   */
  const toBpmnDocument = useCallback((nodes: INode[]): BpmnDocument => {
    const bpmnNodes: FlowNode[] = [];
    const bpmnEdges: Edge[] = [];

    for (const node of nodes) {
      const bpmnType = NODE_TYPE_MAP[node.type] || node.type;

      const bpmnNode: any = {
        id: node.id,
        $type: bpmnType,
        name: node.name || '',
      };

      // 处理 incoming/outgoing
      if ((node as any).incoming) {
        bpmnNode.incoming = (node as any).incoming;
      }
      if ((node as any).outgoing) {
        bpmnNode.outgoing = (node as any).outgoing;
      }

      // 复制特有属性
      const skipFields = new Set(['id', 'name', 'type', 'incoming', 'outgoing']);
      for (const key of Object.keys(node)) {
        if (!skipFields.has(key) && (node as any)[key] !== undefined) {
          bpmnNode[key] = (node as any)[key];
        }
      }

      bpmnNodes.push(bpmnNode);
    }

    // 生成连线
    for (const node of bpmnNodes) {
      if (node.outgoing) {
        for (const outId of node.outgoing) {
          const targetNode = bpmnNodes.find((n) => n.id === outId);
          if (targetNode) {
            bpmnEdges.push({
              id: `flow_${node.id}_${outId}`,
              $type: 'bpmn:SequenceFlow',
              sourceRef: node.id,
              targetRef: outId,
              name: '',
            });
          }
        }
      }
    }

    // 如果没有连线信息，尝试从 react-flow-builder 的结构推断
    if (bpmnEdges.length === 0) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nextNode = nodes[i + 1];
        if (nextNode) {
          bpmnEdges.push({
            id: `flow_${node.id}_${nextNode.id}`,
            $type: 'bpmn:SequenceFlow',
            sourceRef: node.id,
            targetRef: nextNode.id,
            name: '',
          });
        }
      }
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
